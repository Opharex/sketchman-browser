// Keep decoded menu images alive for CSS backgrounds and later DOM screens.
// A cached `complete` image still has to finish decode() before it is ready.
export async function preloadUiImages(urls,{createImage=()=>new Image(),onProgress=()=>{},concurrency=6}={}){
 const unique=[...new Set(urls)],images=new Map();let next=0,loaded=0;
 const load=url=>new Promise((resolve,reject)=>{
  const image=createImage();let settling=false;
  const fail=error=>{image.onload=image.onerror=null;reject(error);};
  const ready=async()=>{
   if(settling)return;settling=true;
   try{if(!image.naturalWidth)throw new Error(`Missing menu artwork: ${url}`);
    if(image.decode)await image.decode();
    images.set(url,image);image.onload=image.onerror=null;onProgress(++loaded,unique.length);resolve();
   }catch(error){fail(new Error(`Could not decode menu artwork: ${url}`,{cause:error}));}
  };
  image.onload=ready;image.onerror=()=>fail(new Error(`Missing menu artwork: ${url}`));image.src=url;
  if(image.complete){if(image.naturalWidth)ready();else fail(new Error(`Missing menu artwork: ${url}`));}
 });
 await Promise.all(Array.from({length:Math.min(concurrency,unique.length)},async()=>{
  while(next<unique.length){const url=unique[next++];await load(url);}
 }));return images;
}
