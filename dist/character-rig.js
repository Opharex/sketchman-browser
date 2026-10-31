// Reusable joint hierarchy for Sketchman skins. Coordinates in 132x143
// original character space; independent of collision boxes and game simulation.
export const RIG_VERSION='sketchman-rig-v1';
export const BONES=Object.freeze([
 {id:'root',parent:null,x:66,y:83},
 {id:'hips',parent:'root',x:0,y:14},
 {id:'torso',parent:'root',x:0,y:-17},
 {id:'neck',parent:'torso',x:0,y:-18},
 {id:'head',parent:'neck',x:0,y:-17},
 {id:'shoulderL',parent:'torso',x:-11,y:-13},
 {id:'elbowL',parent:'shoulderL',x:-13,y:12},
 {id:'handL',parent:'elbowL',x:-8,y:12},
 {id:'shoulderR',parent:'torso',x:11,y:-13},
 {id:'elbowR',parent:'shoulderR',x:13,y:12},
 {id:'handR',parent:'elbowR',x:8,y:12},
 {id:'thighL',parent:'hips',x:-9,y:0},
 {id:'kneeL',parent:'thighL',x:-7,y:17},
 {id:'footL',parent:'kneeL',x:-4,y:19},
 {id:'thighR',parent:'hips',x:9,y:0},
 {id:'kneeR',parent:'thighR',x:7,y:17},
 {id:'footR',parent:'kneeR',x:4,y:19},
 {id:'weapon',parent:'handR',x:0,y:0}
]);
export function buildPose(rotations={},offsets={}){
 const joints={};
 for(const b of BONES){
  const p=b.parent?joints[b.parent]:null;
  const angle=(p?.angle||0)+(rotations[b.id]||0);
  const a=p?.angle||0;
  const o=offsets[b.id]||{x:0,y:0};
  const x=b.x+(o.x||0),y=b.y+(o.y||0);
  joints[b.id]={x:(p?.x||0)+x*Math.cos(a)-y*Math.sin(a),
    y:(p?.y||0)+x*Math.sin(a)+y*Math.cos(a),angle,parent:b.parent};
 }
 return joints;
}
export function drawRig(ctx,joints,{bones=true,jointsVisible=true}={}){
 ctx.save();ctx.lineCap='round';
 if(bones)for(const b of BONES){const j=joints[b.id],p=j.parent&&joints[j.parent];if(!p)continue;
  ctx.strokeStyle='#4bb9e3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(j.x,j.y);ctx.stroke();}
 if(jointsVisible)for(const b of BONES){const j=joints[b.id];ctx.beginPath();ctx.arc(j.x,j.y,3,0,Math.PI*2);ctx.fillStyle=b.id==='root'?'#f8b94a':'#f7f5ec';ctx.fill();ctx.strokeStyle='#173953';ctx.lineWidth=1;ctx.stroke();}
 ctx.restore();
}
export function drawSkin(ctx,joints,style={}){
 const color=style.body||'#242629',cream=style.cream||'#e8d6ba';
 const segment=(a,b,w,c)=>{const x=joints[a],y=joints[b];ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);ctx.stroke()};
 const blob=(id,rx,ry,c)=>{const j=joints[id];ctx.save();ctx.translate(j.x,j.y);ctx.rotate(j.angle);const grad=ctx.createRadialGradient(-rx*.35,-ry*.4,1,0,0,Math.max(rx,ry)*1.4);grad.addColorStop(0,c==='cream'?'#fff7e9':'#56575a');grad.addColorStop(1,c==='cream'?cream:color);ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore()};
 segment('hips','thighL',12,color);segment('thighL','kneeL',10,color);segment('kneeL','footL',10,color);
 segment('hips','thighR',12,color);segment('thighR','kneeR',10,color);segment('kneeR','footR',10,color);
 blob('footL',13,8,'cream');blob('footR',13,8,'cream');
 segment('hips','torso',22,color);segment('torso','neck',15,color);
 segment('shoulderL','elbowL',9,color);segment('elbowL','handL',8,color);
 segment('shoulderR','elbowR',9,color);segment('elbowR','handR',8,color);
 blob('handL',8,9,'cream');blob('handR',8,9,'cream');
 blob('head',23,23,'cream');
 const h=joints.head;ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);ctx.fillStyle='#161719';
 for(const x of [-9,9]){ctx.beginPath();ctx.ellipse(x,3,5,8,0,0,7);ctx.fill();ctx.strokeStyle='#242528';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-5,-9);ctx.lineTo(x+5,-13);ctx.stroke()}ctx.restore();
}
