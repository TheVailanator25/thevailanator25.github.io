export function sphereLayout(w:number,h:number){
 const base=Math.min(h*.70,w*.47,1050),scale=Math.max(.76,Math.min(1.32,h/1080));
 const boxW=Math.min(244*scale,w*.18),gap=48*scale,r=base*.39;
 const edge=w/2+r+gap;
 return {base,scale,boxW,r,side:Math.max(20,w-edge-boxW)};
}
