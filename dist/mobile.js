// Safari's visible viewport changes when its address bar or orientation changes.
export function fitViewport(root,view=window){
 const viewport=view.visualViewport;
 root.style.setProperty('--viewport-width',`${viewport?.width||view.innerWidth}px`);
 root.style.setProperty('--viewport-height',`${viewport?.height||view.innerHeight}px`);
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
