const $ = s => document.querySelector(s);
const canvas = $('#world');
const moneyEl = $('#moneyVal');
let money = Number(localStorage.getItem('fttr.city.money') || 1250);
let THREE, renderer, scene, camera, raycaster, pointer, ground, cityGroup, interiorGroup, player, playerBody, playerHead, ring;
let isInside = false, selectedPlace = null, destination = null, lastTime = 0, toastTimer = 0;
let cameraTarget, cameraFollow=true, cameraZoom=1, dragState=null, pinchDistance=0;
const needs = (()=>{try{return {...{hunger:86,thirst:90,health:100,energy:95,mood:80},...JSON.parse(localStorage.getItem('fttr.city.needs')||'{}')}}catch{return {hunger:86,thirst:90,health:100,energy:95}}})();
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
const pickables = [], places = [], botWorkers = [], cars = [], walkers = [], staticObstacles = [];
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
  const isStop=id==='busstop',isBillboard=id==='billboard',isStadium=kind==='stadium',isFood=['cafe','cafe2','pub','northside-market','eastbank-market','market'].includes(id),isHouse=id==='residential';
  // Every venue sits on a lot, not on the carriageway. Buildings get individual silhouettes.
  if(!isStop&&!isBillboard){box(g,w+.45,.18,d+.45,'#b7b3a4',0,.09,0,{shadow:false});box(g,w,.18,d,'#b8b4a7',0,.18,0,{shadow:false});}
  if(isStadium){
    box(g,w,.8,d,color,0,.58,0);box(g,w-.65,.24,d-.65,'#c6c7b8',0,1.03,0);
    box(g,w-1.35,.24,d-1.35,'#46734b',0,1.23,0,{shadow:false});
    // Open stadium bowl, visible terraces and goal markings.
    for(let i=0;i<4;i++){
      const y=1.02+i*.19;box(g,w-.55-i*.23,.15,.34,i%2?'#c3c0b1':'#d6d2c3',0,y,-d/2+.35+i*.24,{shadow:false});
      box(g,w-.55-i*.23,.15,.34,i%2?'#d6d2c3':'#c3c0b1',0,y,d/2-.35-i*.24,{shadow:false});
      box(g,.34,.15,d-.55-i*.23,i%2?'#c3c0b1':'#d6d2c3',-w/2+.35+i*.24,y,0,{shadow:false});
      box(g,.34,.15,d-.55-i*.23,i%2?'#d6d2c3':'#c3c0b1',w/2-.35-i*.24,y,0,{shadow:false});
    }
    box(g,(w-2)*.55,.025,.035,'#e9eadc',0,1.37,0,{shadow:false});box(g,.035,.025,d*.55,'#e9eadc',0,1.37,0,{shadow:false});
    for(const sx of [-1,1]){box(g,.07,.45,.07,'#f6f2de',sx*(w*.27),1.48,0,{shadow:false});box(g,.55,.025,.025,'#f6f2de',sx*(w*.27),1.7,0,{shadow:false});}
    box(g,w+.25,.24,.24,'#313830',0,2.05,-d/2-.02);sign(g,glyph,0,2.08,d/2+.15,Math.min(w,7),.48,'#252a25','#d7ff3f');
    // Entry gates along the public-facing side.
    for(let i=-1;i<=1;i++){box(g,.42,.8,.14,'#343a32',i*1.2,.58,d/2+.15);box(g,.28,.18,.16,'#d7ff3f',i*1.2,.96,d/2+.16,{shadow:false});}
  } else if(isBillboard){
    // Freestanding billboard on a dedicated plot, with visible steel legs.
    box(g,w+.6,.12,d+.5,'#bcb7a8',0,.06,0,{shadow:false});box(g,.16,3.7,.16,'#454c43',-1.65,1.85,0);box(g,.16,3.7,.16,'#454c43',1.65,1.85,0);box(g,w+.35,1.8,.22,'#242a25',0,3.35,0);box(g,w+.12,.08,.24,'#d7ff3f',0,4.3,0,{shadow:false});sign(g,'YOUR AD HERE',0,3.37,.13,Math.min(w,5.2),1.3,'#242a25','#d7ff3f');
  } else if(isStop){
    // A bus stop is an open-sided shelter beside the road, never a house-shaped box.
    box(g,w+.9,.08,d+.55,'#c8c7bc',0,.04,0,{shadow:false});
    for(const sx of [-1,1])for(const sz of [-1,1])box(g,.09,1.9,.09,'#47524d',sx*(w/2-.15),.98,sz*(d/2-.12));
    box(g,w+.12,.14,d+.1,'#3e4943',0,1.98,0);box(g,w+.05,.07,d+.03,'#e0e2d7',0,2.08,0,{shadow:false});
    box(g,w*.62,.12,.34,'#705b45',0,.52,d*.12);box(g,w*.62,.08,.12,'#373b34',0,.36,d*.12);
    box(g,.12,.85,.12,'#4a534c',-w/2-.32,.43,d/2+.3);box(g,.65,.58,.08,'#d7ff3f',-w/2-.32,.92,d/2+.3);sign(g,'BUS',-w/2-.32,.94,d/2+.35,.55,.38,'#d7ff3f','#171914');
    box(g,w+.8,.035,.04,'#d9a441',0,.03,d/2+.65,{shadow:false});
  } else {
    const wallH=isHouse?3.1:(id==='station'?2.9:id==='hospital'?2.7:2.35);
    box(g,w,wallH,d,color,0,.18+wallH/2,0);
    // Flat parapet and roof treatment; no pixelated rendering.
    if(isHouse){
      const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,1.55,4),material('roof-'+id,'#7f5142'));roof.position.set(0,wallH+1.0,0);roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
      box(g,w+.1,.12,d+.1,'#eee6d4',0,wallH+.18,0,{shadow:false});
    } else {
      box(g,w+.18,.16,d+.18,'#43483f',0,.18+wallH+.08,0);
      box(g,w-.32,.16,d-.32,id==='hospital'?'#e6e7df':id==='station'?'#8d958b':'#8b7460',0,.18+wallH+.22,0,{shadow:false});
    }
    // Main entrance and facade windows; station and service buildings have wider doors.
    const doorW=id==='station'?1.35:id==='hospital'?1.05:.72;
    box(g,doorW,1.35,.09,'#343a34',0,.86,d/2+.06,{shadow:false});
    const winCount=Math.max(2,Math.floor(w/1.35));
    for(let i=0;i<winCount;i++){
      const wx=-w/2+.58+i*(w-1.16)/Math.max(1,winCount-1);
      box(g,.5,.7,.065,id==='hospital'?'#9bbdc1':'#8fb2b7',wx,1.42,d/2+.065,{shadow:false});
      box(g,.54,.055,.08,'#eee9da',wx,1.42,d/2+.105,{shadow:false});
    }
    // Building-specific silhouette, signage and street furniture.
    if(isFood){
      const awning=id==='cafe2'?'#d7ff3f':id==='pub'?'#a64e3d':'#547b70';
      box(g,w+.28,.16,.62,awning,0,1.98,d/2+.35,{shadow:false});
      for(let i=-3;i<=3;i++)if(Math.abs(i)<w/1.1)box(g,.1,.17,.64,'#f3eee0',i*.48,1.98,d/2+.36,{shadow:false});
      box(g,w+.34,.12,.12,'#333a33',0,1.84,d/2+.38,{shadow:false});
      for(const tx of [-w*.28,w*.28]){cylinder(g,.16,.16,.12,'#5e4938',tx,.42,d/2+1.2,10);cylinder(g,.035,.035,.48,'#5e4938',tx,.68,d/2+1.2,8);for(const tz of [-.16,.16])box(g,.12,.08,.12,'#454a40',tx,.42,d/2+1.2+tz,{shadow:false});}
    }
    if(id==='hospital'){
      box(g,w*.35,1.1,d*.42,'#ecece3',w*.34,.74,-d*.2);box(g,.18,.72,.16,'#d84d4d',0,wallH+.43,d/2+.16,{shadow:false});box(g,.72,.18,.16,'#d84d4d',0,wallH+.43,d/2+.16,{shadow:false});
      // Ambulance bay and marked drop-off.
      box(g,1.6,.08,2.2,'#c7c7bd',w/2+1,.05,d/2+.6,{shadow:false});box(g,1.1,.45,.65,'#f1eee5',w/2+1,.38,d/2+.6);box(g,.5,.25,.68,'#d64e4e',w/2+.72,.68,d/2+.6,{shadow:false});box(g,.12,.35,.69,'#d64e4e',w/2+1,.68,d/2+.6,{shadow:false});
    }
    if(id==='station'){
      // Distinctive station canopy, platform and twin rails.
      box(g,w+1.1,.12,1.45,'#4d5d57',0,2.82,d/2+.72);box(g,w+1.0,.07,1.35,'#d8d6c8',0,2.91,d/2+.72,{shadow:false});
      for(const sx of [-1,1])for(const sz of [-1,1])box(g,.09,1.1,.09,'#4a534d',sx*(w/2+.35),2.25,d/2+.72+sz*.55);
      for(const tz of [d/2+1.5,d/2+2.05])box(g,w+2.4,.05,.09,'#5d6059',0,.08,tz,{shadow:false});
      for(let i=-4;i<=4;i++)box(g,.12,.045,.75,'#8b8d82',i*.62,.07,d/2+1.78,{shadow:false});
    }
    if(id==='fttr'){
      box(g,w+.3,.25,.26,'#d7ff3f',0,wallH+.43,d/2+.12,{shadow:false});
      for(let i=0;i<3;i++){box(g,.27,.45,.075,['#f2efdf','#171914','#667aa0'][i],-1+i,1.15,d/2+.11,{shadow:false});}
    }
    if(id==='garage'||id==='works'){
      box(g,w*.58,1.35,.12,'#4b514a',w*.18,.88,d/2+.08);box(g,w*.52,.12,.14,'#d7ff3f',w*.18,1.58,d/2+.1,{shadow:false});
      for(let i=-2;i<=2;i++)box(g,.08,.06,d+.08,'#9d9d90',w/2-.35,wallH+.3,i*.28,{shadow:false});
    }
    if(id==='police'){
      box(g,w*.4,.2,.18,'#d9e1df',0,wallH+.38,d/2+.12,{shadow:false});box(g,.16,.65,.18,'#4c7ca0',0,wallH+.38,d/2+.14,{shadow:false});
    }
    if(id==='residential'){
      // Apartment block balconies and entrance canopy.
      for(let floor=0;floor<3;floor++)for(let i=0;i<3;i++){const bx=-w/2+1+i*(w-2)/2;box(g,1.1,.08,.35,'#d8d2c2',bx,.85+floor*.72,d/2+.13,{shadow:false});box(g,1.1,.055,.05,'#5a6159',bx,1.02+floor*.72,d/2+.31,{shadow:false});}
      box(g,1.5,.15,.8,'#6e827b',0,.2+wallH+.3,d/2+.4,{shadow:false});
    }
    // Clean, legible roof sign mounted above the front facade.
    sign(g,glyph,0,.18+wallH+.57,d/2+.15,Math.min(w+.15,5.5),.54,'#242a25','#d7ff3f');
  }
  const hit=new THREE.Mesh(new THREE.BoxGeometry(w+1.4,(kind==='stadium'?4.4:3.6),d+1.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001,depthWrite:false}));hit.position.set(0,kind==='stadium'?1.8:1.55,0);hit.userData.placeId=id;g.add(hit);pickables.push(hit);
  const p={id,name,type,desc,glyph,tag,x,z,w,d,hours,kind,group:g,hit};places.push(p);return p;
}
function createCity(){
  cityGroup=new THREE.Group();scene.add(cityGroup);staticObstacles.length=0;
  // Large explorable city: a road grid with defined blocks and generous pedestrian space.
  ground=new THREE.Mesh(new THREE.PlaneGeometry(140,120),material('grass','#b5c0ae'));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;cityGroup.add(ground);
  // Park gardens occupy the inner corners of the residential blocks.
  for(const [x,z,w,d] of [[-12,-27,9,7],[12,-27,9,7],[-12,27,9,7],[12,27,9,7],[-54,25,9,11],[54,25,9,11]]){
    box(cityGroup,w,.06,d,'#8da98a',x,-.035,z,{shadow:false});
    for(let i=0;i<4;i++){const tx=x+(i%2)*2.7-1.35,tz=z+Math.floor(i/2)*2.4-1.2;cylinder(cityGroup,.22,.3,1.3,'#786149',tx,.65,tz,8);cylinder(cityGroup,.78,.68,1.05,['#678968','#75966e','#6d8c65'][i%3],tx,1.65,tz,10);}
    for(let i=-1;i<=1;i++){box(cityGroup,.9,.12,.38,'#6f5943',x+i*2,.48,z+3,{shadow:false});box(cityGroup,.9,.08,.08,'#3e463d',x+i*2,.31,z+3,{shadow:false});}
  }
  // Main avenues and two feeder roads. Buildings are placed inside blocks, never on these lanes.
  const road='#62665f',sidewalk='#d4d0c2',mark='#e9e5d8';
  for(const z of [-48,-24,0,24,48]){
    box(cityGroup,140,.08,5.4,road,0,-.01,z,{shadow:false});
    box(cityGroup,140,.07,.95,sidewalk,0,.035,z-3.15,{shadow:false});box(cityGroup,140,.07,.95,sidewalk,0,.035,z+3.15,{shadow:false});
    for(let x=-66;x<=66;x+=6)box(cityGroup,2.5,.025,.12,mark,x,.045,z,{shadow:false});
    for(let x=-66;x<=66;x+=3)box(cityGroup,.08,.025,.08,'#f4f0df',x,.045,z-2.15,{shadow:false});
  }
  for(const x of [-48,-24,0,24,48]){
    box(cityGroup,5.4,.08,120,road,x,-.005,0,{shadow:false});
    box(cityGroup,.95,.07,120,sidewalk,x-3.15,.035,0,{shadow:false});box(cityGroup,.95,.07,120,sidewalk,x+3.15,.035,0,{shadow:false});
    for(let z=-56;z<=56;z+=6)box(cityGroup,.12,.025,2.5,mark,x,.045,z,{shadow:false});
  }
  // Crosswalks and pedestrian islands at major intersections.
  for(const x of [-48,-24,0,24,48])for(const z of [-48,-24,0,24,48]){
    for(let i=-3;i<=3;i++){box(cityGroup,.5,.035,1.55,mark,x+i*.72,.055,z-4.1,{shadow:false});box(cityGroup,1.55,.035,.5,mark,x-4.1,.055,z+i*.72,{shadow:false});}
    box(cityGroup,1.25,.08,1.25,'#a7b39e',x+5,.02,z+5,{shadow:false});
  }
  // Kerbs, street trees and lamp posts create clear separation between roads and building lots.
  for(const z of [-48,-24,0,24,48])for(const x of [-66,-54,-42,-30,-18,-6,6,18,30,42,54,66]){
    if(Math.abs(x)%24===6){cylinder(cityGroup,.065,.075,3.2,'#50584f',x,.8,z+4.2,8);cylinder(cityGroup,.22,.22,.12,'#f1e8c7',x,2.35,z+4.2,8);}
  }
  // Small residential houses, each with a pitched roof, front path and garden fence.
  const houses=[[-58,-38],[-34,-38],[-58,38],[58,-38],[34,-30],[64,38],[-34,56],[-22,56],[22,56],[34,56]];
  houses.forEach(([x,z],i)=>{
    const h=new THREE.Group();h.position.set(x,0,z);cityGroup.add(h);staticObstacles.push({x,z,w:5.1,d:4.2});const wc=['#d8c9b4','#c5cdbf','#d9d4c5','#c6b7a8'][i%4];
    box(h,5.1,.18,4.2,'#c7c1b2',0,.09,0,{shadow:false});box(h,4.6,2.5,3.8,wc,0,1.38,0);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.7,1.7,4),material(`house-roof-${i}`,['#795347','#6d5147','#8b6750'][i%3]));roof.position.set(0,3.45,0);roof.rotation.y=Math.PI/4;roof.castShadow=true;h.add(roof);
    box(h,.72,1.35,.08,'#5b4b3e',0,.83,1.96,{shadow:false});for(const wx of [-1.35,1.35]){box(h,.75,.78,.08,'#91b7bb',wx,1.65,1.96,{shadow:false});box(h,.82,.08,.09,'#eee8da',wx,1.65,2.01,{shadow:false});}
    box(h,1.35,.08,1.0,'#b7aa95',0,.04,2.55,{shadow:false});box(h,5.4,.08,.15,'#e5dece',0,.04,2.8,{shadow:false});
    for(const fx of [-2.8,2.8]){box(h,.12,.5,.12,'#f0e9d7',fx,.25,2.1,{shadow:false});cylinder(h,.18,.2,.45,'#8ca47e',fx,.3,2.6,8);}
    // Short fence and small planted front garden.
    box(h,4.7,.22,.08,'#e4ddcc',0,.23,2.95,{shadow:false});for(let fx=-2;fx<=2;fx++)box(h,.08,.42,.08,'#e4ddcc',fx,.32,2.95,{shadow:false});
  });
  // Every destination below occupies a dedicated lot; no generic placeholder blocks overlap it.
  // Service and destination buildings aligned on dedicated lots, with street access on the front edge.
  addPlace({id:'fttr',name:'FUCK THE RULES STORE',type:'STREETWEAR / RETAIL',desc:'Flagship store FTTR di pusat kota. Jelajahi koleksi lalu buka katalog dan checkout asli.',glyph:'FTTR STORE',tag:'FLAGSHIP STORE',x:-12,z:-12,w:5.8,d:4.4,color:'#c8c3b4'});
  addPlace({id:'station',name:'CENTRAL STATION',type:'TRANSPORT HUB',desc:'Stasiun utama dengan peron dan jalur kereta. Menghubungkan Central City dengan Northside dan Eastbank.',glyph:'CENTRAL STATION',tag:'TRAIN · BUS',x:12,z:-12,w:7,d:4.8,color:'#b7b9af'});
  addPlace({id:'billboard',name:'CENTRAL BILLBOARD',type:'ADVERTISING SPACE',desc:'Papan iklan besar di persimpangan komersial untuk kampanye dan sponsor kota.',glyph:'YOUR AD',tag:'AD SLOT',x:0,z:-38,w:5.8,d:2.8,color:'#c7b9a7'});
  addPlace({id:'cafe',name:'CORNER KITCHEN',type:'RESTAURANT',desc:'Restoran dengan awning, meja luar, konter makanan, dan menu untuk memulihkan Hunger.',glyph:'CORNER KITCHEN',tag:'RESTAURANT',x:12,z:12,w:5.4,d:4,color:'#d0bca1'});
  addPlace({id:'pub',name:'THE AWAY END',type:'SUPPORTER PUB',desc:'Pub supporter untuk berkumpul sebelum derby, membahas pertandingan, dan merencanakan perjalanan tandang.',glyph:'THE AWAY END',tag:'SUPPORTERS',x:-12,z:12,w:5.2,d:4,color:'#b9b7a0'});
  addPlace({id:'stadium',name:'CENTRAL GROUND',type:'FOOTBALL STADIUM',desc:'Stadion pusat untuk pertandingan liga, tribun, pintu masuk, dan perayaan juara.',glyph:'CENTRAL GROUND',tag:'MATCHDAY',x:12,z:38,w:9,d:7,color:'#c6c1b2',kind:'stadium'});
  addPlace({id:'hospital',name:'CENTRAL CITY HOSPITAL',type:'HOSPITAL / EMERGENCY',desc:'Rumah sakit dengan area drop-off ambulans, layanan pemeriksaan, dan pemulihan kesehatan.',glyph:'CITY HOSPITAL',tag:'HEALTHCARE',x:-12,z:-38,w:6.4,d:4.8,color:'#e0ded2'});
  addPlace({id:'cafe2',name:'HIGH STREET CAFÉ',type:'CAFÉ / DRINKS',desc:'Kafe untuk kopi, teh, air mineral, makanan ringan, dan memulihkan Thirst.',glyph:'HIGH STREET CAFE',tag:'CAFE · DRINKS',x:38,z:-38,w:4.8,d:3.8,color:'#c5b49e'});
  addPlace({id:'market',name:'CENTRAL MINI MARKET',type:'GROCERY STORE',desc:'Toko kebutuhan harian dengan makanan, buah, air mineral, dan barang praktis.',glyph:'MINI MARKET',tag:'GROCERIES',x:-56,z:-12,w:4.8,d:3.6,color:'#b9c4b1'});
  addPlace({id:'garage',name:'EASTBANK GARAGE',type:'VEHICLE WORKSHOP',desc:'Bengkel dengan pintu servis besar, ruang perbaikan, dan pekerjaan mekanik.',glyph:'EASTBANK GARAGE',tag:'WORKSHOP',x:56,z:12,w:5.8,d:4,color:'#b4aaa0'});
  addPlace({id:'press',name:'CITY PRESS OFFICE',type:'MEDIA / NEWSROOM',desc:'Kantor berita untuk jurnalis, fotografer, dan laporan pertandingan.',glyph:'CITY PRESS',tag:'MEDIA JOBS',x:-38,z:12,w:5.2,d:3.8,color:'#c9c4b4'});
  addPlace({id:'works',name:'EASTBANK WORKS',type:'INDUSTRIAL / CONSTRUCTION',desc:'Area industri dengan pintu gudang besar, peralatan dan pekerjaan konstruksi.',glyph:'EASTBANK WORKS',tag:'INDUSTRY',x:38,z:38,w:6.2,d:4.5,color:'#aaa99f'});
  addPlace({id:'police',name:'CITY POLICE',type:'PUBLIC SAFETY',desc:'Pos polisi dengan tanda layanan publik dan pekerjaan pengamanan kota.',glyph:'CITY POLICE',tag:'CITY SAFETY',x:12,z:-54,w:4.8,d:3.8,color:'#b8c1bd'});
  addPlace({id:'busstop',name:'HIGH STREET BUS STOP',type:'BUS STOP',desc:'Halte terbuka di tepi jalan dengan atap, bangku, papan rute, dan area naik turun penumpang.',glyph:'BUS STOP',tag:'PUBLIC TRANSPORT',x:-4.1,z:0,w:2.8,d:2.2,color:'#c8c3b3',kind:'busstop'});
  addPlace({id:'hq',name:'FTTR HEADQUARTERS',type:'BRAND OFFICE',desc:'Kantor pusat FUCK THE RULES untuk media, kreatif, administrasi, dan AI Agent.',glyph:'FTTR HQ',tag:'HEADQUARTERS',x:-12,z:-54,w:5.8,d:4.4,color:'#d4d0c2'});
  addPlace({id:'jobcentre',name:'CITY JOB CENTRE',type:'EMPLOYMENT',desc:'Pusat lowongan kota untuk mencari pekerjaan dan mengambil shift.',glyph:'JOB CENTRE',tag:'JOBS',x:12,z:-38,w:5.2,d:3.8,color:'#c1c9bb'});
  addPlace({id:'residential',name:'RESIDENTIAL APARTMENTS',type:'HOUSING',desc:'Apartemen kota dengan balkon, kamar sewa, dan tempat istirahat.',glyph:'RESIDENTIAL',tag:'RENT · SLEEP',x:-12,z:38,w:6.2,d:4.6,color:'#cbb8a2'});
  addPlace({id:'training',name:'NORTHSIDE TRAINING GROUND',type:'CLUB FACILITY',desc:'Lapangan latihan dan akademi klub Northside.',glyph:'TRAINING GROUND',tag:'CLUB FACILITY',x:-56,z:12,w:8,d:6,color:'#b9c4ae',kind:'stadium'});
  addPlace({id:'northside-fc',name:'NORTHSIDE FC — NORTH END',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside FC dengan tribun, gerbang stadion, tradisi supporter dan matchday.',glyph:'NORTHSIDE FC',tag:'HOME GROUND',x:-40,z:-12,w:9,d:7,color:'#aeb8a6',kind:'stadium'});
  addPlace({id:'northside-athletic',name:'NORTHSIDE ATHLETIC — ATHLETIC PARK',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside Athletic, rival sekota dengan identitas supporter tersendiri.',glyph:'ATHLETIC PARK',tag:'HOME GROUND',x:-40,z:38,w:8,d:6,color:'#c4b7a3',kind:'stadium'});
  addPlace({id:'eastbank-united',name:'EASTBANK UNITED — CANAL GROUND',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank United di kawasan kanal dan industri.',glyph:'EASTBANK UNITED',tag:'HOME GROUND',x:40,z:-12,w:9,d:7,color:'#b3b7ad',kind:'stadium'});
  addPlace({id:'eastbank-rovers',name:'EASTBANK ROVERS — RIVERSIDE',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank Rovers dengan budaya supporter yang kuat.',glyph:'EASTBANK ROVERS',tag:'HOME GROUND',x:40,z:12,w:8,d:6,color:'#c4b9a7',kind:'stadium'});
  addPlace({id:'northside-market',name:'NORTHSIDE HIGH STREET',type:'SHOPPING DISTRICT',desc:'Jalan komersial Northside dengan toko supporter, kios dan tempat makan.',glyph:'NORTHSIDE HIGH STREET',tag:'DISTRICT',x:-40,z:-38,w:6,d:4,color:'#c2b6a2'});
  addPlace({id:'eastbank-market',name:'EASTBANK CANAL MARKET',type:'INDUSTRIAL MARKET',desc:'Pasar Eastbank di antara gudang bata, kanal, dan kawasan kerja.',glyph:'EASTBANK MARKET',tag:'DISTRICT',x:56,z:38,w:6,d:4,color:'#aeb9b1'});
  // Canal and bridge distinguish Eastbank from the central commercial district.
  box(cityGroup,8,.035,28,'#729da0',49,-.045,25,{shadow:false});box(cityGroup,9,.06,1.2,'#aaa99a',49,.03,13,{shadow:false});box(cityGroup,9,.06,1.2,'#aaa99a',49,.03,37,{shadow:false});
  for(let i=0;i<7;i++){box(cityGroup,.16,.08,28,'#8bb4b2',45.7+i*.95,-.015,25,{shadow:false});}
  // Advertising billboard on a dedicated corner lot, not over the road.
  const ad=new THREE.Group();ad.position.set(0,0,-31);cityGroup.add(ad);box(ad,.16,3.5,.16,'#464c43',-1.55,1.75,0);box(ad,.16,3.5,.16,'#464c43',1.55,1.75,0);box(ad,4.4,1.75,.22,'#242a25',0,3.35,0);sign(ad,'YOUR AD HERE',0,3.37,.13,4.1,1.35,'#242a25','#d7ff3f');
  // Plaza furniture and street lamps, kept clear of carriageways.
  for(const [x,z] of [[-3,-8],[3,-8],[-3,8],[3,8]]){box(cityGroup,1.35,.14,.4,'#765b43',x,.52,z);box(cityGroup,1.35,.1,.1,'#383d35',x,.31,z);cylinder(cityGroup,.06,.07,2.9,'#4a5148',x+1.4,1.45,z,8);cylinder(cityGroup,.19,.19,.13,'#eee8d3',x+1.4,2.9,z,8);}
  // Planters and bollards protect pedestrian edges at the main plaza.
  for(const [x,z] of [[-5,-5],[5,-5],[-5,5],[5,5]]){box(cityGroup,1.15,.35,1.15,'#b8b4a4',x,.17,z);cylinder(cityGroup,.34,.42,.72,'#6f9269',x,.67,z,9);}
}
function shirt(parent,x,z,color,scale=1){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const body=box(g,.52*scale,.68*scale,.12*scale,color,0,.82*scale,0);body.rotation.z=.02;box(g,.24*scale,.3*scale,.11*scale,color,-.34*scale,.94*scale,0,{ry:0});box(g,.24*scale,.3*scale,.11*scale,color,.34*scale,.94*scale,0);box(g,.18*scale,.035*scale,.125*scale,'#f2efdf',0,.87*scale,.066*scale,{shadow:false});return g;}

function makeCar(color,axis,lane,dir,t){const c=new THREE.Group();box(c,1.7,.42,.82,color,0,.4,0);box(c,.9,.34,.7,'#dfe6df',-.05,.76,0);box(c,.2,.16,.84,'#2a2d27',.2,.78,0,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,.25,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,-.25,{shadow:false});for(const [x,z] of [[-.55,.42],[.55,.42],[-.55,-.42],[.55,-.42]])box(c,.3,.3,.12,'#1b1c18',x,.2,z,{shadow:false});
  if(axis==='x'){c.position.set(t,0,lane);c.rotation.y=dir>0?0:Math.PI;}else{c.position.set(lane,0,t);c.rotation.y=dir>0?-Math.PI/2:Math.PI/2;}
  c.userData={axis,t,s:dir*(3.2+Math.abs(t%3)*.4)};cityGroup.add(c);cars.push(c);}
function makeCitizenModel(parent,shirtMat,skinMat,pantsMat,shoeMat,scale=1,withScarf=false,hairMatOverride=null){
  const mesh=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x*scale,y*scale,z*scale);o.scale.set(sx*scale,sy*scale,sz*scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const body=mesh(new THREE.CapsuleGeometry(.215,.38,4,10),shirtMat,0,.88,0,1,1,1);
  const head=mesh(new THREE.SphereGeometry(.19,16,12),skinMat,0,1.34,.015);
  const hairMat=hairMatOverride||material('citizen-hair-common','#302720');mesh(new THREE.SphereGeometry(.195,14,10),hairMat,0,1.48,-.025,1.04,.48,1.02);
  mesh(new THREE.SphereGeometry(.027,8,6),material('citizen-eye','#20231e'),-.067,1.36,.184);
  mesh(new THREE.SphereGeometry(.027,8,6),material('citizen-eye','#20231e'),.067,1.36,.184);
  const armL=mesh(new THREE.CapsuleGeometry(.065,.27,3,8),shirtMat,-.285,.91,0);armL.rotation.z=-.13;
  const armR=mesh(new THREE.CapsuleGeometry(.065,.27,3,8),shirtMat,.285,.91,0);armR.rotation.z=.13;
  mesh(new THREE.SphereGeometry(.068,10,8),skinMat,-.29,.72,.015);mesh(new THREE.SphereGeometry(.068,10,8),skinMat,.29,.72,.015);
  const legL=mesh(new THREE.CapsuleGeometry(.078,.26,3,8),pantsMat,-.115,.39,0);const legR=mesh(new THREE.CapsuleGeometry(.078,.26,3,8),pantsMat,.115,.39,0);
  mesh(new THREE.SphereGeometry(1,12,8),shoeMat,-.12,.135,.055,.14,.065,.205);mesh(new THREE.SphereGeometry(1,12,8),shoeMat,.12,.135,.055,.14,.065,.205);
  if(withScarf){const scarf=mesh(new THREE.TorusGeometry(.145,.035,7,16),material('citizen-scarf','#f0d85b'),0,1.04,.12,1,1,.72);scarf.rotation.x=Math.PI/2;}
  return {body,head,armL,armR,legL,legR};
}
function createTraffic(){const cl=['#d7ff3f','#c4533f','#4a6fa5','#e8e2cc','#2f3a34','#d9a441'];[['x',1.1,1,-30],['x',-1.1,-1,20],['x',1.1,1,10],['z',1.1,1,-20],['z',-1.1,-1,15],['z',-1.1,-1,-25]].forEach(([a,l,d,t],i)=>makeCar(cl[i%6],a,l,d,t));
  const sk=['#d5a07b','#b87d58','#8d5a3c'],sh=['#d7ff3f','#5875a6','#c76f51','#e0d9c7','#5d8c83','#f2efdf','#586a8c','#a64e3d'];
  for(let i=0;i<10;i++){const n=new THREE.Group();cityGroup.add(n);makeCitizenModel(n,material(`walker-shirt-${i}`,sh[i%sh.length]),material(`walker-skin-${i}`,sk[i%sk.length]),material(`walker-pants-${i}`,i%2?'#34372f':'#4a4940'),material(`walker-shoes-${i}`,'#272a26'),.82,i%3===0);
    const ax=i%2?'x':'z',side=(i%4<2?-1:1)*3.6,c=ax==='x'?(i*3%10-5):(i*2%10-5);if(ax==='x'){n.position.set(c,0,side);n.rotation.y=Math.PI/2;}else{n.position.set(side,0,c);}n.userData={axis:ax,c,t:0,r:6+i%4*2,s:.9+(i%3)*.25,p:i};walkers.push(n);}}
function createBotWorkers(){createTraffic();
  const spots=[[-7,-7.3,'#d7ff3f'],[12,-6.2,'#5875a6'],[12,8,'#c76f51'],[-12,8,'#e0d9c7'],[-16,3.5,'#d7ff3f'],[-14,16,'#5d8c83'],[32,18,'#b6b4a8'],[35,-2,'#586a8c'],[-3,9,'#d7ff3f'],[40,30,'#c4533f'],[-40,28,'#e0d9c7']];
  spots.forEach(([x,z,shirtColor],i)=>{const npc=new THREE.Group();cityGroup.add(npc);makeCitizenModel(npc,material(`bot-shirt-${i}`,shirtColor),material(`bot-skin-${i}`,i%2?'#b87d58':'#d5a07b'),material(`bot-pants-${i}`,i%2?'#34372f':'#4a4940'),material(`bot-shoes-${i}`,'#272a26'),.88,i%3===1);npc.position.set(x,0,z);npc.userData.baseY=0;npc.userData.phase=i*.7;botWorkers.push(npc);});
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
  const skin=material('citizen-skin','#c98f68'),shirtMat=material('citizen-shirt','#d7ff3f'),trousers=material('citizen-trousers','#252a25'),shoes=material('citizen-shoes','#f2efdf');
  const parts=makeCitizenModel(player,shirtMat,skin,trousers,shoes,1,true,material('citizen-hair','#29231f'));playerBody=parts.body;playerHead=parts.head;
  ring=new THREE.Mesh(new THREE.RingGeometry(.42,.49,32),new THREE.MeshBasicMaterial({color:'#d7ff3f',side:THREE.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;player.add(ring);player.position.set(-1,0,5);applyProfile();
}
function setMoney(v){money=Math.max(0,v);moneyEl.textContent=money.toLocaleString('id-ID');localStorage.setItem('fttr.city.money',String(money));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function saveNeeds(){localStorage.setItem('fttr.city.needs',JSON.stringify(needs));}
function updateNeedsUI(){for(const [key,label] of [['hunger','Hunger'],['thirst','Thirst'],['health','Health'],['energy','Energy'],['mood','Mood']]){const value=Math.round(needs[key]);const bar=$(`#${key}Bar`),val=$(`#${key}Val`);if(bar)bar.style.width=value+'%';if(val)val.textContent=value;if(bar?.parentElement?.parentElement?.parentElement)bar.parentElement.parentElement.parentElement.classList.toggle('low',value<25);}const mood=$('#needMood');if(mood)mood.textContent=needs.health<35?'NEED MEDIC':needs.hunger<20?'HUNGRY':needs.thirst<20?'THIRSTY':needs.energy<20?'TIRED':'FIT';}
function recoverNeed(key,value){needs[key]=Math.min(100,needs[key]+value);saveNeeds();updateNeedsUI();}
function needsSummary(){return `<div class="needs-inline">${[['Hunger','hunger'],['Thirst','thirst'],['Health','health'],['Energy','energy'],['Mood','mood']].map(([n,k])=>`<div><small>${n}</small><b>${Math.round(needs[k])}/100</b></div>`).join('')}</div>`;}
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
function enterPlace(){if(!selectedPlace)return;const p=selectedPlace;closePlace();
  if(p.id==='hq'){showNotice('◆','FTTR HEADQUARTERS','Kantor brand. Akses AI Agent dan panel admin hanya untuk staf terverifikasi dan belum tersambung di prototipe ini.',[{label:'BUKA WEBSITE FTTR',acid:true,run:()=>openShop(STORE_BASE,'FTTR')}]);return;}
  if(p.id==='jobcentre'){openPhone('jobs');return;}
  if(p.id==='residential'){openPhone('housing');return;}
  if(p.id==='training'){showNotice('⚽','TRAINING GROUND','Lapangan latihan klub. Latihan pemain dan akademi masuk tahap berikutnya.',[{label:'LIHAT FOOTBALL',acid:true,run:()=>openPhone('football')}]);return;}
  if(['stadium','northside-fc','northside-athletic','eastbank-united','eastbank-rovers'].includes(p.id)){showNotice('🎟',p.name,`Tiket matchday ₡60. Tiketmu: ${tickets}. Tiket dan jadwal masih tersimpan lokal.`,[{label:'BELI TIKET · ₡60',acid:true,run:()=>{if(money<60){toast('Saldo tidak cukup');return;}setMoney(money-60);tickets++;localStorage.setItem('fttr.city.tickets',tickets);recoverNeed('mood',8);toast('Tiket dibeli · Mood +8');}},{label:'LIHAT JADWAL',run:()=>openPhone('football')}]);return;}if(p.id==='hospital'){openPhone('health');return;}if(['cafe','cafe2','market','northside-market','eastbank-market'].includes(p.id)){openPhone('food');return;}if(['press','works','garage'].includes(p.id)){openPhone('jobs');return;}if(p.id==='fttr'){enterStore();return;}if(p.id==='station'){openPhone('travel');return;}if(p.id==='cafe'){openPhone('food');return;}if(p.id==='stadium'){openPhone('football');return;}if(p.id==='billboard'){showNotice('▤','CENTRAL BILLBOARD','Slot iklan ini sengaja dibiarkan kosong dalam prototype. Nantinya slot dapat dipesan brand, sponsor event, atau kampanye FTTR.');return;}if(p.id==='police'){showNotice('✚','CITY POLICE','Pos layanan polisi. Sistem patroli, pengamanan derby, laporan insiden, dan roleplay petugas direncanakan untuk versi multiplayer.');return;}if(p.id==='busstop'){openPhone('travel');return;}if(p.id==='pub'){showNotice('⚑','THE AWAY END','Tempat berkumpul supporter, menyusun perjalanan tandang, dan membaca berita klub. Fitur grup supporter akan ditambahkan di tahap berikutnya.');return;}showNotice('↗',p.name,p.desc);}
function enterStore(){isInside=true;cityGroup.visible=false;interiorGroup.visible=true;pickables.splice(0,pickables.length,...pickables.filter(o=>o.userData.action));player.position.set(0,0,4.8);destination=null;$('#interiorHud').hidden=false;$('#interiorName').textContent='FUCK THE RULES STORE';$('#districtName').textContent='FTTR STORE';cameraFollow=true;cameraZoom=1.4;camera.zoom=cameraZoom;cameraTarget?.set(0,0,0);camera.position.set(15,22,15);camera.lookAt(0,0,0);camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Masuk ke FTTR Store');}
function exitStore(){isInside=false;interiorGroup.visible=false;cityGroup.visible=true;pickables.splice(0,pickables.length,...places.map(p=>p.hit));player.position.set(-12,0,-7.5);destination=null;$('#interiorHud').hidden=true;$('#districtName').textContent='CENTRAL CITY';cameraZoom=1;camera.zoom=1;cameraTarget?.set(player.position.x,0,player.position.z);cameraFollow=true;camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Kembali ke Central City');}
function resize(){if(!renderer||!camera)return;const w=innerWidth,h=innerHeight;renderer.setSize(Math.max(1,w),Math.max(1,h),false);canvas.style.width='100%';canvas.style.height='100%';const aspect=w/h;const view=w<h?34:28;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();}
function applyZoom(v){cameraZoom=Math.max(.38,Math.min(3.2,v));}
function resetCamera(){cameraFollow=true;cameraZoom=1;camera.zoom=1;camera.updateProjectionMatrix();if(player)cameraTarget?.set(player.position.x,0,player.position.z);$('#cameraFollow')?.classList.add('active');toast('Kamera mengikuti karakter');}
function pointerDown(e){if(e.pointerType==='touch'&&e.isPrimary===false)return;dragState={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture?.(e.pointerId);}
function pointerMove(e){if(!dragState||dragState.id!==e.pointerId)return;const dx=e.clientX-dragState.lastX,dy=e.clientY-dragState.lastY;if(Math.hypot(e.clientX-dragState.x,e.clientY-dragState.y)>5)dragState.moved=true;if(dragState.moved){cameraFollow=false;$('#cameraFollow')?.classList.remove('active');const scale=(52/(innerHeight||1))/cameraZoom;cameraTarget ||= new THREE.Vector3(player?.position.x||0,0,player?.position.z||0);camera.updateMatrixWorld();const el=camera.matrixWorld.elements;const rx=el[0],rz=el[2],ux=el[4],uz=el[6];const nx=Math.max(-66,Math.min(66,cameraTarget.x+(-dx*rx+dy*ux)*scale)),nz=Math.max(-57,Math.min(57,cameraTarget.z+(-dx*rz+dy*uz)*scale));const panX=nx-cameraTarget.x,panZ=nz-cameraTarget.z;cameraTarget.x+=panX;cameraTarget.z+=panZ;camera.position.x+=panX;camera.position.z+=panZ;camera.lookAt(cameraTarget);}dragState.lastX=e.clientX;dragState.lastY=e.clientY;}
function pointerUp(e){if(!dragState)return;const moved=dragState.moved;dragState=null;if(!moved)onPointer(e);}
function touchPinch(e){if(e.touches?.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDistance)applyZoom(cameraZoom*(d/pinchDistance));pinchDistance=d;e.preventDefault();}else pinchDistance=0;}
function worldFromEvent(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);}
function onPointer(e){if($('#phoneOverlay').hidden===false||$('#mapOverlay').hidden===false||$('#noticeModal').hidden===false||$('#shopOverlay').hidden===false)return;worldFromEvent(e);const hits=raycaster.intersectObjects(pickables,true);if(hits.length){const obj=hits[0].object;const id=obj.userData.placeId;if(id){const p=places.find(q=>q.id===id);if(p){destination=new THREE.Vector3(p.x,0,p.z+Math.min(2.7,p.d/2+1));openPlace(p);}return;}if(obj.userData.action==='merch'){showNotice('✦','FTTR MERCH WALL','Pilih koleksi melalui katalog toko asli. Model rak ini menjadi titik interaksi merchandise di interior. ',[{label:'BUKA KATALOG',acid:true,run:openShop}]);return;}}
  const floor=raycaster.intersectObject(isInside?groundInterior:ground,false)[0];if(floor){const point=floor.point;destination=new THREE.Vector3(point.x,0,point.z);if(isInside){destination.x=Math.max(-6.5,Math.min(6.5,destination.x));destination.z=Math.max(-4.8,Math.min(4.8,destination.z));}else{destination.x=Math.max(-66,Math.min(66,destination.x));destination.z=Math.max(-57,Math.min(57,destination.z));}closePlace();}}
function makeBuildingProxyClick(p){return p;}
const keys=new Set();let joyVec=null;
function moveInput(dt){let ix=0,iz=0;if(keys.has('w')||keys.has('arrowup')){ix--;iz--;}if(keys.has('s')||keys.has('arrowdown')){ix++;iz++;}if(keys.has('a')||keys.has('arrowleft')){ix--;iz++;}if(keys.has('d')||keys.has('arrowright')){ix++;iz--;}if(joyVec){ix+=joyVec.x+joyVec.y;iz+=-joyVec.x+joyVec.y;}const m=Math.hypot(ix,iz);if(!m)return;destination=null;const speed=(isInside?3.2:3.6)*(needs.energy<20?.6:1)*Math.min(1,m);player.position.x+=ix/m*speed*dt;player.position.z+=iz/m*speed*dt;player.rotation.y=Math.atan2(ix,iz);playerBody.position.y=.88+Math.abs(Math.sin(performance.now()*.012))*.045;}
const blocked=(x,z)=>!isInside&&(places.some(p=>{if(p.id==='busstop'||p.id==='billboard')return false;const pad=p.kind==='stadium'?1.2:.45;return Math.abs(x-p.x)<p.w/2+pad&&Math.abs(z-p.z)<p.d/2+pad;})||staticObstacles.some(o=>Math.abs(x-o.x)<o.w/2+.3&&Math.abs(z-o.z)<o.d/2+.3));
function update(dt){const px0=player.position.x,pz0=player.position.z;moveInput(dt);if(destination){const dx=destination.x-player.position.x,dz=destination.z-player.position.z,dist=Math.hypot(dx,dz);if(dist<.12)destination=null;else{const speed=(isInside?3.2:3.6)*(needs.energy<20?.6:1);const step=Math.min(dist,speed*dt);player.position.x+=dx/dist*step;player.position.z+=dz/dist*step;player.rotation.y=Math.atan2(dx,dz);playerBody.position.y=.88+Math.abs(Math.sin(performance.now()*.012))*.045;}}
  if(!isInside){player.position.x=Math.max(-67,Math.min(67,player.position.x));player.position.z=Math.max(-57,Math.min(57,player.position.z));}
  if(blocked(player.position.x,player.position.z)){const nx=player.position.x,nz=player.position.z;if(!blocked(nx,pz0))player.position.z=pz0;else if(!blocked(px0,nz))player.position.x=px0;else{player.position.x=px0;player.position.z=pz0;if(destination&&Math.hypot(destination.x-px0,destination.z-pz0)>.5)destination=null;}}
  if(cameraFollow){cameraTarget ||= new THREE.Vector3();cameraTarget.lerp(new THREE.Vector3(player.position.x,0,player.position.z),Math.min(1,dt*2.6));const offset=isInside?new THREE.Vector3(13,19,13):new THREE.Vector3(19,25,19);camera.position.lerp(cameraTarget.clone().add(offset),Math.min(1,dt*2.6));camera.lookAt(cameraTarget);}
  if(camera&&Math.abs(camera.zoom-cameraZoom)>.001){camera.zoom+=(cameraZoom-camera.zoom)*Math.min(1,dt*9);camera.updateProjectionMatrix();}
  if(!isInside){cars.forEach(c=>{const u=c.userData;u.t+=u.s*dt;if(u.t>40)u.t=-40;if(u.t<-40)u.t=40;if(u.axis==='x')c.position.x=u.t;else c.position.z=u.t;});walkers.forEach(w=>{const u=w.userData;u.t+=u.s*dt;if(Math.abs(u.t)>u.r){u.s*=-1;u.t=Math.sign(u.t)*u.r;w.rotation.y+=Math.PI;}if(u.axis==='x')w.position.x=u.c+u.t;else w.position.z=u.c+u.t;w.position.y=Math.abs(Math.sin(performance.now()*.01+u.p))*.05;});}
  botWorkers.forEach(n=>{n.position.y=.018+Math.abs(Math.sin(performance.now()*.001+n.userData.phase))*.025;});
  if(performance.now()-lastNeedsTick>12000){lastNeedsTick=performance.now();needs.hunger=Math.max(0,needs.hunger-.35);needs.thirst=Math.max(0,needs.thirst-.55);needs.energy=Math.max(0,needs.energy-.22);if(needs.hunger<15||needs.thirst<12)needs.health=Math.max(1,needs.health-.4);needs.mood=Math.max(0,Math.min(100,needs.mood+((needs.hunger+needs.thirst+needs.health+needs.energy)/4-needs.mood)*.08));saveNeeds();updateNeedsUI();}
}
function animate(t){requestAnimationFrame(animate);const dt=Math.min(.05,(t-(lastTime||t))/1000||0);lastTime=t;if(player)update(dt);if(player){const nextDistrict=player.position.x < -30 ? 'Northside' : player.position.x > 30 ? 'Eastbank' : 'Central City';if(nextDistrict!==activeDistrict){activeDistrict=nextDistrict;$('#districtName').textContent=activeDistrict.toUpperCase();window.FTTROnline?.sendRoom(activeDistrict.toLowerCase().replace(/\s+/g,'-'));}if(t-lastOnlineSync>450){lastOnlineSync=t;window.FTTROnline?.sendPosition(player.position.x,player.position.z,activeDistrict);}}renderer.render(scene,camera);}
window.FTTRCity={district:()=>activeDistrict,remoteMove(p){if(!THREE||!scene||p.district!==activeDistrict)return;let g=remoteAvatars.get(p.id);if(!g){g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.48,3,6),new THREE.MeshStandardMaterial({color:'#536fbd'}));body.position.y=.45;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshStandardMaterial({color:'#d8a77c'}));head.position.y=.88;g.add(head);scene.add(g);remoteAvatars.set(p.id,g);}g.position.set(Number(p.x)||0,0,Number(p.z)||0);},removeRemote(id){const g=remoteAvatars.get(id);if(g){scene.remove(g);remoteAvatars.delete(id);}}};
function appHome(){return `<div class="phone-widget"><small>WELCOME TO CENTRAL CITY</small><h3>Make the city<br>your own.</h3><p>Support your club. Meet your people. Move your way.</p></div><div class="balance-card"><small>VIRTUAL WALLET</small><strong>₡ ${money.toLocaleString('id-ID')}</strong><small>DEMO CURRENCY · NOT REAL MONEY</small></div><div class="phone-section-title">YOUR APPS <small>4G+</small></div><div class="app-grid">${[['messages','✉','Messages'],['map','⌖','City Map'],['ride','↗','Ride'],['food','🍔','Food & Drink'],['health','✚','Health'],['travel','⇄','Travel'],['football','◉','Football'],['jobs','▤','Jobs'],['wallet','₡','Wallet'],['housing','🏠','Housing'],['profile','🧑','Profile'],['store','FT','FTTR Store']].map(([id,ico,label])=>`<button class="app-icon" data-open-app="${id}"><span>${ico}</span><small>${label}</small></button>`).join('')}</div><p class="fineprint">Prototype mode: layanan belum tersambung ke server multiplayer atau pembayaran sungguhan.</p>`;}
function row(icon,title,desc,action,label='OPEN'){return `<button class="service-row" data-action="${action}"><span class="service-icon">${icon}</span><span><b>${title}</b><small>${desc}</small></span><span class="arrow">${label==='OPEN'?'›':'↗'}</span></button>`;}
function renderPhone(app='home'){
  const title={home:'FTTR PHONE',messages:'MESSAGES',map:'CITY MAP',ride:'RIDE',food:'FOOD & DRINK',housing:'HOUSING',profile:'PROFILE',health:'HEALTH & HOSPITAL',travel:'TRAVEL & TICKETS',football:'FOOTBALL',jobs:'CITY JOBS',wallet:'WALLET',store:'FTTR STORE'}[app]||'FTTR PHONE';$('#phoneTitle').textContent=title;const body=$('#phoneBody');
  if(app==='home'){body.innerHTML=appHome();return;}
  if(app==='messages'){body.innerHTML=`<div class="phone-widget"><small>INBOX</small><h3>Stay connected.</h3><p>Obrolan multiplayer akan tersambung saat backend chat diaktifkan.</p></div><div class="message"><b>FTTR CITY SYSTEM · 09:30</b>Welcome to Central City. Jelajahi kota dan kunjungi FTTR Store.</div><div class="message"><b>NORTHSIDE SUPPORTERS</b>Matchday berikutnya segera diumumkan. Siapkan scarf dan rencana away-day.</div><label class="mini-label" for="chatDraft">QUICK MESSAGE (LOCAL DEMO)</label><input class="input" id="chatDraft" placeholder="Tulis pesan..." maxlength="160"><button class="solid-btn" data-action="send-chat">SEND MESSAGE</button><p class="fineprint">Pesan hanya ditampilkan sebagai demo lokal; belum dikirim ke pemain lain.</p>`;return;}
  if(app==='map'){body.innerHTML=`<div class="phone-widget"><small>YOU ARE HERE</small><h3>Central City</h3><p>Jantung kota: retail, transportasi, tempat berkumpul, dan billboard.</p></div><div class="service-list">${places.map(p=>row('⌖',p.name,p.type,`goto:${p.id}`,'GO')).join('')}${row('⇄','Northside','2 clubs · 2 stadiums','district:northside','TRAVEL')}${row('⇄','Eastbank','2 clubs · 2 stadiums','district:eastbank','TRAVEL')}</div>`;return;}
  if(app==='ride'){body.innerHTML=`<div class="phone-widget"><small>ON-DEMAND TRANSPORT</small><h3>Where to?</h3><p>Pesan taksi untuk berpindah ke lokasi di Central City. Versi ini menggunakan tarif demo.</p></div><label class="mini-label" for="rideDestination">DESTINATION</label><select class="select" id="rideDestination">${places.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select><div class="balance-card"><small>ESTIMATED FARE</small><strong>₡ 80–140</strong></div><button class="solid-btn acid" data-action="book-ride">BOOK A RIDE</button><p class="fineprint">Taksi belum memakai pengemudi multiplayer; pemesanan hanya mensimulasikan perjalanan.</p>`;return;}
  if(app==='food'){body.innerHTML=`<div class="phone-widget"><small>FOOD, DRINK & GROCERIES</small><h3>Keep your citizen going.</h3><p>Hunger dan thirst turun perlahan. Makan/minum memulihkan bar kebutuhan.</p>${needsSummary()}</div><div class="service-list">${row('🍗','Rajawali Chicken','Chicken rice · ₡120 · Hunger +30','food:chicken','₡120')}${row('🍚','Corner Kitchen','Nasi ikan · ₡180 · Hunger +45','food:fish','₡180')}${row('🍎','Market fruit pack','Buah segar · ₡80 · Hunger +20','food:fruit','₡80')}${row('🥤','Bottled water','Air mineral · ₡35 · Thirst +35','food:water','₡35')}${row('☕','High Street Café','Coffee · ₡60 · Thirst +15, Energy +10','food:drink','₡60')}${row('🥪','Corner deli sandwich','Sandwich · ₡95 · Hunger +25','food:sandwich','₡95')}</div><p class="fineprint">Virtual currency only. No real-money purchases here.</p>`;return;}
  if(app==='health'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL CITY HEALTH SERVICE</small><h3>Take care of yourself.</h3><p>Jika kesehatan rendah, kunjungi rumah sakit. Kondisi warga dipantau selama bermain.</p>${needsSummary()}</div><div class="service-list">${row('🏥','Hospital check-up','₡180 · Health +45, Energy +15','health:check','₡180')}${row('💊','First-aid kit','₡90 · Health +20','health:kit','₡90')}${row('🛏️','Rest at home','Free · Energy +25','health:rest','FREE')}${row('🚑','Emergency treatment','₡350 · Restore health to 100','health:emergency','₡350')}</div><p class="fineprint">Layanan kesehatan merupakan simulasi gameplay, bukan layanan medis nyata.</p>`;return;}
  if(app==='travel'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL STATION</small><h3>Next stop: elsewhere.</h3><p>Jaringan antarkota akan menghubungkan Central City dengan kota klub.</p></div><div class="service-list">${row('🚆','Northside','Train ticket · ₡100 · 2 clubs','ticket:north','₡100')}${row('🚆','Eastbank','Train ticket · ₡100 · 2 clubs','ticket:east','₡100')}${row('🚌','Away-day coach','Matchday supporter trip · ₡60','ticket:away','₡60')}${row('🎟','Central Ground','Automatic league match · ₡80','ticket:match','₡80')}</div><p class="fineprint">Tiket yang dibeli saat ini hanya simulasi UI. Kota tujuan belum dibangun pada prototype ini.</p>`;return;}
  if(app==='football'){body.innerHTML=window.FTTRFootball?window.FTTRFootball.render(window.FTTRFootballTab||'league'):'<div class="message">Football engine is loading…</div><button class="solid-btn" data-action="stadium">GO TO CENTRAL GROUND</button>';return;}
  if(app==='jobs'){body.innerHTML=`<div class="phone-widget"><small>WORK & CITY ECONOMY</small><h3>Every job keeps the city running.</h3><p>Jika tidak ada pemain mengambil pekerjaan, BOT otomatis bertugas agar layanan kota tetap berjalan. Ambil shift untuk menggantikan BOT sementara dan dapatkan upah.</p><div class="needs-inline"><div><small>Available jobs</small><b>${JOBS.length}</b></div><div><small>Bot-covered roles</small><b>${JOBS.filter(j=>jobBots.get(j.id)?.active).length}</b></div></div></div><div class="service-list">${JOBS.map(j=>{const bot=jobBots.get(j.id)?.active!==false;const working=activeJob===j.id;return `<article class="job-card"><div class="job-card-top"><span class="job-emoji">${j.icon}</span><div><b>${j.name}${bot?'<span class="bot-badge">BOT ON DUTY</span>':'<span class="bot-badge">PLAYER SHIFT</span>'}</b><p>${j.desc}<br>📍 ${j.place} · ${j.skill}</p></div></div><button data-action="job:${j.id}" ${activeJob?'disabled':''}>${working?'SHIFT IN PROGRESS':bot?'TAKE OVER SHIFT':'WORK THIS SHIFT'} · ₡${j.reward}</button></article>`}).join('')}</div><p class="fineprint">Bot menutup semua posisi kosong pada simulasi lokal. Untuk pembagian pekerjaan global antar pemain, backend perlu menyimpan roster pekerjaan secara terpusat.</p>`;return;}
  if(app==='housing'){body.innerHTML=housingHTML();return;}
  if(app==='profile'){body.innerHTML=profileHTML();return;}
  if(app==='wallet'){body.innerHTML=`<div class="balance-card"><small>AVAILABLE BALANCE</small><strong>₡ ${money.toLocaleString('id-ID')}</strong><small>VIRTUAL CURRENCY · NO CASH OUT</small></div><div class="phone-section-title">RECENT ACTIVITY</div><div class="message">Welcome bonus <b>+ ₡1.250</b></div><p class="fineprint">Saldo disimpan lokal di browser perangkat ini untuk prototype. Belum tersinkron antarperangkat.</p>`;return;}
  if(app==='store'){body.innerHTML=`<div class="phone-widget"><small>FVCKTHERULES FLAGSHIP</small><h3>Soccer culture.<br>Street attitude.</h3><p>Jelajahi toko virtual dan koleksi asli FTTR.</p></div><div class="phone-section-title">FVCKTHERULES.MY.ID <small>ONLINE</small></div><div class="app-grid">${STORE_LINKS.map(([k,i,l])=>`<button class="app-icon" data-action="store-link:${k}"><span>${i}</span><small>${l}</small></button>`).join('')}</div><div class="phone-section-title">DI DALAM GAME</div>${row('↗','Enter the store','Lihat interior toko dari sudut pandang atas','enter-store','ENTER')}<p class="fineprint">Halaman dibuka dari website asli. Checkout, pelunasan, dan data pesanan tetap diproses oleh toko, bukan oleh game.</p>`;return;}
}
function openPhone(app='home'){closePlace();$('#phoneOverlay').hidden=false;renderPhone(app);}
function closePhone(){$('#phoneOverlay').hidden=true;}
function openShop(url,title){const u=typeof url==='string'?url:'https://game.fucktherules.my.id/index.html';$('#shopOverlay').hidden=false;$('#shopTitle').textContent=(title||'FTTR STORE').toUpperCase();$('#shopExternal').href=u;$('#shopFrame').src=u;}
function closeShop(){$('#shopOverlay').hidden=true;$('#shopFrame').src='about:blank';}
function openMap(){const list=$('#mapList');list.innerHTML=places.map(p=>`<button class="map-row" data-map-place="${p.id}"><span class="pin">⌖</span><span><b>${p.name}</b><small>${p.type}</small></span></button>`).join('');$('#mapOverlay').hidden=false;}
const STORE_BASE='https://fucktherules.my.id';
const STORE_LINKS=[['berita','📰','Berita','/berita'],['diskusi','💬','Diskusi','/diskusi'],['pantau','📍','Lacak','/pantau'],['resi','🧾','Cek Resi','/resi'],['pelunasan','💳','Pelunasan','/pelunasan'],['jurnal','📓','Jurnal','https://jurnal-fucktherules.my.id'],['toko','🛍','Toko','/katalog']];
const CLUBS=[['northside-fc','Northside FC'],['northside-athletic','Northside Athletic'],['eastbank-united','Eastbank United'],['eastbank-rovers','Eastbank Rovers']];
const profile=(()=>{try{return {name:'VISITOR_001',club:'northside-fc',hair:'#29231f',shirt:'#d7ff3f',skin:'#c98f68',...JSON.parse(localStorage.getItem('fttr.city.profile')||'{}')}}catch{return {name:'VISITOR_001',club:'northside-fc',hair:'#29231f',shirt:'#d7ff3f',skin:'#c98f68'}}})();
let home=(()=>{try{return JSON.parse(localStorage.getItem('fttr.city.home')||'null')}catch{return null}})();let tickets=Number(localStorage.getItem('fttr.city.tickets')||0),lastRest=0;
const RENT={room:['🛏','Kamar sewa',300,50,10],apt:['🏢','Apartemen',700,100,18]};
const clean=s=>String(s).replace(/[^\w .-]/g,'').slice(0,14)||'CITIZEN';
function saveProfile(){localStorage.setItem('fttr.city.profile',JSON.stringify(profile));}
function applyProfile(){if(!player)return;M['citizen-skin']?.color.set(profile.skin);M['citizen-shirt']?.color.set(profile.shirt);M['citizen-hair']?.color.set(profile.hair);const n=document.querySelector('.player-hud b');if(n)n.textContent=profile.name;}
const homeActive=()=>home&&home.until>Date.now();
const swatch=(k,list)=>`<div style="display:flex;gap:8px;margin:0 0 12px">${list.map(c=>`<button class="subtle-btn" style="background:${c};width:36px;min-height:36px;padding:0;${profile[k]===c?'outline:3px solid #171914':''}" data-action="style:${k}:${c}" aria-label="${k} ${c}"></button>`).join('')}</div>`;
function housingHTML(){return `<div class="phone-widget"><small>HOUSING</small><h3>${homeActive()?RENT[home.type][1]:'Belum punya tempat tinggal'}</h3><p>${homeActive()?'Sewa aktif sampai '+new Date(home.until).toLocaleDateString('id-ID')+'. Tidur memulihkan Energy dan Mood.':'Gunakan tempat istirahat publik gratis atau sewa tempat tinggal dengan uang virtual.'}</p>${needsSummary()}</div><div class="service-list">${row('🪑','Tempat istirahat publik','Gratis · Energy +15 · jeda 1 menit','house-rest','OPEN')}${homeActive()?row('😴','Tidur',`Energy +${RENT[home.type][3]} · Mood +${RENT[home.type][4]} · Hunger/Thirst −10`,'house-sleep','OPEN'):''}${Object.entries(RENT).map(([k,v])=>row(v[0],v[1],`₡${v[2]} / 7 hari · Energy +${v[3]} saat tidur`,'house-rent:'+k,'₡'+v[2])).join('')}</div><p class="fineprint">Uang virtual, tidak bisa ditarik. Sewa dan tidur masih tersimpan lokal di browser.</p>`;}
function profileHTML(){return `<div class="phone-widget"><small>CITIZEN PROFILE</small><h3>${profile.name}</h3><p>Klub: ${CLUBS.find(c=>c[0]===profile.club)?.[1]} · Tiket stadion: ${tickets}</p>${needsSummary()}</div><label class="mini-label" for="profName">NAMA TAMPILAN</label><input class="input" id="profName" maxlength="14" value="${profile.name}"><label class="mini-label" for="profClub">KLUB FAVORIT</label><select class="select" id="profClub">${CLUBS.map(c=>`<option value="${c[0]}" ${c[0]===profile.club?'selected':''}>${c[1]}</option>`).join('')}</select><span class="mini-label">RAMBUT</span>${swatch('hair',['#29231f','#7a4b2a','#d9b25f','#e8e2cc','#c4533f'])}<span class="mini-label">KAOS</span>${swatch('shirt',['#d7ff3f','#c4533f','#4a6fa5','#e8e2cc','#2f3a34'])}<span class="mini-label">KULIT</span>${swatch('skin',['#f1c7a0','#d5a07b','#c98f68','#8d5a3c','#5a3a28'])}<button class="solid-btn acid" data-action="profile-save">SIMPAN PROFIL</button>`;}
function handleAction(action){if(action==='profile-save'){profile.name=clean($('#profName').value);profile.club=$('#profClub').value;saveProfile();applyProfile();toast('Profil disimpan');renderPhone('profile');return;}
if(action.startsWith('style:')){const [,k,c]=action.split(':');profile[k]=c;saveProfile();applyProfile();renderPhone('profile');return;}
if(action==='house-rest'){if(Date.now()-lastRest<60000){toast('Tunggu sebentar sebelum istirahat lagi');return;}lastRest=Date.now();recoverNeed('energy',15);toast('Istirahat sebentar · Energy +15');renderPhone('housing');return;}
if(action==='house-sleep'&&homeActive()){const r=RENT[home.type];needs.energy=Math.min(100,needs.energy+r[3]);needs.mood=Math.min(100,needs.mood+r[4]);needs.hunger=Math.max(0,needs.hunger-10);needs.thirst=Math.max(0,needs.thirst-10);saveNeeds();updateNeedsUI();toast('Tidur nyenyak · Energy dan Mood naik');renderPhone('housing');return;}
if(action.startsWith('house-rent:')){const r=RENT[action.slice(11)];if(!r)return;if(money<r[2]){toast('Saldo tidak cukup');return;}setMoney(money-r[2]);home={type:action.slice(11),until:Date.now()+7*864e5};localStorage.setItem('fttr.city.home',JSON.stringify(home));toast('Sewa '+r[1]+' aktif 7 hari');renderPhone('housing');return;}if(action.startsWith('store-link:')){const l=STORE_LINKS.find(x=>x[0]===action.slice(11));if(l){closePhone();openShop(l[3].startsWith('http')?l[3]:STORE_BASE+l[3],l[2]);}return;}if(action.startsWith('football-')){const result=window.FTTRFootball?.handle(action);if(result?.msg)toast(result.msg);if(result?.rerender)renderPhone('football');return;}if(action==='send-chat'){const val=$('#chatDraft')?.value.trim();if(!val){toast('Tulis pesan terlebih dahulu');return;}const msg=document.createElement('div');msg.className='message';msg.innerHTML=`<b>YOU · JUST NOW</b>`;msg.append(document.createTextNode(val));$('#phoneBody').insertBefore(msg,$('#phoneBody').querySelector('.fineprint'));toast('Pesan tersimpan sebagai demo lokal');return;}
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
  scene=new THREE.Scene();scene.background=new THREE.Color('#d0d3c9');scene.fog=new THREE.Fog('#d0d3c9',90,185);camera=new THREE.OrthographicCamera(-18,18,18,-18,.1,200);camera.position.set(19,25,19);cameraTarget=new THREE.Vector3(0,0,0);camera.lookAt(cameraTarget);raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene.add(new THREE.HemisphereLight('#f9f4df','#717b68',2.1));const sun=new THREE.DirectionalLight('#fff3d6',2.4);sun.position.set(-12,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
  createCity();createBotWorkers();createInterior();createPlayer();resize();canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{dragState=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();applyZoom(cameraZoom+(e.deltaY<0?.1:-.1));},{passive:false});canvas.addEventListener('touchmove',touchPinch,{passive:false});window.addEventListener('resize',resize);addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if('wasd'.includes(k)&&k.length===1||k.startsWith('arrow')){keys.add(k);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
  {const joy=$('#joy'),knob=$('#joyKnob');let act=null;const mv=e=>{const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}joyVec=m>.2?{x,y}:null;knob.style.transform=`translate(${x*30}px,${y*30}px)`;};const end=()=>{act=null;joyVec=null;knob.style.transform='';};joy.addEventListener('pointerdown',e=>{act=e.pointerId;joy.setPointerCapture(act);mv(e);});joy.addEventListener('pointermove',e=>{if(act===e.pointerId)mv(e);});joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
  applyProfile();updateNeedsUI();$('#cameraFollow')?.classList.add('active');requestAnimationFrame(animate);setTimeout(()=>$('.world-tip')?.classList.add('hide'),7000);toast('FTTR CITY siap · WASD/joystick untuk jalan');}
init();
