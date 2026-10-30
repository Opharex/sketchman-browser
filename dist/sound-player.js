// One unlocked AudioContext can play overlapping game sounds on iOS.
export function createSoundPlayer(view=window){
 let context;const buffers=new Map(),pending=new Map();
 function ensure(){const AudioContext=view.AudioContext||view.webkitAudioContext;if(!AudioContext)return;context??=new AudioContext();return context;}
 function unlock(){try{if(!ensure())return;if(context.state==='suspended'||context.state==='interrupted')context.resume().catch(()=>{});}catch{}}
 function load(url){
  if(buffers.has(url))return Promise.resolve(buffers.get(url));
  if(!pending.has(url))pending.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('Sound unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(decoded=>{buffers.set(url,decoded);return decoded;}).finally(()=>pending.delete(url)));
  return pending.get(url);
 }
 async function preload(urls){try{if(!ensure())return;await Promise.allSettled(urls.map(load));}catch{}}
 async function play(url,volume,{rate=1}={}){
  unlock();if(!context)return;
  try{
   // Predecoded boss cues start immediately; only uncached sounds await a fetch.
   const buffer=buffers.get(url)||await load(url);
   if(context.state!=='running')return;
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;if(source.playbackRate)source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
  }catch{}
 }
 return {unlock,play,preload};
}
