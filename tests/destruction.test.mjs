import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {World} from '../dist/engine.js';
import {DESTRUCTION_GROUPS} from '../dist/destruction-data.js';
import {effectSound,destructionGroup,emitDestruction,advanceDestruction,EFFECT_TEXTURES} from '../dist/destruction.js';
test('APK destruction sound assignments use browser hazard identities, not raw source IDs',()=>{
 const expected=[19,23,21,23,22,23,21,26,21,21];
 for(let id=0;id<10;id++)assert.ok(effectSound('hazardDestroy',id).includes(`_${String(expected[id]).padStart(4,'0')}_`));
 assert.equal(effectSound('hazardCrash',1),'S_0024_ImpactBarrel.wav');
 assert.equal(effectSound('hazardHit',0),'S_0020_BulletWood.wav');
 assert.equal(effectSound('hazardHit',1),'S_0025_BarrelBulletHit.wav');
 assert.equal(effectSound('hazardHit',7),'S_0027_BulletOnRay.wav');
 assert.equal(effectSound('enemyDestroy',0),'S_0015_Explosion2.wav');
 for(let id=0;id<10;id++)for(const event of ['hazardDestroy','hazardCrash','hazardHit'])assert.ok(existsSync(new URL('../dist/assets/Sounds/Sfx/'+effectSound(event,id),import.meta.url)));
});
test('APK groups preserve wood/spike/metal mixtures and layered mine/ray effects',()=>{
 const textures=id=>[...new Set(DESTRUCTION_GROUPS[destructionGroup(id)].map(x=>x.texture))];
 assert.deepEqual(textures(0),['ParWood_01']);
 assert.deepEqual(textures(6),['ParWood_01','ParMetalShard_01']);
 assert.deepEqual(textures(2),['ParSpike_01','ParWood_01']);
 assert.deepEqual(textures(4),['ParMetalShard_01','ParSpike_01']);
 assert.deepEqual(textures(3),['ParSmokeParticule','ParStatsFireWorksParticleTile']);
 assert.deepEqual(textures(7),['ParSmokeParticule','ParStatsFireWorksParticleTile','ParSmallSquare']);
 for(const n of EFFECT_TEXTURES)assert.ok(existsSync(new URL('../dist/assets/Graphics/Particles/'+n+'.png',import.meta.url)));
});
test('shooting and smashing a barrel select distinct effects, without duplicate explosion feedback',()=>{
 for(const shot of [true,false]){
  const events=[],w=new World({seed:7,onEvent:(...e)=>events.push(e)});w.spawn('hazard',1,700);const e=w.entities[0];w.destroy(e,shot);w.destroy(e,shot);
  assert.ok(w.particles.length>0);assert.ok(w.particles.every(p=>p.group===(shot?'G_BarrelExplodeDest':'G_BarrelCrashDest')));
  assert.equal(events.filter(e=>e[0]===(shot?'hazardDestroy':'hazardCrash')).length,1);
  assert.equal(events.filter(e=>e[0]==='explosion').length,0);
  assert.equal(w.entities.filter(e=>e.type==='coin').length,shot?3:0);
 }
});
test('player collision uses the obstacle-specific crash path and mission event',()=>{
 const events=[],w=new World({seed:2,onEvent:(...e)=>events.push(e)});w.spawnTimer=w.coinTimer=100;w.spawn('hazard',1,150);w.update(1/60);
 assert.ok(events.some(e=>e[0]==='SmashIntoStaticHazard'));
 assert.ok(events.some(e=>e[0]==='hazardCrash'&&e[2]===1));
 assert.ok(w.particles.some(p=>p.group==='G_BarrelCrashDest'));
 assert.ok(!events.some(e=>e[0]==='hazardDestroy'));
});
test('nonlethal bullet hits play material sounds; lethal hits only play destruction sound',()=>{
 for(const hp of [200,20]){
  const events=[],w=new World({seed:2,onEvent:(...e)=>events.push(e)});w.spawnTimer=w.coinTimer=100;w.spawn('hazard',0,300);const e=w.entities[0];e.hp=hp;
  w.bullets.push({id:0,x:300,y:e.y-50,vx:0,vy:0,life:1,damage:40,hit:new Set()});w.update(1/60);
  assert.equal(events.some(e=>e[0]==='hazardHit'),hp===200);
  assert.equal(events.some(e=>e[0]==='hazardDestroy'),hp===20);
 }
});
test('source particles preserve delays, rectangular wood proportions, source lifetime and refresh-rate consistency',()=>{
 const run=fps=>{const p=[];emitDestruction(p,'G_BoxDest',400,300,()=>.5);for(let i=0;i<fps/2;i++)for(const a of p)advanceDestruction(a,1/fps);return p;};
 const base=run(60);assert.equal(base.length,16);assert.deepEqual(base[0].def.frame,[16,32]);assert.equal(base[0].max,.7);
 for(const fps of [30,120]){const other=run(fps);for(let i=0;i<base.length;i++)for(const k of ['x','y','scale','angle','life'])assert.ok(Math.abs(base[i][k]-other[i][k])<1e-8);}
 const p=[];emitDestruction(p,'G_RayDest',0,0,()=>.5);assert.ok(p.some(a=>a.age<0));
});
test('enemy death no longer plays crate destruction or emits obstacle debris',()=>{
 const events=[],w=new World({onEvent:(...e)=>events.push(e),effects:{blood:true}});w.spawn('enemy',0,500);w.destroy(w.entities[0]);
 assert.ok(events.some(e=>e[0]==='enemyDestroy'));assert.ok(!events.some(e=>e[0]==='hazardDestroy'));
 assert.ok(w.particles.some(p=>p.group==='G_EnBlood'));assert.ok(w.particles.every(p=>p.group.startsWith('G_En')));
});
