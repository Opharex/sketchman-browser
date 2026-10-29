// Recovered from dragon.and / and$re and TWeaponDispenser (Sketchman 1.0.5).
export function createBoss(index=0){const hp=800+index*300,interval=Math.max(.25,1.75-index*.25);return {x:-200,y:382,hp,maxHp:hp,t:0,phase:'pass',vulnerable:false,remainder:0,interval,shoot:0,flash:0,healthShown:false,fightTime:0,pressure:0};}
export function bossVolley(b,playerY){
 const slopes=playerY<202?[-.4,-.3,-.2]:playerY>358?[.4,.3,.2]:[-.15,0,.15];
 return slopes.map((vy,i)=>({x:b.x-160,y:b.y-100,vx:-2000*(i===1?.4:.35),vy:2000*vy*(i===1?.4:.35),life:4,w:32,h:32,damage:5,sprite:'BUL_HeliBullet_01',source:'boss'}));
}
export function advanceBoss(b,dt,playerY,fire){
 b.t+=dt;b.flash=Math.max(0,b.flash-dt);b.remainder+=dt;
 while(b.remainder>=1/60-1e-9){b.remainder-=1/60;
  if(b.phase!=='fight'){
   const tx=b.phase==='pass'?1200:720,ty=b.phase==='pass'?382:412;
   // S = 20 / 10000; e(ms) clamps each axis to 10px per update.
   const clamp=n=>Math.max(-10,Math.min(10,n));
   b.x+=clamp((tx-b.x)*.002*(1000/60));b.y+=clamp((ty-b.y)*.002*(1000/60));
   if(Math.abs(b.x-tx)<=1&&Math.abs(b.y-ty)<=1){b.x=tx;b.y=ty;if(b.phase==='pass')b.phase='catch';else{b.phase='fight';b.vulnerable=true;}}
  }else{
   b.fightTime+=1/60;b.shoot-=1/60;
   // Keep the recovered per-encounter volley interval stable throughout the fight.
   // The previous extra 90-second acceleration was not supported by APK findings.
   if(b.shoot<=1e-9){fire(bossVolley(b,playerY));b.shoot=b.interval;}
  }
 }
}
export function bossTarget(b){return {x:b.x-100,y:b.y-100,w:70,h:141};}
export function enemyBulletRotation(b){return Math.atan2(b.vy,b.vx);}
export function healthBar(e){if(e.dead||e.dying||!e.healthShown||e.hp<=0)return null;return {x:e.x,y:e.y-e.h-18,fraction:Math.max(0,Math.min(1,e.hp/e.maxHp))};}
