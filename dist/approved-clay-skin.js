/*
 * Approved Clay Skin · image-derived articulated puppet
 * Source: the user's approved right-hand character concept from
 * sketchman_exact_original_vs_clay.png.
 *
 * The source texture is a small transparent PNG prepared directly from that
 * approved painting. No visual recoloring or procedural substitute is used.
 * The existing Sketchman 18-joint hierarchy drives pose transforms.
 */
import {BONES,RUN_BIND_POINTS} from './character-rig.js?v=pose-match-v4';
import {poseFor} from './clay-rig-skin.js?v=approved-pose-v1';

const SIZE={w:132,h:143};
export const APPROVED_CLAY_VERSION='APPROVED CLAY SKIN 01';
const SW=128,SH=177,BASE_X=24,BASE_Y=0,BASE_SCALE=.65;
const POINTS=Object.freeze({
 root:[57,120],hips:[57,120],torso:[61,101],neck:[66,84],head:[81,49],
 shoulderL:[51,81],elbowL:[41,84],handL:[22,103],
 shoulderR:[71,83],elbowR:[83,101],handR:[109,99],
 thighL:[51,129],kneeL:[42,136],footL:[20,151],
 thighR:[69,128],kneeR:[80,136],footR:[100,156],
 weapon:[109,99]
});
const P=(x,y)=>({x,y});
const rest=Object.freeze(Object.fromEntries(Object.entries(POINTS)
 .map(([id,xy])=>[id,P(BASE_X+xy[0]*BASE_SCALE,BASE_Y+xy[1]*BASE_SCALE)])));
const partDefs=[
 // Lower layers first: actual image pixels are partitioned once across parts.
 {id:'legBackUpper',bone:'thighL',a:'thighL',b:'kneeL',radius:13},
 {id:'legBackLower',bone:'kneeL',a:'kneeL',b:'footL',radius:13},
 {id:'shoeBack',bone:'footL',a:'kneeL',b:'footL',radius:22},
 {id:'armBackUpper',bone:'shoulderL',a:'shoulderL',b:'elbowL',radius:12},
 {id:'armBackLower',bone:'elbowL',a:'elbowL',b:'handL',radius:12},
 {id:'handBack',bone:'handL',a:'elbowL',b:'handL',radius:19},
 {id:'legFrontUpper',bone:'thighR',a:'thighR',b:'kneeR',radius:13},
 {id:'legFrontLower',bone:'kneeR',a:'kneeR',b:'footR',radius:14},
 {id:'shoeFront',bone:'footR',a:'kneeR',b:'footR',radius:25},
 {id:'torso',bone:'torso',a:'hips',b:'torso',radius:22},
 {id:'armFrontUpper',bone:'shoulderR',a:'shoulderR',b:'elbowR',radius:13},
 {id:'armFrontLower',bone:'elbowR',a:'elbowR',b:'handR',radius:13},
 {id:'handFront',bone:'handR',a:'elbowR',b:'handR',radius:19},
 {id:'neck',bone:'neck',a:'neck',b:'head',radius:12},
 {id:'head',bone:'head',a:'neck',b:'head',radius:35}
];
const SOURCE=Object.freeze(Object.fromEntries(Object.entries(POINTS)
 .map(([k,p])=>[k,P(...p)])));
const dist2=(x,y,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 const t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;
 const px=a.x+t*dx,py=a.y+t*dy;
 return (x-px)**2+(y-py)**2;
};
function classify(x,y){
 // The distinct painted pieces must remain intact, most importantly the
 // approved head/face and its exact eyebrows and hair-like clay tips.
 if(x>49&&y<80)return 14;
 if(x<38&&y>=123)return 2;
 if(x>75&&y>140)return 8;
 if(x<41&&y>=86&&y<124)return 5;
 if(x>93&&y>=81&&y<133)return 12;
 const tests=partDefs.map((p,i)=>{
  const a=SOURCE[p.a],b=SOURCE[p.b];
  let score=dist2(x,y,a,b)/(p.radius*p.radius);
  // Prefer the broad, unbroken central chest over its nearby arm.
  if(p.id==='torso'&&x>=48&&x<=79&&y>=88&&y<=123)score-=.55;
  if(p.id==='legBackLower'&&x<55&&y>128)score-=.25;
  if(p.id==='legFrontLower'&&x>79&&y>125)score-=.2;
  if(p.id==='handBack'||p.id==='handFront')score+=.65;
  if(p.id==='head')score+=2.5;
  if(p.id==='shoeFront'||p.id==='shoeBack')score+=.15;
  return [score,i];
 });
 tests.sort((a,b)=>a[0]-b[0]);
 return tests[0][1];
}
function splitArt(image){
 const origin=document.createElement('canvas');origin.width=SW;origin.height=SH;
 const og=origin.getContext('2d',{willReadFrequently:true});og.drawImage(image,0,0,SW,SH);
 const pixels=og.getImageData(0,0,SW,SH).data;
 const canvases=partDefs.map(()=>{const c=document.createElement('canvas');c.width=SW;c.height=SH;return c;});
 const groups=canvases.map(()=>new ImageData(SW,SH));
 let count=0;
 for(let y=0;y<SH;y++)for(let x=0;x<SW;x++){
  const k=(y*SW+x)*4;if(!pixels[k+3])continue;
  const part=classify(x,y);groups[part].data.set(pixels.subarray(k,k+4),k);count++;
 }
 canvases.forEach((canvas,i)=>canvas.getContext('2d').putImageData(groups[i],0,0));
 return {canvas:origin,parts:canvases,opaquePixels:count};
}
function frameType(name){return name.replace(/^CHR_/,'').replace(/_\d+$/,'');}
function runIndex(name){return Number(name.match(/_(\d+)$/)?.[1]||1);}
function fitTarget(name,source,meta,baseline){
 const type=frameType(name),current=poseFor(name,source,meta);
 const targets={};
 // Add the motion of the existing rig relative to the Run_01 bind pose
 // to the exact approved character's painted anatomical rest positions.
 for(const bone of BONES){
  const id=bone.id;const old=current[id]||baseline[id]||RUN_BIND_POINTS[id];
  const prev=baseline[id]||RUN_BIND_POINTS[id];const seed=rest[id]||rest.root;
  targets[id]=P(seed.x+(old.x-prev.x),seed.y+(old.y-prev.y));
 }
 if(type.startsWith('RunN')||type.startsWith('JumpN')){
  // Game's original firing animation holds a weapon forward. The visual
  // weapon/hand pose adjusts without altering any simulation or muzzle data.
  const airborne=type.startsWith('JumpN');
  const dx=airborne?0:(targets.head.x-rest.head.x);
  const dy=airborne?-6:(targets.head.y-rest.head.y);
  targets.shoulderR=P(targets.torso.x+12,targets.torso.y-8);
  targets.elbowR=P(targets.shoulderR.x+16,targets.shoulderR.y-5);
  targets.handR=P(Math.min(116,targets.elbowR.x+19+dx*.12),targets.elbowR.y+dy*.1-3);
  targets.handL=P(targets.shoulderL.x+15,targets.shoulderL.y+8);
 }
 if(type==='Roll'||type==='Death'||type==='DeadFloor'){
  // These already have rotational transforms in poseFor.
 }
 targets.weapon={...targets.handR};
 return targets;
}
function tangent(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
function drawPuppet(ctx,art,target,source=null,meta=null,name='CHR_Run_01'){
 if(name==='CHR_Run_01'){
  // Exactly reproduce the source painting for its approved running pose:
  // no recomposition seams from texture pieces in this master frame.
  ctx.drawImage(art.canvas,BASE_X,BASE_Y,SW*BASE_SCALE,SH*BASE_SCALE);
  return;
 }
 // Joint-based transforms. Each texture part pivots about the corresponding
 // original hand/arm/leg/head attachment, preserving its painted details.
 for(let i=0;i<partDefs.length;i++){
  const def=partDefs[i],from=SOURCE[def.bone],to=target[def.bone],s0=SOURCE[def.a],s1=SOURCE[def.b],t0=target[def.a],t1=target[def.b];
  if(!from||!to||!s0||!s1||!t0||!t1)continue;
  const angle=tangent(t0,t1)-tangent(s0,s1);
  ctx.save();ctx.translate(to.x,to.y);ctx.rotate(angle);
  ctx.scale(BASE_SCALE,BASE_SCALE);ctx.translate(-from.x,-from.y);
  ctx.drawImage(art.parts[i],0,0);
  ctx.restore();
 }
 // Preserve the original equipped gun/bow/RPG instead of replacing it
 // with a fake generic weapon. This paint-only overlay does not change shots.
 const type=frameType(name);
 if((type.startsWith('RunN')||type.startsWith('JumpN'))&&source&&meta){
  ctx.save();ctx.beginPath();ctx.rect(101,19,31,74);ctx.clip();
  ctx.drawImage(source,meta.v[11],meta.v[12]);ctx.restore();
 }
}
function loadImageFromBase64(base64){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Approved Clay source PNG failed to decode'));
  img.src='data:image/png;base64,'+base64;
 });
}
export async function prepareApprovedClaySprites(assets,sprites){
 const names=Object.keys(sprites).filter(n=>n.startsWith('CHR_')&&assets[n]);
 let art;
 try{
  const response=await fetch('assets/approved-clay-artwork.b64?v=approved-clay-01',{cache:'force-cache'});
  if(!response.ok)throw new Error('Clay source HTTP '+response.status);
  const b64=(await response.text()).replace(/\s/g,'');
  const image=await loadImageFromBase64(b64);
  if(image.width!==SW||image.height!==SH)throw new Error('Unexpected Clay source size '+image.width+'x'+image.height);
  art=splitArt(image);
 }catch(e){
  console.error('Approved Clay art unavailable. Falling back to original sprites.',e);
  for(const name of names){assets['CLAY_'+name]=assets[name];sprites['CLAY_'+name]=sprites[name];}
  return 0;
 }
 const baseline=poseFor('CHR_Run_01',assets.CHR_Run_01,sprites.CHR_Run_01);
 let good=0;
 for(const name of names){
  const canvas=document.createElement('canvas');canvas.width=SIZE.w;canvas.height=SIZE.h;
  const ctx=canvas.getContext('2d');
  try{
   const target=fitTarget(name,assets[name],sprites[name],baseline);
   drawPuppet(ctx,art,target,assets[name],sprites[name],name);
   assets['CLAY_'+name]=canvas;
   sprites['CLAY_'+name]={atlas:'approved-clay',v:[0,0,0,SIZE.w,SIZE.h,SIZE.w,SIZE.h,SIZE.w,SIZE.h,0,0,0,0,0,0]};
   good++;
  }catch(e){
   console.warn('Approved Clay frame fell back to original',name,e);
   assets['CLAY_'+name]=assets[name];sprites['CLAY_'+name]=sprites[name];
  }
 }
 return good;
}
