// Dedicated, user-supplied title-screen illustrations. These are not gameplay
// sprites and never change a player's equipped skin or saved progress.
export const MENU_PORTRAIT_IDS=Object.freeze([
 'crimson_bolt','frost_runner','toxic_lime','royal_gold','neon_synthwave',
 'obsidian_ember','deep_ocean','sunset_blaze','jungle_camo'
]);
export const MENU_PORTRAIT_ERASE=Object.freeze({x:278,y:68,width:350,height:246});
export const MENU_PORTRAIT_PLACEMENT=Object.freeze({x:272,y:70,width:224,height:232});
export const portraitUrl=id=>'menu-portraits/'+id+'.webp';
export function choosePortrait(previous=null,random=Math.random,ids=MENU_PORTRAIT_IDS){
 if(!ids.length)return null;
 const choices=ids.length===1?ids:ids.filter(id=>id!==previous);
 const n=Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)));
 return choices[n];
}
export async function preloadMenuPortraits(factory=()=>new Image()){
 const entries=await Promise.all(MENU_PORTRAIT_IDS.map(async id=>{
  const image=factory();
  // Register onload before assigning src to support older iOS WebKit.
  const loaded=new Promise((resolve,reject)=>{
   image.onload=()=>resolve();
   image.onerror=()=>reject(new Error('Cannot load custom title portrait '+id));
  });
  image.src=portraitUrl(id);
  if(image.decode)await image.decode().catch(()=>loaded);
  else await loaded;
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('Empty title portrait '+id);
  image.onload=null;image.onerror=null;
  return [id,image];
 }));
 return new Map(entries);
}
function polygon(x,y,points){
 let contained=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])contained=!contained;
 }
 return contained;
}
const BODY=[[382,179],[431,178],[453,203],[468,226],[468,274],
 [453,308],[402,309],[380,289],[358,277],[337,303],[316,301],
 [317,265],[337,224],[353,196]];
const PISTOL=[[418,159],[456,132],[570,90],[610,90],
 [619,120],[571,156],[497,186],[494,219],[454,238],[419,213]];
function legacyHeroPixel(x,y){
 const head=((x-405)/57)**2+((y-145)/56)**2<=1.13;
 return head||polygon(x,y,BODY)||polygon(x,y,PISTOL);
}
// Clear only the original painted gun-holding figure from the title sprite.
// Preserve the underlying notebook (drawn separately), the main menu buttons,
// and red impact splashes that are part of the original logo composition.
export function eraseLegacyTitleFigure(pixels,width,height,originX=MENU_PORTRAIT_ERASE.x,originY=MENU_PORTRAIT_ERASE.y){
 const output=new Uint8ClampedArray(pixels);
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=originX+col,y=originY+row;
  if(!legacyHeroPixel(x,y))continue;
  const p=(row*width+col)*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2];
  if(pixels[p+3]===0)continue;
  // Red ink in the burst stays in place. Black, ivory and blue player/gun
  // artwork is erased, preventing a duplicate character behind the new pose.
  if(r>105&&r>g*1.32&&r>b*1.30)continue;
  output[p+3]=0;
 }
 return output;
}
export function portraitPlacement(image,slot=MENU_PORTRAIT_PLACEMENT){
 const width=image.naturalWidth||image.width;
 const height=image.naturalHeight||image.height;
 const scale=Math.min(slot.width/width,slot.height/height);
 const w=width*scale,h=height*scale;
 return {x:slot.x+(slot.width-w)/2,y:slot.y+slot.height-h,width:w,height:h};
}
