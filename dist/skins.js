// Cosmetic-only skin registry. Add future skins here without changing World or collision data.
// A skin supplies frame-name overrides keyed by the original animation sprite name.
export const SKINS=Object.freeze([{id:'default',name:'Original Sketchman',frames:Object.freeze({})}]);
export const DEFAULT_SKIN='default';
export function getSkin(id){return SKINS.find(s=>s.id===id)||SKINS[0];}
export function cosmeticFrame(frame,skinId){return getSkin(skinId).frames[frame]||frame;}
export function skinOptions(){return SKINS.map(({id,name})=>({id,name}));}
