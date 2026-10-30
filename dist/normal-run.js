// Normal-run pattern selection recovered from TWeaponDispenser.b(), not the tutorial.
export class NormalRunDirector {
  constructor(patterns, random=Math.random) {
    this.patterns=patterns; this.random=random; this.remaining=80; this.sinceCoins=0;
    this.coinInterval=4; this.accelerator=0; this.scale=1; this.history=[];
    this.activeTime=0;this.pauseRemaining=0;this.select();
  }
  pick(n){return Math.floor(this.random()*n);}
  select(){
    this.remaining=Math.max(0,this.remaining-1); this.sinceCoins++;
    if(this.sinceCoins>=this.coinInterval){
      this.sinceCoins=0; this.coinInterval++;
      this.id=this.pick(2) ? 91+this.pick(9) : 46+this.pick(7);
    }else if(this.remaining>70)this.id=53+this.pick(12);
    else if(this.remaining>60)this.id=35+this.pick(11);
    else if(this.remaining>50)this.id=65+this.pick(26);
    else this.id=this.pick(35);
    if(++this.accelerator>2){this.accelerator=0;this.scale=Math.min(4,this.scale+.075);}
    this.current=this.patterns[this.id];
    if(!this.current||this.current.duration<=0)throw new Error('Invalid APK pattern '+this.id);
    this.clock=0;this.cursor=0;this.history.push(this.id);
  }
  update(dt,onEvent,onBoundary=()=>null){
    let remaining=dt*1000;
    // APK patterns can begin with a 0 ms event. Emit those at the exact
    // pattern boundary, rather than delaying them until the next render tick.
    const emitDue=()=>{while(this.cursor<this.current.events.length&&this.current.events[this.cursor].at<=this.clock+1e-7)onEvent(this.current.events[this.cursor++],this.scale);};
    if(remaining>1e-8&&this.pauseRemaining<=0)emitDue();
    while(remaining>1e-8){
      if(this.pauseRemaining>0){const wait=Math.min(remaining,this.pauseRemaining);remaining-=wait;this.pauseRemaining-=wait;if(this.pauseRemaining<=1e-8){this.pauseRemaining=0;this.select();emitDue();}continue;}
      const step=Math.min(remaining,this.current.duration-this.clock);
      this.clock+=step;this.activeTime+=step/1000;remaining-=step;
      emitDue();
      if(this.clock>=this.current.duration-1e-7){
        const result=onBoundary(this.activeTime,this.scale);
        if(result?.pause)this.pauseRemaining=result.pause*1000;
        else if(result?.sequential){this.id=(this.id+1)%this.patterns.length;this.current=this.patterns[this.id];this.clock=0;this.cursor=0;this.history.push(this.id);emitDue();}
        else {this.select();emitDue();}
      }
    }
  }
}
export const SCENERY=[
 ['Hills','Desert'],['Desert','West'],['West','Field'],['Field','City'],['City','Sea'],
 ['Sea','Tropical'],['Tropical','Tropical'],['West','Wall'],['Wall','Canyon'],['Canyon','Ice'],['Ice','Hills']
];
export function sceneryTile(index){
 const i=((index%55)+55)%55,[place,next]=SCENERY[Math.floor(i/5)],slot=i%5;
 if(slot===4&&place!==next)return `SCN_${place}_${next}_01`;
 if(slot===2&&!['Sea','Canyon'].includes(place))return `SCN_${place}_Rare_01`;
 return `SCN_${place}_Tile_01`;
}
