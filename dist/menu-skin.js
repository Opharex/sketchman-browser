// Menu portraits are painted in the original APK title pose. Keep the menu's
// pistol, logo, impact burst and buttons untouched. Each material below uses
// the EXACT palette of its matching playable skin in tools/build-skins.py.
export const MENU_HERO_REGION=Object.freeze({x:315,y:78,width:310,height:242});
export const MENU_SKIN_PALETTES=Object.freeze({
 crimson_bolt:['#320008','#8a0018','#f51530','#fff2f2'],
 frost_runner:['#043580','#2d86d2','#b2eaff','#ffffff'],
 toxic_lime:['#06300c','#12aa10','#baff00','#f3ff8f'],
 royal_gold:['#5c2808','#b87908','#f7c62f','#fff9df'],
 neon_synthwave:['#100753','#4c0b9d','#f017c2','#fff0fa'],
 obsidian_ember:['#19151d','#34242b','#f34c08','#ffea72'],
 deep_ocean:['#001835','#086f9b','#20c4d5','#cbffff'],
 jungle_camo:['#12280a','#4e672d','#a28c4f','#dfd2a1'],
 sunset_blaze:['#a52c08','#f36b04','#ffcc11','#fff4b4'],
 shadow:['#020306','#0b0c0f','#131417','#ffffff']
});
const HEAD={x:405,y:144,rx:51,ry:55};
const FACE={x:407,y:141,rx:40,ry:44};
// The gun begins to the RIGHT of the arm. Never include its blue-grey metal
// in the hero material mask, even though its color resembles the original suit.
const BODY=[[375,184],[395,177],[430,186],[452,205],[455,226],
 [450,247],[448,273],[442,298],[406,300],[385,291],[377,263],
 [356,282],[335,295],[324,285],[339,251],[356,219]];
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const ellipse=(x,y,o)=>((x-o.x)/o.rx)**2+((y-o.y)/o.ry)**2<=1;
function inPoly(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,ay]=points[i],[bx,by]=points[j];
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function zone(x,y){
 if(ellipse(x,y,HEAD))return ellipse(x,y,FACE)?'face':'head';
 return inPoly(x,y,BODY)?'body':null;
}
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const colorPalettes=Object.fromEntries(Object.entries(MENU_SKIN_PALETTES).map(([id,colors])=>[id,colors.map(hexRGB)]));
const lerp=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
function hash2(x,y,seed){
 let n=(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(seed,83492791))|0;
 n=Math.imul(n^(n>>>13),1274126177);
 return ((n^(n>>>16))&65535)/65535;
}
function noise(x,y,cell,seed){
 const fx=x/cell,fy=y/cell,ix=Math.floor(fx),iy=Math.floor(fy);
 const xx=fx-ix,yy=fy-iy,tx=xx*xx*(3-2*xx),ty=yy*yy*(3-2*yy);
 const top=hash2(ix,iy,seed)*(1-tx)+hash2(ix+1,iy,seed)*tx;
 const bottom=hash2(ix,iy+1,seed)*(1-tx)+hash2(ix+1,iy+1,seed)*tx;
 return top*(1-ty)+bottom*ty;
}
function materialVariant(id,x,y){
 const n=noise(x,y,12,4);
 switch(id){
  case 'frost_runner': {
   const facet=hash2(Math.floor(x/13),Math.floor(y/13),12);
   const fissure=Math.abs(x%13-(y%13)*.67)<1.1?1:0;
   return [(facet-.5)*.56+fissure*.36,fissure*.45];
  }
  case 'toxic_lime': {
   const shine=Math.max(0,Math.sin(y*.23+x*.17))**10;
   return [.08+.15*n+.19*shine,.24*shine];
  }
  case 'royal_gold': {
   const reflection=Math.sin(x*.18+y*.13+n*2.2);
   const facet=hash2(Math.floor(x/17),Math.floor(y/11),18);
   const sparkle=Math.max(0,Math.sin(x*.31-y*.27))**22;
   return [.16*reflection+(facet-.5)*.19,.26*sparkle];
  }
  case 'neon_synthwave': {
   const neon=Math.max(0,Math.sin(y*.26+x*.13))**14;
   const edge=Math.max(0,Math.sin(x*.46-y*.28))**18;
   return [.27*neon+.2*edge,.35*Math.max(neon,edge)];
  }
  case 'obsidian_ember': {
   const wave=Math.sin(x*.27+noise(x,y,15,8)*6);
   const vein=Math.sin(y*.34+noise(x,y,19,5)*6);
   const crack=Math.max(0,1-Math.abs(wave+vein*.8)*2.7);
   return [-.25+crack*.98,crack*.48];
  }
  case 'deep_ocean': {
   const swirl=Math.sin(x*.13+y*.14+noise(x,y,23,16)*5);
   const bubble=hash2(Math.floor(x/17),Math.floor(y/17),7)>.86&&Math.abs(x%17-8)<2&&Math.abs(y%17-9)<2;
   return [.23*swirl+(bubble?.4:0),bubble?.23:0];
  }
  case 'jungle_camo': {
   const broad=noise(x,y,15,10)*.75+noise(x,y,7,23)*.25;
   return [broad<.38?-.35:broad<.55?.03:broad<.69?.42:.72,0];
  }
  case 'sunset_blaze': {
   const flames=Math.sin(x*.16+y*.07+noise(x,y,12,23)*6.4);
   const tip=Math.sin(y*.25+x*.11)**2;
   return [.32*flames+.18*tip,.19*tip];
  }
  case 'crimson_bolt': {
   const gloss=Math.max(0,Math.sin((x+y*.21)*.29))**16;
   return [-.07+.20*gloss+(n-.5)*.16,.2*gloss];
  }
  default:return [0,0];
 }
}
function materialColor(id,x,y,luma,area){
 const cols=colorPalettes[id];
 if(id==='shadow')return luma<105?[2,3,5]:luma<180?[9,10,13]:[17,18,21];
 // The approved Crimson Bolt skin intentionally has a totally WHITE face.
 // The older title-screen tint incorrectly made this entire face red/orange.
 if(id==='crimson_bolt'&&area==='face'&&luma>122){
  const horizontal=clamp((x-FACE.x)/FACE.rx*.20+.14);
  return lerp([255,255,255],[214,213,231],horizontal);
 }
 if(id==='crimson_bolt'){
  if(luma<=80)return lerp([56,0,9],[97,0,15],luma/80);
  if(luma<=165)return lerp([96,0,15],[208,0,26],(luma-80)/85);
  const t=clamp((luma-165)/90);
  let color=lerp([208,0,26],[253,11,40],t);
  const ribbon=Math.max(0,Math.sin(x*.17+y*.085))**8;
  const streak=clamp((luma-174)/70)*ribbon*.63;
  return lerp(color,[255,229,233],streak);
 }
 if(luma<65)return lerp(cols[0],cols[1],luma/65*.18);
 const [variant,glow]=materialVariant(id,x,y);
 let grade=clamp(.46+variant);
 if(id==='obsidian_ember'&&grade<.53)grade*=.52;
 const location=Math.min(2,Math.floor(grade*3));
 const core=lerp(cols[location],cols[location+1],grade*3-location);
 const material=glow?lerp(core,cols[3],glow*.5):core;
 if(luma<125)return lerp(cols[0],material,.30+(luma-65)/60*.38);
 return lerp(material,cols[3],clamp(.06+(luma-125)/130*.54));
}
export function chooseMenuSkin(skins,previous=null,random=Math.random){
 if(!skins?.length)return 'default';
 const options=skins.filter(s=>s.id!==previous);
 const choices=options.length?options:skins;
 return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))].id;
}
export function recolorMenuHeroPixels(input,width,height,skinId,originX=MENU_HERO_REGION.x,originY=MENU_HERO_REGION.y){
 const result=new Uint8ClampedArray(input);
 if(!colorPalettes[skinId])return result;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const fullX=x+originX,fullY=y+originY,area=zone(fullX,fullY);
  if(!area)continue;
  const p=(y*width+x)*4;
  if(input[p+3]<16)continue;
  const r=input[p],g=input[p+1],b=input[p+2];
  // Original player paint and navy ink. Excludes orange/red burst and paper.
  // Restrict nearly-white pixels to the enclosed head to avoid tinting the logo.
  const cool=b>r+12&&b>g-11&&b>=42;
  const white=area==='face'&&r>150&&g>160&&b>160;
  if(!cool&&!white)continue;
  const luma=.2126*r+.7152*g+.0722*b;
  const color=materialColor(skinId,fullX,fullY,luma,area);
  result[p]=Math.round(clamp(color[0],0,255));
  result[p+1]=Math.round(clamp(color[1],0,255));
  result[p+2]=Math.round(clamp(color[2],0,255));
 }
 if(skinId==='shadow'){
  // The two white vertical pill eyes of the actual Shadow skin, inside
  // the original head paint. Never extend outside the source silhouette.
  for(const eyeX of [417,431])for(let dy=-7;dy<=7;dy++)for(let dx=-2;dx<=2;dx++){
   if(dx*dx/4+dy*dy/49>1)continue;
   const px=eyeX+dx-originX,py=151+dy-originY;
   if(px<0||py<0||px>=width||py>=height)continue;
   const idx=(py*width+px)*4;
   if(input[idx+3]>64&&zone(eyeX+dx,151+dy)==='face'){
    result[idx]=255;result[idx+1]=255;result[idx+2]=255;
   }
  }
 }
 return result;
}
