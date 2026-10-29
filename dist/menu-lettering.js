import {MENU_GLYPHS} from './menu-font-data.js';
let font;const cache=new Map();
export function setMenuFont(image){font=image;cache.clear();}
export function menuLettering(text){
 const key=String(text).toUpperCase();if(cache.has(key))return cache.get(key);if(!font)return null;
 const chars=[...key],width=chars.reduce((sum,c)=>sum+(MENU_GLYPHS[c]?.advance||12),0);
 const mask=document.createElement('canvas');mask.width=width+24;mask.height=62;const m=mask.getContext('2d');let x=12;
 for(const c of chars){const g=MENU_GLYPHS[c];if(g){m.drawImage(font,g.x,g.y,g.w,g.h,x-4,8,g.w,g.h);x+=g.advance;}else x+=12;}
 const out=document.createElement('canvas');out.width=mask.width;out.height=mask.height;const ctx=out.getContext('2d');
 const tint=color=>{const c=document.createElement('canvas');c.width=mask.width;c.height=mask.height;const a=c.getContext('2d');a.drawImage(mask,0,0);a.globalCompositeOperation='source-in';a.fillStyle=color;a.fillRect(0,0,c.width,c.height);return c;};
 for(const [radius,color]of [[6,'#102b52'],[4,'#fffde9'],[2,'#8a151c']]){const layer=tint(color);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius)ctx.drawImage(layer,dx,dy);layer.width=layer.height=0;}
 ctx.drawImage(mask,0,0);mask.width=mask.height=0;cache.set(key,out);return out;
}

