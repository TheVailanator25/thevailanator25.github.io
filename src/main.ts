import {createHologram} from './hologram';

const canvas=document.querySelector<HTMLCanvasElement>('#orb')!;
const host=canvas.parentElement!;
const button=document.querySelector<HTMLButtonElement>('#motion')!;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let engine:ReturnType<typeof createHologram>|undefined;
let paused=false;

function updateControl(){
  button.hidden=!engine||reduced.matches;
  button.setAttribute('aria-label',paused?'Resume orb animation':'Pause orb animation');
  button.querySelector('.motion-label')!.textContent=paused?'Play':'Pause';
  button.querySelector('.motion-icon')!.textContent=paused?'▷':'Ⅱ';
}
function fallback(){
  host.classList.remove('ready');
  button.hidden=true;
  engine?.dispose();
  engine=undefined;
}
try{
  engine=createHologram(canvas,host,undefined,{
    onReady(){host.classList.add('ready');updateControl();},
    onError:fallback
  });
  engine.configure({intensity:1,pace:.75,paused:false});
  button.addEventListener('click',()=>{
    paused=!paused;
    engine?.configure({intensity:1,pace:.75,paused});
    updateControl();
  });
  reduced.addEventListener('change',updateControl);
}catch{fallback();}
