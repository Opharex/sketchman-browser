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
  // Only stationary-facing poses receive eyes. Rotations, rolls, death and
  // super-powered transformations deliberately remain plain silhouettes.
  const stable=/^CHR_(Run_|RunN[^_]+_|Jump_|JumpN[^_]+_|Glide_)/.test(name);
  if(stable){
   // Eye anchors are fixed in the ORIGINAL 132x143 character coordinate system.
   // Trimmed frames use v[11]/v[12] to map that shared anchor into the sprite.
   // This removes all per-frame face detection and its visible jitter.
   const meta=sprites[name].v;
   const gliding=name.startsWith('CHR_Glide_');
   const jumping=name.startsWith('CHR_Jump');
   const anchor=gliding?{x:105,y:65}:jumping?{x:85,y:34}:{x:83,y:32};
   const ex=anchor.x-meta[11],ey=anchor.y-meta[12];
   const eyeW=4,eyeH=12;
   g.save();g.fillStyle='#ffffff';
   for(const x of [ex-8,ex+7]){
    g.beginPath();g.roundRect(x-eyeW/2,ey-eyeH/2,eyeW,eyeH,eyeW/2);g.fill();
   }
   // Preserve the exact source alpha mask and never draw outside the head.
   g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.restore();
  }
  assets['SHADOW_'+name]=c;
  sprites['SHADOW_'+name]=sprites[name];
 }
 return frames.length;
}
