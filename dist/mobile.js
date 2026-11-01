// Safari's visible viewport changes when its address bar or orientation changes.
export function renderCanvasDimensions(cssWidth,cssHeight,{widescreen=false,mobile=false}={}){
 const baseWidth=960,baseHeight=640,ratio=Math.max(1,cssWidth)/Math.max(1,cssHeight);
 const logicalWidth=widescreen&&ratio>1.5
  ?Math.min(1920,Math.max(baseWidth,Math.round(baseHeight*ratio))):baseWidth;
 // Widescreen displays more world, but limits mobile canvas pixel workload.
 const scale=mobile&&widescreen
  ?Math.min(1,Math.sqrt((baseWidth*baseHeight*1.1)/(logicalWidth*baseHeight))):1;
 return {logicalWidth,pixelWidth:Math.max(1,Math.round(logicalWidth*scale)),
  pixelHeight:Math.max(1,Math.round(baseHeight*scale)),
  scale,padding:(logicalWidth-baseWidth)/2};
}
export function fitViewport(root,view=window){
 const viewport=view.visualViewport;
 const width=Math.max(1,Math.round(viewport?.width||view.innerWidth));
 const height=Math.max(1,Math.round(viewport?.height||view.innerHeight));
 root.style.setProperty('--viewport-width',width+'px');
 root.style.setProperty('--viewport-height',height+'px');
}
// Track each finger independently. A jump finger lifting must not release fire.
export function bindTouchControls(surface,{active,press,release},view=window){
 const start=e=>{
  if(!active(e))return;
  e.preventDefault();const r=surface.getBoundingClientRect();
  for(const t of e.changedTouches)press(`touch:${t.identifier}`,t.clientX<r.left+r.width/2);
 };
 const end=e=>{for(const t of e.changedTouches)release(`touch:${t.identifier}`);};
 surface.addEventListener('touchstart',start,{passive:false});
 view.addEventListener('touchend',end);view.addEventListener('touchcancel',end);
 return ()=>{surface.removeEventListener('touchstart',start);view.removeEventListener('touchend',end);view.removeEventListener('touchcancel',end);};
}
