import test from 'node:test';
import assert from 'node:assert/strict';
import {World,FLOOR,PLAYER_X,WEAPONS,normalizeSave,freshSave,buyWeapon} from '../dist/engine.js';
import {COIN_VALUES,COIN_BOOST_DURATION,coinTierFromRoll,coinPayout} from '../dist/coin-system.js';
function tick(w,seconds){for(let i=0;i<Math.ceil(seconds*120);i++)w.update(1/120);}
test('double jump and a held third press glide, then reset on landing',()=>{const w=new World({seed:1});w.spawnTimer=100;w.jump();assert.equal(w.jumps,1);tick(w,.2);w.jump();assert.equal(w.jumps,2);tick(w,.3);w.jump();w.jumpHeld=true;tick(w,.7);assert.equal(w.gliding,true);assert.ok(w.vy<180);w.releaseJump();tick(w,2);assert.equal(w.y,FLOOR);assert.equal(w.jumps,0);});
test('simultaneous jump and held fire produce airborne shots',()=>{const w=new World({seed:1});w.jump();w.fireHeld=true;tick(w,.7);assert.ok(w.shots>=2);assert.ok(w.bullets.length>0);assert.ok(w.y<FLOOR);});
test('pistol bullets destroy a crate and emit combat event',()=>{const events=[];const w=new World({seed:2,onEvent:(...e)=>events.push(e)});w.spawnTimer=100;w.coinTimer=100;w.spawn('hazard',0,700);w.fireHeld=true;tick(w,1);assert.ok(events.some(e=>e[0]==='DestroyedStaticHazard'));});
test('damage has an invulnerability window and death ends motion',()=>{const w=new World();w.hurt(30);w.hurt(30);assert.equal(w.hp,70);tick(w,1.3);w.hurt(100);assert.equal(w.dead,true);const d=w.distance;tick(w,1);assert.equal(w.distance,d);});
test('extra life revives only once',()=>{const w=new World({effects:{life:true}});w.hurt(200);assert.equal(w.dead,false);assert.equal(w.hp,100);assert.equal(w.reviveUsed,true);w.invincible=0;w.hurt(200);assert.equal(w.dead,true);});
test('coins collect once and double coins increases wallet',()=>{const w=new World({effects:{doubleCoins:true}});w.spawn('coin',0,PLAYER_X+2,FLOOR-35);w.update(1/120);assert.equal(w.coins,2);w.update(1/120);assert.equal(w.coins,2);});
test('boss spawns at 750m and death grants bonus',()=>{const w=new World({effects:{headstart:749.99}});w.update(1/120);assert.ok(w.boss);tick(w,12);w.damageBoss(10000);assert.equal(w.boss,null);assert.equal(w.coins,100);assert.equal(w.bossCount,1);});
test('all weapons have distinct projectiles or firing characteristics',()=>{for(const weapon of WEAPONS){const w=new World({weapon:weapon.id});w.shoot();assert.equal(w.bullets.length,weapon.pellets||1);assert.equal(w.bullets[0].damage,weapon.damage);assert.ok(w.bullets[0].vx>0);}});
test('weapon unlock is atomic, prevents overspending, persists selection',()=>{const s=freshSave();assert.equal(buyWeapon(s,2),false);assert.equal(s.coins,0);s.coins=10000;assert.equal(buyWeapon(s,2),true);assert.equal(s.coins,0);assert.ok(s.unlocked.includes(2));assert.equal(s.selected,2);assert.equal(buyWeapon(s,2),true);assert.equal(s.coins,0);});
test('malformed save falls back and invalid selections normalize',()=>{assert.equal(normalizeSave(null).coins,0);const s=normalizeSave({version:1,coins:-50,unlocked:[99,1,1],selected:9});assert.equal(s.coins,0);assert.deepEqual(s.unlocked,[0,1]);assert.equal(s.selected,0);});
test('same seed has reproducible obstacle sequences',()=>{const a=new World({seed:17}),b=new World({seed:17});for(const w of [a,b]){w.invincible=100;tick(w,20);}assert.deepEqual(a.entities,b.entities);assert.equal(a.distance,b.distance);});
test('simulation outcomes stay consistent at 30 and 120 FPS',()=>{const a=new World({seed:19}),b=new World({seed:19});a.spawnTimer=b.spawnTimer=100;a.coinTimer=b.coinTimer=100;for(let i=0;i<300;i++)a.update(1/30);for(let i=0;i<1200;i++)b.update(1/120);assert.ok(Math.abs(a.distance-b.distance)<.1);});

test('rarer green/red coin tiers are deterministic and preserve the original hazard RNG',()=>{
 assert.deepEqual(COIN_VALUES,[1,5,10]);
 assert.equal(coinTierFromRoll(0),2);assert.equal(coinTierFromRoll(.0199),2);
 assert.equal(coinTierFromRoll(.02),1);assert.equal(coinTierFromRoll(.0999),1);
 assert.equal(coinTierFromRoll(.1),0);assert.equal(coinTierFromRoll(.99),0);
 const a=new World({seed:1234}),b=new World({seed:1234});
 for(let i=0;i<120;i++)a.spawn('coin',0,900,300);
 assert.equal(a.seed,b.seed,'Special coins cannot shift original pattern/obstacle RNG');
 assert.deepEqual(a.entities.map(e=>e.id),(()=>{for(let i=0;i<120;i++)b.spawn('coin',0,900,300);return b.entities.map(e=>e.id);})());
 const tallies=a.entities.reduce((x,e)=>(x[e.id]++,x),[0,0,0]);
 assert.ok(tallies[0]>tallies[1]*3);assert.ok(tallies[1]>tallies[2]);
});
test('green and red coins pay 5/10 across shop-only, pickup-only and combined x4',()=>{
 for(const [shop,boost,mult] of [[false,false,1],[true,false,2],[false,true,2],[true,true,4]]){
  const w=new World({seed:13,effects:{doubleCoins:shop}});w.spawnTimer=w.coinTimer=1e9;
  if(boost)w.coinBoostTimer=COIN_BOOST_DURATION;
  for(const [tier,value] of [[1,5],[2,10]]){
   w.spawn('coin',tier,PLAYER_X+1,FLOOR-35);
   w.update(1/120);
   assert.equal(w.entities.find(e=>e.type==='coin'&&e.id===tier)?.value,value);
  }
  assert.equal(w.coins,15*mult);
  assert.equal(coinPayout(0,shop,boost),mult);
  assert.equal(coinPayout(1,shop,boost),5*mult);
  assert.equal(coinPayout(2,shop,boost),10*mult);
 }
});
test('coin boost applies for 15 active seconds, refreshes rather than stacking itself, and expires cleanly',()=>{
 const w=new World({seed:33,effects:{doubleCoins:true}});w.spawnTimer=w.coinTimer=1e9;
 w.spawn('coinBoost',0,PLAYER_X+1,FLOOR-35);w.update(1/120);
 assert.ok(w.coinBoostTimer>14.9);
 w.spawn('coin',2,PLAYER_X+1,FLOOR-35);w.update(1/120);
 assert.equal(w.coins,40);
 for(let i=0;i<6*120;i++)w.update(1/120);
 w.spawn('coinBoost',0,PLAYER_X+1,FLOOR-35);w.update(1/120);
 assert.ok(w.coinBoostTimer>14.9&&w.coinBoostTimer<=15);
 for(let i=0;i<16*120;i++)w.update(1/120);
 assert.equal(w.coinBoostTimer,0);
 w.spawn('coin',1,PLAYER_X+1,FLOOR-35);w.update(1/120);
 assert.equal(w.coins,50,'After expiry, the permanent shop x2 still works');
});
test('tutorial coin spawns always stay original, with no random rare coins',()=>{
 const w=new World({mode:'oops_all_bombs',tutorial:true,seed:44});
 for(let i=0;i<50;i++)w.spawn('coin',0,800,320);
 assert.ok(w.entities.every(e=>e.type==='coin'&&e.value===1&&e.id===0));
});
