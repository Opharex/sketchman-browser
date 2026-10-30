// Cosmetic sprites are generated once from the original extracted APK frames.
// All dimensions, trim offsets, animation clocks and collision state remain untouched.
export const SKINS=Object.freeze([
 {id:'default',name:'Original Sketchman'},
 {id:'shadow',name:'Shadow'}
]);
export const DEFAULT_SKIN='default';
export function getSkin(id){return SKINS.find(s=>s.id===id)||SKINS[0];}
export function cosmeticFrame(frame,skinId){return skinId==='shadow'?'SHADOW_'+frame:frame;}
// Build an identical alpha mask for every original player frame and place white eyes
// inside the head region. The generated sprites never modify original frame canvases.
export function prepareShadowSprites(assets,sprites){
 const frames=Object.keys(sprites).filter(name=>name.startsWith('CHR_')&&assets[name]);
 for(const name of frames){
  const source=assets[name],w=source.width,h=source.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(source,0,0);
  const pixels=g.getImageData(0,0,w,h),d=pixels.data;
  // Preserve the exact source alpha values and original sprite dimensions.
  for(let i=0;i<d.length;i+=4){d[i]=0;d[i+1]=0;d[i+2]=0;}
  g.putImageData(pixels,0,0);
  // Track the head as a single connected horizontal mass. Previous code used
  // the outermost opaque pixels of each row, so arms/weapons changed the eye
  // positions between animation frames.
  const scan=[];
  for(let y=0;y<Math.min(h,Math.ceil(h*.64));y++){
   const runs=[];let start=-1;
   for(let x=0;x<=w;x++){
    const filled=x<w&&d[(y*w+x)*4+3]>160;
    if(filled&&start<0)start=x;
    if(!filled&&start>=0){if(x-start>=3)runs.push({left:start,right:x-1,width:x-start});start=-1;}
   }
   scan.push(runs);
  }
  // Prefer the broad, roughly circular head above the shoulders, not the
  // overall frame bounds (which include moving hands and weapons).
  let best=null;
  for(let y=0;y<scan.length;y++)for(const run of scan[y]){
   if(run.width<Math.max(12,w*.13))continue;
   const cx=(run.left+run.right)/2;
   let top=y,bottom=y,left=run.left,right=run.right;
   for(let yy=y-1;yy>=0;yy--){
    const match=scan[yy].filter(t=>Math.abs((t.left+t.right)/2-cx)<run.width*.27).sort((a,b)=>b.width-a.width)[0];
    if(!match||match.width<run.width*.35)break;top=yy;
   }
   for(let yy=y+1;yy<scan.length;yy++){
    const match=scan[yy].filter(t=>Math.abs((t.left+t.right)/2-cx)<run.width*.27).sort((a,b)=>b.width-a.width)[0];
    if(!match||match.width<run.width*.45)break;bottom=yy;
    if(yy-y>run.width*.62)break;
   }
   const height=bottom-top+1;
   const ratio=height/run.width;
   if(ratio<.55||ratio>1.55)continue;
   const score=run.width*Math.min(1,height/run.width)*(1-y/h*.5);
   if(!best||score>best.score)best={cx,top,width:run.width,height,score};
  }
  if(best){
   const {cx,top,width,height}=best;
   const eyeW=Math.max(2,Math.min(9,width*.085));
   const eyeH=Math.max(5,Math.min(22,height*.31));
   const cy=top+height*.48;
   g.save();g.fillStyle='#fff';
   for(const ex of [cx+width*.065,cx+width*.28]){
    g.beginPath();g.roundRect(ex-eyeW/2,cy-eyeH/2,eyeW,eyeH,eyeW/2);g.fill();
   }
   g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.restore();
  }
  assets['SHADOW_'+name]=c;
  sprites['SHADOW_'+name]=sprites[name];
 }
 return frames.length;
}
