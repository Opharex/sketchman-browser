import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MENU_PORTRAIT_IDS,MENU_PORTRAIT_FRAME,portraitUrl,choosePortrait} from '../dist/menu-portraits.js';

test('nine prebuilt PNG assets are committed and share exact pixel registration',()=>{
 assert.equal(MENU_PORTRAIT_IDS.length,9);
 assert.equal(new Set(MENU_PORTRAIT_IDS).size,9);
 assert.deepEqual(MENU_PORTRAIT_FRAME,{x:327,y:85,width:155,height:187});
 for(const id of MENU_PORTRAIT_IDS){
  const file=fs.readFileSync(new URL('../dist/'+portraitUrl(id),import.meta.url));
  assert.ok(file.length>1200,id+' finished artwork is missing');
  assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(file.readUInt32BE(16),155,id+' width');
  assert.equal(file.readUInt32BE(20),187,id+' height');
 }
});
test('title crop is compensated once, in the asset placement, not per frame',()=>{
 const atlas=JSON.parse(fs.readFileSync(new URL('../dist/assets/sprites.json',import.meta.url),'utf8'));
 assert.equal(atlas.IMM_MainMenu_01.v[2],49);
 assert.equal(134-atlas.IMM_MainMenu_01.v[2],MENU_PORTRAIT_FRAME.y);
});
test('portrait picker is independent and avoids consecutive repeats',()=>{
 for(const id of MENU_PORTRAIT_IDS)for(const roll of [0,.2,.5,.85,.999])
  assert.notEqual(choosePortrait(id,()=>roll),id);
 assert.equal(choosePortrait(null,()=>0),MENU_PORTRAIT_IDS[0]);
 assert.equal(choosePortrait('only',()=>.5,['only']),'only');
 assert.equal(choosePortrait(null,()=>.5,[]),null);
});
test('title swaps finished preloaded images without any runtime UVs or repainting',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(game,/PREBUILT MENU PORTRAITS/);
 assert.match(game,/menuPortraitImages=await menuPortraitsReady/);
 assert.match(game,/paint\.context\.drawImage\(paint\.titleBase,0,0\)/);
 assert.match(game,/paint\.context\.drawImage\(layer,327,85\)/);
 assert.match(game,/const id=choosePortrait\(previousMenuPortrait\)/);
 assert.match(game,/chooseNextMenuPortrait\(\);renderMenu\(\)/);
 assert.doesNotMatch(game,/paintTitlePosePixels|recolorMenuHeroPixels|prepareTitlePoseVariants|portraitPlacement|MENU_POSE_RECT/);
});
test('equipped skin, gameplay modes and save state remain independent',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(game,/activeGameMode=mode\.id;\s*playSelect\(\)/);
 assert.match(game,/mode:isTutorial\?CLASSIC_MODE:activeGameMode/);
 assert.match(game,/const SKIN_KEY='sketchman-browser-skin-v1'/);
 assert.match(game,/function equipSkin\(id\)/);
});
