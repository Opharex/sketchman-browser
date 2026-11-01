// Nine baked original-title-pose assets, independent of equipped gameplay skin.
// These transparent images are drawn directly at the exact original coordinates.
export const MENU_PORTRAIT_IDS=Object.freeze([
 'crimson_bolt','frost_runner','toxic_lime','royal_gold','neon_synthwave',
 'obsidian_ember','deep_ocean','sunset_blaze','jungle_camo'
]);
// Original sheet begins at y=49; the registered title canvas is cropped.
// Baked source region is (327,134,155,187) on the untrimmed master sheet.
export const MENU_PORTRAIT_FRAME=Object.freeze({x:327,y:85,width:155,height:187});
export const portraitUrl=id=>'menu-portraits/prebuilt/'+id+'.png';
export function choosePortrait(previous=null,random=Math.random,ids=MENU_PORTRAIT_IDS){
 if(!ids.length)return null;
 const candidates=ids.length===1?ids:ids.filter(id=>id!==previous);
 const n=Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)));
 return candidates[n];
}
export async function preloadMenuPortraits(factory=()=>new Image()){
 const entries=await Promise.all(MENU_PORTRAIT_IDS.map(async id=>{
  const img=factory();
  const loaded=new Promise((resolve,reject)=>{
   img.onload=()=>resolve();img.onerror=()=>reject(new Error('Missing menu portrait '+id));
  });
  img.src=portraitUrl(id);
  if(img.decode)await img.decode().catch(()=>loaded);
  else await loaded;
  if((img.naturalWidth||img.width)!==MENU_PORTRAIT_FRAME.width||
     (img.naturalHeight||img.height)!==MENU_PORTRAIT_FRAME.height)
   throw new Error('Unexpected dimensions for '+id);
  img.onload=null;img.onerror=null;return [id,img];
 }));
 return new Map(entries);
}
