import {sphereLayout} from './sphereLayout';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {createTransitions} from './transitions';
import {createPresentation} from './presentation';

type PresentationOptions={intro?:boolean;hero?:boolean;onReady?:()=>void;onError?:()=>void;onIntroComplete?:()=>void;onEntryProgress?:(progress:number)=>void;onEntered?:()=>void;};

// A spatial scene, built from nested spherical circuits and separate orbital frames.
// The front and rear hemispheres have different brightness so the shell reads as a volume.
export function createHologram(canvas:HTMLCanvasElement,host:HTMLElement,onComplete?:()=>void,options:PresentationOptions={}){
 const presentation=createPresentation(!!options.intro),assemblyUniform={value:options.intro?0:10};
 let introNotified=!options.intro,entryNotified=false;
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
 renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.1,30);camera.position.set(0,.1,6.1);camera.lookAt(0,0,0);
 const world=new THREE.Group(),shell=new THREE.Group(),interior=new THREE.Group(),core=new THREE.Group();world.add(shell,interior,core);scene.add(world);
 const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 let seed=41837;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const sphere=(a:number,p:number,r:number)=>new THREE.Vector3(Math.cos(a)*Math.cos(p)*r,Math.sin(p)*r,Math.sin(a)*Math.cos(p)*r);
 const lineMaterial=(color:string,opacity:number)=>{
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
   uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity},uEnergy:{value:1},uAssembly:assemblyUniform},
   vertexShader:`attribute float aReveal;varying float vReveal;varying float vDepth;void main(){vReveal=aReveal;vec4 world=modelMatrix*vec4(position,1.0);vDepth=mix(0.13,1.0,smoothstep(-1.8,1.7,world.z));gl_Position=projectionMatrix*viewMatrix*world;}`,
   fragmentShader:`uniform vec3 uColor;uniform float uOpacity;uniform float uEnergy;uniform float uAssembly;varying float vReveal;varying float vDepth;void main(){float ink=smoothstep(vReveal,vReveal+.07,uAssembly);if(ink<.001)discard;gl_FragColor=vec4(uColor*uEnergy,uOpacity*vDepth*ink);}`
  });materials.push(material);return material;
 };
 const amber=lineMaterial('#ffad35',.68),dim=lineMaterial('#bd6827',.46),bright=lineMaterial('#ffdb7e',.86),coreLight=lineMaterial('#ffe9a8',.95);
 const addLines=(parent:THREE.Group,vertices:number[],material:THREE.ShaderMaterial)=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometries.push(geometry);parent.add(new THREE.LineSegments(geometry,material));
 };
 const segment=(data:number[],a:THREE.Vector3,b:THREE.Vector3)=>{data.push(a.x,a.y,a.z,b.x,b.y,b.z);};
 const shellLines:number[]=[],faintLines:number[]=[],circuitLines:number[]=[],highlights:number[]=[];
 const movingPaths:THREE.Vector3[][]=[];

 // Interrupted parallels, longitudes and radial jumps form the outer transparent shell.
 for(let row=0;row<27;row++){
  const latitude=-1.34+row*.103,radius=1.45+random()*.12,offset=random()*6.28;
  for(let col=0;col<152;col++){
   if(random()<.24)continue;
   const a=col/152*Math.PI*2+offset,b=a+Math.PI*2/152*.86;
   segment(row%4===0?highlights:shellLines,sphere(a,latitude,radius),sphere(b,latitude,radius));
   if(random()<.07)segment(circuitLines,sphere(a,latitude,radius),sphere(a,latitude+.035,radius+.06));
  }
 }
 for(let column=0;column<42;column++){
  const angle=column/42*Math.PI*2+.05;
  for(let step=0;step<60;step++){
   if(random()<.33)continue;
   const p=-1.45+step*.048,r=1.53;
   segment(faintLines,sphere(angle,p,r),sphere(angle,p+.041,r));
  }
 }
 // Circuit patches sit on curved shells at different depths, never on a flat disc.
 for(let patch=0;patch<110;patch++){
  const a=random()*Math.PI*2,p=(random()-.5)*2.6,r=1.14+random()*.52;
  const width=.05+random()*.25,height=.025+random()*.1;
  const corners=[sphere(a,p,r),sphere(a+width,p,r),sphere(a+width,p+height,r),sphere(a,p+height,r)];
  const edges=corners.map(()=>random()>.18);
  let movingEdges:number[]=[];
  if(r>1.4&&patch%2===0){
   // Follow a connected run of the existing rectangle edges from one endpoint.
   // Unselected edges keep their original geometry and brightness.
   for(let start=0;start<4;start++){
    const run:number[]=[];
    for(let step=0;step<4&&edges[(start+step)%4];step++)run.push((start+step)%4);
    if(run.length>movingEdges.length)movingEdges=run;
   }
   if(movingEdges.length<2)movingEdges=[];
  }
  for(let i=0;i<4;i++)if(edges[i]&&!movingEdges.includes(i))segment(circuitLines,corners[i],corners[(i+1)%4]);
  if(movingEdges.length){
   const path=[...movingEdges.map(i=>corners[i]),corners[(movingEdges.at(-1)!+1)%4]];
   if(patch%4===0)path.reverse();
   movingPaths.push(path);
  }
  for(let bar=0;bar<3+Math.floor(random()*6);bar++){
   const q=p+bar*.012;
   segment(faintLines,sphere(a+.02,q,r+.004),sphere(a+width*(.25+random()*.7),q,r+.004));
  }
  if(patch%4===0){const v=corners[1];segment(highlights,v,v.clone().multiplyScalar(1.1));}
 }
 addLines(shell,shellLines,amber);addLines(shell,faintLines,dim);addLines(shell,circuitLines,amber);addLines(shell,highlights,bright);

 const innerLines:number[]=[];
 for(let trace=0;trace<85;trace++){
  const a=random()*6.28,p=(random()-.5)*2.5,r=.32+random()*.8;
  for(let step=0;step<12;step++)segment(innerLines,sphere(a+step*.027,p,r),sphere(a+(step+1)*.027,p+.008,r));
  if(trace%3===0)segment(innerLines,sphere(a,p,.34),sphere(a,p,r));
 }
 addLines(interior,innerLines,amber);
 const orbits:{group:THREE.Group,speed:number,phase:number,baseX:number,baseY:number}[]=[];
 for(let orbit=0;orbit<9;orbit++){
  const group=new THREE.Group(),data:number[]=[],radius=.52+orbit*.153;
  group.rotation.set(.3+random()*2.6,random()*Math.PI,random()*Math.PI);world.add(group);
  for(let arc=0;arc<4;arc++){
   const start=arc*Math.PI/2+random()*.15,length=.65+random()*.7;
   for(let step=0;step<80;step++){
    const a=start+length*step/80,b=start+length*(step+1)/80;
    segment(data,new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0),new THREE.Vector3(Math.cos(b)*radius,Math.sin(b)*radius,0));
    if(step%8===0)segment(data,new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0),new THREE.Vector3(Math.cos(a)*(radius+.018),Math.sin(a)*(radius+.018),0));
   }
  }
  addLines(group,data,orbit%3===0?bright:amber);orbits.push({group,speed:(orbit%2?1:-1)*(.023+random()*.018),phase:random()*6.28,baseX:group.rotation.x,baseY:group.rotation.y});
 }
 // A compact geometric core supplies the bright centre without filling in the sphere.
 for(let layer=0;layer<3;layer++){
  const source=new THREE.IcosahedronGeometry(.19+layer*.13,layer===0?1:0),geometry=new THREE.WireframeGeometry(source);source.dispose();geometries.push(geometry);
  const mesh=new THREE.LineSegments(geometry,layer===0?coreLight:bright);mesh.rotation.set(layer*.4,layer*.8,layer*.23);core.add(mesh);
 }
 const pointPositions:number[]=[],pointSizes:number[]=[],pointPhases:number[]=[];
 for(let i=0;i<1550;i++){
  const r=i<120?.15+random()*.28:i<350?.55+random()*.65:1.38+random()*.25;
  const v=sphere(random()*6.28,Math.asin(random()*2-1),r);
  pointPositions.push(v.x,v.y,v.z);pointSizes.push((.7+random()*1.2)*(i<120?1.4:1));pointPhases.push(random()*6.28);
 }
 const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pointPositions,3));pointGeometry.setAttribute('aSize',new THREE.Float32BufferAttribute(pointSizes,1));pointGeometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(pointPhases,1));geometries.push(pointGeometry);
 const pointMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uPixelRatio:{value:1},uEnergy:{value:1},uAssembly:assemblyUniform},
  vertexShader:`attribute float aReveal;uniform float uAssembly;attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uPixelRatio;varying float vLight;void main(){vec4 w=modelMatrix*vec4(position,1.0);vec4 v=viewMatrix*w;vLight=smoothstep(aReveal,aReveal+.25,uAssembly)*mix(.2,1.0,smoothstep(-1.6,1.6,w.z))*(.65+.35*sin(uTime*.7+aPhase));gl_Position=projectionMatrix*v;gl_PointSize=aSize*uPixelRatio*(7.0/-v.z);}`,
  fragmentShader:`uniform float uEnergy;varying float vLight;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float light=exp(-r*r*18.0);gl_FragColor=vec4(vec3(1.0,.68,.22)*uEnergy,light*vLight);}`
 });materials.push(pointMaterial);shell.add(new THREE.Points(pointGeometry,pointMaterial));

 // Arc length makes each fine line draw continuously around its corners. The
 // trailing end follows the head, then both leave the path before it restarts.
 // One batched draw call and a time uniform animate all paths without per-frame
 // geometry changes. A separate seed leaves the existing sphere unchanged.
 let pathSeed=97331;
 const pathRandom=()=>{pathSeed=(Math.imul(pathSeed,1664525)+1013904223)>>>0;return pathSeed/4294967296;};
 const trailPositions:number[]=[],distances:number[]=[],lengths:number[]=[],speeds:number[]=[],offsets:number[]=[],tails:number[]=[],gaps:number[]=[];
 for(const path of movingPaths){
  const length=path.slice(1).reduce((total,p,i)=>total+p.distanceTo(path[i]),0);
  const speed=.10+pathRandom()*.07,tail=length*(.42+pathRandom()*.24),gap=speed*(.6+pathRandom()*1.8),offset=pathRandom()*(length+tail+gap);
  let distance=0;
  for(let edge=1;edge<path.length;edge++){
   const a=path[edge-1],b=path[edge],next=distance+a.distanceTo(b);
   segment(trailPositions,a,b);distances.push(distance,next);
   for(let endpoint=0;endpoint<2;endpoint++){lengths.push(length);speeds.push(speed);offsets.push(offset);tails.push(tail);gaps.push(gap);}
   distance=next;
  }
 }
 const trailGeometry=new THREE.BufferGeometry();
 for(const [name,values,size] of [['position',trailPositions,3],['aDistance',distances,1],['aLength',lengths,1],['aSpeed',speeds,1],['aOffset',offsets,1],['aTail',tails,1],['aGap',gaps,1]] as [string,number[],number][])trailGeometry.setAttribute(name,new THREE.Float32BufferAttribute(values,size));
 geometries.push(trailGeometry);
 const trailMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uColor:{value:new THREE.Color('#ffad35')},uOpacity:{value:.68},uEnergy:{value:1},uTime:{value:0},uMotion:{value:1},uAssembly:assemblyUniform},
  vertexShader:`attribute float aReveal;varying float vReveal;attribute float aDistance;attribute float aLength;attribute float aSpeed;attribute float aOffset;attribute float aTail;attribute float aGap;uniform float uTime;varying float vDepth;varying float vDistance;varying float vHead;varying float vTail;void main(){vReveal=aReveal;vec4 world=modelMatrix*vec4(position,1.0);vDepth=mix(.13,1.0,smoothstep(-1.8,1.7,world.z));vDistance=aDistance;vHead=mod(uTime*aSpeed+aOffset,aLength+aTail+aGap);vTail=aTail;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`uniform float uAssembly;varying float vReveal;uniform vec3 uColor;uniform float uOpacity;uniform float uEnergy;uniform float uMotion;varying float vDepth;varying float vDistance;varying float vHead;varying float vTail;void main(){float head=1.0-smoothstep(vHead-.008,vHead,vDistance);float tail=smoothstep(vHead-vTail,vHead-vTail+.045,vDistance);float ink=mix(1.0,head*tail,uMotion)*smoothstep(vReveal,vReveal+.07,uAssembly);if(ink<.005)discard;gl_FragColor=vec4(uColor*uEnergy,uOpacity*vDepth*ink);}`
 });materials.push(trailMaterial);shell.add(new THREE.LineSegments(trailGeometry,trailMaterial));
 canvas.dataset.circuitPaths=String(movingPaths.length);

 // Energy packets keep their direction until they have finished their paths.
 const flowPositions:number[]=[],flowProgress:number[]=[];
 const transitions=createTransitions(26);
 for(let route=0;route<26;route++){
  const a=pathRandom()*Math.PI*2,p=Math.asin(pathRandom()*1.8-.9);pathRandom();
  let previousPoint=sphere(a-.16,p,.26);
  for(let step=1;step<=18;step++){
   const s=step/18,r=.26+s*1.28;
   const point=sphere(a+Math.floor(step/4)*.045-.16,p+(step>8?.07:0)-(step>13?.035:0),r);
   segment(flowPositions,previousPoint,point);flowProgress.push((step-1)/18,s);previousPoint=point;
  }
 }
 const flowHeads=new THREE.BufferAttribute(new Float32Array(flowProgress.length).fill(2),1).setUsage(THREE.DynamicDrawUsage),flowDirections=new THREE.BufferAttribute(new Float32Array(flowProgress.length),1).setUsage(THREE.DynamicDrawUsage);
 const flowGeometry=new THREE.BufferGeometry();flowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flowPositions,3));flowGeometry.setAttribute('aProgress',new THREE.Float32BufferAttribute(flowProgress,1));flowGeometry.setAttribute('aHead',flowHeads);flowGeometry.setAttribute('aDirection',flowDirections);geometries.push(flowGeometry);
 const flowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{uActivity:{value:0}},
  vertexShader:`attribute float aProgress;attribute float aHead;attribute float aDirection;varying float vProgress;varying float vHead;varying float vDirection;varying float vDepth;void main(){vec4 w=modelMatrix*vec4(position,1.0);vDepth=mix(.12,1.0,smoothstep(-1.7,1.7,w.z));vProgress=aProgress;vHead=aHead;vDirection=aDirection;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float uActivity;varying float vProgress;varying float vHead;varying float vDirection;varying float vDepth;void main(){float position=mix(1.0-vProgress,vProgress,vDirection);float d=vHead-position;float ink=smoothstep(0.0,.035,d)*(1.0-smoothstep(.05,.24,d));if(ink<.008)discard;gl_FragColor=vec4(vec3(1.0,.70,.26),ink*vDepth*uActivity*.9);}`
 });materials.push(flowMaterial);interior.add(new THREE.LineSegments(flowGeometry,flowMaterial));
 const waveGroup=new THREE.Group(),waveMaterial=lineMaterial('#ffdc8b',0);world.add(waveGroup);
 for(let ring=0;ring<3;ring++){
  const points=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0));}
  const geometry=new THREE.BufferGeometry().setFromPoints(points);geometries.push(geometry);const line=new THREE.Line(geometry,waveMaterial);line.rotation.set(ring*.77,ring*.92,0);waveGroup.add(line);
 }

 // Each endpoint gets an arrival time. Interpolation along an edge draws that
 // edge into the scene, rather than fading a completed sphere into view.
 scene.traverse(object=>{
  if(!(object instanceof THREE.LineSegments || object instanceof THREE.Line))return;
  const geometry=object.geometry,count=geometry.getAttribute('position').count;
  const layer=core.children.indexOf(object),orbit=orbits.findIndex(o=>o.group===object.parent);
  const start=layer===0?.28:layer>0?.9+(layer-1)*.2:object.parent===shell?1.9:orbit>=0?1.14+orbit*.075:1.08;
  const spread=layer===0?.25:layer>0?.32:object.parent===shell?1.5:.6;
  const duration=layer===0?.38:object.parent===shell?.35:.3;
  const arrivals=Array.from({length:count},(_,i)=>start+((Math.floor(i/2)*.61803398875)%1)*spread+(i%2)*duration);
  geometry.setAttribute('aReveal',new THREE.Float32BufferAttribute(arrivals,1));
 });
 pointGeometry.setAttribute('aReveal',new THREE.Float32BufferAttribute(pointPhases.map((phase,i)=>(i<120?.55:i<350?1.25:2.15)+phase/6.28*(i<350?.55:1.3)),1));

 const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new THREE.Vector2(512,512),.95,.45,.13);
 composer.addPass(renderPass);composer.addPass(bloom);
 const finish=new ShaderPass({uniforms:{tDiffuse:{value:null},uEntry:{value:0},uOpacity:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform float uEntry;uniform float uOpacity;uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec3 light=texture2D(tDiffuse,vUv).rgb;light=vec3(1.0)-exp(-light*1.25);float a=clamp(max(max(light.r,light.g),light.b),0.0,1.0);float fade=mix(1.0-smoothstep(.43,.5,length(vUv-.5)),1.0,smoothstep(0.0,.25,uEntry));gl_FragColor=vec4(light/max(a,.00001),a*fade*uOpacity);}`});composer.addPass(finish);
 let frame=0,previous=0,time=0,level=0,audioLevel=0,energy=1,disposed=false,contextLost=false,warmed=false,activeScene=true;
 let intensity=1,pace=1,paused=false,flowTime=0,coreTurn=0;
 const weights={listening:0,thinking:0,working:0,speaking:0,complete:0};
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0;
 const resize=()=>{
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);if(w===width&&h===height)return;
  width=w;height=h;const pixelRatio=Math.min(devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);composer.setPixelRatio(pixelRatio);composer.setSize(w,h);camera.aspect=w/h;if(options.hero){const base=sphereLayout(innerWidth,innerHeight).base;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(39/2))*h/base));}camera.updateProjectionMatrix();pointMaterial.uniforms.uPixelRatio.value=pixelRatio;
  schedule();
 };
 const render=(stamp:number)=>{
  frame=0;if(disposed||contextLost||document.hidden||!warmed)return;
  const animate=!motion.matches&&!paused,delta=Math.min((stamp-previous)/1000,.07)*pace;
  if(animate&&stamp-previous<32){frame=requestAnimationFrame(render);return;}
  previous=stamp;if(animate)time+=delta;
  presentation.step(animate?delta:0,motion.matches);
  const appearance=presentation.snapshot();assemblyUniform.value=appearance.assembly;
  world.visible=appearance.assembly>=.28;
  world.position.y=0;
  shell.scale.setScalar(appearance.shellScale);interior.scale.setScalar(1+(appearance.shellScale-1)*.15);
  for(let i=0;i<orbits.length;i++)orbits[i].group.scale.setScalar(1+(appearance.shellScale-1)*(.25+i*.08));
  finish.uniforms.uEntry.value=appearance.entry;finish.uniforms.uOpacity.value=appearance.opacity;
  if(appearance.entering)options.onEntryProgress?.(appearance.dashboardReveal);
  if(animate||motion.matches)transitions.step(animate?delta:0,motion.matches);
  const snapshot=transitions.snapshot(),mode=snapshot.mode;
  const ease=motion.matches?1:animate?1-Math.exp(-delta*3.2):0;
  // Speech reacts while the old thinking/work packets finish their routes.
  // The flow state still drains normally and never reverses mid-path.
  for(const key of Object.keys(weights) as (keyof typeof weights)[]){
   const target=key==='speaking'?snapshot.requested==='speaking':mode===key;
   weights[key]+=((target?1:0)-weights[key])*ease;
  }
  const attention=weights.listening,thinking=weights.thinking*intensity,working=weights.working*intensity,speaking=weights.speaking;
  const voice=attention+speaking;
  const input=voice>0?level:0;
  audioLevel+=(input-audioLevel)*(motion.matches?1:animate?1-Math.exp(-delta*(input>audioLevel?19:7)):0);
  const active=thinking+working;
  const target=1+voice*audioLevel*.35+active*.08;
  energy+=(target-energy)*ease;
  if(animate){flowTime+=delta*(1+active*.65);coreTurn+=delta*(1+active*2.4);}
  world.rotation.set(.12+Math.sin(time*.07)*.04+voice*.055,time*.045,-.12+voice*.05);
  shell.rotation.y=time*.034;
  interior.rotation.set(coreTurn*-.036,coreTurn*-.06,.22+thinking*.09*Math.sin(time*.4));
  core.rotation.set(coreTurn*.16,coreTurn*-.22,.3);
  core.scale.setScalar(1-thinking*.24+voice*audioLevel*.18);
  core.children.forEach((child,index)=>{child.rotation.y=coreTurn*(index%2?-.35:.22);child.rotation.z=coreTurn*(index%2?.2:-.18);});
  for(const orbit of orbits){
   if(animate)orbit.group.rotation.z+=delta*orbit.speed*(1+active*7);
   const align=thinking*Math.pow(.5+.5*Math.sin(time*.56),12)*.5;
   orbit.group.rotation.x=orbit.baseX*(1-align)+.7*align+active*.10*Math.sin(time*.5+orbit.phase);
   orbit.group.rotation.y=orbit.baseY*(1-align)+.9*align+active*.08*Math.cos(time*.38+orbit.phase);
  }
  world.scale.setScalar(1+Math.sin(time*.65)*.006+voice*audioLevel*.014);
  for(const material of [amber,dim,bright,coreLight])material.uniforms.uEnergy.value=energy;
  coreLight.uniforms.uEnergy.value=energy+thinking*.55+working*.18+voice*audioLevel*.15;
  dim.uniforms.uEnergy.value=energy*(1-active*.18);
  pointMaterial.uniforms.uTime.value=time;pointMaterial.uniforms.uEnergy.value=energy;
  trailMaterial.uniforms.uTime.value=flowTime;trailMaterial.uniforms.uEnergy.value=energy+working*.15;trailMaterial.uniforms.uMotion.value=motion.matches?0:1;
  for(let route=0;route<transitions.packets.length;route++){
   const packet=transitions.packets[route];flowHeads.array.fill(packet.head,route*36,(route+1)*36);flowDirections.array.fill(packet.direction,route*36,(route+1)*36);
  }
  flowHeads.needsUpdate=true;flowDirections.needsUpdate=true;flowMaterial.uniforms.uActivity.value=appearance.assembled?Math.min(1,active):0;
  const wave=mode==='complete'?snapshot.wave:1;
  waveGroup.scale.setScalar(.25+wave*1.46);waveMaterial.uniforms.uOpacity.value=mode==='complete'?Math.sin(wave*Math.PI)*.65:0;
  bloom.strength=.95+voice*audioLevel*.08;
  composer.render();canvas.dataset.rendered='true';canvas.dataset.scene='spatial-hologram';canvas.dataset.mode=mode;canvas.dataset.requested=snapshot.requested;canvas.dataset.transition=snapshot.phase;canvas.dataset.incoming=String(snapshot.incoming);canvas.dataset.outgoing=String(snapshot.outgoing);canvas.dataset.wave=String(mode==='complete'?wave:0);canvas.dataset.audioLevel=audioLevel.toFixed(3);
  canvas.dataset.assembly=appearance.stage;canvas.dataset.assemblyTime=appearance.assembly.toFixed(3);canvas.dataset.entry=appearance.entry.toFixed(3);canvas.dataset.shellScale=appearance.shellScale.toFixed(3);canvas.dataset.coreScale=core.scale.x.toFixed(3);
  canvas.dataset.speakingWeight=weights.speaking.toFixed(3);canvas.dataset.thinkingWeight=weights.thinking.toFixed(3);
  if(appearance.assembled&&!introNotified){introNotified=true;options.onIntroComplete?.();}
  if(appearance.entry===1&&!entryNotified){entryNotified=true;options.onEntered?.();}
  if(mode==='complete'&&snapshot.requested==='complete'&&(snapshot.age>=2.3||motion.matches)){transitions.request('idle');onComplete?.();}
  if(animate&&activeScene)frame=requestAnimationFrame(render);
 };
 function schedule(){if(warmed&&!frame&&!disposed&&!contextLost&&!document.hidden)frame=requestAnimationFrame(render);}
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{previous=performance.now();schedule();}};
 const lost=(event:Event)=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;};
 const prepare=()=>{void warm().catch(()=>{if(!disposed)options.onError?.();});};
 const restored=()=>{contextLost=false;prepare();};
 // Compile every layer and allocate the bloom buffers before exposing the canvas.
 // Initial work happens behind black, including the dashboard's second renderer.
 async function warm(){
  warmed=false;canvas.dataset.warmed='false';
  await renderer.compileAsync(scene,camera);if(disposed)return;
  world.visible=true;assemblyUniform.value=10;composer.render();
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(disposed)return;
  assemblyUniform.value=presentation.snapshot().assembly;world.visible=assemblyUniform.value>=.28;
  composer.render();
  await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(disposed)return;
  warmed=true;canvas.dataset.warmed='true';previous=performance.now();schedule();options.onReady?.();
 }
 const observer=new ResizeObserver(resize);observer.observe(host);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',schedule);canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);resize();prepare();
 return {
  present(){presentation.present();previous=performance.now();schedule();},
  replay(){presentation.reset();introNotified=false;entryNotified=false;previous=performance.now();schedule();},
  enter(){presentation.enter();schedule();},
  setActive(value:boolean){activeScene=value;previous=performance.now();if(value)schedule();else{cancelAnimationFrame(frame);frame=0;}},
  update(nextMode:string,nextLevel:number){transitions.request(nextMode);level=Math.min(1,Math.max(0,nextLevel));schedule();},
  snapshot:()=>transitions.snapshot(),
  configure(next:{intensity:number,pace:number,paused:boolean}){intensity=next.intensity;pace=next.pace;paused=next.paused;schedule();},
  dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',schedule);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderPass.dispose();bloom.dispose();finish.dispose();composer.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
}
