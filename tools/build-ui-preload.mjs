import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const urls=new Set(['assets/Graphics/Store/STR_Categories_Back_01.jpg','assets/Graphics/Fonts/S1_Dialogs22_1.png']);
// Only artwork used by the current UI; retired category overlays are not loaded.
for(const name of fs.readdirSync(path.join(root,'shop-art')))if(name.endsWith('.png')&&!/^STR_(Coins|Extra|Power|Profit|Record|Weapons)_ON_01/.test(name))urls.add(`shop-art/${name}`);
for(const name of ['CHR_Jump_05','CHR_Glide_01','CHR_RunNGun_01','CON_Coin_01','CHR_Run_01','STR_ICO_WeaponA_01','HUD_JumpButton_01','HUD_FireButton_01','HUD_PauseBtn_01'])urls.add(`icons/${name}.png`);
for(const [,url]of fs.readFileSync(path.join(root,'style.css'),'utf8').matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))urls.add(url);
for(const url of urls)if(!fs.existsSync(path.join(root,url)))throw new Error(`Missing UI asset: ${url}`);
fs.writeFileSync(path.join(root,'ui-assets.js'),'// Complete UI image manifest; regenerate with node tools/build-ui-preload.mjs.\nexport const UI_IMAGE_URLS='+JSON.stringify([...urls].sort(),null,1)+';\n');
