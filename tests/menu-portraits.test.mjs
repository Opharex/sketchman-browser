import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MENU_PORTRAIT_IDS,portraitUrl,choosePortrait,portraitPlacement,
 MENU_PORTRAIT_ERASE,eraseLegacyTitleFigure} from '../dist/menu-portraits.js';
import {MENU_POSE_RECT,titleFigureZone,paintTitlePosePixels} from '../dist/menu-pose-texture.js';

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
 assert.match(src,/MENU PORTRAIT FIX 2/);
});

test('new menu portraits project uploaded material onto original gun-holding pose',()=>{
 const {x,y,width,height}=MENU_POSE_RECT;
 const original=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<original.length;i+=4)original.set([180,205,238,255],i);
 const refWidth=220,refHeight=260,ref=new Uint8ClampedArray(refWidth*refHeight*4);
 for(let i=0;i<ref.length;i+=4)ref.set([225,23,37,255],i);
 const painted=paintTitlePosePixels(original,width,height,{data:ref,width:refWidth,height:refHeight});
 const rgba=(px,py)=>[...painted.slice(((py-y)*width+px-x)*4,((py-y)*width+px-x)*4+4)];
 assert.equal(titleFigureZone(405,181),'head');
 assert.equal(titleFigureZone(405,145),'head');
 assert.equal(titleFigureZone(403,224),'torso','the torso begins immediately beneath the head');
 assert.equal(titleFigureZone(400,245),'torso');
 assert.equal(titleFigureZone(357,280),'leftArm');
 assert.equal(titleFigureZone(434,248),'rightArm');
 assert.ok(rgba(405,181)[0]>200&&rgba(405,181)[1]<40,'reference head center is fully textured');
 assert.ok(rgba(405,145)[0]>200&&rgba(405,145)[1]<40,'upper head stays textured');
 assert.ok(rgba(400,245)[0]>200&&rgba(400,245)[2]<50,'reference body texture is used');
 assert.deepEqual(rgba(570,110),[180,205,238,255],'gun and title surroundings are untouched');
 assert.deepEqual(rgba(460,190),[180,205,238,255],'forward pistol highlight cannot be repainted');
 assert.deepEqual([...original.slice(0,4)],[180,205,238,255],'source art stays immutable');
});
test('menu pre-bakes every reference into the fixed title pose rather than inserting running figures',()=>{
 const src=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(src,/function prepareTitlePoseVariants\(\)/);
 assert.match(src,/paintTitlePosePixels\(paint\.poseOriginal\.data,width,height,sample,x,y\)/);
 assert.match(src,/paint\.poseVariants\.set\(id,new ImageData\(pixels,width,height\)\)/);
 assert.match(src,/prepareOptionsPanels\(\);getMainMenuPaint\(\);prepareTitlePoseVariants\(\)/);
 assert.match(src,/const portrait=mainMenuPaint\.poseVariants\.get\(id\)/);
 assert.doesNotMatch(src,/paint\.context\.drawImage\(art,slot\.x/);
 assert.doesNotMatch(src,/eraseLegacyTitleFigure\(oldHero\.data/);
});

test('the correct head covers its entire interior, with pistol and surrounding ink protected',()=>{
 const {x,y,width,height}=MENU_POSE_RECT;
 const base=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<base.length;i+=4)base.set([190,215,242,255],i);
 const rw=230,rh=260,material=new Uint8ClampedArray(rw*rh*4);
 for(let i=0;i<material.length;i+=4)material.set([23,210,61,255],i);
 const painted=paintTitlePosePixels(base,width,height,{data:material,width:rw,height:rh},x,y);
 const color=(px,py)=>[...painted.slice(((py-y)*width+px-x)*4,((py-y)*width+px-x)*4+4)];
 for(const pt of [[403,181],[403,155],[403,205],[380,183],[425,183],[400,245],[400,280],[356,281]]){
  const [r,g,b]=color(...pt);
  assert.ok(g>r*4&&g>b*2,'reference material must cover '+pt);
 }
 for(const pt of [[470,175],[485,215],[555,155],[560,230],[335,190]]){
  assert.deepEqual(color(...pt),[190,215,242,255],'gun and lettering keep original pixels '+pt);
 }
});
