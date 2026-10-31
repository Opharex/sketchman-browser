import test from 'node:test';
import assert from 'node:assert/strict';
import {EmberTrail,MAX_EMBER_PARTICLES,drawEmberPreview} from '../dist/ember-trail.js';

function mockContext(){
 const calls={draw:0};
 const ctx={
  calls,save(){},restore(){},translate(){},scale(){},beginPath(){},
  moveTo(){},quadraticCurveTo(){},lineTo(){},closePath(){},
  ellipse(){calls.draw++},arc(){calls.draw++},fill(){calls.draw++},
  stroke(){calls.draw++},
  set globalCompositeOperation(x){this.composite=x},
  get globalCompositeOperation(){return this.composite},
  set globalAlpha(x){this.alpha=x},
  set fillStyle(x){this.color=x}
 };
 return ctx;
}
test('Fire-trail pool is bounded and visually follows world-scrolling movement',()=>{
 const t=new EmberTrail();
 assert.equal(t.pool.length,MAX_EMBER_PARTICLES);
 const w={scroll:0,y:430,dead:false};
 t.reset(w);
 for(let i=0;i<80;i++){
  w.scroll+=6;
  w.y=430-40*Math.sin(i/80*Math.PI);
  t.step(w,true,1/60,270);
 }
 assert.ok(t.count()>0,'Movement must create visible fire and sparks');
 assert.ok(t.count()<=MAX_EMBER_PARTICLES,'Particle count must be capped');
 assert.ok(t.pool.some(p=>p.alive&&p.worldX-w.scroll<270-33),
  'World-anchored flames must trail behind the player');
 const first=t.pool.find(p=>p.alive);
 const anchor=first.worldX;
 const oldScreenX=anchor-w.scroll;
 w.scroll+=25;
 assert.equal(first.worldX,anchor,'Flame must not chase moving screen-locked player');
 assert.equal(first.worldX-w.scroll,oldScreenX-25,'Camera movement must leave fire behind');
 const ctx=mockContext();
 t.draw(ctx,w);
 assert.ok(ctx.calls.draw>0,'The visual effect must actually render');
});
test('Fire trail stops when stationary, dead or another skin is equipped',()=>{
 const t=new EmberTrail();
 const w={scroll:0,y:430,dead:false};
 t.reset(w);
 for(let i=0;i<45;i++){w.scroll+=9;t.step(w,true,1/60,270);}
 assert.ok(t.count()>0);
 const count=t.counter;
 for(let i=0;i<80;i++)t.step(w,true,1/60,270);
 assert.equal(t.counter,count,'No new flames can appear when scroll is stationary');
 assert.equal(t.count(),0,'Stationary fire must expire');
 w.scroll+=16;w.dead=true;t.step(w,true,1/60,270);
 assert.equal(t.counter,count,'Death must stop flame emission');
 w.dead=false;w.scroll+=20;t.step(w,true,1/60,270);
 assert.ok(t.count()>0);
 t.step(w,false,1/60,270);
 assert.equal(t.count(),0,'Other skins must not inherit the fire trail');
});
test('Menu preview renders only lightweight cosmetic flames',()=>{
 const c=mockContext();drawEmberPreview(c,66,71,2.5);
 assert.ok(c.calls.draw>=5);
});
