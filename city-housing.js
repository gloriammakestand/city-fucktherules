/* city-housing.js (v31): semua bangunan di kota dan desa terdaftar sebagai tempat yang bisa ditekan dan dimasuki.
   Rumah, rumah desa, dan apartemen SEMUANYA bisa dibeli (kosong = harga normal, berpenghuni = harga + ganti rugi). */
const KEY='fttr.city.houses.v1';
const hash=n=>{let a=(Math.imul(n+1,2654435761))>>>0;a=(a^(a>>>15))>>>0;a=Math.imul(a,2246822519)>>>0;a=(a^(a>>>13))>>>0;return a/4294967296;};
const FLOWER=['Mawar','Melati','Kenanga','Anggrek','Dahlia','Cempaka','Flamboyan','Teratai','Kamboja','Seruni','Tulip','Lavender','Kemuning','Bougenvil'];
const MAIN=['Jl. Raya Central','Jl. Merdeka','Jl. Sudirman','Jl. Pantai','Jl. Stadion','Jl. Veteran'];
const rp=n=>'₡'+Number(n).toLocaleString('id-ID');
export function createHousing(ctx){
  const {lots=[],village=[],layout,regPlace}=ctx;
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}};
  const list=[],buildings=[],byId=new Map(),keys=new Map(),counter=new Map();let seq=0,restAt=0;
  const streetOf=(x,z)=>{
    const r=layout?layout.nearest(x,z,-1,3):null,e=r&&r.e>=0?layout.allEdges[r.e]:null;
    if(!e||!e.pts||e.pts.length<2)return {name:'Jl. Raya',key:'raya'};
    const a=e.pts[0],b=e.pts[e.pts.length-1],horiz=Math.abs(b.x-a.x)>=Math.abs(b.z-a.z),key=(e.lane?'g':'r')+(horiz?'z'+Math.round(a.z/4):'x'+Math.round(a.x/4));
    if(!keys.has(key))keys.set(key,keys.size);const i=keys.get(key);
    if(e.lane)return {name:'Gang '+FLOWER[(i*5+3)%FLOWER.length],key};
    if((e.cls||2)>=3)return {name:MAIN[i%MAIN.length],key};
    return {name:'Jl. '+FLOWER[(i*3+1)%FLOWER.length],key};};
  const unitPrice=h=>h.kind==='apt'?h.price:(h.res>0&&!h.owned?Math.round(h.price*1.3/10)*10:h.price);
  const add=(src,kind,area)=>{
    const i=seq++,{x,z,w,d,rot}=src;let cap,type,name,addr,price,room;
    if(kind==='apt'){cap=Math.max(8,Math.round(w*d/2.4));type='APARTEMEN';room='apt';price=Math.round((520+w*d*12)/10)*10;}
    else if(kind==='village'){cap=4;type='RUMAH DESA';room='hut';price=Math.round((380+w*d*22)/10)*10;}
    else{cap=w*d<24?4:6;type='RUMAH';room='home';price=Math.round((620+w*d*30)/10)*10;}
    if(kind==='village'){const n=(counter.get(area)||0)+1;counter.set(area,n);const nm=area.replace(/^DESA |^KAB\. /,'');const t=nm.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());name='Rumah '+t+' '+n;addr='Dusun '+t+' No. '+n+', '+(area.startsWith('KAB')?'Kabupaten':'Desa')+' '+t;}
    else{const st=streetOf(x,z),n=(counter.get(st.key)||0)+1;counter.set(st.key,n);const short=st.name.replace(/^Jl\. |^Gang /,'').replace(/^Raya /,'');name=(kind==='apt'?'Apartemen ':'Rumah ')+short+' '+n;addr=st.name+' No. '+n+', Central City';}
    const hv=hash(i*7+3),hr=hash(i*13+5);let res;
    if(kind==='apt')res=Math.max(2,Math.floor(cap*(.4+.55*hr)));else res=hv<.38?0:1+Math.floor(hr*cap);
    const id='H'+String(i+1).padStart(3,'0'),h={id,kind,type,name,addr,x,z,w,d,rot:rot||0,cap,price,room,res0:res,res,owned:false,area:area||'Central City'};
    if(saved[id]){h.owned=true;if(kind!=='apt')h.res=1;}
    h.fx=x+Math.sin(h.rot)*(d/2+2.6);h.fz=z+Math.cos(h.rot)*(d/2+2.6);
    list.push(h);byId.set(id,h);
    regPlace({id,name,type,desc:addr,glyph:kind==='apt'?'🏢':'🏠',tag:'HUNIAN',x,z,w:w+.6,d:d+.6,H:kind==='apt'?9:3.4,fx:h.fx,fz:h.fz,hours:'',house:h,room});
    return h;};
  /* bangunan non-hunian di kota: toko dan kantor juga bisa ditekan dan dimasuki */
  const addBuilding=(src,kind)=>{
    const {x,z,w,d,rot}=src,st=streetOf(x,z),n=(counter.get('b'+st.key)||0)+1;counter.set('b'+st.key,n);const short=st.name.replace(/^Jl\. |^Gang /,'').replace(/^Raya /,'');
    const shop=kind==='shop',name=(shop?'Toko ':'Kantor ')+short+' '+n,addr=st.name+' No. '+n+', Central City',type=shop?'TOKO':'KANTOR',room=shop?'shop':'office',r=rot||0;
    const fx=x+Math.sin(r)*(d/2+2.6),fz=z+Math.cos(r)*(d/2+2.6),id=(shop?'S':'K')+String(buildings.length+1).padStart(3,'0');
    buildings.push({id,name,addr,kind,x,z});
    regPlace({id,name,type,desc:addr+'. '+(shop?'Toko lokal yang buka sepanjang hari.':'Gedung perkantoran warga kota.'),glyph:shop?'🏪':'🏢',tag:shop?'TOKO':'KANTOR',x,z,w:w+.6,d:d+.6,H:shop?5:11,fx,fz,hours:'BUKA · 24 JAM',room});};
  lots.forEach(l=>{if(l.kind==='house')add(l,'house');else if(l.kind==='apt')add(l,'apt');else if(l.kind==='shop'||l.kind==='office')addBuilding(l,l.kind);});
  village.forEach(v=>add({x:v.x,z:v.z,w:v.w,d:v.d,rot:v.rot},'village',v.area));
  const api={list,buildings,byId,unitPrice,
    statusShort(h){if(h.owned)return h.kind==='apt'?'MILIKMU · 1 unit':'MILIKMU · '+h.res+'/'+h.cap;if(h.kind==='apt')return h.res+'/'+h.cap+' unit terisi';if(h.res===0)return 'KOSONG · '+rp(h.price);return 'DIHUNI '+h.res+'/'+h.cap;},
    statusLong(h){if(h.owned)return h.kind==='apt'?'Kamu memiliki satu unit di sini. Istirahat di unitmu memulihkan Energy dan Mood.':'Rumah milikmu. Penghuni '+h.res+'/'+h.cap+'. Istirahat di sini memulihkan Energy dan Mood.';
      if(h.kind==='apt')return h.res+' dari '+h.cap+' unit terisi. Satu unit bisa dibeli '+rp(h.price)+'.';
      if(h.res===0)return 'Masih kosong, dijual '+rp(h.price)+'. Kapasitas '+h.cap+' orang.';
      return 'Dihuni '+h.res+' dari '+h.cap+' warga. Tetap bisa dibeli '+rp(unitPrice(h))+' (termasuk ganti rugi, penghuni lama pindah).';},
    action(h){if(h.owned)return {label:'ISTIRAHAT'};return {label:'BELI '+rp(unitPrice(h))};},
    buy(h,c){if(h.owned)return {ok:false,msg:'Sudah milikmu'};const p=unitPrice(h);if(c.money<p){c.toast('Saldo tidak cukup · butuh '+rp(p));return {ok:false};}
      c.setMoney(c.money-p);saved[h.id]=1;h.owned=true;if(h.kind!=='apt')h.res=1;save();c.toast((h.kind==='apt'?'Unit dibeli · ':'Rumah dibeli · ')+h.name);return {ok:true};},
    rest(h,c){const now=Date.now();if(now-restAt<45000){c.toast('Kamu baru saja istirahat');return {ok:false};}restAt=now;c.recoverNeed('energy',20);c.recoverNeed('mood',8);c.toast('Istirahat di '+h.name+' · Energy +20');return {ok:true};},
    act(h,c){if(h.owned)return api.rest(h,c);return api.buy(h,c);},
    forSale(n=12){return list.filter(h=>!h.owned).sort((a,b)=>((a.res>0&&a.kind!=='apt')-(b.res>0&&b.kind!=='apt'))||(unitPrice(a)-unitPrice(b))).slice(0,n);},
    mine(){return list.filter(h=>h.owned);},
    phoneHTML(row){const mine=api.mine(),sale=api.forSale(12),vac=list.filter(h=>!h.owned&&h.res===0&&h.kind!=='apt').length,all=list.filter(h=>!h.owned).length;
      return '<div class="phone-section-title">RUMAHKU</div>'+(mine.length?mine.map(h=>row('🏡',h.name,h.addr+' · '+api.statusShort(h),'house-view:'+h.id,'LIHAT')).join(''):'<div class="message">Kamu belum punya rumah. Semua rumah, rumah desa, dan unit apartemen bisa dibeli. Pilih di bawah atau tekan bangunan di peta.</div>')+
      '<div class="phone-section-title">DIJUAL · '+vac+' KOSONG · '+all+' BISA DIBELI</div>'+sale.map(h=>row(h.kind==='apt'?'🏢':'🏠',h.name,h.addr+' · '+api.statusShort(h)+' · '+rp(api.unitPrice(h)),'house-buy:'+h.id,'BELI')).join('');}
  };
  return api;
}
