// The APK title logo, gun pose, ink cracks and menu buttons live in a single
// raster image. Retint only the *existing* figure's pale blue cel paint.
// Geometry, outline pixels, gun, and the menu image itself stay stationary.
export const MENU_HERO_REGION=Object.freeze({x:315,y:98,width:310,height:212});
const HEAD={x:405,y:163,rx:58,ry:60};
const BODY=[[392,206],[432,204],[457,221],[488,212],[537,221],[568,247],[558,277],[534,286],[484,275],[491,303],[389,304],[363,296],[342,268],[352,231]];
function insidePolygon(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
function inFigure(x,y){
 const hx=(x-HEAD.x)/HEAD.rx,hy=(y-HEAD.y)/HEAD.ry;
 return hx*hx+hy*hy<1.03||insidePolygon(x,y,BODY);
}
const COLORS=Object.freeze({
 crimson_bolt:[209,35,57],frost_runner:[120,209,240],
 toxic_lime:[112,211,57],royal_gold:[240,181,40],
 neon_synthwave:[245,58,182],obsidian_ember:[42,43,49],
 deep_ocean:[31,115,174],jungle_camo:[97,132,65],
 sunset_blaze:[247,132,48],shadow:[13,15,20]
});
export function chooseMenuSkin(skins,previous=null,random=Math.random){
 if(!skins?.length)return 'default';
 const available=skins.filter(s=>s.id!==previous);
 const choices=available.length?available:skins;
 const n=Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)));
 return choices[n].id;
}
export function recolorMenuHeroPixels(input,width,height,skinId,originX=MENU_HERO_REGION.x,originY=MENU_HERO_REGION.y){
 const data=new Uint8ClampedArray(input),base=COLORS[skinId];
 if(!base)return data; // Default is always exactly the original APK artwork.
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=originX+col,y=originY+row,p=(row*width+col)*4;
  if(data[p+3]<16||!inFigure(x,y))continue;
  const r=input[p],g=input[p+1],b=input[p+2];
  // Cool, pale blue/white figure paint is distinctive; gun metal, dark ink,
  // cream paper, red cracks and white logo highlights aren't retinted.
  const paleBlue=b>r+15&&g>r+7&&b>=105&&r>=65;
  const coolWhite=r>=190&&g>=200&&b>=r-3&&b>=g-10;
  if(!paleBlue&&!coolWhite)continue;
  const light=Math.min(1,(r*.25+g*.44+b*.31)/255);
  const head=y<216;
  const tint=base.slice();
  if(skinId==='neon_synthwave'){
   const gradient=Math.max(0,Math.min(1,(y-115)/175));
   tint[0]=245*(1-gradient)+42*gradient;
   tint[1]=58*(1-gradient)+226*gradient;
   tint[2]=182*(1-gradient)+238*gradient;
  }else if(skinId==='sunset_blaze'){
   const gradient=Math.max(0,Math.min(1,(y-140)/160));
   tint[0]=247*(1-gradient)+210*gradient;
   tint[1]=132*(1-gradient)+52*gradient;
   tint[2]=48*(1-gradient)+131*gradient;
  }else if(skinId==='frost_runner'&&head){tint[0]=178;tint[1]=232;tint[2]=246;}
  else if(skinId==='jungle_camo'){
   // Clumped, matte camouflage variations remain strictly within cel paint.
   const patch=Math.sin(x*.14+y*.06)*Math.cos(y*.21-x*.09);
   const variant=patch>.28?1.20:patch<-.24?.63:1;
   tint[0]*=variant;tint[1]*=variant;tint[2]*=variant;
  }else if(skinId==='obsidian_ember'){
   const vein=Math.sin(x*.28+y*.61)+Math.cos(x*.36-y*.32);
   if(vein>1.45){tint[0]=218;tint[1]=86;tint[2]=20;}
  }else if(skinId==='crimson_bolt'){
   const bolt=Math.sin(y*.34+x*.21);
   if(!head&&bolt>.92){tint[0]=255;tint[1]=132;tint[2]=65;}
  }
  const level=skinId==='shadow'?.78:(.30+.72*light);
  const gloss=skinId==='shadow'?0:Math.max(0,(light-.88)/.12)*.12;
  for(let c=0;c<3;c++)data[p+c]=Math.min(255,Math.round(tint[c]*level+(255-tint[c])*gloss));
 }
 if(skinId==='shadow'){
  // The Shadow menu pose gets the same simple white pill-eye design.
  for(const ex of [425,441])for(let dy=-7;dy<=7;dy++)for(let dx=-2;dx<=2;dx++){
   const x=ex+dx,y=160+dy,ix=x-originX,iy=y-originY;
   if(ix<0||iy<0||ix>=width||iy>=height||dx*dx/4+dy*dy/49>1)continue;
   const p=(iy*width+ix)*4;
   if(input[p+3]>64){data[p]=255;data[p+1]=255;data[p+2]=255;}
  }
 }
 return data;
}
