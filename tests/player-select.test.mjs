import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SELECTION_ORDER,SELECTION_STATS,selectionPose,drawPlayerSelection} from '../dist/player-select.js';import {freshSave,WEAPONS} from '../dist/engine.js';
const sprites=JSON.parse(readFileSync(new URL('../dist/assets/sprites.json',import.meta.url)));
test('all ten selection cards resolve original panels, titles, lock art and animated frames',()=>{
 assert.deepEqual(SELECTION_ORDER,[0,5,2,1,4,7,3,6,8,9]);assert.equal(new Set(SELECTION_ORDER).size,10);
 for(let i=0;i<10;i++){const names=[];drawPlayerSelection({index:i,weapons:WEAPONS,save:freshSave(),t:.2,draw:n=>names.push(n),text:()=>{}});for(const n of names)assert.ok(sprites[n],n);for(let frame=0;frame<17;frame++)assert.ok(sprites[selectionPose(i,frame*.029)],i+' preview '+frame);assert.ok(SELECTION_STATS[i].every(n=>n>=1&&n<=4));}
});
test('owned selector uses Select and locked cards show Unlock, price and padlock',()=>{
 const save=freshSave(),render=index=>{const calls=[];drawPlayerSelection({index,weapons:WEAPONS,save,t:.1,draw:(...a)=>calls.push(a),text:()=>{}});return calls;};
 let calls=render(0);assert.ok(calls.some(c=>c[0]==='PLS_PlayerSelection_Select_01'&&c[1]===600));
 calls=render(1);assert.ok(calls.some(c=>c[0]==='PLS_Locked_01'&&c[1]===615));assert.ok(calls.some(c=>c[0]==='PLS_PlayerSelection_Unlock_01'&&c[1]===600));
 save.unlocked.push(5);calls=render(1);assert.ok(!calls.some(c=>c[0]==='PLS_Locked_01'&&c[1]===615));assert.ok(calls.some(c=>c[0]==='PLS_PlayerSelection_Select_01'&&c[1]===600));
});
