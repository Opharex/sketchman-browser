// Convert the user's original skin illustrations into original TITLE-POSE
// materials. The original title bitmap supplies the exact gun, character pose
// and surrounding ink. The uploaded art supplies genuine material textures.
export const MENU_POSE_RECT=Object.freeze({x:322,y:82,width:305,height:240});
const HEAD={x:405,y:146,rx:54,ry:55};
const BODY=[[370,189],[396,180],[431,182],[447,197],[463,213],
 [469,235],[447,243],[438,229],[432,255],[438,310],[397,309],
 [378,285],[358,276],[345,299],[326,298],[326,274],[345,226]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function polygon(x,y,vertices){
 let inside=false;
 for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
  const p=vertices[i],q=vertices[j];
  if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])inside=!inside;
 }
 return inside;
}
export function titleFigureZone(x,y){
 if(((x-HEAD.x)/HEAD.rx)**2+((y-HEAD.y)/HEAD.ry)**2<.96)return 'head';
 return polygon(x,y,BODY)?'body':null;
}
function readSource(ref,x,y,isHead){
 const {data,width,height}=ref;
 const ix=clamp(Math.round(x),0,width-1),iy=clamp(Math.round(y),0,height-1);
 const valid=(xx,yy)=>{
  if(xx<0||xx>=width||yy<0||yy>=height)return -1;
  if(!isHead&&yy<height*.27)return -1;
  const p=(yy*width+xx)*4;return data[p+3]>130?p:-1;
 };
 let p=valid(ix,iy);
 if(p>=0)return [data[p],data[p+1],data[p+2]];
 // Reference bodies have empty spaces between their running limbs. Borrow
 // actual nearby paint, never gray background or transparent pixels.
 for(const radius of [3,7,13,23,39,60]){
  for(let j=0;j<16;j++){
   const t=j*Math.PI/8,xx=Math.round(ix+radius*Math.cos(t)),yy=Math.round(iy+radius*Math.sin(t));
   p=valid(xx,yy);if(p>=0)return [data[p],data[p+1],data[p+2]];
  }
 }
 return null;
}
function materialUV(x,y,zone,w,h){
 if(zone==='head')return [(0.78+(x-405)/53*.173)*w,(.151+(y-146)/54*.144)*h];
 if(x>418&&y<249)return [(0.76+(x-441)/100*.17)*w,(.44+(y-216)/100*.08)*h];
 if(x<375)return [(.43+(x-354)/80*.15)*w,(.43+(y-238)/120*.21)*h];
 return [(.54+(x-400)/95*.18)*w,(.40+(y-217)/115*.25)*h];
}
export function paintTitlePosePixels(original,width,height,reference,originX=MENU_POSE_RECT.x,originY=MENU_POSE_RECT.y){
 const output=new Uint8ClampedArray(original);
 if(!reference?.data||!reference.width||!reference.height)return output;
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=originX+col,y=originY+row,zone=titleFigureZone(x,y);
  if(!zone)continue;
  const p=(row*width+col)*4;if(original[p+3]<28)continue;
  const r=original[p],g=original[p+1],b=original[p+2];
  // The original cel paint is pale blue. Keep original navy ink outlines,
  // metallic pistol, red explosion, lettering and notebook completely intact.
  const pale=r>=98&&g>=117&&b>=135&&b>=g-9&&g>=r+4;
  const brightWhite=zone==='head'&&r>=170&&g>=180&&b>=180&&b>=r-4;
  if(!pale&&!brightWhite)continue;
  const [sx,sy]=materialUV(x,y,zone,reference.width,reference.height);
  const surface=readSource(reference,sx,sy,zone==='head');
  if(!surface)continue;
  const luminance=(r*.24+g*.56+b*.2)/255,inkLight=.77+.23*luminance;
  for(let c=0;c<3;c++)output[p+c]=Math.round(surface[c]*inkLight);
 }
 return output;
}
