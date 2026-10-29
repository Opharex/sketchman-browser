// One unlocked AudioContext can play overlapping game sounds on iOS.
// Creating new HTMLAudioElements from animation callbacks loses that permission.
export function createSoundPlayer(view=window){
 let context;const buffers=new Map(),pending=new Map();
 function unlock(){
  try{const AudioContext=view.AudioContext||view.webkitAudioContext;if(!AudioContext)return;
   context??=new AudioContext();if(context.state==='suspended'||context.state==='interrupted')context.resume().catch(()=>{});
  }catch{}
 }
 async function play(url,volume){
  unlock();if(!context)return;
  try{
   let buffer=buffers.get(url);
   if(!buffer){if(!pending.has(url))pending.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('Sound unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(decoded=>{buffers.set(url,decoded);return decoded;}).finally(()=>pending.delete(url)));buffer=await pending.get(url);}
   // Do not queue stale sound effects while Safari has the app suspended.
   if(context.state!=='running')return;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  }catch{}
 }
 return {unlock,play};
}
