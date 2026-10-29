import test from 'node:test';
import assert from 'node:assert/strict';
import {World,WEAPONS,FLOOR} from '../dist/engine.js';
import {createBoss} from '../dist/boss.js';
import {bindTouchControls,fitViewport} from '../dist/mobile.js';
import {drawParticle} from '../dist/particle-renderer.js';

function combat(weapon=0){const w=new World({weapon});w.spawnTimer=w.coinTimer=w.nextBoss=1e9;w.invincible=1e9;w.boss={...createBoss(),phase:'fight',vulnerable:true,shoot:1e9,x:720,y:412,hp:1e6,maxHp:1e6};return w;}
test('all ten weapons can damage the boss while standing on the floor',()=>{
 for(const weapon of WEAPONS){const w=combat(weapon.id);w.shoot();for(let i=0;i<120;i++)w.update(1/60);assert.ok(w.boss.hp<1e6,weapon.name);}
});
test('boss keeps taking grounded damage after jumping, landing and a prolonged fight',()=>{
 for(const fps of [20,30,60,120]){
  const w=combat();w.fireHeld=true;w.jump();
  for(let i=0;i<fps*10;i++)w.update(1/fps);
  assert.equal(w.y,FLOOR);let previous=w.boss.hp;
  for(let minute=0;minute<3;minute++){for(let i=0;i<fps*60;i++)w.update(1/fps);assert.ok(w.boss.hp<previous-2000,`continued hits at ${fps} FPS`);previous=w.boss.hp;}
 }
});
test('a fast player projectile cannot skip the boss between frames',()=>{
 const w=combat();w.bullets.push({id:0,x:500,y:400,vx:4000,vy:0,life:1,damage:40,hit:new Set()});w.update(.05);assert.equal(w.boss.hp,1e6-40);
});
test('multi-touch releases only the finger that ended or was cancelled',()=>{
 const surface=new EventTarget(),view=new EventTarget(),held=new Map();surface.getBoundingClientRect=()=>({left:0,width:800});
 const dispose=bindTouchControls(surface,{active:()=>true,press:(id,left)=>held.set(id,left?'jump':'fire'),release:id=>held.delete(id)},view);
 const touch=(target,type,touches)=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'changedTouches',{value:touches});target.dispatchEvent(e);return e;};
 assert.ok(touch(surface,'touchstart',[{identifier:1,clientX:700},{identifier:2,clientX:100}]).defaultPrevented);
 touch(view,'touchend',[{identifier:2}]);assert.deepEqual([...held.values()],['fire']);
 touch(surface,'touchstart',[{identifier:3,clientX:100}]);touch(view,'touchcancel',[{identifier:3}]);assert.deepEqual([...held.values()],['fire']);
 touch(view,'touchend',[{identifier:1}]);assert.equal(held.size,0);dispose();
 touch(surface,'touchstart',[{identifier:4,clientX:100}]);assert.equal(held.size,0);
});
test('viewport fitting uses Safari visible area and falls back without VisualViewport',()=>{
 const values={};const root={style:{setProperty:(k,v)=>values[k]=v}};
 fitViewport(root,{innerWidth:844,innerHeight:390,visualViewport:{width:800,height:340}});assert.equal(values['--viewport-height'],'340px');assert.equal(values['--viewport-width'],'800px');
 fitViewport(root,{innerWidth:390,innerHeight:700});assert.equal(values['--viewport-height'],'700px');
});
test('long particle playback releases old tint canvases instead of retaining every color',()=>{
 const canvases=[],old=globalThis.document;const context={save(){},restore(){},translate(){},rotate(){},drawImage(){},fillRect(){}};
 globalThis.document={createElement(){const c={width:0,height:0,getContext:()=>context};canvases.push(c);return c;}};
 try{for(let i=0;i<1000;i++)drawParticle(context,{x:0,y:0,angle:0,sourceEffect:true,age:1,color:[(i%16)/15,(Math.floor(i/16)%16)/15,(Math.floor(i/256)%16)/15,1],def:{frame:[32,32]},scale:1,frame:0,texture:'test'}, {test:{src:'memory-test',width:32,height:32}});
  assert.ok(canvases.length>100);assert.ok(canvases.filter(c=>c.width>0&&c.height>0).length<=48);
 }finally{globalThis.document=old;}
});
