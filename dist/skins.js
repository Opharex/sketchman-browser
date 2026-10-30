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

// Clay-style cosmetic pass. Uses the original APK frame silhouettes, alpha,
// trim and timing; applies directional sculpted shading without changing gameplay.
// This is a 2D clay-look treatment, not a real-time 3D model.
export function prepareClaySprites(assets,sprites){
 const frames=Object.keys(sprites).filter(name=>name.startsWith('CHR_')&&assets[name]);
 for(const name of frames){
  const source=assets[name],w=source.width,h=source.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(source,0,0);
  const image=g.getImageData(0,0,w,h),d=image.data;
  const alpha=new Uint8Array(w*h);
  for(let p=0;p<w*h;p++)alpha[p]=d[p*4+3];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const p=y*w+x,i=p*4,a=alpha[p];if(!a)continue;
   const r=d[i],gg=d[i+1],b=d[i+2];
   const bright=(r*0.299+gg*0.587+b*0.114);
   // Keep original facial details and equipped weapons distinguishable.
   const pale=bright>148&&Math.max(r,gg,b)-Math.min(r,gg,b)<55;
   const ink=bright<85;
   const ax=alpha[y*w+Math.max(0,x-2)]/255;
   const ay=alpha[Math.max(0,y-2)*w+x]/255;
   const bx=alpha[y*w+Math.min(w-1,x+2)]/255;
   const by=alpha[Math.min(h-1,y+2)*w+x]/255;
   const edgeLight=(ax-bx)*15+(by-ay)*13;
   const soft=12*Math.sin(x*.095+y*.061)+7*Math.sin(x*.21-y*.17);
   const shade=edgeLight+soft+18*(.5-y/Math.max(1,h));
   if(pale){
    const v=Math.max(0,Math.min(255,228+shade*.45));
    d[i]=v;d[i+1]=Math.max(0,v-9);d[i+2]=Math.max(0,v-23);
   }else if(ink){
    const v=Math.max(10,Math.min(85,31+shade*.45));
    d[i]=v;d[i+1]=Math.min(255,v+2);d[i+2]=Math.min(255,v+5);
   }else{
    const k=.85+shade/200;
    d[i]=Math.max(0,Math.min(255,r*k));
    d[i+1]=Math.max(0,Math.min(255,gg*k));
    d[i+2]=Math.max(0,Math.min(255,b*k));
   }
  }
  g.putImageData(image,0,0);
  assets['CLAY_'+name]=c;
  sprites['CLAY_'+name]=sprites[name];
 }
 return frames.length;
}
