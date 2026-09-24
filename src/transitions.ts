export type MotionMode='idle'|'listening'|'thinking'|'working'|'speaking'|'complete';
type Phase='steady'|'draining'|'settling'|'completing';
const modes:MotionMode[]=['idle','listening','thinking','working','speaking','complete'];
const flowDirection=(mode:MotionMode)=>mode==='thinking'?0:mode==='working'?1:null;
const tailEnd=1.24;

// A packet keeps its direction and finishes its route even if the next state has
// already been requested. State changes never rewind a clock or reverse a packet.
export function createTransitions(count:number){
 let mode:MotionMode='idle',requested:MotionMode='idle',phase:Phase='steady',age=0,gap=0;
 const packets=Array.from({length:count},(_,index)=>({head:2,direction:0,wait:0,speed:.76+(index*7%11)*.019,rest:.25+(index*3%7)*.065,entry:((index*.61803398875)%1)*.85}));
 const active=()=>packets.filter(packet=>packet.head<tailEnd);
 const enter=()=>{mode=requested;age=0;gap=0;phase=mode==='complete'?'completing':'steady';for(const packet of packets)packet.wait=packet.entry;};
 return {
  packets,
  request(next:string){if(modes.includes(next as MotionMode))requested=next as MotionMode;},
  step(delta:number,reduced=false){
   if(reduced){for(const packet of packets)packet.head=2;if(mode!==requested)enter();phase='steady';return;}
   age+=delta;
   for(const packet of packets)if(packet.head<tailEnd){packet.head+=delta*packet.speed;if(packet.head>=tailEnd){packet.head=2;packet.wait=packet.rest;}}
   if(requested!==mode){
    // Let a new interaction interrupt the completion pulse. Its normal return
    // to idle still waits for the whole pulse; visual weights ease between modes.
    if(mode==='complete'&&requested==='idle'&&age<2.3){phase='completing';}
    else if(active().length){phase='draining';gap=0;}
    else{phase='settling';gap+=delta;if(gap>=.16)enter();}
   }else{gap=0;phase=mode==='complete'&&age<2.3?'completing':'steady';}
   const direction=flowDirection(mode);
   if(requested===mode&&direction!==null&&phase==='steady'){
    for(const packet of packets)if(packet.head>=tailEnd){packet.wait-=delta;if(packet.wait<=0){packet.head=0;packet.direction=direction;}}
   }
  },
  snapshot(){const live=active();return {mode,requested,phase,age,activeTrails:live.length,incoming:live.filter(packet=>packet.direction===0).length,outgoing:live.filter(packet=>packet.direction===1).length,wave:mode==='complete'?Math.min(1,age/2.3):0};}
 };
}
