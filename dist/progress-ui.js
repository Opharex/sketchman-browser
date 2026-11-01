import {CLASSIC_MODE,getGameMode} from './game-modes.js?v=bomb-boss-bounty-01';
// Read-only presentation helpers: do not change save records or mission rewards.
export function scoreboardForMode(save,modeId=CLASSIC_MODE){
 const mode=getGameMode(modeId);
 const board=mode.id===CLASSIC_MODE?{best:save.best,scores:save.scores}:save.modeRecords?.[mode.id];
 return {mode,best:Math.max(0,Number(board?.best)||0),scores:Array.isArray(board?.scores)?board.scores:[]};
}
export function missionDisplayRows(missions,save){
 return (Array.isArray(save.missionIndex)?save.missionIndex:[])
  .map(id=>missions[id]).filter(Boolean).map(m=>{
   const completed=Array.isArray(save.completed)&&save.completed.includes(m.id);
   const target=Math.max(1,Number(m.target)||1);
   const progress=completed?target:Math.max(0,Math.min(target,Number(save.missionProgress?.[m.id])||0));
   return {id:m.id,group:m.group,text:m.text,target,progress,completed,
    cumulative:!!m.cumulative,reward:m.reward};
  });
}
