const $ = s => document.querySelector(s);
const canvas = $('#world');
const moneyEl = $('#moneyVal');
let money = Number(localStorage.getItem('fttr.city.money') || 1250);
let THREE, renderer, scene, camera, raycaster, pointer, ground, cityGroup, interiorGroup, player, playerBody, playerHead, ring;
let isInside = false, selectedPlace = null, destination = null, lastTime = 0, toastTimer = 0;
let cameraTarget, cameraFollow=true, cameraZoom=1, dragState=null, pinchDistance=0;
const needs = (()=>{try{return {...{hunger:86,thirst:90,health:100,energy:95,mood:80},...JSON.parse(localStorage.getItem('fttr.city.needs')||'{}')}}catch{return {hunger:86,thirst:90,health:100,energy:95}}})();
let viewH=24,sunLight;let lastNeedsTick=0, activeJob=null, jobTimer=null;
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
const pickables = [], places = [], botWorkers = [], cars = [], walkers = [];
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
const ART_SURF={poles:[[-13.5,-3.3,'pole-01'],[10.5,-3.3,'pole-02'],[-30,-3.3,'pole-03'],[30,-3.3,'pole-04'],[-4.8,18.7,'pole-05'],[-42,18.7,'pole-06'],[42,18.7,'pole-07']],boards:[[-8,-17.4,'board-01']],walls:[[-34,-17.5,'wall-01'],[34,-17.5,'wall-02'],[-34,10.6,'wall-03'],[34,10.6,'wall-04'],[-15.5,10.8,'wall-05']]};
const ART_RES=[...ART_SURF.poles.map(p=>[p[0]-.8,p[0]+.8,p[1]-.8,p[1]+.8]),...ART_SURF.boards.map(p=>[p[0]-2,p[0]+2,p[1]-.6,p[1]+.6]),...ART_SURF.walls.map(p=>[p[0]-4.4,p[0]+4.4,p[1]-.7,p[1]+.7])];
const solids=[],LOT={A:-4.6,B:17.4,C:-26.6,E:39.4,F:-48.6},HR=[-44,-22,0,22,44],VR=[-48,-24,0,24,48];
const RND=seed=>{let s=(seed*7919+13)%2147483647;return()=>(s=(s*16807+11)%2147483647)/2147483647;};
const TEXC=new Map();
function facadeTex(w,h,o){
 const key=[w.toFixed(1),h.toFixed(1),o.wall,o.n,o.gf.toFixed(2),o.brick?1:0,o.glass?1:0,o.door===false?0:1,o.sign||'',o.sb||'',o.sf||'',(o.seed||0)%4].join('|');
 if(TEXC.has(key))return TEXC.get(key);
 const cw=Math.max(64,Math.min(512,Math.round(w*56))),ch=Math.max(64,Math.min(512,Math.round(h*56)));
 const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d'),rnd=RND((o.seed||0)%4+3);
 x.fillStyle=o.wall;x.fillRect(0,0,cw,ch);
 if(o.brick){x.strokeStyle='rgba(0,0,0,.1)';for(let y=0;y<ch;y+=8){x.beginPath();x.moveTo(0,y);x.lineTo(cw,y);x.stroke();for(let k=(y/8%2)*10;k<cw;k+=20){x.beginPath();x.moveTo(k,y);x.lineTo(k,y+8);x.stroke();}}}
 const gh=Math.round(ch*o.gf),n=o.n,uh=(ch-gh)/Math.max(1,n),cols=Math.max(1,Math.round(w/1.5));
 for(let f=0;f<n;f++){const y0=f*uh;
  if(o.glass){const g=x.createLinearGradient(0,y0,0,y0+uh);g.addColorStop(0,'#8fdcf5');g.addColorStop(1,'#2f78b4');x.fillStyle=g;x.fillRect(4,y0+3,cw-8,uh-6);x.fillStyle='#1d2b33';for(let k=0;k<=cols*2;k++)x.fillRect(4+k*(cw-8)/(cols*2)-1,y0+3,2,uh-6);continue;}
  for(let k=0;k<cols;k++){const ww=cw/cols,wx=k*ww+ww*.24,wd=ww*.52,wy=y0+uh*.2,wh=uh*.56,lit=rnd()<.28;
   x.fillStyle='#2a2d28';x.fillRect(wx-3,wy-3,wd+6,wh+6);const g=x.createLinearGradient(0,wy,0,wy+wh);if(lit){g.addColorStop(0,'#fbe6a2');g.addColorStop(1,'#e2a94f');}else{g.addColorStop(0,'#a9c4c4');g.addColorStop(1,'#587a80');}
   x.fillStyle=g;x.fillRect(wx,wy,wd,wh);x.fillStyle='#2a2d28';x.fillRect(wx+wd/2-1,wy,2,wh);x.fillStyle='#e4e0d1';x.fillRect(wx-5,wy+wh+3,wd+10,4);}}
 const gy=ch-gh;x.fillStyle='rgba(0,0,0,.14)';x.fillRect(0,gy,cw,gh);
 if(o.sign){x.fillStyle=o.sb;x.fillRect(0,gy,cw,gh*.3);x.fillStyle=o.sf;x.font='900 '+Math.round(gh*.2)+'px Inter,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(o.sign,cw/2,gy+gh*.15,cw*.9);}
 const top=gy+(o.sign?gh*.34:gh*.12),hh=ch-top-gh*.06,dw=cw*.14;
 if(o.door!==false){x.fillStyle='#23261f';x.fillRect(cw/2-dw/2-3,top,dw+6,hh);x.fillStyle='#9dbbb8';x.fillRect(cw/2-dw/2,top+4,dw,hh*.55);x.fillStyle='#d7ff3f';x.fillRect(cw/2-dw/2,top+hh*.62,dw,3);
  for(const s of [-1,1]){const sw=(cw/2-dw/2-cw*.07)*.88,sx=s<0?cw*.045:cw/2+dw/2+cw*.03;x.fillStyle='#23261f';x.fillRect(sx-3,top,sw+6,hh*.8);const g=x.createLinearGradient(0,top,0,top+hh*.8);g.addColorStop(0,'#fff0b8');g.addColorStop(1,'#d9b062');x.fillStyle=g;x.fillRect(sx,top+3,sw,hh*.8-6);}
 }else{for(let k=0;k<cols;k++){const ww=cw/cols,wx=k*ww+ww*.24;x.fillStyle='#2a2d28';x.fillRect(wx-3,top,ww*.52+6,hh*.7);x.fillStyle='#a9c4c4';x.fillRect(wx,top+3,ww*.52,hh*.7-6);}}
 x.fillStyle='rgba(0,0,0,.25)';x.fillRect(0,ch-6,cw,6);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;TEXC.set(key,t);return t;}
function pitchTex(){if(TEXC.has('pitch'))return TEXC.get('pitch');const c=document.createElement('canvas');c.width=320;c.height=200;const x=c.getContext('2d');for(let i=0;i<10;i++){x.fillStyle=i%2?'#3f8a4c':'#4a9a57';x.fillRect(i*32,0,32,200);}x.strokeStyle='#f2efdf';x.lineWidth=3;x.strokeRect(8,8,304,184);x.beginPath();x.moveTo(160,8);x.lineTo(160,192);x.stroke();x.beginPath();x.arc(160,100,28,0,7);x.stroke();x.strokeRect(8,60,44,80);x.strokeRect(268,60,44,80);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;TEXC.set('pitch',t);return t;}
function gable(g,w,d,rh,color,y){const s=new THREE.Shape();s.moveTo(-d/2-.15,0);s.lineTo(d/2+.15,0);s.lineTo(0,rh);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:w+.3,bevelEnabled:false});geo.rotateY(Math.PI/2);geo.translate(-(w+.3)/2,0,0);const m=new THREE.Mesh(geo,material('roof-'+color,color,.85));m.position.y=y;m.castShadow=true;g.add(m);}
function inst(geo,color,list,shadow){const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color,roughness:.9}),Math.max(1,list.length)),d=new THREE.Object3D();list.forEach((p,i)=>{d.position.set(p[0],p[1],p[2]);d.scale.set(p[3]??1,p[4]??1,p[5]??1);d.rotation.set(0,p[6]||0,0);d.updateMatrix();m.setMatrixAt(i,d.matrix);});m.castShadow=!!shadow;m.receiveShadow=true;m.frustumCulled=false;cityGroup.add(m);return m;}
const EX={
 tables:(g,w,d)=>{[-1,1].forEach((s,i)=>{const x=s*w*.28,z=d/2+.5;cylinder(g,.03,.03,.5,'#444',x,.35,z,6);cylinder(g,.22,.22,.04,'#e8e2cc',x,.62,z,10);cylinder(g,.03,.03,.9,'#444',x,1.0,z,6);cylinder(g,.02,.48,.22,['#c4533f','#d7ff3f'][i],x,1.5,z,10);});},
 crates:(g,w,d)=>{['#c4533f','#d9a441','#6aa84f','#e0d9c7'].forEach((c,i)=>box(g,.38,.3,.32,c,-w/2+.6+i*.45,.3,d/2+.5));},
 fttr:(g,w,d,H)=>{box(g,w+.2,.16,.2,'#d7ff3f',0,H+.28,d/2);[-1,1].forEach(s=>box(g,.5,1.1,.05,'#d7ff3f',s*(w/2+.05),H-.5,d/2+.1,{shadow:false}));box(g,.5,.5,.5,'#d7ff3f',0,.35,d/2+.5);},
 station:(g,w,d,H)=>{box(g,1.1,3.4,1.1,'#a9ab9f',-w/2+.9,H+1.8,-.3);cylinder(g,.4,.4,.12,'#f2efdf',-w/2+.9,H+2.8,.3,16).rotation.x=Math.PI/2;box(g,w+3,.14,2.6,'#2f4f43',0,2.9,-d/2-1.6);[-1,1].forEach(s=>[0,1].forEach(k=>cylinder(g,.07,.07,2.8,'#2a2d28',s*(w/2+1),1.5,-d/2-.5-k*2,6)));box(g,w+3,.28,2.6,'#cfcbbb',0,.2,-d/2-1.6);},
 hq:(g,w,d,H)=>{box(g,w+.2,.2,d+.2,'#d7ff3f',0,H+.25,0);cylinder(g,.05,.08,2.4,'#2a2d28',w/4,H+1.4,0,6);},
 police:(g,w,d,H)=>{box(g,.5,.2,.3,'#d64e4e',-.5,H+.4,0);box(g,.5,.2,.3,'#4a7bd6',.1,H+.4,0);cylinder(g,.04,.04,2.2,'#999',w/2-.3,H+1.2,d/2-.3,6);box(g,.7,.4,.03,'#2f5fb8',w/2+.05,H+2.0,d/2-.3);},
 press:(g,w,d,H)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.55,12,6,0,Math.PI*2,0,Math.PI/2),material('dish','#e8e6dc'));m.rotation.x=-.9;m.position.set(w/4,H+.6,0);g.add(m);cylinder(g,.05,.05,.7,'#555',w/4,H+.4,0,6);},
 balc:(g,w,d,H)=>{for(let k=0;k<4;k++)[-1,1].forEach(s=>{box(g,1.3,.08,.5,'#3a3c36',s*w*.26,1.75+k*1.15,d/2+.25);box(g,1.3,.4,.04,'#5a5d55',s*w*.26,2.0+k*1.15,d/2+.5,{shadow:false});});},
 pub:(g,w,d)=>{box(g,.9,.5,.06,'#171914',w/2-.2,1.7,d/2+.4);cylinder(g,.22,.22,.45,'#7a5a3a',-w/2+.4,.35,d/2+.5,8);cylinder(g,.22,.22,.45,'#7a5a3a',-w/2+.9,.35,d/2+.5,8);},
 hospital:(g,w,d,H)=>{box(g,1.4,.35,.2,'#d64e4e',0,H+.7,d/2-.2);box(g,.35,1.4,.2,'#d64e4e',0,H+.7,d/2-.2);box(g,2.8,.14,1.2,'#c93a3a',0,1.75,d/2+.55);[-1,1].forEach(s=>cylinder(g,.05,.05,1.7,'#eee',s*1.3,.9,d/2+1.0,6));},
 garage:(g,w,d)=>{for(let k=0;k<3;k++)cylinder(g,.28,.28,.2+.0,'#1b1c18',w/2-.6,.2+k*.2,d/2+.5,10);},
 works:(g,w,d,H)=>{box(g,.25,4.2,.25,'#d9a441',w/2-.8,H+2.1,-d/4);box(g,3.2,.2,.25,'#d9a441',w/2-2.2,H+4.1,-d/4);cylinder(g,.02,.02,1.4,'#222',w/2-3.6,H+3.4,-d/4,4);}
};
function stadiumBits(g,w,d,o){
 const pw=w-2.2,pd=d-2.2,pm=new THREE.Mesh(new THREE.PlaneGeometry(pw,pd),new THREE.MeshStandardMaterial({map:pitchTex(),roughness:1}));pm.rotation.x=-Math.PI/2;pm.position.y=.16;pm.receiveShadow=true;g.add(pm);
 const hN=o.small?[1.6,1.1,.7]:[3.0,2.1,1.2],hS=o.small?[.8,.6,.4]:[1.3,.9,.55],cols=[o.club||'#c4533f','#d9d4bd',o.club||'#c4533f'];
 for(let t=0;t<3;t++){const off=.28+t*.5;box(g,w-t,hN[t],.5,cols[t],0,hN[t]/2+.1,-(d/2-off));box(g,.5,hN[t],d-t,cols[t],-(w/2-off),hN[t]/2+.1,0);box(g,w-t,hS[t],.5,cols[t],0,hS[t]/2+.1,d/2-off);box(g,.5,hS[t],d-t,cols[t],w/2-off,hS[t]/2+.1,0);}
 for(const sx of [-1,1])for(const sz of [-1,1]){cylinder(g,.07,.09,5.5,'#4a4e44',sx*(w/2-.1),2.8,sz*(d/2-.1),6);box(g,1.1,.5,.15,material('flood','#fff3c0'),sx*(w/2-.1),5.6,sz*(d/2-.1),{shadow:false});}
 [-1,1].forEach(s=>cylinder(g,.06,.06,1.6,'#2a2d28',s*1.1,.9,d/2+.1,6));sign(g,o.glyph||'GROUND',0,1.95,d/2+.12,2.6,.5,'#171914','#d7ff3f');
 sign(g,'LIVE',0,hN[0]+.55,-(d/2)+.5,2.2,.6,'#171914','#d7ff3f');}
function busBits(g,w,d){box(g,w,.1,d,'#b3b1a5',0,.05,0,{shadow:false});[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>cylinder(g,.05,.05,2.3,'#2a2d28',a*(w/2-.1),1.2,b*(d/2-.1),6));box(g,w+.3,.12,d+.4,'#1f6f5c',0,2.4,0);
 const gl=material('glass','#9fd0d8',.2,{transparent:true,opacity:.4});box(g,w-.2,1.6,.04,gl,0,1.3,-d/2+.1,{shadow:false});[-1,1].forEach(s=>box(g,.04,1.6,d-.2,gl,s*(w/2-.1),1.3,0,{shadow:false}));box(g,1.6,.1,.4,'#7a5a3a',0,.6,-d/2+.4);box(g,1.6,.4,.06,'#7a5a3a',0,.85,-d/2+.2);
 cylinder(g,.04,.04,3,'#2a2d28',w/2+.4,1.5,d/2,6);sign(g,'BUS',w/2+.4,3.1,d/2+.05,.8,.5,'#1f6f5c','#fff');sign(g,'HALTE',0,2.62,d/2+.22,2.2,.3,'#1f6f5c','#fff');}
function boardBits(g,w,d){[-1,1].forEach(s=>cylinder(g,.1,.12,3,'#353830',s*(w/2-.5),1.5,0,8));box(g,w,2.2,.2,'#171914',0,3.2,0);sign(g,'YOUR AD HERE',0,3.2,.11,w-.4,1.8,'#171914','#d7ff3f');box(g,w,.12,.5,'#4a4e44',0,2.05,.25);[-1,0,1].forEach(s=>box(g,.2,.12,.2,material('flood','#fff3c0'),s*1.8,4.45,.2,{shadow:false}));}
function detail(g,o,w,d,H){
 const hs=[...(o.id||'x')].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7),fl=o.fl||2,gf=o.gfH||1.5,dark='#8a867a',top=H+.3,N={shadow:false};
 if(H>2.6)[-1,1].forEach(s=>box(g,.26,H,.26,dark,s*(w/2),H/2+.1,d/2,N));
 if(o.roofType==='gable'){box(g,.5,1.1,.5,'#7b4a3c',w*(hs%2?.25:-.25),H+1,-d*.15);box(g,1.3,.12,.7,'#a8a498',0,.1,d/2+.35,N);box(g,1.6,.09,.9,o.roof||'#8a4b3a',0,1.75,d/2+.5,N);[-.7,.7].forEach(s=>box(g,.07,1.6,.07,'#3a3c36',s,.9,d/2+.85,N));return;}
 if(fl>=3){const y=gf+1.15+.12;[-1,1].forEach(s=>{const x=s*w*.25;box(g,w*.3,.09,.55,'#9b988c',x,y,d/2+.27,N);box(g,w*.3,.34,.04,'#2a2d28',x,y+.22,d/2+.52,N);});}
 let ty=top;
 if(o.glass||fl>=4){box(g,w*.66,1.1,d*.66,'#33464d',0,top+.55,0);box(g,w*.74,.14,d*.74,'#2a2d28',0,top+1.15,0,N);cylinder(g,.03,.03,2,'#222',w*.2,top+2.1,0,4);ty=top+1.2;}
 else{box(g,w,.35,.14,dark,0,top+.17,d/2-.07,N);box(g,w,.35,.14,dark,0,top+.17,-d/2+.07,N);box(g,1.1,.8,1.1,dark,-w*.2,top+.4,-d*.15);}
 if(hs%3===0){cylinder(g,.45,.45,.8,'#8b6a4a',w*.22,ty+.9,d*.1,10);cylinder(g,.02,.46,.3,'#5d4632',w*.22,ty+1.45,d*.1,10);[-.25,.25].forEach(s=>box(g,.06,.5,.06,'#2a2d28',w*.22+s,ty+.3,d*.1,N));}
}
function mk(o){
 const w=o.w,d=o.d,fl=o.fl||2,gfH=o.gfH||1.5,fh=1.15,H=gfH+fl*fh,z=o.z??LOT[o.row]-d/2;
 const g=new THREE.Group();g.position.set(o.x,0,z);if(o.face==='N')g.rotation.y=Math.PI;cityGroup.add(g);
 if(!o.lite)box(g,w+1.2,.1,d+1.2,o.kind==='busstop'||o.kind==='billboard'?'#8f9e82':'#b9b7aa',0,.05,.2,{shadow:false});
 let HH=H;
 if(o.kind==='stadium'){stadiumBits(g,w,d,o);HH=3;}
 else if(o.kind==='busstop'){busBits(g,w,d);HH=2.6;}
 else if(o.kind==='billboard'){boardBits(g,w,d);HH=4.5;}
 else{
  const base={wall:o.wall||'#cfc9b8',n:fl,gf:gfH/H,brick:o.brick,glass:o.glass,seed:(o.id||'x').length};
  const fm=(ww,ex)=>new THREE.MeshStandardMaterial({map:facadeTex(ww,H,{...base,...ex}),roughness:.88});
  const rm=new THREE.MeshStandardMaterial({color:o.roof||'#6b6e66',roughness:.9});
  const front=fm(w,{sign:o.glyph?(o.sign||o.glyph):'',sb:o.sb||'#171914',sf:o.sf||'#d7ff3f'}),side=fm(d,{door:false,sign:'',seed:3});
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),[side,side,rm,rm,front,side]);body.position.y=H/2+.1;body.castShadow=body.receiveShadow=true;g.add(body);
  box(g,w+.2,.2,d+.2,'#3a3c36',0,H+.2,0,{shadow:false});
  if(o.roofType==='gable')gable(g,w,d,o.rh||1.2,o.roof||'#8a4b3a',H+.3);else if(!o.lite){box(g,.9,.5,.8,'#8a8c82',w/4,H+.55,-d/4);box(g,.7,.4,.6,'#9a9c92',-w/4,H+.5,d/5,{shadow:false});}
  if(o.awning){box(g,w*.92,.1,.6,o.awning,0,.98,d/2+.3,{shadow:false});}
  if(o.extra&&EX[o.extra])EX[o.extra](g,w,d,H);detail(g,o,w,d,H);
 }
 return {g,z,H:HH};}
function addPlace(o0){const L=LAY[o0.id]||{},o={...o0,...L};if(L.row&&L.z===undefined)delete o.z;const {id,name,type,desc,glyph,tag,x,w,d,hours='OPEN · ALL DAY',kind='building'}=o;const r=mk(o),z=r.z,g=r.g;
 const hit=new THREE.Mesh(new THREE.BoxGeometry(w+.8,r.H+.8,d+.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001,depthWrite:false}));hit.position.set(0,r.H/2+.2,0);hit.userData.placeId=id;g.add(hit);pickables.push(hit);
 const p={id,name,type,desc,glyph,tag,x,z,w,d,hours,kind,group:g,hit};places.push(p);return p;}
const LAY={
 fttr:{x:-9,row:'A',w:5.6,d:4.4,fl:2,wall:'#22241f',sb:'#d7ff3f',sf:'#171914',awning:'#d7ff3f',extra:'fttr'},
 market:{x:-17,row:'A',w:4.4,d:3.4,fl:1,wall:'#cfd8c3',sb:'#2f6b3a',sf:'#ffffff',awning:'#2f6b3a',extra:'crates'},
 cafe2:{x:6.5,row:'A',w:4,d:3.2,fl:1,wall:'#d4c2a8',sb:'#5a3b2a',sf:'#f4e3c8',awning:'#a64e3d',extra:'tables'},
 station:{x:14.5,row:'A',w:6.4,d:4.6,fl:2,wall:'#c2c4ba',sb:'#1f4f3f',sf:'#ffffff',extra:'station'},
 hq:{x:-9,row:'C',w:5,d:4,fl:5,glass:true,wall:'#3d4f57',sb:'#171914',extra:'hq'},
 jobcentre:{x:9,row:'C',w:4.6,d:3.6,fl:2,wall:'#c9d0c3',sb:'#2d4f7a',sf:'#ffffff'},
 police:{x:-17,row:'C',w:4.4,d:3.6,fl:2,wall:'#c2c9ce',sb:'#1f3f7a',sf:'#ffffff',extra:'police'},
 press:{x:17,row:'C',w:4.8,d:3.8,fl:3,wall:'#d2cdbd',sb:'#171914',extra:'press'},
 residential:{x:-16.5,row:'B',w:6,d:4.2,fl:5,wall:'#cdb9a3',brick:true,sb:'#3a3c36',sf:'#f2efdf',extra:'balc'},
 pub:{x:-9,row:'B',w:4.6,d:3.6,fl:2,wall:'#74443a',brick:true,sb:'#171914',sf:'#d7ff3f',extra:'pub'},
 cafe:{x:8,row:'B',w:4.8,d:3.6,fl:1,wall:'#d8c4a6',sb:'#8a3b2d',sf:'#ffffff',awning:'#a64e3d',extra:'tables'},
 hospital:{x:16,row:'B',w:6.2,d:4.6,fl:4,wall:'#e8e7de',sb:'#c93a3a',sf:'#ffffff',extra:'hospital'},
 busstop:{kind:'busstop',x:-10,z:3.9,w:3.2,d:1.3},
 billboard:{kind:'billboard',x:-8,z:9,w:5.8,d:1},
 stadium:{kind:'stadium',x:12,row:'E',w:9,d:6.5,club:'#4a4e44'},
 'northside-fc':{kind:'stadium',x:-36,row:'C',w:8,d:6,club:'#2a5fa8'},
 'northside-athletic':{kind:'stadium',x:-36,row:'A',w:7,d:5.5,club:'#c4533f'},
 'northside-market':{x:-57,row:'A',w:6,d:4,fl:1,wall:'#cdbfa8',sb:'#a64e3d',sf:'#fff',awning:'#a64e3d',extra:'crates'},
 training:{kind:'stadium',small:true,x:-36,row:'B',w:8,d:5.5,club:'#2a5fa8'},
 'eastbank-united':{kind:'stadium',x:36,row:'C',w:8,d:6,club:'#d9a441'},
 'eastbank-rovers':{kind:'stadium',x:36,row:'A',w:7,d:5.5,club:'#2f8f5b'},
 'eastbank-market':{x:57,row:'A',w:6,d:4,fl:1,wall:'#b8c3b9',sb:'#2d4f7a',sf:'#fff',awning:'#2d4f7a',extra:'crates'},
 garage:{x:36,row:'B',w:5.4,d:3.8,fl:1,gfH:2.2,wall:'#b9b0a4',sb:'#2a2d28',sf:'#d7ff3f',roofType:'gable',rh:.9,roof:'#6b6e66',extra:'garage'},
 works:{x:57,row:'B',w:5.6,d:4,fl:1,gfH:2.4,wall:'#aaa99f',sb:'#2a2d28',sf:'#d7ff3f',roofType:'gable',rh:.9,roof:'#5b5e56',extra:'works'}
};
function roads(){
 const E=66,asph='#4b4e49',walk='#cfcbbb';
 HR.forEach(z=>box(cityGroup,E*2,.06,6,asph,0,0,z,{shadow:false}));VR.forEach(x=>box(cityGroup,6,.07,E*2,asph,x,0,0,{shadow:false}));
 const cuts=a=>{const s=[];let p=-E;[...a].sort((m,n)=>m-n).forEach(c=>{s.push([p,c-3.8]);p=c+3.8;});s.push([p,E]);return s;};
 HR.forEach(z=>cuts(VR).forEach(([a,b])=>[-1,1].forEach(s=>box(cityGroup,b-a,.1,.8,walk,(a+b)/2,.04,z+s*3.4,{shadow:false}))));
 VR.forEach(x=>cuts(HR).forEach(([a,b])=>[-1,1].forEach(s=>box(cityGroup,.8,.1,b-a,walk,x+s*3.4,.04,(a+b)/2,{shadow:false}))));
 const dx=[],dz=[],zb=[],lamps=[];
 HR.forEach(z=>{for(let x=-E+2;x<E;x+=4)if(!VR.some(v=>Math.abs(x-v)<4.4))dx.push([x,.06,z,1.6,.02,.14]);for(let x=-E+7;x<E;x+=14)if(!VR.some(v=>Math.abs(x-v)<5))lamps.push([x,0,z+3.5]);});
 VR.forEach(x=>{for(let z=-E+2;z<E;z+=4)if(!HR.some(h=>Math.abs(z-h)<4.4))dz.push([x,.07,z,.14,.02,1.6]);for(let z=-E+7;z<E;z+=14)if(!HR.some(h=>Math.abs(z-h)<5))lamps.push([x+3.5,0,z]);});
 [-24,0,24].forEach(vx=>[-22,0,22].forEach(hz=>{for(let k=-3;k<=3;k++){[-1,1].forEach(s=>{zb.push([vx+k*.8,.075,hz+s*4.6,.5,.02,1.2]);zb.push([vx+s*4.6,.075,hz+k*.8,1.2,.02,.5]);});}}));
 const B=new THREE.BoxGeometry(1,1,1);inst(B,'#e7e4d5',dx.concat(dz));inst(B,'#f0ede0',zb);
 inst(new THREE.CylinderGeometry(.05,.07,1,6),'#3a3d36',lamps.map(p=>[p[0],1.3,p[2],1,2.6,1]));inst(new THREE.SphereGeometry(.18,8,6),'#ffe9a8',lamps.map(p=>[p[0],2.7,p[2]]));
}
const SHOPS=[['BAKERY','#a64e3d','#ffffff'],['LAUNDRY','#2d4f7a','#ffffff'],['BARBER','#171914','#d7ff3f'],['PHARMACY','#2f6b3a','#ffffff'],['KIOSK','#d9a441','#171914'],['BOOKS','#5a3b2a','#f4e3c8'],['TAILOR','#6b4f6e','#ffffff'],['MOTOR','#2a2d28','#d7ff3f'],['RAMEN','#c4533f','#ffffff'],['COFFEE','#3a2a1f','#f4e3c8'],['SPORTS','#2a5fa8','#ffffff'],['VINYL','#171914','#e8e2cc']];
const cutsFn=a=>{const s=[];let p=-66;[...a].sort((m,n)=>m-n).forEach(c=>{s.push([p,c-3.8]);p=c+3.8;});s.push([p,66]);return s;};
function river(){box(cityGroup,132,.03,4.4,'#5aa3b9',0,-.005,30,{shadow:false});box(cityGroup,132,.02,3.2,'#7cc0d2',0,.012,30,{shadow:false});
 cutsFn(VR).forEach(([a,b])=>[-1,1].forEach(s=>box(cityGroup,b-a,.25,.45,'#8f8f80',(a+b)/2,.1,30+s*2.4,{shadow:false})));
 VR.forEach(x=>[-1,1].forEach(s=>box(cityGroup,.14,.55,4.6,'#5a5d55',x+s*3.9,.35,30,{shadow:false})));}
function fillCity(){
 const rnd=RND(77),RES=[[-13.6,-.4,-17.2,-10.4],[-64,64,-15.5,-13],[8,16,6.3,11.3],[-10.9,-5.1,8.5,9.5],[-11.6,-8.4,3.2,4.6],[-64,64,27.5,32.5],[9.5,19.5,-12.6,-10.6]].concat(ART_RES);
 const segs=[[-63,-51.8],[-44.2,-27.8],[-20.2,-3.8],[3.8,20.2],[27.8,44.2],[51.8,63]];
 const W=['#f2d49b','#eeb8a0','#a9d6ec','#f6e6b8','#f2a58f','#bde3a2','#cabcf0','#f8cb7c'],RC=['#d9582f','#c0392b','#2f7fb8','#e0a030'];let n=100;
 const fits=(x,z,w,d)=>!places.some(p=>Math.abs(x-p.x)<(w+p.w)/2+.7&&Math.abs(z-p.z)<(d+p.d)/2+.7)&&!solids.some(p=>Math.abs(x-p.x)<(w+p.w)/2+.3&&Math.abs(z-p.z)<(d+p.d)/2+.3)&&!RES.some(r=>x+w/2+.4>r[0]&&x-w/2-.4<r[1]&&z+d/2+.3>r[2]&&z-d/2-.3<r[3]);
 const make=(cx,cz,w,d,face,kind,k)=>{n++;const o={id:'f'+n,x:cx,z:cz,face,w,d,lite:true,wall:W[n%8]};
   if(kind==='house')Object.assign(o,{fl:1+(n%2),gfH:1.4,roof:RC[n%4],roofType:'gable',rh:1.2,brick:n%2===0});
   else if(kind==='shop'&&cx>28)Object.assign(o,{fl:1,gfH:2.2,roofType:'gable',rh:.9,roof:'#6b6e66',wall:'#aaa99f',glyph:'WAREHOUSE',sb:'#2a2d28',sf:'#d7ff3f'});
   else if(kind==='shop'){const s=SHOPS[n%12];Object.assign(o,{fl:2,glyph:s[0],sb:s[1],sf:s[2],awning:s[1],brick:n%3===0});}
   else if(kind==='apt')Object.assign(o,{fl:3+(n%2),brick:true,wall:['#c4a58e','#b9998a','#cdb09a'][n%3],roof:'#6b6e66'});
   else Object.assign(o,{fl:5+(n%3),glass:true,wall:'#3f8fc4',glyph:['CORP','MEDIA','TRADE','LABS'][n%4],sb:'#171914',sf:'#d7ff3f'});
   const r=mk(o);solids.push({x:cx,z:r.z,w:w+.6,d:d+.6});};
 const dims=()=>{const k=rnd(),kind=k<.3?'house':k<.55?'shop':k<.8?'apt':'office';const q=v=>Math.round(v*2)/2;return {k,kind,w:q(kind==='house'?3.8+rnd()*.8:3.6+rnd()*1.8),d:q(kind==='house'?3.2+rnd()*.6:3.2+rnd()*1.6)};};
 HR.forEach(h=>[-1,1].forEach(side=>segs.forEach(([a,b])=>{let x=a+rnd()*1.2,guard=0;while(x<b-3.2&&guard++<12){const {k,kind,w,d}=dims(),cx=x+w/2;if(cx+w/2>b)break;const cz=h+side*(4.6+d/2);
  if(fits(cx,cz,w,d)){make(cx,cz,w,d,side>0?'N':'S',kind,k);x=cx+w/2+.5;}else x+=1.4;}})));
 let tries=0,cnt=0;while(tries++<7000&&cnt<220){const x=(rnd()-.5)*124,z=(rnd()-.5)*124,{k,kind,w,d}=dims();
  if(VR.some(v=>Math.abs(x-v)<4.2+w/2)||HR.some(h=>Math.abs(z-h)<4.2+d/2)||!fits(x,z,w,d))continue;
  const nh=HR.reduce((p,c)=>Math.abs(c-z)<Math.abs(p-z)?c:p);make(x,z,w,d,nh>z?'S':'N',kind,k);cnt++;}
}
function houses(){
 const W=['#d8c4a8','#c9b7a0','#bfc9b8','#d9cfc0','#c8b5a8'],RC=['#8a4b3a','#5b6b4a','#4f5f73','#7a6a4a'];let n=0;
 const xs=[-58,-41,-36,-31,-17,-12,-7,7,12,17,31,36,41,58];
 const put=(x,row)=>{n++;const o={id:'h'+n,x,row,w:4,d:3.4,fl:1+(n%2),gfH:1.4,wall:W[n%5],roof:RC[n%4],roofType:'gable',rh:1.2,brick:n%2===0};const r=mk(o);solids.push({x,z:r.z,w:o.w+.4,d:o.d+.4});};
 xs.forEach(x=>{if(![7,12,17].includes(x))put(x,'E');put(x,'F');});[-57,57].forEach(x=>{if(x<0)put(x,'B');put(x,'C');});
}
function scenery(){
 const rnd=RND(5),tr=[],cr=[],cr2=[];
 const free=(x,z)=>!places.some(p=>Math.abs(x-p.x)<p.w/2+1.5&&Math.abs(z-p.z)<p.d/2+1.5)&&!solids.some(p=>Math.abs(x-p.x)<p.w/2+1.2&&Math.abs(z-p.z)<p.d/2+1.2);
 const Z=[[-62,62,9,14,46],[-62,62,-12.5,-8.5,22],[-62,62,-36,-31,26],[-62,62,53,63,30],[-62,62,-63,-52,10],[-62,62,35,38,10]];
 Z.forEach(([x1,x2,z1,z2,n])=>{for(let i=0;i<n;i++){const x=x1+rnd()*(x2-x1),z=z1+rnd()*(z2-z1);if(!free(x,z)||(Math.abs(x+7)<3&&Math.abs(z+13.5)<3))continue;const s=.8+rnd()*.6;tr.push([x,.6*s,z,s,1.2*s,s]);(rnd()>.5?cr:cr2).push([x,1.9*s,z,1.1*s,1.15*s,1.1*s,rnd()*3]);}});
 for(let x=-62;x<=62;x+=5){if(VR.some(v=>Math.abs(x-v)<4.8))continue;[26.5,33.5].forEach(zz=>{if(!free(x,zz))return;const s=.8+rnd()*.5;tr.push([x,.6*s,zz,s,1.2*s,s]);cr.push([x,1.9*s,zz,1.1*s,1.15*s,1.1*s,rnd()*3]);});}
 inst(new THREE.CylinderGeometry(.12,.18,1,6),'#6b5239',tr,true);inst(new THREE.IcosahedronGeometry(1,0),'#5f8a4f',cr,true);inst(new THREE.IcosahedronGeometry(1,0),'#4d7a45',cr2,true);
 // plaza fountain
 const fx=-7,fz=-13.5;box(cityGroup,13,.06,6.5,'#c9c4b0',-7,.04,-13.8,{shadow:false});cylinder(cityGroup,1.9,2,.4,'#bfbcae',fx,.3,fz,20);cylinder(cityGroup,1.55,1.55,.42,'#6fb2c8',fx,.3,fz,20);cylinder(cityGroup,.2,.25,1.2,'#bfbcae',fx,.9,fz,10);cylinder(cityGroup,.7,.1,.2,'#bfbcae',fx,1.5,fz,12);
 [[-11,-16],[-3,-16],[-11,-11],[-3,-11]].forEach(([x,z])=>{box(cityGroup,1.3,.1,.4,'#755b3f',x,.5,z);box(cityGroup,1.3,.3,.08,'#755b3f',x,.7,z-.2);cylinder(cityGroup,.04,.04,.4,'#333',x-.5,.25,z,5);cylinder(cityGroup,.04,.04,.4,'#333',x+.5,.25,z,5);});
 // futsal court in east park
 const ct=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshStandardMaterial({map:pitchTex()}));ct.rotation.x=-Math.PI/2;ct.position.set(12,.05,8.8);ct.receiveShadow=true;cityGroup.add(ct);
 // rails + train behind the station
 box(cityGroup,132,.08,2.2,'#7b7468',0,.04,-14.2,{shadow:false});[-.5,.5].forEach(s=>box(cityGroup,132,.08,.1,'#2a2d28',0,.12,-14.2+s,{shadow:false}));box(cityGroup,9,.25,1.7,'#cfcbbb',14.5,.12,-11.6);
 const tg=new THREE.Group();['#d7ff3f','#171914','#d7ff3f'].forEach((c,i)=>{box(tg,2.6,1,.95,c,i*2.8,.8,0);box(tg,2.2,.3,.97,'#9fc4cf',i*2.8,1.05,0,{shadow:false});});tg.position.set(0,.1,-14.2);tg.userData={axis:'x',t:-30,s:6};cityGroup.add(tg);cars.push(tg);
}
function createCity(){
 cityGroup=new THREE.Group();scene.add(cityGroup);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(150,150),material('grass','#74c943'));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;cityGroup.add(ground);
 roads();river();
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
  addPlace({id:'hq',name:'FTTR HEADQUARTERS',type:'BRAND OFFICE',desc:'Kantor pusat FUCK THE RULES: media, kreatif, dan nantinya AI Agent dengan login staf.',glyph:'FTTR HQ',tag:'HEADQUARTERS',x:-8,z:-14,w:5,d:4,color:'#d4d0c2'});
  addPlace({id:'jobcentre',name:'CITY JOB CENTRE',type:'EMPLOYMENT',desc:'Pusat lowongan kota. Lihat pekerjaan, ambil shift, dan gantikan bot yang sedang bertugas.',glyph:'JOB CENTRE',tag:'JOBS',x:8,z:-14,w:4.6,d:3.5,color:'#c1c9bb'});
  addPlace({id:'residential',name:'RESIDENTIAL BLOCK',type:'HOUSING',desc:'Kamar sewa dan apartemen untuk tidur, memulihkan energi, dan memperbaiki mood.',glyph:'HOUSING',tag:'RENT · SLEEP',x:3,z:15,w:6,d:4,color:'#cbb8a2'});
  addPlace({id:'training',name:'NORTHSIDE TRAINING GROUND',type:'CLUB FACILITY',desc:'Lapangan latihan dan akademi klub di Northside.',glyph:'TRAINING',tag:'CLUB',x:-27,z:19,w:7,d:5,color:'#b9c4ae',kind:'stadium'});
  addPlace({id:'northside-fc',name:'NORTHSIDE FC — NORTH END',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside FC. Tradisi supporter, matchday, mural, dan rivalitas lokal.',glyph:'NORTHSIDE FC',tag:'HOME GROUND',x:-27,z:-17,w:8,d:6,color:'#aeb8a6',kind:'stadium'});
  addPlace({id:'northside-athletic',name:'NORTHSIDE ATHLETIC — ATHLETIC PARK',type:'NORTHSIDE FOOTBALL CLUB',desc:'Kandang Northside Athletic. Klub dengan identitas berbeda dan derby satu distrik.',glyph:'ATHLETIC',tag:'HOME GROUND',x:-27,z:-5,w:7,d:5.5,color:'#c4b7a3',kind:'stadium'});
  addPlace({id:'eastbank-united',name:'EASTBANK UNITED — CANAL GROUND',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank United di tepi kanal dan kawasan industri.',glyph:'EASTBANK UTD',tag:'HOME GROUND',x:27,z:-17,w:8,d:6,color:'#b3b7ad',kind:'stadium'});
  addPlace({id:'eastbank-rovers',name:'EASTBANK ROVERS — RIVERSIDE',type:'EASTBANK FOOTBALL CLUB',desc:'Kandang Eastbank Rovers. Rival sekota dengan kultur supporter yang kuat.',glyph:'EASTBANK ROVERS',tag:'HOME GROUND',x:27,z:-5,w:7,d:5.5,color:'#c4b9a7',kind:'stadium'});
  addPlace({id:'northside-market',name:'NORTHSIDE HIGH STREET',type:'SHOPPING DISTRICT',desc:'Jalan komersial Northside: kios, tempat makan, dan titik kumpul supporter.',glyph:'NORTHSIDE',tag:'DISTRICT',x:-27,z:8,w:6,d:4,color:'#c2b6a2'});
  addPlace({id:'eastbank-market',name:'EASTBANK CANAL MARKET',type:'INDUSTRIAL MARKET',desc:'Pasar kanal Eastbank di antara gudang bata, jembatan, dan kawasan kerja.',glyph:'EASTBANK',tag:'DISTRICT',x:27,z:8,w:6,d:4,color:'#aeb9b1'});
 houses();fillCity();scenery();
}
function shirt(parent,x,z,color,scale=1){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const body=box(g,.52*scale,.68*scale,.12*scale,color,0,.82*scale,0);body.rotation.z=.02;box(g,.24*scale,.3*scale,.11*scale,color,-.34*scale,.94*scale,0,{ry:0});box(g,.24*scale,.3*scale,.11*scale,color,.34*scale,.94*scale,0);box(g,.18*scale,.035*scale,.125*scale,'#f2efdf',0,.87*scale,.066*scale,{shadow:false});return g;}

function makeCar(color,axis,lane,dir,t){const c=new THREE.Group();box(c,1.7,.42,.82,color,0,.4,0);box(c,.9,.34,.7,'#dfe6df',-.05,.76,0);box(c,.2,.16,.84,'#2a2d27',.2,.78,0,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,.25,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,-.25,{shadow:false});for(const [x,z] of [[-.55,.42],[.55,.42],[-.55,-.42],[.55,-.42]])box(c,.3,.3,.12,'#1b1c18',x,.2,z,{shadow:false});
  if(axis==='x'){c.position.set(t,0,lane);c.rotation.y=dir>0?0:Math.PI;}else{c.position.set(lane,0,t);c.rotation.y=dir>0?-Math.PI/2:Math.PI/2;}
  c.userData={axis,t,s:dir*(3.2+Math.abs(t%3)*.4)};cityGroup.add(c);cars.push(c);}
function createTraffic(){const cl=['#d7ff3f','#c4533f','#4a6fa5','#e8e2cc','#2f3a34','#d9a441'];[['x',1.2,1,-30],['x',-1.2,-1,30],['x',23.2,1,10],['x',20.8,-1,-20],['x',-20.8,1,40],['x',-23.2,-1,-40],['z',1.2,1,-20],['z',-1.2,-1,15],['z',25.2,1,-30],['z',22.8,-1,25],['z',-22.8,1,10],['z',-25.2,-1,-10]].forEach(([a,l,d,t],i)=>makeCar(cl[i%6],a,l,d,t));
  const sk=['#d5a07b','#b87d58','#8d5a3c'],sh=['#d7ff3f','#5875a6','#c76f51','#e0d9c7','#5d8c83','#f2efdf','#586a8c','#a64e3d'];
  for(let i=0;i<10;i++){const n=new THREE.Group(),cloth=material(`w-s-${i}`,sh[i%8]);box(n,.38,.46,.25,cloth,0,.78,0);box(n,.29,.29,.28,material(`w-k-${i}`,sk[i%3]),0,1.17,0);box(n,.31,.09,.3,'#30251f',0,1.34,-.01,{shadow:false});box(n,.13,.31,.14,'#34372f',-.1,.39,0);box(n,.13,.31,.14,'#34372f',.1,.39,0);box(n,.13,.32,.14,cloth,-.27,.78,0);box(n,.13,.32,.14,cloth,.27,.78,0);
    const ax=i%2?'x':'z',sd=(i%4<2?-1:1)*3.4,side=ax==='x'?[0,22,-22][i%3]+sd:[0,24,-24][i%3]+sd,c=(i*17%50)-25;if(ax==='x'){n.position.set(c,0,side);n.rotation.y=Math.PI/2;}else{n.position.set(side,0,c);}n.userData={axis:ax,c,t:0,r:6+i%4*2,s:.9+(i%3)*.25,p:i};cityGroup.add(n);walkers.push(n);}}
function liveCity(){
 const rnd=RND(4242),tr=[],cr=[[],[],[],[]],f1=[],f2=[],cab=[],cl=['#e8453c','#2f7fd1','#f2c230','#f5f5f0','#2fa86a','#8e5bd8'],cars=cl.map(()=>[]);
 const clear=(x,z,r)=>!places.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r)&&!solids.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r);
 const tree=(x,z)=>{const s=.8+rnd()*.5,k=rnd();tr.push([x,.7*s,z,.16*s,1.4*s,.16*s]);cr[k<.5?0:k<.8?1:k<.92?2:3].push([x,1.9*s,z,.85*s,.8*s,.85*s,rnd()*6]);if(k>.4){f1.push([x+.75,.2,z+.2,.28,.22,.28]);f2.push([x-.7,.2,z-.25,.26,.2,.26]);}};
 const park=(x,z,rot)=>{const i=Math.floor(rnd()*6);cars[i].push([x,.4,z,1,1,1,rot]);cab.push([x,.76,z,1,1,1,rot]);};
 HR.forEach(h=>{for(let x=-58;x<=58;x+=7){const xx=x+rnd()*2;if(VR.some(v=>Math.abs(xx-v)<5.5))continue;if(clear(xx,h-3.4,.4))tree(xx,h-3.4);}
  for(let x=-56;x<=56;x+=9+rnd()*8){if(VR.some(v=>Math.abs(x-v)<7))continue;const z=h+(rnd()<.5?-1:1)*2.6;if(rnd()<.6&&clear(x,z,.2))park(x,z,0);}});
 VR.forEach(v=>{for(let z=-58;z<=58;z+=7){const zz=z+rnd()*2;if(HR.some(h=>Math.abs(zz-h)<5.5))continue;if(clear(v-3.4,zz,.4))tree(v-3.4,zz);}
  for(let z=-56;z<=56;z+=10+rnd()*8){if(HR.some(h=>Math.abs(z-h)<7))continue;const x=v+(rnd()<.5?-1:1)*2.6;if(rnd()<.6&&clear(x,z,.2))park(x,z,Math.PI/2);}});
 inst(new THREE.CylinderGeometry(.12,.18,1,6),'#6b4a2f',tr,false);
 ['#4fb046','#3c9a3a','#f2b134','#ff9ec4'].forEach((c,i)=>inst(new THREE.IcosahedronGeometry(1,0),c,cr[i],false));
 inst(new THREE.IcosahedronGeometry(1,0),'#ff5d8f',f1,false);inst(new THREE.IcosahedronGeometry(1,0),'#ffd23f',f2,false);
 const bg=new THREE.BoxGeometry(1.7,.42,.82);cars.forEach((l,i)=>inst(bg,cl[i],l,false));inst(new THREE.BoxGeometry(.9,.34,.7),'#dfe9ee',cab.map(p=>[p[0],p[1],p[2],1,1,1,p[6]]),false);
}
function createBotWorkers(){createTraffic();try{liveCity();}catch(e){console.warn('liveCity',e);}
  const spots=['fttr','station','cafe','pub','hospital','press','police','garage','market'].map((id,i)=>{const p=places.find(q=>q.id===id);return p?[p.x+1.2,p.z+p.d/2+.6,['#d7ff3f','#5875a6','#c76f51','#e0d9c7','#5d8c83','#b6b4a8','#586a8c','#d7ff3f','#e0d9c7'][i]]:null;}).filter(Boolean);
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
  const rackHit=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.5,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001}));rackHit.position.set(0,1,0);rackHit.userData.action='merch';interiorGroup.add(rackHit);
  ROOMS.store={g:interiorGroup,hits:[rackHit],ground:groundInterior,name:'FUCK THE RULES STORE',spawn:[0,4.8]};buildRooms();
}
let groundInterior;
/* ===== INTERIOR ROOMS (rumah sakit, restoran/kafe/pub/minimarket, stasiun) ===== */
const ROOMS={};let currentRoom=null,enteredFrom=null,pendingAct=null,savedPick=null,seatCool=0;
const FOOD_ITEMS={chicken:{name:'Rajawali Chicken',cost:120,need:'hunger',value:30},fish:{name:'Corner Kitchen set',cost:180,need:'hunger',value:45},fruit:{name:'Market fruit pack',cost:80,need:'hunger',value:20},water:{name:'Bottled water',cost:35,need:'thirst',value:35},drink:{name:'High Street latte',cost:60,need:'thirst',value:15,extra:{energy:10}},sandwich:{name:'Corner deli sandwich',cost:95,need:'hunger',value:25},burger:{name:'Matchday burger',cost:140,need:'hunger',value:35,extra:{mood:4}},noodle:{name:'Ramen bowl',cost:110,need:'hunger',value:28},soda:{name:'Away-End soda',cost:55,need:'thirst',value:25,extra:{mood:6}},coffee:{name:'Flat white',cost:70,need:'thirst',value:12,extra:{energy:14}},snack:{name:'Snack pack',cost:45,need:'hunger',value:12}};
const MENU={kitchen:{icon:'🍳',title:'CORNER KITCHEN',items:['chicken','fish','noodle','water']},cafe:{icon:'☕',title:'HIGH STREET CAFÉ',items:['coffee','drink','sandwich','water']},pub:{icon:'⚽',title:'THE AWAY END',items:['burger','soda','chicken','water']},mart:{icon:'🛒',title:'MINIMARKET',items:['fruit','sandwich','snack','water']}};
const DEST={north:{name:'Northside',x:-30,z:-3.4},east:{name:'Eastbank',x:30,z:-3.4},central:{name:'Central City',x:-5,z:5.6}};
function showMenu(v){const m=MENU[v];showNotice(m.icon,m.title,'Pilih menu · saldo ₡'+money.toLocaleString('id-ID'),m.items.map((k,i)=>({label:FOOD_ITEMS[k].name+' · ₡'+FOOD_ITEMS[k].cost+' · '+(FOOD_ITEMS[k].need==='hunger'?'Hunger':'Thirst')+' +'+FOOD_ITEMS[k].value,acid:i===0,run:()=>handleAction('food:'+k)})));}
function fade(cb){let o=$('#fadeOv');if(!o){o=document.createElement('div');o.id='fadeOv';o.style.cssText='position:fixed;inset:0;background:#171914;opacity:0;pointer-events:none;transition:opacity .45s;z-index:30';document.body.appendChild(o);}o.style.opacity=1;o.style.pointerEvents='auto';setTimeout(()=>{cb();setTimeout(()=>{o.style.opacity=0;o.style.pointerEvents='none';},350);},480);}
function rideTo(key,fare=100){const d=DEST[key];if(!d)return;const here=player.position.x<-20?'north':player.position.x>20?'east':'central';if(here===key){toast('Kamu sudah berada di '+d.name);return;}if(money<fare){toast('Saldo virtual tidak cukup');return;}setMoney(money-fare);fade(()=>{if(isInside)exitRoom(true);player.position.set(d.x,0,d.z);destination=null;cameraTarget?.set(d.x,0,d.z);cameraFollow=true;camera.position.set(d.x+19,25,d.z+19);camera.lookAt(cameraTarget);toast('Tiba di '+d.name+' · −₡'+fare);});}
function floorTex(a,b,n,w,h){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),s=256/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){x.fillStyle=(i+j)%2?a:b;x.fillRect(i*s,j*s,s,s);}x.strokeStyle='rgba(0,0,0,.09)';for(let i=0;i<=n;i++){x.beginPath();x.moveTo(i*s,0);x.lineTo(i*s,256);x.stroke();x.beginPath();x.moveTo(0,i*s);x.lineTo(256,i*s);x.stroke();}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(w,h);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function shell(key,o){const g=new THREE.Group();g.visible=false;scene.add(g);const R={g,hits:[],ground:null,name:o.name,spawn:o.spawn||[0,5]};ROOMS[key]=R;
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(16,12),new THREE.MeshStandardMaterial({map:floorTex(o.f1,o.f2,4,4,3),roughness:.85}));fl.rotation.x=-Math.PI/2;fl.position.y=.01;fl.receiveShadow=true;g.add(fl);
 box(g,16.4,.2,12.4,'#171914',0,-.1,0,{shadow:false});box(g,16,2.8,.28,o.wall,0,1.3,-6);box(g,.28,2.8,12,o.wall,-8,1.3,0);box(g,.28,.9,12,o.wall,8,.35,0);
 box(g,16.1,.16,.34,'#171914',0,2.75,-6);box(g,.34,.16,12,'#171914',-8,2.75,0);box(g,16,.12,.3,'#d7ff3f',0,.12,-5.9,{shadow:false});box(g,.3,.12,12,'#d7ff3f',-7.9,.12,0,{shadow:false});box(g,2.4,.1,.5,'#d7ff3f',0,.04,5.8,{shadow:false});
 const gh=new THREE.Mesh(new THREE.PlaneGeometry(15,10),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,side:THREE.DoubleSide}));gh.rotation.x=-Math.PI/2;gh.position.y=.03;g.add(gh);R.ground=gh;hit(R,2.4,.6,.8,0,.3,5.8,'exit');return R;}
function hit(R,w,h,d,x,y,z,act,o={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));m.position.set(x,y,z);m.userData.roomAct=act;m.userData.dz=o.dz??1.8;m.userData.dx=o.dx||0;R.g.add(m);R.hits.push(m);return m;}
function person(g,x,z,shirt,rot,o={}){const p=new THREE.Group();p.position.set(x,o.sit?-.22:0,z);p.rotation.y=rot||0;g.add(p);const skin=['#d5a07b','#b87d58','#8d5a3c','#f1c7a0'][Math.floor(Math.abs(x*7+z*3))%4],pants=o.pants||'#2a2d28';
 box(p,.46,.56,.28,shirt,0,.88,0);box(p,.32,.32,.3,skin,0,1.33,0);box(p,.34,.11,.32,o.hair||'#2a211b',0,1.53,-.01,{shadow:false});box(p,.14,.4,.16,shirt,-.31,.88,0);box(p,.14,.4,.16,shirt,.31,.88,0);box(p,.15,.36,.17,pants,-.12,.4,0);box(p,.15,.36,.17,pants,.12,.4,0);if(o.apron)box(p,.4,.5,.05,o.apron,0,.84,.16);return p;}
function lamp(g,x,z,col){cylinder(g,.015,.015,1,'#222',x,2.3,z,4);cylinder(g,.08,.4,.3,col||'#171914',x,1.75,z,10);box(g,.3,.04,.3,material('lamp-glow','#fff3c0'),x,1.58,z,{shadow:false});}
function plant(g,x,z){cylinder(g,.25,.18,.4,'#2a2d28',x,.2,z,8);const s=new THREE.Mesh(new THREE.IcosahedronGeometry(.4,0),material('plant','#4d8a45'));s.position.set(x,.75,z);g.add(s);}
function bench(g,x,z,w=1.8){box(g,w,.12,.55,'#3a3d36',x,.45,z);box(g,w,.5,.1,'#2a2d28',x,.75,z-.25);box(g,.1,.45,.5,'#171914',x-w/2+.1,.22,z);box(g,.1,.45,.5,'#171914',x+w/2-.1,.22,z);}
function table(R,x,z){const g=R.g;cylinder(g,.05,.07,.7,'#2a2d28',x,.35,z,6);cylinder(g,.5,.5,.06,'#f2efdf',x,.72,z,16);[-1,1].forEach(s=>{box(g,.4,.08,.4,'#171914',x+s*.85,.45,z,{shadow:false});box(g,.06,.4,.4,'#171914',x+s*1.03,.68,z,{shadow:false});});hit(R,2,.9,1.2,x,.5,z,'sit',{dz:1.5});}
function buildHospital(){const R=shell('hospital',{name:'CENTRAL CITY HOSPITAL',f1:'#eef1ec',f2:'#e1e6df',wall:'#dde3dd'}),g=R.g;
 box(g,.4,.02,8.4,'#d7ff3f',0,.04,1.4,{shadow:false});box(g,5.6,1.2,.12,'#171914',.3,2.05,-5.8);sign(g,'HOSPITAL',.6,2.05,-5.72,4.2,.8,'#171914','#d7ff3f');box(g,.9,.26,.1,'#c93a3a',-1.9,2.05,-5.7);box(g,.26,.9,.1,'#c93a3a',-1.9,2.05,-5.7);
 box(g,4.4,1,1,'#171914',0,.55,-3.2);box(g,4.5,.1,1.1,'#d7ff3f',0,1.08,-3.2);box(g,.9,.55,.08,'#2a2d28',-1.2,1.5,-3.45);box(g,.8,.42,.05,'#9fd0d8',-1.2,1.52,-3.4,{shadow:false});person(g,0,-4.2,'#4fa3a5',0,{apron:'#f2efdf'});person(g,1.6,-4.2,'#4fa3a5',0,{apron:'#f2efdf'});
 sign(g,'RESEPSI · CHECK-UP ₡180',0,1.85,-2.6,3.4,.4,'#f2efdf','#171914');hit(R,4.4,1.6,1.4,0,.8,-3.2,'hosp-check');
 [-1.2,.6,2.4].forEach(z=>bench(g,-5.6,z,1.8));person(g,-5.6,.6,'#c4533f',Math.PI/2,{sit:true});person(g,-5.6,2.4,'#5875a6',Math.PI/2,{sit:true});plant(g,-7.2,3.8);plant(g,7.2,-5.2);
 [[5.4,-3.9],[5.4,-1.5]].forEach(([x,z])=>{box(g,2.4,.35,1.2,'#2a2d28',x,.3,z);box(g,2.3,.22,1.1,'#f2efdf',x,.52,z);box(g,.6,.14,.8,'#ffffff',x+.8,.7,z);box(g,1.5,.1,1.05,'#4fa3a5',x-.3,.66,z);box(g,.06,.2,1.2,'#171914',x+1.25,.9,z);hit(R,2.6,1,1.4,x,.5,z,'hosp-ward',{dz:1.9});});box(g,.05,1.7,3.6,'#9fd0d8',3.95,.95,-2.7);sign(g,'WARD · ISTIRAHAT ₡60',5.2,2.1,-5.72,3.2,.4,'#171914','#d7ff3f');
 box(g,1.3,2.1,.12,'#c93a3a',-5.8,1.1,-5.8);sign(g,'IGD / ER · ₡350',-5.8,2.35,-5.72,2.2,.34,'#c93a3a','#ffffff');hit(R,1.6,2,.8,-5.8,1,-5.4,'hosp-er',{dz:2.4});
 box(g,3,1,.9,'#171914',-5.2,.5,3.8);box(g,3.1,.1,1,'#d7ff3f',-5.2,1.05,3.8);box(g,3,1.6,.4,'#2a2d28',-5.2,.8,5.0);for(let j=0;j<3;j++)for(let k=0;k<6;k++)box(g,.3,.25,.25,['#f2efdf','#c93a3a','#4fa3a5'][(j+k)%3],-6.4+k*.48,.5+j*.42,4.75,{shadow:false});person(g,-5.2,4.7,'#4fa3a5',Math.PI,{apron:'#f2efdf'});sign(g,'APOTEK · P3K ₡90',-5.2,1.75,3.3,2.6,.36,'#f2efdf','#171914');hit(R,3,1.4,1.2,-5.2,.7,3.8,'hosp-kit',{dz:1.6});
 lamp(g,0,-1.5,'#171914');lamp(g,-5.6,.6,'#171914');lamp(g,5.2,-2.7,'#171914');}
function buildFood(key,o){const R=shell(key,{name:o.name,f1:o.f1,f2:o.f2,wall:o.wall}),g=R.g,v=o.variant;
 box(g,5,1,.12,'#171914',2.2,2.1,-5.8);sign(g,o.sign,2.2,2.1,-5.72,4.6,.8,'#171914','#d7ff3f');box(g,2.8,1.4,.1,'#171914',-5.2,1.85,-5.8);sign(g,'MENU',-5.2,2.35,-5.72,1.4,.3,'#171914','#d7ff3f');MENU[v].items.forEach((k,i)=>sign(g,FOOD_ITEMS[k].name.slice(0,15)+' ₡'+FOOD_ITEMS[k].cost,-5.2,2.02-i*.24,-5.72,2.5,.2,'#171914','#f2efdf'));
 if(v==='mart'){for(const x of [-4.2,-1.4,1.4]){box(g,.7,1.5,3.6,'#2a2d28',x,.8,-1.6);for(let j=0;j<4;j++)for(let k=0;k<6;k++)box(g,.5,.22,.4,['#c4533f','#d9a441','#2f8f5b','#2a5fa8','#f2efdf','#e86ab0'][(j+k)%6],x,.35+j*.35,-3.0+k*.55,{shadow:false});}
  box(g,.9,1.9,3,'#9fb8c4',7.1,1,-3.2);for(let j=0;j<5;j++)box(g,.7,.12,2.6,'#e4e6df',6.85,.4+j*.35,-3.2,{shadow:false});box(g,2.6,1,.9,'#171914',4.4,.5,3.1);box(g,2.7,.1,1,'#d7ff3f',4.4,1.05,3.1);box(g,.5,.4,.4,'#2a2d28',3.7,1.3,3.1);person(g,4.4,2.2,'#2f6b3a',0,{apron:'#f2efdf'});hit(R,2.8,1.4,1.2,4.4,.7,3.1,'menu:mart',{dz:1.5});sign(g,'KASIR · BELI',4.4,1.8,3.6,2.4,.34,'#d7ff3f','#171914');
  person(g,-2.8,-.2,'#c4533f',Math.PI/2);person(g,0,.4,'#5875a6',Math.PI);}
 else{box(g,7.4,1,1.1,'#171914',-.5,.55,-3.2);box(g,7.5,.1,1.2,'#d7ff3f',-.5,1.08,-3.2);for(let i=0;i<5;i++){cylinder(g,.05,.05,.55,'#2a2d28',-3+i*1.5,.3,-1.9,6);cylinder(g,.22,.22,.08,'#d7ff3f',-3+i*1.5,.62,-1.9,10);}
  box(g,6.6,.1,.4,'#5a4a3a',-.5,1.6,-5.55);for(let i=0;i<14;i++)box(g,.18,.4,.18,['#c4533f','#d9a441','#2f8f5b','#2a5fa8','#e8e2cc'][i%5],-3.4+i*.5,1.85,-5.5,{shadow:false});
  if(v==='kitchen'){box(g,2.4,.9,.9,'#a8aaa0',-2,.45,-4.7);[-2.5,-1.6].forEach(x=>cylinder(g,.22,.22,.3,'#444',x,1.05,-4.7,10));box(g,2.4,.6,1,'#8a8c82',-2,2.2,-4.8);person(g,-2,-4.0,'#ffffff',0,{apron:'#f2efdf'});person(g,1.6,-4.1,'#171914',0,{apron:'#d7ff3f'});}
  if(v==='cafe'){box(g,.9,.6,.5,'#c4533f',-1.8,1.4,-3.45);for(let i=0;i<4;i++)cylinder(g,.1,.08,.14,'#f2efdf',-.4+i*.35,1.17,-3.3,8);box(g,2.2,.55,.7,'#9fd0d8',2,1.4,-3.3,{shadow:false});person(g,0,-4.1,'#171914',0,{apron:'#c4533f'});}
  if(v==='pub'){box(g,2.8,1.6,.12,'#171914',4.8,1.9,-5.8);const tv=new THREE.Mesh(new THREE.PlaneGeometry(2.5,1.35),new THREE.MeshBasicMaterial({map:pitchTex()}));tv.position.set(4.8,1.9,-5.72);g.add(tv);hit(R,2.8,1.6,.6,4.8,1.9,-5.5,'tv',{dz:3.2});[['#d7ff3f',1],['#171914',1.35],['#d7ff3f',1.7]].forEach(([c,x])=>box(g,.28,1.1,.05,c,x-.3,1.6,-5.78,{shadow:false}));cylinder(g,.4,.4,.05,'#2a2d28',-5.2,1.0,-5.75,16).rotation.x=Math.PI/2;person(g,-.5,-4.1,'#2a5fa8',0,{apron:'#171914'});}
  hit(R,7.4,1.5,1.3,-.5,.8,-3.2,'menu:'+v,{dz:1.9});
  [[-5.2,1.2],[-2.4,1.9],[2.4,1.9],[5.2,1.2]].forEach(([x,z],i)=>{table(R,x,z);lamp(g,x,z,'#171914');if(i%2===0)person(g,x-.85,z,['#c4533f','#5875a6'][i/2],Math.PI/2,{sit:true});});}
 lamp(g,-2,-2,'#171914');lamp(g,2,-2,'#171914');plant(g,-7.2,4.4);plant(g,7.2,4.4);}
function boardTex(rows){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#101210';x.fillRect(0,0,512,256);x.fillStyle='#d7ff3f';x.font='bold 30px monospace';x.fillText('DESTINASI',20,44);x.font='bold 26px monospace';rows.forEach((r,i)=>{x.fillStyle=i%2?'#f2efdf':'#d7ff3f';x.fillText(r,20,100+i*46);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function buildStation(){const R=shell('station',{name:'CENTRAL STATION',f1:'#cfd0c8',f2:'#c3c5bc',wall:'#aeb4ae'}),g=R.g;
 sign(g,'CENTRAL STATION',0,2.5,-5.72,5,.42,'#171914','#d7ff3f');
 box(g,13,1.9,1.9,'#171914',0,1.2,-4.6);box(g,13.02,.18,1.92,'#d7ff3f',0,.85,-4.6);for(let i=0;i<8;i++)box(g,1.1,.6,.05,'#9fd0d8',-5.6+i*1.6,1.5,-3.63,{shadow:false});[-4,0,4].forEach(x=>box(g,1.2,1.5,.06,'#2a2d28',x,1.05,-3.62));hit(R,13,2,1.2,0,1.1,-4.4,'train',{dz:3});box(g,15,.05,.25,'#f2c200',0,.04,-2.85,{shadow:false});
 [-1.6,0,1.6].forEach(x=>{box(g,.5,.9,.7,'#2a2d28',x,.5,-1.5);box(g,.5,.08,.7,'#d7ff3f',x,.98,-1.5,{shadow:false});});
 box(g,3.2,1,.9,'#171914',-5.2,.55,-1.1);box(g,3.3,.1,1,'#d7ff3f',-5.2,1.08,-1.1);box(g,2.6,.7,.06,'#9fd0d8',-5.2,1.5,-1.35,{shadow:false});person(g,-5.2,-2.0,'#d7ff3f',0,{pants:'#171914'});sign(g,'LOKET TIKET',-5.2,2.0,-.5,2.6,.36,'#d7ff3f','#171914');hit(R,3.2,1.4,1.2,-5.2,.7,-1.1,'ticket',{dz:1.6});
 [3.4,4.6,5.8].forEach(x=>{box(g,.8,1.5,.6,'#171914',x,.8,.2);box(g,.55,.4,.05,'#d7ff3f',x,1.2,.52,{shadow:false});hit(R,.9,1.6,.8,x,.8,.2,'ticket',{dz:1.7});});sign(g,'MESIN TIKET',4.6,1.95,.8,2.4,.34,'#171914','#d7ff3f');
 box(g,3.2,1.7,.16,'#171914',-1,1.6,1.6);const bd=new THREE.Mesh(new THREE.PlaneGeometry(3,1.5),new THREE.MeshBasicMaterial({map:boardTex(['NORTHSIDE  PL.1 ₡100','EASTBANK   PL.1 ₡100','CENTRAL    PL.2 ₡100'])}));bd.position.set(-1,1.6,1.7);g.add(bd);cylinder(g,.05,.05,1.6,'#2a2d28',-2.4,.8,1.6,6);cylinder(g,.05,.05,1.6,'#2a2d28',.4,.8,1.6,6);hit(R,3.2,1.8,.6,-1,1.6,1.6,'board',{dz:1.8});
 bench(g,5.6,3.3,2.2);bench(g,2.4,3.6,2.2);person(g,5.2,3.3,'#c4533f',Math.PI,{sit:true});person(g,6.1,3.3,'#5875a6',Math.PI,{sit:true});person(g,2.4,3.6,'#e0d9c7',Math.PI,{sit:true});person(g,-1.6,3.0,'#d9a441',Math.PI*.8);
 box(g,2.6,1,.9,'#171914',-5.4,.55,3.7);box(g,2.7,.1,1,'#d7ff3f',-5.4,1.08,3.7);box(g,2.9,.1,1.3,'#c4533f',-5.4,2.0,3.7);[-1,1].forEach(s=>cylinder(g,.04,.04,2,'#2a2d28',-5.4+s*1.35,1,3.2,6));sign(g,'KIOSK',-5.4,1.6,3.25,1.6,.3,'#171914','#d7ff3f');person(g,-5.4,4.5,'#4a648b',Math.PI,{apron:'#f2efdf'});hit(R,2.8,1.6,1.4,-5.4,.8,3.7,'kiosk',{dz:1.8});
 [-4,0,4].forEach(x=>lamp(g,x,1,'#171914'));plant(g,7.2,.6);}
function buildRooms(){buildHospital();buildFood('kitchen',{name:'CORNER KITCHEN',sign:'CORNER KITCHEN',variant:'kitchen',f1:'#3a3d36',f2:'#33362f',wall:'#c9b79c'});buildFood('cafe',{name:'HIGH STREET CAFÉ',sign:'HIGH ST CAFÉ',variant:'cafe',f1:'#8a6a4a',f2:'#7a5c3e',wall:'#d8cbb4'});buildFood('pub',{name:'THE AWAY END',sign:'THE AWAY END',variant:'pub',f1:'#2a1f1a',f2:'#33261f',wall:'#5c3a30'});buildFood('mart',{name:'MINIMARKET',sign:'MINIMARKET',variant:'mart',f1:'#e4e6df',f2:'#d6d9d0',wall:'#cfd8c3'});buildStation();}
function enterRoom(key,from){const R=ROOMS[key];if(!R)return;enteredFrom=from||null;savedPick=[...pickables];isInside=true;cityGroup.visible=false;Object.values(ROOMS).forEach(r=>{r.g.visible=r===R;});currentRoom=key;groundInterior=R.ground;pickables.splice(0,pickables.length,...R.hits);player.position.set(R.spawn[0],0,R.spawn[1]);destination=null;pendingAct=null;const nm=(from&&from.name)||R.name;$('#interiorHud').hidden=false;$('#interiorName').textContent=nm;$('#districtName').textContent=nm;cameraFollow=true;cameraZoom=1.4;camera.zoom=cameraZoom;cameraTarget?.set(0,0,0);camera.position.set(15,22,15);camera.lookAt(0,0,0);camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Masuk: '+nm);}
function exitRoom(silent){const R=ROOMS[currentRoom];if(R)R.g.visible=false;isInside=false;cityGroup.visible=true;pickables.splice(0,pickables.length,...(savedPick||places.map(p=>p.hit)));const p=enteredFrom;if(!silent&&p)player.position.set(p.x,0,p.z+p.d/2+1.3);destination=null;pendingAct=null;currentRoom=null;$('#interiorHud').hidden=true;const x=player.position.x;$('#districtName').textContent=x<-20?'NORTHSIDE':x>20?'EASTBANK':'CENTRAL CITY';cameraZoom=1;camera.zoom=1;cameraTarget?.set(player.position.x,0,player.position.z);cameraFollow=true;camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');if(!silent)toast('Kembali ke jalan');}
function roomAction(a,x,z){
 if(a==='exit'){exitRoom();return;}
 if(a==='hosp-check'){handleAction('health:check');return;}if(a==='hosp-ward'){handleAction('health:ward');return;}if(a==='hosp-er'){handleAction('health:emergency');return;}if(a==='hosp-kit'){handleAction('health:kit');return;}
 if(a.startsWith('menu:')){showMenu(a.slice(5));return;}
 if(a==='sit'){const n=Date.now();if(n<seatCool){toast('Kamu baru saja duduk santai');return;}seatCool=n+20000;player.position.set(x,0,z+1.0);recoverNeed('mood',5);recoverNeed('energy',6);toast('Duduk santai · Mood +5 · Energy +6');return;}
 if(a==='tv'){openPhone('football');return;}
 if(a==='train'||a==='ticket'){showNotice('🚆','PLATFORM 1','Kereta siap berangkat. Tarif dibayar dengan uang virtual saat naik.',[{label:'NORTHSIDE · ₡100',acid:true,run:()=>rideTo('north')},{label:'EASTBANK · ₡100',acid:true,run:()=>rideTo('east')}]);return;}
 if(a==='board'){showNotice('▤','DESTINASI','Northside (2 klub) dan Eastbank (2 klub), Peron 1, ₡100. Kereta berangkat saat kamu naik; jadwal dinamis belum tersedia.');return;}
 if(a==='kiosk'){showNotice('🥤','KIOSK STASIUN','Air mineral untuk perjalanan.',[{label:'AIR MINERAL · ₡35',acid:true,run:()=>handleAction('food:water')}]);return;}}
function createPlayer(){
  player=new THREE.Group();scene.add(player);
  // Voxel / pixel-style citizen: square head, hair, torso, arms and legs.
  const skin=material('citizen-skin','#c98f68'), shirtMat=material('citizen-shirt','#d7ff3f'), trousers=material('citizen-trousers','#252a25'), shoes=material('citizen-shoes','#f2efdf');
  playerBody=box(player,.48,.58,.3,shirtMat,0,.88,0);playerBody.castShadow=true;
  playerHead=box(player,.34,.34,.32,skin,0,1.36,0);playerHead.castShadow=true;
  box(player,.36,.12,.34,material('citizen-hair','#29231f'),0,1.57,-.015,{shadow:false});
  box(player,.08,.055,.025,'#171914',-.075,1.38,.17,{shadow:false});box(player,.08,.055,.025,'#171914',.075,1.38,.17,{shadow:false});
  const armL=box(player,.14,.42,.16,shirtMat,-.33,.88,0),armR=box(player,.14,.42,.16,shirtMat,.33,.88,0);armL.rotation.z=-.12;armR.rotation.z=.12;
  box(player,.16,.38,.18,trousers,-.13,.4,0);box(player,.16,.38,.18,trousers,.13,.4,0);box(player,.18,.1,.25,shoes,-.13,.16,.035);box(player,.18,.1,.25,shoes,.13,.16,.035);
  box(player,.38,.07,.24,'#171914',0,.19,0,{shadow:false});
  ring=new THREE.Mesh(new THREE.RingGeometry(.4,.47,4),new THREE.MeshBasicMaterial({color:'#d7ff3f',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.035;player.add(ring);player.position.set(-6,0,5);applyProfile();
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
  const RM={hospital:'hospital',cafe:'kitchen',cafe2:'cafe',pub:'pub',market:'mart','northside-market':'mart','eastbank-market':'mart',station:'station'};if(RM[p.id]){enterRoom(RM[p.id],p);return;}
  if(p.id==='hq'){showNotice('◆','FTTR HEADQUARTERS','Kantor brand. Akses AI Agent dan panel admin hanya untuk staf terverifikasi dan belum tersambung di prototipe ini.',[{label:'BUKA WEBSITE FTTR',acid:true,run:()=>openShop(STORE_BASE,'FTTR')}]);return;}
  if(p.id==='jobcentre'){openPhone('jobs');return;}
  if(p.id==='residential'){openPhone('housing');return;}
  if(p.id==='training'){showNotice('⚽','TRAINING GROUND','Lapangan latihan klub. Latihan pemain dan akademi masuk tahap berikutnya.',[{label:'LIHAT FOOTBALL',acid:true,run:()=>openPhone('football')}]);return;}
  if(['stadium','northside-fc','northside-athletic','eastbank-united','eastbank-rovers'].includes(p.id)){showNotice('🎟',p.name,`Tiket matchday ₡60. Tiketmu: ${tickets}. Tiket dan jadwal masih tersimpan lokal.`,[{label:'BELI TIKET · ₡60',acid:true,run:()=>{if(money<60){toast('Saldo tidak cukup');return;}setMoney(money-60);tickets++;localStorage.setItem('fttr.city.tickets',tickets);recoverNeed('mood',8);toast('Tiket dibeli · Mood +8');}},{label:'LIHAT JADWAL',run:()=>openPhone('football')}]);return;}if(p.id==='hospital'){openPhone('health');return;}if(['cafe','cafe2','market','northside-market','eastbank-market'].includes(p.id)){openPhone('food');return;}if(['press','works','garage'].includes(p.id)){openPhone('jobs');return;}if(p.id==='fttr'){enterStore();return;}if(p.id==='station'){openPhone('travel');return;}if(p.id==='cafe'){openPhone('food');return;}if(p.id==='stadium'){openPhone('football');return;}if(p.id==='billboard'){showNotice('▤','CENTRAL BILLBOARD','Slot iklan ini sengaja dibiarkan kosong dalam prototype. Nantinya slot dapat dipesan brand, sponsor event, atau kampanye FTTR.');return;}if(p.id==='police'){showNotice('✚','CITY POLICE','Pos layanan polisi. Sistem patroli, pengamanan derby, laporan insiden, dan roleplay petugas direncanakan untuk versi multiplayer.');return;}if(p.id==='busstop'){openPhone('travel');return;}if(p.id==='pub'){showNotice('⚑','THE AWAY END','Tempat berkumpul supporter, menyusun perjalanan tandang, dan membaca berita klub. Fitur grup supporter akan ditambahkan di tahap berikutnya.');return;}showNotice('↗',p.name,p.desc);}
function enterStore(){enterRoom('store',places.find(p=>p.id==='fttr'));}
function exitStore(){exitRoom();}
function resize(){if(!renderer||!camera)return;const w=innerWidth,h=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.75);renderer.setSize(Math.max(1,Math.round(w*dpr)),Math.max(1,Math.round(h*dpr)),false);canvas.style.width='100%';canvas.style.height='100%';const aspect=w/h;const view=w<h?24:19;viewH=view;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();}
function applyZoom(v){if(window.FTTRArt?.on)return;cameraZoom=Math.max(.7,Math.min(2.6,v));}
function resetCamera(){cameraFollow=true;cameraZoom=1;camera.zoom=1;camera.updateProjectionMatrix();if(player)cameraTarget?.set(player.position.x,0,player.position.z);$('#cameraFollow')?.classList.add('active');toast('Kamera mengikuti karakter');}
function pointerDown(e){if(e.pointerType==='touch'&&e.isPrimary===false)return;dragState={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture?.(e.pointerId);}
function pointerMove(e){if(window.FTTRArt?.on)return;if(!dragState||dragState.id!==e.pointerId)return;const dx=e.clientX-dragState.lastX,dy=e.clientY-dragState.lastY;if(Math.hypot(e.clientX-dragState.x,e.clientY-dragState.y)>5)dragState.moved=true;if(dragState.moved){cameraFollow=false;$('#cameraFollow')?.classList.remove('active');const u=viewH/((innerHeight||1)*cameraZoom),k=.7071;cameraTarget ||= new THREE.Vector3(player?.position.x||0,0,player?.position.z||0);const nx=Math.max(-60,Math.min(60,cameraTarget.x-k*u*(dx+dy/.681))),nz=Math.max(-60,Math.min(60,cameraTarget.z+k*u*(dx-dy/.681)));const panX=nx-cameraTarget.x,panZ=nz-cameraTarget.z;cameraTarget.x+=panX;cameraTarget.z+=panZ;camera.position.x+=panX;camera.position.z+=panZ;camera.lookAt(cameraTarget); }dragState.lastX=e.clientX;dragState.lastY=e.clientY;}
function pointerUp(e){if(!dragState)return;const moved=dragState.moved;dragState=null;if(!moved)onPointer(e);}
function touchPinch(e){if(e.touches?.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDistance)applyZoom(cameraZoom*(d/pinchDistance));pinchDistance=d;e.preventDefault();}else pinchDistance=0;}
function worldFromEvent(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);}
function onPointer(e){if(window.FTTRArt?.on){window.FTTRArt.tap(e);return;}if($('#phoneOverlay').hidden===false||$('#mapOverlay').hidden===false||$('#noticeModal').hidden===false||$('#shopOverlay').hidden===false)return;worldFromEvent(e);const hits=raycaster.intersectObjects(pickables,true);if(hits.length){const obj=hits[0].object;const ra=obj.userData.roomAct;if(ra){const o=new THREE.Vector3();obj.getWorldPosition(o);destination=new THREE.Vector3(Math.max(-6.5,Math.min(6.5,o.x+(obj.userData.dx||0))),0,Math.max(-4.8,Math.min(4.8,o.z+(obj.userData.dz??1.8))));pendingAct={act:ra,x:o.x,z:o.z,dest:destination};return;}const id=obj.userData.placeId;if(id){const p=places.find(q=>q.id===id);if(p){destination=new THREE.Vector3(p.x,0,p.z+(p.d/2+1.3));openPlace(p);}return;}const aid=obj.userData.artId;if(aid&&window.FTTRArt){const q=window.FTTRArt.front(aid);if(q)destination=new THREE.Vector3(q.x,0,q.z);return;}if(obj.userData.action==='merch'){showNotice('✦','FTTR MERCH WALL','Pilih koleksi melalui katalog toko asli. Model rak ini menjadi titik interaksi merchandise di interior. ',[{label:'BUKA KATALOG',acid:true,run:openShop}]);return;}}
  const floor=raycaster.intersectObject(isInside?groundInterior:ground,false)[0];if(floor){const point=floor.point;destination=new THREE.Vector3(point.x,0,point.z);if(isInside){destination.x=Math.max(-6.5,Math.min(6.5,destination.x));destination.z=Math.max(-4.8,Math.min(4.8,destination.z));}else{destination.x=Math.max(-36,Math.min(36,destination.x));destination.z=Math.max(-36,Math.min(36,destination.z));}closePlace();}}
function makeBuildingProxyClick(p){return p;}
const keys=new Set();let joyVec=null;
function moveInput(dt){if(window.FTTRArt?.on)return;let ix=0,iz=0;if(keys.has('w')||keys.has('arrowup')){ix--;iz--;}if(keys.has('s')||keys.has('arrowdown')){ix++;iz++;}if(keys.has('a')||keys.has('arrowleft')){ix--;iz++;}if(keys.has('d')||keys.has('arrowright')){ix++;iz--;}if(joyVec){ix+=joyVec.x+joyVec.y;iz+=-joyVec.x+joyVec.y;}const m=Math.hypot(ix,iz);if(!m)return;destination=null;const speed=(isInside?3.2:3.6)*(needs.energy<20?.6:1)*Math.min(1,m);player.position.x+=ix/m*speed*dt;player.position.z+=iz/m*speed*dt;player.rotation.y=Math.atan2(ix,iz);playerBody.position.y=.88+Math.abs(Math.sin(performance.now()*.012))*.045;}
const blocked=(x,z)=>{if(isInside)return false;const f=p=>Math.abs(x-p.x)<p.w/2+.35&&Math.abs(z-p.z)<p.d/2+.35;return places.some(f)||solids.some(f);};
function update(dt){if(window.FTTRArt)window.FTTRArt.update(dt);const px0=player.position.x,pz0=player.position.z;moveInput(dt);if(destination){const dx=destination.x-player.position.x,dz=destination.z-player.position.z,dist=Math.hypot(dx,dz);if(dist<.12)destination=null;else{const speed=(isInside?3.2:3.6)*(needs.energy<20?.6:1);const step=Math.min(dist,speed*dt);player.position.x+=dx/dist*step;player.position.z+=dz/dist*step;player.rotation.y=Math.atan2(dx,dz);playerBody.position.y=.88+Math.abs(Math.sin(performance.now()*.012))*.045;}}
  if(blocked(player.position.x,player.position.z)){const nx=player.position.x,nz=player.position.z;if(!blocked(nx,pz0))player.position.z=pz0;else if(!blocked(px0,nz))player.position.x=px0;else{player.position.x=px0;player.position.z=pz0;if(destination&&Math.hypot(destination.x-px0,destination.z-pz0)>.5)destination=null;}}
  if(pendingAct){if(destination!==pendingAct.dest&&destination!==null){pendingAct=null;}else{const dd=Math.hypot(player.position.x-pendingAct.x,player.position.z-pendingAct.z);if(dd<2.5){const pa=pendingAct;pendingAct=null;destination=null;roomAction(pa.act,pa.x,pa.z);}else if(!destination)pendingAct=null;}}
  if(cameraFollow&&!window.FTTRArt?.on){cameraTarget ||= new THREE.Vector3();cameraTarget.lerp(new THREE.Vector3(player.position.x,0,player.position.z),Math.min(1,dt*2.6));const offset=isInside?new THREE.Vector3(13,19,13):new THREE.Vector3(19,25,19);camera.position.lerp(cameraTarget.clone().add(offset),Math.min(1,dt*2.6));camera.lookAt(cameraTarget);}
  if(sunLight&&cameraTarget){sunLight.target.position.set(cameraTarget.x,0,cameraTarget.z);sunLight.position.set(cameraTarget.x-12,24,cameraTarget.z+12);}
  if(camera&&!window.FTTRArt?.on&&Math.abs(camera.zoom-cameraZoom)>.001){camera.zoom+=(cameraZoom-camera.zoom)*Math.min(1,dt*9);camera.updateProjectionMatrix();}
  if(!isInside){cars.forEach(c=>{const u=c.userData;u.t+=u.s*dt;if(u.t>64)u.t=-64;if(u.t<-64)u.t=64;if(u.axis==='x')c.position.x=u.t;else c.position.z=u.t;});walkers.forEach(w=>{const u=w.userData;u.t+=u.s*dt;if(Math.abs(u.t)>u.r){u.s*=-1;u.t=Math.sign(u.t)*u.r;w.rotation.y+=Math.PI;}if(u.axis==='x')w.position.x=u.c+u.t;else w.position.z=u.c+u.t;w.position.y=Math.abs(Math.sin(performance.now()*.01+u.p))*.05;});}
  botWorkers.forEach(n=>{n.position.y=.018+Math.abs(Math.sin(performance.now()*.001+n.userData.phase))*.025;});
  if(performance.now()-lastNeedsTick>12000){lastNeedsTick=performance.now();needs.hunger=Math.max(0,needs.hunger-.35);needs.thirst=Math.max(0,needs.thirst-.55);needs.energy=Math.max(0,needs.energy-.22);if(needs.hunger<15||needs.thirst<12)needs.health=Math.max(1,needs.health-.4);needs.mood=Math.max(0,Math.min(100,needs.mood+((needs.hunger+needs.thirst+needs.health+needs.energy)/4-needs.mood)*.08));saveNeeds();updateNeedsUI();}
}
function animate(t){requestAnimationFrame(animate);const dt=Math.min(.05,(t-(lastTime||t))/1000||0);lastTime=t;if(player)update(dt);if(player){const nextDistrict=player.position.x < -20 ? 'Northside' : player.position.x > 20 ? 'Eastbank' : 'Central City';if(nextDistrict!==activeDistrict){activeDistrict=nextDistrict;$('#districtName').textContent=activeDistrict.toUpperCase();window.FTTROnline?.sendRoom(activeDistrict.toLowerCase().replace(/\s+/g,'-'));}if(t-lastOnlineSync>450){lastOnlineSync=t;window.FTTROnline?.sendPosition(player.position.x,player.position.z,activeDistrict);}}renderer.render(scene,camera);}
window.FTTRCity={name:()=>profile.name,toast:m=>toast(m),teleport(x,z){if(player){player.position.x=x;player.position.z=z;destination=null;}},clearRemotes(){remoteAvatars.forEach((g,id)=>{g.parent?.remove(g);});remoteAvatars.clear();},district:()=>activeDistrict,remoteMove(p){if(!THREE||!scene||p.district!==activeDistrict)return;let g=remoteAvatars.get(p.id);if(!g){g=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.48,3,6),new THREE.MeshStandardMaterial({color:'#536fbd'}));body.position.y=.45;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshStandardMaterial({color:'#d8a77c'}));head.position.y=.88;g.add(head);scene.add(g);remoteAvatars.set(p.id,g);}g.position.set(Number(p.x)||0,0,Number(p.z)||0);},removeRemote(id){const g=remoteAvatars.get(id);if(g){scene.remove(g);remoteAvatars.delete(id);}}};
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
  if(app==='travel'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL STATION</small><h3>Next stop: elsewhere.</h3><p>Jaringan antarkota akan menghubungkan Central City dengan kota klub.</p></div><div class="service-list">${row('🚆','Northside','Train ticket · ₡100 · 2 clubs','ticket:north','₡100')}${row('🚆','Eastbank','Train ticket · ₡100 · 2 clubs','ticket:east','₡100')}${row('🚆','Central City','Kembali ke pusat · ₡100','ticket:central','₡100')}${row('🚌','Away-day coach','Matchday supporter trip · ₡60','ticket:away','₡60')}${row('🎟','Central Ground','Automatic league match · ₡80','ticket:match','₡80')}</div><p class="fineprint">Tarif langsung dibayar dengan uang virtual lalu kamu tiba di tujuan. Mode solo: data tersimpan di perangkat ini.</p>`;return;}
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
function handleAction(action){if(action==='profile-save'){profile.name=clean($('#profName').value);profile.club=$('#profClub').value;saveProfile();applyProfile();window.FTTROnline?.hello?.();toast('Profil disimpan');renderPhone('profile');return;}
if(action.startsWith('style:')){const [,k,c]=action.split(':');profile[k]=c;saveProfile();applyProfile();renderPhone('profile');return;}
if(action==='house-rest'){if(Date.now()-lastRest<60000){toast('Tunggu sebentar sebelum istirahat lagi');return;}lastRest=Date.now();recoverNeed('energy',15);toast('Istirahat sebentar · Energy +15');renderPhone('housing');return;}
if(action==='house-sleep'&&homeActive()){const r=RENT[home.type];needs.energy=Math.min(100,needs.energy+r[3]);needs.mood=Math.min(100,needs.mood+r[4]);needs.hunger=Math.max(0,needs.hunger-10);needs.thirst=Math.max(0,needs.thirst-10);saveNeeds();updateNeedsUI();toast('Tidur nyenyak · Energy dan Mood naik');renderPhone('housing');return;}
if(action.startsWith('house-rent:')){const r=RENT[action.slice(11)];if(!r)return;if(money<r[2]){toast('Saldo tidak cukup');return;}setMoney(money-r[2]);home={type:action.slice(11),until:Date.now()+7*864e5};localStorage.setItem('fttr.city.home',JSON.stringify(home));toast('Sewa '+r[1]+' aktif 7 hari');renderPhone('housing');return;}if(action.startsWith('store-link:')){const l=STORE_LINKS.find(x=>x[0]===action.slice(11));if(l){closePhone();openShop(l[3].startsWith('http')?l[3]:STORE_BASE+l[3],l[2]);}return;}if(action.startsWith('football-')){const result=window.FTTRFootball?.handle(action);if(result?.msg)toast(result.msg);if(result?.rerender)renderPhone('football');return;}if(action==='send-chat'){const val=$('#chatDraft')?.value.trim();if(!val){toast('Tulis pesan terlebih dahulu');return;}const msg=document.createElement('div');msg.className='message';msg.innerHTML=`<b>YOU · JUST NOW</b>`;msg.append(document.createTextNode(val));$('#phoneBody').insertBefore(msg,$('#phoneBody').querySelector('.fineprint'));toast('Pesan tersimpan sebagai demo lokal');return;}
  if(action.startsWith('goto:')){const id=action.split(':')[1];const p=places.find(q=>q.id===id);closePhone();$('#mapOverlay').hidden=true;if(p){destination=new THREE.Vector3(p.x,0,p.z+(p.d/2+1.3));openPlace(p);}return;}
  if(action.startsWith('coming:')){showNotice('⇄',action.split(':')[1],'Kota ini sudah masuk dalam rancangan dunia, tetapi belum tersedia di prototype pertama.');return;}
  if(action.startsWith('food:')){const key=action.split(':')[1],items=FOOD_ITEMS;const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);recoverNeed(item.need,item.value);if(item.extra)Object.entries(item.extra).forEach(([k,v])=>recoverNeed(k,v));showNotice('＋','ORDER CONFIRMED',`${item.name}: ${item.need==='hunger'?'Hunger':'Thirst'} +${item.value}. Sisa saldo ₡${money.toLocaleString('id-ID')}.`);renderPhone('food');return;}
  if(action.startsWith('health:')){const key=action.split(':')[1],items={check:{name:'Hospital check-up',cost:180,health:45,energy:15},kit:{name:'First-aid kit',cost:90,health:20},rest:{name:'Rest at home',cost:0,energy:25},emergency:{name:'Emergency treatment',cost:350,health:100},ward:{name:'Ward bed rest',cost:60,health:25,energy:40}};const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);if(item.health===100)needs.health=100;else if(item.health)recoverNeed('health',item.health);if(item.energy)recoverNeed('energy',item.energy);saveNeeds();updateNeedsUI();showNotice('✚','HEALTH SERVICE',`${item.name} selesai. Health ${Math.round(needs.health)}/100 · Energy ${Math.round(needs.energy)}/100.`);renderPhone('health');return;}
  if(action.startsWith('ticket:')){const key=action.split(':')[1];if(key==='north'||key==='east'||key==='central'){closePhone();rideTo(key,100);return;}if(key==='away'){closePhone();rideTo('east',60);return;}if(key==='match'){if(money<80){toast('Saldo virtual tidak cukup');return;}setMoney(money-80);tickets++;localStorage.setItem('fttr.city.tickets',tickets);recoverNeed('mood',8);showNotice('🎟','TIKET PERTANDINGAN','Tiket Central Ground ditambahkan. Total tiketmu: '+tickets);return;}return;}
  if(action==='book-ride'){const sel=$('#rideDestination');const p=places.find(q=>q.id===sel?.value);if(money<100){toast('Saldo virtual tidak cukup');return;}setMoney(money-100);closePhone();if(p){destination=new THREE.Vector3(p.x,0,p.z+(p.d/2+1.3));openPlace(p);}toast('Ride booked · tarif demo ₡100');return;}
  if(action.startsWith('job:')){takeJob(action.split(':')[1]);return;}
  if(action==='enter-store'){closePhone();if(isInside){toast('Kamu sudah berada di dalam store');return;}const p=places.find(q=>q.id==='fttr');destination=new THREE.Vector3(p.x,0,p.z+2.5);openPlace(p);return;}
  if(action==='open-shop'){openShop();return;}if(action==='stadium'){closePhone();const p=places.find(q=>q.id==='stadium');destination=new THREE.Vector3(p.x,0,p.z+4);openPlace(p);return;}
}
function bindUI(){ $('#phoneBtn').onclick=()=>openPhone();$('#phoneClose').onclick=closePhone;$('#phoneHome').onclick=()=>renderPhone('home');$('#phoneHome').ondblclick=closePhone;$('#phoneOverlay').addEventListener('click',e=>{if(e.target.id==='phoneOverlay')closePhone();});$('#phoneBody').addEventListener('click',e=>{const app=e.target.closest('[data-open-app]');if(app){renderPhone(app.dataset.openApp);return;}const a=e.target.closest('[data-action]');if(a)handleAction(a.dataset.action);});$('#mapBtn').onclick=openMap;$('#zoomIn').onclick=()=>applyZoom(cameraZoom+.15);$('#zoomOut').onclick=()=>applyZoom(cameraZoom-.15);$('#cameraReset').onclick=resetCamera;$('#cameraFollow').onclick=()=>{cameraFollow=!cameraFollow;if(cameraFollow)resetCamera();else{$('#cameraFollow').classList.remove('active');toast('Kamera bebas · geser untuk melihat kota');}};$('#needsAction').onclick=()=>openPhone(needs.health<35?'health':'food');$('#mapClose').onclick=()=>$('#mapOverlay').hidden=true;$('#mapOverlay').addEventListener('click',e=>{if(e.target.id==='mapOverlay')$('#mapOverlay').hidden=true;});$('#mapList').addEventListener('click',e=>{const b=e.target.closest('[data-map-place]');if(!b)return;const p=places.find(q=>q.id===b.dataset.mapPlace);if(!p){$('#mapOverlay').hidden=true;showNotice('⇄',b.dataset.mapPlace,'Kota ini belum tersedia di prototype.');return;}$('#mapOverlay').hidden=true;destination=new THREE.Vector3(p.x,0,p.z+(p.d/2+1.3));openPlace(p);});$('#placeClose').onclick=closePlace;$('#placeEnter').onclick=enterPlace;$('#exitBuilding').onclick=exitStore;$('#shopClose').onclick=closeShop;$('#noticeClose').onclick=()=>$('#noticeModal').hidden=true;$('#noticeModal').addEventListener('click',e=>{if(e.target.id==='noticeModal')$('#noticeModal').hidden=true;});document.querySelectorAll('.quickbar [data-app]').forEach(b=>b.onclick=()=>{if(b.dataset.app==='map')openMap();else if(b.dataset.app==='phone')openPhone();else openPhone(b.dataset.app);});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePhone();closePlace();$('#mapOverlay').hidden=true;$('#noticeModal').hidden=true;closeShop();}});}
async function init(){setMoney(money);bindUI();try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');}catch(e){$('#toast').textContent='3D engine gagal dimuat. Periksa koneksi internet.';$('#toast').classList.add('show');return;}
  scene=new THREE.Scene();scene.background=new THREE.Color('#bde7f7');scene.fog=new THREE.Fog('#bde7f7',90,175);camera=new THREE.OrthographicCamera(-18,18,18,-18,.1,200);camera.position.set(19,25,19);cameraTarget=new THREE.Vector3(0,0,0);camera.lookAt(cameraTarget);raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();renderer=new THREE.WebGLRenderer({canvas,antialias:Math.min(devicePixelRatio||1,2)<1.8,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene.add(new THREE.HemisphereLight('#f9f4df','#717b68',2.1));sunLight=new THREE.DirectionalLight('#fff3d6',2.4);sunLight.position.set(-12,24,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-32;sunLight.shadow.camera.right=32;sunLight.shadow.camera.top=32;sunLight.shadow.camera.bottom=-32;sunLight.shadow.camera.far=120;scene.add(sunLight,sunLight.target);
  createCity();createBotWorkers();createInterior();createPlayer();resize();window.FTTRArt?.init({THREE,scene,camera,cityGroup,pickables,solids,surfaces:ART_SURF,canvas,getPlayer:()=>player,getViewH:()=>viewH,raycastFrom:e=>{worldFromEvent(e);return raycaster;},profile,toast,getFollow:()=>cameraFollow,setFollow:v=>{cameraFollow=v;},isInside:()=>isInside});canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{dragState=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();applyZoom(cameraZoom+(e.deltaY<0?.1:-.1));},{passive:false});canvas.addEventListener('touchmove',touchPinch,{passive:false});window.addEventListener('resize',resize);addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if('wasd'.includes(k)&&k.length===1||k.startsWith('arrow')){keys.add(k);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
  {const joy=$('#joy'),knob=$('#joyKnob');let act=null;const mv=e=>{const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}joyVec=m>.2?{x,y}:null;knob.style.transform=`translate(${x*30}px,${y*30}px)`;};const end=()=>{act=null;joyVec=null;knob.style.transform='';};joy.addEventListener('pointerdown',e=>{act=e.pointerId;joy.setPointerCapture(act);mv(e);});joy.addEventListener('pointermove',e=>{if(act===e.pointerId)mv(e);});joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
  applyProfile();updateNeedsUI();$('#cameraFollow')?.classList.add('active');requestAnimationFrame(animate);setTimeout(()=>$('.world-tip')?.classList.add('hide'),7000);toast('FTTR CITY siap · WASD/joystick untuk jalan');}
init();
