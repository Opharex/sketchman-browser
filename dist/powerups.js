// TWeaponDispenser marker 5555 gate: c=-20000ms, d=12000ms, +3000ms per attempt.
export class PowerupDirector{
 constructor(){this.deadline=32;this.interval=12;this.attempts=0;}
 boundary(activeTime,random){
  if(activeTime+1e-8<this.deadline)return null;
  this.interval+=3;this.deadline=activeTime+this.interval;this.attempts++;
  const roll=Math.floor(random()*5);
  // 0/1: no item, timeline continues to adjacent pattern instead of selecting one.
  if(roll<2)return {sequential:true};
  return {kind:roll===2?'shield':'health',sourceType:roll===2?6:4,x:1160,cy:140+Math.floor(random()*310),pause:1.5};
 }
}
