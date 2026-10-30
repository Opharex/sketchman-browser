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
  // Locate the upper head using occupied alpha pixels, rather than assuming
  // all animation frames share the same cropped image coordinates.
  const rows=[];
  for(let y=0;y<Math.min(h,Math.round(h*.58));y++){
   let lo=w,hi=-1,count=0;
   for(let x=0;x<w;x++){if(d[(y*w+x)*4+3]>110){lo=Math.min(lo,x);hi=Math.max(hi,x);count++;}}
   rows.push({lo,hi,count,y});
  }
  const visible=rows.filter(r=>r.count>=Math.max(4,w*.07));
  if(visible.length){
   const top=visible[0].y;
   // Head ends at the first sustained narrowing below its broad upper section.
   const peak=Math.max(...visible.filter(r=>r.y<top+h*.35).map(r=>r.hi-r.lo+1));
   let bottom=Math.min(h-1,top+Math.round(peak*1.05));
   const candidate=visible.find(r=>r.y>top+peak*.55&&r.y<top+peak*1.5&&r.hi-r.lo+1<peak*.58);
   if(candidate)bottom=Math.min(bottom,candidate.y);
   const head=visible.filter(r=>r.y>=top&&r.y<=bottom);
   const left=Math.min(...head.map(r=>r.lo)),right=Math.max(...head.map(r=>r.hi));
   const width=right-left+1,height=bottom-top+1;
   // Never add floating eyes to frames with no discernible head.
   if(width>=14&&height>=14&&width/h<.9){
    const eyeW=Math.max(2,Math.min(9,width*.085)),eyeH=Math.max(5,Math.min(22,height*.29));
    const ey=top+height*.49;
    g.save();g.fillStyle='#ffffff';
    for(const ex of [left+width*.56,left+width*.77]){
     // Clip white pixels to the original sprite's alpha silhouette.
     g.beginPath();g.roundRect(ex-eyeW/2,ey-eyeH/2,eyeW,eyeH,eyeW/2);g.fill();
    }
    g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.restore();
   }
  }
  assets['SHADOW_'+name]=c;
  sprites['SHADOW_'+name]=sprites[name];
 }
 return frames.length;
}
