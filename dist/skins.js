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
  // Find the ORIGINAL eyes in the source image. Never guess the face location
  // from the silhouette: animated arms, weapons and rolling poses change it.
  const original=document.createElement('canvas');original.width=w;original.height=h;
  const og=original.getContext('2d',{willReadFrequently:true});og.drawImage(source,0,0);
  const raw=og.getImageData(0,0,w,h).data;
  const white=new Uint8Array(w*h),dark=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){
   const k=i*4,r=raw[k],gr=raw[k+1],bl=raw[k+2],alpha=raw[k+3];
   white[i]=alpha>190&&r>170&&gr>170&&bl>170&&Math.max(r,gr,bl)-Math.min(r,gr,bl)<55?1:0;
   dark[i]=alpha>190&&r<110&&gr<110&&bl<110?1:0;
  }
  // An eye must be a small dark island surrounded by the original white face.
  // Connected-component search excludes long outlines, limbs and weapon art.
  const seen=new Uint8Array(w*h),eyes=[];
  for(let i=0;i<w*h;i++){
   if(!dark[i]||seen[i])continue;
   const queue=[i];seen[i]=1;let left=w,right=0,top=h,bottom=0,touchesEdge=false;
   for(let q=0;q<queue.length;q++){
    const pos=queue[q],x=pos%w,y=(pos/w)|0;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    if(x===0||x===w-1||y===0||y===h-1)touchesEdge=true;
    for(const next of [pos-1,pos+1,pos-w,pos+w]){
     if(next<0||next>=w*h||Math.abs(next%w-x)+Math.abs(((next/w)|0)-y)!==1||seen[next]||!dark[next])continue;
     seen[next]=1;queue.push(next);
    }
   }
   const ew=right-left+1,eh=bottom-top+1;
   if(touchesEdge||queue.length<3||ew<1||ew>15||eh<3||eh>27||eh<ew*.9)continue;
   let surrounding=0,checks=0;
   for(let y=Math.max(0,top-3);y<=Math.min(h-1,bottom+3);y++)for(let x=Math.max(0,left-3);x<=Math.min(w-1,right+3);x++){
    if(x>=left&&x<=right&&y>=top&&y<=bottom)continue;
    checks++;surrounding+=white[y*w+x];
   }
   if(surrounding/checks>.46)eyes.push({x:(left+right)/2,y:(top+bottom)/2,w:ew,h:eh});
  }
  // Require a plausible pair from the actual face. If the eyes are hidden
  // in a roll/death frame, leave them hidden instead of drawing on the body.
  let pair=null,bestScore=-Infinity;
  for(let i=0;i<eyes.length;i++)for(let j=i+1;j<eyes.length;j++){
   const p=eyes[i],q=eyes[j],dx=Math.abs(p.x-q.x),dy=Math.abs(p.y-q.y);
   if(dx<3||dx>Math.max(45,w*.35)||dy>Math.max(6,Math.max(p.h,q.h)*.65))continue;
   const similarity=1-Math.abs(p.h-q.h)/Math.max(p.h,q.h);
   if(similarity<.45)continue;
   const score=similarity*10-dy*.5-Math.abs(p.w-q.w)*.2;
   if(score>bestScore){bestScore=score;pair=[p,q];}
  }
  if(pair){
   g.save();g.fillStyle='#ffffff';
   for(const eye of pair){
    const ew=Math.max(2,Math.min(9,eye.w)),eh=Math.max(5,Math.min(23,eye.h));
    g.beginPath();g.roundRect(eye.x-ew/2,eye.y-eh/2,ew,eh,ew/2);g.fill();
   }
   g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.restore();
  }
  assets['SHADOW_'+name]=c;
  sprites['SHADOW_'+name]=sprites[name];
 }
 return frames.length;
}
