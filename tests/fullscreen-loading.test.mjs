import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
test('loading has five staggered fullscreen checks',()=>{
 assert.match(game,/loadingFullscreenChecks>=5/);
 assert.match(game,/\[0,350,900,1600,2600\]/);
 assert.match(game,/setTimeout\(fullscreenCheckDuringLoading,delay\)/);
});
test('fullscreen fallback expands even if browser blocks request',()=>{
 assert.match(game,/classList\.add\('app-expanded'\)/);
 assert.match(game,/document\.addEventListener\('pointerdown',retryFullscreenOnGesture/);
 assert.match(game,/document\.addEventListener\('keydown',retryFullscreenOnGesture/);
});
