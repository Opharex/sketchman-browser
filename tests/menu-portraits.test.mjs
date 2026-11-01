import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MENU_PORTRAIT_IDS,portraitUrl,choosePortrait,portraitPlacement,
 MENU_PORTRAIT_ERASE,eraseLegacyTitleFigure} from '../dist/menu-portraits.js';

test('nine actual supplied character portraits are valid nonempty WebP images',()=>{
 assert.equal(MENU_PORTRAIT_IDS.length,9);
 assert.equal(new Set(MENU_PORTRAIT_IDS).size,9);
 for(const id of MENU_PORTRAIT_IDS){
  const image=fs.readFileSync(new URL('../dist/'+portraitUrl(id),import.meta.url));
  assert.ok(image.length>1000,id+' image is not just a placeholder');
  assert.equal(image.toString('ascii',0,4),'RIFF',id+' must be WebP');
  assert.equal(image.toString('ascii',8,12),'WEBP',id+' must be WebP');
 }
});
test('the menu rotates through supplied portraits and prevents immediate repeats',()=>{
 const all=new Set();
 for(let i=0;i<MENU_PORTRAIT_IDS.length;i++)all.add(choosePortrait(null,()=>i/MENU_PORTRAIT_IDS.length));
 assert.deepEqual(all,new Set(MENU_PORTRAIT_IDS));
 for(const current of MENU_PORTRAIT_IDS)for(const roll of [0,.2,.5,.85,.999]){
  assert.notEqual(choosePortrait(current,()=>roll),current);
 }
 assert.equal(choosePortrait('only',()=>.5,['only']),'only');
 assert.equal(choosePortrait(null,()=>.5,[]),null);
});
test('portrait artwork is proportionally fitted into the existing menu figure area',()=>{
 const p=portraitPlacement({naturalWidth:220,naturalHeight:260});
 assert.ok(p.width<=224&&p.height<=232);
 assert.ok(p.x>=272&&p.y>=70);
 assert.ok(Math.abs(p.width/p.height-220/260)<1e-10);
});
test('legacy figure cleanup only affects its own region; retains red splash and outside artwork',()=>{
 const {x,y,width,height}=MENU_PORTRAIT_ERASE;
 const original=new Uint8ClampedArray(width*height*4);
 const point=(px,py,color)=>{const at=((py-y)*width+px-x)*4;original.set(color,at);return at;};
 const face=point(405,145,[230,235,245,255]);
 const ink=point(451,166,[20,40,70,255]);
 const red=point(410,152,[220,20,30,255]);
 const outside=point(280,300,[40,60,90,255]);
 const restored=eraseLegacyTitleFigure(original,width,height);
 assert.equal(restored[face+3],0);
 assert.equal(restored[ink+3],0);
 assert.equal(restored[red+3],255);
 assert.equal(restored[outside+3],255);
 assert.equal(original[face+3],255,'source art is never mutated');
});
test('title menu randomization does not change gameplay skins, modes or save data',()=>{
 const src=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(src,/activeGameMode=mode\.id;\s*playSelect\(\)/);
 assert.match(src,/mode:isTutorial\?CLASSIC_MODE:activeGameMode/);
 assert.match(src,/const SKIN_KEY='sketchman-browser-skin-v1'/);
 assert.match(src,/function equipSkin\(id\)/);
 assert.match(src,/CUSTOM MENU PORTRAITS/);
});
