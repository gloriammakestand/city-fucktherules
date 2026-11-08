/* city-housing.js (v29): hunian kota. Setiap rumah, apartemen, dan rumah desa bisa ditekan:
   kosong = dijual, terisi = keterangan penghuni (misal 3/4), milik pemain = bisa istirahat. */
const KEY='fttr.city.houses.v1';
const hash=n=>{let a=(Math.imul(n+1,2654435761))>>>0;a=(a^(a>>>15))>>>0;a=Math.imul(a,2246822519)>>>0;a=(a^(a>>>13))>>>0;return a/4294967296;};
const FLOWER=['Mawar','Melati','Kenanga','Anggrek','Dahlia','Cempaka','Flamboyan','Teratai','Kamboja','Seruni','Tulip','Lavender','Kemuning','Bougenvil'];
const MAIN=['Jl. Raya Central','Jl. Merdeka','Jl. Sudirman','Jl. Pantai','Jl. Stadion','Jl. Veteran'];
const rp=n=>'₡'+Number(n).toLocaleString('id-ID');
export function createHousing(ctx){
  const {lots=[],village=[],layout,regPlace}=ctx;
  let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(e){}};
  const list=[],byId=new Map(),keys=new Map(),counter=new Map();let seq=0,restAt=0;
  const streetOf=(x,z)=>{
    const r=layout?layout.nearest(x,z,-1,3):null,e=r&&r.e>=0?layout.allEdges[r.e]:null;
    if(!e||!e.pts||e.pts.length<2)return {name:'Jl. Raya',key:'raya'};
    const a=e.pts[0],b=e.pts[e.pts.length-1],horiz=Math.abs(b.x-a.x)>=Math.abs(b.z-a.z),key=(e.lane?'g':'r')+(horiz?'z'+Math.round(a.z/4):'x'+Math.round(a.x/4));
    if(!keys.has(key))keys.set(key,keys.size);const i=keys.get(key);
    if(e.lane)return {name:'Gang '+FLOWER[(i*5+3)%FLOWER.length],key};
    if((e.cls||2)>=3)return {name:MAIN[i%MAIN.length],key};
    return {name:'Jl. '+FLOWER[(i*3+1)%FLOWER.length],key};};
  const add=(src,kind,area)=>{
    const i=seq++,{x,z,w,d,rot}=src;let cap,type,name,addr,price=null;
    if(kind==='apt'){cap=Math.max(8,Math.round(w*d/2.4));type='APARTEMEN';}
    else if(kind==='village'){cap=4;type='RUMAH DESA';}
    else{cap=w*d<24?4:6;type='RUMAH';}
    if(kind==='village'){const n=(counter.get(area)||0)+1;counter.set(area,n);const nm=area.replace(/^DESA |^KAB\. /,'');const t=nm.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());name='Rumah '+t+' '+n;addr='Dusun '+t+' No. '+n+', '+(area.startsWith('KAB')?'Kabupaten':'Desa')+' '+t;}
    else{const st=streetOf(x,z),n=(counter.get(st.key)||0)+1;counter.set(st.key,n);const short=st.name.replace(/^Jl\. |^Gang /,'').replace(/^Raya /,'');name=(kind==='apt'?'Apartemen ':'Rumah ')+short+' '+n;addr=st.name+' No. '+n+', Central City';}
    if(kind==='house')price=Math.round((620+w*d*30)/10)*10;
    if(kind==='village')price=Math.round((380+w*d*22)/10)*10;
    const hv=hash(i*7+3),hr=hash(i*13+5);let res;
    if(kind==='apt')res=Math.max(2,Math.floor(cap*(.4+.55*hr)));
    else res=hv<.38?0:1+Math.floor(hr*cap);
    const id='H'+String(i+1).padStart(3,'0'),h={id,kind,type,name,addr,x,z,w,d,rot:rot||0,cap,price,res0:res,res,owned:false,area:area||'Central City'};
    if(saved[id]&&price){h.owned=true;h.res=1;}
    h.fx=x+Math.sin(h.rot)*(d/2+2.6);h.fz=z+Math.cos(h.rot)*(d/2+2.6);
    list.push(h);byId.set(id,h);
    regPlace({id,name,type,desc:addr,glyph:kind==='apt'?'🏢':'🏠',tag:'HUNIAN',x,z,w:w+.6,d:d+.6,H:kind==='apt'?9:3.4,fx:h.fx,fz:h.fz,hours:'',house:h});
    return h;};
  lots.forEach(l=>{if(l.kind==='house')add(l,'house');else if(l.kind==='apt')add(l,'apt');});
  village.forEach(v=>add({x:v.x,z:v.z,w:v.w,d:v.d,rot:v.rot},'village',v.area));
  const api={list,byId,
    statusShort(h){if(h.owned)return 'MILIKMU · '+h.res+'/'+h.cap;if(h.res===0&&h.price)return 'KOSONG · '+rp(h.price);return 'DIHUNI '+h.res+'/'+h.cap;},
    statusLong(h){if(h.owned)return 'Rumah milikmu. Penghuni '+h.res+'/'+h.cap+'. Istirahat di sini memulihkan Energy dan Mood.';if(h.res===0&&h.price)return 'Masih kosong, dijual '+rp(h.price)+'. Kapasitas '+h.cap+' orang.';return 'Dihuni '+h.res+' dari '+h.cap+' warga.';},
    action(h,money){if(h.owned)return {label:'ISTIRAHAT DI RUMAH'};if(h.res===0&&h.price)return {label:'BELI '+rp(h.price)};return null;},
    buy(h,c){if(h.owned||h.res>0||!h.price)return {ok:false,msg:'Rumah ini tidak dijual'};if(c.money<h.price){c.toast('Saldo tidak cukup · butuh '+rp(h.price));return {ok:false};}
      c.setMoney(c.money-h.price);saved[h.id]=1;h.owned=true;h.res=1;save();c.toast('Rumah dibeli · '+h.name);return {ok:true};},
    rest(h,c){const now=Date.now();if(now-restAt<45000){c.toast('Kamu baru saja istirahat');return {ok:false};}restAt=now;c.recoverNeed('energy',20);c.recoverNeed('mood',8);c.toast('Istirahat di '+h.name+' · Energy +20');return {ok:true};},
    act(h,c){if(h.owned)return api.rest(h,c);return api.buy(h,c);},
    forSale(n=10){return list.filter(h=>!h.owned&&h.res===0&&h.price).sort((a,b)=>a.price-b.price).slice(0,n);},
    mine(){return list.filter(h=>h.owned);},
    phoneHTML(row){const mine=api.mine(),sale=api.forSale(10),total=list.filter(h=>!h.owned&&h.res===0&&h.price).length;
      return '<div class="phone-section-title">RUMAHKU</div>'+(mine.length?mine.map(h=>row('🏡',h.name,h.addr+' · penghuni '+h.res+'/'+h.cap,'house-view:'+h.id,'LIHAT')).join(''):'<div class="message">Kamu belum punya rumah. Pilih rumah kosong di bawah atau tekan rumah di peta.</div>')+
      '<div class="phone-section-title">RUMAH DIJUAL ('+total+' kosong)</div>'+(sale.length?sale.map(h=>row('🏠',h.name,h.addr+' · '+rp(h.price),'house-buy:'+h.id,'BELI')).join(''):'<div class="message">Belum ada rumah kosong.</div>');}
  };
  return api;
}
