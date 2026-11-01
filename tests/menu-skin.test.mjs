import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SKINS} from '../dist/skins.js';
import {MENU_HERO_REGION,chooseMenuSkin,recolorMenuHeroPixels} from '../dist/menu-skin.js';

test('main menu includes every existing playable skin and never repeats the last portrait',()=>{
 assert.equal(SKINS.length,11);
 assert.ok(SKINS.some(s=>s.id==='default')&&SKINS.some(s=>s.id==='crimson_bolt'));
 const options=new Set();
 for(let i=0;i<SKINS.length;i++)options.add(chooseMenuSkin(SKINS,null,()=>i/SKINS.length));
 assert.deepEqual(options,new Set(SKINS.map(s=>s.id)));
 for(const skin of SKINS){
  for(const rng of [0,.2,.8,.999])assert.notEqual(chooseMenuSkin(SKINS,skin.id,()=>rng),skin.id);
 }
 assert.equal(chooseMenuSkin([{id:'only'}],'only',()=>.9),'only');
});

test('default portrait preserves pixel-perfect main menu source, every skin changes only cel paint',()=>{
 const {x,y,width,height}=MENU_HERO_REGION;
 const raw=new Uint8ClampedArray(width*height*4).fill(0);
 const px=(absX,absY,color)=>{const p=((absY-y)*width+absX-x)*4;for(let i=0;i<4;i++)raw[p+i]=color[i];return p;};
 const pale=px(405,163,[194,220,236,255]);
 const torso=px(405,257,[157,189,214,255]);
 const metal=px(550,247,[35,74,112,255]);
 const cream=px(315,102,[233,220,190,255]);
 const redCrack=px(470,230,[209,44,35,255]);
 const logo=px(600,190,[20,31,70,255]);
 const original=new Uint8ClampedArray(raw);
 assert.deepEqual(recolorMenuHeroPixels(raw,width,height,'default'),raw);
 for(const skin of SKINS.filter(s=>s.id!=='default')){
  const result=recolorMenuHeroPixels(raw,width,height,skin.id);
  assert.equal(result.length,raw.length);
  assert.notDeepEqual([...result.slice(pale,pale+3)],[...raw.slice(pale,pale+3)],skin.id+' head must change');
  assert.notDeepEqual([...result.slice(torso,torso+3)],[...raw.slice(torso,torso+3)],skin.id+' torso must change');
  for(const p of [metal,cream,redCrack,logo])assert.deepEqual([...result.slice(p,p+4)],[...raw.slice(p,p+4)],skin.id+' must not tint gun, logo or scenery');
  for(let i=3;i<raw.length;i+=4)assert.equal(result[i],raw[i],'alpha and silhouette unchanged');
 }
 assert.deepEqual(raw,original,'original art must be immutable');
});

test('title portrait is composed onto existing native menu art before rendering, and weapon/skin selection is unaffected',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(game,/mainMenuPaint=\{canvas,context:c,tiles,active:null,heroOriginal,heroVariants:new Map\(\)\}/);
 assert.match(game,/chooseNextMenuPortrait\(\);renderMenu\(\)/);
 assert.match(game,/mainMenuPaint\.context\.putImageData\(portrait,MENU_HERO_REGION\.x,MENU_HERO_REGION\.y\)/);
 assert.match(game,/const skinId=chooseMenuSkin\(SKINS,previousMenuSkin\)/);
 assert.match(game,/selectedSkin=DEFAULT_SKIN/);
 assert.match(game,/function equipSkin\(id\)/);
});
