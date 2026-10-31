import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SKINS,DEFAULT_SKIN,getSkin,cosmeticFrame} from '../dist/skins.js';
import {ATLAS_SKINS,isAtlasSkin} from '../dist/skin-atlas.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const spriteData=JSON.parse(fs.readFileSync(path.join(root,'dist/assets/sprites.json'),'utf8'));
const originals=Object.keys(spriteData).filter(name=>name.startsWith('CHR_')).sort();
const generated=path.join(root,'dist/skins/generated');
test('All eleven skins registered, original and shadow retained, Clay not restored',()=>{
 assert.equal(SKINS.length,11);
 assert.equal(ATLAS_SKINS.length,9);
 assert.deepEqual(SKINS.slice(0,2).map(s=>s.id),['default','shadow']);
 assert.equal(SKINS.some(s=>s.id==='clay'),false);
 assert.equal(new Set(SKINS.map(s=>s.id)).size,11);
 for(const id of ATLAS_SKINS)assert.ok(SKINS.some(s=>s.id===id));
 assert.equal(getSkin('unknown').id,DEFAULT_SKIN);
});
test('Skins reuse the precise original animation frame keys',()=>{
 for(const frame of originals)for(const id of ATLAS_SKINS){
  assert.ok(isAtlasSkin(id));
  assert.equal(cosmeticFrame(frame,id),'SKIN_'+id+'__'+frame);
 }
 assert.equal(cosmeticFrame('CHR_Run_01','default'),'CHR_Run_01');
 assert.equal(cosmeticFrame('CHR_Run_01','shadow'),'SHADOW_CHR_Run_01');
});
test('Every Atlas frame is present, trimmed exactly as original',()=>{
 const manifestFile=path.join(generated,'manifest.json');
 if(!fs.existsSync(manifestFile)){
  if(process.env.CI)assert.fail('CI must render the complete nine-skin manifest');
  return;
 }
 const m=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 assert.equal(m.frameCount,originals.length);
 assert.deepEqual(Object.keys(m.frames).sort(),originals);
 assert.deepEqual(m.skins.sort(),[...ATLAS_SKINS].sort());
 for(const name of originals){
  const [x,y,w,h]=m.frames[name],v=spriteData[name].v;
  assert.equal(w,v[7],name+' width');
  assert.equal(h,v[8],name+' height');
  assert.ok(x>=0&&y>=0&&x+w<=m.width&&y+h<=m.height,name+' atlas bounds');
 }
 for(const id of ATLAS_SKINS){
  const image=path.join(generated,id+'.png');
  const icon=path.join(generated,id+'-thumb.png');
  assert.ok(fs.statSync(image).size>1024,'Missing/empty atlas '+id);
  assert.ok(fs.statSync(icon).size>200,'Missing/empty thumbnail '+id);
 }
 assert.equal(ATLAS_SKINS.length*originals.length,1287);
});
