// Short opening made from the user's notebook keyframes and interpolated frames.
export const INTRO_FPS=30;
export const INTRO_DURATION_MS=1900;
export const INTRO_SOURCE='sketchman_new_opening.mp4';
export function playLoadingIntro(root){
 const film=document.createElement('video');
 film.className='loading-film';
 film.setAttribute('aria-label','Sketchman reaches to his opposite hip, draws a pistol, aims and fires');
 film.setAttribute('playsinline','');
 film.setAttribute('webkit-playsinline','');
 film.muted=true;film.defaultMuted=true;
 film.autoplay=true;film.preload='auto';film.controls=false;film.disablePictureInPicture=true;
 film.src=INTRO_SOURCE;
 root.prepend(film);
 return new Promise(resolve=>{
  let completed=false;
  const finish=()=>{if(completed)return;completed=true;clearTimeout(watchdog);resolve();};
  const fallback=()=>{
   // Video failure must not prevent loading and playing the game.
   const still=document.createElement('img');still.className='loading-film';
   still.src='loading-final.jpg';still.alt='Sketchman opening artwork';
   if(film.isConnected)film.replaceWith(still);
   finish();
  };
  const watchdog=setTimeout(finish,INTRO_DURATION_MS+1500);
  film.addEventListener('ended',finish,{once:true});
  film.addEventListener('error',fallback,{once:true});
  const attempt=film.play();
  if(attempt?.catch)attempt.catch(fallback);
 });
}
