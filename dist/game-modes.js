// Shared, extensible game-mode registry. Modes alter *resolved* obstacle
// entities only, never the original pattern director, random stream or events.
export const CLASSIC_MODE='classic';
export const BOMB_MODE='oops_all_bombs';
export const GAME_MODES=Object.freeze([
 Object.freeze({
  id:CLASSIC_MODE,name:'CLASSIC',
  description:'The original Sketchman experience.',
  previewSprites:Object.freeze(['HAZ_Crate_01','HAZ_Barrel_01']),
  obstacleReplacement:null
 }),
 Object.freeze({
  id:BOMB_MODE,name:'OOPS ALL BOMBS',
  description:'Every obstacle is a bomb. Watch your step!',
  previewSprites:Object.freeze(['HAZ_Mine_01']),
  obstacleReplacement:3  // APK standard land-mine, native sound and destruction.
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
 * For an implicit grounded Y, preserve the ground contact. Native airborne
 * hazards spawned without Y retain their original centerline.
 * No extra entities and no random calls. A bomb is a REAL mine hazard.
 */
export function substituteHazard(hazard,modeId,hazards,{explicitY=false}={}){
 const mode=getGameMode(modeId);
 if(mode.obstacleReplacement==null)return hazard;
 const target=hazards[mode.obstacleReplacement];
 if(!target)throw new Error('Unknown game-mode hazard '+mode.obstacleReplacement);
 const bottom=hazard.y;
 const center=bottom-hazard.h/2;
 const replacementY=explicitY||hazard.air?center+target.h/2:bottom;
 // Preserve all spawn scheduling and movement fields. Use the actual mine
 // stats (including its explosive destruction group), never a box in disguise.
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
