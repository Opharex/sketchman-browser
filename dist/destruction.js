import {DESTRUCTION_GROUPS} from './destruction-data.js';
// Browser hazard IDs differ from through.t in the APK. Keep this mapping explicit.
export const HAZARD_EFFECTS=[
 ['G_BoxDest',19,20],['G_BarrelExplodeDest',23,25],['G_SpikesHDest',21,10],
 ['G_LandMineDest',23,10],['G_SawDest',22,10],['G_AirMineDest',23,10],
 ['G_JunkDest',21,10],['G_RayDest',26,27],['G_SpikesVDest',21,10],['G_SpikesHDest',21,10]
];
const sounds={10:'S_0010_BulletOnMetal.wav',15:'S_0015_Explosion2.wav',19:'S_0019_CrateDestroyed.wav',20:'S_0020_BulletWood.wav',21:'S_0021_JunkDestroyed.wav',22:'S_0022_Saw.wav',23:'S_0023_MineDestroyed.wav',24:'S_0024_ImpactBarrel.wav',25:'S_0025_BarrelBulletHit.wav',26:'S_0026_RayDeath.wav',27:'S_0027_BulletOnRay.wav'};
export function effectSound(event,id){
 if(event==='enemyDestroy')return sounds[15];
 if(event==='hazardDestroy')return sounds[HAZARD_EFFECTS[id]?.[1]];
 if(event==='hazardCrash')return sounds[id===1?24:HAZARD_EFFECTS[id]?.[1]];
 if(event==='hazardHit')return sounds[HAZARD_EFFECTS[id]?.[2]];
}
export function destructionGroup(id,crash=false){return crash&&id===1?'G_BarrelCrashDest':HAZARD_EFFECTS[id]?.[0];}
const lerp=(a,b,t)=>a+(b-a)*t;
export function emitDestruction(particles,group,x,y,random){
 for(const def of DESTRUCTION_GROUPS[group]||[]){
  const signed=n=>(random()<.5?-1:1)*random()*n;
  for(let i=0;i<def.count;i++){
   const variance=def.variance,scale=random()*variance.scale;
   const vx=signed(variance.velocity[0]),vy=signed(variance.velocity[1]);
   const angle=signed(variance.angle),life=Math.max(1,def.life+signed(variance.life))/1000;
   const ox=signed(variance.spread[0]),oy=signed(variance.spread[1]);
   particles.push({sourceEffect:true,group,def,x:x+def.offset[0]+ox,y:y+def.offset[1]+oy,life,max:life,age:-Math.max(0,def.delay*i+signed(variance.delay))/1000,remainder:0,
    startScale:def.start.scale+scale,endScale:def.end.scale+scale,endAngle:def.end.angle+angle,
    startV:[def.start.velocity[0]+vx,def.start.velocity[1]+vy],endV:[def.end.velocity[0]+vx,def.end.velocity[1]+vy],
    texture:def.texture,angle:def.start.angle,scale:def.start.scale+scale,color:def.start.color.slice(),frame:def.frames===0?def.firstFrame:0});
  }
 }
}
export function advanceDestruction(p,dt){
 p.remainder+=dt;
 // Original probed particles interpolate velocity and move once per render update.
 // Use a fixed 60 Hz clock to retain that motion across browser refresh rates.
 while(p.remainder>=1/60-1e-9){
  p.remainder-=1/60;p.age+=1/60;if(p.age<0)continue;
  p.life=p.max-p.age;if(p.life<=0)break;
  const t=Math.min(1,p.age/p.max),d=p.def;
  p.x+=lerp(p.startV[0],p.endV[0],t);p.y+=lerp(p.startV[1],p.endV[1],t);
  p.scale=lerp(p.startScale,p.endScale,t);
  p.angle=p.endAngle===d.start.angle?d.start.angle:-lerp(d.start.angle,p.endAngle,t);
  p.color=d.start.color.map((v,i)=>i===3?(t<.5?lerp(v,d.midAlpha,t*2):lerp(d.midAlpha,d.end.color[3],(t-.5)*2)):lerp(v,d.end.color[i],t));
  if(d.frames>1)p.frame=Math.floor(p.age*1000/d.frameMs)%d.frames;
 }
}
export const EFFECT_TEXTURES=[...new Set(Object.values(DESTRUCTION_GROUPS).flat().map(d=>d.texture))];
