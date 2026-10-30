import test from 'node:test';import assert from 'node:assert/strict';
import {createBoss,advanceBoss,bossVolley} from '../dist/boss.js';
import {bossShotPose,bossShotTiming,bossRigMuzzle} from '../dist/boss-shot-animation.js';
import {poseRig,PRESETS} from '../dist/boss-rig.js';
import {World} from '../dist/engine.js';
import {createSoundPlayer} from '../dist/sound-player.js';
test('every volley starts the rig at the muzzle with one pump cue before the next volley',()=>{
 for(const index of [0,1,3,6,20])for(const fps of [20,30,60,120]){
  const b={...createBoss(index),x:720,y:412,phase:'fight',vulnerable:true};let shots=0,cocks=0;
  const timing=bossShotTiming(b.interval);
  for(let frame=0;frame<fps*7;frame++)advanceBoss(b,1/fps,280,bullets=>{
   assert.equal(b.shotAge,0);assert.equal(cocks,shots);shots++;
   assert.deepEqual(bossShotPose(b),PRESETS.ready);const m=bossRigMuzzle(b);
   for(const bullet of bullets){assert.equal(bullet.x,m.x);assert.equal(bullet.y,m.y);}
  },(cue,rate)=>{assert.equal(cue,'bossCock');cocks++;assert.equal(cocks,shots);assert.equal(rate,timing.soundRate);assert.ok(b.shotAge>=timing.pumpAt-1e-8&&b.shotAge<timing.pumpAt+1/60+1e-8);});
  assert.ok(cocks===shots||cocks===shots-1);
  for(let age=0;age<b.interval;age+=1/120){b.shotAge=age;const p=bossShotPose(b),r=poseRig(p);assert.ok(r.front.error<1e-6);assert.ok(r.rear.error<1e-6);}
  b.shotAge=b.interval-1/120;assert.deepEqual(bossShotPose(b),PRESETS.ready);
 }
});
test('world delivers shoot/cock cues on simulation events and stops them after death',()=>{
 const cues=[];const w=new World({onEvent:(name)=>{if(name.startsWith('boss'))cues.push(name);}});w.invincible=1e6;w.boss={...createBoss(),x:720,y:412,phase:'fight',vulnerable:true};
 for(let i=0;i<70;i++)w.update(1/60);assert.deepEqual(cues,['bossShoot','bossCock']);
 w.damageBoss(1e9);const count=cues.length;for(let i=0;i<180;i++)w.update(1/60);assert.equal(cues.length,count);
});
test('decoded boss audio starts synchronously from its event without a new fetch',async()=>{
 let fetches=0,starts=0,decodes=0,rate=0;const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 class Context{state='running';destination={};async decodeAudioData(){decodes++;return {};}createBufferSource(){const playbackRate={value:1};return {playbackRate,connect(){},disconnect(){},start(){starts++;rate=playbackRate.value;}};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}}
 try{const p=createSoundPlayer({AudioContext:Context});await p.preload(['fire','pump']);assert.equal(decodes,2);p.play('fire',.5);assert.equal(starts,1);p.play('pump',.5,{rate:2});assert.equal(starts,2);assert.equal(rate,2);assert.equal(fetches,2);}finally{globalThis.fetch=oldFetch;}
});
