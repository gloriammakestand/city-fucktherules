/* city-store.js (v34): interior toko FUCK THE RULES bergaya Game Store (lantai keramik, rak gantung kaos, meja kasir).
   v34: rak dikelompokkan per kategori seperti Game Store (PRE ORDER di belakang tengah, READY STOCK di dinding kiri, SOLD OUT di dinding kanan),
   tulisan kategori muncul saat pemain mendekat rak (ketuk = buka katalog kategori itu), dan label tampak atas.
   Produk diambil dari katalog toko utama lewat fttr-shop.js (modul yang sama dengan Game Store): ketuk gantungan = lihat produk,
   masukkan ke tas, bayar lewat kasir (Midtrans). Katalog dimuat saat pemain pertama kali masuk toko. */
export function createStore(C){
  const T=C.THREE;
  let shop=null,loading=null,R=null,rackG=null,own=[],bag=null,bagN=0,sig='',failed=false,pill=null,labels=null,raf=0,panelOpen=false,zoneNow=null;
  const COLORS=[[/hitam|black/,'#1b1c1a'],[/putih|white/,'#efece0'],[/maroon|marun|burgundy/,'#6a1f2a'],[/merah|red/,'#b8322f'],[/navy|dongker/,'#1f2f55'],[/biru|blue/,'#3a64b0'],[/olive|army/,'#5d6a3a'],[/hijau|green/,'#4a7a4a'],[/kuning|yellow|gold/,'#dcb43a'],[/abu|grey|gray/,'#8d8f90'],[/coklat|brown|mocca|mocha/,'#7a5a3a'],[/krem|cream|beige|sand/,'#e6dcc0'],[/orange|oranye/,'#e07a30'],[/pink|merah muda/,'#e08aa8'],[/ungu|purple/,'#6a4a9a']];
  const hexOf=p=>{const n=String((p.colors&&p.colors[0])||'').toLowerCase();for(const [re,h] of COLORS)if(re.test(n))return h;return '#6b6f72';};
  const mats={};const mat=(c,o)=>{const k=c+JSON.stringify(o||{});return mats[k]||(mats[k]=new T.MeshStandardMaterial({color:c,roughness:.85,...(o||{})}));};
  const cv=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),c);const t=new T.CanvasTexture(c);t.anisotropy=4;return t;};
  const plane=(g,w,h,tex,x,y,z,rx,ry)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true}));m.position.set(x,y,z);if(rx)m.rotation.x=rx;if(ry)m.rotation.y=ry;g.add(m);return m;};

  /* ---------- ruangan statis ---------- */
  function build(){
    if(C.ROOMS.store&&C.ROOMS.store.g)C.scene.remove(C.ROOMS.store.g);
    R=C.shell('store',{name:'FUCK THE RULES STORE',f1:'#cfccc4',f2:'#c5c2ba',wall:'#d4d4d0',spawn:[0,4.6]});const g=R.g,B=C.box;
    // jendela celah di dinding belakang + papan logo
    [-5.2,-.4,4.6].forEach(x=>B(g,2.4,.3,.06,'#9fc4cf',x,2.05,-5.82,{shadow:false}));
    const logoImg=new Image();logoImg.src='logo.png?v=33';
    const board=cv(768,240,(x,c)=>{const draw=()=>{x.fillStyle='#171914';x.fillRect(0,0,768,240);x.strokeStyle='#d7ff3f';x.lineWidth=8;x.strokeRect(10,10,748,220);x.fillStyle='#d7ff3f';x.font='900 74px Inter,Arial,sans-serif';x.textAlign='left';x.textBaseline='middle';x.fillText('FUCK THE RULES',200,92);x.fillStyle='#f2efdf';x.font='700 34px Inter,Arial,sans-serif';x.fillText('STREETWEAR STORE · FOOTBALL CULTURE',200,172);if(logoImg.complete&&logoImg.naturalWidth){const h=190,w=logoImg.naturalWidth/logoImg.naturalHeight*h;x.drawImage(logoImg,40+(130-w)/2,25,w,h);}};draw();logoImg.onload=()=>{draw();bt.needsUpdate=true;};});
    const bt=board;plane(g,4.2,1.31,board,0,2.15,-5.78);
    // teks TOKO di lantai, seperti ruang toko di AI Office
    plane(g,2.6,.9,cv(512,180,x=>{x.fillStyle='rgba(23,25,20,.0)';x.fillRect(0,0,512,180);x.fillStyle='rgba(30,32,28,.78)';x.font='900 120px Inter,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('TOKO',256,92);}),-4.8,.045,3.1,-Math.PI/2,0).rotation.z=.12;
    // meja kasir hitam berlapis putih + rak lipatan kaos di belakangnya
    B(g,3.6,.95,1.0,'#15160f',5,.5,3.7);B(g,3.7,.1,1.1,'#ebe9e2',5,1.02,3.7);B(g,.7,.5,.14,'#2a2d28',4.2,1.35,3.55);B(g,.55,.34,.08,'#91b5a7',4.2,1.38,3.47,{shadow:false});
    B(g,2.8,1.7,.5,'#15160f',5,.85,5.1);
    const fold=['#1b1c1a','#efece0','#b8322f','#1f2f55','#dcb43a','#8d8f90'];for(let r=0;r<3;r++)for(let i=0;i<5;i++)B(g,.42,.3,.34,fold[(i+r*2)%6],3.9+i*.55,.35+r*.5,5.1,{shadow:false});
    C.sign(g,'KASIR',5,1.95,5.34,1.8,.34,'#d7ff3f','#171914');
    C.person(g,5.9,4.55,'#d7ff3f',Math.PI);
    // kardus, bangku, tanaman
    B(g,1.4,.8,1,'#c9a574',-6.9,.4,3.6);B(g,1.1,.6,.9,'#b8935f',-5.7,.3,4.4);B(g,2.2,.12,.8,'#8a6a4a',-2.2,.5,4.6);B(g,.1,.5,.7,'#5a4a3a',-3.1,.25,4.6);B(g,.1,.5,.7,'#5a4a3a',-1.3,.25,4.6);
    C.plant(g,-6.2,-5.45);C.plant(g,6.2,-5.45);C.lamp(g,-3,3,'#171914');C.lamp(g,3,3,'#171914');
    // papan KATALOG (semua produk) di dinding kiri depan, di atas kardus; meja AKSESORIS di sebelahnya
    B(g,.1,1.3,1.3,'#15160f',-7.8,1.4,3.6);C.sign(g,'KATALOG',-7.7,2.0,3.6,1.15,.3,'#d7ff3f','#171914').rotation.y=Math.PI/2;
    C.hit(R,.8,1.3,1.4,-7.6,1.3,3.6,'shop-catalog',{dz:0,dx:1.8});
    B(g,.7,.75,1.2,'#15160f',-7.45,.375,2.5);B(g,.76,.06,1.26,'#ebe9e2',-7.45,.78,2.5);
    C.sign(g,'AKSESORIS',-7.7,1.55,2.5,1.15,.3,'#d7ff3f','#171914').rotation.y=Math.PI/2;
    C.hit(R,.9,1.1,1.4,-7.45,.6,2.5,'shop-acc',{dz:0,dx:1.8});
    C.hit(R,3.9,1.5,1.5,5,.75,3.8,'shop-kasir',{dz:1.7});
    rackG=new T.Group();g.add(rackG);layout();
    // tombol tas (muncul hanya di dalam toko)
    bag=document.createElement('button');bag.id='storeBag';bag.hidden=true;bag.textContent='🛍 TAS · KASIR';
    bag.style.cssText='position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:60;background:#d7ff3f;color:#171914;border:2px solid #171914;border-radius:999px;padding:12px 20px;font:800 14px Inter,Arial,sans-serif;letter-spacing:.03em;box-shadow:0 6px 0 #171914;';
    bag.addEventListener('click',()=>open('cart'));document.body.appendChild(bag);
    // tulisan kategori saat mendekat rak (ketuk = buka katalog kategori itu)
    if(pill)pill.remove();if(labels)labels.remove();
    pill=document.createElement('button');pill.id='storeZone';pill.style.display='none';
    pill.style.cssText='display:none;position:fixed;left:50%;bottom:196px;transform:translateX(-50%);z-index:61;background:#171914;color:#d7ff3f;border:2px solid #d7ff3f;border-radius:16px;padding:10px 20px;font:900 16px Inter,Arial,sans-serif;letter-spacing:.05em;text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.35);cursor:pointer;';
    pill.addEventListener('click',()=>{if(zoneNow)zoneAct(zoneNow);});document.body.appendChild(pill);
    // label kategori untuk tampilan ATAS
    labels=document.createElement('div');labels.id='storeTopLabels';labels.style.cssText='display:none;position:fixed;left:0;top:0;right:0;bottom:0;z-index:55;pointer-events:none;';
    ZONES.forEach(z=>{const b=document.createElement('button');b.textContent=z.name;b.style.cssText='position:absolute;transform:translate(-50%,-50%);pointer-events:auto;background:#d7ff3f;color:#171914;border:2px solid #171914;border-radius:999px;padding:7px 12px;font:900 12px Inter,Arial,sans-serif;letter-spacing:.04em;box-shadow:0 3px 0 #171914;white-space:nowrap;cursor:pointer;';b.addEventListener('click',e=>{e.stopPropagation();zoneAct(z);});z.chip=b;labels.appendChild(b);});
    document.body.appendChild(labels);
    return R;
  }

  /* ---------- gantungan dari produk ---------- */
  const thumbCache=new Map(),loader=new T.TextureLoader();loader.setCrossOrigin('anonymous');
  const thumbUrl=u=>/res\.cloudinary\.com/.test(u||'')&&/\/upload\//.test(u)?u.replace('/upload/','/upload/f_auto,q_auto,w_160/'):u;
  function getThumb(p,cb){const u=thumbUrl(p.thumb||p.design);if(!u)return;if(thumbCache.has(u)){const t=thumbCache.get(u);if(t)cb(t);return;}thumbCache.set(u,null);loader.load(u,t=>{thumbCache.set(u,t);cb(t);},undefined,()=>{});}
  /* ---------- rak per kategori: tata letak sama dengan Game Store ---------- */
  const SP=.8,ROW=1.9;
  // k = badge produk; x,z = awal baris pertama; dx/dz = arah deret gantungan; ix/iz = arah baris kedua; ry = arah hadap kaos
  const GROUPS=[
    {k:'ready',name:'READY STOCK',x:-7.15,z:-4.5,dx:0,dz:1,ry:Math.PI/2,ix:1,iz:0,max:8},
    {k:'sold',name:'SOLD OUT',x:7.15,z:-4.5,dx:0,dz:1,ry:-Math.PI/2,ix:-1,iz:0,max:8},
    {k:'pre',name:'PRE ORDER',x:-3.4,z:-3.6,dx:1,dz:0,ry:0,ix:0,iz:1,max:10,rg:1.4}];
  // zona sentuh (untuk tulisan saat mendekat + label tampak atas): r = [x0,z0,x1,z1], ax/az = titik label
  const ZONES=GROUPS.map(g=>{const rg=g.rg||ROW,span=(g.max-1)*SP,xs=[],zs=[];for(let r=0;r<2;r++){const ox=g.x+g.ix*r*rg,oz=g.z+g.iz*r*rg;xs.push(ox,ox+g.dx*span);zs.push(oz,oz+g.dz*span);}
    const x0=Math.min(...xs)-.5,x1=Math.max(...xs)+.5,z0=Math.min(...zs)-.5,z1=Math.max(...zs)+.5;return {k:g.k,name:g.name,r:[x0,z0,x1,z1],ax:(x0+x1)/2,az:(z0+z1)/2};})
    .concat([{k:'acc',name:'AKSESORIS',r:[-8,1.6,-6.5,3.4],ax:-7.2,az:2.5},{k:'all',name:'KATALOG',r:[-8,3.2,-6.4,4.4],ax:-7.2,az:3.9},{k:'kasir',name:'KASIR',r:[3.2,2.7,6.8,4.7],ax:5,az:3.7}]);
  const zoneDist=(r,x,z)=>Math.hypot(Math.max(r[0]-x,0,x-r[2]),Math.max(r[1]-z,0,z-r[3]));
  function layout(){
    if(!R||!rackG)return;
    const prods=shop?shop.S.products:[];const key=prods.map(p=>p.id+p.badge+(p.thumb||'')).join(',')+(shop?shop.S.status:'-');if(key===sig&&rackG.children.length)return;sig=key;
    while(rackG.children.length)rackG.remove(rackG.children[0]);
    own.forEach(h=>{const i=R.hits.indexOf(h);if(i>=0)R.hits.splice(i,1);R.g.remove(h);});own=[];
    const B=C.box;let nThumb=0;
    if(!prods.length){C.sign(rackG,shop&&shop.S.status==='error'?'KATALOG GAGAL DIMUAT':'MEMUAT KATALOG…',0,2.3,-1.2,4.2,.45,'#171914','#d7ff3f');}
    GROUPS.forEach(g=>{
      const rg=g.rg||ROW,list=prods.filter(p=>p.badge===g.k).slice(0,g.max*2);
      for(let row=0;row<2;row++){
        const part=list.slice(row*g.max,(row+1)*g.max);if(!part.length)continue;
        const ox=g.x+g.ix*row*rg,oz=g.z+g.iz*row*rg,span=(part.length-1)*SP,len=span+.95,cx=ox+g.dx*span/2,cz=oz+g.dz*span/2;
        const rod=new T.Mesh(new T.CylinderGeometry(.03,.03,len,8),mat('#2a2d28'));if(g.dx)rod.rotation.z=Math.PI/2;else rod.rotation.x=Math.PI/2;rod.position.set(cx,1.82,cz);rackG.add(rod);
        [[cx-g.dx*len/2,cz-g.dz*len/2],[cx+g.dx*len/2,cz+g.dz*len/2]].forEach(([x,z])=>{const po=new T.Mesh(new T.CylinderGeometry(.035,.035,1.82,8),mat('#2a2d28'));po.position.set(x,.91,z);rackG.add(po);B(rackG,.5,.05,.5,'#171914',x,.03,z,{shadow:false});});
        part.forEach((p,i)=>{
          const x=ox+g.dx*i*SP,z=oz+g.dz*i*SP,col=p.badge==='sold'?'#77797a':hexOf(p);
          const gp=new T.Group();gp.position.set(x,0,z);gp.rotation.y=g.ry;rackG.add(gp);
          B(gp,.04,.22,.04,'#2a2d28',0,1.74,0,{shadow:false});B(gp,.62,.03,.03,'#2a2d28',0,1.62,0,{shadow:false});
          B(gp,.5,.64,.1,col,0,1.28,0);[-1,1].forEach(s=>{const sl=B(gp,.22,.26,.1,col,s*.35,1.5,0);sl.rotation.z=-s*.5;});B(gp,.2,.06,.11,'#141511',0,1.6,0,{shadow:false});
          if(p.badge==='sold')B(gp,.3,.12,.03,'#c93a3a',0,1.05,.07,{shadow:false});
          const pic=new T.Mesh(new T.PlaneGeometry(.34,.34),new T.MeshBasicMaterial({transparent:true,opacity:1}));pic.position.set(0,1.3,.065);pic.visible=false;gp.add(pic);
          if(nThumb++<40)getThumb(p,t=>{pic.material.map=t;pic.material.needsUpdate=true;pic.visible=true;});
          // kotak sentuh mengikuti arah hadap rak (rak dinding: lebar & kedalaman ditukar, berdiri di depan kaos)
          own.push(g.dx?C.hit(R,.86,1.5,.6,x,1.1,z,'shop-hanger:'+p.id,{dz:1.5}):C.hit(R,.6,1.5,.86,x,1.1,z,'shop-hanger:'+p.id,{dz:0,dx:g.ry>0?1.5:-1.5}));
        });
      }
      // papan nama kategori di atas rak
      const span=(g.max-1)*SP,mx=g.x+g.dx*span/2,mz=g.z+g.dz*span/2;
      if(g.dz&&g.ry>0){B(rackG,.08,.5,2.7,'#171914',-7.82,2.3,mz,{shadow:false});C.sign(rackG,g.name,-7.76,2.3,mz,2.6,.4,'#d7ff3f','#171914').rotation.y=Math.PI/2;}
      else if(g.dz){B(rackG,.08,.5,2.7,'#171914',7.5,2.3,mz,{shadow:false});C.sign(rackG,g.name,7.44,2.3,mz,2.6,.4,'#d7ff3f','#171914').rotation.y=-Math.PI/2;[-1.3,1.3].forEach(d=>B(rackG,.06,2.3,.06,'#2a2d28',7.5,1.15,mz+d,{shadow:false}));}
      else{B(rackG,2.7,.5,.08,'#171914',mx,2.3,-3.96,{shadow:false});C.sign(rackG,g.name,mx,2.3,-3.9,2.6,.4,'#d7ff3f','#171914');[-1.3,1.3].forEach(d=>B(rackG,.06,2.3,.06,'#2a2d28',mx+d,1.15,-3.96,{shadow:false}));}
    });
    if(C.inStore())C.refreshPickables();
    updateBag();
  }

  /* ---------- toko utama (katalog, tas, checkout) ---------- */
  function ensure(){
    if(shop)return Promise.resolve(shop);
    if(loading)return loading;
    loading=import('./fttr-shop.js?v=33').then(m=>{shop=m;
      m.bindUI({onChange:open=>{panelOpen=!!open;if(bag)bag.style.visibility=open?'hidden':'visible';},onCart:n=>{bagN=n;updateBag();},toast:t=>C.toast(t),beep(){}});
      return m.initShop(()=>layout()).then(()=>{layout();return m;});
    }).catch(e=>{console.error('toko gagal dimuat',e);failed=true;C.toast('Katalog toko belum bisa dimuat. Periksa koneksi lalu masuk lagi.');loading=null;return null;});
    return loading;
  }
  function updateBag(){if(!bag)return;bagN=shop?shop.cartCount():bagN;bag.textContent='🛍 TAS ('+bagN+') · KASIR';}
  function open(what,arg){
    ensure().then(m=>{if(!m)return;
      if(what==='cart')m.openCart();
      else if(what==='product')m.openProduct(arg,()=>m.openCatalog());
      else m.openCatalog(arg||'all');});}
  // ketuk tulisan kategori: masuk ke katalog kategori itu (KASIR membuka tas)
  function zoneAct(z){if(z.k==='kasir')act('shop-kasir');else open('catalog',z.k);}
  function act(a){
    if(a==='shop-catalog'){open('catalog','all');return true;}
    if(a==='shop-acc'){open('catalog','acc');return true;}
    if(a==='shop-kasir'){if(shop&&shop.cartCount()===0){open('catalog','all');C.toast('Tasmu masih kosong. Pilih produk dulu, lalu kembali ke kasir.');}else open('cart');return true;}
    if(a.startsWith('shop-hanger:')){open('product',a.slice(12));return true;}
    return false;}
  /* ---------- tiap frame di dalam toko: tulisan saat mendekat rak + label tampak atas ---------- */
  const _v=new T.Vector3();
  function tick(){
    raf=requestAnimationFrame(tick);
    const pl=C.getPlayer&&C.getPlayer(),cam=C.getCamera&&C.getCamera();if(!pl||!cam||!pill)return;
    const top=!!(C.isTop&&C.isTop());
    let best=null,bd=1e9;ZONES.forEach(z=>{const d=zoneDist(z.r,pl.position.x,pl.position.z);if(d<bd){bd=d;best=z;}});
    const near=!top&&!panelOpen&&best&&bd<=1.9?best:null;
    if(near!==zoneNow){zoneNow=near;if(near){pill.innerHTML='<span>'+near.name+'</span><small style="display:block;margin-top:2px;font:700 10px Inter,Arial,sans-serif;letter-spacing:.08em;opacity:.8">'+(near.k==='kasir'?'KETUK UNTUK BAYAR':'KETUK UNTUK LIHAT')+'</small>';}pill.style.display=near?'block':'none';}
    const showL=top&&!panelOpen;if(labels.style.display!==(showL?'block':'none'))labels.style.display=showL?'block':'none';
    if(showL)ZONES.forEach(z=>{_v.set(z.ax,1.9,z.az).project(cam);z.chip.style.left=((_v.x*.5+.5)*innerWidth)+'px';z.chip.style.top=((-_v.y*.5+.5)*innerHeight)+'px';});
  }
  function stopTick(){if(raf)cancelAnimationFrame(raf);raf=0;zoneNow=null;if(pill)pill.style.display='none';if(labels)labels.style.display='none';}
  return {
    build,
    onEnter(){if(bag){bag.hidden=false;bag.style.visibility='visible';}if(failed){failed=false;loading=null;}ensure().then(()=>layout());if(!raf)tick();},
    onExit(){if(bag)bag.hidden=true;stopTick();if(shop)try{shop.closePanel();}catch(e){}},
    act,
    layout
  };
}
