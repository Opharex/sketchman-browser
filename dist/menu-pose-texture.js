// Menu-only material transfer from the nine supplied skin illustrations.
// This uses the ORIGINAL title figure's anatomical pose and original gun.
// No running silhouette is ever pasted onto the title.
export const MENU_POSE_RECT=Object.freeze({x:326,y:137,width:277,height:183});
const HEAD={x:403,y:181,rx:44,ry:40};
const REGIONS=Object.freeze({
 torso:[[380,226],[393,219],[418,221],[430,234],[435,255],[442,280],[445,308],[391,308],[383,285],[376,263],[373,246]],
 leftArm:[[379,225],[385,239],[375,257],[368,278],[371,290],[366,304],[355,305],[346,297],[346,281],[354,256],[366,233]],
 rightArm:[[419,229],[434,236],[448,250],[453,266],[447,275],[437,265],[429,256],[417,248]]
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function polygon(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const p=points[i],q=points[j];
  if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])inside=!inside;
 }
 return inside;
}
export function titleFigureZone(x,y){
 // The true head is centered at (403,181), NOT (405,146).
 // Keep the thick navy circumference intact by selecting only inner paint.
 if(((x-HEAD.x)/HEAD.rx)**2+((y-HEAD.y)/HEAD.ry)**2<1)return 'head';
 for(const [key,outline]of Object.entries(REGIONS))if(polygon(x,y,outline))return key;
 return null;
}
function materialUV(x,y,zone,w,h){
 // Source references are the uploaded running figures, with the head in
 // the upper-right, not an image already in the title-screen pose.
 // Project each anatomy part independently so surface patterns stay coherent.
 let u,v;
 if(zone==='head'){
  u=.747+(x-HEAD.x)/HEAD.rx*.115;
  v=.143+(y-HEAD.y)/HEAD.ry*.119;
 }else if(zone==='torso'){
  u=.546+(x-407)/57*.079;
  v=.434+(y-258)/62*.16;
 }else if(zone==='leftArm'){
  u=.492+(x-368)/38*.055;
  v=.329+(y-265)/46*.067;
 }else{
  u=.752+(x-436)/38*.066;
  v=.446+(y-252)/36*.046;
 }
 return [clamp(u,0,1)*(w-1),clamp(v,0,1)*(h-1)];
}
function sampleMaterial(reference,x,y,zone){
 const {data,width,height}=reference;
 const sx=Math.round(x),sy=Math.round(y);
 const read=(px,py)=>{
  if(px<0||py<0||px>=width||py>=height)return null;
  const p=(py*width+px)*4;
  if(data[p+3]<155)return null;
  return [data[p],data[p+1],data[p+2]];
 };
 const center=read(sx,sy);if(center)return center;
 // Never sample gray transparent backgrounds from the extracted reference.
 // A small nearest-paint search fills gaps between the running figure's limbs.
 for(let radius=1;radius<=28;radius++){
  const jumps=Math.max(8,radius*8);
  for(let step=0;step<jumps;step++){
   const angle=step*2*Math.PI/jumps;
   const paint=read(Math.round(sx+radius*Math.cos(angle)),Math.round(sy+radius*Math.sin(angle)));
   if(paint)return paint;
  }
 }
 return null;
}
function isOriginalCharacterPaint(r,g,b,zone){
 // Pale blue, cream-blue highlights and blue-gray torso shading of the APK
 // title figure. Navy outlines, red burst, dark barrel and paper survive.
 if(r<82||g<92||b<105)return false;
 if(b<r+7||g<r+2)return false;
 if(zone!=='head'&&r>240&&g>240&&b>240)return false;
 return true;
}
export function paintTitlePosePixels(original,width,height,reference,originX=MENU_POSE_RECT.x,originY=MENU_POSE_RECT.y){
 const output=new Uint8ClampedArray(original);
 if(!reference?.data||!reference.width||!reference.height)return output;
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=originX+col,y=originY+row,zone=titleFigureZone(x,y);
  if(!zone)continue;
  const p=(row*width+col)*4;
  if(original[p+3]<32)continue;
  const r=original[p],g=original[p+1],b=original[p+2];
  if(!isOriginalCharacterPaint(r,g,b,zone))continue;
  const [sx,sy]=materialUV(x,y,zone,reference.width,reference.height);
  const sampled=sampleMaterial(reference,sx,sy,zone);
  if(!sampled)continue;
  // Preserve original sculpted highlight and shadow shape without washing
  // away reference ice facets, gold glints, magma cracks or camouflage.
  const light=(r*.22+g*.53+b*.25)/255;
  const level=.86+.14*light;
  output[p]=Math.round(sampled[0]*level);
  output[p+1]=Math.round(sampled[1]*level);
  output[p+2]=Math.round(sampled[2]*level);
 }
 return output;
}
