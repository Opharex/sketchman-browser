const tintCache=new Map();
const MAX_TINTS=48;
function tinted(texture,color){
 const rgb=color.slice(0,3).map(v=>Math.round(Math.max(0,Math.min(1,v))*15)*17);
 if(rgb.every(v=>v===255))return texture;
 const key=`${texture.src}:${rgb.join(',')}`;
 if(tintCache.has(key)){const cached=tintCache.get(key);tintCache.delete(key);tintCache.set(key,cached);return cached;}
 const c=document.createElement('canvas');c.width=texture.width;c.height=texture.height;
 const cx=c.getContext('2d');if(!cx){c.width=c.height=0;return texture;}cx.drawImage(texture,0,0);cx.globalCompositeOperation='multiply';cx.fillStyle=`rgb(${rgb.join(',')})`;cx.fillRect(0,0,c.width,c.height);cx.globalCompositeOperation='destination-in';cx.drawImage(texture,0,0);
 if(tintCache.size>=MAX_TINTS){const oldest=tintCache.keys().next().value,canvas=tintCache.get(oldest);tintCache.delete(oldest);canvas.width=canvas.height=0;}
 tintCache.set(key,c);return c;
}
export function drawParticle(ctx,p,assets){
 if(p.sourceEffect&&p.age<0)return;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
 const texture=assets[p.texture];
 if(p.sourceEffect){
  ctx.globalAlpha=Math.max(0,Math.min(1,p.color[3]));
  if(p.def.blend===6)ctx.globalCompositeOperation='lighter';
  if(texture){const [w,h]=p.def.frame,scale=p.scale;ctx.drawImage(tinted(texture,p.color),p.frame*w,0,w,h,-w*scale/2,-h*scale/2,w*scale,h*scale);}
 }else{
  ctx.globalAlpha=Math.min(1,p.life*2);
  if(texture){const size=p.size*(p.texture==='ParSmokeParticule'?5:3);ctx.drawImage(texture,-size/2,-size/2,size,size);}
  else{ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);}
 }
 ctx.restore();
}
