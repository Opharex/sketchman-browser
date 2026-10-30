import {PRESETS,rotate} from './boss-rig.js?v=boss-rig-sync-01';
export const BOSS_SHOT_SOUND='assets/Sounds/Sfx/S_0003_ShotgunFire.wav';
export const BOSS_COCK_SOUND='assets/Sounds/Sfx/S_0028_BossCockShotgun.wav';
export function bossShotTiming(interval){const scale=Math.min(1,Math.max(1/60,interval-1/60)/1.4);return {scale,pumpAt:.52*scale,duration:1.4*scale,soundRate:1/scale};}
export function bossShotPose(b){
 const {scale}=bossShotTiming(b.interval),t=b.shotAge/scale;
 if(!Number.isFinite(t)||t>=1.4||b.phase!=='fight')return {...PRESETS.ready};
 // The two pump strokes match the original cocking sample's transients (~.03-.14 / .27-.35s).
 const keys=[[0,'ready'],[.07,'recoil'],[.20,'ready'],[.50,'raised'],[.52,'raised'],[.66,'cocked'],[.78,'cocked'],[.87,'raised'],[.99,'raised'],[1.35,'ready'],[1.4,'ready']];
 let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
 const [a,pa]=keys[i],[z,pb]=keys[i+1],u=Math.max(0,(t-a)/(z-a)),s=u*u*(3-2*u),p={};
 for(const k of Object.keys(PRESETS.ready))p[k]=PRESETS[pa][k]+(PRESETS[pb][k]-PRESETS[pa][k])*s;
 return p;
}
export function bossRigPlacement(b){return {x:b.x-167,y:b.y-179};}
export function bossRigMuzzle(b,p=bossShotPose(b)){
 const local=rotate({x:-84,y:-4},p.angle),point={x:p.gripX+local.x,y:p.gripY+local.y};
 const torso=rotate({x:point.x-75,y:point.y-98},p.lean),origin=bossRigPlacement(b);
 return {x:origin.x+75+torso.x,y:origin.y+98+torso.y};
}
