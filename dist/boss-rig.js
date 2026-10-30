// Boss puppet v1. Original atlas pieces with reconstructed occluded joint/weapon art.
// Independent of combat: no damage, timing, collision or save-state changes.
export const RIG_VERSION = 'BOSS RIG 01';
export const SOURCE = {url:'assets/Graphics/HAZ_Enemies/HAZ_Enemies_1.png', x:177,y:319,w:121,h:169};
const TAU=Math.PI*2, P=(x,y)=>({x,y}), add=(a,b)=>P(a.x+b.x,a.y+b.y);
export function rotate(p,a){return P(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));}
export function solveArm(shoulder,target,upper,lower,bend=1){
 const dx=target.x-shoulder.x,dy=target.y-shoulder.y,raw=Math.hypot(dx,dy);
 const d=Math.max(Math.abs(upper-lower)+.00001,Math.min(upper+lower-.00001,raw));
 const a=Math.atan2(dy,dx),off=Math.acos(Math.max(-1,Math.min(1,(upper*upper+d*d-lower*lower)/(2*upper*d))));
 const elbow=add(shoulder,rotate(P(upper,0),a+bend*off));
 const wrist=add(shoulder,rotate(P(d,0),a));
 return {shoulder,elbow,wrist,target,error:Math.hypot(wrist.x-target.x,wrist.y-target.y)};
}
export const PRESETS={
 ready:{gripX:91,gripY:83,angle:0,pump:0,lean:0,head:0,release:0},
 recoil:{gripX:98,gripY:80,angle:.11,pump:0,lean:.05,head:.025,release:0},
 raised:{gripX:47,gripY:67,angle:Math.PI/2,pump:0,lean:-.055,head:-.06,release:0},
 cocked:{gripX:47,gripY:67,angle:Math.PI/2,pump:1,lean:-.055,head:-.06,release:0},
 released:{gripX:62,gripY:76,angle:.7,pump:0,lean:-.035,head:-.04,release:1}
};
export function poseRig(input={}){
 const p={...PRESETS.ready,...input};
 // Both chains share the torso parent. Weapon is attached at the firing wrist.
 const front=solveArm(P(85,53),P(p.gripX,p.gripY),30,17,-1);
 const grip=front.wrist;
 const supportSocket=add(grip,rotate(P(-51+11*p.pump,1),p.angle));
 const free=P(54,95);
 const target=P(supportSocket.x*(1-p.release)+free.x*p.release,supportSocket.y*(1-p.release)+free.y*p.release);
 const rear=solveArm(P(65,53),target,21,24,-1);
 return {p,front,rear,grip,supportSocket,gunAngle:p.angle};
}
export function sampleRig(t){
 const keys=[[0,'ready'],[.7,'ready'],[.85,'recoil'],[1.2,'ready'],[2.3,'raised'],[2.65,'raised'],[2.95,'cocked'],[3.25,'raised'],[3.7,'raised'],[4.6,'released'],[5.5,'ready'],[6,'ready']];
 t=((t%6)+6)%6;
 let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
 const [a,pa]=keys[i],[b,pb]=keys[i+1],u=(t-a)/(b-a),v=u*u*(3-2*u),out={};
 for(const k of Object.keys(PRESETS.ready))out[k]=PRESETS[pa][k]+(PRESETS[pb][k]-PRESETS[pa][k])*v;
 return out;
}
const paths={
 head:[[47,0],[104,0],[104,43],[89,49],[70,49],[48,43]],
 torso:[[72,43],[87,47],[91,55],[84,65],[82,75],[66,75],[61,64],[58,53]],
 legs:[[61,94],[84,95],[91,104],[91,121],[111,140],[121,169],[0,169],[0,111]],
 rearUpper:[[58,49],[71,51],[67,64],[61,74],[52,78],[48,70],[55,60]],
 rearFore:[[54,68],[62,74],[53,80],[43,86],[34,89],[28,85],[36,79],[47,73]],
 frontUpper:[[82,47],[94,52],[107,66],[112,73],[108,81],[101,78],[97,69],[82,59]],
 frontFore:[[102,71],[112,73],[113,84],[108,91],[97,94],[89,91],[86,84],[94,80],[103,82]],
 frontHand:[[86,80],[97,79],[104,82],[102,91],[94,94],[84,89]],
 rearHand:[[27,79],[39,78],[46,82],[44,89],[32,90],[26,86]]
};
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function canvas(w,h){const a=document.createElement('canvas');a.width=w;a.height=h;return a;}
export async function loadBossRig(){
 const image=new Image();image.src=SOURCE.url;await image.decode();return createBossRig(image);
}
export function createBossRig(image,{trimmed=false}={}){
 const original=canvas(121,169),o=original.getContext('2d');if(trimmed)o.drawImage(image,0,0);else o.drawImage(image,SOURCE.x,SOURCE.y,121,169,0,0,121,169);
 const parts={};
 for(const [name,path] of Object.entries(paths)){const a=canvas(121,169),c=a.getContext('2d');polygon(c,path);c.clip();c.drawImage(original,0,0);parts[name]=a;}
 // Reconstruct a clean receiver where the source pose's hands/torso hide it.
 // Retain the source muzzle/barrel pixels; rest follows the source stock profile.
 const gun=canvas(122,40),g=gun.getContext('2d');g.translate(0,-65);
 const outline=[[6,75],[79,75],[91,80],[115,79],[116,98],[96,94],[85,87],[6,87]];
 polygon(g,outline);g.fillStyle='#052d4a';g.save();g.translate(2,3);g.fill();g.restore();
 g.lineJoin='round';g.lineWidth=6;g.strokeStyle='#fff';g.stroke();g.fillStyle='#8e181a';g.fill();
 g.drawImage(original,5,74,21,10,5,74,21,10);
 g.strokeStyle='#d8b0ad';g.lineWidth=1.4;g.beginPath();g.moveTo(7,78);g.lineTo(78,78);g.lineTo(92,84);g.moveTo(8,84);g.lineTo(75,84);g.moveTo(98,86);g.lineTo(111,83);g.moveTo(98,90);g.lineTo(111,93);g.stroke();
 g.strokeStyle='#6f0c10';g.lineWidth=1;for(let i=0;i<11;i++){g.beginPath();g.moveTo(97+i*1.3,84);g.lineTo(94+i*1.7,93);g.stroke();}
 const pump=canvas(26,15),q=pump.getContext('2d');q.fillStyle='#fff';q.beginPath();q.roundRect(0,1,26,12,3);q.fill();q.fillStyle='#8f1719';q.beginPath();q.roundRect(1.5,3,23,8,2);q.fill();q.strokeStyle='#d0a3a0';q.lineWidth=1.2;for(let i=4;i<24;i+=3){q.beginPath();q.moveTo(i,4);q.lineTo(i-2,10);q.stroke();}
 function piece(c,name,dx=0,dy=0){c.drawImage(parts[name],dx,dy);}
 function bone(c,name,from,to,sourceA,sourceB){c.save();c.translate(from.x,from.y);c.rotate(Math.atan2(to.y-from.y,to.x-from.x));c.scale(Math.hypot(to.x-from.x,to.y-from.y)/Math.hypot(sourceB.x-sourceA.x,sourceB.y-sourceA.y),1);c.rotate(-Math.atan2(sourceB.y-sourceA.y,sourceB.x-sourceA.x));c.translate(-sourceA.x,-sourceA.y);piece(c,name);c.restore();}
 function joint(c,p,r=4){c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,r+2,0,TAU);c.fill();c.fillStyle='#971b1d';c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.fill();}
 function hand(c,name,at,source,angle){c.save();c.translate(at.x,at.y);c.rotate(angle);c.translate(-source.x,-source.y);piece(c,name);c.restore();}
 function arm(c,a,rear){joint(c,a.shoulder,4);joint(c,a.elbow,3.8);
 if(rear){bone(c,'rearUpper',a.shoulder,a.elbow,P(65,53),P(56,72));bone(c,'rearFore',a.elbow,a.wrist,P(56,72),P(36,84));}
 else {bone(c,'frontUpper',a.shoulder,a.elbow,P(85,53),P(106,74));bone(c,'frontFore',a.elbow,a.wrist,P(106,74),P(94,85));}
 }
 function draw(c,input={},options={}){
 const r=poseRig(input),{p}=r; c.save();
 // Feet stay planted; torso, shoulders and weapon share a pelvis pivot.
 piece(c,'legs');c.translate(75,98);c.rotate(p.lean);c.translate(-75,-98);
 arm(c,r.rear,true);piece(c,'torso');
 // Restore the covered lower torso and pelvis as one continuous silhouette.
 c.save();c.lineJoin='round';c.lineCap='round';
 const waist=[[66,69],[80,70],[80,87],[85,95],[80,100],[69,98],[62,103],[59,99],[67,92]];
 polygon(c,waist);c.strokeStyle='#fff';c.lineWidth=2.5;c.stroke();c.fillStyle='#931719';c.fill();
 c.strokeStyle='#ceaaa4';c.lineWidth=2;c.beginPath();c.moveTo(69,74);c.lineTo(73,87);c.lineTo(80,97);c.moveTo(76,74);c.lineTo(75,87);c.moveTo(65,100);c.lineTo(60,104);c.stroke();
 c.strokeStyle='#ab5d5a';c.lineWidth=.8;for(let i=0;i<7;i++){c.beginPath();c.moveTo(69+i,90);c.lineTo(71+i,98);c.stroke();}c.restore();
 c.save();c.translate(76,46);c.rotate(p.head);c.translate(-76,-46);piece(c,'head');c.restore();
 c.save();c.translate(r.grip.x,r.grip.y);c.rotate(p.angle);c.drawImage(gun,-91,-18);c.drawImage(pump,-64+11*p.pump,-5);c.restore();
 hand(c,'rearHand',r.rear.wrist,P(36,84),p.angle*(1-p.release));
 arm(c,r.front,false);hand(c,'frontHand',r.front.wrist,P(94,85),p.angle);
 if(options.joints){
 c.lineWidth=.7;c.strokeStyle='#00aa9c';c.fillStyle='#fff';
 for(const a of [r.rear,r.front]){c.beginPath();c.moveTo(a.shoulder.x,a.shoulder.y);c.lineTo(a.elbow.x,a.elbow.y);c.lineTo(a.wrist.x,a.wrist.y);c.stroke();for(const v of [a.shoulder,a.elbow,a.wrist]){c.beginPath();c.arc(v.x,v.y,2,0,TAU);c.fill();c.stroke();}}
 c.strokeStyle='#e19a00';c.beginPath();c.arc(r.supportSocket.x,r.supportSocket.y,3,0,TAU);c.stroke();
 }
 c.restore();return r;
 }
 return {draw,parts,original,gun,pump,version:RIG_VERSION};
}
