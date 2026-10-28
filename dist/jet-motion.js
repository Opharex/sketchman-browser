// Recovered from APK classes impossible (type 7) and vessels (type 10).
// World entity y is the actor's source centre + 64; it is not a velocity argument.
export function configureJet(e,type,args,scale,random=Math.random){
 const a=args;
 if(type===7){
  const right=a[2]>=0;
  e.x=right?-200:1160;e.y=(a[1]||100+random()*300)+64;
  e.jetMotion={kind:'fly',vx:a[2]/1000*scale,vy:a[3]/1000,sway:a[0],phase:a[6],turn:a[4]!==0?a[4]/10000:.02,remainder:0,right};
  e.moveSpeed=-a[2]*.05*scale;e.facingRight=right;
  e.canShoot=a[5]>=0;e.shoot=e.canShoot?1.5:Infinity;e.shotInterval=1.5;
 }else{
  const from={x:a[0],y:(a[1]||160+random()*256)+64};
  const to={x:a[2]||144+random()*720,y:(a[3]||160+random()*256)+64};
  const speed=350*scale;
  e.x=from.x;e.y=from.y;e.moveSpeed=0;e.facingRight=false;
  e.jetMotion={kind:'hover',from,to,phase:'enter',elapsed:0,duration:Math.hypot(to.x-from.x,to.y-from.y)/speed,hold:a[6]/1000,speed};
  e.canShoot=a[4]>=0;e.shotInterval=e.jetMotion.hold/2;e.shoot=e.shotInterval;
 }
}
export function advanceJet(e,dt){
 const m=e.jetMotion;
 if(m.kind==='fly'){
  m.remainder+=dt;
  // The source applies sway per game update. A fixed tick preserves that behavior
  // without making it depend on the browser's display refresh rate.
  while(m.remainder>=1/60-1e-10){
   m.remainder-=1/60;const ms=1000/60;m.phase+=m.turn*ms;
   if(m.turn>0&&m.phase>360)m.phase-=360;
   if(m.turn<=0&&m.phase<360)m.phase+=360;
   const step=.05*ms;
   e.x+=m.vx*step+m.sway*Math.cos(m.phase);
   e.y+=m.vy*Math.sin(m.phase)*step;
  }
  if(m.right?e.x>=1160:e.x<=-200)e.dead=true;
  return;
 }
 let remaining=dt;
 while(remaining>1e-10&&!e.dead){
  const duration=m.phase==='wait'?m.hold:m.duration;
  const step=Math.min(remaining,Math.max(0,duration-m.elapsed));
  m.elapsed+=step;remaining-=step;
  if(m.phase==='wait'){e.x=m.to.x;e.y=m.to.y;}
  else{
   const t=duration>0?Math.min(1,m.elapsed/duration):1;
   const start=m.phase==='enter'?m.from:m.to,end=m.phase==='enter'?m.to:m.from;
   e.x=start.x+(end.x-start.x)*t;e.y=start.y+(end.y-start.y)*t;
  }
  if(m.elapsed<duration-1e-10)break;
  m.elapsed=0;
  if(m.phase==='enter'){m.phase='wait';e.shoot=e.shotInterval;}
  else if(m.phase==='wait'){m.phase='exit';delete e.windup;}
  else{e.dead=true;break;}
 }
}
export function jetCanFire(e){return e.canShoot!==false&&(!e.jetMotion||e.jetMotion.kind==='fly'||e.jetMotion.phase==='wait');}
