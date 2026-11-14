/* city-store.js (v32): interior toko FUCK THE RULES bergaya Game Store (lantai keramik, rak gantung kaos, meja kasir).
   Produk diambil dari katalog toko utama lewat fttr-shop.js (modul yang sama dengan Game Store): ketuk gantungan = lihat produk,
   masukkan ke tas, bayar lewat kasir (Midtrans). Katalog dimuat saat pemain pertama kali masuk toko. */
export function createStore(C){
  const T=C.THREE;
  let shop=null,loading=null,R=null,rackG=null,own=[],bag=null,bagN=0,sig='',failed=false;
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
    const logoImg=new Image();logoImg.src='logo.png?v=32';
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
    C.plant(g,-7.3,-4.9);C.plant(g,7.3,-4.9);C.lamp(g,-3,3,'#171914');C.lamp(g,3,3,'#171914');
    // papan katalog di dinding kiri
    B(g,.1,1.5,2.4,'#15160f',-7.8,1.4,-1.2);C.sign(g,'KATALOG',-7.7,2.05,-1.2,2,.34,'#d7ff3f','#171914').rotation.y=Math.PI/2;
    C.hit(R,.8,1.8,2.6,-7.6,1,-1.2,'shop-catalog',{dz:0,dx:1.8});
    C.hit(R,3.9,1.5,1.5,5,.75,3.8,'shop-kasir',{dz:1.7});
    rackG=new T.Group();g.add(rackG);layout();
    // tombol tas (muncul hanya di dalam toko)
    bag=document.createElement('button');bag.id='storeBag';bag.hidden=true;bag.textContent='🛍 TAS · KASIR';
    bag.style.cssText='position:fixed;left:50%;bottom:104px;transform:translateX(-50%);z-index:60;background:#d7ff3f;color:#171914;border:2px solid #171914;border-radius:999px;padding:12px 20px;font:800 14px Inter,Arial,sans-serif;letter-spacing:.03em;box-shadow:0 6px 0 #171914;';
    bag.addEventListener('click',()=>open('cart'));document.body.appendChild(bag);
    return R;
  }

  /* ---------- gantungan dari produk ---------- */
  const thumbCache=new Map(),loader=new T.TextureLoader();loader.setCrossOrigin('anonymous');
  const thumbUrl=u=>/res\.cloudinary\.com/.test(u||'')&&/\/upload\//.test(u)?u.replace('/upload/','/upload/f_auto,q_auto,w_160/'):u;
  function getThumb(p,cb){const u=thumbUrl(p.thumb||p.design);if(!u)return;if(thumbCache.has(u)){const t=thumbCache.get(u);if(t)cb(t);return;}thumbCache.set(u,null);loader.load(u,t=>{thumbCache.set(u,t);cb(t);},undefined,()=>{});}
  const SLOTS=[[-4.9,-6.9,6.9],[-2.5,-6.9,6.9],[-.1,-6.9,6.9],[2.3,-6.9,.4]];
  function layout(){
    if(!R||!rackG)return;
    const prods=shop?shop.S.products.concat(shop.S.acc):[];const key=prods.map(p=>p.id+p.badge+(p.thumb||'')).join(',')+(shop?shop.S.status:'-');if(key===sig&&rackG.children.length)return;sig=key;
    while(rackG.children.length)rackG.remove(rackG.children[0]);
    own.forEach(h=>{const i=R.hits.indexOf(h);if(i>=0)R.hits.splice(i,1);R.g.remove(h);});own=[];
    const B=C.box;
    SLOTS.forEach(([z,x0,x1])=>{const m=new T.Mesh(new T.CylinderGeometry(.03,.03,x1-x0,8),mat('#2a2d28'));m.rotation.z=Math.PI/2;m.position.set((x0+x1)/2,1.82,z);rackG.add(m);[x0-.1,x1+.1].forEach(x=>{const p=new T.Mesh(new T.CylinderGeometry(.035,.035,1.82,8),mat('#2a2d28'));p.position.set(x,.91,z);rackG.add(p);B(rackG,.5,.05,.5,'#171914',x,.03,z,{shadow:false});});});
    let n=0;const per=[];SLOTS.forEach(([z,x0,x1])=>{const cap=Math.floor((x1-x0)/.9)+1;per.push(cap);});
    const total=per.reduce((a,b)=>a+b,0),shown=prods.slice(0,total);
    if(!shown.length){C.sign(rackG,shop&&shop.S.status==='error'?'KATALOG GAGAL DIMUAT':'MEMUAT KATALOG…',0,2.3,-1.2,4.2,.45,'#171914','#d7ff3f');}
    SLOTS.forEach(([z,x0,x1],ri)=>{for(let i=0;i<per[ri]&&n<shown.length;i++,n++){const p=shown[n],x=x0+i*.9,col=p.badge==='sold'?'#77797a':hexOf(p);
      const gp=new T.Group();gp.position.set(x,0,z);rackG.add(gp);
      B(gp,.04,.22,.04,'#2a2d28',0,1.74,0,{shadow:false});B(gp,.62,.03,.03,'#2a2d28',0,1.62,0,{shadow:false});
      B(gp,.5,.64,.1,col,0,1.28,0);[-1,1].forEach(s=>{const sl=B(gp,.22,.26,.1,col,s*.35,1.5,0);sl.rotation.z=-s*.5;});B(gp,.2,.06,.11,'#141511',0,1.6,0,{shadow:false});
      if(p.badge==='sold')B(gp,.3,.12,.03,'#c93a3a',0,1.05,.07,{shadow:false});
      const pic=new T.Mesh(new T.PlaneGeometry(.34,.34),new T.MeshBasicMaterial({transparent:true,opacity:1}));pic.position.set(0,1.3,.065);pic.visible=false;gp.add(pic);
      if(n<24)getThumb(p,t=>{pic.material.map=t;pic.material.needsUpdate=true;pic.visible=true;});
      own.push(C.hit(R,.86,1.5,.6,x,1.1,z,'shop-hanger:'+p.id,{dz:1.5}));}});
    if(C.inStore())C.refreshPickables();
    updateBag();
  }

  /* ---------- toko utama (katalog, tas, checkout) ---------- */
  function ensure(){
    if(shop)return Promise.resolve(shop);
    if(loading)return loading;
    loading=import('./fttr-shop.js?v=32').then(m=>{shop=m;
      m.bindUI({onChange:open=>{if(bag)bag.style.visibility=open?'hidden':'visible';},onCart:n=>{bagN=n;updateBag();},toast:t=>C.toast(t),beep(){}});
      return m.initShop(()=>layout()).then(()=>{layout();return m;});
    }).catch(e=>{console.error('toko gagal dimuat',e);failed=true;C.toast('Katalog toko belum bisa dimuat. Periksa koneksi lalu masuk lagi.');loading=null;return null;});
    return loading;
  }
  function updateBag(){if(!bag)return;bagN=shop?shop.cartCount():bagN;bag.textContent='🛍 TAS ('+bagN+') · KASIR';}
  function open(what,pid){
    ensure().then(m=>{if(!m)return;
      if(what==='cart')m.openCart();
      else if(what==='product')m.openProduct(pid,()=>m.openCatalog());
      else m.openCatalog();});
  }
  return {
    build,
    onEnter(){if(bag){bag.hidden=false;bag.style.visibility='visible';}if(failed){failed=false;loading=null;}ensure().then(()=>layout());},
    onExit(){if(bag)bag.hidden=true;if(shop)try{shop.closePanel();}catch(e){}},
    act(a){
      if(a==='shop-catalog'){open('catalog');return true;}
      if(a==='shop-kasir'){if(shop&&shop.cartCount()===0){open('catalog');C.toast('Tasmu masih kosong. Pilih produk dulu, lalu kembali ke kasir.');}else open('cart');return true;}
      if(a.startsWith('shop-hanger:')){open('product',a.slice(12));return true;}
      return false;},
    layout
  };
}
