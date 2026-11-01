import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {freshSave,normalizeSave} from '../dist/engine.js';
import {CLASSIC_MODE,BOMB_MODE,modeScoreRecord} from '../dist/game-modes.js';
import {missionDisplayRows,scoreboardForMode} from '../dist/progress-ui.js';
const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
test('Weapon selection exposes Missions and keeps selected weapon when returning',()=>{
 assert.match(game,/artButton\('Missions',missionScreen,'selection-missions'\)/);
 assert.match(game,/panel\.append\(missionsButton\)/);
 assert.match(game,/const backToWeapons=\(\)=>playSelect\(SELECTION_ORDER\[selectionIndex\]\)/);
 assert.match(css,/\.weapon-selection \.selection-missions/);
});
test('Game over displays missions in a scrollable recap without changing progress',()=>{
 assert.match(game,/s\.classList\.add\('center','game-over-screen'\)/);
 assert.match(game,/recap\.append\(missionEntry\(row,true\)\)/);
 assert.match(css,/\.game-over-screen \.content/);
});
test('Mission snapshot honors incomplete counts and completed rows',()=>{
 const s=freshSave();s.missionProgress={'0':15,'40':8,'80':1};s.completed=[40];
 const m=[];for(const [id,group,goal]of [[0,0,25],[40,1,100],[80,2,4]])
  m[id]={id,group,text:'Mission '+id,target:goal,reward:50,cumulative:false};
 const before=JSON.stringify(s);
 const rows=missionDisplayRows(m,s);
 assert.deepEqual(rows.map(r=>r.progress),[15,100,1]);
 assert.deepEqual(rows.map(r=>r.completed),[false,true,false]);
 assert.equal(JSON.stringify(s),before);
});
test('Separate leaderboard records persist without cross-mode leakage',()=>{
 const s=freshSave();s.best=450;s.scores=[modeScoreRecord(450,30,2,0)];
 s.modeRecords[BOMB_MODE]={best:750,scores:[modeScoreRecord(750,120,3,1)]};
 const loaded=normalizeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(scoreboardForMode(loaded,CLASSIC_MODE).best,450);
 assert.equal(scoreboardForMode(loaded,CLASSIC_MODE).scores[0].distance,450);
 assert.equal(scoreboardForMode(loaded,BOMB_MODE).best,750);
 assert.equal(scoreboardForMode(loaded,BOMB_MODE).scores[0].distance,750);
 assert.equal(scoreboardForMode(loaded,'invalid').mode.id,CLASSIC_MODE);
 assert.deepEqual(scoreboardForMode(freshSave(),BOMB_MODE).scores,[]);
});
test('Scores screen supports separate selectable modes and empty records',()=>{
 assert.match(game,/tabs\.setAttribute\('role','tablist'\)/);
 assert.match(game,/scoreboardForMode\(save,modeId\)/);
 assert.match(game,/panel\.replaceChildren\(\)/);
 assert.match(game,/if\(!records\.length\)/);
 assert.match(css,/\.score-mode-tabs/);
});
