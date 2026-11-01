// Read-only view of the power-ups spent at the start of a run.
// Entries are captured after stock is decremented by startRun().
const PERMANENT=['longShield','fullHealth'];
export function runPowerupBadges(consumedIds,items,stock,permanent={}){
 const byId=new Map(items.map(item=>[item.id,item]));
 const unique=[...new Set(consumedIds)];
 for(const id of PERMANENT)if(permanent?.[id]&&!unique.includes(id))unique.push(id);
 return unique.map(id=>{
  const item=byId.get(id);
  if(!item)return null;
  const isPermanent=PERMANENT.includes(id);
  return {id,name:item.name,icon:item.icon,permanent:isPermanent,
   remaining:isPermanent?null:Math.max(0,Math.floor(Number(stock?.[id])||0))};
 }).filter(Boolean);
}
export function runPowerupStockLabel(entry){
 return entry.permanent?'∞':entry.remaining+' left';
}
