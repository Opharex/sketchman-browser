import test from 'node:test';import assert from 'node:assert/strict';
import {World,WEAPONS} from '../dist/engine.js';
import {createBoss,advanceBoss,bossVolley,bossTarget,enemyBulletRotation,healthBar} from '../dist/boss.js';
const tick=(w,s)=>{for(let i=0;i<Math.ceil(s*120);i++)w.update(1/120);};
function fight(){const b=createBoss();advanceBoss(b,15,428,()=>{});return b;}
test('boss passes from behind player to offscreen waypoint before catch-up and combat',()=>{
 const b=createBoss();let fires=0;assert.equal(b.x,-200);advanceBoss(b,1,428,()=>fires++);assert.equal(b.phase,'pass');assert.ok(b.x>150&&b.x<1200);assert.equal(b.y,382);assert.equal(b.vulnerable,false);
 let reachedPass=false;for(let i=0;i<1800&&!b.vulnerable;i++){advanceBoss(b,1/120,428,()=>fires++);if(b.phase==='catch'){reachedPass=true;assert.ok(b.x<=1200&&b.x>=720);}}
 assert.ok(reachedPass);assert.equal(b.x,720);assert.equal(b.y,412);assert.equal(b.phase,'fight');assert.equal(fires,0);
 assert.deepEqual(bossTarget(b),{x:620,y:312,w:70,h:141});
});
test('first boss uses 1.75sec volleys and original projectile speeds, muzzle and height bands',()=>{
 const b=createBoss();b.phase='fight';b.vulnerable=true;b.x=720;b.y=412;const events=[];for(let i=0;i<420;i++)advanceBoss(b,1/60,428,shots=>events.push({time:b.t,shots}));
 assert.equal(events.length,4);for(let i=1;i<events.length;i++)assert.ok(Math.abs(events[i].time-events[i-1].time-1.75)<1e-8);
 assert.deepEqual(events[0].shots.map(p=>[p.x,p.y,p.vx,p.vy]),[[560,312,-700,280],[560,312,-800,240],[560,312,-700,140]]);
 assert.deepEqual(bossVolley(b,280).map(p=>p.vy),[-105,0,105]);assert.deepEqual(bossVolley(b,150).map(p=>p.vy),[-280,-240,-140]);
 assert.equal(createBoss(1).interval,1.5);assert.equal(createBoss(20).interval,.25);
});
test('boss movement and volleys match at 30,60,120 FPS',()=>{
 const run=fps=>{const b=createBoss();let n=0;for(let i=0;i<fps*12;i++)advanceBoss(b,1/fps,428,()=>n++);return [b.x,b.y,b.phase,n,b.shoot];};
 assert.deepEqual(run(30),run(60));assert.deepEqual(run(120),run(60));
});
test('boss entrance retains obstacles while stopping new obstacle spawns',()=>{
 const w=new World({seed:4,effects:{headstart:749.99}});w.spawn('hazard',0,1000);const old=w.entities[0];w.update(1/120);assert.ok(w.boss);assert.ok(w.entities.includes(old));const x=old.x;tick(w,.5);assert.ok(old.x<x);assert.equal(w.entities.filter(e=>e.type==='hazard').length,1);assert.equal(w.counts.DestroyedStaticHazard||0,0);
});
test('entrance cannot take hits; first hit in combat reveals following boss health bar',()=>{
 const w=new World();w.boss=createBoss();w.damageBoss(40);assert.equal(w.boss.hp,800);assert.equal(w.boss.healthShown,false);w.boss=fight();w.damageBoss(40);assert.equal(w.boss.hp,760);assert.equal(w.boss.healthShown,true);
});
test('every weapon kills a jet with one projectile hit',()=>{
 for(const weapon of WEAPONS){const w=new World({weapon:weapon.id});w.spawnTimer=w.coinTimer=100;w.spawn('enemy',1,700,200);const jet=w.entities[0];w.bullets.push({id:weapon.id,x:700,y:150,vx:0,vy:0,life:1,damage:weapon.damage,hit:new Set()});w.update(1/120);assert.equal(jet.dying,true,weapon.name);}
});
test('jet faces the player during firing, muzzle is on facing side, bullets rotate with velocity',()=>{
 for(const x of [90,700]){const w=new World();w.spawnTimer=w.coinTimer=100;w.spawn('enemy',1,x,200);const e=w.entities[0];e.moveSpeed=0;e.shoot=0;e.canShoot=true;w.invincible=10;tick(w,.21);const b=w.enemyBullets[0];assert.ok(b);assert.equal(e.facingRight,x<150);assert.equal(Math.sign(b.vx),x<150?1:-1);assert.ok((b.x-e.x)*(x<150?1:-1)>0);assert.equal(enemyBulletRotation(b),Math.atan2(b.vy,b.vx));}
});
test('bars start hidden and follow damaged obstacles and enemies without expiring',()=>{
 for(const kind of ['hazard','enemy']){const w=new World();w.spawnTimer=w.coinTimer=100;w.spawn(kind,0,700);const e=w.entities[0];assert.equal(healthBar(e),null);w.bullets.push({id:0,x:700,y:e.y-50,vx:0,vy:0,life:1,damage:20,hit:new Set()});w.update(1/120);assert.equal(e.healthShown,true);let bar=healthBar(e);assert.ok(bar);assert.equal(bar.x,e.x);assert.equal(bar.fraction,e.hp/e.maxHp);e.x-=50;e.y-=20;bar=healthBar(e);assert.equal(bar.x,e.x);assert.equal(bar.y,e.y-e.h-18);e.dying=true;assert.equal(healthBar(e),null);}
});
