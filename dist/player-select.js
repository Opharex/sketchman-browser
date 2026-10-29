// TILayer_PlayerSelect: source carousel order, stat marks, poses and coordinates.
export const SELECTION_ORDER=[0,5,2,1,4,7,3,6,8,9];
export const SELECTION_STATS=[[1,1],[2,2],[4,1],[1,4],[2,3],[2,1],[2,4],[3,3],[2,3],[4,3]];
const poses=['CHR_RunNGun_','CHR_RunNShotgun_','CHR_RunNUzzi_','CHR_RunNRPG_','CHR_RunNBow_','CHR_RunNGun_','CHR_RunNRPG_','CHR_RunNShotgun_','CHR_SuperSketchman_','CHR_Run_'];
export const SELECTION_DESCRIPTIONS=[['A standard 9mm','Can take out weaker foes'],['Take out more than','one enemy at a time!'],['Be unstoppable','with super fast fire rate!'],["Blast’em away",'with power!'],['Explosive power','Robin Hood style!'],['Improve your chances','with superior fire rate!'],['Power and precision','What more can you ask for?'],['Short range Sonic Wave that','blasts multiple foes at once!'],['Why run when you can fly?','Go Super Sketchman!'],['Deadly Shadow Clones','that rip through your enemies!']];
export function selectionPose(id,t){return poses[id]+String(Math.floor(Math.max(0,t)*1000/(id===8?64:29))%(id===8?2:17)+1).padStart(2,'0');}
export function drawPlayerSelection({index,position=index,weapons,save,t,draw,text,number=(value,x,y,w,h,size,color)=>text(value,x+w/2,y+h*.72,size,color,'center')}){
 draw('PLS_YouHave_01',480,45);number(Math.floor(save.coins).toLocaleString(),490,9,134,40,24,'#173f68');
 draw('PLS_DescriptionBase_01',480,614.4);
 for(let n=Math.max(0,Math.floor(position)-1);n<=Math.min(9,Math.ceil(position)+1);n++){
  const id=SELECTION_ORDER[n],w=weapons[id],scale=Math.max(.5,1-Math.abs(n-position)*.5),x=480+(n-position)*450,y=290,owned=save.unlocked.includes(id);
  const at=(name,dx,dy,s=1,alpha=1)=>draw(name,x+dx*scale,y+dy*scale,s*scale,false,alpha);
  at('PLS_WeaponBase_01',0,0);at(w.title,0,-160);
  at('SCN_Shadow_01',id===9?38:48,75);
  if(id===9)at(selectionPose(id,t-.1),85,20,1,.45);
  at(selectionPose(id,t),id===9?35:45,20);
  at(`PLS_WeaponStat0${SELECTION_STATS[id][0]}_01`,-122,-20);
  at(`PLS_WeaponStat0${SELECTION_STATS[id][1]}_01`,-122,70);
  if(!owned){at('PLS_Locked_01',135,-60);at('PLS_Coin_01',-175,147);number(Math.floor(w.cost).toLocaleString(),x-140*scale,y+130*scale,132*scale,35*scale,24*scale,'#fff');}
  at(owned?'PLS_PlayerSelection_Select_01':'PLS_PlayerSelection_Unlock_01',120,145);
 }
 const id=SELECTION_ORDER[Math.max(0,Math.min(9,Math.round(position)))];const lines=SELECTION_DESCRIPTIONS[id];text(lines[0],480,575,22,'#173f68','center');text(lines[1],480,604,22,'#173f68','center');
 draw('IMM_BackButton_01',68,585);draw('PLS_ShopOFF_01',835,585);
}
