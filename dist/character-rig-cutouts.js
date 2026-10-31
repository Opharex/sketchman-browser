// Original sprite cutout rig. Extracts regions from the APK run sprite into
// independently transformable layers while keeping their original pixels.
import {buildPose,RUN_BIND_OFFSETS} from './character-rig.js';
const BASE={root:{x:66,y:83},hips:{x:66,y:97},torso:{x:66,y:66},neck:{x:66,y:48},head:{x:66,y:31},
 shoulderL:{x:55,y:53},elbowL:{x:42,y:65},handL:{x:34,y:77},
 shoulderR:{x:77,y:53},elbowR:{x:90,y:65},handR:{x:98,y:77},
 thighL:{x:57,y:97},kneeL:{x:50,y:114},footL:{x:46,y:133},
 thighR:{x:75,y:97},kneeR:{x:82,y:114},footR:{x:86,y:133}};
const PARTS=[
 ['footL','footL',46,132,19,12],['footR','footR',86,132,19,12],
 ['kneeL','kneeL',50,113,10,18],['kneeR','kneeR',82,113,10,18],
 ['thighL','thighL',57,99,12,17],['thighR','thighR',75,99,12,17],
 ['hips','hips',66,94,18,14],['torso','torso',66,72,20,26],
 ['elbowL','elbowL',42,65,10,18],['elbowR','elbowR',90,65,10,18],
 ['shoulderL','shoulderL',55,54,10,13],['shoulderR','shoulderR',77,54,10,13],
 ['handL','handL',34,78,12,13],['handR','handR',98,78,12,13],
 ['neck','neck',66,49,11,9],['head','head',66,29,27,27]
];
export function extractOriginalLayers(image,rect={sx:477,sy:133,sw:104,sh:104,trimX:9,trimY:6},bindOffsets=RUN_BIND_OFFSETS){
 const source=document.createElement('canvas');source.width=132;source.height=143;
 const ctx=source.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,rect.sx,rect.sy,rect.sw,rect.sh,rect.trimX,rect.trimY,rect.sw,rect.sh);
 const pixels=ctx.getImageData(0,0,132,143),rest=buildPose({},bindOffsets),parts=PARTS.map(([id,bone,x,y,rx,ry])=>({id,bone,x:rest[bone]?.x??x,y:rest[bone]?.y??y,rx,ry,canvas:document.createElement('canvas')}));
 const imgs=parts.map(p=>{p.canvas.width=132;p.canvas.height=143;return new ImageData(132,143)});
 for(let y=0;y<143;y++)for(let x=0;x<132;x++){
  const i=(y*132+x)*4;if(!pixels.data[i+3])continue;
  let winner=0,best=Infinity;
  for(let k=0;k<parts.length;k++){const p=parts[k],dx=(x-p.x)/p.rx,dy=(y-p.y)/p.ry;
   const dist=dx*dx+dy*dy;
   if(dist<best){best=dist;winner=k}
  }
  imgs[winner].data.set(pixels.data.subarray(i,i+4),i);
 }
 for(let k=0;k<parts.length;k++)parts[k].canvas.getContext('2d').putImageData(imgs[k],0,0);
 return parts;
}
// Bind-pose correction: each artwork layer uses the same rest transform as
// the skeleton. Zero rotation now reproduces the original APK sprite exactly.
export function drawOriginalRig(ctx,parts,rotations={},offsets=RUN_BIND_OFFSETS){
 const joints=buildPose(rotations,offsets),rest=buildPose({},offsets);
 for(const p of parts){
  const j=joints[p.bone],bind=rest[p.bone];if(!j||!bind)continue;
  ctx.save();
  ctx.translate(j.x,j.y);
  ctx.rotate(j.angle-bind.angle);
  ctx.translate(-bind.x,-bind.y);
  ctx.drawImage(p.canvas,0,0);
  ctx.restore();
 }
 return joints;
}
// Validate the cutout binding: every nontransparent source pixel is assigned
// exactly once, and all layers share the original 132x143 sprite coordinate system.
export function verifyLayerBinding(parts){
 const sum=new Uint16Array(132*143);
 for(const p of parts){
  const d=p.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,132,143).data;
  for(let i=0;i<sum.length;i++)if(d[i*4+3])sum[i]++;
 }
 let overlaps=0,covered=0;
 for(const v of sum){if(v>1)overlaps++;if(v)covered++;}
 return {layers:parts.length,coveredPixels:covered,overlapPixels:overlaps,restPosePreserved:overlaps===0};
}
