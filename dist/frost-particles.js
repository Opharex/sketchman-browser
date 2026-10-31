// Frost Runner only. Lightweight deterministic sparkles in actor coordinates.
// No sprite mutation, collisions, input state, persistent emitters or allocations.
export const FROST_EFFECT_VERSION='frost-refine-01';
export function drawFrostParticles(ctx,x,y,time,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const count=15;
 for(let i=0;i<count;i++){
  const seed=i*2.3999632297;
  const t=time*(.42+i%3*.12)+seed;
  const spread=38+((i*17)%41),sx=Math.sin(seed*1.7)*spread+21;
  const sy=-59+((i*29)%111)-((t*11)%40);
  const phase=(Math.sin(t*2.4+i)*.5+.5);
  const alpha=(.28+phase*.55)*(1-.27*Math.abs(sx)/85);
  const size=.9+(i%5===0?2.1:0)+(i%4===0?.6:0);
  ctx.globalAlpha=alpha;
  // Cyan cold halo, subtle white dot, and occasional six-armed snowflake.
  ctx.fillStyle='#82eaff';
  ctx.beginPath();ctx.arc(sx,sy,size*1.8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f7ffff';
  ctx.beginPath();ctx.arc(sx,sy,size*.65,0,Math.PI*2);ctx.fill();
  if(i%5===0){
   ctx.strokeStyle='#e7ffff';ctx.lineWidth=.65;
   ctx.beginPath();
   for(let a=0;a<3;a++){const theta=a*Math.PI/3;const dx=Math.cos(theta)*size*2.5,dy=Math.sin(theta)*size*2.5;
    ctx.moveTo(sx-dx,sy-dy);ctx.lineTo(sx+dx,sy+dy);}
   ctx.stroke();
  }
 }
 ctx.restore();
}
