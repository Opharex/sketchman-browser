// Nine pre-rendered, frame-for-frame Sketchman skin atlases.
// A single atlas is loaded when its skin is equipped; thumbnails are tiny.
// Original game frame metadata is authoritative for positioning and collision.
export const ATLAS_SKINS=Object.freeze([
 'crimson_bolt','frost_runner','toxic_lime','royal_gold','neon_synthwave',
 'obsidian_ember','deep_ocean','jungle_camo','sunset_blaze'
]);
export const ATLAS_VERSION='nine-skins-01';
const ROOT='skins/generated/';
const available=new Set(ATLAS_SKINS);
let manifestPromise=null,atlasManifest=null;
const imageLoads=new Map(),atlasImages=new Map(),thumbnails=new Map();

export const isAtlasSkin=id=>available.has(id);
// Update Crimson alone; all other skin images retain their existing URLs.
const assetVersion=id=>id==='crimson_bolt'?'crimson-refine-01':ATLAS_VERSION;
export const thumbnailUrl=id=>ROOT+id+'-thumb.png?v='+assetVersion(id);

async function fetchManifest(){
 const r=await fetch(ROOT+'manifest.json?v='+ATLAS_VERSION,{cache:'no-cache'});
 if(!r.ok)throw new Error('Nine-skin asset manifest missing ('+r.status+')');
 const data=await r.json();
 if(data.frameCount!==143||!data.frames?.CHR_Run_01||
    ATLAS_SKINS.some(id=>!data.skins.includes(id)))throw new Error('Incomplete nine-skin atlas manifest');
 atlasManifest=data;
 return data;
}
export function preloadSkinManifest(){
 if(!manifestPromise)manifestPromise=fetchManifest().catch(e=>{manifestPromise=null;throw e;});
 return manifestPromise;
}
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const im=new Image();
  im.onload=()=>resolve(im);
  im.onerror=()=>reject(new Error('Unable to load skin image '+src));
  im.src=src;
 });
}
export async function preloadSkinThumbnails(){
 await preloadSkinManifest();
 // Load each thumbnail ONCE before Skins menu can open.
 await Promise.all(ATLAS_SKINS.map(async id=>{
  if(thumbnails.has(id))return;
  const image=await loadImage(thumbnailUrl(id));
  if(image.decode)await image.decode().catch(()=>{});
  thumbnails.set(id,image);
 }));
 return thumbnails.size;
}
export function skinThumbnail(id){return thumbnails.get(id)||null;}
export async function ensureSkinAtlas(id){
 if(!isAtlasSkin(id))return;
 await preloadSkinManifest();
 if(atlasImages.has(id))return;
 if(!imageLoads.has(id)){
  const task=loadImage(ROOT+id+'.png?v='+assetVersion(id)).then(async img=>{
   if(img.naturalWidth!==atlasManifest.width||img.naturalHeight!==atlasManifest.height){
    throw new Error('Incorrect atlas dimensions for '+id);
   }
   if(img.decode)await img.decode().catch(()=>{});
   atlasImages.set(id,img);
  }).finally(()=>imageLoads.delete(id));
  imageLoads.set(id,task);
 }
 await imageLoads.get(id);
}
export function releaseInactiveAtlases(activeId){
 for(const id of [...atlasImages.keys()])if(id!==activeId)atlasImages.delete(id);
}
export function getAtlasFrame(n){
 if(!n.startsWith('SKIN_'))return null;
 const separator=n.indexOf('__CHR_');
 if(separator<0)return null;
 const id=n.slice(5,separator),frame=n.slice(separator+2);
 const image=atlasImages.get(id),box=atlasManifest?.frames?.[frame];
 return image&&box?{image,frame,box,id}:null;
}
export function isMissingAtlasFrame(n){
 return n.startsWith('SKIN_')&&!getAtlasFrame(n);
}
export function validateSkinMetadata(originalSprites){
 if(!atlasManifest)return false;
 const frames=Object.keys(originalSprites).filter(n=>n.startsWith('CHR_'));
 if(atlasManifest.frameCount!==frames.length)throw new Error('Skin frame-count differs from original APK');
 for(const frame of frames){
  const region=atlasManifest.frames[frame],v=originalSprites[frame].v;
  if(!region||region[2]!==v[7]||region[3]!==v[8])
   throw new Error('Skin frame dimensions disagree with original: '+frame);
 }
 return true;
}
