import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SKINS} from '../dist/skins.js';
import {MENU_HERO_REGION,MENU_SKIN_PALETTES,chooseMenuSkin,recolorMenuHeroPixels} from '../dist/menu-skin.js';

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

test('the title uses real uploaded portrait files instead of procedural gameplay recolors',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(game,/const menuPortraitsReady=preloadMenuPortraits\(\)/);
 assert.match(game,/menuPortraitImages=await menuPortraitsReady/);
 assert.match(game,/paintTitlePosePixels\(paint\.poseOriginal\.data,width,height,sample,x,y\)/);
 assert.match(game,/const id=choosePortrait\(previousMenuPortrait\)/);
 assert.match(game,/mainMenuPaint\.context\.putImageData\(portrait,MENU_POSE_RECT\.x,MENU_POSE_RECT\.y\)/);
 assert.doesNotMatch(game,/chooseMenuSkin\(SKINS,previousMenuSkin\)/);
 assert.match(game,/chooseNextMenuPortrait\(\);renderMenu\(\)/);
 assert.match(game,/selectedSkin=DEFAULT_SKIN/);
 assert.match(game,/function equipSkin\(id\)/);
});

test('menu skin color palettes exactly match the real gameplay atlas builder',()=>{
 const builder=fs.readFileSync(new URL('../tools/build-skins.py',import.meta.url),'utf8');
 for(const [id,colors] of Object.entries(MENU_SKIN_PALETTES)){
  if(id==='shadow')continue;
  const tuple=builder.match(new RegExp('^\\s*"'+id+'": \\(([^)]*)\\)', 'm'));
  assert.ok(tuple,id+' gameplay material palette exists');
  const expected=[...tuple[1].matchAll(/#[0-9a-f]{6}/gi)].map(x=>x[0]);
  assert.deepEqual(colors,expected,id+' uses the EXACT approved gameplay colors');
 }
});
test('Crimson Bolt title retains its ivory-white face and deep ruby-red body',()=>{
 const {width,height,x,y}=MENU_HERO_REGION;
 const raw=new Uint8ClampedArray(width*height*4);
 raw.fill(255);
 for(let i=0;i<raw.length;i+=4){raw[i]=188;raw[i+1]=214;raw[i+2]=239;}
 const result=recolorMenuHeroPixels(raw,width,height,'crimson_bolt');
 const at=(gx,gy)=>[...result.slice(((gy-y)*width+gx-x)*4,((gy-y)*width+gx-x)*4+3)];
 const face=at(405,143),body=at(405,257),background=at(590,290);
 assert.ok(face.every(v=>v>205),'Head must remain ivory-white, not red');
 assert.ok(body[0]>body[1]*3&&body[0]>body[2]*2,'Body must be saturated ruby red');
 assert.deepEqual(background,[188,214,239],'Non-character menu details may not be changed');
});
test('all skin variants preserve alpha and leave outside silhouette untouched',()=>{
 const {width,height,x,y}=MENU_HERO_REGION;
 const raw=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<raw.length;i+=4){raw[i]=178;raw[i+1]=207;raw[i+2]=230;raw[i+3]=i%12===0?0:255;}
 for(const id of SKINS.map(s=>s.id)){
  const processed=recolorMenuHeroPixels(raw,width,height,id);
  assert.equal(processed.length,raw.length);
  for(let i=3;i<raw.length;i+=4)assert.equal(processed[i],raw[i],id+' cannot change silhouette');
  const o=((280-y)*width+590-x)*4;
  assert.deepEqual([...processed.slice(o,o+4)],[...raw.slice(o,o+4)],id+' cannot tint logo');
 }
});
