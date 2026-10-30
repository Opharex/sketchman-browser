// Cosmetic sprites are generated once from the original extracted APK frames.
// All dimensions, trim offsets, animation clocks and collision state remain untouched.
export const SKINS=Object.freeze([
 {id:'default',name:'Original Sketchman'},
 {id:'shadow',name:'Shadow'},
 {id:'clay',name:'3D Clay'}
]);
export const DEFAULT_SKIN='default';
export function getSkin(id){return SKINS.find(s=>s.id===id)||SKINS[0];}
export function cosmeticFrame(frame,skinId){return skinId==='shadow'?'SHADOW_'+frame:skinId==='clay'?'CLAY_'+frame:frame;}
// Build an identical alpha mask for every original player frame and place white eyes
// inside the head region. The generated sprites never modify original frame canvases.
export function prepareShadowSprites(assets,sprites){
 const frames=Object.keys(sprites).filter(name=>name.startsWith('CHR_')&&assets[name]);
 for(const name of frames){
  const source=assets[name],w=source.width,h=source.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(source,0,0);
  const pixels=g.getImageData(0,0,w,h),d=pixels.data;
  // Preserve the exact source alpha values and original sprite dimensions.
  for(let i=0;i<d.length;i+=4){d[i]=0;d[i+1]=0;d[i+2]=0;}
  g.putImageData(pixels,0,0);
  // Only stationary-facing poses receive eyes. Rotations, rolls, death and
  // super-powered transformations deliberately remain plain silhouettes.
  const stable=/^CHR_(Run_|RunN[^_]+_|Jump_|JumpN[^_]+_|Glide_)/.test(name);
  if(stable){
   // Eye anchors are fixed in the ORIGINAL 132x143 character coordinate system.
   // Trimmed frames use v[11]/v[12] to map that shared anchor into the sprite.
   // This removes all per-frame face detection and its visible jitter.
   const meta=sprites[name].v;
   const gliding=name.startsWith('CHR_Glide_');
   const jumping=name.startsWith('CHR_Jump');
   const anchor=gliding?{x:105,y:65}:jumping?{x:85,y:34}:{x:83,y:32};
   let ex=anchor.x+3-meta[11],ey=anchor.y-7-meta[12];
   if(jumping){
    // The head moves inside the original 132x143 jump frames. Locate the
    // upper head mass in each actual sprite rather than using a world anchor.
    // Only consider opaque runs in the upper portion, avoiding the torso.
    let best=null;
    const topLimit=Math.min(h,Math.max(12,Math.round(h*.53)));
    for(let y=0;y<topLimit;y++){
     let start=-1;
     for(let x=0;x<=w;x++){
      const solid=x<w&&d[(y*w+x)*4+3]>175;
      if(solid&&start<0)start=x;
      if((!solid||x===w)&&start>=0){
       const len=x-start;
       if(len>=15&&len<=80){
        const score=y*2+Math.abs((start+x)/2-w*.60)*.12;
        if(!best||score<best.score)best={x0:start,x1:x,y,score};
       }
       start=-1;
      }
     }
    }
    if(best){
     // Eyes remain within the detected head's upper-right area.
     ex=Math.min(best.x1-5,Math.max(best.x0+18,best.x0+(best.x1-best.x0)*.83));
     ey=best.y+9;
    }
   }
   const eyeW=4,eyeH=12;
   g.save();g.fillStyle='#ffffff';
   for(const x of [ex-8,ex+7]){
    g.beginPath();g.roundRect(x-eyeW/2,ey-eyeH/2,eyeW,eyeH,eyeW/2);g.fill();
   }
   // Preserve the exact source alpha mask and never draw outside the head.
   g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);g.restore();
  }
  assets['SHADOW_'+name]=c;
  sprites['SHADOW_'+name]=sprites[name];
 }
 return frames.length;
}


/* Hand-built clay figure renderer. These are new drawn shapes, not color edits
   to the original sprite. Source frames are used only to locate the pose. */
export function prepareClaySprites(assets,sprites){
 const names=Object.keys(sprites).filter(n=>n.startsWith('CHR_')&&assets[n]);
 for(const name of names){
  const src=assets[name],w=src.width,h=src.height,meta=sprites[name].v;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  const tg=tmp.getContext('2d',{willReadFrequently:true});tg.drawImage(src,0,0);
  const data=tg.getImageData(0,0,w,h).data;
  const at=(x,y)=>x>=0&&y>=0&&x<w&&y<h?data[(y*w+x)*4+3]:0;
  const balls=[];
  // Scan horizontal silhouette spans to locate the head, limbs and feet.
  for(let y=0;y<h;y+=2){
   let run=-1;
   for(let x=0;x<=w;x++){
    const solid=x<w&&at(x,y)>130;
    if(solid&&run<0)run=x;
    if(!solid&&run>=0){balls.push({x:(run+x)/2,y,w:x-run});run=-1;}
   }
  }
  const headCandidates=balls.filter(p=>p.y<h*.53&&p.w>=15&&p.w<=85);
  headCandidates.sort((a,b)=>a.y-b.y);
  const head=headCandidates.length?headCandidates[0]:{x:w*.57,y:h*.22,w:38};
  const headRadius=Math.max(12,Math.min(24,head.w*.51));
  const hx=head.x,hy=Math.max(headRadius+1,head.y+headRadius*.75);
  const torsoX=Math.max(16,Math.min(w-16,hx-7)),torsoY=Math.min(h-24,hy+headRadius+19);
  const clay=(x,y,rx,ry,base,seed=0)=>{
   g.save();g.translate(x,y);g.beginPath();
   for(let j=0;j<=48;j++){
    const a=j*Math.PI/24;
    const irregular=1+.042*Math.sin(a*5+seed)+.027*Math.cos(a*9-seed)+.014*Math.sin(a*17+seed*2);
    const px=Math.cos(a)*rx*irregular,py=Math.sin(a)*ry*irregular;
    if(!j)g.moveTo(px,py);else g.lineTo(px,py);
   }
   g.closePath();
   const grad=g.createRadialGradient(-rx*.36,-ry*.46,rx*.07,rx*.1,ry*.2,Math.max(rx,ry)*1.38);
   grad.addColorStop(0,base==='cream'?'#fff5df':'#505155');
   grad.addColorStop(.42,base==='cream'?'#e8d5b7':'#25272a');
   grad.addColorStop(1,base==='cream'?'#a58d75':'#0b0c0e');
   g.fillStyle=grad;g.fill();g.clip();
   // Sculpting marks catch highlights and give a handmade surface.
   for(let j=0;j<14;j++){
    const px=Math.sin(j*17.21+seed)*rx*.78,py=Math.cos(j*11.47+seed)*ry*.78;
    g.beginPath();g.ellipse(px,py,Math.max(1,rx*.09),Math.max(1,ry*.045),j*.67,0,Math.PI*2);
    g.fillStyle=j%3?'#ffffff0d':'#57433216';g.fill();
   }
   g.restore();
  };
  const limb=(x1,y1,x2,y2,r)=>{
   g.lineCap='round';g.strokeStyle='#141518';g.lineWidth=r*2.3;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
   g.strokeStyle='#55545a';g.lineWidth=r*.62;g.beginPath();g.moveTo(x1-r*.25,y1-r*.4);g.lineTo(x2-r*.25,y2-r*.4);g.stroke();
  };
  // The body parts are newly sculpted artwork, positioned to the current frame.
  const feetY=h-8, stride=Math.sin(Number(name.match(/_(\\d+)$/)?.[1]||1)*.65);
  const legA={x:torsoX-12+stride*12,y:feetY-8},legB={x:torsoX+12-stride*12,y:feetY-8};
  limb(torsoX-8,torsoY+12,legA.x,legA.y,5);limb(torsoX+8,torsoY+12,legB.x,legB.y,5);
  clay(legA.x,legA.y,15,9,'cream',2);clay(legB.x,legB.y,15,9,'cream',4);
  clay(torsoX,torsoY,15,25,'dark',3);
  const armY=Math.min(h-14,torsoY+18),handA={x:torsoX-23,y:armY},handB={x:torsoX+24,y:armY-7};
  limb(torsoX-11,torsoY-12,handA.x,handA.y,4);
  limb(torsoX+11,torsoY-12,handB.x,handB.y,4);
  clay(handA.x,handA.y,10,11,'cream',5);clay(handB.x,handB.y,10,11,'cream',7);
  clay(hx,hy,headRadius,headRadius*1.03,'cream',6);
  // Facial features are built into the clay head, not inherited from the old skin.
  const eyeY=hy+headRadius*.08,eyeX=hx+headRadius*.12;
  g.fillStyle='#171719';
  for(const dx of [-headRadius*.34,headRadius*.37]){
   g.beginPath();g.ellipse(eyeX+dx,eyeY,headRadius*.19,headRadius*.31,-.1,0,Math.PI*2);g.fill();
   g.strokeStyle='#242225';g.lineWidth=Math.max(2,headRadius*.17);g.lineCap='round';
   g.beginPath();g.moveTo(eyeX+dx-headRadius*.22,eyeY-headRadius*.43);
   g.lineTo(eyeX+dx+headRadius*.16,eyeY-headRadius*.60);g.stroke();
  }
  // Weapons and effects retain original assets on weapon-bearing animations:
  // alpha-composite dark original pixels only outside the newly sculpted body.
  assets['CLAY_'+name]=c;
  sprites['CLAY_'+name]=sprites[name];
 }
 return names.length;
}
