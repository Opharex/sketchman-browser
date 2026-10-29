// Drawn in-between poses with subtle torso and shoulder movement.
export const INTRO_FPS=12;
export const INTRO_ORDER=[0,1,2,3,4,5,6,8,7,9,10,11,12,13,14,16,17,18,19,20,21,22,23];
export const INTRO_POSES=INTRO_ORDER.length;
const SETTLE=300+INTRO_POSES/INTRO_FPS*1000;
export const INTRO_END=SETTLE+1050;
export function renderIntro(ctx,original,sheet,ms){
 ctx.globalAlpha=1;ctx.clearRect(0,0,1536,793);
 const pose=Math.min(INTRO_POSES-1,Math.max(0,Math.floor((ms-300)*INTRO_FPS/1000)));
 if(ms>=SETTLE+250){ctx.drawImage(original,0,0,1536,793);return;}
 const w=sheet.width/4,h=sheet.height/6,cell=INTRO_ORDER[pose];
 ctx.drawImage(sheet,(cell%4)*w,Math.floor(cell/4)*h,w,h,0,0,1536,793);
 // Only the last settled drawing transitions to the untouched supplied picture.
 if(ms>=SETTLE){ctx.globalAlpha=Math.min(1,(ms-SETTLE)/250);ctx.drawImage(original,0,0,1536,793);ctx.globalAlpha=1;}
}
export async function playLoadingIntro(root){
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=793;canvas.className='loading-film';canvas.setAttribute('aria-label','Sketchman reaches across with his left hand, draws from his right hip, aims and fires');root.prepend(canvas);
 const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Loading animation could not load. Please reload.'));im.src=src;});
 const [original,sheet]=await Promise.all([load('loading-final.jpg'),load('loading-inbetweens.png')]);const ctx=canvas.getContext('2d');
 await new Promise(resolve=>{let previous=null,elapsed=0;function frame(now){if(previous!==null&&!document.hidden)elapsed+=Math.min(now-previous,50);previous=now;renderIntro(ctx,original,sheet,elapsed);if(elapsed>=INTRO_END)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
}
