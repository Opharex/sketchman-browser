import test from 'node:test';
import assert from 'node:assert/strict';
import {setMenuFont,menuLettering} from '../dist/menu-lettering.js';

test('menu labels are immediately drawable canvases and repeated labels reuse ready artwork',()=>{
 const previous=globalThis.document;let created=0;
 const context={drawImage(){},fillRect(){}};
 globalThis.document={createElement(type){assert.equal(type,'canvas');created++;return {width:0,height:0,getContext:()=>context,toDataURL(){throw new Error('Labels must not require image decoding');}};}};
 try{
  setMenuFont({width:1024,height:128});const first=menuLettering('Controls');
  assert.equal(typeof first,'object');assert.ok(first.width>0&&first.height>0);
  const count=created;assert.equal(menuLettering('CONTROLS'),first);assert.equal(created,count);
  const another=menuLettering('About');assert.notEqual(another,first);assert.ok(another.width>0);
 }finally{globalThis.document=previous;}
});
