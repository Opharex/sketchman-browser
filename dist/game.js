import {playLoadingIntro} from './loading-intro.js';
import {DEFAULT_CONTROLS,bindControl,keyLabel} from './controls.js';
import {setMenuFont,menuLettering} from './menu-lettering.js';
import {CarouselMotion} from './carousel-motion.js';
import {SELECTION_ORDER,drawPlayerSelection} from './player-select.js';
import {renderMobileShop} from './mobile-shop.js';
import {bossTarget,enemyBulletRotation,healthBar} from './boss.js';
import {effectSound,EFFECT_TEXTURES} from './destruction.js';
import {drawParticle} from './particle-renderer.js';
import {frameOf,frameName,playerFrame,framePlacement,enemyFrame} from './animation.js';
import {sceneryTile} from './normal-run.js';
import {World,WEAPONS,SCENES,HAZARDS,WIDTH,HEIGHT,FLOOR,PLAYER_X,freshSave,normalizeSave,buyWeapon} from './engine.js';
const $=s=>document.querySelector(s), canvas=$('#game'),ctx=canvas.getContext('2d'),ui=$('#ui');
const KEY='sketchman-browser-v1';let save=freshSave(),storageOK=true;try{save=normalizeSave(JSON.parse(localStorage.getItem(KEY)));}catch{};
try{const legacy=JSON.parse(localStorage.getItem('sketchman-keybinds'));if(legacy&&!JSON.parse(localStorage.getItem(KEY))?.settings?.controls){for(const action of ['jump','fire','pause']){const next=bindControl(save.settings.controls,action,legacy[action]);if(next)save.settings.controls=next;}persist();}}catch{}
let state='loading',world=null,assets={},sprites={},missions=[],normalData={patterns:[]},last=0,anim=0,ended=false,returnState='menu',tipTime=0,tutorial=false,toastTimer,music=null,musicName='',pendingMission=[],muteForPause=false;
let captureControl=null,controlsReturn=menu;
let selectionIndex=0,selectionMotion=new CarouselMotion();
let pointerJump=new Set(),pointerFire=new Set(),keys=new Set();
const ICON=n=>`icons/${n}.png`;
const fmt=n=>Math.floor(n).toLocaleString();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));}catch{storageOK=false;}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
const audioPools={};
const soundNames={shoot:['S_0002_GunFire.wav','S_0003_ShotgunFire.wav','S_0004_SMGFire.wav','S_0005_Rpg2.wav','S_0038_ShootArrow.wav','S_0002_GunFire.wav','S_0044_Rocketv1.wav','S_0048_ShockwaveGun.wav','S_0049_Shockwave2.wav','S_0049_Shockwave2.wav'],coin:'S_0016_Coin2.wav',jump:'S_0011_Jump.wav',hit:'S_0009_DryThump.wav',explosion:'S_0015_Explosion2.wav',health:'S_0037_PowerupHP.wav',shield:'S_0047_Invincible.wav',revive:'S_0046_Resurect.wav',complete:'S_0040_MissionDone.wav',click:'S_0001_Click.wav'};
function sfx(event,id=0){if(!save.settings.sound)return;let file=effectSound(event,id)||soundNames[event];if(Array.isArray(file))file=file[id]||file[0];if(!file)return;let pool=audioPools[file];if(!pool){pool=audioPools[file]=Array.from({length:event==='coin'?4:3},()=>new Audio(`assets/Sounds/Sfx/${file}`));}const a=pool.find(x=>x.paused)||pool[0];a.volume=save.settings.volume*.55;try{a.currentTime=0;a.play().catch(()=>{});}catch{}}
function setMusic(name){if(musicName===name&&music){if(save.settings.music&&!muteForPause)music.play().catch(()=>{});return;}if(music)music.pause();musicName=name;music=new Audio(`assets/Sounds/Music/${name}`);music.loop=true;music.volume=save.settings.volume*.36;if(save.settings.music&&!muteForPause)music.play().catch(()=>{});}
function updateMusic(){if(music){music.volume=save.settings.volume*.36;if(save.settings.music&&!muteForPause)music.play().catch(()=>{});else music.pause();}}
function img(n,x,y,w,h,alpha=1){const im=assets[n];if(!im)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x,y,w??im.width,h??im.height);ctx.restore();}
function sprite(n,x,y,scale=1,flip=false,alpha=1){const im=assets[n];if(!im)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(im,-im.width*scale/2,-im.height*scale,im.width*scale,im.height*scale);ctx.restore();}
function original(n,x,y,w,h){const s=sprites[n];if(!s)return;const v=s.v;img(n,x+v[11]*(w/v[5]),y+v[12]*(h/v[6]),v[7]*(w/v[5]),v[8]*(h/v[6]));}
function text(s,x,y,size=24,color='#1b4d79',align='left'){ctx.fillStyle=color;ctx.font=`italic bold ${size}px 'Trebuchet MS',sans-serif`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function paper(){ctx.fillStyle='#efefdd';ctx.fillRect(0,0,960,640);if(assets.IMM_MenuBack_01)img('IMM_MenuBack_01',0,0,960,640);else{ctx.strokeStyle='#8ab5bb28';ctx.lineWidth=.6;ctx.beginPath();for(let x=0;x<960;x+=18){ctx.moveTo(x,0);ctx.lineTo(x,640);}for(let y=0;y<640;y+=18){ctx.moveTo(0,y);ctx.lineTo(960,y);}ctx.stroke();}}
// Fit the visible numeral bounds, including italic overhang, inside the artwork.
function coinNumber(value,x,y,width,height,size=24,color='#173f68'){
 const label=String(value);ctx.save();ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';
 ctx.font=`italic bold ${size}px 'Trebuchet MS',sans-serif`;
 let m=ctx.measureText(label),inkWidth=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,inkHeight=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
 const fit=Math.min(1,(width-8)/Math.max(m.width,inkWidth),(height-6)/Math.max(1,inkHeight));
 ctx.font=`italic bold ${size*fit}px 'Trebuchet MS',sans-serif`;m=ctx.measureText(label);
 ctx.fillText(label,x+(width-m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2+m.actualBoundingBoxLeft,y+(height+m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);ctx.restore();
}
function notebook(){img('SCN_NoteBookTop_01',0,0,960,20);img('SCN_NoteBookBottom_01',0,620,960,20);img('SCN_NoteBookLeft_01',0,0,18,640);img('SCN_NoteBookRight_01',944,0,16,640);}
// Change this unique splash phrase on every published gameplay update.
const VERSION_SPLASH='ORIGINAL OPTIONS';
let versionSplashImage=null;
function drawVersionSplash(){
 if(!versionSplashImage){const src=menuLettering(VERSION_SPLASH);if(src){versionSplashImage=new Image();versionSplashImage.src=src;}}
 if(!versionSplashImage?.complete||!versionSplashImage.naturalWidth)return;
 // Pulse at a relaxed pace without ever covering the main-menu buttons.
 const pulse=1+.11*Math.sin(anim*3.3);
 const width=Math.min(280,versionSplashImage.naturalWidth*.56)*pulse;
 const height=width*versionSplashImage.naturalHeight/versionSplashImage.naturalWidth;
 ctx.save();ctx.translate(295,178);ctx.rotate(-.13);ctx.drawImage(versionSplashImage,-width/2,-height/2,width,height);ctx.restore();
}
function renderMenu(){paper();ctx.save();ctx.beginPath();ctx.rect(0,0,960,640);ctx.rect(80,490,270,90);ctx.clip('evenodd');original('IMM_MainMenu_01',35,13,890,596);ctx.restore();drawVersionSplash();notebook();}
let optionsHover=null;
function renderOriginalOptions(){
 paper();
 // Original APK OPTIONS panel with its own illustrated title, Music and Sound icons.
 original('IMM_Options_01',220,64,520,344);
 if(save.settings.music||optionsHover==='music')original('IMM_Options_MusicON_01',286,294,154,63);
 if(save.settings.sound||optionsHover==='sound')original('IMM_Options_SoundON_01',500,294,175,66);
 notebook();
}
function drawFrame(n,x,y,scale=1,flip=false,alpha=1,rotation=0){const im=assets[n],meta=sprites[n];if(!im||!meta)return;const p=framePlacement(meta,0,0,scale);ctx.save();ctx.translate(x,y);ctx.rotate(rotation);if(flip)ctx.scale(-1,1);ctx.globalAlpha=alpha;ctx.drawImage(im,p.x,p.y,p.w,p.h);ctx.restore();}
function drawHealthBar(x,y,fraction){
 drawFrame('GPROP_DamageBarBase_01',x,y,1);
 ctx.save();ctx.beginPath();ctx.rect(x-32,y-3,64*fraction,6);ctx.clip();drawFrame('GPROP_DamageBar_01',x,y,1);ctx.restore();
}
function renderBoss(w){const b=w.boss||w.bossDeath;if(!b)return;const dying=!!w.bossDeath&&!w.boss,alpha=dying?Math.min(1,(.7-b.deathTime)*4):1;
 drawFrame('ENM_Jeep_01',b.x,b.y,1,false,alpha);
 drawFrame(frameName(dying?'ENM_EnemyBOSS_Death_':'ENM_EnemyBOSS_Idle_',frameOf(dying?'bossDeath':'bossIdle',dying?b.deathTime:b.t)),b.x-100,b.y-100,1,false,alpha);
 for(const dx of [-85,110])drawFrame('ENM_JeepWheel_01',b.x+dx,b.y+48,1,false,alpha,b.t*2*1000*Math.PI/180);
 if(!dying&&b.healthShown)drawHealthBar(b.x-90,b.y-200,Math.max(0,b.hp/b.maxHp));
}
function renderWorld(){
 const w=world;
 if(assets.gamePaper)ctx.drawImage(assets.gamePaper,0,0,960,640,0,0,960,640);else paper();
 // Exact original scenery sequence, parallax, cropped tile offsets, and rear/front ground layers.
 const start=Math.floor((w.backgroundScroll-768)/1024),end=Math.ceil((w.backgroundScroll+1220)/1024);
 for(let i=start;i<=end;i++){if(i<0)continue;drawFrame(sceneryTile(i),i*1024-w.backgroundScroll+256,218,2);}
 let off=w.scroll%1024;for(let x=-off;x<960;x+=1024)original('SCN_Floor_01',x,400,1024,64);
 ctx.save();if(save.settings.shake&&w.shake>0)ctx.translate(Math.sin(anim*71)*w.shake,Math.cos(anim*91)*w.shake*.4);
 if(w.boss?.phase==='pass')renderBoss(w);
 // Draw all shadows first; animation trim never moves their world anchors.
 for(const e of w.entities){if(e.x>1160||e.type==='coin'||e.type==='health'||e.type==='shield')continue;const nearFloor=e.y-e.h/2>350;if(nearFloor)img('SCN_Shadow_01',e.x-45,473,90,14,.22);}
 const actorX=PLAYER_X+(w.dead?w.deathSlide:0),actorY=w.y-64;
 const shadowScale=Math.max(.3,1-(FLOOR-w.y)/400);img('SCN_Shadow_01',actorX-50*shadowScale,476,100*shadowScale,14,.32);
 for(const e of w.entities){if(e.x>1200)continue;const cy=e.y-e.h/2;
  if(e.type==='coin')drawFrame(frameName('CON_Coin_',frameOf('coin',e.age)),e.x,cy,.5);
  else if(e.type==='health'||e.type==='shield')drawFrame(e.type==='health'?'PWR_Health_01':'PWR_Invincible_01',e.x,cy+(e.sourcePowerup?0:Math.sin(e.age*4)*3),e.sourcePowerup?1:.55);
  else if(e.type==='enemy'){
   const fade=e.dying?Math.max(0,1-(e.deathTime-.3)/.2):1;
   drawFrame(enemyFrame(e),e.x,e.y-64,1,e.facingRight??e.moveSpeed<0,fade);

  }else{
   let n=e.sprite;
   if(e.id===4)n=frameName('HAZ_Saw_',frameOf('saw',e.age));
   if(e.id===3)n=frameName('HAZ_Mine_',frameOf('mine',e.age));
   if(e.id===7)n=frameName('HAZ_Ray_',frameOf('ray',e.age));
   drawFrame(n,e.x,cy,1,e.moveSpeed<0);
  }
  const bar=healthBar(e);if(bar)drawHealthBar(bar.x,bar.y,bar.fraction);
 }
 if((w.boss||w.bossDeath)?.phase!=='pass')renderBoss(w);
 for(const bullet of w.bullets){const b=bullet;
  if(b.id===3||b.id===6){img('BUL_HeliBullet_01',b.x-17,b.y-6,34,12);ctx.fillStyle='#ee9e26';ctx.fillRect(b.x-24,b.y-3,10,6);}
  else if(b.id===4)drawFrame('BUL_GrenadeArrow_01',b.x,b.y,.7,false,1,Math.atan2(b.vy,b.vx));
  else if(b.id===7){ctx.strokeStyle='#36b8e6';ctx.lineWidth=7;ctx.beginPath();ctx.arc(b.x-18,b.y,37,-1.15,1.15);ctx.stroke();}
  else if(b.id===8){ctx.fillStyle='#55bde8';ctx.fillRect(b.x-26,b.y-5,52,10);ctx.fillStyle='#d0f2ff';ctx.fillRect(b.x-24,b.y-2,48,4);}
  else if(b.id===9)drawFrame(frameName('CHR_Run_',frameOf('run',w.t)),b.x,b.y,1,false,.45);
  else{ctx.strokeStyle='#1a4b7d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-16,b.y);ctx.lineTo(b.x+6,b.y);ctx.stroke();}
 }
 for(const b of w.enemyBullets)drawFrame(b.sprite||'BUL_HeliBullet_01',b.x,b.y,1,false,1,enemyBulletRotation(b));
 const n=playerFrame(w),blink=w.invincible>0&&w.invincible<1.5&&Math.floor(w.t*10)%2;
 if(!blink){if(n==='CHR_DeadFloor_01')drawFrame(n,actorX+20,FLOOR-22,1);else drawFrame(n,actorX,actorY,1);}
 if(w.invincible>1.5)drawFrame(frameName('PROP_Shield_',frameOf('shield',w.t)),actorX+30,actorY-4,w.gliding?.8:1,false,.85);
 if(w.poseTimer>0&&w.cooldown>w.weapon.rate-.065){const mx=PLAYER_X+[35,35,35,40,20,35,40,35,35,35][w.weapon.id],my=w.y-64+[-29,-10,-15,-30,-34,-29,-30,-10,-10,-10][w.weapon.id];
  if(assets.ParExpStar_01){ctx.save();ctx.translate(mx+10,my);ctx.rotate(w.t*17);ctx.drawImage(assets.ParExpStar_01,-15,-15,30,30);ctx.restore();}
  else{ctx.strokeStyle='#fdb72e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mx,my-12);ctx.lineTo(mx+14,my+1);ctx.lineTo(mx+28,my-6);ctx.stroke();}
 }
 for(const p of w.particles)drawParticle(ctx,p,assets);
 ctx.restore();
 // Foreground ink is in front of feet, matching the APK's layer order.
 off=w.foregroundScroll%1024;for(let x=-off;x<960;x+=1024)original('SCN_FrontFloor_01',x,482,1024,55);
 if(w.flash>0){ctx.fillStyle=`rgba(187,46,35,${w.flash*1.4})`;ctx.fillRect(0,0,960,640);}
 coinNumber(fmt(w.coins),100,52,88,34,25,'#fff');ctx.save();ctx.beginPath();ctx.rect(350,536,264*w.hp/100,29);ctx.clip();img('HUD_HealthBar_01',350,536,264,29);ctx.restore();
 text(`${fmt(w.distance)}m`,480,600,25,'#fff','center');
 if(tutorial){const t=w.t,tip=t<5?`Tap JUMP or ${keyLabel(save.settings.controls.jump)} to leap over obstacles.`:t<11?'Press again to DOUBLE JUMP and ROLL.':t<17?'Third press + HOLD to GLIDE.':t<24?`Hold FIRE or ${keyLabel(save.settings.controls.fire)}. You can shoot while airborne!`:'Collect coins. Avoid or destroy the red obstacles.';ctx.fillStyle='#fffdeacc';ctx.fillRect(150,125,660,42);text(tip,480,153,21,'#24537a','center');}
 notebook();
}

function button(label,fn,cls='ink'){const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=()=>{sfx('click');fn();};return b;}
function screen(title,{close=menu,balance=false}={}){ui.innerHTML='';const s=document.createElement('section');s.className='screen';const h=document.createElement('header');const t=document.createElement('h1');t.textContent=title;h.append(t);if(balance){const bal=document.createElement('span');bal.className='balance';bal.textContent=`◉ ${fmt(save.coins)}`;h.append(bal);}const b=button('',close,'screen-back-arrow');b.setAttribute('aria-label','Back');b.innerHTML='<img src="shop-art/IMM_BackButton_01.png" alt="">';h.append(b);s.append(h);const c=document.createElement('div');c.className='content';s.append(c);ui.append(s);return {s,c,h};}
function menu(){if(world&&!ended)finishRun(true);state='menu';world=null;resetInput();ui.innerHTML='';setMusic('M_0001_Menu.mp3');const spots=[['Play',playSelect,36,51,27,12.5],['Shop',()=>shop('menu'),37,67.7,25.5,10.5],['Scores',scores,68,70.5,24,8.5],['Tutorial',()=>startRun(true),37,82.6,25.5,8.5],['Options',settings,68,82.6,24,8.5],['Controls',()=>controlsScreen(menu),10,79,23,9.5]];for(const [label,fn,left,top,width,height]of spots){const b=button(label,fn,'hit');b.setAttribute('aria-label',label);b.style.cssText=`left:${left}%;top:${top}%;width:${width}%;height:${height}%`;if(label==='Controls'){b.className='hit menu-art-button';b.textContent='';b.append(letterImage('Controls'));}ui.append(b);}if(!storageOK)toast('Browser storage is unavailable. Progress will last for this session.');}
function playSelect(initial=save.selected){
 state='select';resetInput();selectionIndex=Math.max(0,SELECTION_ORDER.indexOf(initial));selectionMotion=new CarouselMotion(selectionIndex);ui.innerHTML='';
 const panel=document.createElement('section');panel.className='weapon-selection';panel.setAttribute('aria-label','Choose your weapon');panel.tabIndex=0;ui.append(panel);
 const make=(label,fn,cls)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.setAttribute('aria-label',label);b.onclick=fn;panel.append(b);return b;};
 const status=document.createElement('span');status.className='selection-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);panel.focus();
 const update=()=>{const id=SELECTION_ORDER[selectionIndex],w=WEAPONS[id],owned=save.unlocked.includes(id);status.textContent=w.name+(owned?' — Select to start':' — '+fmt(w.cost)+' coins to unlock');action.setAttribute('aria-label',(owned?'Select ':'Unlock ')+w.name);prev.disabled=selectionIndex===0;next.disabled=selectionIndex===9;};
 const browse=delta=>{selectionIndex=Math.max(0,Math.min(9,selectionIndex+delta));selectionMotion.go(selectionIndex);update();};
 const prev=make('Previous weapon',()=>browse(-1),'selection-prev');prev.innerHTML='<span aria-hidden="true">‹</span>';
 const next=make('Next weapon',()=>browse(1),'selection-next');next.innerHTML='<span aria-hidden="true">›</span>';
 const action=make('Select Pistol',()=>{if(!selectionMotion.settled)return;const id=SELECTION_ORDER[selectionIndex],owned=save.unlocked.includes(id);if(owned){save.selected=id;persist();sfx('shoot',id);startRun();}else{sfx('click');if(buyWeapon(save,id)){persist();update();}else toast(`You need ${fmt(WEAPONS[id].cost-save.coins)} more coins.`);}},'selection-action');
 make('Back',()=>{sfx('click');menu();},'selection-back');make('Shop',()=>{sfx('click');shop('select');},'selection-shop');
 panel.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)){e.preventDefault();if(e.repeat)return;browse(['ArrowLeft','a','A'].includes(e.key)?-1:1);}});
 let drag=null;panel.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const width=panel.getBoundingClientRect().width;drag={x:e.clientX,y:e.clientY,position:selectionMotion.position,lastX:e.clientX,lastAt:e.timeStamp,velocity:0,width};selectionMotion.drag(selectionMotion.position);panel.setPointerCapture(e.pointerId);});
 panel.addEventListener('pointermove',e=>{if(!drag)return;const scale=960/drag.width,elapsed=Math.max(1,e.timeStamp-drag.lastAt);drag.velocity=-(e.clientX-drag.lastX)*scale/(elapsed*.06);drag.lastX=e.clientX;drag.lastAt=e.timeStamp;selectionMotion.drag(drag.position-(e.clientX-drag.x)*scale/450);});
 panel.addEventListener('pointerup',e=>{if(!drag)return;const velocity=e.timeStamp-drag.lastAt>100?0:drag.velocity;selectionIndex=selectionMotion.release(velocity);drag=null;update();});panel.addEventListener('pointercancel',()=>{if(drag){selectionIndex=selectionMotion.release();drag=null;update();}});

 update();panel.focus({preventScroll:true});
}
function renderWeaponSelection(){paper();notebook();drawPlayerSelection({index:selectionIndex,position:selectionMotion.position,weapons:WEAPONS,save,t:anim,draw:drawFrame,text,number:coinNumber});}

function attachHud(){
 ui.innerHTML='';
 const make=(label,n,cls)=>{const el=document.createElement('button');el.className=`hud-button ${cls}`;el.setAttribute('aria-label',label);el.innerHTML=`<img src="${ICON(n)}" alt="">`;ui.append(el);return el;};
 const j=make('Jump indicator','HUD_JumpButton_01','jump'),f=make('Fire indicator','HUD_FireButton_01','fire'),p=make('Pause','HUD_PauseBtn_01','pause');
 p.onclick=()=>{sfx('click');pause();};j.tabIndex=-1;f.tabIndex=-1;
 const surface=$('#frame'),indicators=()=>{j.classList.toggle('lit',pointerJump.size>0);f.classList.toggle('lit',pointerFire.size>0);};
 surface.onpointerdown=e=>{
  if(state!=='playing'||!world||e.target.closest('.pause,#mobileFullscreen'))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  const r=surface.getBoundingClientRect(),left=e.clientX<r.left+r.width/2;
  try{surface.setPointerCapture(e.pointerId);}catch{}
  if(left){pointerJump.add(e.pointerId);world.jump();world.jumpHeld=true;}
  else{pointerFire.add(e.pointerId);if(world.cooldown<=0)world.shoot();}
  syncInput();indicators();
 };
 const release=e=>{pointerJump.delete(e.pointerId);pointerFire.delete(e.pointerId);syncInput();indicators();};
 surface.onpointerup=release;surface.onpointercancel=release;surface.onlostpointercapture=release;
}

function resetInput(){pointerJump.clear();pointerFire.clear();keys.clear();if(world){world.fireHeld=false;world.releaseJump();}}
function syncInput(){if(!world)return;const c=save.settings.controls;world.fireHeld=pointerFire.size>0||keys.has(c.fire);world.jumpHeld=pointerJump.size>0||keys.has(c.jump);if(!world.jumpHeld)world.gliding=false;}
function activeMissions(){return save.missionIndex.map(id=>missions[id]).filter(Boolean);}
function missionEligible(m,type,sub){if(m.event!==type)return false;const t=m.text.toLowerCase();if(t.includes('without shooting')&&world.shots>0)return false;if(t.includes('without collecting')&&world.coins>0)return false;if(t.includes('magnet')&&!world.effects.magnet)return false;if(type==='Died'){const between=t.match(/between (\d+)m and (\d+)m/);if(between)return world.distance>=+between[1]&&world.distance<=+between[2];if(t.includes('bloody'))return !!world.effects.blood;}
 if(type==='FireWeapon'){const names={pistol:0,shotgun:1,smg:2,rpg:3,'explosive arrows':4};for(const [word,id]of Object.entries(names))if(t.includes(word)&&sub!==id)return false;}
 if(type==='DestroyedStaticHazard'||type==='SmashIntoStaticHazard'||type==='NearMissStaticHazard'){const names={crate:0,barrel:1,'spike board':2,'land mine':3,saw:4,'air mine':5,'junk pile':6,'death ray':7};for(const [word,id]of Object.entries(names))if(t.includes(word)&&sub!==id)return false;}
 if(type==='KilledMovingEnemy'){if(t.includes('jet')&&sub!==1)return false;if((t.includes('sword')||t.includes('knife'))&&sub!==0)return false;}return true;}
function event(type,amount=1,sub=0){if(type==='bossShoot')sfx('shoot',1);if(['shoot','jump','coin','hit','hazardDestroy','hazardCrash','hazardHit','enemyDestroy','explosion','health','shield','revive'].includes(type))sfx(type,sub);if(type==='bossStart'){setMusic('M_0003_Boss.wav');toast('BOSS INCOMING!');}if(type==='bossEnd'){setMusic('M_0002_InGame.wav');toast('Boss defeated! +100 coins');}if(type==='revive')toast('Extra life! Back in action.');if(type==='Died'){resetInput();setMusic('M_0004_GameOverLoop.wav');}
 if(!missions.length||!world)return;if(['GotCoin','GotHP','Ran1Meter','Glide1Meter','BossKill','FireWeapon','KilledMovingEnemy','DestroyedStaticHazard','PlayGame'].includes(type))save.totals[type]=(save.totals[type]||0)+amount;
 for(const m of activeMissions()){if(save.completed.includes(m.id)||pendingMission.includes(m.id)||!missionEligible(m,type,sub))continue;const key=String(m.id);let inc=amount;if(type==='Died')inc=m.target;save.missionProgress[key]=(save.missionProgress[key]||0)+inc;if(save.missionProgress[key]>=m.target){pendingMission.push(m.id);save.completed.push(m.id);save.coins+=m.reward;sfx('complete');toast(`Mission complete!\n${m.text}\n+${fmt(m.reward)} coins`);persist();}}
}
function advanceMissions(){for(let i=0;i<3;i++){while(save.completed.includes(save.missionIndex[i])&&save.missionIndex[i]<(i+1)*40)save.missionIndex[i]++;if(save.missionIndex[i]>=(i+1)*40)save.missionIndex[i]=-1;}}
function startRun(isTutorial=false){resetInput();tutorial=isTutorial;pendingMission=[];advanceMissions();for(const m of activeMissions())if(!m.cumulative)save.missionProgress[m.id]=0;let effects={};const map={double:{doubleCoins:true},magnet:{magnet:true},blood:{blood:true},armor:{armor:2},megaArmor:{armor:3},power:{power:2},megaPower:{power:3},glide:{glide:true},life:{life:true},head500:{headstart:500},head750:{headstart:750},head1000:{headstart:1000},head1250:{headstart:1250},head1500:{headstart:1500}};if(!isTutorial)for(const id of save.equipped){if((save.stock[id]||0)>0&&map[id]){Object.assign(effects,map[id]);save.stock[id]--;}}effects.longShield=!!save.permanent.longShield;effects.fullHealth=!!save.permanent.fullHealth;world=new World({weapon:save.selected,onEvent:event,effects,patterns:normalData.patterns,tutorial:isTutorial});state='playing';ended=false;if(!isTutorial){save.runs++;world.event('PlayGame');}persist();attachHud();muteForPause=false;setMusic('M_0002_InGame.wav');tipTime=0;}
function finishRun(abandon=false){if(!world||ended)return;ended=true;if(tutorial){if(!abandon)gameOver();return;}save.coins+=world.coins;save.best=Math.max(save.best,Math.floor(world.distance));save.scores.push({distance:Math.floor(world.distance),coins:world.coins,kills:world.kills,weapon:world.weapon.id,date:new Date().toISOString()});save.scores.sort((a,b)=>b.distance-a.distance);save.scores=save.scores.slice(0,10);persist();if(!abandon)gameOver();}
function gameOver(){state='over';resetInput();const {s,c}=screen('Game Over',{close:menu,balance:true});s.classList.add('center');c.style.flex='initial';c.innerHTML=`<p>${Math.floor(world.distance)>=save.best?'A new line in the record book.':'One more run. One more page.'}</p><div class="stats"><div><strong>${fmt(world.distance)}m</strong><span>DISTANCE</span></div><div><strong>${fmt(world.coins)}</strong><span>COINS</span></div><div><strong>${world.kills}</strong><span>ENEMIES</span></div></div><p>Personal best: <b>${fmt(save.best)}m</b></p>`;const a=document.createElement('div');a.className='actions';a.append(artButton('Menu',menu),artButton('Weapons',playSelect),artButton('Retry',()=>startRun()));s.append(a);const b=artButton('Share score',async()=>{const message=`I ran ${fmt(world.distance)}m in Sketchman!`;try{if(navigator.share)await navigator.share({title:'Sketchman',text:message,url:location.href});else{await navigator.clipboard.writeText(`${message} ${location.href}`);toast('Score and link copied.');}}catch{toast(message);}});c.append(b);}
function pause(){if(state!=='playing')return;state='paused';resetInput();muteForPause=true;updateMusic();const overlay=document.createElement('div');overlay.className='paused';ui.append(overlay);const panel=document.createElement('section');panel.className='screen center sketch-pause';panel.innerHTML='<h1>PAUSED</h1>';const a=document.createElement('div');a.className='actions';a.append(artButton('Resume',resume),artButton('Shop',()=>shop('paused')),artButton('Controls',()=>controlsScreen(()=>{state='playing';attachHud();pause();})),artButton('Restart',()=>{finishRun(true);startRun();}),artButton('Menu',()=>{finishRun(true);menu();}));panel.append(a);overlay.append(panel);}
function resume(){if(!world||world.dead)return;state='playing';resetInput();attachHud();muteForPause=false;updateMusic();last=performance.now();}
const ITEMS=[
 {id:'double',name:'Double Coins',category:'Profit',cost:500,qty:10,icon:'STR_ICO_CoinsX2_01',desc:'Each collected coin is worth double.'},
 {id:'magnet',name:'Coin Magnet',category:'Profit',cost:250,qty:10,icon:'STR_ICO_Magnet_01',desc:'Nearby coins come flying to you.'},
 {id:'blood',name:'Blood',category:'Profit',cost:1000,qty:10,icon:'STR_ICO_Blood_01',desc:'Add red ink to your takedowns.'},
 {id:'armor',name:'Armor ×2',category:'Powerups',cost:2000,qty:10,icon:'STR_ICO_ArmorX2_01',desc:'Take half the usual damage.'},
 {id:'megaArmor',name:'Armor ×3',category:'Powerups',cost:3000,qty:10,icon:'STR_ICO_ArmorX3_01',desc:'Triple defense against red hazards.'},
 {id:'power',name:'Power Shot ×2',category:'Powerups',cost:2000,qty:10,icon:'STR_ICO_Damage_01',desc:'Every shot deals twice the damage.'},
 {id:'megaPower',name:'Mega Shot ×3',category:'Powerups',cost:3000,qty:10,icon:'STR_ICO_DamageX3_01',desc:'Triple the damage of every shot.'},
 {id:'glide',name:'Power Glide',category:'Powerups',cost:2000,qty:10,icon:'STR_ICO_Glide_01',desc:'Glide further with a slower descent.'},
 {id:'life',name:'Extra Life',category:'Powerups',cost:5000,qty:5,icon:'STR_ICO_ExtraLife_01',desc:'Restore health once when you would die.'},
 ...[500,750,1000,1250,1500].map((n,i)=>({id:`head${n}`,name:`Head Start ${n}m`,category:'Record Breakers',cost:[1000,1500,2000,3500,5000][i],qty:5,icon:i?`STR_ICO_HeadStartLv${i+1}_01`:'STR_ICO_HeadStart_01',desc:`Begin your next run at ${n}m.`})),
 {id:'longShield',name:'Longer Invincibility',category:'Extra Power',cost:15000,qty:1,permanent:true,icon:'STR_ICO_InvincibleLonger_01',desc:'Permanent: invincibility pickups last 15 seconds.'},
 {id:'fullHealth',name:'Full Health Restore',category:'Extra Power',cost:10000,qty:1,permanent:true,icon:'STR_ICO_FullHealth_01',desc:'Permanent: every health pack restores all HP.'}
];
function shop(from=returnState){
 returnState=from;state='shop';resetInput();
 const back=()=>{if(from==='paused'){state='playing';attachHud();pause();}else if(from==='select')playSelect(SELECTION_ORDER[selectionIndex]);else menu();};
 renderMobileShop({root:ui,save,weapons:WEAPONS,items:ITEMS,onBack:back,onSound:()=>sfx('click'),
  onWeapon:id=>{if(!buyWeapon(save,id)){toast(`You need ${fmt(WEAPONS[id].cost-save.coins)} more coins.`);return false;}persist();return true;},
  onBuy:item=>{if(save.coins<item.cost){toast(`You need ${fmt(item.cost-save.coins)} more coins.`);return false;}save.coins-=item.cost;if(item.permanent)save.permanent[item.id]=true;else{save.stock[item.id]=(save.stock[item.id]||0)+item.qty;if(!save.equipped.includes(item.id))equip(item.id);}persist();return true;},
  onEquip:item=>{if(!save.stock[item.id]){toast('Buy a pack to use this powerup.');return false;}if(save.equipped.includes(item.id))save.equipped=save.equipped.filter(x=>x!==item.id);else equip(item.id);persist();return true;}
 });
}
function equip(id){const group=id.startsWith('head')?'head':id.toLowerCase().includes('armor')?'armor':id.toLowerCase().includes('power')?'power':null;if(group)save.equipped=save.equipped.filter(x=>!(group==='head'?x.startsWith('head'):group==='armor'?x.toLowerCase().includes('armor'):x.toLowerCase().includes('power')));save.equipped.push(id);}
function missionScreen(){state='missions';const {s,c}=screen('Your missions',{close:playSelect,balance:true});advanceMissions();for(const m of activeMissions()){const p=Math.min(m.target,save.missionProgress[m.id]||0);const row=document.createElement('div');row.className='mission';row.innerHTML=`<img src="${ICON(m.group===0?'CON_Coin_01':m.group===1?'CHR_Run_01':'STR_ICO_WeaponA_01')}" alt=""><div><b>${m.text}</b><small>${p} / ${m.target}${m.cumulative?' · Across runs':' · In one run'}</small><progress value="${p}" max="${m.target}"></progress></div><span class="reward">+${fmt(m.reward)} ◉</span>`;c.append(row);}const note=document.createElement('p');note.className='note';note.textContent=`${save.completed.length} / 120 missions completed. Three active missions — collecting, distance, and combat. Complete each to reveal the next.`;c.append(note);const a=document.createElement('div');a.className='actions';a.append(button('Let’s run →',()=>startRun(),'ink primary'));s.append(a);}
function scores(){state='scores';const {c}=screen('Personal bests');if(!save.scores.length){c.innerHTML='<div class="empty">Your notebook is still blank.<br><br>Go for a run and set your first record.</div>';c.append(button('Play →',playSelect,'ink primary'));return;}c.innerHTML=`<div class="stats"><div><strong>${fmt(save.best)}m</strong><span>BEST DISTANCE</span></div><div><strong>${save.runs}</strong><span>RUNS</span></div><div><strong>${save.completed.length}</strong><span>MISSIONS</span></div></div><table class="scores"><thead><tr><th>#</th><th>Distance</th><th>Coins</th><th>Weapon</th><th>Date</th></tr></thead><tbody>${save.scores.map((s,i)=>`<tr><td>${i+1}</td><td><b>${fmt(s.distance)}m</b></td><td>${fmt(s.coins)}</td><td>${WEAPONS[s.weapon]?.name||'Pistol'}</td><td>${new Date(s.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</td></tr>`).join('')}</tbody></table><p class="note">Scores and purchases are saved in this browser, on this device.</p>`;}
function letterImage(label){const im=document.createElement('img');im.src=menuLettering(label);im.alt='';im.setAttribute('aria-hidden','true');return im;}
function artButton(label,fn,cls=''){const b=button('',fn,'menu-art-button '+cls);b.setAttribute('aria-label',label);b.append(letterImage(label));return b;}
function updateControlHint(){const c=save.settings.controls;$('#hint').textContent=`${keyLabel(c.jump)} jump · ${keyLabel(c.fire)} fire · ${keyLabel(c.pause)} / Esc pause`;canvas.setAttribute('aria-label',`Sketchman game, use ${keyLabel(c.jump)} to jump and ${keyLabel(c.fire)} to fire`);}
function controlsScreen(back=controlsReturn){
 controlsReturn=back;state='controls';captureControl=null;resetInput();ui.innerHTML='';const panel=document.createElement('section');panel.className='controls-screen';panel.setAttribute('aria-label','Controls');ui.append(panel);
 const heading=document.createElement('h1');heading.append(letterImage('Controls'));panel.append(heading);
 const instructions=document.createElement('p');instructions.className='controls-help';instructions.append(letterImage('Choose a key to change it'));panel.append(instructions);
 const rows=document.createElement('div');rows.className='control-rows';panel.append(rows);
 for(const [action,title]of [['jump','Jump'],['fire','Fire'],['pause','Pause']]){const row=document.createElement('div');row.className='control-row';const name=document.createElement('span');name.className='control-action';name.append(letterImage(title));row.append(name);const key=artButton(keyLabel(save.settings.controls[action]),()=>{captureControl=action;for(const b of rows.querySelectorAll('button'))b.classList.remove('binding-listening');key.classList.add('binding-listening');key.replaceChildren(letterImage('Press a key'));message.textContent=`Press a key for ${title}. Escape cancels.`;},'control-key');key.setAttribute('aria-label',`Change ${title} key: ${keyLabel(save.settings.controls[action])}`);row.append(key);rows.append(row);}
 const message=document.createElement('p');message.className='control-message';message.setAttribute('role','status');message.textContent='Escape always pauses. Touch controls stay the same.';panel.append(message);
 const footer=document.createElement('div');footer.className='controls-actions';footer.append(artButton('Back',()=>{captureControl=null;back();}),artButton('Reset',()=>{save.settings.controls={...DEFAULT_CONTROLS};persist();updateControlHint();controlsScreen(back);}));panel.append(footer);
}
function settings(){
 state='settings';resetInput();optionsHover=null;ui.innerHTML='';
 const pane=document.createElement('section');pane.className='original-options';pane.setAttribute('aria-label','Options');ui.append(pane);
 // Original game's red curved back arrow, in the upper-right corner.
 const back=button('',menu,'original-options-back');back.setAttribute('aria-label','Back to main menu');back.innerHTML='<img src="shop-art/IMM_BackButton_01.png" alt="">';pane.append(back);
 // Transparent hitboxes follow the two large icons in the recovered APK panel.
 for(const [id,label,cls]of [['music','Music','options-music'],['sound','Sound','options-sound']]){
  const b=button('',()=>{const was=save.settings[id];save.settings[id]=!was;persist();updateMusic();b.setAttribute('aria-pressed',String(save.settings[id]));b.setAttribute('aria-label',label+' '+(save.settings[id]?'on':'off'));if(id==='sound'&&!was)sfx('click');},'original-option-hit '+cls);
  b.setAttribute('aria-label',label+' '+(save.settings[id]?'on':'off'));b.setAttribute('aria-pressed',String(save.settings[id]));b.title=label;
  b.onpointerenter=()=>{optionsHover=id;};b.onpointerleave=()=>{optionsHover=null;};
  pane.append(b);
 }
 // Browser-specific extras live below the original panel instead of replacing it.
 const extra=document.createElement('div');extra.className='original-options-extra';
 const title=document.createElement('div');title.className='original-options-extra-title';title.append(letterImage('More Settings'));extra.append(title);
 const controls=document.createElement('div');controls.className='original-options-extras-controls';
 const shake=document.createElement('label');const shakeInput=document.createElement('input');shakeInput.type='checkbox';shakeInput.checked=save.settings.shake;shakeInput.onchange=()=>{save.settings.shake=shakeInput.checked;persist();sfx('click');};shake.append(shakeInput,document.createTextNode('Screen shake'));controls.append(shake);
 const volume=document.createElement('label');const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=1;slider.step=.05;slider.value=save.settings.volume;slider.oninput=()=>{save.settings.volume=+slider.value;persist();updateMusic();};volume.append(document.createTextNode('Volume'),slider);controls.append(volume);extra.append(controls);
 const actions=document.createElement('div');actions.className='original-options-extras-actions';
 actions.append(artButton('Controls',()=>controlsScreen(settings)),artButton('About',about),artButton('Export save',exportSave),artButton('Import save',importSave));
 extra.append(actions);pane.append(extra);
}
function exportSave(){const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sketchman-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importSave(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const raw=JSON.parse(await input.files[0].text());if(raw.version!==1||!Array.isArray(raw.unlocked))throw Error();save=normalizeSave(raw);persist();updateControlHint();settings();toast('Progress imported.');}catch{toast('That is not a valid Sketchman save file.');}};input.click();}
function about(){state='about';const {c}=screen('A notebook full of trouble',{close:settings});c.innerHTML=`<div class="how"><div><img src="${ICON('CHR_Jump_05')}" alt=""><b>Jump & double jump</b><br>Tap JUMP or press ${keyLabel(save.settings.controls.jump)}. Press again while airborne.</div><div><img src="${ICON('CHR_Glide_01')}" alt=""><b>Glide</b><br>After two jumps, press a third time and hold to slow your fall.</div><div><img src="${ICON('CHR_RunNGun_01')}" alt=""><b>Fire</b><br>Hold FIRE or ${keyLabel(save.settings.controls.fire)}. Shoot red obstacles, enemies, and their bullets.</div><div><img src="${ICON('CON_Coin_01')}" alt=""><b>Upgrade</b><br>Collect coins. Complete missions. Unlock ten weapons and stock up on powerups.</div></div><p class="note">Super Sketchman: hold Jump to fly up, release to descend. P or Esc pauses. Touch controls support jumping and shooting together.</p><p class="note">Browser recreation of Sketchman 1.0.5, based on the supplied Android APK. Original artwork, animation and audio belong to their original creators, Miniclip / BlitPop. Gameplay is reimplemented for modern browsers; normal obstacle patterns and animation timings are recovered from the APK; remaining behavior is reimplemented. Purchases use earned game coins.</p>`;c.append(button('Try the tutorial →',()=>startRun(true),'ink primary'));}
window.addEventListener('keydown',e=>{const k=e.code;
 if(state==='controls'&&captureControl){e.preventDefault();if(e.repeat)return;if(k==='Escape'){captureControl=null;controlsScreen(controlsReturn);return;}const next=bindControl(save.settings.controls,captureControl,k);if(next){save.settings.controls=next;captureControl=null;persist();updateControlHint();sfx('click');controlsScreen(controlsReturn);}return;}
 if(e.repeat){if(state==='playing'&&Object.values(save.settings.controls).includes(k))e.preventDefault();return;}if(k==='Escape'||k===save.settings.controls.pause){if(state==='playing'){e.preventDefault();pause();}else if(state==='paused'){e.preventDefault();resume();}return;}
 if(state==='select'&&(k==='KeyA'||k==='KeyD')){e.preventDefault();if(!e.target.closest?.('.weapon-selection'))document.querySelector('.weapon-selection')?.dispatchEvent(new KeyboardEvent('keydown',{key:k==='KeyA'?'a':'d',bubbles:false}));return;}if(state!=='playing')return;const c=save.settings.controls;if(k!==c.jump&&k!==c.fire)return;e.preventDefault();keys.add(k);if(k===c.jump)world.jump();if(k===c.fire&&world.cooldown<=0)world.shoot();syncInput();});window.addEventListener('keyup',e=>{keys.delete(e.code);syncInput();});window.addEventListener('blur',()=>{if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});window.addEventListener('contextmenu',e=>{if(e.target.closest('#frame'))e.preventDefault();});if(matchMedia('(pointer: coarse)').matches)$('#hint').textContent='Touch controls · landscape recommended';const toggleFullscreen=async()=>{sfx('click');try{if(!document.fullscreenElement){await $('#app').requestFullscreen();if(window.screen.orientation?.lock)await window.screen.orientation.lock('landscape').catch(()=>{});}else await document.exitFullscreen();}catch{toast('Fullscreen unavailable in this browser. Try Add to Home Screen.');}};$('#fullscreen').onclick=toggleFullscreen;$('#mobileFullscreen').onclick=toggleFullscreen;
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;anim+=dt;if(state==='playing'&&world){world.update(dt);tipTime+=dt;if(world.dead&&world.deathTime>1.25)finishRun();}if(world&&['playing','paused','over','shop'].includes(state))renderWorld();else if(state==='menu')renderMenu();else if(state==='settings')renderOriginalOptions();else if(state==='select'){selectionMotion.advance(dt);renderWeaponSelection();}else{paper();notebook();}requestAnimationFrame(frame);}
async function boot(){try{const intro=playLoadingIntro($('#loading'));intro.catch(()=>{});[sprites,missions,normalData]=await Promise.all([fetch('assets/sprites.json').then(r=>r.json()),fetch('assets/missions.json').then(r=>r.json()),fetch('assets/normal-patterns.json').then(r=>r.json())]);const sheets=new Map();for(const [n,s]of Object.entries(sprites)){const key=s.atlas+'_'+s.v[0];if(!sheets.has(key))sheets.set(key,{atlas:s.atlas,index:s.v[0],names:[]});sheets.get(key).names.push(n);}let loaded=0;await Promise.all([...sheets.values()].map(sheet=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{for(const n of sheet.names){const v=sprites[n].v,c=document.createElement('canvas');c.width=v[7];c.height=v[8];c.getContext('2d').drawImage(im,v[1],v[2],v[7],v[8],0,0,v[7],v[8]);assets[n]=c;}loaded++;$('#progress').value=loaded/sheets.size*100;resolve();};im.onerror=()=>reject(new Error('Missing atlas: '+sheet.atlas));im.src=`assets/Graphics/${sheet.atlas}/${sheet.atlas}_${sheet.index+1}.png`;})));await Promise.all([...new Set([...EFFECT_TEXTURES,'ParExpStar_01','ParCoin01','gamePaper'])].map(n=>new Promise(resolve=>{const im=new Image();im.onload=()=>{assets[n]=im;resolve();};im.onerror=resolve;im.src=n==='gamePaper'?'assets/Graphics/LOC_Locations/SCN_Background.jpg':`assets/Graphics/Particles/${n}.png`;})));// Warm the browser's image cache while the loading screen is still visible.
 // These are the images used by the shop category screen, product rows and HUD.
 const shopArtNames=new Set(['STR_Splitter_01','STR_BuyBtn_01','STR_Buy_01','STR_Purchased_01','STR_HUD_01',
  'STR_ICO_Coins2500_01','STR_ICO_Coins5000_01','STR_ICO_Coins15000_01','STR_ICO_Coins90000_01']);
 for(const item of ITEMS)if(item.icon)shopArtNames.add(item.icon);
 for(const weapon of WEAPONS)if(weapon.icon)shopArtNames.add(weapon.icon);
 const shopUrls=['assets/Graphics/Store/STR_Categories_Back_01.jpg',...Array.from(shopArtNames,n=>`shop-art/${n}.png`)];
 await Promise.all(shopUrls.map(url=>new Promise(resolve=>{
  const im=new Image();im.onload=()=>resolve();im.onerror=()=>resolve();im.src=url;
  if(im.complete)resolve();
 })));
 const menuFont=new Image();await new Promise((resolve,reject)=>{menuFont.onload=resolve;menuFont.onerror=reject;menuFont.src='assets/Graphics/Fonts/S1_Dialogs22_1.png';});setMenuFont(menuFont);updateControlHint();await intro;$('#loading').remove();menu();last=performance.now();requestAnimationFrame(frame);}catch(e){$('#loadStatus').textContent='Could not load the game. Reload to try again.';console.error(e);}}
// Read-only diagnostic surface for verifying the running game.
window.sketchman={get state(){return state;},get world(){return world;},get save(){return JSON.parse(JSON.stringify(save));}};
boot();
