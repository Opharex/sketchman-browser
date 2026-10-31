// Sketchman rig: manually aligned to the actual CHR_Run_01 APK art.
// 132 x 143 untrimmed frame coordinates, atlas CHR_SketchMan_2,
// clip (477,133,104,104), trim offset (9,6).
// This is a *run-pose* bind skeleton, NOT a generic T/A-pose template.
export const RIG_VERSION='sketchman-run-bind-v4';

// Coordinates measured against original CHR_Run_01 pixels. The head is
// at (80,25); left/rear knee is bent at (39,88); front foot at (97,98).
// Naming L/R describes the screen-side limbs, not anatomical handedness.
export const RUN_BIND_POINTS=Object.freeze({
 root:{x:65,y:66},hips:{x:65,y:66},
 torso:{x:67,y:53},neck:{x:74,y:40},head:{x:80,y:25},
 shoulderL:{x:62,y:43},elbowL:{x:55,y:38},handL:{x:49,y:52},
 shoulderR:{x:76,y:44},elbowR:{x:83,y:55},handR:{x:97,y:50},
 thighL:{x:57,y:69},kneeL:{x:39,y:88},footL:{x:27,y:63},
 thighR:{x:76,y:67},kneeR:{x:84,y:71},footR:{x:97,y:98},
 weapon:{x:97,y:50}
});
const HIERARCHY=[
 ['root',null],['hips','root'],['torso','hips'],['neck','torso'],['head','neck'],
 ['shoulderL','torso'],['elbowL','shoulderL'],['handL','elbowL'],
 ['shoulderR','torso'],['elbowR','shoulderR'],['handR','elbowR'],
 ['thighL','hips'],['kneeL','thighL'],['footL','kneeL'],
 ['thighR','hips'],['kneeR','thighR'],['footR','kneeR'],
 ['weapon','handR']
];
export const BONES=Object.freeze(HIERARCHY.map(([id,parent])=>{
 const a=RUN_BIND_POINTS[id],b=parent?RUN_BIND_POINTS[parent]:{x:0,y:0};
 return Object.freeze({id,parent,x:a.x-b.x,y:a.y-b.y});
}));
// Optional user calibration offsets remain parent-local. The old v3
// offsets MUST NOT be reused: they were calibrated to a wrong skeleton.
export const RUN_BIND_OFFSETS=Object.freeze({});
export function buildPose(rotations={},offsets={}){
 const joints={};
 for(const b of BONES){
  const p=b.parent?joints[b.parent]:null;
  const parentAngle=p?.angle||0,angle=parentAngle+(rotations[b.id]||0);
  const o=offsets[b.id]||{x:0,y:0};
  const dx=b.x+(o.x||0),dy=b.y+(o.y||0);
  joints[b.id]={
   x:(p?.x||0)+dx*Math.cos(parentAngle)-dy*Math.sin(parentAngle),
   y:(p?.y||0)+dx*Math.sin(parentAngle)+dy*Math.cos(parentAngle),
   angle,parent:b.parent
  };
 }
 return joints;
}
export function drawRig(ctx,joints,{bones=true,jointsVisible=true,labels=false}={}){
 ctx.save();ctx.lineCap='round';
 if(bones)for(const bone of BONES){
  const j=joints[bone.id],p=j.parent&&joints[j.parent];if(!p)continue;
  ctx.lineWidth=1.75;ctx.strokeStyle=bone.id==='head'?'#e86f38':'#00b5d7';
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(j.x,j.y);ctx.stroke();
 }
 if(jointsVisible)for(const bone of BONES){
  if(bone.id==='weapon')continue;
  const j=joints[bone.id];ctx.beginPath();ctx.arc(j.x,j.y,2.8,0,Math.PI*2);
  ctx.fillStyle=bone.id==='head'?'#ff9943':bone.id==='root'?'#ffdb43':'#fcf4de';
  ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#114160';ctx.stroke();
  if(labels){
   ctx.font='4px system-ui';ctx.textBaseline='bottom';ctx.lineWidth=1.5;
   ctx.strokeStyle='#ffffff';ctx.strokeText(bone.id,j.x+4,j.y-2);
   ctx.fillStyle='#163b56';ctx.fillText(bone.id,j.x+4,j.y-2);
  }
 }
 ctx.restore();
}
// Optional style-neutral geometry preview. Source pixels are rendered
// instead by drawOriginalRig in the artwork lab.
export function drawSkin(ctx,joints,style={}){
 const color=style.body||'#242629',cream=style.cream||'#e8d6ba';
 const segment=(a,b,w,c)=>{
  const x=joints[a],y=joints[b];ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke();
 };
 const blob=(id,rx,ry,c)=>{
  const j=joints[id];ctx.save();ctx.translate(j.x,j.y);ctx.rotate(j.angle);
  const grad=ctx.createRadialGradient(-rx*.35,-ry*.4,1,0,0,Math.max(rx,ry)*1.4);
  grad.addColorStop(0,c==='cream'?'#fff7e9':'#56575a');
  grad.addColorStop(1,c==='cream'?cream:color);
  ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
 };
 segment('hips','thighL',12,color);segment('thighL','kneeL',10,color);segment('kneeL','footL',10,color);
 segment('hips','thighR',12,color);segment('thighR','kneeR',10,color);segment('kneeR','footR',10,color);
 blob('footL',13,8,'cream');blob('footR',13,8,'cream');
 segment('hips','torso',21,color);segment('torso','neck',12,color);
 segment('shoulderL','elbowL',9,color);segment('elbowL','handL',8,color);
 segment('shoulderR','elbowR',9,color);segment('elbowR','handR',8,color);
 blob('handL',7,9,'cream');blob('handR',7,9,'cream');blob('head',15,15,'cream');
}
