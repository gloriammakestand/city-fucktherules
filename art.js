/* FTTR CITY street art: Sticker Zone (tiang + papan komunitas) dan Graffiti Zone (tembok khusus).
   Karya disimpan di server kota (/api/art) bila FTTR_CITY_API di config.js terisi; jika tidak, tersimpan lokal di perangkat. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d;}catch{return d;}};
const SV=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guest=(()=>{let g=localStorage.getItem('fttr.city.guest');if(!g){g=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());localStorage.setItem('fttr.city.guest',g);}return g;})();
let C=null,T=null,cur=null,sel=null,pend=null,lastPost=0,acc=0,prompt=null,ui=null,crop=null,gr=null;
const SURF=new Map(),IMG=new Map(),street={on:false,p:0,dir:0,from:null,to:null};
const api=()=>(window.FTTROnline&&window.FTTROnline.api)||'';
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const RND=seed=>{let s=(seed*7919+13)%2147483647;return()=>(s=(s*16807+11)%2147483647)/2147483647;};
function tag(c,t,x,y,s,col,out,rot){c.save();c.translate(x,y);c.rotate(rot||0);c.font='italic 900 '+s+'px Impact,"Arial Black",sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=s/7;c.strokeStyle=out;c.lineJoin='round';c.strokeText(t,0,0);c.fillStyle=col;c.fillText(t,0,0);c.restore();}
function stickerArt(c,t,x,y,w,h,bg,fg,rot){c.save();c.translate(x,y);c.rotate(rot);c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=3;c.fillStyle='#fff';c.fillRect(-w/2-3,-h/2-3,w+6,h+6);c.shadowBlur=0;c.fillStyle=bg;c.fillRect(-w/2,-h/2,w,h);c.fillStyle=fg;c.font='900 '+Math.round(h*.5)+'px Arial Black,Impact,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(t,0,1,w-6);c.restore();}
const STK=[['FTTR','#d7ff3f','#171914'],['LIVE WILD','#171914','#d7ff3f'],['DERBY','#c4533f','#fff'],['NSFC','#2a5fa8','#fff'],['EBU','#d9a441','#171914'],['ERFC','#2f8f5b','#fff'],['ULTRAS','#171914','#fff'],['⚽ LOVE','#fff','#171914'],['NO RULES','#e86ab0','#171914'],['AWAY DAY','#5875a6','#fff']];

function reg(s){s.works=[];s.loaded=false;SURF.set(s.id,s);s.mesh.userData.artId=s.id;C.pickables.push(s.mesh);s.tex=new T.CanvasTexture(s.cv);s.tex.colorSpace=T.SRGBColorSpace;s.tex.anisotropy=4;s.mesh.material.map=s.tex;s.mesh.material.needsUpdate=true;paint(s);}
function addPole(x,z,id,seed){const cv=mkCanvas(512,1024),base=mkCanvas(512,1024),b=base.getContext('2d'),r=RND(seed);
  b.fillStyle='#6b5239';b.fillRect(0,0,512,1024);for(let i=0;i<70;i++){b.fillStyle='rgba(0,0,0,'+(.05+r()*.1)+')';b.fillRect(r()*512,0,2+r()*5,1024);}b.fillStyle='#3a3c36';b.fillRect(0,1000,512,24);b.fillStyle='#f2c200';b.fillRect(0,420-16,512,10);
  for(let i=0;i<9;i++){const t=STK[(seed+i)%STK.length];stickerArt(b,t[0],512*(.34+r()*.32),1024*(.46+r()*.34),70+r()*50,34+r()*18,t[1],t[2],(r()-.5)*.8);}
  const geo=new T.CylinderGeometry(.17,.19,4.2,24,1,true);geo.rotateY(Math.PI);const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({roughness:.9}));mesh.position.set(x,2.1,z);mesh.castShadow=true;
  const arm=new T.Mesh(new T.BoxGeometry(1.4,.12,.12),new T.MeshStandardMaterial({color:'#4a3a28'}));arm.position.set(x,3.95,z);C.cityGroup.add(mesh,arm);
  reg({id,kind:'sticker',name:'TIANG STIKER',x,z,nx:0,nz:1,cy:1.6,cv,ctx:cv.getContext('2d'),base,cw:512,ch:1024,region:[.3,.7,.4,.84],vw:.9,vh:3.4,mesh});}
function addBoard(x,z,id){const cv=mkCanvas(640,380),base=mkCanvas(640,380),b=base.getContext('2d'),r=RND(9);b.fillStyle='#b98b5a';b.fillRect(0,0,640,380);for(let i=0;i<500;i++){b.fillStyle='rgba(80,50,20,'+r()*.25+')';b.fillRect(r()*640,r()*380,2,2);}
  [['MATCHDAY','#fff','#171914'],['JOBS','#d7ff3f','#171914'],['LOST CAT','#f2efdf','#c4533f'],['BAND NIGHT','#171914','#d7ff3f'],['FREE KICKS','#2a5fa8','#fff']].forEach((p,i)=>stickerArt(b,p[0],90+i*115,90+(i%2)*150,100,70,p[1],p[2],(r()-.5)*.25));
  const grp=new T.Group(),frame=new T.Mesh(new T.BoxGeometry(3.4,2.1,.12),new T.MeshStandardMaterial({color:'#3a3c36'}));frame.position.set(x,1.9,z);grp.add(frame);
  [-1.5,1.5].forEach(s=>{const p=new T.Mesh(new T.CylinderGeometry(.06,.06,2.4,6),new T.MeshStandardMaterial({color:'#3a3c36'}));p.position.set(x+s,1.2,z);grp.add(p);});
  const mesh=new T.Mesh(new T.PlaneGeometry(3.2,1.9),new T.MeshStandardMaterial({roughness:.9}));mesh.position.set(x,1.9,z+.07);C.cityGroup.add(grp,mesh);
  reg({id,kind:'sticker',name:'PAPAN KOMUNITAS',x,z,nx:0,nz:1,cy:1.9,cv,ctx:cv.getContext('2d'),base,cw:640,ch:380,region:[.04,.96,.06,.94],vw:3.8,vh:2.4,mesh});}
function addWall(x,z,id,seed){const cv=mkCanvas(960,300),base=mkCanvas(960,300),b=base.getContext('2d'),r=RND(seed);b.fillStyle='#8d8d85';b.fillRect(0,0,960,300);for(let i=0;i<1800;i++){b.fillStyle='rgba('+(r()>.5?'255,255,255':'0,0,0')+','+r()*.08+')';b.fillRect(r()*960,r()*300,2+r()*3,2+r()*3);}
  const cols=['#d7ff3f','#e86ab0','#2a5fa8','#c4533f','#d9a441','#fff'],words=['FTTR','LIVE WILD','NORTHSIDE','EASTBANK','NO RULES','DERBY','ULTRAS','FOOTBALL'];
  for(let s=0;s<3;s++){const w=words[(seed+s*2)%8],col=cols[(seed+s)%6];tag(b,w,160+s*320,130+r()*30,w.length>6?46:70,col,'#171914',(r()-.5)*.25);b.strokeStyle=col;b.lineWidth=4;for(let k=0;k<4;k++){b.beginPath();b.moveTo(60+s*320+k*60,185);b.lineTo(60+s*320+k*60,185+30+r()*50);b.stroke();}tag(b,'⚽',70+s*320,250,40,'#fff','#171914',.2);}
  b.fillStyle='rgba(23,25,20,.7)';[1,2].forEach(i=>b.fillRect(i*320-1,0,2,300));
  const grp=new T.Group(),wall=new T.Mesh(new T.BoxGeometry(8,2.8,.3),new T.MeshStandardMaterial({color:'#7d7d75',roughness:1}));wall.position.set(x,1.4,z);wall.castShadow=wall.receiveShadow=true;grp.add(wall);
  const cap=new T.Mesh(new T.BoxGeometry(8.2,.12,.5),new T.MeshStandardMaterial({color:'#5a5d55'}));cap.position.set(x,2.86,z);grp.add(cap);
  const mesh=new T.Mesh(new T.PlaneGeometry(7.6,2.4),new T.MeshStandardMaterial({roughness:.95}));mesh.position.set(x,1.4,z+.155);C.cityGroup.add(grp,mesh);C.solids.push({x,z,w:8.4,d:.8});
  reg({id,kind:'graffiti',name:'GRAFFITI ZONE',x,z,nx:0,nz:1,cy:1.4,cv,ctx:cv.getContext('2d'),base,cw:960,ch:300,vw:8.4,vh:3,mesh});}

function paint(s){const c=s.ctx;c.clearRect(0,0,s.cw,s.ch);c.drawImage(s.base,0,0);
  for(const w of s.works){if(w.kind==='graffiti'&&s.live&&w.slot===s.live.slot)continue;const im=IMG.get(w.id);if(!im||!im.complete||!im.naturalWidth)continue;
    if(w.kind==='graffiti')c.drawImage(im,w.slot*320,0,320,300);else{c.save();c.translate(w.u*s.cw,w.v*s.ch);c.rotate(w.rot||0);c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=4;const h=w.w*im.naturalHeight/im.naturalWidth;c.drawImage(im,-w.w/2,-h/2,w.w,h);c.restore();}}
  if(s.live)c.drawImage(s.live.cv,s.live.slot*320,0,320,300);
  if(pend&&pend.s===s&&sel&&sel.img.naturalWidth){c.save();c.globalAlpha=.85;c.translate(pend.u*s.cw,pend.v*s.ch);c.rotate(pend.rot);const h=pend.w*sel.img.naturalHeight/sel.img.naturalWidth;c.drawImage(sel.img,-pend.w/2,-h/2,pend.w,h);c.globalAlpha=1;c.strokeStyle='#d7ff3f';c.lineWidth=2;c.strokeRect(-pend.w/2,-h/2,pend.w,h);c.restore();}
  s.tex.needsUpdate=true;}
function addWork(s,w){if(s.works.some(x=>x.id===w.id))return;if(w.kind==='graffiti')s.works=s.works.filter(x=>x.kind!=='graffiti'||x.slot!==w.slot);s.works.push(w);const im=new Image();im.crossOrigin='anonymous';im.onload=()=>paint(s);im.src=w.src;IMG.set(w.id,im);}
async function loadSurf(s){s.loaded=true;const a=api();let list=null;
  if(a){try{const r=await fetch(a+'/api/art?surface='+encodeURIComponent(s.id),{cache:'no-store'});if(r.ok){const j=await r.json();list=(j.works||[]).map(w=>({...w,src:a+w.url}));}}catch{}}
  if(!list)list=LS('fttr.city.art.local',[]).filter(w=>w.surface===s.id).map(w=>({...w,src:w.img}));
  list.sort((p,q)=>String(p.at).localeCompare(String(q.at))).forEach(w=>addWork(s,w));paint(s);}

/* ---------- kamera street-level ---------- */
function enter(s){if(street.on)return;cur=s;const cam=C.camera,vh=C.getViewH(),asp=innerWidth/innerHeight,zoom=Math.max(.6,Math.min(vh/s.vh,vh*asp/s.vw)),visH=vh/zoom;
  const pos=new T.Vector3(s.x+s.nx*14,s.cy-.2*visH,s.z+s.nz*14),o=cam.clone();o.position.copy(pos);o.lookAt(pos.x-s.nx,pos.y,pos.z-s.nz);o.updateMatrixWorld();
  street.from={p:cam.position.clone(),q:cam.quaternion.clone(),z:cam.zoom};street.to={p:pos,q:o.quaternion.clone(),z:zoom};street.on=true;street.dir=1;street.p=0;C.getPlayer().visible=false;openUI(s);}
function leave(){if(!street.on||street.dir<0)return;if(cur){cur.live=null;pend=null;paint(cur);}street.dir=-1;if(ui)ui.hidden=true;}
function tick(dt){if(!street.on)return;const cam=C.camera;street.p=Math.max(0,Math.min(1,street.p+street.dir*dt/.75));const e=street.p*street.p*(3-2*street.p);
  cam.position.lerpVectors(street.from.p,street.to.p,e);cam.quaternion.copy(street.from.q).slerp(street.to.q,e);cam.zoom=street.from.z+(street.to.z-street.from.z)*e;cam.updateProjectionMatrix();
  if(street.dir<0&&street.p<=0){street.on=false;C.getPlayer().visible=true;C.setFollow(true);cur=null;}}
function update(dt){tick(dt);acc+=dt;if(acc<.3)return;acc=0;const p=C&&C.getPlayer();if(!p)return;let best=null,bd=1e9;
  for(const s of SURF.values()){const d=Math.hypot(p.position.x-s.x,p.position.z-s.z);if(!s.loaded&&d<45)loadSurf(s);const front=(p.position.x-s.x)*s.nx+(p.position.z-s.z)*s.nz;if(front>0&&d<3.6&&d<bd){bd=d;best=s;}}
  if(!prompt){prompt=document.createElement('button');prompt.id='artPrompt';prompt.hidden=true;prompt.onclick=()=>prompt._s&&enter(prompt._s);document.body.appendChild(prompt);}
  const show=best&&!street.on&&!C.isInside();prompt.hidden=!show;if(show){prompt._s=best;prompt.textContent=best.kind==='graffiti'?'🎨 GRAFFITI ZONE · BUKA':'🏷 STICKER ZONE · TEMPEL';}}
function tap(e){if(!cur||street.dir<0)return;if(cur.kind!=='sticker'||!sel)return;const rc=C.raycastFrom(e),h=rc.intersectObject(cur.mesh,false)[0];if(!h||!h.uv)return;const r=cur.region;
  pend={s:cur,u:Math.max(r[0],Math.min(r[1],h.uv.x)),v:Math.max(r[2],Math.min(r[3],1-h.uv.y)),w:+$('#artSize').value,rot:+$('#artRot').value*Math.PI/180};$('#artPlace').disabled=false;$('#artHint').textContent='Posisi dipilih. Atur ukuran/putar lalu tekan TEMPEL.';paint(cur);}

/* ---------- penyimpanan ---------- */
async function post(s,payload){if(Date.now()-lastPost<4000){C.toast('Tunggu beberapa detik');return null;}lastPost=Date.now();const a=api(),name=C.profile.name,body={guest,name,surface:s.id,...payload};
  if(a){try{const r=await fetch(a+'/api/art',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),j=await r.json();if(r.ok){addWork(s,{...j.work,src:a+j.work.url});paint(s);return j.work;}C.toast(j.error==='rate_limited'?'Terlalu cepat, coba lagi nanti':'Ditolak server: '+(j.error||r.status));return null;}catch{C.toast('Server tidak terjangkau. Karya disimpan di perangkat ini.');}}
  const w={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),owner:name,kind:payload.kind,surface:s.id,u:payload.u,v:payload.v,w:payload.w,rot:payload.rot,slot:payload.slot,at:new Date().toISOString(),likes:0,img:payload.img};
  const all=LS('fttr.city.art.local',[]);all.push(w);while(all.length>24)all.shift();if(!SV('fttr.city.art.local',all)){C.toast('Penyimpanan perangkat penuh');return null;}addWork(s,{...w,src:w.img});paint(s);return w;}
async function react(kind,w){const a=api();if(a&&!String(w.id).startsWith('L')){try{await fetch(a+'/api/art/'+kind,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:w.id,guest})});}catch{}}
  if(kind==='report'){const s=cur;s.works=s.works.filter(x=>x.id!==w.id);paint(s);const all=LS('fttr.city.art.local',[]).filter(x=>x.id!==w.id);SV('fttr.city.art.local',all);C.toast('Laporan dikirim. Karya disembunyikan untukmu.');}else{w.likes=(w.likes||0)+1;C.toast('Disukai ♥');}renderList();}

/* ---------- UI ---------- */
function openUI(s){buildUI();ui.hidden=false;$('#artTitle').textContent=s.name;$('#artNote').textContent=api()?'Tersimpan di server kota':'Mode lokal: tersimpan di perangkat ini sampai server kota dikonfigurasi';
  $('#artSticker').hidden=s.kind!=='sticker';$('#artGraf').hidden=s.kind!=='graffiti';$('#artCrop').hidden=true;$('#artList').hidden=true;
  if(s.kind==='sticker'){renderColl();$('#artPlace').disabled=true;$('#artHint').textContent=sel?'Ketuk permukaan untuk menentukan posisi stiker.':'Pilih atau unggah stiker, lalu ketuk permukaan.';}else grafOpen(0);}
function buildUI(){if(ui)return;ui=document.createElement('div');ui.id='artUI';ui.hidden=true;
  ui.innerHTML=`<div class="art-top"><div><b id="artTitle"></b><small id="artNote"></small></div><button class="solid-btn" id="artClose">KELUAR</button></div>
<section id="artSticker" class="art-sheet" hidden><div class="art-row" id="artColl"></div><div class="art-row"><label class="solid-btn acid">＋ UNGGAH<input id="artFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button class="solid-btn" id="artWorks">KARYA</button></div>
<label class="art-range">UKURAN<input id="artSize" type="range" min="70" max="260" value="150"></label><label class="art-range">PUTAR<input id="artRot" type="range" min="-180" max="180" value="0"></label><p class="fineprint" id="artHint"></p><button class="solid-btn acid" id="artPlace" disabled>TEMPEL</button></section>
<section id="artCrop" class="art-sheet" hidden><canvas id="cropCv" width="240" height="240"></canvas><label class="art-range">ZOOM<input id="cropZ" type="range" min="1" max="3" step=".05" value="1"></label><label class="art-range">GESER X<input id="cropX" type="range" min="-120" max="120" value="0"></label><label class="art-range">GESER Y<input id="cropY" type="range" min="-120" max="120" value="0"></label><label class="art-range">PUTAR<input id="cropR" type="range" min="-180" max="180" value="0"></label><div class="art-row"><button class="solid-btn acid" id="cropOk">SIMPAN KE KOLEKSI</button><button class="solid-btn" id="cropNo">BATAL</button></div></section>
<section id="artGraf" class="art-sheet" hidden><div class="art-row" id="grSlots"></div><canvas id="grCv" width="320" height="300"></canvas><div class="art-row" id="grCols"></div><label class="art-range">KUAS<input id="grSize" type="range" min="2" max="36" value="8"></label>
<div class="art-row"><button class="solid-btn acid" data-g="pen">PEN</button><button class="solid-btn" data-g="eraser">HAPUS</button><button class="solid-btn" data-g="tag">TAG</button><label class="solid-btn">GAMBAR<input id="grFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button class="solid-btn" data-g="undo">UNDO</button><button class="solid-btn" data-g="clear">BERSIH</button></div><div class="art-row"><button class="solid-btn acid" id="grSave">SIMPAN KE TEMBOK</button><button class="solid-btn" id="artWorks2">KARYA</button></div></section>
<div id="artList" class="art-list" hidden></div>`;document.body.appendChild(ui);
  $('#artClose').onclick=leave;$('#artWorks').onclick=$('#artWorks2').onclick=()=>{const l=$('#artList');l.hidden=!l.hidden;renderList();};
  for(const id of ['artSize','artRot'])$('#'+id).oninput=()=>{if(pend&&pend.s===cur){pend.w=+$('#artSize').value;pend.rot=+$('#artRot').value*Math.PI/180;paint(cur);}};
  $('#artFile').onchange=e=>pickFile(e.target.files[0],e.target);$('#artPlace').onclick=placeSticker;
  for(const id of ['cropZ','cropX','cropY','cropR'])$('#'+id).oninput=drawCrop;$('#cropNo').onclick=()=>{$('#artCrop').hidden=true;$('#artSticker').hidden=false;};$('#cropOk').onclick=saveCrop;
  grInit();}
function renderColl(){const el=$('#artColl'),list=LS('fttr.city.stickers',[]);el.innerHTML=list.length?'':'<span class="fineprint">Koleksi kosong. Unggah stiker pertamamu.</span>';list.forEach(it=>{const b=document.createElement('button');b.className='art-thumb'+(sel&&sel.id===it.id?' on':'');const i=new Image();i.src=it.data;b.appendChild(i);b.onclick=()=>{const im=new Image();im.onload=()=>{sel={id:it.id,img:im,data:it.data};pend=null;$('#artPlace').disabled=true;$('#artHint').textContent='Ketuk permukaan untuk menentukan posisi stiker.';renderColl();paint(cur);};im.src=it.data;};el.appendChild(b);});}
function pickFile(f,input){if(!f)return;if(!/^image\/(png|jpeg|webp)$/.test(f.type)){C.toast('Gunakan PNG, JPG, atau WebP');return;}if(f.size>6e6){C.toast('Gambar terlalu besar (maks 6 MB)');return;}
  const im=new Image();im.onload=()=>{crop={im,type:f.type};$('#cropZ').value=1;$('#cropX').value=0;$('#cropY').value=0;$('#cropR').value=0;$('#artSticker').hidden=true;$('#artCrop').hidden=false;drawCrop();};im.onerror=()=>C.toast('Gambar tidak bisa dibaca');im.src=URL.createObjectURL(f);if(input)input.value='';}
function cropTo(cv,k){const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);const im=crop.im,sc=Math.max(cv.width/im.naturalWidth,cv.height/im.naturalHeight)*(+$('#cropZ').value);c.save();c.translate(cv.width/2+(+$('#cropX').value)*k,cv.height/2+(+$('#cropY').value)*k);c.rotate(+$('#cropR').value*Math.PI/180);c.drawImage(im,-im.naturalWidth*sc/2,-im.naturalHeight*sc/2,im.naturalWidth*sc,im.naturalHeight*sc);c.restore();}
function drawCrop(){if(!crop)return;const cv=$('#cropCv');cv.style.background='repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px';cropTo(cv,1);}
function enc(cv,pngOk){let d=pngOk?cv.toDataURL('image/png'):cv.toDataURL('image/webp',.85);if(d.length>200000)d=cv.toDataURL('image/webp',.7);return d;}
function saveCrop(){if(!crop)return;const cv=mkCanvas(256,256);cropTo(cv,256/240);const data=enc(cv,crop.type==='image/png'),list=LS('fttr.city.stickers',[]);list.unshift({id:'S'+Date.now().toString(36),data});while(list.length>20)list.pop();if(!SV('fttr.city.stickers',list)){C.toast('Penyimpanan perangkat penuh');return;}
  $('#artCrop').hidden=true;$('#artSticker').hidden=false;crop=null;const im=new Image();im.onload=()=>{sel={id:list[0].id,img:im,data};pend=null;$('#artPlace').disabled=true;renderColl();$('#artHint').textContent='Stiker masuk koleksi. Ketuk permukaan untuk menempel.';};im.src=data;}
async function placeSticker(){if(!pend||!sel||pend.s!==cur)return;const p=pend;$('#artPlace').disabled=true;const w=await post(cur,{kind:'sticker',u:+p.u.toFixed(4),v:+p.v.toFixed(4),w:Math.round(p.w),rot:+p.rot.toFixed(3),slot:0,img:sel.data});if(w){pend=null;paint(cur);C.toast('Stiker ditempel!');}else $('#artPlace').disabled=false;}
function renderList(){const l=$('#artList');if(!cur||l.hidden)return;const ws=[...cur.works].reverse().slice(0,12);l.innerHTML=ws.length?ws.map(w=>`<div class="art-item"><span><b>${esc(w.owner||'?')}</b> · ${w.kind==='graffiti'?'slot '+(w.slot+1):'stiker'} · ♥${w.likes||0}</span><button data-r="like" data-id="${esc(w.id)}">♥</button><button data-r="report" data-id="${esc(w.id)}">⚑</button></div>`).join(''):'<p class="fineprint">Belum ada karya pemain di sini.</p>';
  l.querySelectorAll('button').forEach(b=>b.onclick=()=>{const w=cur.works.find(x=>x.id===b.dataset.id);if(w)react(b.dataset.r,w);});}

/* ---------- editor graffiti ---------- */
function grInit(){const cv=$('#grCv');gr={cv,ctx:cv.getContext('2d'),color:'#d7ff3f',tool:'pen',undo:[],slot:0,down:false,last:null,raf:0};
  cv.style.background='#8d8d85';$('#grCols').innerHTML=['#d7ff3f','#ffffff','#171914','#c4533f','#2a5fa8','#d9a441','#2f8f5b','#e86ab0'].map(c=>`<button class="art-col" data-c="${c}" style="background:${c}"></button>`).join('');
  $('#grCols').onclick=e=>{const c=e.target.dataset.c;if(c){gr.color=c;gr.tool=gr.tool==='eraser'?'pen':gr.tool;}};
  $('#grSlots').innerHTML=[0,1,2].map(i=>`<button class="solid-btn" data-s="${i}">SLOT ${i+1}</button>`).join('');$('#grSlots').onclick=e=>{const s=e.target.dataset.s;if(s!==undefined)grafOpen(+s);};
  ui.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>grTool(b.dataset.g));
  const pt=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];};
  cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);snap();gr.down=true;gr.last=pt(e);stroke(gr.last,gr.last);});
  cv.addEventListener('pointermove',e=>{if(!gr.down)return;const p=pt(e);stroke(gr.last,p);gr.last=p;});
  const up=()=>{gr.down=false;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  $('#grFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f||!/^image\/(png|jpeg|webp)$/.test(f.type)||f.size>6e6){C.toast('Gunakan PNG/JPG/WebP maks 6 MB');return;}const im=new Image();im.onload=()=>{snap();const k=Math.min(320/im.naturalWidth,300/im.naturalHeight);gr.ctx.drawImage(im,(320-im.naturalWidth*k)/2,(300-im.naturalHeight*k)/2,im.naturalWidth*k,im.naturalHeight*k);live();};im.src=URL.createObjectURL(f);};
  $('#grSave').onclick=grSave;}
function snap(){gr.undo.push(gr.ctx.getImageData(0,0,320,300));if(gr.undo.length>12)gr.undo.shift();}
function stroke(a,b){const c=gr.ctx;c.save();c.lineCap=c.lineJoin='round';c.lineWidth=+$('#grSize').value;c.globalCompositeOperation=gr.tool==='eraser'?'destination-out':'source-over';c.strokeStyle=gr.color;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0]+.01,b[1]);c.stroke();c.restore();live();}
function live(){if(!cur||gr.raf)return;gr.raf=requestAnimationFrame(()=>{gr.raf=0;if(cur&&cur.live)paint(cur);});}
function grTool(t){if(t==='undo'){const d=gr.undo.pop();if(d){gr.ctx.putImageData(d,0,0);live();}return;}if(t==='clear'){snap();gr.ctx.clearRect(0,0,320,300);live();return;}
  if(t==='tag'){const txt=(prompt_('Tulis tag (maks 12 huruf)')||'').slice(0,12).toUpperCase();if(!txt)return;snap();tag(gr.ctx,txt,160,150,Math.min(90,300/txt.length*1.1),gr.color,'#171914',-.08);live();return;}gr.tool=t;}
function prompt_(m){try{return window.prompt(m);}catch{return '';}}
function grafOpen(slot){gr.slot=slot;gr.undo=[];const c=gr.ctx;c.clearRect(0,0,320,300);const w=cur.works.find(x=>x.kind==='graffiti'&&x.slot===slot),im=w&&IMG.get(w.id);if(im&&im.complete&&im.naturalWidth)c.drawImage(im,0,0,320,300);cur.live={slot,cv:gr.cv};paint(cur);}
async function grSave(){const empty=!gr.ctx.getImageData(0,0,320,300).data.some((v,i)=>i%4===3&&v>0);if(empty){C.toast('Karya masih kosong');return;}const img=enc(gr.cv,true);if(img.length>300000){C.toast('Karya terlalu besar');return;}
  $('#grSave').disabled=true;const w=await post(cur,{kind:'graffiti',slot:gr.slot,u:0,v:0,w:320,rot:0,img});$('#grSave').disabled=false;if(w){cur.live=null;paint(cur);cur.live={slot:gr.slot,cv:gr.cv};C.toast('Karya dipasang di tembok!');}}

window.FTTRArt={get on(){return street.on;},update,tap,front(id){const s=SURF.get(id);return s?{x:s.x+s.nx*1.6,z:s.z+s.nz*1.6}:null;},
  init(core){C=core;T=core.THREE;const S=core.surfaces;S.poles.forEach((p,i)=>addPole(p[0],p[1],p[2],i+3));S.boards.forEach(p=>addBoard(p[0],p[1],p[2]));S.walls.forEach((p,i)=>addWall(p[0],p[1],p[2],i+2));}};
})();
