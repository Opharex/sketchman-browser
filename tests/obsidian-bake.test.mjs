import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const game=read('dist/game.js');
const builder=read('tools/build-skins.py');
const atlas=read('dist/skin-atlas.js');
const html=read('dist/index.html');

test('Obsidian body and lava use one pre-baked sprite, not a runtime shadow overlay',()=>{
 assert.match(builder,/def bake_obsidian_emission\(/);
 assert.match(builder,/result=bake_obsidian_emission\(result,source,xoff,yoff,frame_name\)/);
 assert.doesNotMatch(game,/shadowBlur|shadowColor/);
 assert.match(game,/if\(atlas\)target\.drawImage\(im,\.\.\.atlas\.box,p\.x,p\.y,p\.w,p\.h\)/);
 assert.match(game,/GAME MODES \+ OOPS ALL BOMBS/);
});
test('Fire trail stays a separate cosmetic effect restricted to Obsidian',()=>{
 assert.match(game,/if\(selectedSkin==='obsidian_ember'\)emberTrail\.draw\(ctx,w\)/);
 assert.match(game,/emberTrail\.step\(world,selectedSkin==='obsidian_ember'/);
 assert.match(game,/drawEmberPreview/);
});
test('Only Obsidian texture and thumbnail URLs are newly versioned',()=>{
 assert.match(atlas,/id==='obsidian_ember'\?'obsidian-material-03':ATLAS_VERSION/);
 assert.match(atlas,/id==='crimson_bolt'\?'crimson-refine-01'/);
 assert.match(atlas,/id==='frost_runner'\?'frost-refine-01'/);
 assert.match(atlas,/id==='sunset_blaze'\?'sunset-refine-01'/);
 assert.match(html,/game\.js\?v=game-modes-01/);
});

test('Obsidian plates follow actual pose-local directions and verified Run bind bones',()=>{
 assert.match(builder,/def obsidian_pose_texture_axes\(/);
 assert.match(builder,/def obsidian_plate_color\(/);
 assert.match(builder,/rig_segments=\(/);
 assert.match(builder,/frame_name=="CHR_Run_01"/);
 assert.match(builder,/theta=\.5\*math\.atan2/);
 assert.match(builder,/u=fx\*math\.cos\(theta\)\+fy\*math\.sin\(theta\)/);
 assert.match(builder,/_ember_voronoi\(/);
 assert.doesNotMatch(builder,/def build_obsidian_material\(/);
});
test('Production atlas includes native-pixel QA poses and no missing original frames',()=>{
 const qa=path.join(root,'dist/skins/generated/obsidian-material-qa.png');
 if(process.env.CI){
  assert.ok(fs.existsSync(qa),'Visual QA sheet must be generated from actual atlas');
  assert.ok(fs.statSync(qa).size>1000,'Visual QA image unexpectedly empty');
 }
 assert.match(builder,/OBSIDIAN_MATERIAL_QA_BASE64:/);
 assert.match(builder,/source\.convert\("RGBA"\)/);
});
