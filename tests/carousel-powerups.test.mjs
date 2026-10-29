import test from 'node:test';import assert from 'node:assert/strict';
import {CarouselMotion} from '../dist/carousel-motion.js';import {PowerupDirector} from '../dist/powerups.js';import {NormalRunDirector} from '../dist/normal-run.js';import {World} from '../dist/engine.js';
test('carousel advances through intermediate positions and snaps consistently across refresh rates',()=>{
 const run=fps=>{const c=new CarouselMotion();c.go(1);c.advance(.05);assert.ok(c.position>0&&c.position<1);for(let i=0;i<fps;i++)c.advance(1/fps);assert.equal(c.position,1);return c;};for(const fps of [30,60,120])assert.ok(run(fps).settled);
});
test('drag follows the pointer immediately, release carries momentum and bounds both ends',()=>{
 const c=new CarouselMotion(2);c.drag(2.4);c.advance(.1);assert.equal(c.position,2.4);assert.equal(c.release(80),4);c.advance(2);assert.equal(c.position,4);c.go(30);c.advance(2);assert.equal(c.position,9);c.drag(-.3);assert.equal(c.release(-300),0);c.advance(2);assert.equal(c.position,0);
});
test('powerup attempts begin at 32 active seconds, intervals grow 3sec, source roll selects none/HP/invincibility',()=>{
 for(let roll=0;roll<5;roll++){
  const p=new PowerupDirector();assert.equal(p.boundary(31.99,()=>0),null);let n=0;const result=p.boundary(32,()=>n++===0?(roll+.1)/5:.5);assert.equal(p.interval,15);assert.equal(p.deadline,47);assert.equal(p.attempts,1);
  if(roll<2){assert.deepEqual(result,{sequential:true});assert.equal(n,1);}else{assert.equal(result.kind,roll===2?'shield':'health');assert.equal(result.cy,295);assert.equal(result.x,1160);assert.equal(result.pause,1.5);}
  assert.equal(p.boundary(46.9,()=>0),null);p.boundary(47,()=>0);assert.equal(p.deadline,65);
 }
});
test('boundary spawn creates a 1.5 second gap before next pattern and pauses active powerup clock',()=>{
 const patterns=Array.from({length:100},()=>({duration:1000,events:[{at:0,type:13,args:[]}]}));const d=new NormalRunDirector(patterns,()=>.5);let fired=0,bounds=0;
 d.update(1,()=>fired++,()=>{bounds++;return {pause:1.5};});assert.equal(fired,1);assert.equal(bounds,1);assert.equal(d.pauseRemaining,1500);d.update(1,()=>fired++);assert.equal(d.activeTime,1);assert.equal(fired,1);d.update(.6,()=>fired++);assert.ok(Math.abs(d.activeTime-1.1)<1e-8);assert.equal(fired,2);
});
test('no-item roll continues adjacent timeline pattern without changing difficulty/selection counters',()=>{
 const patterns=Array.from({length:100},()=>({duration:1000,events:[]}));const d=new NormalRunDirector(patterns,()=>.5),id=d.id,remaining=d.remaining,scale=d.scale;d.update(1,()=>{},()=>({sequential:true}));assert.equal(d.id,id+1);assert.equal(d.remaining,remaining);assert.equal(d.scale,scale);
});
test('World emits source-sized pickups only at a boundary and keeps original speed/height',()=>{
 const patterns=Array.from({length:100},()=>({duration:1000,events:[]}));const w=new World({patterns});w.invincible=100;w.rand=()=>.7;for(let i=0;i<32*120;i++)w.update(1/120);const item=w.entities.find(e=>e.sourcePowerup);assert.ok(item);assert.equal(item.type,'health');assert.equal(item.w,96);assert.equal(item.h,96);assert.equal(item.y,140+Math.floor(.7*310)+48);assert.ok(item.moveSpeed>=430);assert.ok(w.director.pauseRemaining>0);const time=w.director.activeTime;for(let i=0;i<120;i++)w.update(1/120);assert.equal(w.director.activeTime,time);
});
