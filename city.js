const $ = s => document.querySelector(s);
const canvas = $('#world');
const moneyEl = $('#moneyVal');
let money = Number(localStorage.getItem('fttr.city.money') || 1250);
let THREE, renderer, scene, camera, raycaster, pointer, ground, cityGroup, interiorGroup, player, playerBody, playerHead, ring;
let isInside = false, selectedPlace = null, destination = null, lastTime = 0, toastTimer = 0;
let cameraTarget, cameraFollow=true, cameraZoom=1, dragState=null, pinchDistance=0;
const needs = (()=>{try{return {...{hunger:86,thirst:90,health:100,energy:95},...JSON.parse(localStorage.getItem('fttr.city.needs')||'{}')}}catch{return {hunger:86,thirst:90,health:100,energy:95}}})();
let lastNeedsTick=0, activeJob=null, jobTimer=null;
const JOBS=[
 {id:'store',icon:'🛍️',name:'FTTR Store Assistant',place:'FTTR Store',reward:180,skill:'Retail',desc:'Melayani pelanggan dan menata display'},
 {id:'station',icon:'🚉',name:'Station Staff',place:'Central Station',reward:160,skill:'Transport',desc:'Membantu penumpang dan menjaga jadwal'},
 {id:'bus',icon:'🚌',name:'Bus Driver',place:'High Street Bus Stop',reward:190,skill:'Transport',desc:'Mengantar warga ke distrik lain'},
 {id:'stadium',icon:'🏟️',name:'Stadium Crew',place:'Central Ground',reward:210,skill:'Sports',desc:'Persiapan lapangan dan operasional matchday'},
 {id:'photo',icon:'📸',name:'Matchday Photographer',place:'Central Ground',reward:220,skill:'Media',desc:'Memotret pertandingan dan supporter'},
 {id:'journalist',icon:'📰',name:'City Journalist',place:'City Press Office',reward:210,skill:'Media',desc:'Menulis berita kota dan hasil pertandingan'},
 {id:'food',icon:'🍳',name:'Kitchen Worker',place:'Corner Kitchen',reward:165,skill:'Hospitality',desc:'Menyiapkan makanan untuk warga'},
 {id:'barista',icon:'☕',name:'Barista',place:'High Street Café',reward:155,skill:'Hospitality',desc:'Membuat minuman dan melayani antrean'},
 {id:'doctor',icon:'🩺',name:'Hospital Nurse',place:'City Hospital',reward:240,skill:'Medical',desc:'Membantu pasien dan menjaga klinik'},
 {id:'medic',icon:'🚑',name:'Paramedic',place:'City Hospital',reward:250,skill:'Medical',desc:'Siaga layanan darurat dan pertolongan'},
 {id:'police',icon:'🚓',name:'Police Officer',place:'City Police',reward:230,skill:'Public service',desc:'Patroli dan membantu warga'},
 {id:'cleaner',icon:'🧹',name:'Street Cleaner',place:'Central Plaza',reward:145,skill:'City service',desc:'Menjaga jalan dan plaza tetap bersih'},
 {id:'mechanic',icon:'🔧',name:'Mechanic',place:'Eastbank Garage',reward:205,skill:'Workshop',desc:'Memperbaiki kendaraan kota'},
 {id:'builder',icon:'🧱',name:'Construction Worker',place:'Eastbank Works',reward:200,skill:'Construction',desc:'Merawat bangunan dan infrastruktur'},
 {id:'security',icon:'🛡️',name:'Event Security',place:'The Away End',reward:185,skill:'Security',desc:'Menjaga keramaian dan event supporter'},
 {id:'gardener',icon:'🌳',name:'Park Gardener',place:'Central Plaza',reward:140,skill:'Green space',desc:'Merawat taman dan pepohonan'}
];
const jobBots=new Map(JOBS.map(j=>[j.id,{name:`BOT ${j.id.toUpperCase()}`,active:true}]));
const pickables = [], places = [], botWorkers = [];
const remoteAvatars = new Map(); let lastOnlineSync = 0; let activeDistrict = 'Central City';
const mat = (color, roughness = .9, extra = {}) => new THREE.MeshStandardMaterial({color, roughness, ...extra});
const M = {};
function material(name, color, roughness = .9, extra = {}) { return M[name] || (M[name] = mat(color, roughness, extra)); }
function box(parent, w,h,d, color, x,y,z, opts={}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), typeof color === 'string' ? material(color,color) : color);
  mesh.position.set(x,y,z); if(opts.ry) mesh.rotation.y=opts.ry; mesh.castShadow=opts.shadow !== false; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent, r1,r2,h,color,x,y,z,segments=12) { const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material(color,color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m; }
function textTexture(text, bg='#171914', fg='#d7ff3f', width=512, height=128) {
  const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,width,height);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font='900 58px Arial, sans-serif';x.fillText(text,width/2,height/2,width-24);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});
}
function sign(parent,text,x,y,z,w=3.5,h=.7,bg='#171914',fg='#d7ff3f') { const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),textTexture(text,bg,fg));m.position.set(x,y,z);parent.add(m);return m; }
function addPlace({id,name,type,desc,glyph,tag,x,z,w=4,d=3,color='#d5d0bd',hours='OPEN · ALL DAY',kind='building'}) {
  const g=new THREE.Group();g.position.set(x,0,z);cityGroup.add(g);
  // raised foundation and building volume
  box(g,w,.22,d,'#aaa99a',0,.11,0,{shadow:false});
  const wallH=kind==='stadium'?2.4:2.1;
  box(g,w,wallH,d,color,0,.22+wallH/2,0);
  box(g,w+.18,.18,d+.18,'#35372f',0,.22+wallH+.08,0);
  // front door, windows and restrained architectural detail
  box(g,.68,1.25,.08,'#282c26',0,.75,d/2+.045,{shadow:false});
  for(let i=0;i<Math.max(2,Math.floor(w/1.4));i++) box(g,.48,.72,.07,i%2?'#a5c7c1':'#8daaa6',-w/2+.65+i*(w-1.2)/Math.max(1,Math.floor(w/1.4)-1),1.28,d/2+.05,{shadow:false});
  box(g,w+.25,.12,.28,'#d7ff3f',0,wallH+.45,d/2+.11,{shadow:false});
  sign(g,glyph,0,wallH+.93,d/2+.18,Math.min(w+.15,4.8),.62,'#171914','#d7ff3f');
  // Distinctive pixel-city architecture: roof units, striped awnings, corner trims and service signs.
  box(g,.14,wallH+.18,.14,'#e6e0cf',-w/2-.06,wallH/2+.22,d/2+.08,{shadow:false});
  box(g,.14,wallH+.18,.14,'#e6e0cf',w/2+.06,wallH/2+.22,d/2+.08,{shadow:false});
  if(['cafe','cafe2','market','northside-market','eastbank-market'].includes(id)){
    box(g,w+.2,.16,.62,id==='cafe2'?'#d7ff3f':'#a64e3d',0,1.95,d/2+.34,{shadow:false});
    for(let stripe=-2;stripe<=2;stripe++)box(g,.12,.17,.64,'#f2efdf',stripe*Math.min(.65,w/7),1.96,d/2+.35,{shadow:false});
    box(g,w+.25,.12,.16,'#34372e',0,1.84,d/2+.36,{shadow:false});
  }
  if(id==='hospital'){
    box(g,.62,.13,.15,'#f7f4e9',0,wallH+.32,d/2+.23,{shadow:false});
    box(g,.15,.62,.15,'#d64e4e',0,wallH+.32,d/2+.24,{shadow:false});
    box(g,.62,.15,.15,'#d64e4e',0,wallH+.32,d/2+.24,{shadow:false});
  }
  if(['garage','works','press','fttr','station'].includes(id)){
    box(g,.85,.32,.7,'#85877d',w/2-.7,wallH+.24,-d/2+.65,{shadow:false});
    box(g,.9,.07,.76,'#4a4e44',w/2-.7,wallH+.42,-d/2+.65,{shadow:false});
  }
  if(kind==='stadium'){
    // simple stadium bowl and visible stands
    box(g,w-.6,.32,d-.6,'#526f4b',0,.55,0,{shadow:false});
    for(let i=0;i<4;i++){box(g,w-.8-i*.18,.18,.36,'#d9d4bd',0,.82+i*.2,-d/2+.45+i*.26,{shadow:false});box(g,.36,.18,d-.8-i*.18,'#d9d4bd',-w/2+.45+i*.26,.82+i*.2,0,{shadow:false});}
  }
  if(id==='fttr'){
    box(g,w-.45,.12,.38,'#d7ff3f',0,wallH+.12,d/2+.22,{shadow:false});
    // display windows hint at hanging shirts
    for(let i=0;i<3;i++){box(g,.24,.36,.06,['#f2efdf','#171914','#667aa0'][i],-1+i,1.1,d/2+.1,{shadow:false});}
  }
  const hit=new THREE.Mesh(new THREE.BoxGeometry(w+1,wallH+1,d+1),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001,depthWrite:false}));hit.position.set(0,wallH/2+.3,0);hit.userData.placeId=id;g.add(hit);pickables.push(hit);
  const p={id,name,type,desc,glyph,tag,x,z,w,d,hours,kind,group:g,hit};places.push(p);return p;
}
function createCity(){
  cityGroup=new THREE.Group();scene.add(cityGroup);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),material('grass','#aeb9a0'));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;cityGroup.add(ground);
  // park patches
  for(const [x,z,w,d] of [[-14,-10,7,5],[14,-12,8,4],[-14,12,7,5],[12,15,7,5]]){
    box(cityGroup,w,.04,d,'#8fa586',x,-.03,z,{shadow:false});
    for(let i=0;i<4;i++){cylinder(cityGroup,.28,.42,1.3,'#705b42',x+(i%2)*2-1,.65,z+Math.floor(i/2)*1.6-0.8,7);cylinder(cityGroup,.9,.75,1.2,'#66845b',x+(i%2)*2-1,1.8,z+Math.floor(i/2)*1.6-0.8,8);}
  }
  // crossroad and pedestrian sidewalks
  box(cityGroup,80,.05,5,'#555951',0,-.01,0,{shadow:false});box(cityGroup,5,.06,80,'#555951',0,0,0,{shadow:false});
  box(cityGroup,80,.06,.8,'#c9c4b0',0,.015,-3.0,{shadow:false});box(cityGroup,80,.06,.8,'#c9c4b0',0,.015,3.0,{shadow:false});box(cityGroup,.8,.06,80,'#c9c4b0',-3,.015,0,{shadow:false});box(cityGroup,.8,.06,80,'#c9c4b0',3,.015,0,{shadow:false});
  // crosswalks
  for(let i=-3;i<=3;i++) {box(cityGroup,.55,.035,1.6,'#e7e4d5',i*.8,.035,-3.9,{shadow:false});box(cityGroup,1.6,.035,.55,'#e7e4d5',-3.9,.035,i*.8,{shadow:false});}
  // street markings
  for(let i=-35;i<35;i+=4) box(cityGroup,1.6,.025,.12,'#d9d6c8',i,.025,0,{shadow:false});
  // low-rise blocks create a believable city perimeter
  const blocks=[[-22,-18,7,5,'#b8a58c'],[-13,-20,6,4,'#d2c7b1'],[-3,-20,7,4,'#b6c0b0'],[9,-21,6,4,'#c4b9a6'],[21,-17,7,5,'#c0b2a0'],[-23,-6,6,4,'#bdb6a6'],[21,3,6,5,'#b8c3b3'],[-22,20,7,5,'#c7bca7'],[-10,21,6,4,'#aeb8a8'],[22,21,7,5,'#c8b8a7']];
  blocks.forEach(([x,z,w,d,c],i)=>{const g=new THREE.Group();g.position.set(x,0,z);cityGroup.add(g);box(g,w,3.1,d,c,0,1.55,0);box(g,w+.12,.2,d+.12,'#44473e',0,3.2,0);for(let a=0;a<Math.floor(w/1.5);a++)for(let b=0;b<2;b++)box(g,.45,.55,.05,'#8fa8a2',-w/2+.7+a*1.35,1.1+b*1.1,d/2+.03,{shadow:false});});
  addPlace({id:'fttr',name:'FUCK THE RULES STORE',type:'STREETWEAR / RETAIL',desc:'Toko utama FTTR di pusat kota. Jelajahi koleksi, lihat produk di rak, lalu lanjutkan ke katalog dan checkout asli.',glyph:'FTTR',tag:'FLAGSHIP STORE',x:-7,z:-7,w:5.5,d:4.2,color:'#c8c3b4'});
  addPlace({id:'station',name:'CENTRAL STATION',type:'TRANSPORT HUB',desc:'Stasiun utama yang menghubungkan Central City dengan Northside, Eastbank, dan kota-kota berikutnya.',glyph:'CENTRAL',tag:'TRAIN · BUS',x:8,z:-7,w:5,d:4,color:'#b7b9af'});
  addPlace({id:'billboard',name:'CENTRAL BILLBOARD',type:'ADVERTISING SPACE',desc:'Slot iklan kota. Pada versi ini billboard masih kosong; nantinya admin dapat menjadwalkan kampanye dan sponsor.',glyph:'YOUR AD',tag:'AD SLOT',x:0,z:-14,w:5.8,d:2.8,color:'#c7b9a7'});
  addPlace({id:'cafe',name:'CORNER KITCHEN',type:'FOOD & DRINK',desc:'Tempat membeli makanan dan memulihkan stamina. Pesan dari dalam restoran atau gunakan aplikasi Food di HP.',glyph:'KITCHEN',tag:'FOOD',x:8,z:7,w:4.3,d:3.5,color:'#d0bca1'});
  addPlace({id:'pub',name:'THE AWAY END',type:'SUPPORTER PUB',desc:'Tempat berkumpul supporter sebelum derby, membahas pertandingan, dan merencanakan perjalanan tandang.',glyph:'AWAY END',tag:'SUPPORTERS',x:-9,z:7,w:4.5,d:3.5,color:'#b9b7a0'});
  addPlace({id:'stadium',name:'CENTRAL GROUND',type:'FOOTBALL STADIUM',desc:'Stadion pusat untuk event liga, layar skor, dan perayaan juara. Pertandingan berjalan otomatis pada fase awal.',glyph:'GROUND',tag:'MATCHDAY',x:17,z:11,w:7,d:6,color:'#c6c1b2',kind:'stadium'});
  addPlace({id:'hospital',name:'CENTRAL CITY HOSPITAL',type:'HEALTHCARE / EMERGENCY',desc:'Rumah sakit kota untuk pemeriksaan, pemulihan kesehatan, dan layanan darurat. Gunakan Health di Phone untuk perawatan.',glyph:'HOSPITAL',tag:'HEALTHCARE',x:-16,z:1,w:5.5,d:4.2,color:'#d2cfc1'});
  addPlace({id:'cafe2',name:'HIGH STREET CAFÉ',type:'CAFÉ / DRINKS',desc:'Kopi, teh, air mineral, dan minuman untuk memulihkan thirst dan energi.',glyph:'CAFÉ',tag:'FOOD · DRINK',x:1,z:-8,w:4,d:3,color:'#c5b49e'});
  addPlace({id:'market',name:'CENTRAL MINI MARKET',type:'GROCERIES',desc:'Beli makanan cepat saji, buah, air mineral, dan kebutuhan harian.',glyph:'MINI MART',tag:'GROCERIES',x:-14,z:-7,w:4.2,d:3.2,color:'#b9c4b1'});
  addPlace({id:'garage',name:'EASTBANK GARAGE',type:'VEHICLE SERVICE',desc:'Bengkel kendaraan dan pusat pekerjaan mekanik di kawasan Eastbank.',glyph:'GARAGE',tag:'WORKSHOP',x:20,z:17,w:5.2,d:3.6,color:'#b4aaa0'});
  addPlace({id:'press',name:'CITY PRESS OFFICE',type:'MEDIA / NEWSROOM',desc:'Kantor berita kota, tempat jurnalis menulis laporan dan fotografi matchday.',glyph:'CITY PRESS',tag:'MEDIA JOBS',x:-15,z:14,w:4.8,d:3.5,color:'#c9c4b4'});
  addPlace({id:'works',name:'EASTBANK WORKS',type:'INDUSTRIAL / CONSTRUCTION',desc:'Area industri, gudang, dan pekerjaan konstruksi.',glyph:'WORKS',tag:'INDUSTRY',x:21,z:22,w:5.5,d:4,color:'#aaa99f'});
  addPlace({id:'police',name:'CITY POLICE',type:'PUBLIC SERVICE',desc:'Pos polisi untuk pengamanan event, pengumuman insiden, dan roleplay petugas pada tahap multiplayer berikutnya.',glyph:'POLICE',tag:'CITY SAFETY',x:15,z:-1,w:4,d:3,color:'#b8c1bd'});
  addPlace({id:'busstop',name:'HIGH STREET BUS STOP',type:'PUBLIC TRANSPORT',desc:'Halte bus untuk perjalanan antardistrik dan keberangkatan supporter.',glyph:'BUS STOP',tag:'BUS',x:-1,z:8,w:3.2,d:2.2,color:'#c8c3b3'});
  // Two additional football districts share the same explorable city map.
  addPlace({id:'northside-fc',name:'NORTHSIDE FC — NORTH END',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside FC. Tradisi supporter, matchday, mural, dan rivalitas lokal.',glyph:'NORTHSIDE FC',tag:'HOME GROUND',x:-27,z:-17,w:8,d:6,color:'#aeb8a6',kind:'stadium'});
  addPlace({id:'northside-athletic',name:'NORTHSIDE ATHLETIC — ATHLETIC PARK',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside Athletic. Klub dengan identitas berbeda dan derby satu distrik.',glyph:'ATHLETIC',tag:'HOME GROUND',x:-27,z:-5,w:7,d:5.5,color:'#c4b7a3',kind:'stadium'});
  addPlace({id:'eastbank-united',name:'EASTBANK UNITED — CANAL GROUND',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank United di tepi kanal dan kawasan industri.',glyph:'EASTBANK UTD',tag:'HOME GROUND',x:27,z:-17,w:8,d:6,color:'#b3b7ad',kind:'stadium'});
  addPlace({id:'eastbank-rovers',name:'EASTBANK ROVERS — RIVERSIDE',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank Rovers. Rival sekota dengan kultur supporter yang kuat.',glyph:'EASTBANK ROVERS',tag:'HOME GROUND',x:27,z:-5,w:7,d:5.5,color:'#c4b9a7',kind:'stadium'});
  addPlace({id:'northside-market',name:'NORTHSIDE HIGH STREET',type:'SHOPPING DISTRICT',desc:'Jalan komersial Northside: kios, tempat makan, dan titik kumpul supporter.',glyph:'NORTHSIDE',tag:'DISTRICT',x:-27,z:8,w:6,d:4,color:'#c2b6a2'});
  addPlace({id:'eastbank-market',name:'EASTBANK CANAL MARKET',type:'INDUSTRIAL MARKET',desc:'Pasar kanal Eastbank di antara gudang bata, jembatan, dan kawasan kerja.',glyph:'EASTBANK',tag:'DISTRICT',x:27,z:8,w:6,d:4,color:'#aeb9b1'});
  // empty advertising board above sidewalk
  const ad=new THREE.Group();ad.position.set(0,0,-11.8);cityGroup.add(ad);cylinder(ad,.08,.08,2.2,'#353830',-1,.95,0,8);cylinder(ad,.08,.08,2.2,'#353830',1,.95,0,8);box(ad,4.2,1.5,.18,'#171914',0,2.3,0);sign(ad,'YOUR AD HERE',0,2.32,.105,3.9,1.1,'#171914','#d7ff3f');
  // benches and lamp posts on plaza
  for(const [x,z] of [[-2,-5],[3,5],[-12,0],[12,2]]){box(cityGroup,1.3,.12,.38,'#755b3f',x,.5,z);box(cityGroup,1.3,.1,.1,'#33352e',x,.3,z);cylinder(cityGroup,.06,.07,2.7,'#4a4e44',x+1.2,1.35,z,7);cylinder(cityGroup,.18,.18,.12,'#e9e5c8',x+1.2,2.7,z,8);}
}
function shirt(parent,x,z,color,scale=1){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const body=box(g,.52*scale,.68*scale,.12*scale,color,0,.82*scale,0);body.rotation.z=.02;box(g,.24*scale,.3*scale,.11*scale,color,-.34*scale,.94*scale,0,{ry:0});box(g,.24*scale,.3*scale,.11*scale,color,.34*scale,.94*scale,0);box(g,.18*scale,.035*scale,.125*scale,'#f2efdf',0,.87*scale,.066*scale,{shadow:false});return g;}

function createBotWorkers(){
  const spots=[[-5.2,-7.3,'#d7ff3f'],[9.5,-6.2,'#5875a6'],[9.4,7.9,'#c76f51'],[-10,7.9,'#e0d9c7'],[-15,2.5,'#d7ff3f'],[-14,14.5,'#5d8c83'],[20.5,17.8,'#b6b4a8'],[15.5,-.2,'#586a8c'],[-1,8.8,'#d7ff3f']];
  spots.forEach(([x,z,shirtColor],i)=>{const npc=new THREE.Group();cityGroup.add(npc);const cloth=material(`bot-shirt-${i}`,shirtColor),skin=material(`bot-skin-${i}`,i%2?'#b87d58':'#d5a07b'),pants=material(`bot-pants-${i}`,'#34372f');box(npc,.38,.46,.25,cloth,0,.78,0);box(npc,.29,.29,.28,skin,0,1.17,0);box(npc,.31,.09,.3,'#30251f',0,1.34,-.01,{shadow:false});box(npc,.13,.31,.14,pants,-.1,.39,0);box(npc,.13,.31,.14,pants,.1,.39,0);box(npc,.13,.32,.14,cloth,-.27,.78,0);box(npc,.13,.32,.14,cloth,.27,.78,0);npc.position.set(x,0,z);npc.userData.baseY=0;npc.userData.phase=i*.7;botWorkers.push(npc);});
}
function createInterior(){
  interiorGroup=new THREE.Group();scene.add(interiorGroup);interiorGroup.visible=false;
  // roof-free store floor and perimeter walls: deliberately top-down 2.5D
  box(interiorGroup,16,.18,12,'#d8d2c2',0,-.1,0,{shadow:false});
  box(interiorGroup,16,2.6,.28,'#b7b2a3',0,1.2,-6);box(interiorGroup,.28,2.6,12,'#b7b2a3',-8,1.2,0);box(interiorGroup,.28,2.6,12,'#b7b2a3',8,1.2,0);
  box(interiorGroup,16,.14,.22,'#171914',0,2.5,-6);box(interiorGroup,.14,.14,12,'#171914',-8,2.5,0);box(interiorGroup,.14,.14,12,'#171914',8,2.5,0);
  // FTTR wall and sign
  box(interiorGroup,5,.05,1.4,'#171914',0,2.42,-5.82);sign(interiorGroup,'FVCKTHERULES',0,2.47,-5.72,4.7,.8,'#171914','#d7ff3f');
  // tiled zones and rug
  box(interiorGroup,7,.035,4.2,'#c5c0b0',0,.02,-1.5,{shadow:false});box(interiorGroup,4,.04,2.6,'#d7ff3f',0,.03,2.6,{shadow:false});
  // wall racks and hanging shirts
  for(const x of [-5.6,-2.7,2.7,5.6]){box(interiorGroup,1.5,.15,.55,'#292c25',x,1.45,-3.8);box(interiorGroup,1.45,.08,.08,'#d7ff3f',x,1.8,-3.8);for(let j=0;j<3;j++)shirt(interiorGroup,x-.48+j*.48,-3.8,['#171914','#f2efdf','#4a648b'][j],.55);}
  // central display islands
  for(const [x,z] of [[-3,-.2],[0,-.2],[3,-.2]]){box(interiorGroup,1.9,.45,1.2,'#b5ad9c',x,.25,z);box(interiorGroup,1.92,.08,1.22,'#171914',x,.51,z);shirt(interiorGroup,x,z,['#171914','#f2efdf','#7583a0'][Math.round(x+3)/3],.7);}
  // cashier counter and screen
  box(interiorGroup,3,.95,.8,'#171914',0,.5,4.1);box(interiorGroup,3.05,.1,.85,'#d7ff3f',0,1.02,4.1);box(interiorGroup,.55,.5,.12,'#353830',0,1.32,3.82);box(interiorGroup,.45,.3,.08,'#91b5a7',0,1.35,3.73);
  sign(interiorGroup,'SHOP FLOOR',0,.15,5.9,3,.45,'#f2efdf','#171914');
  // door threshold
  box(interiorGroup,2,.12,.3,'#d7ff3f',0,.02,5.7,{shadow:false});
  const floorHit=new THREE.Mesh(new THREE.PlaneGeometry(15,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001,side:THREE.DoubleSide}));floorHit.rotation.x=-Math.PI/2;floorHit.position.set(0,.025,0);floorHit.userData.floor=true;interiorGroup.add(floorHit);groundInterior=floorHit;
  // merchandise rack hit targets
  const rackHit=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.5,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001}));rackHit.position.set(0,1,0);rackHit.userData.action='merch';interiorGroup.add(rackHit);pickables.push(rackHit);
}
let groundInterior;
function createPlayer(){
  player=new THREE.Group();scene.add(player);
  // Voxel / pixel-style citizen: square head, hair, torso, arms and legs.
  const skin=material('citizen-skin','#c98f68'), shirtMat=material('citizen-shirt','#d7ff3f'), trousers=material('citizen-trousers','#252a25'), shoes=material('citizen-shoes','#f2efdf');
  playerBody=box(player,.48,.58,.3,shirtMat,0,.88,0);playerBody.castShadow=true;
  playerHead=box(player,.34,.34,.32,skin,0,1.36,0);playerHead.castShadow=true;
  box(player,.36,.12,.34,'#29231f',0,1.57,-.015,{shadow:false});
  box(player,.08,.055,.025,'#171914',-.075,1.38,.17,{shadow:false});box(player,.08,.055,.025,'#171914',.075,1.38,.17,{shadow:false});
  const armL=box(player,.14,.42,.16,shirtMat,-.33,.88,0),armR=box(player,.14,.42,.16,shirtMat,.33,.88,0);armL.rotation.z=-.12;armR.rotation.z=.12;
  box(player,.16,.38,.18,trousers,-.13,.4,0);box(player,.16,.38,.18,trousers,.13,.4,0);box(player,.18,.1,.25,shoes,-.13,.16,.035);box(player,.18,.1,.25,shoes,.13,.16,.035);
  box(player,.38,.07,.24,'#171914',0,.19,0,{shadow:false});
  ring=new THREE.Mesh(new THREE.RingGeometry(.4,.47,4),new THREE.MeshBasicMaterial({color:'#d7ff3f',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;player.add(ring);player.position.set(-1,0,5);
}
function setMoney(v){money=Math.max(0,v);moneyEl.textContent=money.toLocaleString('id-ID');localStorage.setItem('fttr.city.money',String(money));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function saveNeeds(){localStorage.setItem('fttr.city.needs',JSON.stringify(needs));}
function updateNeedsUI(){for(const [key,label] of [['hunger','Hunger'],['thirst','Thirst'],['health','Health'],['energy','Energy']]){const value=Math.round(needs[key]);const bar=$(`#${key}Bar`),val=$(`#${key}Val`);if(bar)bar.style.width=value+'%';if(val)val.textContent=value;if(bar?.parentElement?.parentElement?.parentElement)bar.parentElement.parentElement.parentElement.classList.toggle('low',value<25);}const mood=$('#needMood');if(mood)mood.textContent=needs.health<35?'NEED MEDIC':needs.hunger<20?'HUNGRY':needs.thirst<20?'THIRSTY':needs.energy<20?'TIRED':'FIT';}
function recoverNeed(key,value){needs[key]=Math.min(100,needs[key]+value);saveNeeds();updateNeedsUI();}
function needsSummary(){return `<div class="needs-inline">${[['Hunger','hunger'],['Thirst','thirst'],['Health','health'],['Energy','energy']].map(([n,k])=>`<div><small>${n}</small><b>${Math.round(needs[k])}/100</b></div>`).join('')}</div>`;}
function takeJob(id){
  const j=JOBS.find(x=>x.id===id);if(!j)return;
  if(activeJob){toast('Selesaikan shift yang sedang berjalan terlebih dahulu');return;}
  if(needs.energy<12){showNotice('⚡','TOO TIRED','Energi terlalu rendah. Istirahat atau beli makanan/minuman dulu.');return;}
  activeJob=id;jobBots.set(id,{name:'YOU',active:false});toast(`Shift dimulai: ${j.name} · 12 detik`);renderPhone('jobs');
  jobTimer=setTimeout(async()=>{
    try{
      let reward=j.reward;
      if(window.FTTROnline?.connected){const r=await window.FTTROnline.action({type:'job',job:id,idempotency:`JOB-${crypto.randomUUID()}`});setMoney(r.balance);reward=r.reward;}
      else setMoney(money+reward);
      needs.energy=Math.max(0,needs.energy-15);needs.hunger=Math.max(0,needs.hunger-5);saveNeeds();updateNeedsUI();
      showNotice('₡','SHIFT COMPLETED',`${j.name} selesai setelah 12 detik. +₡${reward}. Bot kembali menjaga posisi pekerjaan saat shift selesai.`);
    }catch(e){showNotice('!','SHIFT FAILED',e.message||'Shift gagal diproses.');}
    finally{activeJob=null;jobTimer=null;jobBots.set(id,{name:`BOT ${id.toUpperCase()}`,active:true});renderPhone('jobs');}
  },12000);
}

function showNotice(icon,title,text,actions=[]){$('#noticeIcon').textContent=icon;$('#noticeTitle').textContent=title;$('#noticeText').textContent=text;$('#noticeActions').innerHTML='';actions.forEach(a=>{const b=document.createElement('button');b.className='solid-btn '+(a.acid?'acid':'');b.textContent=a.label;b.onclick=()=>{if(a.run)a.run();$('#noticeModal').hidden=true;};$('#noticeActions').appendChild(b);});$('#noticeModal').hidden=false;}
function openPlace(p){selectedPlace=p;$('#placeCard').hidden=false;$('#placeGlyph').textContent=p.glyph;$('#placeTag').textContent=p.tag;$('#placeType').textContent=p.type;$('#placeName').textContent=p.name;$('#placeDesc').textContent=p.desc;$('#placeHours').textContent=p.hours;$('#placeDistance').textContent=`⌖ ${Math.round(Math.hypot(player.position.x-p.x,player.position.z-p.z)*18)} m`;$('#placeEnter').innerHTML=(p.id==='fttr'?'MASUK STORE':'MASUK LOKASI')+' <span>↗</span>';$('#placeArt').style.background=p.id==='fttr'?'#171914':p.id==='stadium'?'#536d4d':p.id==='billboard'?'#b5a895':'#34382f';}
function closePlace(){selectedPlace=null;$('#placeCard').hidden=true;}
function enterPlace(){if(!selectedPlace)return;const p=selectedPlace;closePlace();if(p.id==='hospital'){openPhone('health');return;}if(['cafe','cafe2','market','northside-market','eastbank-market'].includes(p.id)){openPhone('food');return;}if(['press','works','garage'].includes(p.id)){openPhone('jobs');return;}if(p.id==='fttr'){enterStore();return;}if(p.id==='station'){openPhone('travel');return;}if(p.id==='cafe'){openPhone('food');return;}if(p.id==='stadium'){openPhone('football');return;}if(p.id==='billboard'){showNotice('▤','CENTRAL BILLBOARD','Slot iklan ini sengaja dibiarkan kosong dalam prototype. Nantinya slot dapat dipesan brand, sponsor event, atau kampanye FTTR.');return;}if(p.id==='police'){showNotice('✚','CITY POLICE','Pos layanan polisi. Sistem patroli, pengamanan derby, laporan insiden, dan roleplay petugas direncanakan untuk versi multiplayer.');return;}if(p.id==='busstop'){openPhone('travel');return;}if(p.id==='pub'){showNotice('⚑','THE AWAY END','Tempat berkumpul supporter, menyusun perjalanan tandang, dan membaca berita klub. Fitur grup supporter akan ditambahkan di tahap berikutnya.');return;}showNotice('↗',p.name,p.desc);}
function enterStore(){isInside=true;cityGroup.visible=false;interiorGroup.visible=true;pickables.splice(0,pickables.length,...pickables.filter(o=>o.userData.action));player.position.set(0,0,4.8);destination=null;$('#interiorHud').hidden=false;$('#interiorName').textContent='FUCK THE RULES STORE';$('#districtName').textContent='FTTR STORE';cameraFollow=true;cameraZoom=1.4;camera.zoom=cameraZoom;cameraTarget?.set(0,0,0);camera.position.set(15,22,15);camera.lookAt(0,0,0);camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Masuk ke FTTR Store');}
function exitStore(){isInside=false;interiorGroup.visible=false;cityGroup.visible=true;pickables.splice(0,pickables.length,...places.map(p=>p.hit));player.position.set(-7,0,-4.4);destination=null;$('#interiorHud').hidden=true;$('#districtName').textContent='CENTRAL CITY';cameraZoom=1;camera.zoom=1;cameraTarget?.set(player.position.x,0,player.position.z);cameraFollow=true;camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Kembali ke Central City');}
function resize(){if(!renderer||!camera)return;const w=innerWidth,h=innerHeight;renderer.setSize(Math.max(1,Math.round(w*.64)),Math.max(1,Math.round(h*.64)),false);canvas.style.width='100%';canvas.style.height='100%';const aspect=w/h;const view=18;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();}
function applyZoom(v){cameraZoom=Math.max(.65,Math.min(2.4,v));if(camera){camera.zoom=cameraZoom;camera.updateProjectionMatrix();}toast(`Zoom ${Math.round(cameraZoom*100)}%`);}
function resetCamera(){cameraFollow=true;cameraZoom=1;camera.zoom=1;camera.updateProjectionMatrix();if(player)cameraTarget?.set(player.position.x,0,player.position.z);$('#cameraFollow')?.classList.add('active');toast('Kamera mengikuti karakter');}
function pointerDown(e){if(e.pointerType==='touch'&&e.isPrimary===false)return;dragState={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture?.(e.pointerId);}
function pointerMove(e){if(!dragState||dragState.id!==e.pointerId)return;const dx=e.clientX-dragState.lastX,dy=e.clientY-dragState.lastY;if(Math.hypot(e.clientX-dragState.x,e.clientY-dragState.y)>5)dragState.moved=true;if(dragState.moved){cameraFollow=false;$('#cameraFollow')?.classList.remove('active');const scale=(36/(innerHeight||1))/cameraZoom;const panX=-dx*scale,panZ=dy*scale;cameraTarget ||= new THREE.Vector3(player?.position.x||0,0,player?.position.z||0);cameraTarget.x+=panX;cameraTarget.z+=panZ;camera.position.x+=panX;camera.position.z+=panZ;camera.lookAt(cameraTarget); }dragState.lastX=e.clientX;dragState.lastY=e.clientY;}
function pointerUp(e){if(!dragState)return;const moved=dragState.moved;dragState=null;if(!moved)onPointer(e);}
function touchPinch(e){if(e.touches?.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDistance)applyZoom(cameraZoom*(d/pinchDistance));pinchDistance=d;e.preventDefault();}else pinchDistance=0;}
function worldFromEvent(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);}
function onPointer(e){if($('#phoneOverlay').hidden===false||$('#mapOverlay').hidden===false||$('#noticeModal').hidden===false||$('#shopOverlay').hidden===false)return;worldFromEvent(e);const hits=raycaster.intersectObjects(pickables,true);if(hits.length){const obj=hits[0].object;const id=obj.userData.placeId;if(id){const p=places.find(q=>q.id===id);if(p){destination=new THREE.Vector3(p.x,0,p.z+Math.min(2.7,p.d/2+1));openPlace(p);}return;}if(obj.userData.action==='merch'){showNotice('✦','FTTR MERCH WALL','Pilih koleksi melalui katalog toko asli. Model rak ini menjadi titik interaksi merchandise di interior. ',[{label:'BUKA KATALOG',acid:true,run:openShop}]);return;}}
  const floor=raycaster.intersectObject(isInside?groundInterior:ground,false)[0];if(floor){const point=floor.point;destination=new THREE.Vector3(point.x,0,point.z);if(isInside){destination.x=Math.max(-6.5,Math.min(6.5,destination.x));destination.z=Math.max(-4.8,Math.min(4.8,destination.z));}else{destination.x=Math.max(-36,Math.min(36,destination.x));destination.z=Math.max(-36,Math.min(36,destination.z));}closePlace();}}
function makeBuildingProxyClick(p){return p;}
function update(dt){if(destination){const dx=destination.x-player.position.x,dz=destination.z-player.position.z,dist=Math.hypot(dx,dz);if(dist<.12)destination=null;else{const speed=isInside?3.2:3.6;const step=Math.min(dist,speed*dt);player.position.x+=dx/dist*step;player.position.z+=dz/dist*step;player.rotation.y=Math.atan2(dx,dz);playerBody.position.y=.88+Math.abs(Math.sin(performance.now()*.012))*.045;}}
  if(cameraFollow){cameraTarget ||= new THREE.Vector3();cameraTarget.lerp(new THREE.Vector3(player.position.x,0,player.position.z),Math.min(1,dt*2.6));const offset=isInside?new THREE.Vector3(13,19,13):new THREE.Vector3(19,25,19);camera.position.lerp(cameraTarget.clone().add(offset),Math.min(1,dt*2.6));camera.lookAt(cameraTarget);}
  botWorkers.forEach(n=>{n.position.y=.018+Math.abs(Math.sin(performance.now()*.001+n.userData.phase))*.025;});
  if(performance.now()-lastNeedsTick>12000){lastNeedsTick=performance.now();needs.hunger=Math.max(0,needs.hunger-.35);needs.thirst=Math.max(0,needs.thirst-.55);needs.energy=Math.max(0,needs.energy-.22);if(needs.hunger<15||needs.thirst<12)needs.health=Math.max(1,needs.health-.4);saveNeeds();updateNeedsUI();}
}
function animate(t){requestAnimationFrame(animate);const dt=Math.min(.05,(t-(lastTime||t))/1000||0);lastTime=t;if(player)update(dt);if(player){const nextDistrict=player.position.x < -20 ? 'Northside' : player.position.x > 20 ? 'Eastbank' : 'Central City';if(nextDistrict!==activeDistrict){activeDistrict=nextDistrict;$('#districtName').textContent=activeDistrict.toUpperCase();window.FTTROnline?.sendRoom(activeDistrict.toLowerCase().replace(/\s+/g,'-'));}if(t-lastOnlineSync>450){lastOnlineSync=t;window.FTTROnline?.sendPosition(player.position.x,player.position.z,activeDistrict);}}renderer.render(scene,camera);}
window.FTTRCity={district:()=>activeDistrict,remoteMove(p){if(!THREE||!scene||p.district!==activeDistrict)return;let g=remoteAvatars.get(p.id);if(!g){g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.48,3,6),new THREE.MeshStandardMaterial({color:'#536fbd'}));body.position.y=.45;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshStandardMaterial({color:'#d8a77c'}));head.position.y=.88;g.add(head);scene.add(g);remoteAvatars.set(p.id,g);}g.position.set(Number(p.x)||0,0,Number(p.z)||0);},removeRemote(id){const g=remoteAvatars.get(id);if(g){scene.remove(g);remoteAvatars.delete(id);}}};
function appHome(){return `<div class="phone-widget"><small>WELCOME TO CENTRAL CITY</small><h3>Make the city<br>your own.</h3><p>Support your club. Meet your people. Move your way.</p></div><div class="balance-card"><small>VIRTUAL WALLET</small><strong>₡ ${money.toLocaleString('id-ID')}</strong><small>DEMO CURRENCY · NOT REAL MONEY</small></div><div class="phone-section-title">YOUR APPS <small>4G+</small></div><div class="app-grid">${[['messages','✉','Messages'],['map','⌖','City Map'],['ride','↗','Ride'],['food','🍔','Food & Drink'],['health','✚','Health'],['travel','⇄','Travel'],['football','◉','Football'],['jobs','▤','Jobs'],['wallet','₡','Wallet'],['store','FT','FTTR Store']].map(([id,ico,label])=>`<button class="app-icon" data-open-app="${id}"><span>${ico}</span><small>${label}</small></button>`).join('')}</div><p class="fineprint">Prototype mode: layanan belum tersambung ke server multiplayer atau pembayaran sungguhan.</p>`;}
function row(icon,title,desc,action,label='OPEN'){return `<button class="service-row" data-action="${action}"><span class="service-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><span class="arrow">${label==='OPEN'?'›':'↗'}</span></button>`;}
function renderPhone(app='home'){
  const title={home:'FTTR PHONE',messages:'MESSAGES',map:'CITY MAP',ride:'RIDE',food:'FOOD & DRINK',health:'HEALTH & HOSPITAL',travel:'TRAVEL & TICKETS',football:'FOOTBALL',jobs:'CITY JOBS',wallet:'WALLET',store:'FTTR STORE'}[app]||'FTTR PHONE';$('#phoneTitle').textContent=title;const body=$('#phoneBody');
  if(app==='home'){body.innerHTML=appHome();return;}
  if(app==='messages'){body.innerHTML=`<div class="phone-widget"><small>INBOX</small><h3>Stay connected.</h3><p>Obrolan multiplayer akan tersambung saat backend chat diaktifkan.</p></div><div class="message"><b>FTTR CITY SYSTEM · 09:30</b>Welcome to Central City. Jelajahi kota dan kunjungi FTTR Store.</div><div class="message"><b>NORTHSIDE SUPPORTERS</b>Matchday berikutnya segera diumumkan. Siapkan scarf dan rencana away-day.</div><label class="mini-label" for="chatDraft">QUICK MESSAGE (LOCAL DEMO)</label><input class="input" id="chatDraft" placeholder="Tulis pesan..." maxlength="160"><button class="solid-btn" data-action="send-chat">SEND MESSAGE</button><p class="fineprint">Pesan hanya ditampilkan sebagai demo lokal; belum dikirim ke pemain lain.</p>`;return;}
  if(app==='map'){body.innerHTML=`<div class="phone-widget"><small>YOU ARE HERE</small><h3>Central City</h3><p>Jantung kota: retail, transportasi, tempat berkumpul, dan billboard.</p></div><div class="service-list">${places.map(p=>row('⌖',p.name,p.type,`goto:${p.id}`,'GO')).join('')}${row('⇄','Northside','2 clubs · 2 stadiums','district:northside','TRAVEL')}${row('⇄','Eastbank','2 clubs · 2 stadiums','district:eastbank','TRAVEL')}</div>`;return;}
  if(app==='ride'){body.innerHTML=`<div class="phone-widget"><small>ON-DEMAND TRANSPORT</small><h3>Where to?</h3><p>Pesan taksi untuk berpindah ke lokasi di Central City. Versi ini menggunakan tarif demo.</p></div><label class="mini-label" for="rideDestination">DESTINATION</label><select class="select" id="rideDestination">${places.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select><div class="balance-card"><small>ESTIMATED FARE</small><strong>₡ 80–140</strong></div><button class="solid-btn acid" data-action="book-ride">BOOK A RIDE</button><p class="fineprint">Taksi belum memakai pengemudi multiplayer; pemesanan hanya mensimulasikan perjalanan.</p>`;return;}
  if(app==='food'){body.innerHTML=`<div class="phone-widget"><small>FOOD, DRINK & GROCERIES</small><h3>Keep your citizen going.</h3><p>Hunger dan thirst turun perlahan. Makan/minum memulihkan bar kebutuhan.</p>${needsSummary()}</div><div class="service-list">${row('🍗','Rajawali Chicken','Chicken rice · ₡120 · Hunger +30','food:chicken','₡120')}${row('🍚','Corner Kitchen','Nasi ikan · ₡180 · Hunger +45','food:fish','₡180')}${row('🍎','Market fruit pack','Buah segar · ₡80 · Hunger +20','food:fruit','₡80')}${row('🥤','Bottled water','Air mineral · ₡35 · Thirst +35','food:water','₡35')}${row('☕','High Street Café','Coffee · ₡60 · Thirst +15, Energy +10','food:drink','₡60')}${row('🥪','Corner deli sandwich','Sandwich · ₡95 · Hunger +25','food:sandwich','₡95')}</div><p class="fineprint">Virtual currency only. No real-money purchases here.</p>`;return;}
  if(app==='health'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL CITY HEALTH SERVICE</small><h3>Take care of yourself.</h3><p>Jika kesehatan rendah, kunjungi rumah sakit. Kondisi warga dipantau selama bermain.</p>${needsSummary()}</div><div class="service-list">${row('🏥','Hospital check-up','₡180 · Health +45, Energy +15','health:check','₡180')}${row('💊','First-aid kit','₡90 · Health +20','health:kit','₡90')}${row('🛏️','Rest at home','Free · Energy +25','health:rest','FREE')}${row('🚑','Emergency treatment','₡350 · Restore health to 100','health:emergency','₡350')}</div><p class="fineprint">Layanan kesehatan merupakan simulasi gameplay, bukan layanan medis nyata.</p>`;return;}
  if(app==='travel'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL STATION</small><h3>Next stop: elsewhere.</h3><p>Jaringan antarkota akan menghubungkan Central City dengan kota klub.</p></div><div class="service-list">${row('🚆','Northside','Train ticket · ₡100 · 2 clubs','ticket:north','₡100')}${row('🚆','Eastbank','Train ticket · ₡100 · 2 clubs','ticket:east','₡100')}${row('🚌','Away-day coach','Matchday supporter trip · ₡60','ticket:away','₡60')}${row('🎟','Central Ground','Automatic league match · ₡80','ticket:match','₡80')}</div><p class="fineprint">Tiket yang dibeli saat ini hanya simulasi UI. Kota tujuan belum dibangun pada prototype ini.</p>`;return;}
  if(app==='football'){body.innerHTML=window.FTTRFootball?window.FTTRFootball.render(window.FTTRFootballTab||'league'):'<div class="message">Football engine is loading…</div><button class="solid-btn" data-action="stadium">GO TO CENTRAL GROUND</button>';return;}
  if(app==='jobs'){body.innerHTML=`<div class="phone-widget"><small>WORK & CITY ECONOMY</small><h3>Every job keeps the city running.</h3><p>Jika tidak ada pemain mengambil pekerjaan, BOT otomatis bertugas agar layanan kota tetap berjalan. Ambil shift untuk menggantikan BOT sementara dan dapatkan upah.</p><div class="needs-inline"><div><small>Available jobs</small><b>${JOBS.length}</b></div><div><small>Bot-covered roles</small><b>${JOBS.filter(j=>jobBots.get(j.id)?.active).length}</b></div></div></div><div class="service-list">${JOBS.map(j=>{const bot=jobBots.get(j.id)?.active!==false;const working=activeJob===j.id;return `<article class="job-card"><div class="job-card-top"><span class="job-emoji">${j.icon}</span><div><b>${j.name}${bot?'<span class="bot-badge">BOT ON DUTY</span>':'<span class="bot-badge">PLAYER SHIFT</span>'}</b><p>${j.desc}<br>📍 ${j.place} · ${j.skill}</p></div></div><button data-action="job:${j.id}" ${activeJob?'disabled':''}>${working?'SHIFT IN PROGRESS':bot?'TAKE OVER SHIFT':'WORK THIS SHIFT'} · ₡${j.reward}</button></article>`}).join('')}</div><p class="fineprint">Bot menutup semua posisi kosong pada simulasi lokal. Untuk pembagian pekerjaan global antar pemain, backend perlu menyimpan roster pekerjaan secara terpusat.</p>`;return;}
  if(app==='wallet'){body.innerHTML=`<div class="balance-card"><small>AVAILABLE BALANCE</small><strong>₡ ${money.toLocaleString('id-ID')}</strong><small>VIRTUAL CURRENCY · NO CASH OUT</small></div><div class="phone-section-title">RECENT ACTIVITY</div><div class="message">Welcome bonus <b>+ ₡1.250</b></div><p class="fineprint">Saldo disimpan lokal di browser perangkat ini untuk prototype. Belum tersinkron antarperangkat.</p>`;return;}
  if(app==='store'){body.innerHTML=`<div class="phone-widget"><small>FVCKTHERULES FLAGSHIP</small><h3>Soccer culture.<br>Street attitude.</h3><p>Jelajahi toko virtual dan koleksi asli FTTR.</p></div>${row('↗','Enter the store','Lihat interior toko dari sudut pandang atas','enter-store','ENTER')}${row('▦','Product catalogue','Buka katalog, detail produk, dan checkout asli','open-shop','OPEN')}<p class="fineprint">Checkout dan pembayaran tetap memakai toko asli, tidak diganti oleh demo kota.</p>`;return;}
}
function openPhone(app='home'){closePlace();$('#phoneOverlay').hidden=false;renderPhone(app);}
function closePhone(){$('#phoneOverlay').hidden=true;}
function openShop(){$('#shopOverlay').hidden=false;const frame=$('#shopFrame');if(frame.src==='about:blank'||!frame.src.endsWith('/index.html'))frame.src='https://game.fucktherules.my.id/index.html';}
function closeShop(){$('#shopOverlay').hidden=true;}
function openMap(){const list=$('#mapList');list.innerHTML=places.map(p=>`<button class="map-row" data-map-place="${p.id}"><span class="pin">⌖</span><span><b>${p.name}</b><small>${p.type}</small></span></button>`).join('');$('#mapOverlay').hidden=false;}
function handleAction(action){if(action.startsWith('football-')){const result=window.FTTRFootball?.handle(action);if(result?.msg)toast(result.msg);if(result?.rerender)renderPhone('football');return;}if(action==='send-chat'){const val=$('#chatDraft')?.value.trim();if(!val){toast('Tulis pesan terlebih dahulu');return;}const msg=document.createElement('div');msg.className='message';msg.innerHTML=`<b>YOU · JUST NOW</b>`;msg.append(document.createTextNode(val));$('#phoneBody').insertBefore(msg,$('#phoneBody').querySelector('.fineprint'));toast('Pesan tersimpan sebagai demo lokal');return;}
  if(action.startsWith('goto:')){const id=action.split(':')[1];const p=places.find(q=>q.id===id);closePhone();$('#mapOverlay').hidden=true;if(p){destination=new THREE.Vector3(p.x,0,p.z+Math.min(2.7,p.d/2+1));openPlace(p);}return;}
  if(action.startsWith('coming:')){showNotice('⇄',action.split(':')[1],'Kota ini sudah masuk dalam rancangan dunia, tetapi belum tersedia di prototype pertama.');return;}
  if(action.startsWith('food:')){const key=action.split(':')[1],items={chicken:{name:'Rajawali Chicken',cost:120,need:'hunger',value:30},fish:{name:'Corner Kitchen',cost:180,need:'hunger',value:45},fruit:{name:'Market fruit pack',cost:80,need:'hunger',value:20},water:{name:'Bottled water',cost:35,need:'thirst',value:35},drink:{name:'High Street Café',cost:60,need:'thirst',value:15,extra:{energy:10}},sandwich:{name:'Corner deli sandwich',cost:95,need:'hunger',value:25}};const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);recoverNeed(item.need,item.value);if(item.extra)Object.entries(item.extra).forEach(([k,v])=>recoverNeed(k,v));showNotice('＋','ORDER CONFIRMED',`${item.name}: ${item.need==='hunger'?'Hunger':'Thirst'} +${item.value}. Sisa saldo ₡${money.toLocaleString('id-ID')}.`);renderPhone('food');return;}
  if(action.startsWith('health:')){const key=action.split(':')[1],items={check:{name:'Hospital check-up',cost:180,health:45,energy:15},kit:{name:'First-aid kit',cost:90,health:20},rest:{name:'Rest at home',cost:0,energy:25},emergency:{name:'Emergency treatment',cost:350,health:100}};const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);if(item.health===100)needs.health=100;else if(item.health)recoverNeed('health',item.health);if(item.energy)recoverNeed('energy',item.energy);saveNeeds();updateNeedsUI();showNotice('✚','HEALTH SERVICE',`${item.name} selesai. Health ${Math.round(needs.health)}/100 · Energy ${Math.round(needs.energy)}/100.`);renderPhone('health');return;}
  if(action.startsWith('ticket:')){const key=action.split(':')[1],item={north:{name:'Northside train ticket',cost:100},east:{name:'Eastbank train ticket',cost:100},away:{name:'Away-day coach ticket',cost:60},match:{name:'Central Ground match ticket',cost:80}}[key];if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);showNotice('🎟','TICKET ADDED',`${item.name} ditambahkan ke dompet demo. Perjalanan akan diaktifkan saat kota terkait tersedia.`);return;}
  if(action==='book-ride'){const sel=$('#rideDestination');const p=places.find(q=>q.id===sel?.value);if(money<100){toast('Saldo virtual tidak cukup');return;}setMoney(money-100);closePhone();if(p){destination=new THREE.Vector3(p.x,0,p.z+Math.min(2.7,p.d/2+1));openPlace(p);}toast('Ride booked · tarif demo ₡100');return;}
  if(action.startsWith('job:')){takeJob(action.split(':')[1]);return;}
  if(action==='enter-store'){closePhone();if(isInside){toast('Kamu sudah berada di dalam store');return;}const p=places.find(q=>q.id==='fttr');destination=new THREE.Vector3(p.x,0,p.z+2.5);openPlace(p);return;}
  if(action==='open-shop'){openShop();return;}if(action==='stadium'){closePhone();const p=places.find(q=>q.id==='stadium');destination=new THREE.Vector3(p.x,0,p.z+4);openPlace(p);return;}
}
function bindUI(){ $('#phoneBtn').onclick=()=>openPhone();$('#phoneClose').onclick=closePhone;$('#phoneHome').onclick=()=>renderPhone('home');$('#phoneHome').ondblclick=closePhone;$('#phoneOverlay').addEventListener('click',e=>{if(e.target.id==='phoneOverlay')closePhone();});$('#phoneBody').addEventListener('click',e=>{const app=e.target.closest('[data-open-app]');if(app){renderPhone(app.dataset.openApp);return;}const a=e.target.closest('[data-action]');if(a)handleAction(a.dataset.action);});$('#mapBtn').onclick=openMap;$('#zoomIn').onclick=()=>applyZoom(cameraZoom+.15);$('#zoomOut').onclick=()=>applyZoom(cameraZoom-.15);$('#cameraReset').onclick=resetCamera;$('#cameraFollow').onclick=()=>{cameraFollow=!cameraFollow;if(cameraFollow)resetCamera();else{$('#cameraFollow').classList.remove('active');toast('Kamera bebas · geser untuk melihat kota');}};$('#needsAction').onclick=()=>openPhone(needs.health<35?'health':'food');$('#mapClose').onclick=()=>$('#mapOverlay').hidden=true;$('#mapOverlay').addEventListener('click',e=>{if(e.target.id==='mapOverlay')$('#mapOverlay').hidden=true;});$('#mapList').addEventListener('click',e=>{const b=e.target.closest('[data-map-place]');if(!b)return;const p=places.find(q=>q.id===b.dataset.mapPlace);if(!p){$('#mapOverlay').hidden=true;showNotice('⇄',b.dataset.mapPlace,'Kota ini belum tersedia di prototype.');return;}$('#mapOverlay').hidden=true;destination=new THREE.Vector3(p.x,0,p.z+Math.min(2.7,p.d/2+1));openPlace(p);});$('#placeClose').onclick=closePlace;$('#placeEnter').onclick=enterPlace;$('#exitBuilding').onclick=exitStore;$('#shopClose').onclick=closeShop;$('#noticeClose').onclick=()=>$('#noticeModal').hidden=true;$('#noticeModal').addEventListener('click',e=>{if(e.target.id==='noticeModal')$('#noticeModal').hidden=true;});document.querySelectorAll('.quickbar [data-app]').forEach(b=>b.onclick=()=>{if(b.dataset.app==='map')openMap();else if(b.dataset.app==='phone')openPhone();else openPhone(b.dataset.app);});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePhone();closePlace();$('#mapOverlay').hidden=true;$('#noticeModal').hidden=true;closeShop();}});}
async function init(){setMoney(money);bindUI();try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');}catch(e){$('#toast').textContent='3D engine gagal dimuat. Periksa koneksi internet.';$('#toast').classList.add('show');return;}
  scene=new THREE.Scene();scene.background=new THREE.Color('#c9cbbb');scene.fog=new THREE.Fog('#c9cbbb',45,90);camera=new THREE.OrthographicCamera(-18,18,18,-18,.1,200);camera.position.set(19,25,19);cameraTarget=new THREE.Vector3(0,0,0);camera.lookAt(cameraTarget);raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();renderer=new THREE.WebGLRenderer({canvas,antialias:Math.min(devicePixelRatio||1,2)<1.8,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene.add(new THREE.HemisphereLight('#f9f4df','#717b68',2.1));const sun=new THREE.DirectionalLight('#fff3d6',2.4);sun.position.set(-12,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
  createCity();createBotWorkers();createInterior();createPlayer();resize();canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{dragState=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();applyZoom(cameraZoom+(e.deltaY<0?.1:-.1));},{passive:false});canvas.addEventListener('touchmove',touchPinch,{passive:false});window.addEventListener('resize',resize);updateNeedsUI();$('#cameraFollow')?.classList.add('active');requestAnimationFrame(animate);toast('FTTR CITY ready · drag camera · wheel/pinch to zoom');}
init();
