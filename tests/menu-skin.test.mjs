import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MENU_PORTRAIT_IDS,MENU_PORTRAIT_FRAME,portraitUrl} from '../dist/menu-portraits.js';
test('removed runtime menu skin mapping; each baked layer has the same registration',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.doesNotMatch(game,/menu-skin\.js|menu-pose-texture\.js/);
 assert.doesNotMatch(game,/paintTitlePosePixels|prepareTitlePoseVariants|recolorMenuHeroPixels/);
 assert.match(game,/paint\.context\.drawImage\(layer,327,85\)/);
 assert.deepEqual(MENU_PORTRAIT_FRAME,{x:327,y:85,width:155,height:187});
 assert.equal(MENU_PORTRAIT_IDS.length,9);
 assert.ok(MENU_PORTRAIT_IDS.every(id=>portraitUrl(id)==='menu-portraits/prebuilt/'+id+'.png'));
});
