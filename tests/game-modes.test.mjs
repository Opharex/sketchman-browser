import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World,HAZARDS,FLOOR,freshSave,normalizeSave} from '../dist/engine.js';
import {CLASSIC_MODE,BOMB_MODE,GAME_MODES,getGameMode,substituteHazard,modeScoreRecord} from '../dist/game-modes.js';
const patterns=JSON.parse(fs.readFileSync(new URL('../dist/assets/normal-patterns.json',import.meta.url),'utf8')).patterns;

test('Game mode registry is extensible; unknown modes safely fall back to Classic',()=>{
 assert.equal(GAME_MODES.length,2);
 assert.equal(getGameMode('invalid').id,CLASSIC_MODE);
 assert.equal(getGameMode(BOMB_MODE).obstacleReplacement,3);
 assert.equal(getGameMode(CLASSIC_MODE).obstacleReplacement,null);
});

test('Classic hazards keep identical original entities and original RNG consumption',()=>{
 const a=new World({seed:975,mode:CLASSIC_MODE});
 const b=new World({seed:975});
 for(const id of [0,1,2,3,4,5,6,7,8,9]){
  a.spawn('hazard',id,1160,425);
  b.spawn('hazard',id,1160,425);
 }
 assert.deepEqual(a.entities,b.entities);
 assert.equal(a.seed,b.seed);
 assert.equal(a.mode.id,CLASSIC_MODE);
});

test('All hazards become real land mines, preserving one event, X and original center Y',()=>{
 const w=new World({seed:123,mode:BOMB_MODE});
 const normal=new World({seed:123,mode:CLASSIC_MODE});
 for(const id of [0,1,2,3,4,5,6,7,8,9]){
  const y=410+HAZARDS[id].h/2;
  w.spawn('hazard',id,1100+id*14,y);
  normal.spawn('hazard',id,1100+id*14,y);
  const bomb=w.entities.at(-1),original=normal.entities.at(-1);
  assert.equal(bomb.id,3);
  assert.equal(bomb.type,'hazard');
  assert.equal(bomb.sprite,'HAZ_Mine_01');
  assert.equal(bomb.modeBomb,true);
  assert.equal(bomb.sourceObstacleId,id);
  assert.equal(bomb.x,original.x);
  assert.equal(bomb.y-bomb.h/2,original.y-original.h/2);
  assert.equal(bomb.hp,HAZARDS[3].hp);
  assert.equal(bomb.damage,HAZARDS[3].damage);
 }
 assert.equal(w.entities.length,normal.entities.length);
 assert.equal(w.seed,normal.seed,'Mode switch must consume zero RNG');
});

test('Ground hazards stay grounded, and implicit airborne hazards preserve their center',()=>{
 const a=new World({seed:9,mode:CLASSIC_MODE});
 const b=new World({seed:9,mode:BOMB_MODE});
 a.spawn('hazard',0,1100);b.spawn('hazard',0,1100);
 assert.equal(a.entities[0].y,FLOOR);
 assert.equal(b.entities[0].y,FLOOR);
 a.spawn('hazard',5,1100);b.spawn('hazard',5,1100);
 assert.equal(a.entities[1].y-a.entities[1].h/2,b.entities[1].y-b.entities[1].h/2);
 assert.equal(a.seed,b.seed);
});

test('Actual pattern spawn with reversed spikes is still a bomb, never a spikes sprite',()=>{
 const a=new World({seed:22,mode:BOMB_MODE,patterns});
 const b=new World({seed:22,mode:CLASSIC_MODE,patterns});
 const event={type:0,args:[0,140,0,430,0,0,2]};
 a.spawnPattern(event,1.1);b.spawnPattern(event,1.1);
 assert.equal(a.entities[0].id,3);
 assert.equal(a.entities[0].sprite,'HAZ_Mine_01');
 assert.equal(b.entities[0].sprite,'HAZ_FlatSpikesReverse_01');
 assert.equal(a.entities[0].moveSpeed,b.entities[0].moveSpeed);
 assert.equal(a.entities[0].verticalSpeed,b.entities[0].verticalSpeed);
 assert.equal(a.entities[0].y-a.entities[0].h/2,b.entities[0].y-b.entities[0].h/2);
});

test('Deterministic 100 second APK pattern event stream has identical spawn times, positions, counts, RNG and non-hazards',()=>{
 const a=new World({seed:0x12ab34ef,mode:CLASSIC_MODE,patterns});
 const b=new World({seed:0x12ab34ef,mode:BOMB_MODE,patterns});
 const eventsA=[],eventsB=[];
 function run(world,log){
  const original=world.spawn.bind(world);
  world.spawn=(kind,id,x,y)=>{
   const n=world.entities.length;
   original(kind,id,x,y);
   const e=world.entities[n];
   log.push({at:world.director.activeTime,kind,id:e.id,type:e.type,
      x:e.x,cy:e.y-e.h/2,originalId:id,sprite:e.sprite,modeBomb:!!e.modeBomb});
  };
  for(let i=0;i<6000;i++)world.director.update(1/60,
     (event,scale)=>world.spawnPattern(event,scale),()=>null);
 }
 run(a,eventsA);run(b,eventsB);
 assert.ok(eventsA.filter(e=>e.kind==='hazard').length>40,'Check many obstacle patterns');
 assert.equal(eventsA.length,eventsB.length,'No additional or missing entities');
 for(let i=0;i<eventsA.length;i++){
  const x=eventsA[i],y=eventsB[i];
  assert.equal(y.at,x.at,'Spawn timing mismatch at '+i);
  assert.equal(y.kind,x.kind,'Non-obstacle spawn type mismatch at '+i);
  assert.equal(y.x,x.x,'Spawn horizontal position mismatch at '+i);
  assert.equal(y.cy,x.cy,'Spawn vertical center mismatch at '+i);
  if(x.kind==='hazard'){
   assert.equal(y.id,3);
   assert.equal(y.modeBomb,true);
  }else{
   assert.equal(y.id,x.id);
   assert.equal(y.sprite,x.sprite);
  }
 }
 assert.equal(a.director.id,b.director.id);
 assert.deepEqual(a.director.history,b.director.history);
 assert.equal(a.director.scale,b.director.scale);
 assert.equal(a.seed,b.seed,'Random stream changed between modes');
});

test('Tutorial remains unchanged even when bombs mode is selected',()=>{
 const w=new World({seed:77,mode:BOMB_MODE,tutorial:true});
 assert.equal(w.mode.id,CLASSIC_MODE);
 w.spawn('hazard',0,800);
 assert.equal(w.entities[0].sprite,'HAZ_Crate_01');
});

test('Mine collision / destruction retains native mine effects and sound identifiers',()=>{
 const b=new World({seed:4,mode:BOMB_MODE,onEvent:()=>{}});
 b.spawn('hazard',0,550,450);
 const e=b.entities[0];
 assert.equal(e.id,3);
 b.destroy(e,true);
 assert.equal(e.dead,true);
 assert.equal(b.counts.hazardDestroy,1);
 assert.equal(b.counts.DestroyedStaticHazard,1);
 assert.ok(b.particles.some(p=>p.group==='G_LandMineDest'));
});

test('Alternate scores can be recorded without modifying classic scores',()=>{
 const s=freshSave();s.best=400;s.scores=[modeScoreRecord(400,20,1,0)];
 s.modeRecords[BOMB_MODE]={best:470,scores:[modeScoreRecord(470,5,0,0)]};
 const out=normalizeSave(s);
 assert.equal(out.best,400);
 assert.equal(out.scores[0].distance,400);
 assert.equal(out.modeRecords[BOMB_MODE].best,470);
 assert.equal(out.modeRecords[BOMB_MODE].scores[0].distance,470);
});

test('Actual UI Play flow has mode selector and Retry keeps mode while Classic records remain unchanged',()=>{
 const game=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 assert.match(game,/\['Play',gameModesScreen\]/);
 assert.match(game,/function gameModesScreen\(\)/);
 assert.match(game,/game-mode-grid/);
 assert.match(game,/activeGameMode=mode.id;playSelect\(\)/);
 assert.match(game,/mode:isTutorial\?CLASSIC_MODE:activeGameMode/);
 assert.match(game,/artButton\('Retry',\(\)=>startRun\(\)\)/);
 assert.match(game,/if\(world.mode.id===CLASSIC_MODE\)/);
});
