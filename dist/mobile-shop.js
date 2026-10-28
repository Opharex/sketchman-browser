const art=n=>`shop-art/${n}.png`;
const categories=[['Coins',0,0],['Profit',1,0],['Powerups',0,1],['Record Breakers',1,1],['Extra Power',0,2],['Weapons',1,2]];
const weaponCopy={5:['Semi-Auto','Improve your chances<br>with superior fire rate!'],2:['Sub Machine Gun','Be unstoppable<br>with super fast fire rate!'],1:['Shotgun','Take out more than<br>one enemy at a time!'],4:['Bow','Explosive power<br>Robin Hood style!'],7:['Shockwave','Short range Sonic Wave that<br>blasts multiple foes at once!'],3:['RPG',"Blast'em away<br>with power!"],6:['Homing Missiles','What more can you<br>ask for?'],8:['Super Sketchman','Why run when you can fly?<br>Go Super Sketchman!'],9:['Shadow Clones','Deadly Shadow Clones<br>that rip through your enemies!']};
const weaponOrder=[5,2,1,4,7,3,6,8,9];
export function renderMobileShop({root,save,weapons,items,onBack,onWeapon,onBuy,onEquip,onSound=()=>{},category=null,scrollTop=null}){
 const fmt=n=>Math.floor(n).toLocaleString();
 root.innerHTML='';const shop=document.createElement('section');shop.className='mobile-shop';shop.setAttribute('aria-label','Shop');root.append(shop);
 const button=(label,fn,cls)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.setAttribute('aria-label',label);b.onclick=()=>{onSound();fn();};return b;};
 const rebuild=(cat,top=null)=>renderMobileShop({root,save,weapons,items,onBack,onWeapon,onBuy,onEquip,onSound,category:cat,scrollTop:top});
 if(!category){
  shop.classList.add('shop-categories');
  const img=document.createElement('img');img.className='shop-categories-art';img.src='assets/Graphics/Store/STR_Categories_Back_01.jpg';img.alt='Choose a Category';shop.append(img);
  for(const [name,col,row]of categories){const b=button(name,()=>rebuild(name),'shop-category-hit');b.style.cssText=`left:${col?55:9.8}%;top:${13.1+row*24.9}%;width:35.6%;height:23%`;shop.append(b);}
  const back=button('Back',onBack,'shop-category-back');shop.append(back);return;
 }
 const list=document.createElement('div');list.className='shop-list';list.tabIndex=0;list.setAttribute('aria-label','Shop items');shop.append(list);
 const sections={};
 for(const [name]of categories){
  const heading=document.createElement('h2');heading.className='shop-divider';heading.innerHTML=`<span>${name}</span><img src="${art('STR_Splitter_01')}" alt="">`;sections[name]=heading;list.append(heading);
  if(name==='Coins'){
   for(const [i,title]of ['Handful of Coins','Pocket Full of Coins','Bag Full of Coins','Chest Full of Coins'].entries()){
    const row=document.createElement('article');row.className='shop-row shop-coin-row';row.innerHTML=`<img class="shop-item-art" src="${art(['STR_ICO_Coins2500_01','STR_ICO_Coins5000_01','STR_ICO_Coins15000_01','STR_ICO_Coins90000_01'][i])}" alt=""><div class="shop-item-copy"><h3>${title}</h3><p>Earn coins by playing<br>and completing missions!</p></div>`;list.append(row);
   }continue;
  }
  const entries=name==='Weapons'?weaponOrder.map(id=>({...weapons[id],weapon:true})):items.filter(i=>i.category===name);
  for(const item of entries){
   const row=document.createElement('article');row.className='shop-row';const owned=item.weapon?save.unlocked.includes(item.id):item.permanent&&save.permanent[item.id];
   const title=item.weapon?weaponCopy[item.id][0]:item.permanent?`Permanent - ${item.name}`:`${item.qty} x ${item.name}`;
   row.innerHTML=`<img class="shop-item-art" src="${art(item.icon)}" alt=""><div class="shop-item-copy"><h3>${title}</h3><p>${item.weapon?weaponCopy[item.id][1]:item.desc}</p></div><div class="shop-price"><span>Cost</span><strong>${fmt(item.cost)}</strong></div>${!item.weapon&&!item.permanent?`<div class="shop-stock"><span>Stock</span><strong>${save.stock[item.id]||0}</strong></div>`:''}`;
   const purchase=button(owned?(item.weapon?'Equip '+item.name:'Purchased '+item.name):'Buy '+item.name,()=>{const top=list.scrollTop;const ok=item.weapon?onWeapon(item.id):onBuy(item);if(ok)rebuild(category,top);},'shop-buy');
   if(owned&&!item.weapon)purchase.disabled=true;
   const selected=item.weapon&&save.selected===item.id;
   if(selected)purchase.disabled=true;
   purchase.innerHTML=`<img class="shop-buy-base" src="${art('STR_BuyBtn_01')}" alt="">${owned?`<span class="shop-buy-owned">${item.weapon?(selected?'Equipped':'Equip'):'Purchased'}</span>`:`<img class="shop-buy-label" src="${art('STR_Buy_01')}" alt="Buy">`}`;
   if(owned&&!item.weapon)purchase.innerHTML=`<img class="shop-purchased" src="${art('STR_Purchased_01')}" alt="Purchased">`;
   row.append(purchase);
   if(!item.weapon&&!item.permanent){const enabled=save.equipped.includes(item.id),toggle=button((enabled?'Disable ':'Enable ')+item.name,()=>{const top=list.scrollTop;if(onEquip(item))rebuild(category,top);},'shop-enable');toggle.textContent=enabled?'✓ Enabled':'Enable';toggle.setAttribute('aria-pressed',String(enabled));row.append(toggle);}
   list.append(row);
  }
 }
 const hud=document.createElement('div');hud.className='shop-hud';hud.innerHTML=`<img src="${art('STR_HUD_01')}" alt=""><strong aria-label="Coin balance">${fmt(save.coins)}</strong>`;
 const back=button('Choose a category',()=>rebuild(null),'shop-hud-back');hud.append(back);shop.append(hud);
 requestAnimationFrame(()=>{if(!list.isConnected)return;list.scrollTop=scrollTop??sections[category].offsetTop;});
}
