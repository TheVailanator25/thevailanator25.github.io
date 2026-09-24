const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(from:number,to:number,value:number)=>{const t=clamp((value-from)/(to-from));return t*t*(3-2*t);};
export const ASSEMBLY_SECONDS=4.1;
export const ENTRY_SECONDS=1.6;

// The presentation clock runs only after the native window is visible. An early
// click is queued until assembly finishes, so it cannot skip or restart a layer.
export function createPresentation(intro:boolean){
 let ready=!intro,assembly=intro?0:ASSEMBLY_SECONDS,entry=0,entering=false;
 return {
  reset(){ready=true;assembly=0;entry=0;entering=false;},
  present(){ready=true;},
  enter(){entering=true;},
  step(delta:number,reduced=false){
   if(!ready)return;
   if(assembly<ASSEMBLY_SECONDS){assembly=reduced?ASSEMBLY_SECONDS:Math.min(ASSEMBLY_SECONDS,assembly+delta);if(!reduced)return;}
   if(entering)entry=reduced?1:Math.min(1,entry+delta/ENTRY_SECONDS);
  },
  snapshot(){return {assembly,assembled:assembly>=ASSEMBLY_SECONDS,entering,entry,
   stage:assembly<.28?'black':assembly<1.1?'core':assembly<1.9?'polygons':assembly<ASSEMBLY_SECONDS?'web':entering?'entering':'ready',
   shellScale:1+7*Math.pow(entry,2.6),dashboardReveal:smooth(.38,1,entry),opacity:1-smooth(.62,1,entry)};}
 };
}
