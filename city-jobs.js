/* FTTR CITY — sistem pekerjaan berbasis misi (v15).
   Setiap warga boleh mengambil pekerjaan apa pun kapan pun (tidak ada kuota/slot): semua dihitung di sisi pemain.
   Alur: ambil kendaraan/alat → ikuti penanda misi → selesaikan semua langkah → terima gaji + naik level. */
export function createJobs(C){
 const T=C.THREE,$=s=>document.querySelector(s);
 const LS='fttr.city.jobprog';
 const prog=(()=>{try{return JSON.parse(localStorage.getItem(LS))||{};}catch{return {};}})();
 const save=()=>{try{localStorage.setItem(LS,JSON.stringify(prog));}catch{}};
 const lvl=id=>1+Math.floor((prog[id]?.done||0)/3),mult=id=>1+Math.min(.5,(lvl(id)-1)*.1);

 /* template: delivery (antar ke rumah) · patrol (cek titik) · transport (jemput→antar) · spots (tugas di beberapa titik) · shift (bekerja di satu tempat) */
 const DEFS=[
  {id:'courier',icon:'📦',name:'Kurir Paket',reward:260,tpl:'delivery',veh:'motor',depot:'jobcentre',skill:'Logistik',desc:'Ambil motor di Job Centre, ambil paket, lalu antar ke rumah-rumah warga.'},
  {id:'food',icon:'🍜',name:'Kurir Makanan',reward:200,tpl:'delivery',veh:'motor',depot:'cafe',skill:'Kuliner',desc:'Ambil motor dan pesanan di Corner Kitchen, antar selagi masih hangat.'},
  {id:'store',icon:'🛍️',name:'Kurir FTTR Store',reward:230,tpl:'delivery',veh:'motor',depot:'fttr',skill:'Retail',desc:'Antar paket merchandise dari FTTR Store ke para supporter.'},
  {id:'police',icon:'🚓',name:'Polisi Patroli',reward:280,tpl:'patrol',veh:'patrol',depot:'police',skill:'Layanan publik',desc:'Ambil mobil patroli, cek titik-titik kota, dan tangani laporan warga.'},
  {id:'security',icon:'🛡️',name:'Keamanan Stadion',reward:200,tpl:'spots',depot:'stadium',skill:'Keamanan',desc:'Berjalan keliling area stadion dan periksa tiket di tiap pos.'},
  {id:'medic',icon:'🚑',name:'Paramedis Ambulans',reward:290,tpl:'transport',veh:'ambulance',depot:'hospital',skill:'Medis',desc:'Ambil ambulans, jemput pasien di rumah warga, bawa ke City Hospital.'},
  {id:'bus',icon:'🚌',name:'Sopir Bus Kota',reward:240,tpl:'transport',veh:'bus',depot:'station',skill:'Transportasi',desc:'Ambil bus, naikkan penumpang di halte, dan antar ke stasiun.'},
  {id:'cleaner',icon:'🧹',name:'Petugas Kebersihan',reward:160,tpl:'spots',depot:'plaza',skill:'Layanan kota',desc:'Bersihkan sampah di jalanan dan plaza kota.'},
  {id:'gardener',icon:'🌳',name:'Tukang Taman',reward:150,tpl:'spots',depot:'plaza',skill:'Ruang hijau',desc:'Rawat tanaman di taman, kolam, dan plaza.'},
  {id:'mechanic',icon:'🔧',name:'Montir Keliling',reward:215,tpl:'spots',depot:'garage',skill:'Bengkel',desc:'Datangi mobil mogok di jalan dan perbaiki di tempat.'},
  {id:'builder',icon:'🧱',name:'Pekerja Konstruksi',reward:210,tpl:'spots',depot:'works',skill:'Konstruksi',desc:'Periksa dan rawat titik-titik proyek kota.'},
  {id:'journalist',icon:'📰',name:'Jurnalis Kota',reward:220,tpl:'spots',depot:'press',skill:'Media',desc:'Kunjungi tempat-tempat kota untuk wawancara dan laporan.'},
  {id:'photo',icon:'📸',name:'Fotografer Matchday',reward:230,tpl:'spots',depot:'stadium',skill:'Media',desc:'Ambil foto di stadion dan titik supporter.'},
  {id:'doctor',icon:'🩺',name:'Perawat Rumah Sakit',reward:250,tpl:'shift',depot:'hospital',skill:'Medis',desc:'Pergi ke City Hospital dan bantu pasien selama satu shift.'},
  {id:'barista',icon:'☕',name:'Barista',reward:165,tpl:'shift',depot:'cafe2',skill:'Kuliner',desc:'Buat minuman dan layani antrean di kafe.'},
  {id:'station',icon:'🚉',name:'Petugas Stasiun',reward:170,tpl:'shift',depot:'station',skill:'Transportasi',desc:'Bantu penumpang dan jaga jadwal di Central Station.'},
  {id:'stadium',icon:'🏟️',name:'Kru Stadion',reward:220,tpl:'shift',depot:'stadium',skill:'Olahraga',desc:'Siapkan lapangan dan operasional matchday.'}
 ];
 const VEH_LABEL={motor:'🏍️ Motor',patrol:'🚓 Mobil patroli',ambulance:'🚑 Ambulans',bus:'🚌 Bus'};
 const COL={pick:'#4aa3e0',drop:'#7be05a',check:'#ff6a3d',hold:'#ffcf3f',back:'#b78cff'};

 let M=null,beacon=null,props=null,hudT=0;
 const rnd=a=>a[Math.floor(Math.random()*a.length)];
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const placeById=id=>C.places().find(p=>p.id===id);
 const front=p=>p?{x:p.x,z:p.z+p.d/2+1.5}:{x:-12,z:-33};
 const depotPos=id=>id==='plaza'?{x:-12,z:-33}:front(placeById(id));
 const nameOf=id=>placeById(id)?.name||'tujuan';

 /* ---- pemilihan titik ---- */
 const okPt=(x,z,m)=>!C.blocked(x,z,m||.9);
 function houses(n,from){
  const all=shuffle(C.houseSpots).filter(h=>okPt(h.x,h.z,.4));const out=[];
  for(const h of all){if(out.every(o=>Math.hypot(o.x-h.x,o.z-h.z)>16)&&Math.hypot(h.x-from.x,h.z-from.z)>10&&h.x<75){out.push(h);if(out.length>=n)break;}}
  return out;
 }
 function streetPts(n,xr){
  const out=[];for(let t=0;t<400&&out.length<n;t++){
   const hr=rnd(C.HR);const x=(xr?xr[0]+Math.random()*(xr[1]-xr[0]):-58+Math.random()*116),z=hr+(Math.random()<.5?-3.4:3.4);
   if(C.VRALL.some(v=>Math.abs(x-v)<6))continue;if(!okPt(x,z,.5)||out.some(o=>Math.hypot(o.x-x,o.z-z)<14))continue;out.push({x,z});}
  return out;
 }
 function cornerPts(n){
  const out=[];const all=[];C.VR.forEach(v=>C.HR.forEach(h=>[[3.9,3.9],[-3.9,-3.9],[3.9,-3.9],[-3.9,3.9]].forEach(([a,b])=>all.push({x:v+a,z:h+b}))));
  shuffle(all).forEach(p=>{if(out.length<n&&okPt(p.x,p.z,.5)&&p.z<48&&Math.abs(p.z-30)>5&&out.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>26))out.push(p);});return out;
 }
 const ring=(cx,cz,r,n)=>Array.from({length:n},(_,i)=>({x:cx+Math.cos(i/n*6.28+.6)*r,z:cz+Math.sin(i/n*6.28+.6)*r})).filter(p=>okPt(p.x,p.z,.5));

 /* ---- generator langkah misi ---- */
 function build(def){
  const S=[],dep=depotPos(def.depot);let w=0;const add=(s)=>{s.w=s.w??1;w+=s.pay?0:s.w;S.push(s);return s;};
  const mount=()=>{if(def.veh)add({k:'mount',veh:def.veh,x:dep.x,z:dep.z,r:2.6,label:`Ambil ${VEH_LABEL[def.veh].replace(/^\S+\s/,'').toLowerCase()} di ${nameOf(def.depot)}`,tag:'pick',w:0,pay:0});};
  const back=()=>{if(def.veh)add({k:'dismount',x:dep.x,z:dep.z,r:2.8,label:`Kembalikan kendaraan ke ${nameOf(def.depot)}`,tag:'back',w:1});};
  if(def.tpl==='delivery'){
   mount();add({k:'hold',x:dep.x,z:dep.z,r:2.8,sec:1.6,label:`Ambil paket di ${nameOf(def.depot)}`,tag:'pick',w:1});
   houses(4,dep).forEach((h,i)=>add({k:'goto',x:h.x,z:h.z,r:2.2,label:`Antar paket ${i+1} ke rumah warga`,tag:'drop',w:2.2,item:'paket'}));back();
  }else if(def.tpl==='patrol'){
   mount();cornerPts(5).forEach((p,i)=>add({k:'hold',x:p.x,z:p.z,r:3.2,sec:1.8,label:`Pos patroli ${i+1}: periksa area`,tag:'check',w:1.4}));
   const h=houses(1,dep)[0];if(h)add({k:'hold',x:h.x,z:h.z,r:2.8,sec:3.5,label:'Laporan warga: tangani keributan',tag:'hold',w:2.4});back();
  }else if(def.tpl==='transport'){
   mount();
   if(def.veh==='ambulance'){const hos=front(placeById('hospital'));houses(2,dep).forEach((h,i)=>{add({k:'hold',x:h.x,z:h.z,r:3,sec:2,label:`Jemput pasien ${i+1}`,tag:'pick',w:1.6,item:'pasien'});add({k:'hold',x:hos.x,z:hos.z,r:3.2,sec:1.6,label:'Antar pasien ke City Hospital',tag:'drop',w:1.6});});}
   else{const st=front(placeById('station'));const stops=[placeById('busstop'),placeById('cafe'),placeById('pub'),placeById('market')].filter(Boolean);stops.slice(0,3).forEach((p,i)=>{const f=front(p);add({k:'hold',x:f.x,z:f.z+(p.id==='busstop'?.6:0),r:3.2,sec:2,label:`Naikkan penumpang di halte ${i+1}`,tag:'pick',w:1.4});});add({k:'hold',x:st.x,z:st.z,r:3.2,sec:1.8,label:'Turunkan penumpang di Central Station',tag:'drop',w:1.8});}
   back();
  }else if(def.tpl==='spots'){
   let pts=[],lab='',sec=2.2,tag='hold';
   if(def.id==='cleaner'){pts=streetPts(4,[-58,58]).concat(ring(-12,-36.5,5.5,2));lab='Bersihkan sampah';tag='hold';}
   else if(def.id==='gardener'){pts=[[-36,12],[-30,6],[36,12],[42,6],[-12,-40.5],[-16,-33]].map(([x,z])=>({x,z})).filter(p=>okPt(p.x,p.z,.5)).slice(0,5);lab='Rawat tanaman';}
   else if(def.id==='mechanic'){pts=streetPts(3,[20,60]);lab='Perbaiki mobil mogok';sec=3.2;}
   else if(def.id==='builder'){pts=streetPts(3,[-58,-10]).concat(streetPts(1,[30,64]));lab='Periksa titik proyek';sec=3;}
   else if(def.id==='journalist'){pts=['market','cafe','station','hospital','police'].map(id=>front(placeById(id))).filter(Boolean).slice(0,4);lab='Wawancara & laporan';sec=2.8;tag='check';}
   else if(def.id==='photo'){pts=['stadium','stadium-ot','stadium-maguwo','station'].map(id=>front(placeById(id))).filter(Boolean);lab='Ambil foto matchday';tag='check';}
   else if(def.id==='security'){pts=['stadium','stadium-ot','stadium-maguwo'].map(id=>{const f=front(placeById(id));return f;}).concat([{x:84,z:-3.4},{x:132,z:-3.4}]).filter(Boolean).slice(0,5);lab='Periksa tiket di pos';tag='check';}
   pts.forEach((p,i)=>add({k:'hold',x:p.x,z:p.z,r:2.8,sec,label:`${lab} (${i+1}/${pts.length})`,tag,w:1.5,prop:def.id}));
  }else{ // shift
   const f=front(placeById(def.depot)||placeById('fttr'));add({k:'goto',x:f.x,z:f.z,r:2.6,label:`Pergi ke ${nameOf(def.depot)}`,tag:'pick',w:.8});
   add({k:'hold',x:f.x,z:f.z,r:3.6,sec:10,label:'Bekerja… tetap di dekat lokasi',tag:'hold',w:3});
  }
  return S;
 }

 /* ---- visual: penanda misi & properti ---- */
 function makeBeacon(){
  const g=new T.Group();g.visible=false;C.scene.add(g);
  const mk=(geo,op,ro,dt)=>{const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:op,depthWrite:false,depthTest:dt,side:T.DoubleSide,toneMapped:false}));m.renderOrder=ro;return m;};
  const col=mk(new T.CylinderGeometry(.5,.5,8,14,1,true),.28,970,true);col.position.y=4;
  const base=mk(new T.RingGeometry(1.2,1.6,28),.9,971,false);base.rotation.x=-Math.PI/2;base.position.y=.12;
  const pulse=mk(new T.RingGeometry(1,1.15,28),.7,972,false);pulse.rotation.x=-Math.PI/2;pulse.position.y=.13;
  const arrow=mk(new T.ConeGeometry(.5,1,4),1,973,false);arrow.rotation.x=Math.PI;
  g.add(col,base,pulse,arrow);g.userData={col,base,pulse,arrow,t:0};return g;
 }
 function paint(b,hex){const u=b.userData;[u.col,u.base,u.pulse,u.arrow].forEach(m=>m.material.color.set(hex));}
 function clearProps(){if(props){C.scene.remove(props);props=null;}}
 function spawnProps(){
  clearProps();props=new T.Group();C.scene.add(props);
  const dep=depotPos(M.def.depot);
  if(M.def.veh){const m=C.makeVehicleModel(M.def.veh);m.g.position.set(dep.x,0,dep.z);m.g.rotation.y=-Math.PI/2*0;props.add(m.g);M.depotVeh=m.g;}
  M.steps.forEach(s=>{
   if(!s.prop)return;const g=new T.Group();g.position.set(s.x,0,s.z);props.add(g);s.propG=g;
   const b=(w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:c,roughness:.9}));m.position.set(x,y,z);m.castShadow=true;g.add(m);};
   if(s.prop==='cleaner'){b(.5,.3,.4,'#8d8a7a',0,.15,0);b(.3,.2,.3,'#6e8a5c',.4,.1,.2);b(.25,.16,.35,'#a08a6a',-.35,.08,.25);}
   else if(s.prop==='gardener'){b(.9,.25,.6,'#7a5a3a',0,.12,0);b(.3,.4,.3,'#ff7aa8',-.2,.45,0);b(.3,.5,.3,'#ffcf3f',.2,.5,.05);}
   else if(s.prop==='mechanic'){const m=C.makeVehicleModel('patrol');m.g.scale.setScalar(.9);m.g.rotation.y=Math.random()*3;g.add(m.g);b(.3,.5,.3,'#ff6a3d',1.6,.25,.8);}
   else if(s.prop==='builder'){b(1.4,.2,1.4,'#c9c4b0',0,.1,0);b(.3,.6,.3,'#ff6a3d',.7,.3,.7);b(.3,.6,.3,'#ff6a3d',-.7,.3,-.7);b(.6,.4,.6,'#a8793a',0,.4,0);}
   else{b(.12,1.5,.12,'#6b5239',0,.75,0);b(.9,.5,.1,'#ffffff',0,1.4,0);}
  });
 }
 function stepComplete(i){const s=M.steps[i];if(s.propG){props.remove(s.propG);}}

 /* ---- HUD ---- */
 const hud={root:()=>$('#missionHud'),arrow:()=>$('#mArrow')};
 function hudShow(on){const r=hud.root();if(r)r.hidden=!on;document.body.classList.toggle('on-mission',on);if(!on){const a=hud.arrow();if(a)a.hidden=true;}}
 function hudUpdate(force){
  if(!M)return;const s=M.steps[M.i],p=C.player();if(!s)return;
  const d=Math.hypot(s.x-p.position.x,s.z-p.position.z);
  const set=(id,v)=>{const e=$(id);if(e&&e.textContent!==v)e.textContent=v;};
  set('#mTitle',`${M.def.icon} ${M.def.name} · Lv ${lvl(M.def.id)}`);set('#mObj',s.label);set('#mDist',`${Math.round(d*6)} m`);set('#mProg',`${Math.min(M.i+1,M.steps.length)}/${M.steps.length}`);set('#mPay',`₡${M.earned}`);
  const bar=$('#mBar');if(bar)bar.style.width=(s.k==='hold'?Math.min(100,M.h/s.sec*100):M.i/M.steps.length*100)+'%';
  // panah tepi layar bila target di luar layar
  const a=hud.arrow();if(a){const sc=C.project(s.x,1.2,s.z),w=innerWidth,h=innerHeight,m=46,off=sc.behind||sc.x<m||sc.x>w-m||sc.y<m+110||sc.y>h-m-70;
   if(!off){a.hidden=true;}else{a.hidden=false;const cx=w/2,cy=h/2,dx=sc.x-cx,dy=sc.y-cy,k=Math.min((w/2-m)/Math.abs(dx||1e-3),(h/2-m-60)/Math.abs(dy||1e-3));const px=cx+dx*Math.min(k,1e3),py=cy+dy*Math.min(k,1e3);a.style.left=px+'px';a.style.top=py+'px';a.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(dy,dx)*180/Math.PI+90}deg)`;a.style.background=COL[s.tag]||'#ffcf3f';}}
 }

 /* ---- alur misi ---- */
 function start(id){
  const def=DEFS.find(d=>d.id===id);if(!def)return;
  if(M){C.toast('Selesaikan atau batalkan misi yang sedang berjalan dulu');return;}
  if(C.isInside()){C.toast('Keluar dari gedung dulu untuk memulai misi');return;}
  if(C.needs.energy<12){C.showNotice('⚡','TERLALU LELAH','Energi terlalu rendah. Istirahat atau beli makanan/minuman dulu.');return;}
  const steps=build(def);if(steps.length<2){C.toast('Tidak ada rute tersedia, coba lagi');return;}
  const base=Math.round(def.reward*mult(id)),wsum=steps.reduce((a,s)=>a+(s.pay===0?0:s.w),0)||1;steps.forEach(s=>{s.pay=s.pay===0?0:Math.round(base*s.w/wsum);});
  M={def,steps,i:0,h:0,earned:0,base,t:0,t0:performance.now(),done:0};
  C.closePhone();C.cancelDest();spawnProps();if(!beacon)beacon=makeBeacon();
  hudShow(true);goStep(0);C.toast(`Misi dimulai: ${def.name}`);
 }
 function goStep(i){M.i=i;M.h=0;const s=M.steps[i];if(!s)return;if(!beacon)return;beacon.visible=true;paint(beacon,COL[s.tag]||'#ffcf3f');hudUpdate(true);}
 function nextStep(){
  const s=M.steps[M.i];M.earned+=s.pay||0;stepComplete(M.i);
  if(s.pay>0)C.toast(`${s.label.split(':')[0].replace(/^Antar /,'✔ Terkirim: ')} · +₡${s.pay}`.slice(0,60));
  if(M.i+1>=M.steps.length){finish();return;}goStep(M.i+1);
 }
 async function finish(){
  const m=M;M=null;if(beacon)beacon.visible=false;clearProps();C.setRide(null);hudShow(false);
  const secs=(performance.now()-m.t0)/1000,fast=secs<(m.def.tpl==='shift'?9e9:60+m.steps.length*22)?Math.round(m.base*.1):0;
  const lvBonus=Math.round(m.def.reward*(mult(m.def.id)-1)),bonus=Math.min(150,lvBonus+fast);
  const wasLvl=lvl(m.def.id);prog[m.def.id]={done:(prog[m.def.id]?.done||0)+1,earned:(prog[m.def.id]?.earned||0)+m.earned};save();
  let paid=m.def.reward+bonus;
  try{const on=C.online();if(on?.connected){const r=await on.action({type:'job',job:m.def.id,bonus,idempotency:`JOB-${crypto.randomUUID()}`});C.setMoney(r.balance);paid=r.reward||paid;}else C.setMoney(C.getMoney()+paid);}
  catch(e){C.setMoney(C.getMoney()+paid);}
  C.needs.energy=Math.max(0,C.needs.energy-15);C.needs.hunger=Math.max(0,C.needs.hunger-6);C.saveNeeds();C.updateNeedsUI();
  const up=lvl(m.def.id)>wasLvl?` Naik ke level ${lvl(m.def.id)}!`:'';
  C.showNotice(m.def.icon,'MISI SELESAI',`${m.def.name} selesai dalam ${Math.round(secs)} detik. Gaji ₡${m.def.reward}${bonus?` + bonus ₡${bonus}`:''} = ₡${paid}.${up} Pekerjaan ini terbuka untuk semua warga, ambil lagi kapan saja.`,[{label:'AMBIL MISI LAGI',acid:true,run:()=>setTimeout(()=>start(m.def.id),200)},{label:'TUTUP'}]);
  C.rerender();
 }
 function cancel(){
  if(!M)return;M=null;if(beacon)beacon.visible=false;clearProps();C.setRide(null);hudShow(false);C.toast('Misi dibatalkan');C.rerender();
 }
 function update(dt){
  if(beacon&&beacon.visible){const u=beacon.userData,s=M?.steps[M.i];if(s){u.t+=dt;beacon.position.set(s.x,0,s.z);const k=(u.t%1.2)/1.2;u.pulse.scale.setScalar(1+k*1.6);u.pulse.material.opacity=.7*(1-k);u.arrow.position.y=9+Math.sin(u.t*4)*.4;u.col.material.opacity=.22+Math.sin(u.t*3)*.06;}}
  if(!M)return;M.t+=dt;if(C.isInside())return;
  const s=M.steps[M.i],p=C.player(),d=Math.hypot(s.x-p.position.x,s.z-p.position.z);
  if(s.k==='mount'){if(d<s.r){if(M.depotVeh){props.remove(M.depotVeh);M.depotVeh=null;}C.setRide(s.veh);nextStep();}}
  else if(s.k==='dismount'){if(d<s.r){C.setRide(null);nextStep();}}
  else if(s.k==='goto'){if(d<s.r)nextStep();}
  else if(s.k==='hold'){if(d<s.r){M.h+=dt;if(M.h>=s.sec)nextStep();}else M.h=Math.max(0,M.h-dt*1.5);}
  hudT+=dt;if(hudT>.12){hudT=0;hudUpdate();}
 }

 /* ---- UI aplikasi phone ---- */
 function renderApp(){
  const rows=DEFS.map(d=>{const l=lvl(d.id),done=prog[d.id]?.done||0,run=M?.def.id===d.id,pay=Math.round(d.reward),bonus=Math.min(150,Math.round(d.reward*(mult(d.id)-1)));
   return `<article class="job-card"><div class="job-card-top"><span class="job-emoji">${d.icon}</span><div><b>${d.name}<span class="bot-badge">Lv ${l}</span></b><p>${d.desc}<br>${d.veh?VEH_LABEL[d.veh]+' · ':''}${d.skill} · ${done}× selesai</p></div></div><button data-action="${run?'mission-cancel':'mission:'+d.id}" ${M&&!run?'disabled':''}>${run?'BATALKAN MISI':'MULAI MISI'} · ₡${pay}${bonus?` +${bonus}`:''}</button></article>`;}).join('');
  return `<div class="phone-widget"><small>PEKERJAAN KOTA</small><h3>Pilih misi, dapat gaji.</h3><p>Ambil kendaraan atau alat kerja, ikuti penanda di peta, selesaikan semua langkah, lalu terima gaji. Level naik tiap 3 misi dan menambah bonus. Pekerjaan terbuka untuk semua warga, tidak ada batas pemain.</p></div>${M?`<div class="message"><b>Misi berjalan:</b> ${M.def.name} · langkah ${M.i+1}/${M.steps.length}</div>`:''}<div class="service-list">${rows}</div><p class="fineprint">Upah masuk ke saldo virtual. Saat terhubung ke server, gaji dicatat server dan bonus level dibatasi.</p>`;
 }
 function actionFor(placeId){const m={jobcentre:'courier',police:'police',garage:'mechanic',works:'builder',press:'journalist',cafe:'food',fttr:'store',station:'bus',hospital:'medic',stadium:'stadium','stadium-ot':'stadium','stadium-maguwo':'security'};return m[placeId];}
 return {start,cancel,update,renderApp,state:()=>M,active:()=>!!M,defs:DEFS,actionFor,prog,def:id=>DEFS.find(d=>d.id===id)};
}
