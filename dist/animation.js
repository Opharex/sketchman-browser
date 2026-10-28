// The original animator divides each clip duration by its frame count as integers.
export const CLIPS={run:{frames:17,ms:29,loop:true},jump:{frames:14,ms:60,loop:false},roll:{frames:7,ms:35,loop:true},glide:{frames:2,ms:64,loop:true},death:{frames:9,ms:33,loop:false},knifeIdle:{frames:8,ms:50,loop:true},knifeAttack:{frames:8,ms:50,loop:true},knifeDeath:{frames:5,ms:60,loop:false},jetIdle:{frames:9,ms:44,loop:true},jetShot:{frames:8,ms:50,loop:false},bossIdle:{frames:9,ms:66,loop:true},bossDeath:{frames:8,ms:50,loop:false},shield:{frames:3,ms:85,loop:true},coin:{frames:6,ms:83,loop:true,pause:500},saw:{frames:2,ms:48,loop:true},mine:{frames:2,ms:128,loop:true},ray:{frames:2,ms:64,loop:true}};
export function frameOf(clip,seconds){const c=typeof clip==='string'?CLIPS[clip]:clip,ms=Math.max(0,seconds)*1000+1e-7;const at=c.loop?ms%(c.frames*c.ms+(c.pause||0)):ms;return Math.min(c.frames,Math.floor(at/c.ms)+1);}
export const frameName=(prefix,frame)=>`${prefix}${String(frame).padStart(2,'0')}`;
export function playerFrame(w){
 if(w.dead){if(w.y>=w.floor&&w.deathTime>=.512)return 'CHR_DeadFloor_01';if(w.y>=w.floor&&w.deathTime>=.448)return 'CHR_Death_07';if(w.y>=w.floor&&w.deathTime>=.384)return 'CHR_Death_08';return frameName('CHR_Death_',frameOf('death',w.deathTime));}
 if(w.weapon.id===8)return frameName('CHR_SuperSketchman_',frameOf('glide',w.t));
 const armed=w.poseTimer>0&&w.weapon.skin!=='Clone';
 if(!w.grounded){if(armed)return `CHR_JumpN${w.weapon.skin}_01`;if(w.gliding)return frameName('CHR_Glide_',frameOf('glide',w.actionTime));if(w.jumps>=2||w.rollAfterShot)return frameName('CHR_Roll_',frameOf('roll',w.actionTime));return frameName('CHR_Jump_',frameOf('jump',w.actionTime));}
 return frameName(armed?`CHR_RunN${w.weapon.skin}_`:'CHR_Run_',frameOf('run',w.t));
}
// Restore original frame dimensions before applying its trim. Cropped extents must
// never be used as the origin; they change during every run/roll/attack cycle.
export function framePlacement(meta,x,y,scale=1){const v=meta.v;return {x:x+(v[11]-v[5]/2)*scale,y:y+(v[12]-v[6]/2)*scale,w:v[7]*scale,h:v[8]*scale};}
export function enemyFrame(e){if(e.id===0){if(e.dying)return frameName('ENM_EnemyKnife_Death_',frameOf('knifeDeath',e.deathTime));if(e.attacking)return frameName('ENM_EnemyKnife_Attack_',frameOf('knifeAttack',e.age-e.attackStart));return frameName('ENM_EnemyKnife_Idle_',frameOf('knifeIdle',e.age));}if(e.shotTime>0)return frameName('ENM_EnemyJet_Shot_',frameOf('jetShot',.4-e.shotTime));return frameName('ENM_EnemyJet_Idle_',frameOf('jetIdle',e.age));}
