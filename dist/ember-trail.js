// Obsidian Ember's FIRE TRAIL. A cosmetic, camera-independent effect.
// All flame particles are pooled (max 72), with a small constant draw budget.
// World-space positions guarantee that the wake stays BEHIND the running player
// instead of moving alongside their screen-locked position. No game state,
// enemy colliders, damage, movement or original sprite frames are changed.
export const EMBER_TRAIL_VERSION='obsidian-ember-refine-01';
export const MAX_EMBER_PARTICLES=72;
const SPACING=16;
const EPS=.00001;
const random01=(n,seed=0)=>{
 const v=Math.sin(n*127.1+seed*311.7)*43758.5453;
 return v-Math.floor(v);
};
export class EmberTrail{
 constructor(){
  this.pool=Array.from({length:MAX_EMBER_PARTICLES},()=>({
   alive:false,life:0,maxLife:0,worldX:0,y:0,vx:0,vy:0,size:0,
   phase:0,kind:0
  }));
  this.cursor=0;
  this.counter=0;
  this.world=null;
  this.lastScroll=null;
  this.traveled=0;
  this.lastY=null;
 }
 reset(world=null){
  this.world=world;this.lastScroll=world?.scroll??null;
  this.lastY=world?.y??null;this.traveled=0;
  for(const p of this.pool)p.alive=false;
 }
 spawn(scroll,y,playerX){
  const i=this.counter++,p=this.pool[this.cursor++%this.pool.length];
  const rand=k=>random01(i,k);
  // Screen-facing character travels right while the world scrolls left.
  // Store absolute scroll coordinates so the flame remains at its birthplace.
  p.worldX=scroll+playerX-33-rand(1)*18;
  p.y=y-9+(rand(2)-.5)*17;
  p.kind=rand(4)>.72?1:0; // flame body or small drifting spark
  p.life=p.maxLife=p.kind?.32+rand(5)*.45:.38+rand(6)*.30;
  p.vx=-25-rand(7)*30;
  p.vy=-(p.kind?29:16)-rand(8)*26;
  p.size=(p.kind?1.1:4.1)+(rand(9)*(p.kind?1.8:5.1));
  p.phase=rand(10)*6.283185307;
  p.alive=true;
 }
 step(world,active,dt,playerX){
  if(!active||!world){
   if(this.world||this.lastScroll!==null)this.reset();
   return;
  }
  if(world!==this.world){this.reset(world);return;}
  const dtSafe=Math.max(0,Math.min(dt,.07));
  for(const p of this.pool)if(p.alive){
   p.life-=dtSafe;
   if(p.life<=0){p.alive=false;continue;}
  }
  if(this.lastScroll===null){this.lastScroll=world.scroll;this.lastY=world.y;return;}
  const dx=world.scroll-this.lastScroll;
  const last=this.lastScroll;
  const y0=this.lastY??world.y;
  this.lastScroll=world.scroll;this.lastY=world.y;
  // No fire spawning after death or when stationary; old flames still decay.
  if(world.dead||dx<=EPS){this.traveled=0;return;}
  // Cap to prevent a sudden jump/resume from producing a huge smoke wall.
  if(dx>80){this.traveled=0;this.spawn(world.scroll,world.y,playerX);return;}
  let position=SPACING-this.traveled,emitted=0;
  while(position<=dx&&emitted<7){
   const t=Math.min(1,position/dx);
   this.spawn(last+position,y0+(world.y-y0)*t,playerX);
   position+=SPACING;emitted++;
  }
  this.traveled=(this.traveled+dx)%SPACING;
 }
 draw(ctx,world){
  if(this.world!==world)return;
  let count=0;
  ctx.save();
  // Warm light without expensive canvas filters or per-frame textures.
  ctx.globalCompositeOperation='lighter';
  for(const p of this.pool){
   if(!p.alive)continue;
   let sx=p.worldX-world.scroll,life=p.life/p.maxLife;
   if(sx<-100||sx>1100)continue;
   const age=p.maxLife-p.life;
   const sy=p.y+p.vy*age;
   const sway=Math.sin(age*9+p.phase)*age*8+p.vx*age;
   sx+=sway;
   const fade=Math.max(0,Math.min(1,life));
   if(p.kind){
    // Tiny short-lived hot embers float away from the fire.
    ctx.globalAlpha=fade*.86;
    ctx.fillStyle='#ff7b17';ctx.beginPath();
    ctx.arc(sx,sy,p.size+1,0,6.283185307);ctx.fill();
    ctx.globalAlpha=fade;
    ctx.fillStyle='#fff3a1';ctx.beginPath();
    ctx.arc(sx,sy,p.size*.55,0,6.283185307);ctx.fill();
   }else{
    const size=p.size*(.50+fade*.65);
    const tall=size*(2.35+Math.sin(p.phase+age*13)*.28);
    // Layered teardrop flame, curling away from the player.
    ctx.globalAlpha=fade*.40;
    ctx.fillStyle='#d82506';ctx.beginPath();
    ctx.moveTo(sx-size*1.13,sy+size*.38);
    ctx.quadraticCurveTo(sx-size*1.45,sy-tall*.32,sx-size*.14,sy-tall);
    ctx.quadraticCurveTo(sx+size*.72,sy-tall*.28,sx+size*1.08,sy+size*.45);
    ctx.closePath();ctx.fill();
    ctx.globalAlpha=fade*.75;ctx.fillStyle='#ff7905';
    ctx.beginPath();ctx.moveTo(sx-size*.69,sy+size*.25);
    ctx.quadraticCurveTo(sx-size*.65,sy-tall*.22,sx+size*.03,sy-tall*.75);
    ctx.quadraticCurveTo(sx+size*.54,sy-tall*.10,sx+size*.59,sy+size*.27);
    ctx.closePath();ctx.fill();
    ctx.globalAlpha=fade*.93;ctx.fillStyle='#ffdf38';
    ctx.beginPath();ctx.moveTo(sx-size*.30,sy+size*.15);
    ctx.quadraticCurveTo(sx-size*.16,sy-tall*.17,sx+size*.10,sy-tall*.42);
    ctx.quadraticCurveTo(sx+size*.40,sy-tall*.07,sx+size*.22,sy+size*.18);
    ctx.closePath();ctx.fill();
   }
   count++;
   if(count>=MAX_EMBER_PARTICLES)break;
  }
  ctx.restore();
 }
 count(){return this.pool.reduce((n,p)=>n+(p.alive?1:0),0);}
}
// Decorative Skins-menu preview only. Uses the same flame geometry family
// without seeding persistent particles or modifying the selected skin.
export function drawEmberPreview(ctx,x,y,t){
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<5;i++){
  const phase=t*2.6+i*1.6;
  const fade=.3+.55*(Math.sin(phase)*.5+.5);
  const px=x-32-i*6,py=y+19+Math.sin(phase)*4;
  ctx.globalAlpha=fade*.65;ctx.fillStyle='#ff6009';
  ctx.beginPath();ctx.moveTo(px-4,py+4);ctx.quadraticCurveTo(px-6,py-5,px,py-15-Math.cos(phase)*4);
  ctx.quadraticCurveTo(px+5,py-4,px+4,py+4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffec5f';ctx.globalAlpha=fade*.84;ctx.beginPath();
  ctx.ellipse(px,py-1,1.7,3.9,0,0,6.283185307);ctx.fill();
 }
 ctx.restore();
}
