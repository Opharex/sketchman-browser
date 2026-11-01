// Shared, extensible game-mode registry. Modes alter *resolved* obstacle
// entities only, never the original pattern director, random stream or events.
export const CLASSIC_MODE='classic';
export const BOMB_MODE='oops_all_bombs';
export const GAME_MODES=Object.freeze([
 Object.freeze({
  id:CLASSIC_MODE,name:'CLASSIC',
  description:'The original Sketchman experience.',
  previewSprites:Object.freeze(['HAZ_Crate_01','HAZ_Barrel_01']),
  obstacleReplacement:null,
  bossReward:100 // Preserve the original boss payout.
 }),
 Object.freeze({
  id:BOMB_MODE,name:'OOPS ALL BOMBS',
  description:'Floating mines everywhere. Beat the boss for 500 coins!',
  previewSprites:Object.freeze(['HAZ_AirMine_01']),
  obstacleReplacement:5, // Original floating air mine with native effects and damage.
  bossReward:500 // Total per boss defeat; repeatable across encounters.
 })
]);
const modeIndex=new Map(GAME_MODES.map(mode=>[mode.id,mode]));
export function getGameMode(id){return modeIndex.get(id)||modeIndex.get(CLASSIC_MODE);}
export function gameModeName(id){return getGameMode(id).name;}
/**
 * Runs AFTER the standard hazard has spawned, so its original RNG usage,
 * spawn timing, pattern history, X position and source Y anchor are fixed.
 * For explicit pattern Y, preserve the original centerline, translating
 * only the bottom-aligned hitbox to the replacement hazard's height.
 * Original airborne hazards preserve their centerline. Floating replacements
 * are lifted where needed to keep their bottom clear of the ground.
 * No extra entities or random calls; each mine is a REAL air-mine hazard.
 */
export function substituteHazard(hazard,modeId,hazards,{explicitY=false,floor=492}={}){
 const mode=getGameMode(modeId);
 if(mode.obstacleReplacement==null)return hazard;
 const target=hazards[mode.obstacleReplacement];
 if(!target)throw new Error('Unknown game-mode hazard '+mode.obstacleReplacement);
 const bottom=hazard.y;
 const center=bottom-hazard.h/2;
 const naturalY=explicitY||hazard.air?center+target.h/2:bottom;
 // Some original grounded patterns have low centerlines; keep air mines airborne.
 const replacementY=target.air?Math.min(naturalY,floor-48):naturalY;
 // Preserve spawn scheduling and movement. Native air-mine stats automatically
 // select its own collision, damage, sound and explosion group.
 return {
  ...target,type:'hazard',id:target.id,x:hazard.x,y:replacementY,
  age:hazard.age??0,maxHp:target.hp,
  modeBomb:true,sourceObstacleId:hazard.id,
  spawnCenterY:center,spawnX:hazard.x
 };
}
export function modeScoreRecord(distance,coins,kills,weapon,date=new Date().toISOString()){
 return {distance:Math.floor(distance),coins,kills,weapon,date};
}
