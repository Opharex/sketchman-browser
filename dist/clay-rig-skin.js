/*
 * Sketchman Clay v1: bone-driven hand-sculpted 2D character.
 *
 * Unlike the abandoned tint/recolor and free-floating blob implementations,
 * this is NEW artwork drawn from the SAME 18-joint pose hierarchy used by the
 * character rig lab. Every sprite is generated once at loading time.
 *
 * The original collision system, actor anchor, speed and animation timings are
 * unaffected. All skins share the original 132x143 character coordinate system.
 */
import {BONES,buildPose,RUN_BIND_POINTS,RIG_VERSION} from './character-rig.js?v=pose-match-v4';

export const CLAY_SKIN_VERSION='clay-bone-render-v1';
const W=132,H=143,TWO_PI=Math.PI*2;
const WHITE={top:'#fff6e5',light:'#f9e5c8',mid:'#e4c39f',dark:'#a77c58',rim:'#64492f'};
const BLACK={top:'#6d6868',light:'#484443',mid:'#29272b',dark:'#15161b',rim:'#101116'};
const P=(x,y)=>({x,y});
const clone=()=>Object.fromEntries(Object.entries(RUN_BIND_POINTS).map(([id,p])=>[id,{...p}]));
const mix=(a,b,f)=>a+(b-a)*f;
const V=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const frameIndex=(name)=>Number(name.match(/_(\d+)$/)?.[1]||1);
const group=(name)=>name.replace(/^CHR_/,'').replace(/_\d+$/,'');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const seeded=(seed,n)=>{const x=Math.sin((seed*17.917+n*37.171)*1.931)*43758.5453;return x-Math.floor(x)};

// Read the center of the original rounded head outline from the source
// silhouette. This is ONLY for pose localization, never a color transformation.
function headAnchor(source,meta,type){
 const hint=type==='glide'?P(105,67):type==='jump'?P(85,43):type==='run'?P(81,25):P(72,62);
 if(!source||!meta)return hint;
 const off=meta.v,cv=document.createElement('canvas');cv.width=W;cv.height=H;
 const ctx=cv.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(source,off[11],off[12]);
 const a=ctx.getImageData(0,0,W,H).data;
 const alpha=(x,y)=>x>=0&&y>=0&&x<W&&y<H?a[((Math.round(y)*W+Math.round(x))*4)+3]:0;
 const sampleAngles=Array.from({length:16},(_,i)=>i*TWO_PI/16);
 let best={x:hint.x,y:hint.y,score:-1};
 const minX=type==='glide'?68:22,maxX=type==='glide'?119:113;
 const minY=type==='run'?11:9,maxY=type==='run'?58:102;
 for(let y=minY;y<maxY;y+=3)for(let x=minX;x<maxX;x+=3){
  if(Math.hypot(x-hint.x,y-hint.y)>(type==='run'?24:55))continue;
  for(const radius of [12,14,16]){
   let ring=0;for(const theta of sampleAngles)ring+=alpha(x+Math.cos(theta)*radius,y+Math.sin(theta)*radius)>75?1:0;
   const hollow=alpha(x,y)<90?2:0;
   const sc=ring+hollow-Math.hypot((x-hint.x)*.11,(y-hint.y)*.1);
   if(sc>best.score)best={x,y,score:sc};
  }
 }
 // Avoid relocating the figure to unrelated circular weapons/obstacles.
 if(best.score<7)return hint;
 return P(best.x,best.y);
}

function runTargets(index){
 const t=(index-1)*TWO_PI/17,cycle=(1-Math.cos(t))/2,bob=Math.sin(t)*1.7;
 const j=clone();
 const shift=Math.sin(t)*1.5;
 for(const id of ['root','hips','torso','neck','head','shoulderL','shoulderR','elbowL','elbowR','handL','handR','thighL','thighR']){
  j[id].x+=shift;j[id].y+=bob;
 }
 j.head.x+=.7*Math.sin(t);j.head.y-=.4*Math.sin(t);
 j.kneeL=P(mix(39,84,cycle),mix(88,79,cycle)+bob);
 j.footL=P(mix(27,103,cycle),mix(63,100,cycle)-Math.max(0,Math.sin(t))*9+bob);
 j.kneeR=P(mix(84,47,cycle),mix(71,83,cycle)+bob);
 j.footR=P(mix(97,30,cycle),mix(98,68,cycle)-Math.max(0,-Math.sin(t))*10+bob);
 const arm=cycle;
 j.elbowL=P(mix(55,83,arm)+shift,mix(38,55,arm)+bob);
 j.handL=P(mix(49,97,arm)+shift,mix(52,48,arm)+bob);
 j.elbowR=P(mix(83,53,arm)+shift,mix(55,40,arm)+bob);
 j.handR=P(mix(97,45,arm)+shift,mix(50,54,arm)+bob);
 return j;
}
function jumpTargets(index){
 const f=clamp((index-1)/13,0,1),j=clone(),rise=Math.sin(f*Math.PI);
 const anchor=P(86,42),hips=P(69,81+5*Math.cos(f*Math.PI)),torso=P(72,65+3*Math.cos(f*Math.PI));
 Object.assign(j,{root:{...hips},hips,torso,
  neck:P(anchor.x-4,anchor.y+16),head:anchor,
  shoulderL:P(torso.x-13,torso.y-11),shoulderR:P(torso.x+7,torso.y-13),
  elbowL:P(torso.x-23,torso.y-1),handL:P(torso.x-34,torso.y-15-rise*2),
  elbowR:P(torso.x+21,torso.y-5),handR:P(torso.x+35,torso.y-13-rise*6),
  thighL:P(hips.x-8,hips.y+2),thighR:P(hips.x+7,hips.y+1),
  kneeL:P(hips.x-20,hips.y+20-rise*8),footL:P(hips.x-29,hips.y+12-rise*15),
  kneeR:P(hips.x+18,hips.y+18-rise*9),footR:P(hips.x+33,hips.y+31-rise*18)});
 return j;
}
function glideTargets(index){
 const j=clone(),bob=index===2?2:0;
 Object.assign(j,{
 root:P(66,72+bob),hips:P(61,70+bob),torso:P(79,65+bob),
 neck:P(91,61+bob),head:P(106,61+bob),
 shoulderL:P(80,56+bob),elbowL:P(95,53+bob),handL:P(112,49+bob),
 shoulderR:P(86,69+bob),elbowR:P(100,69+bob),handR:P(117,64+bob),
 thighL:P(55,72+bob),kneeL:P(37,70+bob),footL:P(21,62+bob),
 thighR:P(59,77+bob),kneeR:P(40,83+bob),footR:P(23,90+bob)});
 return j;
}
function rotate(j,angle,cx=66,cy=73){
 const ca=Math.cos(angle),sa=Math.sin(angle);
 for(const p of Object.values(j)){
  const dx=p.x-cx,dy=p.y-cy;p.x=cx+dx*ca-dy*sa;p.y=cy+dx*sa+dy*ca;
 }
 return j;
}
function rollTargets(index){
 const j=runTargets(index*2+1),theta=(index-1)/7*TWO_PI;
 // Rotate the whole rig in a compact tumble around the actor's anchor.
 for(const p of Object.values(j)){p.x=66+(p.x-66)*.77;p.y=71+(p.y-71)*.70;}
 return rotate(j,theta,66,72);
}
function deathTargets(index,deadFloor=false){
 const j=runTargets(1),f=deadFloor?1:clamp((index-1)/9,0,1);
 for(const p of Object.values(j)){p.x=66+(p.x-66)*(.97-f*.12);p.y=74+(p.y-73)*(.97-f*.20);}
 rotate(j,f*1.57,66,74);
 if(f>.5){const fall=(f-.5)*2;for(const p of Object.values(j))p.y+=fall*17;}
 if(deadFloor){for(const p of Object.values(j)){p.y=Math.min(119,p.y+7);} }
 return j;
}
function poseFor(name,source,meta){
 const kind=group(name),idx=frameIndex(name);
 const isRun=kind==='Run'||kind.startsWith('RunN'),isJump=kind==='Jump'||kind.startsWith('JumpN');
 const isGlide=kind==='Glide'||kind==='SuperSketchman',isRoll=kind==='Roll';
 const isDeath=kind==='Death'||kind==='DeadFloor';
 let j=isRun?runTargets(idx):isJump?jumpTargets(idx):isGlide?glideTargets(idx):isRoll?rollTargets(idx):isDeath?deathTargets(idx,kind==='DeadFloor'):runTargets(idx);
 if(isRun||isJump||isGlide){
  const wanted=isRun?'run':isJump?'jump':'glide';
  const anchor=headAnchor(source,meta,wanted),delta=P(anchor.x-j.head.x,anchor.y-j.head.y);
  // Actual head is tracked per APK frame; move the linked skeleton as a
  // unit, preserving the length/shape of bones instead of detaching it.
  delta.x=clamp(delta.x,isRun?-7:-16,isRun?7:16);
  delta.y=clamp(delta.y,isRun?-8:-19,isRun?8:19);
  for(const p of Object.values(j)){p.x+=delta.x;p.y+=delta.y;}
 }
 // All limbs must remain inside the 132x143 character coordinate system.
 for(const p of Object.values(j)){p.x=clamp(p.x,9,123);p.y=clamp(p.y,9,133);}
 j.weapon={...j.handR};
 return j;
}
function jointPose(target){
 const offset={};
 for(const b of BONES){
  const p=target[b.id]||RUN_BIND_POINTS[b.id],a=b.parent?(target[b.parent]||RUN_BIND_POINTS[b.parent]):P(0,0);
  offset[b.id]={x:p.x-a.x-b.x,y:p.y-a.y-b.y};
 }
 return buildPose({},offset);
}
// Deterministic handmade outlines, shaded with gradients and tool marks.
// All surface marks are local to their parent joint, so the material tracks
// the limb as it animates, unlike a static filter over original pixels.
function lumpPath(g,rx,ry,seed){
 g.beginPath();
 for(let i=0;i<=50;i++){
  const theta=i*TWO_PI/50;
  const irregular=1+.032*Math.sin(theta*5+seed*1.8)+.018*Math.sin(theta*9-seed*2.6)+.013*Math.cos(theta*13+seed);
  const x=Math.cos(theta)*rx*irregular,y=Math.sin(theta)*ry*irregular;
  if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
 }
 g.closePath();
}
function clayBlob(g,x,y,rx,ry,mat,seed,angle=0,texture=true){
 const pal=mat==='cream'?WHITE:BLACK;
 g.save();g.translate(x,y);g.rotate(angle);
 lumpPath(g,rx,ry,seed);
 g.fillStyle=pal.rim;g.fill();
 g.save();g.clip();
 const gr=g.createRadialGradient(-rx*.36,-ry*.48,rx*.02,rx*.12,ry*.11,Math.max(rx,ry)*1.33);
 gr.addColorStop(0,pal.top);gr.addColorStop(.32,pal.light);gr.addColorStop(.73,pal.mid);gr.addColorStop(1,pal.dark);
 g.fillStyle=gr;g.fillRect(-rx*1.3,-ry*1.3,rx*2.6,ry*2.6);
 // A glossy upper-left highlight rolls away into the material.
 const highlight=g.createRadialGradient(-rx*.39,-ry*.45,0,-rx*.30,-ry*.4,rx*.86);
 highlight.addColorStop(0,mat==='cream'?'#ffffff8c':'#ffffff42');
 highlight.addColorStop(1,'#ffffff00');
 g.fillStyle=highlight;g.fillRect(-rx,-ry,rx*2,ry*2);
 if(texture){
  for(let i=0;i<22;i++){
   const xx=(seeded(seed,i*2)-.5)*1.65*rx,yy=(seeded(seed,i*2+1)-.5)*1.55*ry;
   const w=(.55+seeded(seed,i+42)*1.7)*(mat==='cream'?1:.7);
   g.save();g.translate(xx,yy);g.rotate((seeded(seed,i+87)-.5)*1.6);
   g.beginPath();g.ellipse(0,0,w*.95,w*.27,0,0,TWO_PI);
   g.fillStyle=i%4===0?'#80634430':i%3===0?'#ffffff5a':'#352d2333';g.fill();
   g.restore();
  }
  // Offset nested curved scratches/fingerprints: small and organic.
  for(let i=0;i<3;i++){
   const ox=(seeded(seed,i+191)-.5)*rx*1.18,oy=(seeded(seed,i+211)-.5)*ry*1.18;
   g.lineWidth=.42;g.strokeStyle=mat==='cream'?'#9e785b59':'#aca7a755';
   for(let k=0;k<3;k++){
    g.beginPath();g.ellipse(ox,oy,1.5+k*.9,1+k*.75,-.3,.2,1.65);
    g.stroke();
   }
  }
 }
 g.restore();
 g.strokeStyle=mat==='cream'?'#9573525e':'#08090dc0';g.lineWidth=.75;g.stroke();
 g.restore();
}
function tube(g,a,b,r,mat,seed){
 if(!a||!b)return;
 const length=V(a,b);if(length<1)return;
 const angle=Math.atan2(b.y-a.y,b.x-a.x);
 const pal=mat==='cream'?WHITE:BLACK;
 g.save();g.translate(a.x,a.y);g.rotate(angle);
 g.beginPath();
 g.moveTo(0,-r*.85);g.bezierCurveTo(length*.27,-r*1.2,length*.70,-r*.84,length,-r*.81);
 g.quadraticCurveTo(length+r*.26,0,length,r*.85);
 g.bezierCurveTo(length*.64,r*1.10,length*.25,r*.82,0,r*.92);
 g.quadraticCurveTo(-r*.35,0,0,-r*.85);g.closePath();
 const gr=g.createLinearGradient(0,-r,0,r);
 gr.addColorStop(0,pal.light);gr.addColorStop(.23,pal.top);gr.addColorStop(.55,pal.mid);gr.addColorStop(1,pal.dark);
 g.fillStyle=gr;g.fill();
 g.save();g.clip();
 g.beginPath();g.moveTo(length*.11,-r*.58);g.bezierCurveTo(length*.46,-r*.78,length*.75,-r*.48,length*.93,-r*.36);
 g.lineWidth=1.1;g.strokeStyle=mat==='cream'?'#ffffff7a':'#b7b0a45c';g.stroke();
 for(let i=0;i<5;i++){
  const xx=length*(.09+seeded(seed,i+8)*.83),yy=(seeded(seed,i+24)-.5)*r*1.4;
  g.strokeStyle=i%2?'#f5e9d83f':'#05050539';g.lineWidth=.5;
  g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+1.4,yy+.4);g.stroke();
 }
 g.restore();g.strokeStyle=pal.rim;g.lineWidth=.65;g.stroke();
 g.restore();
}
function glove(g,p,dx,dy,seed){
 const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 clayBlob(g,p.x-ux*2,p.y-uy*2,6.3,6.2,'cream',seed,Math.atan2(uy,ux));
 clayBlob(g,p.x+ux*3,p.y+uy*2,4.8,5,'cream',seed+1);
 for(let i=-1;i<=1;i++){
  const xx=p.x+ux*5-uy*i*2.8,yy=p.y+uy*5+ux*i*2.8;
  clayBlob(g,xx,yy,2.3,2.5,'cream',seed+3+i,.2,false);
 }
 g.lineWidth=1;g.strokeStyle='#fff8e994';
 g.beginPath();g.arc(p.x-ux*1.7,p.y-uy*1.7,3.7,2.8,5.8);g.stroke();
}
function shoe(g,knee,foot,seed){
 const ax=foot.x-knee.x,ay=foot.y-knee.y,rot=clamp(Math.atan2(ay,ax)*.37,-.55,.65);
 // Anklet cuff is pressed into the larger, rounded clay sneaker.
 clayBlob(g,foot.x-2,foot.y-6,7.2,4.4,'cream',seed+10,rot);
 clayBlob(g,foot.x+2.1,foot.y,10.6,6.9,'cream',seed,rot);
 g.save();g.translate(foot.x,foot.y);g.rotate(rot);
 g.strokeStyle='#936e4f85';g.lineWidth=.95;
 g.beginPath();g.moveTo(-7,4);g.quadraticCurveTo(1,7,10,4.5);g.stroke();
 g.strokeStyle='#fff9e5c9';g.lineWidth=1.1;g.beginPath();g.moveTo(-4,-3.8);g.quadraticCurveTo(1,-6.6,6,-4);g.stroke();
 g.restore();
}
function face(g,head,ang,seed,kind){
 g.save();g.translate(head.x,head.y);g.rotate(ang);
 const isStruck=kind==='Death'||kind==='DeadFloor';
 const eyebrow=(x,y,dir)=>{
  g.strokeStyle='#111215';g.lineWidth=3.3;g.lineCap='round';
  g.beginPath();g.moveTo(x-5,y+(dir?-1:-4));g.quadraticCurveTo(x,y-3,x+4,y+(dir?-4:0));g.stroke();
  g.strokeStyle='#99958a55';g.lineWidth=.6;
  g.beginPath();g.moveTo(x-4,y-4);g.lineTo(x+2,y-5);g.stroke();
 };
 const eye=(x,y,rr=1)=>{
  clayBlob(g, x,y,4.2*rr,6.1*rr,'dark',seed+6,0,false);
  g.fillStyle='#0c0b0d';g.beginPath();g.ellipse(x+.15,y+.3,3.4*rr,5.2*rr,-.13,0,TWO_PI);g.fill();
  g.fillStyle='#ffffffe0';g.beginPath();g.ellipse(x-1.4,y-2,1.05,1.6,-.32,0,TWO_PI);g.fill();
  g.fillStyle='#ffffff70';g.beginPath();g.ellipse(x+.9,y+1.4,.5,.7,0,0,TWO_PI);g.fill();
 };
 if(isStruck){
  g.strokeStyle='#1b1a1a';g.lineWidth=1.6;g.beginPath();g.moveTo(-8,-1);g.lineTo(-2,4);g.moveTo(-2,-1);g.lineTo(-8,4);
  g.moveTo(4,-1);g.lineTo(10,4);g.moveTo(10,-1);g.lineTo(4,4);g.stroke();
 }else{
  eye(-6,2);eye(6,2);
  eyebrow(-6,-7,false);eyebrow(6,-7,true);
 }
 g.strokeStyle='#6f4a39';g.lineWidth=.8;g.beginPath();g.moveTo(-1,11);g.quadraticCurveTo(1,10,3,11);g.stroke();
 g.restore();
}
function gun(g,hand,type){
 if(!type)return;
 g.save();g.translate(hand.x+1,hand.y-3);
 // Weapons retain a visible, oriented attachment on the handR joint.
 // Weapon category and firing cadence are unchanged by this visual skin.
 const col='#2e3136',rim='#111217';
 g.lineJoin='round';g.lineCap='round';g.strokeStyle=rim;g.lineWidth=1;
 if(type==='Bow'){
  g.strokeStyle='#b9945f';g.lineWidth=3.5;g.beginPath();g.moveTo(17,-23);g.quadraticCurveTo(28,0,17,22);g.stroke();
  g.strokeStyle='#eee4ca';g.lineWidth=.9;g.beginPath();g.moveTo(17,-23);g.lineTo(17,22);g.stroke();
  g.strokeStyle='#777a7f';g.beginPath();g.moveTo(0,0);g.lineTo(30,0);g.stroke();
 }else if(type==='RPG'){
  g.fillStyle='#4f5557';g.fillRect(-2,-8,33,10);g.strokeRect(-2,-8,33,10);
  g.fillStyle='#a5aaa7';g.fillRect(24,-10,7,14);g.strokeRect(24,-10,7,14);
  g.fillStyle='#2b2d2c';g.fillRect(6,1,5,8);
 }else{
  const long=type==='Shotgun',smg=type==='Uzzi';
  g.fillStyle=col;g.beginPath();g.roundRect(-1,-6,long?37:smg?22:16,long?7:6,1.5);g.fill();g.stroke();
  g.fillStyle='#81868a';g.fillRect(3,-5,long?29:smg?13:10,2.1);
  g.fillStyle='#1c1d20';g.beginPath();g.moveTo(3,0);g.lineTo(9,0);g.lineTo(smg?11:7,10);g.lineTo(4,10);g.closePath();g.fill();
  if(smg){g.fillRect(13,0,5,10);}
  if(long){g.fillRect(33,-5,10,2);}
 }
 g.restore();
}
function drawClay(g,j,kind,name){
 const weaponType=kind.match(/^(RunN|JumpN)(.+)$/)?.[2]||null;
 const head=j.head,hips=j.hips;
 // A short handmade cape shows clearly in original gliding / super frames.
 if(kind==='Glide'||kind==='SuperSketchman'){
  g.fillStyle='#35343caf';g.strokeStyle='#121317b3';g.lineWidth=1;
  g.beginPath();g.moveTo(j.shoulderL.x-2,j.shoulderL.y-7);
  g.quadraticCurveTo(j.hips.x-4,j.hips.y-19,j.footL.x-5,j.footL.y-13);
  g.lineTo(j.hips.x-16,j.hips.y+16);
  g.closePath();g.fill();g.stroke();
 }
 // Back leg: full bone chain rather than independent floating ellipses.
 tube(g,j.hips,j.thighL,5.7,'dark',11);
 tube(g,j.thighL,j.kneeL,5.5,'dark',12);
 clayBlob(g,j.kneeL.x,j.kneeL.y,5.1,5.3,'dark',13);
 tube(g,j.kneeL,j.footL,4.8,'dark',14);
 shoe(g,j.kneeL,j.footL,15);
 // Back shoulder + hand.
 tube(g,j.torso,j.shoulderL,6.1,'dark',18);
 tube(g,j.shoulderL,j.elbowL,5.2,'dark',19);
 clayBlob(g,j.elbowL.x,j.elbowL.y,4.8,5,'dark',20);
 tube(g,j.elbowL,j.handL,4.5,'dark',21);
 glove(g,j.handL,j.handL.x-j.elbowL.x,j.handL.y-j.elbowL.y,22);
 // Front leg. Slightly brighter shading makes forms read at mobile size.
 tube(g,j.hips,j.thighR,6.1,'dark',25);
 tube(g,j.thighR,j.kneeR,5.5,'dark',26);
 clayBlob(g,j.kneeR.x,j.kneeR.y,5.1,5.3,'dark',27);
 tube(g,j.kneeR,j.footR,5,'dark',28);
 shoe(g,j.kneeR,j.footR,29);
 // Torso is *sculpted*, not a solid-black stick silhouette.
 const torsoMid=P(mix(hips.x,j.torso.x,.63),mix(hips.y,j.torso.y,.63));
 const torsoAngle=Math.atan2(j.torso.y-hips.y,j.torso.x-hips.x)+Math.PI/2;
 clayBlob(g,torsoMid.x,torsoMid.y,11.5,17.3,'dark',31,torsoAngle);
 tube(g,j.torso,j.neck,6,'dark',32);
 // Front arm and sculpted fist in front of the torso.
 tube(g,j.torso,j.shoulderR,6.2,'dark',34);
 tube(g,j.shoulderR,j.elbowR,5.4,'dark',35);
 clayBlob(g,j.elbowR.x,j.elbowR.y,5.2,5.3,'dark',36);
 tube(g,j.elbowR,j.handR,4.8,'dark',37);
 // Draw the weapon above the forearm and below the fingers.
 gun(g,j.handR,weaponType);
 glove(g,j.handR,j.handR.x-j.elbowR.x,j.handR.y-j.elbowR.y,38);
 // Oversized cream head, lumpy glossy surface, black expressive eyes.
 const hx=head.x,hy=head.y;
 clayBlob(g,hx,hy,15.1,15.3,'cream',47,-.13);
 face(g,head,-.07,49,kind);
}
// Shared for all future skins: any new skin material can receive these same
// bone positions and pose names without changing movement/combat code.
export function renderClayPose(ctx,frameName,source,meta){
 const kind=group(frameName),target=poseFor(frameName,source,meta);
 const joints=jointPose(target);
 ctx.save();
 drawClay(ctx,joints,kind,frameName);
 ctx.restore();
 return joints;
}
export function prepareRiggedClaySprites(assets,sprites){
 const names=Object.keys(sprites).filter(n=>n.startsWith('CHR_')&&assets[n]);
 const generated=[];
 for(const name of names){
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  try{
   renderClayPose(ctx,name,assets[name],sprites[name]);
   assets['CLAY_'+name]=c;
   // Untrimmed 132x143 frame. The exact same center/player position and
   // hitboxes as the APK frame. Extra sculpted edges are not clipped.
   sprites['CLAY_'+name]={atlas:'rigged-clay',v:[0,0,0,W,H,W,H,W,H,0,0,0,0,0,0]};
   generated.push(name);
  }catch(e){
   console.warn('Clay frame fallback',name,e);
   assets['CLAY_'+name]=assets[name];
   sprites['CLAY_'+name]=sprites[name];
  }
 }
 return generated.length;
}
