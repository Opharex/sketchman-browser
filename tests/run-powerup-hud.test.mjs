import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runPowerupBadges,runPowerupStockLabel} from '../dist/run-powerup-hud.js';
const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
const ITEMS=[
 {id:'double',name:'Double Coins',icon:'STR_ICO_CoinsX2_01'},
 {id:'life',name:'Extra Life',icon:'STR_ICO_ExtraLife_01'},
 {id:'head500',name:'Head Start 500m',icon:'STR_ICO_HeadStart_01'},
 {id:'longShield',name:'Longer Invincibility',icon:'STR_ICO_InvincibleLonger_01',permanent:true},
 {id:'fullHealth',name:'Full Health Restore',icon:'STR_ICO_FullHealth_01',permanent:true}
];
test('Run badges show exact stock after consuming a charge, including zero',()=>{
 const entries=runPowerupBadges(['double','life','head500'],ITEMS,{double:9,life:0,head500:2},{});
 assert.deepEqual(entries.map(e=>[e.name,runPowerupStockLabel(e)]),
  [['Double Coins','9 left'],['Extra Life','0 left'],['Head Start 500m','2 left']]);
});
test('Permanent upgrades display infinity and do not consume inventory',()=>{
 const stock={double:4};
 const entries=runPowerupBadges([],ITEMS,stock,{longShield:true,fullHealth:true});
 assert.deepEqual(entries.map(e=>runPowerupStockLabel(e)),['∞','∞']);
 assert.deepEqual(stock,{double:4});
});
test('Empty, exhausted, or duplicate entries do not produce incorrect badge counts',()=>{
 assert.deepEqual(runPowerupBadges([],ITEMS,{},{}),[]);
 const badges=runPowerupBadges(['double','double','unknown'],ITEMS,{double:-5},{});
 assert.equal(badges.length,1);assert.equal(badges[0].remaining,0);
});
test('Run snapshot is built after spending equipped charges and never in tutorials',()=>{
 assert.match(game,/save\.stock\[id\]--;consumed\.push\(id\)/);
 assert.match(game,/activeRunPowerups=isTutorial\?\[\]:runPowerupBadges\(consumed,ITEMS,save\.stock,save\.permanent\)/);
 assert.match(game,/mountRunPowerupHud\(\)/);
 assert.match(game,/if\(tutorial\|\|!activeRunPowerups\.length\)return/);
 assert.match(game,/runPowerupStockLabel\(badge\)/);
});
test('The indicator remains visible after the intro and never steals touch inputs',()=>{
 assert.match(game,/panel\.classList\.remove\('run-powerups-intro'\)/);
 assert.match(game,/run-powerup\[data-powerup-id="life"\]/);
 assert.match(css,/#ui>\.run-powerups/);
 assert.match(css,/pointer-events:none!important/);
});
