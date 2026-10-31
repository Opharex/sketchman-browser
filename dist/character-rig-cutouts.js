// Anatomically attached *original APK pixels* from CHR_Run_01.
// Art is partitioned into body parts by distance to the actual, posed
// limb segments, not to an imaginary standing person's joint centers.
import {buildPose,RUN_BIND_POINTS} from './character-rig.js';
export const RUN_SPRITE_RECT=Object.freeze({sx:477,sy:133,sw:104,sh:104,trimX:9,trimY:6});
const PARTS=[
 // Back limb draw order precedes trunk; art is never recolored.
 {id:'rearShoe',bone:'footL',shape:'oval',p:'footL',rx:12,ry:7,bias:-.07},
 {id:'rearShin',bone:'kneeL',shape:'line',a:'kneeL',b:'footL',r:6},
 {id:'rearThigh',bone:'thighL',shape:'line',a:'thighL',b:'kneeL',r:7},
 {id:'frontShin',bone:'kneeR',shape:'line',a:'kneeR',b:'footR',r:6},
 {id:'frontThigh',bone:'thighR',shape:'line',a:'thighR',b:'kneeR',r:7},
 {id:'frontShoe',bone:'footR',shape:'oval',p:'footR',rx:11,ry:7,bias:-.08},
 {id:'pelvis',bone:'hips',shape:'oval',p:'hips',rx:11,ry:9},
 {id:'chest',bone:'torso',shape:'line',a:'hips',b:'torso',r:12},
 {id:'backUpperArm',bone:'shoulderL',shape:'line',a:'shoulderL',b:'elbowL',r:5},
 {id:'backForearm',bone:'elbowL',shape:'line',a:'elbowL',b:'handL',r:5},
 {id:'backHand',bone:'handL',shape:'oval',p:'handL',rx:6,ry:7},
 {id:'frontUpperArm',bone:'shoulderR',shape:'line',a:'shoulderR',b:'elbowR',r:6},
 {id:'frontForearm',bone:'elbowR',shape:'line',a:'elbowR',b:'handR',r:5},
 {id:'frontHand',bone:'handR',shape:'oval',p:'handR',rx:7,ry:6},
 {id:'neck',bone:'neck',shape:'line',a:'neck',b:'head',r:5},
 {id:'head',bone:'head',shape:'oval',p:'head',rx:16,ry:16,bias:-.18}
];
function segmentDistanceSquared(x,y,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
 const t=len2?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len2)):0;
 const px=a.x+t*dx,py=a.y+t*dy;
 return (x-px)**2+(y-py)**2;
}
function partScore(x,y,part,bind){
 const bias=part.bias||0;
 if(part.shape==='line'){
  return segmentDistanceSquared(x,y,bind[part.a],bind[part.b])/(part.r*part.r)+bias;
 }
 const p=bind[part.p];
 return ((x-p.x)/part.rx)**2+((y-p.y)/part.ry)**2+bias;
}
export function extractOriginalLayers(image,rect=RUN_SPRITE_RECT,offsets={}){
 const source=document.createElement('canvas');source.width=132;source.height=143;
 const sc=source.getContext('2d',{willReadFrequently:true});
 sc.drawImage(image,rect.sx,rect.sy,rect.sw,rect.sh,rect.trimX,rect.trimY,rect.sw,rect.sh);
 const pixels=sc.getImageData(0,0,132,143).data,bind=buildPose({},offsets);
 const parts=PARTS.map(p=>({...p,canvas:document.createElement('canvas')}));
 const layers=parts.map(p=>{p.canvas.width=132;p.canvas.height=143;return new ImageData(132,143);});
 // Place the head directly over the traced head circle. This prevents
 // the jaw/outline from leaking into the neck and forearm layers.
 for(let y=0;y<143;y++)for(let x=0;x<132;x++){
  const i=(y*132+x)*4;if(!pixels[i+3])continue;
  let winner=0,best=Infinity;
  for(let k=0;k<parts.length;k++){
   let score=partScore(x,y,parts[k],bind);
   // Protect the clearly visible round head from nearby limb scoring.
   if(parts[k].id==='head'&&x>=65&&x<=96&&y>=8&&y<=39)score-=1.5;
   // Keep back shoe and leading shoe separate from their shins.
   if(parts[k].id==='rearShoe'&&x<35&&y<71)score-=.8;
   if(parts[k].id==='frontShoe'&&x>89&&y>87)score-=.6;
   if(score<best){best=score;winner=k;}
  }
  layers[winner].data.set(pixels.subarray(i,i+4),i);
 }
 for(let k=0;k<parts.length;k++)parts[k].canvas.getContext('2d').putImageData(layers[k],0,0);
 return parts;
}
export function drawOriginalRig(ctx,parts,rotations={},offsets={}){
 const posed=buildPose(rotations,offsets),bind=buildPose({},offsets);
 for(const part of parts){
  const p=posed[part.bone],r=bind[part.bone];if(!p||!r)continue;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle-r.angle);
  ctx.translate(-r.x,-r.y);ctx.drawImage(part.canvas,0,0);ctx.restore();
 }
 return posed;
}
export function verifyLayerBinding(parts,image=null,rect=RUN_SPRITE_RECT,offsets={}){
 const count=new Uint8Array(132*143);
 for(const p of parts){
  const pixels=p.canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,132,143).data;
  for(let i=0;i<count.length;i++)if(pixels[i*4+3])count[i]++;
 }
 let coveredPixels=0,overlapPixels=0;for(const n of count){if(n)coveredPixels++;if(n>1)overlapPixels++;}
 const result={layers:parts.length,coveredPixels,overlapPixels};
 if(image){
  const original=document.createElement('canvas');original.width=132;original.height=143;
  original.getContext('2d').drawImage(image,rect.sx,rect.sy,rect.sw,rect.sh,rect.trimX,rect.trimY,rect.sw,rect.sh);
  const actual=document.createElement('canvas');actual.width=132;actual.height=143;
  drawOriginalRig(actual.getContext('2d'),parts,{},offsets);
  const one=original.getContext('2d').getImageData(0,0,132,143).data;
  const two=actual.getContext('2d').getImageData(0,0,132,143).data;
  let mismatchedPixels=0;
  for(let i=0;i<132*143;i++){
   const b=i*4;
   if(one[b]!==two[b]||one[b+1]!==two[b+1]||one[b+2]!==two[b+2]||one[b+3]!==two[b+3])mismatchedPixels++;
  }
  result.restPoseMismatchPixels=mismatchedPixels;
 }
 return result;
}
