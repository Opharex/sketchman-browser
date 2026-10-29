import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preloadUiImages} from '../dist/ui-preload.js';
import {UI_IMAGE_URLS} from '../dist/ui-assets.js';

test('cached images cannot finish preloading before decode completes',async()=>{
 let decodeDone,finished=false;const image={complete:true,naturalWidth:100,decode:()=>new Promise(resolve=>decodeDone=resolve)};
 const preload=preloadUiImages(['button.png','button.png'],{createImage:()=>image}).then(result=>{finished=true;return result;});
 await Promise.resolve();assert.equal(finished,false);decodeDone();const images=await preload;assert.equal(images.size,1);assert.equal(images.get('button.png'),image);
});
test('a broken or undecodable menu texture rejects the loading barrier',async()=>{
 await assert.rejects(preloadUiImages(['missing.png'],{createImage:()=>({complete:true,naturalWidth:0})}),/Missing menu artwork/);
 await assert.rejects(preloadUiImages(['broken.png'],{createImage:()=>({complete:true,naturalWidth:100,decode:async()=>{throw Error('decode failed');}})}),/Could not decode/);
});
test('all UI textures exist and include CSS backgrounds, hover art and HUD buttons',()=>{
 const root=new URL('../dist/',import.meta.url);assert.equal(new Set(UI_IMAGE_URLS).size,UI_IMAGE_URLS.length);
 for(const url of UI_IMAGE_URLS)assert.ok(fs.existsSync(new URL(url,root)),url);
 const css=fs.readFileSync(new URL('style.css',root),'utf8');for(const [,url]of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))assert.ok(UI_IMAGE_URLS.includes(url),url);
 for(const name of ['STR_BuyBtn_01','STR_BuyBtnON_01','IMM_BackButton_01'])assert.ok(UI_IMAGE_URLS.includes(`shop-art/${name}.png`));
 for(const name of ['HUD_JumpButton_01','HUD_FireButton_01','HUD_PauseBtn_01'])assert.ok(UI_IMAGE_URLS.includes(`icons/${name}.png`));
});
