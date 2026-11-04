import {createJobs} from './city-jobs.js';
import {createFarm} from './city-farm.js';
import {warp as WARPF,warpRot as WARPR} from './city-warp.js';
import {createWorld} from './city-world.js';
const $ = s => document.querySelector(s);
const canvas = $('#world');
const moneyEl = $('#moneyVal');
let money = Number(localStorage.getItem('fttr.city.money') || 1250);
let THREE, WLD, renderer, scene, camera, raycaster, pointer, ground, cityGroup, interiorGroup, player, playerBody, playerHead, ring;
let isInside = false, selectedPlace = null, destination = null, lastTime = 0, toastTimer = 0;
let cameraTarget, cameraFollow=true, cameraZoom=1, dragState=null, pinchDistance=0;
const needs = (()=>{try{return {...{hunger:86,thirst:90,health:100,energy:95,mood:80},...JSON.parse(localStorage.getItem('fttr.city.needs')||'{}')}}catch{return {hunger:86,thirst:90,health:100,energy:95}}})();
const CITIZEN_S=.7,CAM_OFF=[15.5,28,15.5],CAM_SIN=28/Math.hypot(15.5,15.5,28),BASE_ZOOM=1.3,FHT=1.05;
let tapMarker,stuckT=0,JOBSYS,ride=null,FARM;
const houseSpots=[];
const doorPoint=(cx,cz,w,d,face)=>face==='N'?{x:cx,z:cz-d/2-1.2}:face==='E'?{x:cx+d/2+1.2,z:cz}:face==='W'?{x:cx-d/2-1.2,z:cz}:{x:cx,z:cz+d/2+1.2};
let gfxMode=(()=>{try{return localStorage.getItem('fttr.city.gfx')||'pixel';}catch{return 'pixel';}})();let viewH=24,sunLight;let lastNeedsTick=0, activeJob=null, jobTimer=null;
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
const EAST_X=206,NORTH_Z=-190;
/* Jaringan jalan (ruang grid; setelah selesai dibangun seluruh kota dilengkungkan oleh city-warp.js).
   Potongan jalan tidak lagi melintasi seluruh peta: tiga sudut kota dikosongkan untuk stadion. */
const H_ROADS=[{z:-44,x1:-24,x2:156},{z:-22,x1:-70.5,x2:72},{z:0,x1:-66,x2:206},{z:22,x1:-48,x2:108},{z:44,x1:-48,x2:206},{z:-88,x1:-66,x2:66},{z:-132,x1:-66,x2:66},{z:-176,x1:-66,x2:66},{z:-69.5,x1:-70.5,x2:-24},{z:-66,x1:156,x2:206},{z:-21,x1:156,x2:206},{z:-22,x1:76,x2:132}];
const V_ROADS=[{x:-48,z1:-22,z2:55.6},{x:-48,z1:-190,z2:-69.5},{x:-70.5,z1:-69.5,z2:-22},{x:-24,z1:-69.5,z2:55.6},{x:0,z1:-190,z2:55.6},{x:24,z1:-22,z2:55.6},{x:48,z1:-190,z2:55.6},{x:76,z1:-66,z2:55.6},{x:108,z1:-66,z2:55.6},{x:132,z1:-44,z2:0},{x:132,z1:0,z2:55.6},{x:156,z1:-66,z2:55.6},{x:206,z1:-66,z2:55.6}];
const RBS=[{x:76,z:0,r:8},{x:108,z:0,r:8},{x:156,z:0,r:8}];
const HR=[-44,-22,0,22,44],VR=[-48,-24,0,24,48];
/* potongan jalan setelah bundaran memotong: jalan berakhir di cincin */
const PH=[],PV=[];
H_ROADS.forEach(r=>{let lo=r.x1,e1=false;const cuts=RBS.filter(b=>Math.abs(b.z-r.z)<.1&&b.x>r.x1&&b.x<r.x2).sort((m,n)=>m.x-n.x);cuts.forEach(b=>{PH.push({z:r.z,x1:lo,x2:b.x-b.r,e1,e2:true});lo=b.x+b.r;e1=true;});PH.push({z:r.z,x1:lo,x2:r.x2,e1,e2:false});});
V_ROADS.forEach(r=>{let lo=r.z1,e1=false;const cuts=RBS.filter(b=>Math.abs(b.x-r.x)<.1&&b.z>r.z1&&b.z<r.z2).sort((m,n)=>m.z-n.z);cuts.forEach(b=>{PV.push({x:r.x,z1:lo,z2:b.z-b.r,e1,e2:true});lo=b.z+b.r;e1=true;});PV.push({x:r.x,z1:lo,z2:r.z2,e1,e2:false});});
const dSeg=(px,pz,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(px-(ax+dx*t),pz-(az+dz*t));};
/* jarak ke sumbu jalan terdekat (ruang grid); bundaran dihitung sebagai cincin */
const roadDist=(x,z,skip)=>{let d=99;for(const r of PH){if(r===skip)continue;const v=dSeg(x,z,r.x1,r.z,r.x2,r.z);if(v<d)d=v;}for(const r of PV){if(r===skip)continue;const v=dSeg(x,z,r.x,r.z1,r.x,r.z2);if(v<d)d=v;}for(const b of RBS){const v=Math.abs(Math.hypot(x-b.x,z-b.z)-b.r);if(v<d)d=v;}return d;};
const nearRing=(x,z,m=0)=>RBS.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+3.2+m);
/* apakah persegi (grid) menyentuh jalan? cek sudut + titik tengah sisi + pusat */
const rectOnRoad=(cx,cz,w,d,m=.6)=>{const pts=[[0,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]];return pts.some(([a,b])=>{const x=cx+a*w/2,z=cz+b*d/2;return roadDist(x,z)<3+m||nearRing(x,z);});};
const inRB=(x,z,m=0)=>RBS.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+2.9+m&&Math.hypot(x-b.x,z-b.z)>b.r-2.9-m);
const roadWarp=(x,z)=>WARPF(x,z);
const solids=[],LOT={A:-4.6,B:17.4,C:-26.6,E:39.4,F:-48.6};
const zs0=x=>V_ROADS.filter(r=>r.x===x).reduce((m,r)=>Math.min(m,r.z1),99);
const faceRot=f=>f==='N'?Math.PI:f==='E'?Math.PI/2:f==='W'?-Math.PI/2:0;
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
 const g=new THREE.Group();g.position.set(o.x,0,z);g.rotation.y=faceRot(o.face);cityGroup.add(g);
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
function addPlace(o0){const L=LAY[o0.id]||{},o={...o0,...L};if(L.row&&L.z===undefined)delete o.z;
 if(!['billboard','busstop'].includes(o.id)){const q=v=>Math.round(v*1.25*2)/2;o.w=q(o.w);o.d=q(o.d);}const {id,name,type,desc,glyph,tag,x,w,d,hours='OPEN · ALL DAY',kind='building'}=o;const r=mk(o),z=r.z,g=r.g;
 const hit=new THREE.Mesh(new THREE.BoxGeometry(w+.8,r.H+.8,d+.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0.001,depthWrite:false}));hit.position.set(0,r.H/2+.2,0);hit.userData.placeId=id;g.add(hit);pickables.push(hit);
 const p={id,name,type,desc,glyph,tag,x,z,w,d,hours,kind,group:g,hit,rot0:faceRot(o.face)};places.push(p);return p;}
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
 const asph='#4a5262',walk='#ece4d0';
 const cutIv=(iv,lo,hi)=>{const o=[];iv.forEach(([a,b])=>{if(hi<=a||lo>=b){o.push([a,b]);return;}if(lo>a)o.push([a,lo]);if(hi<b)o.push([hi,b]);});return o;};
 const crossV=z=>V_ROADS.filter(r=>z>=r.z1-.1&&z<=r.z2+.1),crossH=x=>H_ROADS.filter(r=>x>=r.x1-.1&&x<=r.x2+.1);
 const nearRBp=(x,z)=>RBS.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+4.4);
 const lamps=[],dx=[],zb=[];
 // aspal
 PH.forEach(p=>{for(let x=p.x1;x<p.x2-.01;x+=3){const len=Math.min(3,p.x2-x);box(cityGroup,len+.05,.06,6,asph,x+len/2,0,p.z,{shadow:false});}});
 PV.forEach(p=>{for(let z=p.z1;z<p.z2-.01;z+=3){const len=Math.min(3,p.z2-z);box(cityGroup,6,.07,len+.05,asph,p.x,0,z+len/2,{shadow:false});}});
 // trotoar, marka tengah, lampu
 PH.forEach(p=>{let iv=[[p.x1+(p.e1?3.9:0),p.x2-(p.e2?3.9:0)]];crossV(p.z).forEach(v=>{if(v.x>p.x1&&v.x<p.x2)iv=cutIv(iv,v.x-3.8,v.x+3.8);});
  iv.forEach(([a,b])=>{if(b<=a+.3)return;[-1,1].forEach(sd=>{for(let x=a;x<b-.01;x+=3){const len=Math.min(3,b-x);box(cityGroup,len+.05,.1,.8,walk,x+len/2,.04,p.z+sd*3.4,{shadow:false});}});});
  for(let x=p.x1+2;x<p.x2;x+=4)if(!crossV(p.z).some(v=>Math.abs(x-v.x)<4.4)&&!nearRBp(x,p.z))dx.push([x,.06,p.z,1.6,.02,.14]);
  for(let x=p.x1+7;x<p.x2-3;x+=14)if(!crossV(p.z).some(v=>Math.abs(x-v.x)<5)&&!nearRBp(x,p.z))lamps.push([x,0,p.z+3.5]);});
 PV.forEach(p=>{let iv=[[p.z1+(p.e1?3.9:0),p.z2-(p.e2?3.9:0)]];crossH(p.x).forEach(h=>{if(h.z>p.z1&&h.z<p.z2)iv=cutIv(iv,h.z-3.8,h.z+3.8);});
  iv.forEach(([a,b])=>{if(b<=a+.3)return;[-1,1].forEach(sd=>{for(let z=a;z<b-.01;z+=3){const len=Math.min(3,b-z);box(cityGroup,.8,.1,len+.05,walk,p.x+sd*3.4,.04,z+len/2,{shadow:false});}});});
  for(let z=p.z1+2;z<p.z2;z+=4)if(!crossH(p.x).some(h=>Math.abs(z-h.z)<4.4)&&!nearRBp(p.x,z))dx.push([p.x,.07,z,.14,.02,1.6]);
  for(let z=p.z1+7;z<p.z2-3;z+=14)if(!crossH(p.x).some(h=>Math.abs(z-h.z)<5)&&!nearRBp(p.x,z))lamps.push([p.x+3.5,0,z]);});
 // zebra di tiap lengan simpang
 const inH=(x,z)=>PH.some(p=>Math.abs(z-p.z)<1&&x>=p.x1-.5&&x<=p.x2+.5),inV=(x,z)=>PV.some(p=>Math.abs(x-p.x)<1&&z>=p.z1-.5&&z<=p.z2+.5);
 H_ROADS.forEach(h=>V_ROADS.forEach(v=>{if(v.x<h.x1||v.x>h.x2||h.z<v.z1||h.z>v.z2||RBS.some(b=>Math.abs(b.x-v.x)<.1&&Math.abs(b.z-h.z)<.1))return;
  for(let k=-3;k<=3;k++)[-1,1].forEach(s2=>{if(inV(v.x,h.z+s2*4.6)&&h.z>-70)zb.push([v.x+k*.8,.075,h.z+s2*4.6,.5,.02,1.2]);if(inH(v.x+s2*4.6,h.z)&&h.z>-70)zb.push([v.x+s2*4.6,.075,h.z+k*.8,1.2,.02,.5]);});}));
 // bundaran
 RBS.forEach(b=>{const N=34,len=2*Math.PI*b.r/N+.3;
  for(let k=0;k<N;k++){const a=(k+.5)/N*Math.PI*2,x=b.x+Math.cos(a)*b.r,z=b.z+Math.sin(a)*b.r,ry=Math.atan2(-Math.cos(a),-Math.sin(a));box(cityGroup,len,.065,5.8,asph,x,0,z,{ry,shadow:false});
   const sx=b.x+Math.cos(a)*(b.r+3.5),sz=b.z+Math.sin(a)*(b.r+3.5),slen=2*Math.PI*(b.r+3.5)/N+.3;
   let pd=99;for(const r of PH)pd=Math.min(pd,dSeg(sx,sz,r.x1,r.z,r.x2,r.z));for(const r of PV)pd=Math.min(pd,dSeg(sx,sz,r.x,r.z1,r.x,r.z2));
   if(pd>4.6)box(cityGroup,slen,.1,.8,walk,sx,.04,sz,{ry,shadow:false});
   const ix=b.x+Math.cos(a)*(b.r-3.2),iz=b.z+Math.sin(a)*(b.r-3.2);box(cityGroup,len*.7,.14,.5,'#bfbcae',ix,.07,iz,{ry,shadow:false});}
  cylinder(cityGroup,b.r-3.4,b.r-3.4,.12,'#86d65a',b.x,.06,b.z,24);cylinder(cityGroup,1.7,1.9,.5,'#bfbcae',b.x,.3,b.z,18);cylinder(cityGroup,1.35,1.35,.52,'#3aa6e6',b.x,.3,b.z,18);cylinder(cityGroup,.18,.24,1.5,'#bfbcae',b.x,1,b.z,8);
  [0,2.1,4.2].forEach((a2,i)=>{const tx=b.x+Math.cos(a2+.6)*2.6,tz=b.z+Math.sin(a2+.6)*2.6;cylinder(cityGroup,.1,.16,1.2,'#6b5239',tx,.7,tz,6);const c=new THREE.Mesh(new THREE.IcosahedronGeometry(.95,1),material('rb-tree'+i,'#4fb84a'));c.position.set(tx,1.9,tz);c.castShadow=true;cityGroup.add(c);});});
 const B=new THREE.BoxGeometry(1,1,1);inst(B,'#ffeaa0',dx);inst(B,'#ffffff',zb);
 inst(new THREE.CylinderGeometry(.05,.07,1,6),'#3a3d36',lamps.map(p=>[p[0],1.3,p[2],1,2.6,1]));inst(new THREE.SphereGeometry(.18,8,6),'#ffe9a8',lamps.map(p=>[p[0],2.7,p[2]]));
}
const SHOPS=[['BAKERY','#a64e3d','#ffffff'],['LAUNDRY','#2d4f7a','#ffffff'],['BARBER','#171914','#d7ff3f'],['PHARMACY','#2f6b3a','#ffffff'],['KIOSK','#d9a441','#171914'],['BOOKS','#5a3b2a','#f4e3c8'],['TAILOR','#6b4f6e','#ffffff'],['MOTOR','#2a2d28','#d7ff3f'],['RAMEN','#c4533f','#ffffff'],['COFFEE','#3a2a1f','#f4e3c8'],['SPORTS','#2a5fa8','#ffffff'],['VINYL','#171914','#e8e2cc']];
function river(){WLD.canal();
 const br=V_ROADS.filter(r=>r.z1<30&&r.z2>30&&r.x<56).map(r=>r.x).sort((m,n)=>m-n),seg=[];let p=-66;br.forEach(c=>{seg.push([p,c-3.8]);p=c+3.8;});seg.push([p,56]);
 seg.forEach(([a,b])=>[-1,1].forEach(sd=>{for(let x=a;x<b-.01;x+=3){const len=Math.min(3,b-x);box(cityGroup,len+.05,.25,.45,'#8f8f80',x+len/2,.1,30+sd*2.4,{shadow:false});}}));
 br.forEach(x=>[-1,1].forEach(sd=>box(cityGroup,.14,.55,4.6,'#5a5d55',x+sd*3.9,.35,30,{shadow:false})));}
function fillCity(){
 const rnd=RND(77),RES=[[-19,-5,-40.4,-32.6],[-70,70,-18.4,-10.4],[8,16,6.3,11.3],[-10.9,-5.1,8.5,9.5],[-11.6,-8.4,3.2,4.6],[-66,70,27.5,32.5],[55.5,69,24.5,35.5]].concat(ART_RES,WLD.reserved);
  const W=['#ffd98a','#ff9f8a','#8fd3f4','#fff0a8','#ff8f7a','#a6e58a','#c4b0ff','#ffbf5e'],RC=['#e5483b','#d9582f','#2a8bd8','#f2a824'];let n=100;
 const fits=(x,z,w,d)=>!places.some(p=>Math.abs(x-p.x)<(w+p.w)/2+.7&&Math.abs(z-p.z)<(d+p.d)/2+.7)&&!solids.some(p=>Math.abs(x-p.x)<(w+p.w)/2+.3&&Math.abs(z-p.z)<(d+p.d)/2+.3)&&!RES.some(r=>x+w/2+.4>r[0]&&x-w/2-.4<r[1]&&z+d/2+.3>r[2]&&z-d/2-.3<r[3])&&!rectOnRoad(x,z,w,d);
 const make=(cx,cz,w,d,face,kind,k)=>{n++;if(!(kind==='shop'&&cx>28))houseSpots.push(doorPoint(cx,cz,w,d,face));const sw=face==='E'||face==='W',fx=sw?d:w,fz=sw?w:d,o={id:'f'+n,x:cx,z:cz,face,w,d,lite:true,wall:W[n%8]};
   if(kind==='house')Object.assign(o,{fl:1+(n%2),gfH:1.4,roof:RC[n%4],roofType:'gable',rh:1.2,brick:n%2===0});
   else if(kind==='shop'&&cx>28)Object.assign(o,{fl:1,gfH:2.2,roofType:'gable',rh:.9,roof:'#6b6e66',wall:'#aaa99f',glyph:'WAREHOUSE',sb:'#2a2d28',sf:'#d7ff3f'});
   else if(kind==='shop'){const s=SHOPS[n%12];Object.assign(o,{fl:2,glyph:s[0],sb:s[1],sf:s[2],awning:s[1],brick:n%3===0});}
   else{
    /* menara/apartemen: tinggi dibatasi agar bayangan visualnya tidak menutupi jalan di belakangnya (kamera melihat dari tenggara) */
    const apt=kind==='apt',tw=Math.max(w,3.8),td=Math.max(d,3.4),ex=sw?td:tw,ez=sw?tw:td,nE=cz-ez/2,wE=cx-ex/2;
    const hmax=behindMax(wE,nE);
    const ctr=Math.abs(cx)<26&&cz>-40&&cz<50,want=apt?3+(n%3):5+(n*7)%4+(ctr?(n%3===0?4:n%7===0?2:0):0),fl=Math.max(2,Math.min(want,Math.floor((hmax-3.2)/FHT)));
    const tr=WLD.tower({x:cx,z:cz,w:tw,d:td,fl,face,style:WLD.styleFor(cx,n),seed:n,kind:apt?'apt':'office'});solids.push({x:cx,z:tr.z,w:ex+.6,d:ez+.6});return;}
   const r=mk(o);solids.push({x:cx,z:r.z,w:fx+.6,d:fz+.6});};
 const behindMax=(x,z)=>{for(let q=2;q<=34;q+=2)for(const f of [0,.25,.5,.75,1]){const a=q*f,b=q-a;if(roadDist(x-a,z-b)<3.2||nearRing(x-a,z-b))return q/1.1;}return 99;};
 const dims=()=>{const k=rnd(),kind=k<.3?'house':k<.55?'shop':k<.8?'apt':'office';const q=v=>Math.round(v*2)/2;return {k,kind,w:q(kind==='house'?4.6+rnd()*1:4.5+rnd()*2.5),d:q(kind==='house'?3.8+rnd()*.8:4+rnd()*1.4)};};
 /* sisi yang menghadap kamera (selatan/timur jalan) hanya boleh bangunan rendah; menara hanya di sisi belakang jalan */
 const lowIfFront=(D0,front)=>front&&(D0.kind==='office'||D0.kind==='apt')?(D0.k<.675?'house':'shop'):D0.kind;
 const cutIv=(iv,lo,hi)=>{const o=[];iv.forEach(([a,b])=>{if(hi<=a||lo>=b){o.push([a,b]);return;}if(lo>a)o.push([a,lo]);if(hi<b)o.push([hi,b]);});return o;};
 const ivH=r=>{let iv=[[Math.max(r.x1,-63),Math.min(r.x2,203)]];V_ROADS.filter(v=>r.z>=v.z1-.1&&r.z<=v.z2+.1&&v.x>r.x1&&v.x<r.x2).forEach(v=>{iv=cutIv(iv,v.x-3.9,v.x+3.9);});RBS.filter(b=>Math.abs(b.z-r.z)<.1).forEach(b=>{iv=cutIv(iv,b.x-b.r-4,b.x+b.r+4);});return iv.filter(([a,b])=>b-a>4.4);};
 const ivV=r=>{let iv=[[Math.max(r.z1,-63),Math.min(r.z2,54.4)]];H_ROADS.filter(h=>r.x>=h.x1-.1&&r.x<=h.x2+.1&&h.z>=r.z1-.1&&h.z<=r.z2+.1).forEach(h=>{iv=cutIv(iv,h.z-3.9,h.z+3.9);});RBS.filter(b=>Math.abs(b.x-r.x)<.1).forEach(b=>{iv=cutIv(iv,b.z-b.r-4,b.z+b.r+4);});return iv.filter(([a,b])=>b-a>4.4);};
 // deretan bangunan menghadap jalan: barat-timur lalu utara-selatan (hanya di kota; wilayah tani dikerjakan modul sendiri)
 H_ROADS.filter(r=>r.z>-70).forEach(h=>ivH(h).forEach(([a,b])=>[-1,1].forEach(side=>[4.6,10.9].forEach(base=>{let x=a+rnd()*1.2,guard=0;while(x<b-4.4&&guard++<18){const D0=dims(),w=D0.w,d=D0.d,k=D0.k,kind=lowIfFront(D0,side>0),cx=x+w/2;if(cx+w/2>b)break;const cz=h.z+side*(base+d/2);
  if(fits(cx,cz,w,d)){make(cx,cz,w,d,side>0?'N':'S',kind,k);x=cx+w/2+.5;}else x+=1.4;}}))));
 V_ROADS.forEach(v=>ivV(v).forEach(([a,b])=>[-1,1].forEach(s2=>[4.6,10.9].forEach(base=>{let z=a+rnd()*1.2,guard=0;while(z<b-4.4&&guard++<18){const D0=dims(),w=D0.w,d=D0.d,k=D0.k,kind=lowIfFront(D0,s2>0),cz=z+w/2;if(cz+w/2>b)break;const cx=v.x+s2*(base+d/2);
  if(fits(cx,cz,d,w)){make(cx,cz,w,d,s2>0?'W':'E',kind,k);z=cz+w/2+.5;}else z+=1.4;}}))));
}
function houses(){
 const W=['#ffe3b3','#ffd0b0','#d4f0c4','#fff0d0','#ffd6e0'],RC=['#e5483b','#2f9a6a','#2a74c8','#f2a824'];let n=0;
 const xs=[-58,-41,-36,-31,-17,-12,-7,7,12,17,31,36,41,58];
 const OFF={'E-12':{id:'office-cleaner',name:'DINAS KEBERSIHAN',glyph:'KEBERSIHAN',sb:'#2f9a6a',desc:'Kantor Dinas Kebersihan Kota. Petugas mengambil sapu dan kantong sampah di sini sebelum membersihkan jalanan.'},'E-41':{id:'office-garden',name:'DINAS PERTAMANAN',glyph:'PERTAMANAN',sb:'#59b84a',desc:'Kantor Dinas Pertamanan. Tukang taman mengambil penyiram dan peralatan tanam di sini.'},'E31':{id:'office-medic',name:'POS AMBULANS 118',glyph:'AMBULANS',sb:'#e5483b',desc:'Pos ambulans gawat darurat. Paramedis mengambil tas P3K dan kunci ambulans di sini.'},'E58':{id:'office-bus',name:'PO BUS KOTA',glyph:'BUS KOTA',sb:'#f2a824',desc:'Kantor operator bus kota. Sopir mengambil mesin tiket dan kunci bus di sini.'},'F41':{id:'office-photo',name:'STUDIO FOTO MATCHDAY',glyph:'STUDIO FOTO',sb:'#2a74c8',desc:'Studio foto dan peminjaman kamera untuk fotografer matchday.'}};
 const put=(x,row)=>{n++;const od=OFF[row+x];if(od){addPlace({id:od.id,name:od.name,type:'KANTOR PEKERJAAN',desc:od.desc,glyph:od.glyph,tag:'KANTOR',x,row,w:4.4,d:3.4,fl:2,wall:'#e8f1f6',sb:od.sb,sf:'#ffffff',awning:od.sb});return;}const o={id:'h'+n,x,row,w:4.5,d:4.1,fl:1+(n%2),gfH:1.4,wall:W[n%5],roof:RC[n%4],roofType:'gable',rh:1.2,brick:n%2===0};const r=mk(o);solids.push({x,z:r.z,w:o.w+.4,d:o.d+.4});houseSpots.push(doorPoint(x,r.z,o.w,o.d,'S'));};
 xs.forEach(x=>{put(x,'E');if(x>-27)put(x,'F');});[-57,57].forEach(x=>{if(x<0)put(x,'B');put(x,'C');});
}
const FARM_ROADS_NEAR=(x,z)=>Math.abs(x)<52&&(Math.abs(x+48)<4.8||Math.abs(x)<4.8||Math.abs(x-48)<4.8||[-88,-132,-176].some(h=>Math.abs(z-h)<4.8));
function scenery(){
 const rnd=RND(5),tr=[],cr=[],cr2=[];
 const free=(x,z)=>!places.some(p=>Math.abs(x-p.x)<p.w/2+1.5&&Math.abs(z-p.z)<p.d/2+1.5)&&!solids.some(p=>Math.abs(x-p.x)<p.w/2+1.2&&Math.abs(z-p.z)<p.d/2+1.2);
 const NOTREE=[[-19,-5,-40.4,-32.6],[7,17,5.5,12],[-70,70,-18.4,-10.4],[55,69,24,36],[-15,-3,8,10]].concat(ART_RES,WLD.reserved);
 /* BUG FIX: pohon sebelumnya bisa muncul di tengah jalan utara-selatan. Semua pohon sekarang lewat onRoad() */
 const onRoad=(x,z)=>roadDist(x,z)<4.8||nearRing(x,z,1)||(z<-66&&FARM_ROADS_NEAR(x,z));
 const ok=(x,z)=>!onRoad(x,z)&&free(x,z)&&z<53&&!(Math.abs(z-30)<4.5&&x<66)&&!NOTREE.some(r=>x>r[0]-1&&x<r[1]+1&&z>r[2]-1&&z<r[3]+1);
 const addTree=(x,z)=>{const s=.85+rnd()*.6;tr.push([x,.6*s,z,s,1.2*s,s]);(rnd()>.5?cr:cr2).push([x,1.9*s,z,1.1*s,1.15*s,1.1*s,rnd()*3]);};
 [[-62,62,9,14,46],[-62,62,-12.5,-8.5,22],[-62,62,-36,-31,26],[-62,62,50,54.5,14],[-62,62,-63,-52,10],[-62,62,35,38,10]].forEach(([x1,x2,z1,z2,n])=>{for(let i=0;i<n;i++){const x=x1+rnd()*(x2-x1),z=z1+rnd()*(z2-z1);if(ok(x,z))addTree(x,z);}});
 for(let i=0,c=0;i<3600&&c<260;i++){const x=-62+rnd()*252,z=-62+rnd()*114;if(ok(x,z)){addTree(x,z);c++;}}
 for(let x=-62;x<=54;x+=5){[26.5,33.5].forEach(zz=>{if(!onRoad(x,zz)&&free(x,zz))addTree(x,zz);});}
 inst(new THREE.CylinderGeometry(.12,.18,1,6),'#6b5239',tr,true);inst(new THREE.IcosahedronGeometry(1,1),'#4fb84a',cr,true);inst(new THREE.IcosahedronGeometry(1,1),'#3ea146',cr2,true);
 // plaza air mancur (dipindah ke utara agar jalur rel bisa berkelok)
 const fx=-12,fz=-36.5;box(cityGroup,13,.06,6.5,'#c9c4b0',fx,.04,fz-.3,{shadow:false});cylinder(cityGroup,1.9,2,.4,'#bfbcae',fx,.3,fz,20);cylinder(cityGroup,1.55,1.55,.42,'#3aa6e6',fx,.3,fz,20);cylinder(cityGroup,.2,.25,1.2,'#bfbcae',fx,.9,fz,10);cylinder(cityGroup,.7,.1,.2,'#bfbcae',fx,1.5,fz,12);
 [[-4,-2.5],[4,-2.5],[-4,2.5],[4,2.5]].forEach(([dx,dz])=>{const x=fx+dx,z=fz+dz;box(cityGroup,1.3,.1,.4,'#755b3f',x,.5,z);box(cityGroup,1.3,.3,.08,'#755b3f',x,.7,z-.2);cylinder(cityGroup,.04,.04,.4,'#333',x-.5,.25,z,5);cylinder(cityGroup,.04,.04,.4,'#333',x+.5,.25,z,5);});
 // futsal court in east park
 const ct=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshStandardMaterial({map:pitchTex()}));ct.rotation.x=-Math.PI/2;ct.position.set(12,.05,8.8);ct.receiveShadow=true;cityGroup.add(ct);
 // rel berkelok + kereta (dunia) dan peron stasiun
 WLD.buildRail({x:14.5,z:-14.8});box(cityGroup,9,.25,1.7,'#cfcbbb',14.5,.12,-13.1);
}
function bigStadiums(){
 const reg=(id,kind,x,z,o)=>{const r=WLD.buildStadium(kind,x,z);WLD.reserved.push([x-21,x+21,z-18.5,z+18.5]);const hit=new THREE.Mesh(new THREE.BoxGeometry(r.w,r.H+1,r.d),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.set(x,r.H/2,z);hit.userData.placeId=id;cityGroup.add(hit);pickables.push(hit);places.push({id,...o,x,z,w:r.w,d:r.d,hours:'MATCHDAY · 24 JAM',kind:'building',group:null,hit,rot0:0});};
 reg('stadium-ot','ot',-48,-47.5,{name:'OLD TRAFFORD',type:'FOOTBALL STADIUM',desc:'Stadion klasik empat tribun dengan atap kantilever dan kursi merah, di sudut barat laut kota. Panggung derby dan malam Eropa para supporter.',glyph:'OLD TRAFFORD',tag:'MATCHDAY'});
 reg('stadium','gbk',181,-42,{name:'GELORA BUNG KARNO (GBK)',type:'FOOTBALL STADIUM',desc:'Stadion utama kota bergaya oval dengan atap cincin ikonik, di sudut timur laut. Tempat final liga, konser besar, dan perayaan juara.',glyph:'GBK',tag:'MAIN STADIUM'});
 reg('stadium-maguwo','maguwo',181,23.5,{name:'STADION MAGUWO',type:'FOOTBALL STADIUM',desc:'Stadion modern beratap gelombang di sudut tenggara kota. Tribun hijau, suara supporter paling vokal, dan matchday ramah keluarga.',glyph:'MAGUWO',tag:'MATCHDAY'});
}

/* ===== LENGKUNGKAN KOTA: grid → dunia ===== */
function bakeMesh(m){
  m.updateWorldMatrix(true,false);const g=m.geometry.clone();g.applyMatrix4(m.matrixWorld);
  const P=g.attributes.position,N=g.attributes.normal;
  for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i),f=WARPF(x,z);P.setX(i,f.x);P.setZ(i,f.z);if(N){const th=WARPR(x,z);if(th){const c=Math.cos(th),sn=Math.sin(th),nx=N.getX(i),nz=N.getZ(i);N.setX(i,nx*c+nz*sn);N.setZ(i,-nx*sn+nz*c);}}}
  P.needsUpdate=true;if(N)N.needsUpdate=true;g.computeBoundingSphere();g.computeBoundingBox();
  m.geometry=g;m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.set(1,1,1);m.updateMatrix();if(m.parent!==cityGroup)cityGroup.add(m);
}
function warpInst(im){
  if(im.userData.warped)return;const mt=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),rq=new THREE.Quaternion(),ay=new THREE.Vector3(0,1,0);
  for(let i=0;i<im.count;i++){im.getMatrixAt(i,mt);mt.decompose(p,q,sc);const f=WARPF(p.x,p.z),th=WARPR(p.x,p.z);rq.setFromAxisAngle(ay,th);q.premultiply(rq);p.x=f.x;p.z=f.z;mt.compose(p,q,sc);im.setMatrixAt(i,mt);}
  im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;
}
function applyWarp(){
  cityGroup.updateMatrixWorld(true);
  const rig=[];cityGroup.traverse(o=>{if(o!==cityGroup&&!o.isMesh&&o.userData&&o.userData.noMerge)rig.push(o);});rig.forEach(o=>{if(o.parent!==cityGroup)cityGroup.attach(o);});
  const meshes=[],insts=[];cityGroup.children.slice().forEach(ch=>{if(ch===ground||(ch.userData.noMerge&&!ch.isMesh))return;ch.traverse(o=>{if(o.isInstancedMesh)insts.push(o);else if(o.isMesh&&!o.userData.warped)meshes.push(o);});});
  meshes.forEach(bakeMesh);insts.forEach(warpInst);
  cityGroup.children.forEach(ch=>{if(ch.userData.noMerge&&!ch.isMesh&&!ch.userData.warped){const f=WARPF(ch.position.x,ch.position.z);ch.rotation.y+=WARPR(ch.position.x,ch.position.z);ch.position.x=f.x;ch.position.z=f.z;}});
  places.forEach(p=>{const f=WARPF(p.x,p.z),th=WARPR(p.x,p.z);p.x=f.x;p.z=f.z;p.rot=(p.rot0||0)+th;const k=p.d/2+1.3;p.fx=p.x+Math.sin(p.rot)*k;p.fz=p.z+Math.cos(p.rot)*k;});
  solids.forEach(o=>{const f=WARPF(o.x,o.z);o.rot=WARPR(o.x,o.z);o.x=f.x;o.z=f.z;});
  houseSpots.forEach(h=>{const f=WARPF(h.x,h.z);h.x=f.x;h.z=f.z;});
  // sumbu jalan & kanal di ruang dunia untuk jembatan, titik patroli, dll
  ROADW=[];const line=(pts)=>{pts.forEach((q,i)=>{const f=WARPF(q[0],q[1]);ROADW.push({x:f.x,z:f.z,cut:i===pts.length-1});});};
  PH.forEach(r=>{const a=[];for(let x=r.x1;x<r.x2;x+=3)a.push([x,r.z]);a.push([r.x2,r.z]);line(a);});PV.forEach(r=>{const a=[];for(let z=r.z1;z<r.z2;z+=3)a.push([r.x,z]);a.push([r.x,r.z2]);line(a);});
  RBS.forEach(b=>{const a=[];for(let k=0;k<=24;k++)a.push([b.x+Math.cos(k/24*Math.PI*2)*b.r,b.z+Math.sin(k/24*Math.PI*2)*b.r]);line(a);});
  CANALW=[];for(let x=-70;x<=60;x+=3){const f=WARPF(x,30);CANALW.push({x:f.x,z:f.z,cut:x+3>60});}BASINW=WARPF(62,30);
}
const warpSurf=()=>({poles:ART_SURF.poles.map(([x,z,id])=>{const f=WARPF(x,z);return [f.x,f.z,id];}),boards:ART_SURF.boards.map(([x,z,id])=>{const f=WARPF(x,z);return [f.x,f.z,id];}),walls:ART_SURF.walls.map(([x,z,id])=>{const f=WARPF(x,z);return [f.x,f.z,id];})});
/* titik kerja untuk misi: sudut simpang & trotoar (grid → dunia) */
function farmPtsWorld(){const P=FARM?.points;if(!P)return null;const m=p=>WARPF(p.x,p.z);return {wheat:P.wheat.map(m),corn:P.corn.map(m),ranch:P.ranch.map(m),sheep:P.sheep.map(m),veg:P.veg.map(m),coop:m(P.coop),stall:m(P.stall)};}
function jobCorners(n){const all=[];H_ROADS.forEach(h=>V_ROADS.forEach(v=>{if(h.z<-70||v.x<h.x1||v.x>h.x2||h.z<v.z1||h.z>v.z2)return;[[3.9,3.9],[-3.9,-3.9],[3.9,-3.9],[-3.9,3.9]].forEach(([a,b])=>all.push(WARPF(v.x+a,h.z+b)));}));
  for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}const out=[];all.forEach(p=>{if(out.length<n&&!blocked(p.x,p.z,.5)&&p.z<48&&out.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>26))out.push(p);});return out;}
function jobStreetPts(n,xr){const out=[],hs=PH.filter(p=>p.z>-70);for(let t=0;t<500&&out.length<n;t++){const p=hs[Math.floor(Math.random()*hs.length)],x0=Math.max(p.x1+6,xr?xr[0]:-58),x1=Math.min(p.x2-6,xr?xr[1]:196);if(x1<=x0)continue;const gx=x0+Math.random()*(x1-x0),gz=p.z+(Math.random()<.5?-3.4:3.4),f=WARPF(gx,gz);if(roadDist(gx,gz,p)<5||blocked(f.x,f.z,.5)||out.some(o=>Math.hypot(o.x-f.x,o.z-f.z)<14))continue;out.push(f);}return out;}
function createCity(){
 cityGroup=new THREE.Group();scene.add(cityGroup);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(290,270),WLD.grassMat());ground.rotation.x=-Math.PI/2;ground.position.set(70,-.08,-60);ground.userData.noWarp=true;ground.receiveShadow=true;cityGroup.add(ground);
 roads();river();WLD.buildCoast();WLD.buildParks();bigStadiums();
 FARM=createFarm({THREE,group:()=>cityGroup,RND,solids,sign,gable,regPlace,addNPC,warp:WARPF,warpRot:WARPR});FARM.build();
  addPlace({id:'fttr',name:'FUCK THE RULES STORE',type:'STREETWEAR / RETAIL',desc:'Toko utama FTTR di pusat kota. Jelajahi koleksi, lihat produk di rak, lalu lanjutkan ke katalog dan checkout asli.',glyph:'FTTR',tag:'FLAGSHIP STORE',x:-7,z:-7,w:5.5,d:4.2,color:'#c8c3b4'});
  addPlace({id:'station',name:'CENTRAL STATION',type:'TRANSPORT HUB',desc:'Stasiun utama yang menghubungkan Central City dengan Northside, Eastbank, dan kota-kota berikutnya.',glyph:'CENTRAL',tag:'TRAIN · BUS',x:8,z:-7,w:5,d:4,color:'#b7b9af'});
  addPlace({id:'billboard',name:'CENTRAL BILLBOARD',type:'ADVERTISING SPACE',desc:'Slot iklan kota. Pada versi ini billboard masih kosong; nantinya admin dapat menjadwalkan kampanye dan sponsor.',glyph:'YOUR AD',tag:'AD SLOT',x:0,z:-14,w:5.8,d:2.8,color:'#c7b9a7'});
  addPlace({id:'cafe',name:'CORNER KITCHEN',type:'FOOD & DRINK',desc:'Tempat membeli makanan dan memulihkan stamina. Pesan dari dalam restoran atau gunakan aplikasi Food di HP.',glyph:'KITCHEN',tag:'FOOD',x:8,z:7,w:4.3,d:3.5,color:'#d0bca1'});
  addPlace({id:'pub',name:'THE AWAY END',type:'SUPPORTER PUB',desc:'Tempat berkumpul supporter sebelum derby, membahas pertandingan, dan merencanakan perjalanan tandang.',glyph:'AWAY END',tag:'SUPPORTERS',x:-9,z:7,w:4.5,d:3.5,color:'#b9b7a0'});
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
  addPlace({id:'northside-market',name:'NORTHSIDE HIGH STREET',type:'SHOPPING DISTRICT',desc:'Jalan komersial Northside: kios, tempat makan, dan titik kumpul supporter.',glyph:'NORTHSIDE',tag:'DISTRICT',x:-27,z:8,w:6,d:4,color:'#c2b6a2'});
  addPlace({id:'eastbank-market',name:'EASTBANK CANAL MARKET',type:'INDUSTRIAL MARKET',desc:'Pasar kanal Eastbank di antara gudang bata, jembatan, dan kawasan kerja.',glyph:'EASTBANK',tag:'DISTRICT',x:27,z:8,w:6,d:4,color:'#aeb9b1'});
 houses();fillCity();scenery();
 try{liveCity();}catch(e){console.warn('liveCity',e);}
 try{const mr=WLD.mergeStatic(cityGroup);console.info('FTTR merge',mr);}catch(e){console.warn('mergeStatic',e);}
 applyWarp();
}
function shirt(parent,x,z,color,scale=1){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);const body=box(g,.52*scale,.68*scale,.12*scale,color,0,.82*scale,0);body.rotation.z=.02;box(g,.24*scale,.3*scale,.11*scale,color,-.34*scale,.94*scale,0,{ry:0});box(g,.24*scale,.3*scale,.11*scale,color,.34*scale,.94*scale,0);box(g,.18*scale,.035*scale,.125*scale,'#f2efdf',0,.87*scale,.066*scale,{shadow:false});return g;}

function makeCar(color,axis,lane,dir,t,lo,hi){const c=new THREE.Group();c.scale.setScalar(1.45);box(c,1.7,.42,.82,color,0,.4,0);box(c,.9,.34,.7,'#dfe6df',-.05,.76,0);box(c,.2,.16,.84,'#2a2d27',.2,.78,0,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,.25,{shadow:false});box(c,.14,.1,.1,'#ffe9a3',.86,.42,-.25,{shadow:false});for(const [x,z] of [[-.55,.42],[.55,.42],[-.55,-.42],[.55,-.42]])box(c,.3,.3,.12,'#1b1c18',x,.15,z,{shadow:false});
  c.userData={axis,lane,t,lo,hi,s:dir*(3.2+Math.abs(t%3)*.4),base:axis==='x'?(dir>0?0:Math.PI):(dir>0?-Math.PI/2:Math.PI/2),noMerge:true};cityGroup.add(c);cars.push(c);return c;}
function createTraffic(){const cl=['#d7ff3f','#c4533f','#4a6fa5','#e8e2cc','#2f3a34','#d9a441'];
  /* [sumbu, jalur, arah, posisi awal, batas bawah, batas atas] di ruang grid; posisi akhir dilengkungkan lewat WARPF tiap frame */
  [['x',1.2,1,-30,-62,58],['x',-1.2,-1,30,-62,58],['x',23.2,1,10,-62,68],['x',20.8,-1,-20,-62,68],['x',-20.8,1,40,-62,68],['x',-23.2,-1,-40,-62,68],['x',45.2,1,70,-62,192],['x',42.8,-1,120,-62,192],['x',-42.8,1,100,-18,150],['x',-45.2,-1,60,-18,150],
   ['z',1.2,1,-20,-185,52],['z',-1.2,-1,15,-185,52],['z',25.2,1,-30,-62,52],['z',22.8,-1,25,-62,52],['z',-22.8,1,10,-62,52],['z',-25.2,-1,-10,-62,52],['z',49.2,1,-20,-185,52],['z',46.8,-1,10,-62,52]].forEach(([a,l,d,t,lo,hi],i)=>makeCar(cl[i%6],a,l,d,t,lo,hi));
  const sk=['#d5a07b','#b87d58','#8d5a3c'],sh=['#d7ff3f','#5875a6','#c76f51','#e0d9c7','#5d8c83','#f2efdf','#586a8c','#a64e3d'];
  for(let i=0;i<16;i++){const n=makeCitizen({key:'w'+i,shirt:sh[i%8],skin:sk[i%3],hair:'#30251f',pants:'#34372f',eyes:false});n.scale.setScalar(CITIZEN_S);n.userData.noMerge=true;
    const ax=i%2?'x':'z',sd=(i%4<2?-1:1)*3.4,side=ax==='x'?[0,22,-22][i%3]+sd:[0,24,-24][i%3]+sd,c=(i*17%50)-25;Object.assign(n.userData,{axis:ax,c,t:0,side,r:6+i%4*2,s:.9+(i%3)*.25,p:i,base:ax==='x'?Math.PI/2:0});cityGroup.add(n);walkers.push(n);}}
function liveCity(){
 const rnd=RND(4242),tr=[],cr=[[],[],[],[]],f1=[],f2=[],cab=[],cl=['#e8453c','#2f7fd1','#f2c230','#f5f5f0','#2fa86a','#8e5bd8'],cars=cl.map(()=>[]);
 const clear=(x,z,r)=>!places.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r)&&!solids.some(p=>Math.abs(x-p.x)<p.w/2+r&&Math.abs(z-p.z)<p.d/2+r);
 const tree=(x,z)=>{const s=.8+rnd()*.5,k=rnd();tr.push([x,.7*s,z,.16*s,1.4*s,.16*s]);cr[k<.5?0:k<.8?1:k<.92?2:3].push([x,1.9*s,z,.85*s,.8*s,.85*s,rnd()*6]);if(k>.4){f1.push([x+.75,.2,z+.2,.28,.22,.28]);f2.push([x-.7,.2,z-.25,.26,.2,.26]);}};
 const PS=1.45,wh=[],park=(x,z,rot)=>{const i=Math.floor(rnd()*6);cars[i].push([x,.36,z,PS,PS,PS,rot]);cab.push([x,.95,z,PS,PS,PS,rot]);const c=Math.cos(rot),sn=Math.sin(rot);[[-.55,.42],[.55,.42],[-.55,-.42],[.55,-.42]].forEach(([dx,dz])=>wh.push([x+(dx*c+dz*sn)*PS,.22,z+(-dx*sn+dz*c)*PS,PS,PS,PS,rot]));};
 PH.forEach(p=>{if(p.z<-70)return;for(let x=p.x1+4;x<=p.x2-4;x+=7){const xx=x+rnd()*2,tz=p.z-3.4;if(roadDist(xx,tz,p)>4.3&&!nearRing(xx,tz,1)&&clear(xx,tz,.4))tree(xx,tz);}
  for(let x=p.x1+6;x<=p.x2-6;x+=9+rnd()*8){const z=p.z+(rnd()<.5?-1:1)*2.6;if(roadDist(x,z,p)>5.2&&!nearRing(x,z,1)&&rnd()<.6&&clear(x,z,.2))park(x,z,0);}});
 PV.forEach(p=>{if(p.z2<-66)return;const zend=Math.min(p.z2,WLD.roadEnd);for(let z=p.z1+4;z<=zend-4;z+=7){const zz=z+rnd()*2,tx=p.x-3.4;if(roadDist(tx,zz,p)>4.3&&!nearRing(tx,zz,1)&&clear(tx,zz,.4))tree(tx,zz);}
  for(let z=p.z1+6;z<=zend-6;z+=10+rnd()*8){const x=p.x+(rnd()<.5?-1:1)*2.6;if(roadDist(x,z,p)>5.2&&!nearRing(x,z,1)&&rnd()<.6&&clear(x,z,.2))park(x,z,Math.PI/2);}});
 inst(new THREE.CylinderGeometry(.12,.18,1,6),'#6b4a2f',tr,false);
 ['#4fb046','#3c9a3a','#f2b134','#ff9ec4'].forEach((c,i)=>inst(new THREE.IcosahedronGeometry(1,0),c,cr[i],false));
 inst(new THREE.IcosahedronGeometry(1,0),'#ff5d8f',f1,false);inst(new THREE.IcosahedronGeometry(1,0),'#ffd23f',f2,false);
 const bg=new THREE.BoxGeometry(1.7,.42,.82);cars.forEach((l,i)=>inst(bg,cl[i],l,false));inst(new THREE.BoxGeometry(.9,.34,.7),'#dfe9ee',cab,false);inst(new THREE.BoxGeometry(.3,.3,.12),'#1b1c18',wh,false);
}
function createBotWorkers(){createTraffic();
  const spots=['fttr','station','cafe','pub','hospital','press','police','garage','market'].map((id,i)=>{const p=places.find(q=>q.id===id);return p?[p.fx+1.2,p.fz-.7,['#d7ff3f','#5875a6','#c76f51','#e0d9c7','#5d8c83','#b6b4a8','#586a8c','#d7ff3f','#e0d9c7'][i]]:null;}).filter(Boolean);
  spots.forEach(([x,z,shirtColor],i)=>{const npc=makeCitizen({key:'bot'+i,shirt:shirtColor,skin:i%2?'#b87d58':'#d5a07b',hair:'#30251f',pants:'#34372f'});npc.scale.setScalar(CITIZEN_S);npc.position.set(x,0,z);npc.userData.phase=i*.7;cityGroup.add(npc);botWorkers.push(npc);});
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
const DEST={farm:{name:'Farmland',x:8,z:-91.4},north:{name:'Northside',x:-30,z:-3.4},east:{name:'Eastbank',x:30,z:-3.4},central:{name:'Central City',x:-5,z:5.6}};
function showMenu(v){const m=MENU[v];showNotice(m.icon,m.title,'Pilih menu · saldo ₡'+money.toLocaleString('id-ID'),m.items.map((k,i)=>({label:FOOD_ITEMS[k].name+' · ₡'+FOOD_ITEMS[k].cost+' · '+(FOOD_ITEMS[k].need==='hunger'?'Hunger':'Thirst')+' +'+FOOD_ITEMS[k].value,acid:i===0,run:()=>handleAction('food:'+k)})));}
function fade(cb){let o=$('#fadeOv');if(!o){o=document.createElement('div');o.id='fadeOv';o.style.cssText='position:fixed;inset:0;background:#171914;opacity:0;pointer-events:none;transition:opacity .45s;z-index:30';document.body.appendChild(o);}o.style.opacity=1;o.style.pointerEvents='auto';setTimeout(()=>{cb();setTimeout(()=>{o.style.opacity=0;o.style.pointerEvents='none';},350);},480);}
function destFor(key){const d=DEST[key];if(d){const f=WARPF(d.x,d.z);return {name:d.name,x:f.x,z:f.z};}const p=places.find(q=>q.id===key);return p&&key.startsWith('stadium')?{name:p.name,x:p.fx,z:p.fz}:null;}
function rideTo(key,fare=100){const d=destFor(key);if(!d)return;const here=player.position.z<-72?'farm':player.position.x<-20?'north':player.position.x>20?'east':'central';if(here===key){toast('Kamu sudah berada di '+d.name);return;}if(money<fare){toast('Saldo virtual tidak cukup');return;}setMoney(money-fare);fade(()=>{if(isInside)exitRoom(true);player.position.set(d.x,0,d.z);destination=null;cameraTarget?.set(d.x,0,d.z);cameraFollow=true;camera.position.set(d.x+CAM_OFF[0],CAM_OFF[1],d.z+CAM_OFF[2]);camera.lookAt(cameraTarget);toast('Tiba di '+d.name+' · −₡'+fare);});}
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
function enterRoom(key,from){const R=ROOMS[key];if(!R)return;if(ride){toast('Turun dari kendaraan dulu: selesaikan atau batalkan misi');return;}enteredFrom=from||null;savedPick=[...pickables];isInside=true;cityGroup.visible=false;Object.values(ROOMS).forEach(r=>{r.g.visible=r===R;});currentRoom=key;groundInterior=R.ground;pickables.splice(0,pickables.length,...R.hits);player.position.set(R.spawn[0],0,R.spawn[1]);destination=null;pendingAct=null;const nm=(from&&from.name)||R.name;$('#interiorHud').hidden=false;$('#interiorName').textContent=nm;$('#districtName').textContent=nm;cameraFollow=true;cameraZoom=1.4;camera.zoom=cameraZoom;cameraTarget?.set(0,0,0);camera.position.set(15,22,15);camera.lookAt(0,0,0);camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');toast('Masuk: '+nm);}
function exitRoom(silent){const R=ROOMS[currentRoom];if(R)R.g.visible=false;isInside=false;cityGroup.visible=true;pickables.splice(0,pickables.length,...(savedPick||places.map(p=>p.hit)));const p=enteredFrom;if(!silent&&p)player.position.set(p.fx,0,p.fz);destination=null;pendingAct=null;currentRoom=null;$('#interiorHud').hidden=true;const x=player.position.x;$('#districtName').textContent=x<-20?'NORTHSIDE':x>20?'EASTBANK':'CENTRAL CITY';cameraZoom=1;camera.zoom=1;cameraTarget?.set(player.position.x,0,player.position.z);cameraFollow=true;camera.updateProjectionMatrix();$('#cameraFollow')?.classList.add('active');if(!silent)toast('Kembali ke jalan');}
function roomAction(a,x,z){
 if(a==='exit'){exitRoom();return;}
 if(a==='hosp-check'){handleAction('health:check');return;}if(a==='hosp-ward'){handleAction('health:ward');return;}if(a==='hosp-er'){handleAction('health:emergency');return;}if(a==='hosp-kit'){handleAction('health:kit');return;}
 if(a.startsWith('menu:')){showMenu(a.slice(5));return;}
 if(a==='sit'){const n=Date.now();if(n<seatCool){toast('Kamu baru saja duduk santai');return;}seatCool=n+20000;player.position.set(x,0,z+1.0);recoverNeed('mood',5);recoverNeed('energy',6);toast('Duduk santai · Mood +5 · Energy +6');return;}
 if(a==='tv'){openPhone('football');return;}
 if(a==='train'||a==='ticket'){showNotice('🚆','PLATFORM 1','Kereta siap berangkat. Tarif dibayar dengan uang virtual saat naik.',[{label:'NORTHSIDE · ₡100',acid:true,run:()=>rideTo('north')},{label:'EASTBANK · ₡100',acid:true,run:()=>rideTo('east')}]);return;}
 if(a==='board'){showNotice('▤','DESTINASI','Northside (2 klub) dan Eastbank (2 klub), Peron 1, ₡100. Kereta berangkat saat kamu naik; jadwal dinamis belum tersedia.');return;}
 if(a==='kiosk'){showNotice('🥤','KIOSK STASIUN','Air mineral untuk perjalanan.',[{label:'AIR MINERAL · ₡35',acid:true,run:()=>handleAction('food:water')}]);return;}}

/* ===== WARGA: rig berkerangka (pinggul/bahu berporos) supaya kaki & tangan berayun saat jalan ===== */
let BLOB;
function makeCitizen(o){
  const pick=(v,k)=>typeof v==='string'?material(k,v):v,key=o.key||'cz';
  const cloth=pick(o.shirt,key+'-s'+o.shirt),skin=pick(o.skin,'cz-k'+o.skin),hair=pick(o.hair||'#30251f','cz-h'+(o.hair||'#30251f')),pants=pick(o.pants||'#34372f','cz-p'+(o.pants||'#34372f')),shoes=pick(o.shoes||'#f2efdf','cz-sh'+(o.shoes||'#f2efdf'));
  const g=new THREE.Group(),rig=new THREE.Group();g.add(rig);
  const body=box(rig,.48,.58,.3,cloth,0,.82,0),head=box(rig,.34,.34,.32,skin,0,1.28,0);
  box(rig,.36,.12,.34,hair,0,1.5,-.015,{shadow:false});
  if(o.eyes!==false){box(rig,.08,.055,.025,'#171914',-.075,1.3,.17,{shadow:false});box(rig,.08,.055,.025,'#171914',.075,1.3,.17,{shadow:false});}
  const limb=(x,y,w,h,d,mt)=>{const p=new THREE.Group();p.position.set(x,y,0);rig.add(p);box(p,w,h,d,mt,0,-h/2,0);return p;};
  const armL=limb(-.33,1.04,.14,.44,.16,cloth),armR=limb(.33,1.04,.14,.44,.16,cloth),legL=limb(-.13,.5,.16,.44,.18,pants),legR=limb(.13,.5,.16,.44,.18,pants);
  [legL,legR].forEach(l=>box(l,.18,.1,.25,shoes,0,-.43,.035));
  [armL,armR].forEach(a=>box(a,.15,.1,.17,skin,0,-.42,0,{shadow:false}));
  if(!BLOB)BLOB={geo:new THREE.CircleGeometry(.42,14),mat:new THREE.MeshBasicMaterial({color:'#10240a',transparent:true,opacity:.32,depthWrite:false})};
  const sh=new THREE.Mesh(BLOB.geo,BLOB.mat);sh.rotation.x=-Math.PI/2;sh.position.y=.16;sh.renderOrder=1;g.add(sh);
  g.userData.cz={rig,body,head,armL,armR,legL,legR,blob:sh,phase:Math.random()*6,amp:0,seed:Math.random()*10};
  return g;
}
/* v = kecepatan nyata (unit/detik). v=0 → diam bernapas; makin cepat → ayunan & langkah makin cepat */
function animCitizen(g,dt,v,t){
  const u=g.userData.cz;if(!u||!(dt>=0))return;
  if(u.seated){u.legL.rotation.x=-1.05;u.legR.rotation.x=-1.05;u.armL.rotation.x=-.75;u.armR.rotation.x=-.75;u.rig.position.y=u.seatY;u.rig.rotation.x=.1;u.rig.rotation.z=0;u.amp=0;return;}
  u.amp+=(Math.min(1,v/1)-u.amp)*Math.min(1,dt*12);u.phase+=dt*(5+Math.min(v,4)*2.2);
  const a=u.amp,s=Math.sin(u.phase),sw=a*(.5+.3*Math.min(1,v/3));
  u.legL.rotation.x=s*sw*1.15;u.legR.rotation.x=-s*sw*1.15;u.armL.rotation.x=-s*sw*.9;u.armR.rotation.x=s*sw*.9;
  u.rig.position.y=.08+Math.abs(Math.cos(u.phase))*.05*a;u.rig.rotation.x=.1*a;u.rig.rotation.z=s*.04*a;
  u.rig.scale.y=1+Math.sin(t*2.2+u.seed)*.012*(1-a);u.head.rotation.y=Math.sin(t*.7+u.seed)*.25*(1-a);
}
/* ===== PENANDA TAP: cincin berdenyut + panah di titik tujuan, dan riak saat layar disentuh ===== */
function createTapMarker(){
  tapMarker=new THREE.Group();tapMarker.visible=false;scene.add(tapMarker);
  const mk2=(geo,color,op,ro)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));m.renderOrder=ro;return m;};
  const flatR=m=>{m.rotation.x=-Math.PI/2;return m;};
  const ring=flatR(mk2(new THREE.RingGeometry(.46,.62,28),'#ffcf3f',.95,990)),dot=flatR(mk2(new THREE.CircleGeometry(.17,16),'#ffffff',.95,991)),pulse=flatR(mk2(new THREE.RingGeometry(.42,.52,28),'#ffffff',.8,989)),arrow=mk2(new THREE.ConeGeometry(.26,.55,4),'#ffcf3f',1,993);
  arrow.rotation.x=Math.PI;tapMarker.add(ring,dot,pulse,arrow);
  const burst=flatR(mk2(new THREE.RingGeometry(.4,.55,28),'#ffffff',1,992));burst.visible=false;scene.add(burst);
  tapMarker.userData={ring,dot,pulse,arrow,burst,t:0,b:9,bx:0,bz:0};
}
function tapBurst(x,z){const u=tapMarker?.userData;if(!u)return;u.b=0;u.bx=x;u.bz=z;}
function updateTapMarker(dt){
  const m=tapMarker;if(!m)return;const u=m.userData;u.t+=dt;
  if(destination){m.visible=true;m.position.set(destination.x,.1,destination.z);const k=(u.t%1.1)/1.1;u.pulse.scale.setScalar(.7+k*1.5);u.pulse.material.opacity=.75*(1-k);u.ring.scale.setScalar(1+Math.sin(u.t*7)*.07);u.arrow.position.y=1+Math.abs(Math.sin(u.t*4.5))*.28;}else m.visible=false;
  if(u.b<.45){u.b+=dt;u.burst.visible=true;u.burst.position.set(u.bx,.1,u.bz);const k=Math.min(1,u.b/.45);u.burst.scale.setScalar(.4+k*2.2);u.burst.material.opacity=1-k;}else u.burst.visible=false;
}


function regPlace(o){const hit=new THREE.Mesh(new THREE.BoxGeometry(o.w,(o.H||4)+1,o.d),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.set(o.x,(o.H||4)/2,o.z);hit.userData.placeId=o.id;cityGroup.add(hit);pickables.push(hit);places.push({hours:'OPEN · ALL DAY',kind:'building',rot0:0,...o,hit});}
function addNPC(x,z,color){const i=botWorkers.length;const npc=makeCitizen({key:'npc'+i,shirt:color,skin:i%2?'#b87d58':'#d5a07b',hair:'#30251f',pants:'#34372f'});npc.scale.setScalar(CITIZEN_S);npc.position.set(x,0,z);npc.userData.phase=i*.7;npc.userData.noMerge=true;npc.rotation.y=i*1.3;cityGroup.add(npc);botWorkers.push(npc);}
let held=null;
function setHeld(kind){
  const u=player?.userData.cz;if(!u)return;if(held){held.parent?.remove(held);held=null;}if(!kind)return;
  const g=new THREE.Group(),b=(w,h,d,c,x,y,z)=>box(g,w,h,d,c,x,y,z,{shadow:false});let host=u.armR,pos=[0,-.4,.12],rx=0;
  if(kind==='camera'){b(.26,.18,.16,'#2a2d28',0,0,0);b(.12,.12,.14,'#6fb4d8',0,0,.14);}
  else if(kind==='broom'){b(.05,1,.05,'#8d6a44',0,.1,0);b(.28,.18,.1,'#c9a23a',0,-.45,.04);rx=-.4;}
  else if(kind==='bag'){host=u.rig;pos=[0,.9,-.27];b(.5,.56,.22,'#ff8a2a',0,0,0);b(.4,.18,.06,'#2a2d28',0,.1,.12);}
  else if(kind==='radio'){b(.11,.22,.07,'#2a2d28',0,0,0);b(.02,.18,.02,'#c0c8d0',.04,.2,0);b(.07,.03,.02,'#e5483b',0,.06,.04);}
  else if(kind==='torch'){b(.07,.28,.07,'#2a2d28',0,0,0);b(.12,.08,.12,mat0('torch-head','#fff2a8'),0,.17,0);rx=-.5;}
  else if(kind==='kit'){b(.32,.22,.14,'#f4f6f8',0,0,0);b(.16,.05,.15,'#e5483b',0,0,0);b(.05,.16,.15,'#e5483b',0,0,0);}
  else if(kind==='clip'){b(.22,.3,.03,'#8d6a44',0,0,0);b(.18,.24,.035,'#ffffff',0,0,.02);}
  else if(kind==='can'){b(.22,.18,.14,'#3a8f5a',0,0,0);b(.04,.04,.28,'#3a8f5a',.12,.08,.1);}
  else if(kind==='toolbox'){b(.32,.16,.14,'#e5483b',0,0,0);b(.16,.04,.04,'#2a2d28',0,.1,0);}
  else if(kind==='hammer'){b(.04,.34,.04,'#8d6a44',0,0,0);b(.16,.08,.08,'#8d98a3',0,.18,0);}
  else if(kind==='tray'){b(.36,.03,.26,'#c9c4b0',0,0,0);b(.08,.1,.08,'#ffffff',-.08,.06,0);rx=-.9;pos=[0,-.3,.22];}
  else if(kind==='bucket'){b(.2,.2,.2,'#6fa3c8',0,0,0);b(.16,.03,.16,'#e0c25a',0,.1,0);}
  else if(kind==='staff'){b(.05,1.5,.05,'#8d6a44',0,.3,0);b(.18,.05,.05,'#8d6a44',.07,1.05,0);}
  else if(kind==='hat'){host=u.head;pos=[0,.18,0];b(.62,.04,.62,'#d9b84a',0,0,0);b(.34,.16,.34,'#d9b84a',0,.1,0);}
  else if(kind==='vest'){host=u.body;pos=[0,0,0];b(.54,.4,.34,'#ff9a1a',0,.08,0);b(.55,.05,.35,'#f4f6f8',0,.0,0);}
  g.rotation.x=rx;g.position.set(pos[0],pos[1],pos[2]);host.add(g);held=g;
}
const mat0=(k,c)=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.8});
/* ===== KENDARAAN (misi pekerjaan) ===== */
const RIDE={motor:{speed:5.8,margin:.55,seatY:.71,hide:false},patrol:{speed:6.6,margin:1.05,hide:true},ambulance:{speed:6.4,margin:1.15,hide:true},bus:{speed:5.2,margin:1.4,hide:true},tractor:{speed:4.4,margin:.95,seatY:1.71,hide:false},truck:{speed:6.2,margin:1.3,hide:true}};
const moveBase=()=>ride?ride.speed:(isInside?3.2:3.1);
let EMI;
function makeVehicleModel(kind){
  const g=new THREE.Group(),wheels=[];
  if(!EMI)EMI={red:new THREE.MeshStandardMaterial({color:'#e5483b',emissive:'#e5483b',emissiveIntensity:.9}),blue:new THREE.MeshStandardMaterial({color:'#2a74d8',emissive:'#2a74d8',emissiveIntensity:.9}),lamp:new THREE.MeshStandardMaterial({color:'#fff6c0',emissive:'#fff2a8',emissiveIntensity:.9})};
  const wheel=(x,y,z,r,w)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,10),material('veh-tire','#1b1c18'));m.rotation.z=Math.PI/2;m.castShadow=true;const h=new THREE.Group();h.position.set(x,y,z);h.add(m);g.add(h);wheels.push(h);};
  const B=(w,h,d,c,x,y,z)=>box(g,w,h,d,c,x,y,z);
  if(kind==='motor'){wheel(0,.3,.62,.3,.16);wheel(0,.3,-.62,.3,.16);B(.3,.32,1.15,'#d94a3a',0,.62,0);B(.34,.16,.6,'#222',0,.84,-.28);B(.7,.07,.07,'#222',0,1.02,.42);B(.16,.16,.1,EMI.lamp,0,.9,.66);B(.3,.06,.5,'#d94a3a',0,.45,.62);B(.3,.06,.5,'#d94a3a',0,.5,-.7);}
  else if(kind==='patrol'){[[-.78,1],[.78,1],[-.78,-1],[.78,-1]].forEach(([x,z])=>wheel(x,.32,z,.32,.22));B(1.5,.5,3.1,'#f4f6f8',0,.62,0);B(1.54,.14,2.4,'#1e6bd8',0,.58,0);B(1.3,.44,1.5,'#dfe9ee',0,1.08,-.2);B(.45,.14,.3,EMI.red,-.2,1.36,-.2);B(.45,.14,.3,EMI.blue,.2,1.36,-.2);B(1.2,.14,.12,EMI.lamp,0,.72,1.56);}
  else if(kind==='ambulance'){[[-.8,1.1],[.8,1.1],[-.8,-1.1],[.8,-1.1]].forEach(([x,z])=>wheel(x,.34,z,.34,.24));B(1.6,1.1,3.4,'#ffffff',0,.95,0);B(1.62,.16,3.42,'#e5483b',0,.72,0);B(1.4,.4,.06,'#6fb4d8',0,1.25,1.72);[-1,1].forEach(sd=>{B(.05,.5,.16,'#e5483b',sd*.82,1.1,-.4);B(.05,.16,.5,'#e5483b',sd*.82,1.1,-.4);});B(.5,.14,.3,EMI.red,-.25,1.58,.4);B(.5,.14,.3,EMI.blue,.25,1.58,.4);}
  else if(kind==='tractor'){const t=FARM.tractorModel();t.g.position.z=.7;g.add(t.g);t.wheels.forEach(w=>wheels.push(w));}
  else if(kind==='truck'){[[-.85,1.3],[.85,1.3],[-.85,-1.5],[.85,-1.5]].forEach(([x,z])=>wheel(x,.4,z,.4,.26));B(1.8,.9,1.5,'#2a74d8',0,1.1,1.1);B(1.7,.5,.06,'#9fd6ee',0,1.4,1.86);B(1.8,.3,3.4,'#8d98a3',0,.7,-.8);B(1.7,.9,2.9,'#a8793a',0,1.25,-.9);for(let i=0;i<5;i++)B(.5,.4,.5,['#e5483b','#f2a824','#7ac34f'][i%3],-.4+(i%2)*.8,1.9,-1.5+Math.floor(i/2)*.9);}
  else{[[-.9,1.8],[.9,1.8],[-.9,-1.8],[.9,-1.8]].forEach(([x,z])=>wheel(x,.42,z,.42,.26));B(1.9,1.4,5.4,'#ffcf3f',0,1.2,0);B(1.92,.5,4.8,'#3a6f8f',0,1.65,0);B(1.94,.14,5.42,'#e5483b',0,.78,0);B(1.6,.5,.06,'#3a6f8f',0,1.5,2.72);}
  return {g,wheels};
}
function setRide(kind){
  const u=player?.userData.cz;
  if(ride){scene.remove(ride.g);ride=null;if(u){u.seated=false;u.rig.visible=true;}}
  if(kind&&RIDE[kind]&&u){const m=makeVehicleModel(kind);scene.add(m.g);ride={kind,g:m.g,wheels:m.wheels,...RIDE[kind]};m.g.position.set(player.position.x,0,player.position.z);m.g.rotation.y=player.rotation.y;if(ride.hide)u.rig.visible=false;else{u.seated=true;u.seatY=ride.seatY;}toast('Naik '+({motor:'motor',patrol:'mobil patroli',ambulance:'ambulans',bus:'bus',tractor:'traktor',truck:'truk'}[kind]));}
}
function projectToScreen(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight,behind:v.z>1};}
function jobNotice(p,id){const d=JOBSYS?.def(id);if(!d){openPhone('jobs');return;}showNotice(d.icon,p.name,`${d.desc} Gaji ₡${d.reward}. Terbuka untuk semua warga.`,[{label:'MULAI MISI: '+d.name.toUpperCase(),acid:true,run:()=>JOBSYS.start(id)},{label:'LIHAT SEMUA PEKERJAAN',run:()=>openPhone('jobs')}]);}
function createPlayer(){
  player=makeCitizen({key:'player',shirt:material('citizen-shirt','#d7ff3f'),skin:material('citizen-skin','#c98f68'),hair:material('citizen-hair','#29231f'),pants:material('citizen-trousers','#252a25'),shoes:material('citizen-shoes','#f2efdf')});
  scene.add(player);playerBody=player.userData.cz.body;playerHead=player.userData.cz.head;
  ring=new THREE.Mesh(new THREE.RingGeometry(.4,.47,4),new THREE.MeshBasicMaterial({color:'#d7ff3f',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.16;player.add(ring);
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.2,.4,4),new THREE.MeshBasicMaterial({color:'#ffcf3f',depthTest:false,transparent:true,opacity:.95}));arrow.rotation.x=Math.PI;arrow.position.y=2.25;arrow.renderOrder=999;player.add(arrow);player.userData.arrow=arrow;
  player.scale.setScalar(CITIZEN_S);{const f=WARPF(-6,5);player.position.set(f.x,0,f.z);}applyProfile();
}
function setMoney(v){money=Math.max(0,v);moneyEl.textContent=money.toLocaleString('id-ID');localStorage.setItem('fttr.city.money',String(money));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function saveNeeds(){localStorage.setItem('fttr.city.needs',JSON.stringify(needs));}
function updateNeedsUI(){for(const [key,label] of [['hunger','Hunger'],['thirst','Thirst'],['health','Health'],['energy','Energy'],['mood','Mood']]){const value=Math.round(needs[key]);const bar=$(`#${key}Bar`),val=$(`#${key}Val`);if(bar)bar.style.width=value+'%';if(val)val.textContent=value;bar?.closest('.need')?.classList.toggle('low',value<25);}const mood=$('#needMood');if(mood)mood.textContent=needs.health<35?'NEED MEDIC':needs.hunger<20?'HUNGRY':needs.thirst<20?'THIRSTY':needs.energy<20?'TIRED':'FIT';}
function recoverNeed(key,value){needs[key]=Math.min(100,needs[key]+value);saveNeeds();updateNeedsUI();}
function needsSummary(){return `<div class="needs-inline">${[['Hunger','hunger'],['Thirst','thirst'],['Health','health'],['Energy','energy'],['Mood','mood']].map(([n,k])=>`<div><small>${n}</small><b>${Math.round(needs[k])}/100</b></div>`).join('')}</div>`;}

function showNotice(icon,title,text,actions=[]){$('#noticeIcon').textContent=icon;$('#noticeTitle').textContent=title;$('#noticeText').textContent=text;$('#noticeActions').innerHTML='';actions.forEach(a=>{const b=document.createElement('button');b.className='solid-btn '+(a.acid?'acid':'');b.textContent=a.label;b.onclick=()=>{if(a.run)a.run();$('#noticeModal').hidden=true;};$('#noticeActions').appendChild(b);});$('#noticeModal').hidden=false;}
function openPlace(p){selectedPlace=p;$('#placeCard').hidden=false;$('#placeGlyph').textContent=p.glyph;$('#placeTag').textContent=p.tag;$('#placeType').textContent=p.type;$('#placeName').textContent=p.name;$('#placeDesc').textContent=p.desc;$('#placeHours').textContent=p.hours;$('#placeDistance').textContent=`⌖ ${Math.round(Math.hypot(player.position.x-p.x,player.position.z-p.z)*18)} m`;$('#placeEnter').innerHTML=(p.id==='fttr'?'MASUK STORE':'MASUK LOKASI')+' <span>↗</span>';$('#placeArt').style.background=p.id==='fttr'?'#171914':String(p.id).startsWith('stadium')?'#536d4d':p.id==='billboard'?'#b5a895':'#34382f';}
function closePlace(){selectedPlace=null;$('#placeCard').hidden=true;}
function enterPlace(){if(!selectedPlace)return;const p=selectedPlace;closePlace();
  const RM={hospital:'hospital',cafe:'kitchen',cafe2:'cafe',pub:'pub',market:'mart','northside-market':'mart','eastbank-market':'mart',station:'station'};if(RM[p.id]){enterRoom(RM[p.id],p);return;}
  if(p.id==='hq'){showNotice('◆','FTTR HEADQUARTERS','Kantor brand. Akses AI Agent dan panel admin hanya untuk staf terverifikasi dan belum tersambung di prototipe ini.',[{label:'BUKA WEBSITE FTTR',acid:true,run:()=>openShop(STORE_BASE,'FTTR')}]);return;}
  const OFFICE_JOB={'office-cleaner':'cleaner','office-garden':'gardener','office-photo':'photo','office-medic':'medic','office-bus':'bus',barn:'farmer',dairy:'rancher',sheepfold:'shepherd',farmstall:'farmtruck'};if(OFFICE_JOB[p.id]){jobNotice(p,OFFICE_JOB[p.id]);return;}if(p.id==='farmhouse'){showNotice('🏡',p.name,p.desc);return;}if(p.id==='jobcentre'){jobNotice(p,'courier');return;}if(p.id==='police'){jobNotice(p,'police');return;}
  if(p.id==='residential'){openPhone('housing');return;}
  if(p.id==='training'){showNotice('⚽','TRAINING GROUND','Lapangan latihan klub. Latihan pemain dan akademi masuk tahap berikutnya.',[{label:'LIHAT FOOTBALL',acid:true,run:()=>openPhone('football')}]);return;}
  if(['stadium','stadium-ot','stadium-maguwo','northside-fc','northside-athletic','eastbank-united','eastbank-rovers'].includes(p.id)){showNotice('🎟',p.name,`Tiket matchday ₡60. Tiketmu: ${tickets}. Tiket dan jadwal masih tersimpan lokal.`,[{label:'BELI TIKET · ₡60',acid:true,run:()=>{if(money<60){toast('Saldo tidak cukup');return;}setMoney(money-60);tickets++;localStorage.setItem('fttr.city.tickets',tickets);recoverNeed('mood',8);toast('Tiket dibeli · Mood +8');}},{label:'KERJA DI STADION',run:()=>JOBSYS?.start(p.id==='stadium-maguwo'?'security':'stadium')},{label:'LIHAT JADWAL',run:()=>openPhone('football')}]);return;}if(p.id==='hospital'){openPhone('health');return;}if(['cafe','cafe2','market','northside-market','eastbank-market'].includes(p.id)){openPhone('food');return;}if(['press','works','garage'].includes(p.id)){jobNotice(p,{press:'journalist',works:'builder',garage:'mechanic'}[p.id]);return;}if(p.id==='fttr'){enterStore();return;}if(p.id==='station'){openPhone('travel');return;}if(p.id==='cafe'){openPhone('food');return;}if(p.id==='stadium'){openPhone('football');return;}if(p.id==='billboard'){showNotice('▤','CENTRAL BILLBOARD','Slot iklan ini sengaja dibiarkan kosong dalam prototype. Nantinya slot dapat dipesan brand, sponsor event, atau kampanye FTTR.');return;}if(p.id==='police'){showNotice('✚','CITY POLICE','Pos layanan polisi. Sistem patroli, pengamanan derby, laporan insiden, dan roleplay petugas direncanakan untuk versi multiplayer.');return;}if(p.id==='busstop'){openPhone('travel');return;}if(p.id==='pub'){showNotice('⚑','THE AWAY END','Tempat berkumpul supporter, menyusun perjalanan tandang, dan membaca berita klub. Fitur grup supporter akan ditambahkan di tahap berikutnya.');return;}showNotice('↗',p.name,p.desc);}
function enterStore(){enterRoom('store',places.find(p=>p.id==='fttr'));}
function exitStore(){exitRoom();}
function resize(){if(!renderer||!camera)return;const w=innerWidth,h=innerHeight;const dpr=window.devicePixelRatio||1;
  /* semi-pixel: tiap piksel render = blok 2px layar (1,5px di layar standar), lalu dibesarkan tanpa blur (image-rendering:pixelated) */
  const block=dpr>=1.5?2:1.5,pr=gfxMode==='pixel'?Math.max(.5,Math.min(1.5,dpr/block)):Math.min(dpr,1.75);
  renderer.setSize(Math.max(1,Math.round(w*pr)),Math.max(1,Math.round(h*pr)),false);canvas.style.width='100%';canvas.style.height='100%';canvas.classList.toggle('pixel',gfxMode==='pixel');
  const aspect=w/h;const view=w<h?24:19;viewH=view;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();}
function applyZoom(v){if(window.FTTRArt?.on)return;cameraZoom=Math.max(.16,Math.min(2.4,v));}
function resetCamera(){cameraFollow=true;cameraZoom=1;if(player)cameraTarget?.set(player.position.x,0,player.position.z);$('#cameraFollow')?.classList.add('active');toast('Kamera mengikuti karakter');}
function pointerDown(e){if(e.pointerType==='touch'&&e.isPrimary===false)return;dragState={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture?.(e.pointerId);}
function pointerMove(e){if(window.FTTRArt?.on)return;if(!dragState||dragState.id!==e.pointerId)return;const dx=e.clientX-dragState.lastX,dy=e.clientY-dragState.lastY;if(Math.hypot(e.clientX-dragState.x,e.clientY-dragState.y)>5)dragState.moved=true;if(dragState.moved){cameraFollow=false;$('#cameraFollow')?.classList.remove('active');const u=viewH/((innerHeight||1)*camera.zoom),k=.7071;cameraTarget ||= new THREE.Vector3(player?.position.x||0,0,player?.position.z||0);const nx=Math.max(-60,Math.min(190,cameraTarget.x-k*u*(dx+dy/CAM_SIN))),nz=Math.max(-185,Math.min(60,cameraTarget.z+k*u*(dx-dy/CAM_SIN)));const panX=nx-cameraTarget.x,panZ=nz-cameraTarget.z;cameraTarget.x+=panX;cameraTarget.z+=panZ;camera.position.x+=panX;camera.position.z+=panZ;camera.lookAt(cameraTarget); }dragState.lastX=e.clientX;dragState.lastY=e.clientY;}
function pointerUp(e){if(!dragState)return;const moved=dragState.moved;dragState=null;if(!moved)onPointer(e);}
function touchPinch(e){if(e.touches?.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDistance)applyZoom(cameraZoom*(d/pinchDistance));pinchDistance=d;e.preventDefault();}else pinchDistance=0;}
function worldFromEvent(e){const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);}
function onPointer(e){if(window.FTTRArt?.on){window.FTTRArt.tap(e);return;}if($('#phoneOverlay').hidden===false||$('#mapOverlay').hidden===false||$('#noticeModal').hidden===false||$('#shopOverlay').hidden===false)return;worldFromEvent(e);const hits=raycaster.intersectObjects(pickables,true);if(hits.length){const obj=hits[0].object;const ra=obj.userData.roomAct;if(ra){const o=new THREE.Vector3();obj.getWorldPosition(o);destination=new THREE.Vector3(Math.max(-6.5,Math.min(6.5,o.x+(obj.userData.dx||0))),0,Math.max(-4.8,Math.min(4.8,o.z+(obj.userData.dz??1.8))));pendingAct={act:ra,x:o.x,z:o.z,dest:destination};tapBurst(destination.x,destination.z);return;}const id=obj.userData.placeId;if(id){const p=places.find(q=>q.id===id);if(p){destination=new THREE.Vector3(p.fx,0,p.fz);tapBurst(destination.x,destination.z);openPlace(p);}return;}const aid=obj.userData.artId;if(aid&&window.FTTRArt){const q=window.FTTRArt.front(aid);if(q){destination=new THREE.Vector3(q.x,0,q.z);tapBurst(destination.x,destination.z);}return;}if(obj.userData.action==='merch'){showNotice('✦','FTTR MERCH WALL','Pilih koleksi melalui katalog toko asli. Model rak ini menjadi titik interaksi merchandise di interior. ',[{label:'BUKA KATALOG',acid:true,run:openShop}]);return;}}
  const floor=raycaster.intersectObject(isInside?groundInterior:ground,false)[0];if(floor){const point=floor.point;destination=new THREE.Vector3(point.x,0,point.z);if(isInside){destination.x=Math.max(-6.5,Math.min(6.5,destination.x));destination.z=Math.max(-4.8,Math.min(4.8,destination.z));}else{destination.x=Math.max(-67,Math.min(EAST_X-3,destination.x));destination.z=Math.max(NORTH_Z+4,Math.min(WLD.coastLimit(destination.x),destination.z));}tapBurst(destination.x,destination.z);closePlace();}}
function makeBuildingProxyClick(p){return p;}
const keys=new Set();let joyVec=null;
function moveInput(dt){if(window.FTTRArt?.on)return;let ix=0,iz=0;if(keys.has('w')||keys.has('arrowup')){ix--;iz--;}if(keys.has('s')||keys.has('arrowdown')){ix++;iz++;}if(keys.has('a')||keys.has('arrowleft')){ix--;iz++;}if(keys.has('d')||keys.has('arrowright')){ix++;iz--;}if(joyVec){ix+=joyVec.x+joyVec.y;iz+=-joyVec.x+joyVec.y;}const m=Math.hypot(ix,iz);if(!m)return;destination=null;const speed=moveBase()*(needs.energy<20?.6:1)*Math.min(1,m);player.position.x+=ix/m*speed*dt;player.position.z+=iz/m*speed*dt;player.rotation.y=Math.atan2(ix,iz);}
const inRect=(p,x,z,m)=>{if(!p.rot)return Math.abs(x-p.x)<p.w/2+m&&Math.abs(z-p.z)<p.d/2+m;const dx=x-p.x,dz=z-p.z,c=Math.cos(p.rot),sn=Math.sin(p.rot),lx=dx*c-dz*sn,lz=dx*sn+dz*c;return Math.abs(lx)<p.w/2+m&&Math.abs(lz)<p.d/2+m;};
let ROADW=[],CANALW=[],BASINW=null;
const segDistW=(arr,x,z)=>{let d=99;for(let i=0;i<arr.length-1;i++){const a=arr[i],b=arr[i+1];if(a.cut)continue;const v=dSeg(x,z,a.x,a.z,b.x,b.z);if(v<d)d=v;}return d;};
const blocked=(x,z,m=.35)=>{if(isInside)return false;if(x<-68.5||x>EAST_X-2||z<NORTH_Z+1||z>WLD.coastLimit(x))return true;if(CANALW.length&&segDistW(CANALW,x,z)<2.1&&segDistW(ROADW,x,z)>3.2)return true;if(BASINW&&((x-BASINW.x)/5.4)**2+((z-BASINW.z)/4)**2<1)return true;const f=p=>inRect(p,x,z,m);return places.some(f)||solids.some(f);};
function update(dt){if(window.FTTRArt)window.FTTRArt.update(dt);const px0=player.position.x,pz0=player.position.z;moveInput(dt);if(destination){const dx=destination.x-player.position.x,dz=destination.z-player.position.z,dist=Math.hypot(dx,dz);if(dist<.12)destination=null;else{const speed=moveBase()*(needs.energy<20?.6:1);const step=Math.min(dist,speed*dt);player.position.x+=dx/dist*step;player.position.z+=dz/dist*step;player.rotation.y=Math.atan2(dx,dz);}}
  const bm=ride?ride.margin:.35;if(blocked(player.position.x,player.position.z,bm)){const nx=player.position.x,nz=player.position.z;if(!blocked(nx,pz0,bm))player.position.z=pz0;else if(!blocked(px0,nz,bm))player.position.x=px0;else{player.position.x=px0;player.position.z=pz0;if(destination&&Math.hypot(destination.x-px0,destination.z-pz0)>.5)destination=null;}}
  const tt=performance.now()/1000;{const ps=isInside?1:CITIZEN_S;if(player.scale.x!==ps)player.scale.setScalar(ps);}const mv=dt>0?Math.hypot(player.position.x-px0,player.position.z-pz0)/dt:0;animCitizen(player,dt,mv,tt);if(destination){stuckT=mv<.2?stuckT+dt:0;if(stuckT>.45){destination=null;stuckT=0;}}else stuckT=0;updateTapMarker(dt);if(ride){ride.g.position.set(player.position.x,0,player.position.z);ride.g.rotation.y=player.rotation.y;ride.wheels.forEach(w=>{w.rotation.x+=mv*dt/.32;});}JOBSYS?.update(dt);
  if(pendingAct){if(destination!==pendingAct.dest&&destination!==null){pendingAct=null;}else{const dd=Math.hypot(player.position.x-pendingAct.x,player.position.z-pendingAct.z);if(dd<2.5){const pa=pendingAct;pendingAct=null;destination=null;roomAction(pa.act,pa.x,pa.z);}else if(!destination)pendingAct=null;}}
  if(cameraFollow&&!window.FTTRArt?.on){cameraTarget ||= new THREE.Vector3();cameraTarget.lerp(new THREE.Vector3(player.position.x,0,player.position.z),Math.min(1,dt*2.6));const offset=isInside?new THREE.Vector3(13,19,13):new THREE.Vector3(CAM_OFF[0],CAM_OFF[1],CAM_OFF[2]);camera.position.lerp(cameraTarget.clone().add(offset),Math.min(1,dt*2.6));camera.lookAt(cameraTarget);}
  if(sunLight&&cameraTarget){sunLight.target.position.set(cameraTarget.x,0,cameraTarget.z);sunLight.position.set(cameraTarget.x-12,24,cameraTarget.z+12);}
  const zt=cameraZoom*(isInside?1:BASE_ZOOM);if(camera&&!window.FTTRArt?.on&&Math.abs(camera.zoom-zt)>.001){camera.zoom+=(zt-camera.zoom)*Math.min(1,dt*9);camera.updateProjectionMatrix();}
  if(!isInside){WLD?.update(dt,performance.now()/1000);FARM?.update(dt,performance.now()/1000);cars.forEach(c=>{const u=c.userData;u.t+=u.s*dt;if(u.t>u.hi)u.t=u.lo;if(u.t<u.lo)u.t=u.hi;const gx=u.axis==='x'?u.t:u.lane,gz=u.axis==='x'?u.lane:u.t,f=WARPF(gx,gz);c.position.set(f.x,0,f.z);c.rotation.y=u.base+WARPR(gx,gz);});walkers.forEach(w=>{const u=w.userData;u.t+=u.s*dt;if(Math.abs(u.t)>u.r){u.s*=-1;u.t=Math.sign(u.t)*u.r;}const gx=u.axis==='x'?u.c+u.t:u.side,gz=u.axis==='x'?u.side:u.c+u.t,f=WARPF(gx,gz);w.position.set(f.x,0,f.z);w.rotation.y=u.base+(u.s<0?Math.PI:0)+WARPR(gx,gz);animCitizen(w,dt,Math.abs(u.s),tt);});}
  if(player?.userData.arrow)player.userData.arrow.position.y=2.25+Math.sin(performance.now()*.006)*.1;
  botWorkers.forEach(n=>animCitizen(n,dt,0,tt));
  remoteAvatars.forEach(g=>{const T=g.userData.target;if(!T||!(dt>0))return;const dx=T.x-g.position.x,dz=T.z-g.position.z,d=Math.hypot(dx,dz);let v=0;if(d>.04){v=Math.min(4.2,Math.max(1.2,d*3));const st=Math.min(d,v*dt);g.position.x+=dx/d*st;g.position.z+=dz/d*st;g.rotation.y=Math.atan2(dx,dz);}animCitizen(g,dt,v,tt);});
  if(performance.now()-lastNeedsTick>12000){lastNeedsTick=performance.now();needs.hunger=Math.max(0,needs.hunger-.35);needs.thirst=Math.max(0,needs.thirst-.55);needs.energy=Math.max(0,needs.energy-.22);if(needs.hunger<15||needs.thirst<12)needs.health=Math.max(1,needs.health-.4);needs.mood=Math.max(0,Math.min(100,needs.mood+((needs.hunger+needs.thirst+needs.health+needs.energy)/4-needs.mood)*.08));saveNeeds();updateNeedsUI();}
}
function animate(t){requestAnimationFrame(animate);const dt=Math.min(.05,(t-(lastTime||t))/1000||0);lastTime=t;if(player)update(dt);if(player){const nextDistrict=player.position.z < -72 ? 'Farmland' : player.position.x < -20 ? 'Northside' : player.position.x > 20 ? 'Eastbank' : 'Central City';if(nextDistrict!==activeDistrict){activeDistrict=nextDistrict;$('#districtName').textContent=activeDistrict.toUpperCase();window.FTTROnline?.sendRoom(activeDistrict.toLowerCase().replace(/\s+/g,'-'));}if(t-lastOnlineSync>450){lastOnlineSync=t;window.FTTROnline?.sendPosition(player.position.x,player.position.z,activeDistrict);}}renderer.render(scene,camera);}
window.FTTRCity={name:()=>profile.name,toast:m=>toast(m),teleport(x,z){if(player){player.position.x=x;player.position.z=z;destination=null;}},clearRemotes(){remoteAvatars.forEach((g,id)=>{g.parent?.remove(g);});remoteAvatars.clear();},district:()=>activeDistrict,remoteMove(p){if(!THREE||!scene||p.district!==activeDistrict)return;let g=remoteAvatars.get(p.id);if(!g){let h=0;for(const ch of String(p.id))h=(h*31+ch.charCodeAt(0))>>>0;const cols=['#536fbd','#c4533f','#2f8f5b','#d9a441','#8a5ac8','#d95a8a'],sk=['#d5a07b','#b87d58','#8d5a3c','#f1c7a0'];g=makeCitizen({key:'rm'+(h%6)+'-'+(h%4),shirt:cols[h%6],skin:sk[h%4],hair:'#29231f',pants:'#2e3138'});g.scale.setScalar(CITIZEN_S);g.position.set(Number(p.x)||0,0,Number(p.z)||0);scene.add(g);remoteAvatars.set(p.id,g);}g.userData.target={x:Number(p.x)||0,z:Number(p.z)||0};},removeRemote(id){const g=remoteAvatars.get(id);if(g){scene.remove(g);remoteAvatars.delete(id);}}};
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
  if(app==='travel'){body.innerHTML=`<div class="phone-widget"><small>CENTRAL STATION</small><h3>Next stop: elsewhere.</h3><p>Jaringan antarkota akan menghubungkan Central City dengan kota klub.</p></div><div class="service-list">${row('🚆','Northside','Train ticket · ₡100 · 2 clubs','ticket:north','₡100')}${row('🚆','Eastbank','Train ticket · ₡100 · 2 clubs','ticket:east','₡100')}${row('🏟️','Old Trafford','Stadion sudut barat laut · ₡100','ticket:stadium-ot','₡100')}${row('🏟️','GBK','Stadion sudut timur laut · ₡100','ticket:stadium','₡100')}${row('🏟️','Stadion Maguwo','Stadion sudut tenggara · ₡100','ticket:stadium-maguwo','₡100')}${row('🌾','Farmland','Ladang · peternakan · pekerjaan tani · ₡100','ticket:farm','₡100')}${row('🚆','Central City','Kembali ke pusat · ₡100','ticket:central','₡100')}${row('🚌','Away-day coach','Matchday supporter trip · ₡60','ticket:away','₡60')}${row('🎟','Central Ground','Automatic league match · ₡80','ticket:match','₡80')}</div><p class="fineprint">Tarif langsung dibayar dengan uang virtual lalu kamu tiba di tujuan. Mode solo: data tersimpan di perangkat ini.</p>`;return;}
  if(app==='football'){body.innerHTML=window.FTTRFootball?window.FTTRFootball.render(window.FTTRFootballTab||'league'):'<div class="message">Football engine is loading…</div><button class="solid-btn" data-action="stadium">GO TO CENTRAL GROUND</button>';return;}
  if(app==='jobs'){body.innerHTML=JOBSYS?JOBSYS.renderApp():'<div class="message">Memuat pekerjaan…</div>';return;}
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
const GUESTNAME='WARGA_'+String(localStorage.getItem('fttr.city.guest')||'0000').replace(/[^0-9a-z]/gi,'').slice(-4).toUpperCase();
const profile=(()=>{try{return {name:GUESTNAME,club:'northside-fc',hair:'#29231f',shirt:'#d7ff3f',skin:'#c98f68',...JSON.parse(localStorage.getItem('fttr.city.profile')||'{}')}}catch{return {name:GUESTNAME,club:'northside-fc',hair:'#29231f',shirt:'#d7ff3f',skin:'#c98f68'}}})();
let home=(()=>{try{return JSON.parse(localStorage.getItem('fttr.city.home')||'null')}catch{return null}})();let tickets=Number(localStorage.getItem('fttr.city.tickets')||0),lastRest=0;
const RENT={room:['🛏','Kamar sewa',300,50,10],apt:['🏢','Apartemen',700,100,18]};
const clean=s=>String(s).replace(/[^\w .-]/g,'').slice(0,14)||'CITIZEN';
function saveProfile(){localStorage.setItem('fttr.city.profile',JSON.stringify(profile));}
function applyProfile(){if(!player)return;M['citizen-skin']?.color.set(profile.skin);M['citizen-shirt']?.color.set(profile.shirt);M['citizen-hair']?.color.set(profile.hair);const n=document.querySelector('#hudName');if(n)n.textContent=profile.name;}
const homeActive=()=>home&&home.until>Date.now();
const swatch=(k,list)=>`<div style="display:flex;gap:8px;margin:0 0 12px">${list.map(c=>`<button class="subtle-btn" style="background:${c};width:36px;min-height:36px;padding:0;${profile[k]===c?'outline:3px solid #171914':''}" data-action="style:${k}:${c}" aria-label="${k} ${c}"></button>`).join('')}</div>`;
function housingHTML(){return `<div class="phone-widget"><small>HOUSING</small><h3>${homeActive()?RENT[home.type][1]:'Belum punya tempat tinggal'}</h3><p>${homeActive()?'Sewa aktif sampai '+new Date(home.until).toLocaleDateString('id-ID')+'. Tidur memulihkan Energy dan Mood.':'Gunakan tempat istirahat publik gratis atau sewa tempat tinggal dengan uang virtual.'}</p>${needsSummary()}</div><div class="service-list">${row('🪑','Tempat istirahat publik','Gratis · Energy +15 · jeda 1 menit','house-rest','OPEN')}${homeActive()?row('😴','Tidur',`Energy +${RENT[home.type][3]} · Mood +${RENT[home.type][4]} · Hunger/Thirst −10`,'house-sleep','OPEN'):''}${Object.entries(RENT).map(([k,v])=>row(v[0],v[1],`₡${v[2]} / 7 hari · Energy +${v[3]} saat tidur`,'house-rent:'+k,'₡'+v[2])).join('')}</div><p class="fineprint">Uang virtual, tidak bisa ditarik. Sewa dan tidur masih tersimpan lokal di browser.</p>`;}
function profileHTML(){return `<div class="phone-widget"><small>CITIZEN PROFILE</small><h3>${profile.name}</h3><p>Klub: ${CLUBS.find(c=>c[0]===profile.club)?.[1]} · Tiket stadion: ${tickets}</p>${needsSummary()}</div><label class="mini-label" for="profName">NAMA TAMPILAN</label><input class="input" id="profName" maxlength="14" value="${profile.name}"><label class="mini-label" for="profClub">KLUB FAVORIT</label><select class="select" id="profClub">${CLUBS.map(c=>`<option value="${c[0]}" ${c[0]===profile.club?'selected':''}>${c[1]}</option>`).join('')}</select><span class="mini-label">RAMBUT</span>${swatch('hair',['#29231f','#7a4b2a','#d9b25f','#e8e2cc','#c4533f'])}<span class="mini-label">KAOS</span>${swatch('shirt',['#d7ff3f','#c4533f','#4a6fa5','#e8e2cc','#2f3a34'])}<span class="mini-label">KULIT</span>${swatch('skin',['#f1c7a0','#d5a07b','#c98f68','#8d5a3c','#5a3a28'])}<button class="solid-btn acid" data-action="profile-save">SIMPAN PROFIL</button>`;}
function handleAction(action){if(action==='profile-save'){profile.name=clean($('#profName').value);profile.club=$('#profClub').value;saveProfile();applyProfile();window.FTTROnline?.hello?.();toast('Profil disimpan');renderPhone('profile');return;}
if(action.startsWith('style:')){const [,k,c]=action.split(':');profile[k]=c;saveProfile();applyProfile();renderPhone('profile');return;}
if(action==='house-rest'){if(Date.now()-lastRest<60000){toast('Tunggu sebentar sebelum istirahat lagi');return;}lastRest=Date.now();recoverNeed('energy',15);toast('Istirahat sebentar · Energy +15');renderPhone('housing');return;}
if(action==='house-sleep'&&homeActive()){const r=RENT[home.type];needs.energy=Math.min(100,needs.energy+r[3]);needs.mood=Math.min(100,needs.mood+r[4]);needs.hunger=Math.max(0,needs.hunger-10);needs.thirst=Math.max(0,needs.thirst-10);saveNeeds();updateNeedsUI();toast('Tidur nyenyak · Energy dan Mood naik');renderPhone('housing');return;}
if(action.startsWith('house-rent:')){const r=RENT[action.slice(11)];if(!r)return;if(money<r[2]){toast('Saldo tidak cukup');return;}setMoney(money-r[2]);home={type:action.slice(11),until:Date.now()+7*864e5};localStorage.setItem('fttr.city.home',JSON.stringify(home));toast('Sewa '+r[1]+' aktif 7 hari');renderPhone('housing');return;}if(action.startsWith('store-link:')){const l=STORE_LINKS.find(x=>x[0]===action.slice(11));if(l){closePhone();openShop(l[3].startsWith('http')?l[3]:STORE_BASE+l[3],l[2]);}return;}if(action.startsWith('football-')){const result=window.FTTRFootball?.handle(action);if(result?.msg)toast(result.msg);if(result?.rerender)renderPhone('football');return;}if(action==='send-chat'){const val=$('#chatDraft')?.value.trim();if(!val){toast('Tulis pesan terlebih dahulu');return;}const msg=document.createElement('div');msg.className='message';msg.innerHTML=`<b>YOU · JUST NOW</b>`;msg.append(document.createTextNode(val));$('#phoneBody').insertBefore(msg,$('#phoneBody').querySelector('.fineprint'));toast('Pesan tersimpan sebagai demo lokal');return;}
  if(action.startsWith('goto:')){const id=action.split(':')[1];const p=places.find(q=>q.id===id);closePhone();$('#mapOverlay').hidden=true;if(p){destination=new THREE.Vector3(p.fx,0,p.fz);openPlace(p);}return;}
  if(action.startsWith('coming:')){showNotice('⇄',action.split(':')[1],'Kota ini sudah masuk dalam rancangan dunia, tetapi belum tersedia di prototype pertama.');return;}
  if(action.startsWith('food:')){const key=action.split(':')[1],items=FOOD_ITEMS;const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);recoverNeed(item.need,item.value);if(item.extra)Object.entries(item.extra).forEach(([k,v])=>recoverNeed(k,v));showNotice('＋','ORDER CONFIRMED',`${item.name}: ${item.need==='hunger'?'Hunger':'Thirst'} +${item.value}. Sisa saldo ₡${money.toLocaleString('id-ID')}.`);renderPhone('food');return;}
  if(action.startsWith('health:')){const key=action.split(':')[1],items={check:{name:'Hospital check-up',cost:180,health:45,energy:15},kit:{name:'First-aid kit',cost:90,health:20},rest:{name:'Rest at home',cost:0,energy:25},emergency:{name:'Emergency treatment',cost:350,health:100},ward:{name:'Ward bed rest',cost:60,health:25,energy:40}};const item=items[key];if(!item)return;if(money<item.cost){toast('Saldo virtual tidak cukup');return;}setMoney(money-item.cost);if(item.health===100)needs.health=100;else if(item.health)recoverNeed('health',item.health);if(item.energy)recoverNeed('energy',item.energy);saveNeeds();updateNeedsUI();showNotice('✚','HEALTH SERVICE',`${item.name} selesai. Health ${Math.round(needs.health)}/100 · Energy ${Math.round(needs.energy)}/100.`);renderPhone('health');return;}
  if(action.startsWith('ticket:')){const key=action.split(':')[1];if(key in DEST||key.startsWith('stadium')){closePhone();rideTo(key,100);return;}if(key==='away'){closePhone();rideTo('east',60);return;}if(key==='match'){if(money<80){toast('Saldo virtual tidak cukup');return;}setMoney(money-80);tickets++;localStorage.setItem('fttr.city.tickets',tickets);recoverNeed('mood',8);showNotice('🎟','TIKET PERTANDINGAN','Tiket Central Ground ditambahkan. Total tiketmu: '+tickets);return;}return;}
  if(action==='book-ride'){const sel=$('#rideDestination');const p=places.find(q=>q.id===sel?.value);if(money<100){toast('Saldo virtual tidak cukup');return;}setMoney(money-100);closePhone();if(p){destination=new THREE.Vector3(p.fx,0,p.fz);openPlace(p);}toast('Ride booked · tarif demo ₡100');return;}
  if(action.startsWith('mission:')){JOBSYS?.start(action.split(':')[1]);return;}if(action==='mission-cancel'){JOBSYS?.cancel();return;}
  if(action==='enter-store'){closePhone();if(isInside){toast('Kamu sudah berada di dalam store');return;}const p=places.find(q=>q.id==='fttr');destination=new THREE.Vector3(p.x,0,p.z+2.5);openPlace(p);return;}
  if(action==='open-shop'){openShop();return;}if(action==='stadium'){closePhone();const p=places.find(q=>q.id==='stadium');destination=new THREE.Vector3(p.x,0,p.z+4);openPlace(p);return;}
}
function bindUI(){ $('#phoneBtn').onclick=()=>openPhone();$('#phoneClose').onclick=closePhone;$('#phoneHome').onclick=()=>renderPhone('home');$('#phoneHome').ondblclick=closePhone;$('#phoneOverlay').addEventListener('click',e=>{if(e.target.id==='phoneOverlay')closePhone();});$('#phoneBody').addEventListener('click',e=>{const app=e.target.closest('[data-open-app]');if(app){renderPhone(app.dataset.openApp);return;}const a=e.target.closest('[data-action]');if(a)handleAction(a.dataset.action);});$('#mapBtn').onclick=openMap;$('#zoomIn').onclick=()=>applyZoom(cameraZoom+.15);$('#zoomOut').onclick=()=>applyZoom(cameraZoom-.15);$('#cameraReset').onclick=resetCamera;$('#cameraFollow').onclick=()=>{cameraFollow=!cameraFollow;if(cameraFollow)resetCamera();else{$('#cameraFollow').classList.remove('active');toast('Kamera bebas · geser untuk melihat kota');}};$('#needsAction').onclick=()=>openPhone(needs.health<35?'health':'food');$('#mapClose').onclick=()=>$('#mapOverlay').hidden=true;$('#mapOverlay').addEventListener('click',e=>{if(e.target.id==='mapOverlay')$('#mapOverlay').hidden=true;});$('#mapList').addEventListener('click',e=>{const b=e.target.closest('[data-map-place]');if(!b)return;const p=places.find(q=>q.id===b.dataset.mapPlace);if(!p){$('#mapOverlay').hidden=true;showNotice('⇄',b.dataset.mapPlace,'Kota ini belum tersedia di prototype.');return;}$('#mapOverlay').hidden=true;destination=new THREE.Vector3(p.fx,0,p.fz);openPlace(p);});$('#placeClose').onclick=closePlace;$('#placeEnter').onclick=enterPlace;$('#exitBuilding').onclick=exitStore;$('#shopClose').onclick=closeShop;$('#noticeClose').onclick=()=>$('#noticeModal').hidden=true;$('#noticeModal').addEventListener('click',e=>{if(e.target.id==='noticeModal')$('#noticeModal').hidden=true;});document.querySelectorAll('.quickbar [data-app]').forEach(b=>b.onclick=()=>{if(b.dataset.app==='map')openMap();else if(b.dataset.app==='phone')openPhone();else openPhone(b.dataset.app);});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePhone();closePlace();$('#mapOverlay').hidden=true;$('#noticeModal').hidden=true;closeShop();}});
  $('#gfxBtn')?.addEventListener('click',()=>{gfxMode=gfxMode==='pixel'?'hd':'pixel';try{localStorage.setItem('fttr.city.gfx',gfxMode);}catch{}resize();toast(gfxMode==='pixel'?'Gambar: semi-pixel':'Gambar: HD halus (aktif penuh setelah muat ulang)');});
}
async function init(){setMoney(money);bindUI();try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');}catch(e){$('#toast').textContent='3D engine gagal dimuat. Periksa koneksi internet.';$('#toast').classList.add('show');const bs=$('#boot small');if(bs)bs.textContent='3D engine gagal dimuat. Periksa koneksi internet lalu muat ulang.';return;}
  WLD=createWorld({THREE,group:()=>cityGroup,RND,solids,VR:[...new Set(V_ROADS.map(r=>r.x))],gable,sign,faceRot,warp:WARPF});
  scene=new THREE.Scene();scene.background=new THREE.Color('#9fdcf6');scene.fog=new THREE.Fog('#9fdcf6',105,200);camera=new THREE.OrthographicCamera(-18,18,18,-18,.1,200);camera.position.set(CAM_OFF[0],CAM_OFF[1],CAM_OFF[2]);camera.zoom=BASE_ZOOM;cameraTarget=new THREE.Vector3(0,0,0);camera.lookAt(cameraTarget);raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();renderer=new THREE.WebGLRenderer({canvas,antialias:gfxMode!=='pixel'&&Math.min(devicePixelRatio||1,2)<1.8,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  scene.add(new THREE.HemisphereLight('#fff6e2','#86b07a',2.3));sunLight=new THREE.DirectionalLight('#fff1cf',2.6);sunLight.position.set(-12,24,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(matchMedia('(pointer:coarse)').matches?1024:2048,matchMedia('(pointer:coarse)').matches?1024:2048);sunLight.shadow.camera.left=-32;sunLight.shadow.camera.right=32;sunLight.shadow.camera.top=32;sunLight.shadow.camera.bottom=-32;sunLight.shadow.camera.far=120;scene.add(sunLight,sunLight.target);
  createCity();createBotWorkers();createInterior();createPlayer();createTapMarker();
  JOBSYS=createJobs({THREE,scene,player:()=>player,places:()=>places,houseSpots,blocked,toast,showNotice,closePhone,cancelDest:()=>{destination=null;},isInside:()=>isInside,needs,saveNeeds,updateNeedsUI,getMoney:()=>money,setMoney,online:()=>window.FTTROnline,rerender:()=>{if(!$('#phoneOverlay').hidden)renderPhone('jobs');},setRide,setHeld,farm:farmPtsWorld,warp:WARPF,streetPts:jobStreetPts,corners:jobCorners,makeVehicleModel,project:projectToScreen});
  $('#mCancel')?.addEventListener('click',()=>JOBSYS.cancel());
  resize();window.FTTRArt?.init({THREE,scene,camera,cityGroup,pickables,solids,surfaces:warpSurf(),canvas,getPlayer:()=>player,getViewH:()=>viewH,raycastFrom:e=>{worldFromEvent(e);return raycaster;},profile,toast,getFollow:()=>cameraFollow,setFollow:v=>{cameraFollow=v;},isInside:()=>isInside});canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{dragState=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();applyZoom(cameraZoom+(e.deltaY<0?.1:-.1));},{passive:false});canvas.addEventListener('touchmove',touchPinch,{passive:false});window.addEventListener('resize',resize);addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if('wasd'.includes(k)&&k.length===1||k.startsWith('arrow')){keys.add(k);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
  {const joy=$('#joy'),knob=$('#joyKnob');let act=null;const mv=e=>{const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}joyVec=m>.2?{x,y}:null;knob.style.transform=`translate(${x*30}px,${y*30}px)`;};const end=()=>{act=null;joyVec=null;knob.style.transform='';};joy.addEventListener('pointerdown',e=>{act=e.pointerId;joy.setPointerCapture(act);mv(e);});joy.addEventListener('pointermove',e=>{if(act===e.pointerId)mv(e);});joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);}
  applyProfile();updateNeedsUI();$('#cameraFollow')?.classList.add('active');requestAnimationFrame(animate);setTimeout(()=>$('#hint')?.classList.add('hide'),9000);setTimeout(()=>$('#boot')?.classList.add('done'),250);toast('Selamat datang di FTTR CITY');}
init();
