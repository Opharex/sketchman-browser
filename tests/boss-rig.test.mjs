import test from 'node:test';
import assert from 'node:assert/strict';
import {poseRig,sampleRig,PRESETS,solveArm,rotate} from '../dist/boss-rig.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('rig demo keeps wrist targets reachable with constant bone lengths',()=>{
 for(let frame=0;frame<=720;frame++){
  const r=poseRig(sampleRig(frame/120));
  for(const [arm,upper,lower] of [[r.front,30,17],[r.rear,21,24]]){
   assert.ok(arm.error<.00001,`unreachable wrist at frame ${frame}`);
   assert.ok(Math.abs(distance(arm.shoulder,arm.elbow)-upper)<.00001);
   assert.ok(Math.abs(distance(arm.elbow,arm.wrist)-lower)<.00001);
  }
  assert.ok(distance(r.front.wrist,r.grip)<.00001);
  if(r.p.release===0)assert.ok(distance(r.rear.wrist,r.supportSocket)<.00001);
 }
});
test('pump hand follows the pump rail when gun is vertical',()=>{
 const a=poseRig(PRESETS.raised),b=poseRig(PRESETS.cocked);
 assert.ok(distance(a.front.wrist,b.front.wrist)<.00001);
 assert.ok(Math.abs(distance(a.rear.wrist,b.rear.wrist)-11)<.00001);
 assert.ok(Math.abs(a.rear.wrist.x-b.rear.wrist.x)<.00001);
});
test('support release detaches only the support hand',()=>{
 const a=poseRig({...PRESETS.ready,release:1});
 assert.ok(distance(a.rear.wrist,a.supportSocket)>10);
 assert.ok(distance(a.front.wrist,a.grip)<.00001);
});
test('out of reach and coincident targets are finite and reported',()=>{
 for(const target of [{x:0,y:0},{x:500,y:0}]){
  const a=solveArm({x:0,y:0},target,29,20);
  assert.ok(a.error>0);assert.ok(Number.isFinite(a.elbow.x));assert.ok(Number.isFinite(a.elbow.y));
 }
});
test('loop seam returns to the same combat pose',()=>{
 assert.deepEqual(sampleRig(0),sampleRig(6));
 const p=sampleRig(5.9999);for(const k of Object.keys(p))assert.ok(Math.abs(p[k]-PRESETS.ready[k])<1e-8);
});
