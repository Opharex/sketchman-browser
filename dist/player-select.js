// TILayer_PlayerSelect: source carousel order, stat marks, poses and coordinates.
export const SELECTION_ORDER=[0,5,2,1,4,7,3,6,8,9];
export const SELECTION_STATS=[[1,1],[2,2],[4,1],[1,4],[2,3],[2,1],[2,4],[3,3],[2,3],[4,3]];
const poses=['CHR_RunNGun_','CHR_RunNShotgun_','CHR_RunNUzzi_','CHR_RunNRPG_','CHR_RunNBow_','CHR_RunNGun_','CHR_RunNRPG_','CHR_RunNShotgun_','CHR_SuperSketchman_','CHR_Run_'];
export const SELECTION_DESCRIPTIONS=[['A standard 9mm','Can take out weaker foes'],['Take out more than','one enemy at a time!'],['Be unstoppable','with super fast fire rate!'],["Blast’em away",'with power!'],['Explosive power','Robin Hood style!'],['Improve your chances','with superior fire rate!'],['Power and precision','What more can you ask for?'],['Short range Sonic Wave that','blasts multiple foes at once!'],['Why run when you can fly?','Go Super Sketchman!'],['Deadly Shadow Clones','that rip through your enemies!']];
export function selectionPose(id,t){return poses[id]+String(Math.floor(Math.max(0,t)*1000/(id===8?64:29))%(id===8?2:17)+1).padStart(2,'0');}
export function drawPlayerSelection({index,weapons,save,t,draw,text}){
 draw('PLS_YouHave_01',480,45);text(Math.floor(save.coins).toLocaleString(),493,43,24,'#173f68','left');
 draw('PLS_DescriptionBase_01',480,614.4);
 for(let n=Math.max(0,index-1);n<=Math.min(9,index+1);n++){
  const id=SELECTION_ORDER[n],w=weapons[id],scale=n===index?1:.55,x=480+(n-index)*450,y=290,owned=save.unlocked.includes(id);
  const at=(name,dx,dy,s=1,alpha=1)=>draw(name,x+dx*scale,y+dy*scale,s*scale,false,alpha);
  at('PLS_WeaponBase_01',0,0);at(w.title,0,-160);
  at('SCN_Shadow_01',id===9?38:48,75);
  if(id===9)at(selectionPose(id,t-.1),85,20,1,.45);
  at(selectionPose(id,t),id===9?35:45,20);
  at(`PLS_WeaponStat0${SELECTION_STATS[id][0]}_01`,-122,-20);
  at(`PLS_WeaponStat0${SELECTION_STATS[id][1]}_01`,-122,70);
  if(!owned){at('PLS_Locked_01',135,-60);at('PLS_Coin_01',-175,147);text(Math.floor(w.cost).toLocaleString(),x-130*scale,y+154*scale,24*scale,'#fff','left');}
  at(owned?'PLS_PlayerSelection_Select_01':'PLS_PlayerSelection_Unlock_01',120,145);
 }
 const id=SELECTION_ORDER[index];const lines=SELECTION_DESCRIPTIONS[id];text(lines[0],480,575,22,'#173f68','center');text(lines[1],480,604,22,'#173f68','center');
 draw('IMM_BackButton_01',68,585);draw('PLS_ShopOFF_01',835,585);
}
