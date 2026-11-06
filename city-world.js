/* FTTR CITY — dekorasi dunia (v13): pantai & laut, pier, bianglala, menara kota, taman kolam,
   tekstur rumput/air, dan penggabungan geometri statis supaya ringan di HP.
   Dipanggil dari city.js lewat createWorld(ctx). Tidak mengubah logika game. */
export function createWorld(C){
 const T=C.THREE,G=()=>C.group(),RND=C.RND;
 const COAST_Z=56,SAND_Z=58.2,PIER_X=22,XL=-75,XR=215,XM=(XL+XR)/2,XW=XR-XL;
 const shoreZ=x=>64+Math.sin(x*.11)*1.3+Math.sin(x*.047+1)*1.7;
 const coastLimit=x=>Math.abs(x-PIER_X)<1.7?79:shoreZ(x)-.9;
 const reserved=[];            // persegi yang tidak boleh diisi bangunan acak: [x1,x2,z1,z2]

 /* ---------- rute kereta lintas kota (v27): Kota Lain (seberang laut) -> Desa -> Central City -> terowongan ---------- */
 const RT={ZC:-14.8,AMP:2,LEN:8.5,XW:-125,ZV:-122,ZK:-150,XK:-221,XP:93.5,XE:102.8};
 const crm=(P,step)=>{const o=[],n=P.length;for(let i=0;i<n-1;i++){const a=P[Math.max(0,i-1)],b=P[i],c=P[i+1],d=P[Math.min(n-1,i+2)],m=Math.max(2,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/step));for(let k=0;k<m;k++){const t=k/m,t2=t*t,t3=t2*t,f=(p,q,r,s)=>.5*(2*q+(-p+r)*t+(2*p-5*q+4*r-s)*t2+(-p+3*q-3*r+s)*t3);o.push([f(a[0],b[0],c[0],d[0]),f(a[1],b[1],c[1],d[1])]);}}o.push(P[n-1]);return o;};
 const cityZ=(x,sx)=>RT.ZC+RT.AMP*Math.sin((x-sx)/RT.LEN)*(Math.abs(x-sx)<2?Math.abs(x-sx)/2:1);
 const routePts=sx=>{const A=[[RT.XK,RT.ZK],[-196,RT.ZK],[-168,RT.ZK],[-148,RT.ZK],[-137,RT.ZK+1],[-130,-143],[RT.XW,-132],[RT.XW,-110],[RT.XW,-80],[RT.XW,-50],[RT.XW,-30],[-122,-19.5],[-116,cityZ(-116,sx)],[-110,cityZ(-110,sx)],[-104,cityZ(-104,sx)]];const out=crm(A,1.2);for(let x=-102.8;x<=RT.XE+.01;x+=1.2)out.push([x,cityZ(x,sx)]);return out;};
 routePts(0).forEach((p,i)=>{if(p[0]<-112&&p[0]>-148&&i%6===0)reserved.push([p[0]-5.5,p[0]+5.5,p[1]-5.5,p[1]+5.5]);});
 const anim={boats:[],ferries:[],wheel:null,gond:[],tex:null};
 const M={};
 const mat=(k,color,extra)=>M[k]||(M[k]=new T.MeshStandardMaterial({color,roughness:.85,...(extra||{})}));
 const flat=(k,color)=>mat(k,color,{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,roughness:1});
 const cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;};
 const tex=(c,rep,nearest)=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);if(nearest)t.magFilter=T.NearestFilter;t.anisotropy=2;return t;};
 const put=(m,parent,o)=>{o=o||{};m.castShadow=o.cast!==false;m.receiveShadow=true;(parent||G()).add(m);return m;};
 const bx=(p,w,h,d,col,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),typeof col==='string'?mat(col,col):col);m.position.set(x,y,z);return put(m,p);};
 const cy=(p,r1,r2,h,col,x,y,z,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg||12),typeof col==='string'?mat(col,col):col);m.position.set(x,y,z);return put(m,p);};
 const strut=(p,x1,y1,x2,y2,z,r,col)=>{const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),m=new T.Mesh(new T.CylinderGeometry(r,r,L,6),typeof col==='string'?mat(col,col):col);m.position.set((x1+x2)/2,(y1+y2)/2,z);m.rotation.z=Math.atan2(-dx,dy);return put(m,p);};

 /* ---------- rumput bertekstur (tidak flat) ---------- */
 function grassMat(rep){
  const c=cv(64,64,(x,w,h)=>{x.fillStyle='#72cc47';x.fillRect(0,0,w,h);const r=RND(11);
   for(let i=0;i<150;i++){const v=r();x.fillStyle=v<.5?'#7ad84e':v<.8?'#66bd3e':'#8be25a';x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,2,2);}
   for(let i=0;i<9;i++){x.fillStyle=['#ffe14a','#ff7aa8','#ffffff'][i%3];x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,2,2);}});
  return new T.MeshStandardMaterial({map:tex(c,rep||[36,34],true),roughness:1});
 }


 /* ---------- PULAU ORGANIK (v19): garis pantai tak beraturan, teluk & tanjung; kota ada di tengah, kabupaten di sudut ---------- */
 const XL2=-142,XR2=282;
 const LAND=(()=>{
  const c=[[-120,-236],[-92,-254],[-58,-244],[-24,-264],[14,-247],[52,-259],[92,-243],[128,-263],[168,-246],[204,-262],[238,-249],[262,-226],[276,-196],[262,-162],[284,-126],[266,-92],[286,-56],[270,-20],[288,14],[272,46]];
  for(let x=276;x>=-136;x-=34)c.push([x,shoreZ(x)+3.5]);
  [[-144,64],[-130,36],[-150,2],[-132,-34],[-152,-70],[-134,-106],[-154,-140],[-130,-176],[-148,-206]].forEach(p=>c.push(p));
  const n=c.length,out=[];
  for(let i=0;i<n;i++){const p0=c[(i-1+n)%n],p1=c[i],p2=c[(i+1)%n],p3=c[(i+2)%n];
   for(let k=0;k<7;k++){const t=k/7,t2=t*t,t3=t2*t,f=(a,b,cc,d)=>.5*((2*b)+(-a+cc)*t+(2*a-5*b+4*cc-d)*t2+(-a+3*b-3*cc+d)*t3);out.push([f(p0[0],p1[0],p2[0],p3[0]),f(p0[1],p1[1],p2[1],p3[1])]);}}
  return out;})();
 const area=P=>{let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
 const insetPoly=(P,w)=>{const n=P.length,sg=area(P)>0?1:-1;return P.map((p,i)=>{const a=P[(i-1+n)%n],b=P[(i+1)%n],tx=b[0]-a[0],tz=b[1]-a[1],L=Math.hypot(tx,tz)||1;return [p[0]+sg*tz/L*w,p[1]-sg*tx/L*w];});};
 const inPoly=(P,x,z)=>{let o=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])o=!o;}return o;};
 const shrink=(w)=>{const A=insetPoly(LAND,w),B=insetPoly(LAND,-w);return Math.abs(area(A))<Math.abs(area(B))?A:B;};
 const WALK=shrink(2.5),SANDIN=shrink(7);
 const inLand=(x,z)=>(x>-70&&x<212&&z>-192)?true:inPoly(WALK,x,z);
 const polyShape=(P,hole)=>{const s=new T.Shape();P.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));s.closePath();if(hole){const h=new T.Path();hole.forEach((p,i)=>i?h.lineTo(p[0],-p[1]):h.moveTo(p[0],-p[1]));h.closePath();s.holes.push(h);}return s;};
 function makeGround(){const m=shapeMesh(polyShape(LAND),grassMat([.125,.125]),-.08);m.userData.noWarp=true;return m;}

 /* ---------- air (satu tekstur, digeser tiap frame) ---------- */
 const waterTex=tex(cv(128,128,(x,w,h)=>{x.fillStyle='#2fb4e6';x.fillRect(0,0,w,h);const r=RND(5);
  x.strokeStyle='rgba(255,255,255,.3)';x.lineWidth=2;
  for(let i=0;i<14;i++){const px=r()*(w-30),py=r()*h,l=10+r()*16;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+l/2,py-3,px+l,py);x.stroke();}
  x.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<10;i++)x.fillRect(Math.floor(r()*64)*2,Math.floor(r()*64)*2,2,2);
  x.fillStyle='rgba(10,90,170,.2)';for(let i=0;i<12;i++)x.fillRect(Math.floor(r()*60)*2,Math.floor(r()*64)*2,4,2);}),[.125,.125],true);
 anim.tex=waterTex;
 const waterMat=new T.MeshStandardMaterial({map:waterTex,roughness:.4,metalness:.05});
  const waterTop=waterMat.clone();waterTop.polygonOffset=true;waterTop.polygonOffsetFactor=-2;waterTop.polygonOffsetUnits=-2;   // air sungai/danau/kolam: ikut urutan lapisan datar (tidak tertutup tepi pasir)

 const shapeMesh=(shape,material,y)=>{const m=new T.Mesh(new T.ShapeGeometry(shape),material);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.userData.noMerge=true;G().add(m);return m;};
 const rectShape=(x1,x2,z1,z2)=>{const s=new T.Shape();s.moveTo(x1,-z1);s.lineTo(x2,-z1);s.lineTo(x2,-z2);s.lineTo(x1,-z2);s.closePath();return s;};
 function band(x0,x1,top,bot){const s=new T.Shape(),xs=[];for(let x=x0;x<=x1+.01;x+=2)xs.push(x);
  s.moveTo(xs[0],-top(xs[0]));xs.forEach(x=>s.lineTo(x,-top(x)));for(let i=xs.length-1;i>=0;i--)s.lineTo(xs[i],-bot(xs[i]));s.closePath();return s;}
 function ellipse(cx,cz,rx,rz,n){const s=new T.Shape();for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,px=cx+Math.cos(a)*rx*(1+Math.sin(a*3)*.06),pz=cz+Math.sin(a)*rz*(1+Math.cos(a*2)*.07);if(i===0)s.moveTo(px,-pz);else s.lineTo(px,-pz);}return s;}

 /* ---------- sungai & danau (v21): membelah pusat kota, mengalir ke pantai barat ---------- */
 function river(){
  const L=C.layout,hw=C.RIVER_HW,pts=L.rpts,lk=C.LAKE,s=new T.Shape();
  pts.forEach((p,i)=>{const x=p.x-p.tz*hw,z=p.z+p.tx*hw;if(i)s.lineTo(x,-z);else s.moveTo(x,-z);});
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];s.lineTo(p.x+p.tz*hw,-(p.z-p.tx*hw));}s.closePath();
  shapeMesh(s,waterTop,.016);
  shapeMesh(ellipse(lk.x,lk.z,lk.rx+1.1,lk.rz+1.1,48),flat('lake-edge','#e3d6b0'),.011);shapeMesh(ellipse(lk.x,lk.z,lk.rx,lk.rz,48),waterTop,.018);
  pts.forEach((p,i)=>{if(i%1)return;[-1,1].forEach(sd=>{const x=p.x-p.tz*sd*(hw+.25),z=p.z+p.tx*sd*(hw+.25);if(C.layout.roadDist(x,z)<4.2||x<-66)return;const m=bx(G(),.45,.26,3.3,'#8f8f80',x,.11,z);m.rotation.y=Math.atan2(p.tx,p.tz);});});
 }

 /* ---------- pulau: laut luas, tepi pasir, pantai selatan ---------- */
 function island(){
  shapeMesh(rectShape(-450,450,-450,450),waterMat,-.12);                        // laut di bawah pulau
  const sand=flat('sand','#f6dc9a'),wet=flat('wet','#e6c680'),foam=mat('foam','#effcff',{roughness:.6,transparent:true,opacity:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  // tepi pulau (barat, timur, utara)
  shapeMesh(polyShape(LAND,SANDIN),sand,-.05);
  // air pantai selatan (di atas rumput), pasir bergelombang, pasir basah, buih
  shapeMesh(band(-450,450,x=>shoreZ(x)-1.6,()=>450),waterMat,.02);
  shapeMesh(band(XL2,XR2,()=>SAND_Z,x=>shoreZ(x)),sand,.03);
  shapeMesh(band(XL2,XR2,x=>shoreZ(x)-1.1,x=>shoreZ(x)),wet,.034);
  shapeMesh(band(XL2,XR2,x=>shoreZ(x),x=>shoreZ(x)+.7+Math.sin(x*.9)*.35),foam,.028);
  // promenade batu + curb
  bx(G(),XW,.1,2.4,'#ebe1ca',XM,.05,COAST_Z+1.2);bx(G(),XW,.16,.3,'#bfb49a',XM,.08,COAST_Z-.05);bx(G(),XW,.12,.25,'#cfc4a8',XM,.07,SAND_Z+.1);
  // ujung jalan utara-selatan berhenti di promenade: bollard
  C.VR.forEach(v=>[-1,1].forEach(s=>cy(G(),.14,.14,.7,'#d94a3a',v+s*2.2,.4,COAST_Z-.7,8)));
 }

 /* ---------- palem ---------- */
 const leafGeo=(()=>{const g=new T.ConeGeometry(.26,1.8,4);g.rotateZ(-Math.PI/2-.5);g.translate(.75,-.2,0);return g;})();
 function palm(x,z,s,seed){
  const lean=(seed%5-2)*.05,top=3.1*s;
  const tr=new T.Mesh(new T.CylinderGeometry(.1*s,.18*s,top,6),mat('palm-trunk','#8a6a46'));tr.position.set(x+lean*top*.5,top/2,z);tr.rotation.z=-lean;put(tr);
  for(let k=0;k<6;k++){const l=new T.Mesh(leafGeo,mat(k%2?'palm-a':'palm-b',k%2?'#37a84a':'#2c9440'));l.position.set(x+lean*top,top,z);l.rotation.y=k*Math.PI/3+seed;l.scale.setScalar(s);put(l);}
  const nut=new T.Mesh(new T.SphereGeometry(.14*s,6,5),mat('coco','#5b3b22'));nut.position.set(x+lean*top,top-.1,z);put(nut);
 }

 /* ---------- bianglala (berputar) ---------- */
 function ferris(x,z){
  const root=new T.Group();root.position.set(x,0,z);root.rotation.y=Math.PI/4;root.userData.noMerge=true;G().add(root);
  const R=5.2,cy0=6.4,col='#e8eef5';
  [-.9,.9].forEach(zz=>{strut(root,-2.6,0,0,cy0,zz,.14,col);strut(root,2.6,0,0,cy0,zz,.14,col);});
  [-1,1].forEach(s=>bx(root,.4,.3,2.4,'#6b7d92',s*2.7,.15,0));
  cy(root,.28,.28,2,'#8aa0b8',0,cy0,0,8).rotation.x=Math.PI/2;
  const wheel=new T.Group();wheel.position.set(0,cy0,0);root.add(wheel);
  [-.55,.55].forEach(zz=>{const r=new T.Mesh(new T.TorusGeometry(R,.12,6,32),mat('wheel-rim','#ff6a3d'));r.position.z=zz;put(r,wheel);});
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;[-.55,.55].forEach(zz=>strut(wheel,0,0,Math.cos(a)*R,Math.sin(a)*R,zz,.05,'#f2f5f8'));}
  const gc=['#ffd23f','#ff6a8a','#4ec0ff','#7be05a','#b78cff','#ff9a3d'];
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,gp=new T.Group();gp.position.set(Math.cos(a)*R,Math.sin(a)*R,0);wheel.add(gp);
   bx(gp,.95,.7,1,mat('gond'+(i%6),gc[i%6]),0,-.62,0);bx(gp,1.05,.12,1.1,'#ffffff',0,-.2,0);cy(gp,.03,.03,.5,'#8aa0b8',0,-.05,0,4);anim.gond.push(gp);}
  anim.wheel=wheel;C.solids.push({x,z,w:7.2,d:3.2});
 }

 /* ---------- mercusuar ---------- */
 function lighthouse(x,z){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(.8);G().add(g);
  cy(g,2.5,2.9,.9,'#8f9aa3',0,.4,0,10);
  const seg=['#e8f0f6','#e5483b','#e8f0f6','#e5483b'];let y=.85;
  seg.forEach((c,i)=>{const r1=1.15-i*.09,r2=r1-.09;cy(g,r2,r1,2.1,c,0,y+1.05,0,12);y+=2.1;});
  cy(g,1.25,1.25,.18,'#2c3a49',0,y+.1,0,12);
  cy(g,.62,.62,1.1,mat('lamp','#fff2a6',{emissive:'#ffd84a',emissiveIntensity:.8}),0,y+.7,0,10);
  const cap=new T.Mesh(new T.ConeGeometry(.95,1,10),mat('lh-roof','#e5483b'));cap.position.y=y+1.75;put(cap,g);
  C.solids.push({x,z,w:4.6,d:4.6});
 }

 /* ---------- Sky Tower FTTR di plaza pantai ---------- */
 function skyTower(x,z){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(.75);G().add(g);
  cy(g,5.4,5.6,.14,'#efe6d2',0,.1,0,28);cy(g,3.4,3.6,.18,'#d7ff3f',0,.13,0,28);cy(g,3.0,3.2,.2,'#f4f1e6',0,.14,0,28);
  cy(g,.55,.9,11,'#e9eef3',0,5.6,0,10);
  cy(g,.95,.95,.35,'#d7ff3f',0,2.2,0,10);
  const pod=new T.Mesh(new T.SphereGeometry(2.2,16,10),mat('sky-pod','#ffcf3f'));pod.scale.y=.5;pod.position.y=11.6;put(pod,g);
  cy(g,2.25,2.25,.55,'#3aa6e6',0,11.6,0,16);
  const top=new T.Mesh(new T.SphereGeometry(1.2,12,8,0,Math.PI*2,0,Math.PI/2),mat('sky-top','#ff6a3d'));top.position.y=12.1;put(top,g);
  cy(g,.04,.2,4.2,'#e9eef3',0,14.5,0,6);
  [-1,1].forEach(s=>{const f=new T.Mesh(new T.BoxGeometry(.18,5,1.6),mat('sky-fin','#ffffff'));f.position.set(s*.75,3.2,0);f.rotation.z=s*-.12;put(f,g);});
  C.solids.push({x,z,w:3.4,d:3.4});
 }

 /* ---------- pier kayu ---------- */
 function pier(){
  const g=G(),zs=60.2,ze=80;
  bx(g,3.6,.28,ze-zs,'#b98a54',PIER_X,.36,(zs+ze)/2);bx(g,3.9,.12,ze-zs-.4,'#a07445',PIER_X,.24,(zs+ze)/2);
  for(let z=zs+1;z<ze;z+=2.4)[-1,1].forEach(s=>{cy(g,.1,.1,1.8,'#6e4d2e',PIER_X+s*1.75,-.3,z,6);cy(g,.05,.05,.9,'#6e4d2e',PIER_X+s*1.8,.9,z,5);});
  [-1,1].forEach(s=>bx(g,.08,.08,ze-zs-1,'#6e4d2e',PIER_X+s*1.8,1.3,(zs+ze)/2));
  [-1,1].forEach(s=>cy(g,.08,.08,2.6,'#3a4350',PIER_X+s*1.7,1.6,ze-.4,6));
  cy(g,.28,.34,.4,mat('pier-lamp','#fff1a8',{emissive:'#ffd84a',emissiveIntensity:.6}),PIER_X,3.1,ze-.4,8);
  cy(g,.06,.06,2.8,'#3a4350',PIER_X,1.6,ze-.4,6);
  // gazebo di ujung pier
  [-1,1].forEach(a=>[-1,1].forEach(b=>cy(g,.08,.08,2.2,'#f2f5f8',PIER_X+a*1.2,1.5,ze-3+b*1.2,6)));
  const roof=new T.Mesh(new T.ConeGeometry(2.1,1,4),mat('gaz-roof','#3aa6e6'));roof.position.set(PIER_X,3.1,ze-3);roof.rotation.y=Math.PI/4;put(roof,g);
 }

 /* ---------- kios pantai ---------- */
 function huts(){
  const defs=[[-54,'KIOS','#ff7a59'],[-14,'SURF','#2fb4e6'],[10,'ICE','#ffcf3f'],[40,'DRINK','#7be05a'],[-28.8,'RENT','#b78cff'],[84,'SATE','#e5483b'],[104,'ES TEH','#3aa6e6'],[134,'JAGUNG','#ffcf3f'],[170,'BAKSO','#7be05a'],[190,'KOPI','#b78cff']];
  defs.forEach(([x,t,c],i)=>{const g=new T.Group();g.position.set(x,0,59.6);G().add(g);
   bx(g,3,2.1,2.4,'#fff6df',0,1.15,0);bx(g,3.3,.14,2.8,'#d8c9a6',0,.1,0);
   C.gable(g,3,2.4,1.1,c,2.2);bx(g,2.6,.12,.7,mat('aw'+i,c),0,1.55,1.5);
   bx(g,1.2,.9,.06,'#2a3a4c',0,1.2,1.22);C.sign(g,t,0,1.95,1.23,1.7,.34,c,'#ffffff');
   [-1,1].forEach(s=>bx(g,.16,.7,.16,'#6e4d2e',s*1.0,.6,1.7));
   C.solids.push({x,z:59.6,w:3.3,d:2.8});});
 }

 /* ---------- payung, kursi pantai, batu ---------- */
 function beachProps(){
  const r=RND(31),cols=['#ff5d6c','#ffcf3f','#2fb4e6','#7be05a','#ff9a3d','#b78cff'];
  const cone=new T.ConeGeometry(1.05,.5,8),keep=x=>!(Math.abs(x-PIER_X)<4||Math.abs(x)<7||Math.abs(x+39)<6.5||(x>47&&x<60)||[-54,-14,10,40,-28.8,84,104,134,170,190].some(h=>Math.abs(x-h)<3));
  let n=0;for(let t=0;t<400&&n<62;t++){const x=-62+r()*252;if(!keep(x))continue;const z=61+r()*Math.max(.5,shoreZ(x)-65.2);if(z>shoreZ(x)-2.2)continue;n++;
   cy(G(),.03,.03,2,'#f2f2ee',x,1,z,5);const u=new T.Mesh(cone,mat('umb'+(n%6),cols[n%6]));u.position.set(x,2.1,z);put(u);
   const rot=r()*Math.PI;[-.9,.9].forEach(s=>{const b=new T.Mesh(new T.BoxGeometry(.5,.12,1.3),mat('bed'+(n%2),n%2?'#ffffff':'#ffe9a8'));b.position.set(x+Math.cos(rot)*s,.18,z+Math.sin(rot)*s*.7);b.rotation.y=rot;put(b);});}
  const rk=new T.DodecahedronGeometry(.9,0);
  for(let i=0;i<14;i++){const x=46+r()*18,z=shoreZ(x)-.6+r()*1.6,s=.5+r()*.9,m=new T.Mesh(rk,mat('rock'+(i%2),i%2?'#8f9aa3':'#a2adb5'));m.position.set(x,.2*s,z);m.scale.set(s,s*.7,s);m.rotation.y=r()*3;put(m);}
 }

 /* ---------- perahu ---------- */
 function sail(x,z,s,col,ph){
  const g=new T.Group();g.position.set(x,.1,z);g.rotation.y=ph;g.scale.setScalar(s);g.userData.noMerge=true;G().add(g);
  bx(g,1.1,.4,2.8,'#ffffff',0,.1,0);bx(g,1.14,.12,2.84,col,0,.26,0);bx(g,.8,.4,1,'#d9e6ef',0,.5,-.4);
  cy(g,.04,.04,3.6,'#6e4d2e',0,2,.2,5);
  const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(0,3);sh.lineTo(1.3,.2);sh.closePath();
  const sm=new T.Mesh(new T.ShapeGeometry(sh),new T.MeshStandardMaterial({color:col,side:T.DoubleSide,roughness:.9}));sm.rotation.y=Math.PI/2;sm.position.set(0,.4,.25);put(sm,g);
  anim.boats.push({g,y:.1,ph,sp:.8+ph*.2});
 }
 function ferry(z,dir,sp,x0){
  const g=new T.Group();g.position.set(x0,.08,z);g.rotation.y=dir>0?Math.PI/2:-Math.PI/2;g.userData.noMerge=true;G().add(g);
  bx(g,2.2,.9,6.4,'#ffffff',0,.35,0);bx(g,2.24,.3,6.44,'#2a74c8',0,.05,0);bx(g,1.8,.8,3,'#f5f8fb',0,1.2,.4);bx(g,1.84,.28,3.04,'#4aa3e0',0,1.3,.4);
  cy(g,.28,.34,.9,'#e5483b',0,2.05,-.4,8);bx(g,2,.12,3.3,'#d94a3a',0,1.65,.4);
  anim.ferries.push({g,dir,sp,z});
 }

 /* ---------- kolam taman ---------- */
 function pond(cx,cz,rx,rz){
  shapeMesh(ellipse(cx,cz,rx+1.1,rz+1.1,28),flat('pond-edge','#e3d6b0'),.025);
  shapeMesh(ellipse(cx,cz,rx,rz,28),waterTop,.04);
  const r=RND(Math.abs(cx)+7);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2+.3,x=cx+Math.cos(a)*(rx+1.9),z=cz+Math.sin(a)*(rz+1.9),s=.9+r()*.6;
   cy(G(),.12,.2,1.4*s,'#7a5a3a',x,.7*s,z,6);const c=new T.Mesh(new T.IcosahedronGeometry(1.2*s,1),mat('willow'+(i%2),i%2?'#4fb84a':'#3ea146'));c.position.set(x,1.9*s,z);c.scale.y=.85;put(c);}
  [[-1,.5],[1.4,-.6],[.2,1]].forEach(([dx,dz])=>{const d=new T.Group();d.position.set(cx+dx*rx*.4,.09,cz+dz*rz*.4);d.userData.noMerge=true;G().add(d);bx(d,.34,.2,.5,'#ffffff',0,.1,0);bx(d,.2,.2,.2,'#ffffff',0,.28,.22);bx(d,.12,.06,.14,'#ff9a3d',0,.28,.38);anim.boats.push({g:d,y:.09,ph:dx*3,sp:1.4,duck:true});});
  [[-1,1],[1,-1]].forEach(([a,b])=>{bx(G(),1.5,.1,.5,'#8a5a36',cx+a*(rx+2.6)*.7,.5,cz+b*(rz+2.6)*.7).rotation.y=a*.5;});
  C.solids.push({x:cx,z:cz,w:rx*2+.6,d:rz*2+.6});
  reserved.push([cx-rx-5,cx+rx+5,cz-rz-5,cz+rz+5]);
 }

 function buildCoast(){
  island();buildDistricts();pier();huts();beachProps();skyTower(0,60.6);ferris(-39,60.6);lighthouse(54,60.6);
  const r=RND(77);
  for(let x=-135,i=0;x<=272;x+=4.1,i++){if(C.VR.some(v=>Math.abs(x-v)<3.6)||Math.abs(x)<6.5)continue;palm(x+r()*1.2,COAST_Z-.6+(i%2)*.5,.9+r()*.5,i);}
  for(let i=0;i<30;i++){const x=-130+i*14+r()*4;if(Math.abs(x-PIER_X)<5||Math.abs(x)<8)continue;palm(x,SAND_Z+.9+r()*.6,1,i+3);}
  sail(-12,71,1,'#ff6a3d',.4);sail(-44,76,1.1,'#2a74c8',1.2);sail(4,82,1,'#ffcf3f',2.4);sail(38,73,1.2,'#e5483b',.9);sail(62,80,1,'#7be05a',1.7);sail(-62,70,.9,'#b78cff',.2);
  ferry(88,1,1.3,-60);ferry(96,-1,1,150);ferry(104,1,1.1,60);sail(100,72,1.1,'#ff6a3d',.6);sail(150,78,1,'#2a74c8',1.4);sail(190,70,1.2,'#ffcf3f',2.1);
  reserved.push([XL,XR,SAND_Z-3,90]);
 }

 /* ---------- KABUPATEN di sudut pulau + hutan + jalan tanah berkelok (v19) ---------- */
 function trail(pts,wd,col,onlyPts){
  const P=[],n=pts.length;
  for(let i=0;i<n-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),m=Math.max(2,Math.round(L/4)),nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L;
   for(let k=0;k<m;k++){const t=k/m,w=Math.sin((i*3+t*3.1)*1.7)*3.2*(k?1:0);P.push([a[0]+(b[0]-a[0])*t+nx*w,a[1]+(b[1]-a[1])*t+nz*w]);}}
  P.push(pts[n-1]);
  if(onlyPts)return P;
  const pos=[],nor=[],uv=[],idx=[];
  P.forEach((p,i)=>{const q=P[Math.min(P.length-1,i+1)],o=P[Math.max(0,i-1)],tx=q[0]-o[0],tz=q[1]-o[1],L=Math.hypot(tx,tz)||1,nx=-tz/L,nz=tx/L;
   [1,-1].forEach(sd=>{pos.push(p[0]+nx*wd*sd,.045,p[1]+nz*wd*sd);nor.push(0,1,0);uv.push(0,0);});});
  for(let i=0;i<P.length-1;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(nor),3));g.setAttribute('uv',new T.BufferAttribute(new Float32Array(uv),2));g.setIndex(idx);
  const m=new T.Mesh(g,flat('trail-'+col,col));m.receiveShadow=true;m.userData.noMerge=true;G().add(m);
  return P;
 }
 const V=(n,x,z,s,to,o={})=>({n,x,z,s,to,v:1,cnt:13,rad:21,fld:8,nb:1,...o});
 const HAM=[
  {n:'KAB. BARAT LAUT',x:-100,z:-212,to:[[-96,-190],[-95,-168]],s:3,v:1,cnt:14,rad:21,fld:8,nb:1},
  {n:'KAB. TIMUR LAUT',x:240,z:-210,to:[[212,-208],[178,-205]],s:7,v:1,cnt:14,rad:21,fld:8,nb:1},
  {n:'KAB. BARAT',x:-100,z:-124,to:[[-96,-92],[-78,-66]],s:11,v:1,cnt:14,rad:21,fld:8},
  {n:'KAB. TIMUR',x:240,z:-124,to:[[232,-92],[214,-66]],s:15,v:1,cnt:14,rad:21,fld:8},
  V('DESA SUKAMAJU',-95,-165,21,[[-98,-146],[-100,-130]]),
  V('DESA TANJUNG',-30,-226,22,[[-66,-218],[-92,-212]]),
  V('DESA LERENG',42,-228,23,[[8,-234],[-26,-228]]),
  V('DESA SERUNI',112,-216,24,[[76,-224],[46,-228]]),
  V('DESA KALI BIRU',176,-204,25,[[146,-212],[116,-216]]),
  V('DESA MUARA',238,-166,26,[[240,-186],[240,-206]],{rad:19}),
  V('DESA PADANG',100,-150,27,[[124,-136],[148,-120]]),
  V('DESA RAWA',150,-112,28,[[150,-90],[152,-66]],{rad:18}),
  V('DESA BUKIT',112,-92,29,[[130,-78],[150,-66]],{rad:17,cnt:11}),
  V('DESA HILIR',-34,-196+4,30,[[-54,-190],[-96,-168]],{rad:15,cnt:9,fld:5})
 ];
 [[152,-168,16,9],[-62,-206,13,7.5],[196,-92,12,7]].forEach(p=>reserved.push([p[0]-p[2]-6,p[0]+p[2]+6,p[1]-p[3]-6,p[1]+p[3]+6]));
 const FIELDS=[],inFarm=(x,z)=>x>-76&&x<74&&z>-198&&z<-64;
 const resvAt=(x,z,m=0)=>reserved.some(r=>x>r[0]-m&&x<r[1]+m&&z>r[2]-m&&z<r[3]+m);
 const TR=[],ANIM_AN=[];
 function hamTp(h){const to=h.to.map(p=>p.slice());if(h.s!==3&&!h.nb){const b=C.boundary&&C.boundary(to[to.length-1][0],to[to.length-1][1]);if(b)to[to.length-1]=b;}return [[h.x,h.z]].concat(to);}

 function civic(h,i,placed,r){
  const nm=h.n.replace(/^DESA |^KAB\. /,'');
  const mk=(dx,dz,w,d,kind)=>{let x=h.x+dx,z=h.z+dz;
   for(let t=0;t<30;t++){if(inPoly(SANDIN,x,z)&&!(C.layout.riverDist(x,z)<8||C.layout.lakeIn(x,z,6))&&!resvAt(x,z,2)&&!TR.some(q=>Math.hypot(q[0]-x,q[1]-z)<w*.5+3.5))break;x=h.x+(r()-.5)*24;z=h.z+(r()-.5)*24;}
   const g=new T.Group();g.position.set(x,0,z);G().add(g);placed.push([x,z]);
   if(kind==='balai'){bx(g,w,2.6,d,'#e8dcc0',0,1.4,0);C.gable(g,w,d,1.5,'#7a3a2a',2.7);bx(g,1.2,1.8,.1,'#5a3b2a',0,1,d/2+.03);C.sign(g,'BALAI DESA',0,2.4,d/2+.12,w*.8,.6,'#2a5a3a','#ffffff');bx(g,.1,3.4,.1,'#8a8a8a',w/2+1,1.7,d/2);bx(g,1.1,.7,.05,'#e5483b',w/2+1.6,3.1,d/2);
    C.regPlace({id:'balai-'+i,name:'BALAI '+nm,type:'BALAI DESA',desc:'Balai desa '+nm+'. Kerja bakti dan istirahat untuk warga.',glyph:'BALAI',tag:'DESA',x,z,w:w+1,d:d+1,H:3.4,group:g});}
   else{bx(g,w,2.2,d,'#c9a56a',0,1.2,0);C.gable(g,w,d,1.2,'#8a3b2d',2.3);for(let k=0;k<6;k++)bx(g,w/6,.1,.9,k%2?'#ffffff':'#e5483b',-w/2+w/12+k*w/6,1.9,d/2+.4,{shadow:false});bx(g,w*.7,.7,.5,'#a8793a',0,.7,d/2+.2);C.sign(g,'WARUNG',0,2.75,d/2+.1,w*.7,.55,'#8a3b2d','#fff2c9');
    C.regPlace({id:'warung-'+i,name:'WARUNG '+nm,type:'WARUNG DESA',desc:'Warung desa: nasi, lauk, dan es teh murah.',glyph:'WARUNG',tag:'DESA',x,z,w:w+1,d:d+1.4,H:3,group:g});}
   C.solids.push({x,z,w:w+.6,d:d+.6});};
  mk(-7,4,6,4,'balai');mk(7,4,4.6,3.4,'warung');
 }
 function hamlet(h){
  const r=RND(h.s*31+5),W=['#ffd98a','#ff9f8a','#8fd3f4','#fff0a8','#ff8f7a','#a6e58a','#c4b0ff','#ffbf5e'],RC=['#e5483b','#d9582f','#2a8bd8','#f2a824','#8a5a36'],placed=[];
  if(h.v){W.splice(0,8,'#d9c9a3','#c2a77a','#e0d2b4','#a98b63','#d2bf95','#b79a6c','#e6dcc2','#9c8460');RC.splice(0,5,'#3b3b45','#4a3a33','#2f3a44','#5a4638','#3a2f2b');}
  const plaza=cy(G(),5.2,5.2,.1,'#e3d6b0',h.x,.06,h.z,18);
  // tiang papan nama kabupaten
  cy(G(),.12,.14,3.2,'#6e4d2e',h.x,1.6,h.z,6);C.sign(G(),h.n,h.x,3.5,h.z+.2,5.4,.9,'#12304f','#d7ff3f');
  C.solids.push({x:h.x,z:h.z,w:1,d:1});
  if(h.v)civic(h,HAM.indexOf(h),placed,r);
  for(let t=0;t<420&&placed.length<(h.cnt||11)+(h.v?2:0);t++){
   const a=r()*Math.PI*2,d=7+Math.sqrt(r())*(h.rad||17),x=h.x+Math.cos(a)*d,z=h.z+Math.sin(a)*d,w=2.4+r()*1.5,dd=2.4+r()*1.2;
   if(!inPoly(SANDIN,x,z))continue;if(C.layout.riverDist(x,z)<8||C.layout.lakeIn(x,z,6))continue;if(placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<(h.v?5:5.4))||resvAt(x,z,2)||inFarm(x,z)||TR.some(q=>Math.hypot(q[0]-x,q[1]-z)<4.6))continue;
   if(z>SAND_Z-8&&z>shoreZ(x)-9)continue;
   if(h.z>0&&Math.abs(z-30)<8&&x<70)continue;
   placed.push([x,z]);
   const g=new T.Group();g.position.set(x,0,z);g.rotation.y=(r()-.5)*1.4+(r()<.5?0:Math.PI/2);G().add(g);
   const hh=(h.v?1.7:1.5)+r()*.8;bx(g,w,hh,dd,mat('hw'+(placed.length%8),W[(placed.length+h.s)%8]),0,hh/2+.1,0);
   C.gable(g,w,dd,.9+r()*.5,RC[(placed.length+h.s)%5],hh+.1);
   bx(g,.7,1.1,.06,'#5a3b2a',0,.65,dd/2+.02);
   C.solids.push({x,z,w:Math.max(w,dd)+.8,d:Math.max(w,dd)+.8});
   if(r()<.5){const pc=new T.Mesh(new T.IcosahedronGeometry(.8,0),mat('hw-bush','#4fb84a'));pc.position.set(x+w/2+.7,.6,z+dd/2);put(pc);}
  }
  if(h.v)fields(h,r,placed);
  return trail(h._tp,1.5,'#d9c79a');
 }

 function fields(h,r,placed){const cols=['#8fbf4a','#c9b84e','#6fae4a','#a67c52','#b6cf5a'];let k=0;
  for(let t=0;t<200&&k<(h.fld||7);t++){const a=r()*6.283,d=14+r()*((h.rad||17)+6),x=h.x+Math.cos(a)*d,z=h.z+Math.sin(a)*d,w=7+r()*6,dd=4+r()*4;
   if(!inPoly(SANDIN,x,z)||C.layout.riverDist(x,z)<9||C.layout.lakeIn(x,z,8)||resvAt(x,z,w*.5)||inFarm(x,z)||TR.some(q=>Math.hypot(q[0]-x,q[1]-z)<w*.5+2.5))continue;
   if(placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<w*.6+3.5)||FIELDS.some(q=>Math.hypot(q[0]-x,q[1]-z)<w))continue;
   if(HAM.some(o=>o!==h&&Math.hypot(o.x-x,o.z-z)<(o.rad||17)+8))continue;
   const g=new T.Group();g.position.set(x,0,z);g.rotation.y=r()*3;G().add(g);
   const col=cols[Math.floor(r()*5)];bx(g,w,.05,dd,mat('fd-'+col,col),0,.05,0,{shadow:false});
   for(let i=-Math.floor(dd/2)+1;i<dd/2;i+=1.6)bx(g,w-.4,.07,.3,mat('fd2','#4f7f33'),0,.07,i,{shadow:false});
   if(r()<.38){const px=mat('fence','#8a6a43'),ex=w/2+.3,ez=dd/2+.3;
    for(let i=-ex;i<=ex+.01;i+=2.6)[-ez,ez].forEach(zz=>bx(g,.16,.8,.16,px,i,.4,zz,{shadow:false}));
    for(let i=-ez;i<=ez+.01;i+=2.6)[-ex,ex].forEach(xx=>bx(g,.16,.8,.16,px,xx,.4,i,{shadow:false}));
    [-ez,ez].forEach(zz=>bx(g,w+.8,.1,.1,px,0,.65,zz,{shadow:false}));[-ex,ex].forEach(xx=>bx(g,.1,.1,dd+.8,px,xx,.65,0,{shadow:false}));
    if(r()<.7)animals(x,z,w,dd,r);}
   FIELDS.push([x,z]);k++;}
 }

 function animals(x,z,w,dd,r){const cow=r()<.5,n=cow?2:3+Math.floor(r()*2);
  for(let i=0;i<n;i++){const g=new T.Group();g.userData.noMerge=true;G().add(g);
   if(cow){const c=r()<.5?'#f2efe6':'#6b4a33';bx(g,1.3,.7,.6,c,0,.65,0);bx(g,.5,.45,.45,c,.8,.8,0);bx(g,.12,.4,.12,'#2a2d28',-.45,.2,.2);bx(g,.12,.4,.12,'#2a2d28',.45,.2,-.2);bx(g,.4,.25,.3,'#2a2d28',-.2,.8,0);}
   else{bx(g,.9,.55,.5,'#f4f1e8',0,.55,0);bx(g,.35,.35,.35,'#3a342e',.55,.65,0);bx(g,.1,.3,.1,'#3a342e',-.3,.15,.15);bx(g,.1,.3,.1,'#3a342e',.3,.15,-.15);}
   const ht=new T.Mesh(new T.BoxGeometry(cow?1.9:1.4,1.3,1.3),new T.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));ht.position.y=.65;ht.userData.animal={kind:cow?'cow':'sheep',cd:0};g.add(ht);if(C.addPick)C.addPick(ht);
   g.position.set(x,0,z);ANIM_AN.push({g,cx:x+(r()-.5)*w*.4,cz:z+(r()-.5)*dd*.4,rx:w*.3,rz:dd*.28,ph:r()*6.28,sp:.15+r()*.15});}
 }
 function forest(){
  const r=RND(909),trails=[];HAM.forEach(h=>trails.push(...(h._trail||[])));
  const crown=[mat('fo-a','#3ea146'),mat('fo-b','#4fb84a'),mat('fo-c','#2f8a3c')],trunk=mat('fo-t','#6e4d2e');
  const geoC=new T.IcosahedronGeometry(1.5,0),geoP=new T.ConeGeometry(1.4,3.6,6);
  let n=0;for(let t=0;t<5000&&n<700;t++){
   const x=-150+r()*440,z=-266+r()*270;
   if(inFarm(x,z)||(x>-118&&x<262&&z>-70))continue;                       // bagian dalam kota: sudah diisi
   if(!inPoly(SANDIN,x,z))continue;
   if(HAM.some(h=>Math.hypot(h.x-x,h.z-z)<(h.rad||17)+8)||FIELDS.some(q=>Math.hypot(q[0]-x,q[1]-z)<7)||resvAt(x,z,3))continue;
   if(trails.some(p=>Math.hypot(p[0]-x,p[1]-z)<4.5))continue;
   if(C.layout.riverDist(x,z)<7||C.layout.lakeIn(x,z,5))continue;
   n++;const s=.8+r()*.9,pine=r()<(z<-70?.72:.35);
   cy(G(),.12*s,.2*s,1.6*s,trunk,x,.8*s,z,5);
   const c=new T.Mesh(pine?geoP:geoC,crown[n%3]);c.position.set(x,pine?3.2*s:2.4*s,z);c.scale.setScalar(s);put(c);
  }
 }
 function buildDistricts(){HAM.forEach(h=>{h._tp=hamTp(h);h._P=trail(h._tp,1.5,'#d9c79a',true);TR.push(...h._P);});HAM.forEach(h=>{h._trail=hamlet(h);});forest();}

 function buildParks(){C.SITES.ponds.forEach(p=>pond(p.x,p.z,p.rx,p.rz));[[152,-168,16,9],[-62,-206,13,7.5],[196,-92,12,7]].forEach((p,i)=>{pond(p[0],p[1],p[2],p[3]);dock(p[0],p[1],p[2],p[3],i);});}
 function dock(cx,cz,rx,rz,i){const x0=cx+rx-3.6;bx(G(),5.4,.16,1.5,'#a67c52',x0+.9,.11,cz+rz*.15);[-1,1].forEach(a=>[0,2.4,4.8].forEach(k=>bx(G(),.16,.7,.16,'#6e4d2e',x0-1.5+k,.12,cz+rz*.15+a*.7)));
  sail(cx-rx*.35,cz-rz*.25,.95,'#ffffff',1.1+i);sail(cx+rx*.05,cz+rz*.4,.8,i%2?'#e5483b':'#2a8bd8',2.3+i);
  const d=new T.Group();d.position.set(x0-2.2,.1,cz+rz*.15+1.5);d.userData.noMerge=true;G().add(d);bx(d,2.2,.3,.9,'#7a5a3a',0,.12,0);bx(d,.12,.8,.12,'#6e4d2e',0,.55,0);anim.boats.push({g:d,y:.1,ph:i*1.7,sp:.9});
  const dg=new T.Group();dg.position.set(x0+.9,0,cz+rz*.15);G().add(dg);C.regPlace&&C.regPlace({id:'dock-'+i,name:'DERMAGA '+['TELAGA TIMUR','TELAGA BARAT','TELAGA SELATAN'][i],type:'DERMAGA',desc:'Dermaga kayu di tepi danau.',glyph:'DERMAGA',tag:'DANAU',x:x0+.9,z:cz+rz*.15,w:6,d:2.6,H:1.2,group:dg});}

 /* ---------- menara kota (tekstur ubin berulang, tinggi bebas) ---------- */
 const STY={
  glassBlue:{wall:'#2c78bd',g:['#d6f3ff','#5ab4ea'],fr:'#1c5384',roof:'#8fa3b5',lit:'#ffe9a0',crown:'#2aa6e0'},
  glassTeal:{wall:'#1d9aa6',g:['#d4fbf4','#4cc9c0'],fr:'#146a73',roof:'#8fb0b3',lit:'#fff0b0',crown:'#ffcf3f'},
  sand:{wall:'#f0d29a',g:['#cfeaf7','#6aa9cf'],fr:'#fff7e4',roof:'#c0724a',lit:'#ffd978',crown:'#e5483b'},
  white:{wall:'#f5f6f2',g:['#b9ddf5','#5a96cf'],fr:'#9aa7b3',roof:'#9aa3ab',lit:'#ffe29a',crown:'#ff6a3d'},
  coral:{wall:'#f3948f',g:['#fff2c9','#ffd17a'],fr:'#ffffff',roof:'#b9514b',lit:'#fff2c9',crown:'#2fb4e6'},
  brick:{wall:'#c76a4f',g:['#f4e2a8','#e0b45a'],fr:'#f2e4d0',roof:'#6f4b3f',lit:'#ffe9a8',crown:'#3aa6e6'},
  violet:{wall:'#8d7ad6',g:['#e5dcff','#9d8be0'],fr:'#4d3f99',roof:'#6f6aa8',lit:'#fff1b3',crown:'#ffcf3f'},
  mint:{wall:'#8fdcb5',g:['#e6fff3','#66c0a0'],fr:'#ffffff',roof:'#4f9d84',lit:'#fff6c0',crown:'#ff7aa8'}
 };
 const STYLE_BY_ZONE={central:['glassBlue','glassTeal','white','violet','glassBlue'],north:['sand','coral','mint','brick','sand'],east:['brick','white','sand','glassTeal','coral']};
 const styleFor=(x,n)=>{const z=x<-20?'north':x>20?'east':'central',l=STYLE_BY_ZONE[z];return l[n%l.length];};
 const TM={};
 function styleMats(key){
  if(TM[key])return TM[key];const s=STY[key],r=RND(key.length*13+5),lit=Math.floor(r()*4);
  const c=cv(128,128,(x)=>{x.fillStyle=s.wall;x.fillRect(0,0,128,128);
   for(let i=0;i<4;i++){const ox=(i%2)*64,oy=Math.floor(i/2)*64;
    x.fillStyle='rgba(0,0,0,.13)';x.fillRect(ox,oy+60,64,4);
    x.fillStyle=s.fr;x.fillRect(ox+10,oy+12,44,40);
    if(i===lit){x.fillStyle=s.lit;x.fillRect(ox+13,oy+15,38,34);}
    else{const gr=x.createLinearGradient(0,oy+15,0,oy+49);gr.addColorStop(0,s.g[0]);gr.addColorStop(1,s.g[1]);x.fillStyle=gr;x.fillRect(ox+13,oy+15,38,34);}
    x.fillStyle=s.fr;x.fillRect(ox+31,oy+15,2,34);x.fillRect(ox+13,oy+31,38,2);
    x.fillStyle='rgba(255,255,255,.4)';x.fillRect(ox+15,oy+17,10,2);
    x.fillStyle='rgba(0,0,0,.18)';x.fillRect(ox+8,oy+52,48,3);}});
  const t=tex(c,null,false);t.minFilter=T.LinearMipmapLinearFilter;
  return TM[key]={side:new T.MeshStandardMaterial({map:t,roughness:.55,metalness:.08}),roof:mat('troof-'+key,s.roof),crown:mat('tcrown-'+key,s.crown,{roughness:.5}),dark:mat('tdark-'+key,s.fr)};
 }
 function scaleUV(geo,fn){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++){const f=fn(i);uv.setXY(i,uv.getX(i)*f[0],uv.getY(i)*f[1]);}uv.needsUpdate=true;}
 const BAY=1.3,FH=1.05;
 function label(text,bg,fg){const k='lbl|'+text+bg+fg;if(M[k])return M[k];const t=tex(cv(256,64,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.font='700 38px Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h/2+2,w-16);}),null,false);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return M[k]=new T.MeshBasicMaterial({map:t});}
 const NAMES=['CORP','MEDIA','TRADE','LABS','BANK','HOTEL','SKY','PLAZA','PRIME','METRO'];

 function tower(o){
  const w=o.w,d=o.d,fl=o.fl,key=o.style||'glassBlue',S=styleMats(key),st=STY[key],r=RND((o.seed||1)*17+3);
  const g=new T.Group();g.position.set(o.x,0,o.z);g.rotation.y=o.rot!==undefined?o.rot:C.faceRot(o.face);G().add(g);
  const pod=1.3,H=fl*FH,round=(o.kind==='office'&&fl>=9&&(o.seed||0)%4===1);
  // podium / lobi
  bx(g,w+.5,pod,d+.5,mat('pod-'+key,'#2a3b4d'),0,pod/2+.05,0);
  bx(g,w*.55,.14,1.3,S.crown,0,pod+.08,d/2+.5);
  bx(g,w*.5,.8,.06,mat('lobby','#bfe6f7',{emissive:'#6bc3e8',emissiveIntensity:.25}),0,.7,d/2+.27);
  // badan
  let top=pod+.05+H;
  if(round){
   const rad=Math.min(w,d)/2,geo=new T.CylinderGeometry(rad,rad,H,18,1,false),N=Math.max(3,Math.round(Math.PI*2*rad/(BAY*2)));
   scaleUV(geo,()=>[N,H/(FH*2)]);const b=new T.Mesh(geo,[S.side,S.roof,S.roof]);b.position.y=pod+.05+H/2;put(b,g);
   cy(g,rad+.12,rad+.12,.2,S.dark,0,top+.1,0,18);
  }else{
   const geo=new T.BoxGeometry(w,H,d),nx=Math.max(1,Math.round(w/(BAY*2))*1),nz=Math.max(1,Math.round(d/(BAY*2))*1),ny=H/(FH*2);
   scaleUV(geo,i=>{const f=Math.floor(i/4);return f<2?[nz,ny]:f<4?[1,1]:[nx,ny];});
   const b=new T.Mesh(geo,[S.side,S.side,S.roof,S.roof,S.side,S.side]);b.position.y=pod+.05+H/2;put(b,g);
   bx(g,w+.16,.18,d+.16,S.dark,0,top+.09,0);
  }
  top+=.18;
  // mahkota (variasi atap)
  const crown=Math.floor(r()*5);
  if(crown===0||fl<7){bx(g,.9,.6,.8,'#8d98a3',w*.2,top+.3,-d*.15);bx(g,.7,.5,.6,'#a2adb8',-w*.22,top+.25,d*.1);cy(g,.03,.03,2,'#33404e',w*.25,top+1,-d*.2,4);}
  else if(crown===1){const w2=w*.68,d2=d*.68,h2=Math.max(2,fl*.3)*FH,g2=new T.BoxGeometry(w2,h2,d2);scaleUV(g2,i=>{const f=Math.floor(i/4);return f<2?[Math.max(1,Math.round(d2/(BAY*2))),h2/(FH*2)]:f<4?[1,1]:[Math.max(1,Math.round(w2/(BAY*2))),h2/(FH*2)]});
   const b2=new T.Mesh(g2,[S.side,S.side,S.roof,S.roof,S.side,S.side]);b2.position.y=top+h2/2;put(b2,g);bx(g,w2+.14,.16,d2+.14,S.dark,0,top+h2+.08,0);cy(g,.04,.07,3.2,'#33404e',0,top+h2+1.7,0,5);cy(g,.2,.2,.14,'#ff4a4a',0,top+h2+3.35,0,6);}
  else if(crown===2){const rr=Math.min(w,d)*.4,dm=new T.Mesh(new T.SphereGeometry(rr,14,8,0,Math.PI*2,0,Math.PI/2),S.crown);dm.position.y=top;put(dm,g);cy(g,.03,.03,1.6,'#e8eef4',0,top+rr+.7,0,4);}
  else if(crown===3){cy(g,.7,.7,1,mat('tank','#8b6a4a'),w*.18,top+1.3,-d*.12,10);const lid=new T.Mesh(new T.ConeGeometry(.78,.5,10),mat('tank-lid','#5d4632'));lid.position.set(w*.18,top+2.05,-d*.12);put(lid,g);[-.4,.4].forEach(s=>bx(g,.07,.8,.07,'#2a2d28',w*.18+s,top+.4,-d*.12));
   cy(g,Math.min(w,d)*.28,Math.min(w,d)*.28,.06,'#3a4a5a',-w*.14,top+.04,d*.12,16);cy(g,Math.min(w,d)*.2,Math.min(w,d)*.2,.07,'#f4f4ee',-w*.14,top+.045,d*.12,16);}
  else{const py=new T.Mesh(new T.ConeGeometry(Math.max(w,d)*.62,2.4,4),S.crown);py.rotation.y=Math.PI/4;py.position.y=top+1.2;put(py,g);}
  // papan nama lobi (sebagian menara)
  if((o.seed||0)%3===0)bx(g,w*.7,.55,.1,label(NAMES[(o.seed||0)%NAMES.length],'#12304f','#d7ff3f'),0,pod+.62,d/2+.28);
  return {g,z:o.z,H:top};
 }

 /* ---------- gabungkan mesh statis berbahan sama (kurangi draw call) ---------- */
 function mergeStatic(root,opts){
  opts=opts||{};const chunk=opts.chunk||34;
  root.updateMatrixWorld(true);
  const list=[],noMerge=o=>{for(let p=o;p;p=p.parent){if(p.userData&&p.userData.noMerge)return true;}return false;};
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||!o.geometry||!o.geometry.attributes||!o.geometry.attributes.position)return;
   const u=o.userData||{};if(u.placeId||u.roomAct||u.artId||u.action||u.floor||noMerge(o)||o.visible===false)return;
   if(o.material.transparent&&o.material.opacity<.01)return;list.push(o);});
  const buckets=new Map(),e=new T.Vector3();
  for(const m of list){e.setFromMatrixPosition(m.matrixWorld);
   const key=m.material.uuid+'|'+(m.castShadow?1:0)+(m.receiveShadow?1:0)+'|'+Math.floor((e.x+100)/chunk)+'|'+Math.floor((e.z+100)/chunk);
   let b=buckets.get(key);if(!b){b={mat:m.material,cast:m.castShadow,recv:m.receiveShadow,items:[]};buckets.set(key,b);}b.items.push(m);}
  let merged=0,removed=0;
  buckets.forEach(b=>{
   if(b.items.length<2)return;
   try{
    let vc=0,ic=0;b.items.forEach(m=>{const g=m.geometry;vc+=g.attributes.position.count;ic+=g.index?g.index.count:g.attributes.position.count;});
    const pos=new Float32Array(vc*3),nor=new Float32Array(vc*3),uv=new Float32Array(vc*2),idx=new Uint32Array(ic);
    let vo=0,io=0;const nm=new T.Matrix3();
    for(const m of b.items){const g=m.geometry,P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv,me=m.matrixWorld.elements;nm.getNormalMatrix(m.matrixWorld);const ne=nm.elements;
     for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),o=(vo+i)*3;
      pos[o]=me[0]*x+me[4]*y+me[8]*z+me[12];pos[o+1]=me[1]*x+me[5]*y+me[9]*z+me[13];pos[o+2]=me[2]*x+me[6]*y+me[10]*z+me[14];
      if(N){const nx=N.getX(i),ny=N.getY(i),nz=N.getZ(i);let a=ne[0]*nx+ne[3]*ny+ne[6]*nz,c=ne[1]*nx+ne[4]*ny+ne[7]*nz,d=ne[2]*nx+ne[5]*ny+ne[8]*nz;const l=Math.hypot(a,c,d)||1;nor[o]=a/l;nor[o+1]=c/l;nor[o+2]=d/l;}
      if(U){uv[(vo+i)*2]=U.getX(i);uv[(vo+i)*2+1]=U.getY(i);}}
     if(g.index){for(let i=0;i<g.index.count;i++)idx[io+i]=g.index.getX(i)+vo;io+=g.index.count;}else{for(let i=0;i<P.count;i++)idx[io+i]=vo+i;io+=P.count;}
     vo+=P.count;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(new T.BufferAttribute(idx,1));
    geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,b.mat);mesh.castShadow=b.cast;mesh.receiveShadow=b.recv;mesh.matrixAutoUpdate=false;mesh.userData.merged=true;root.add(mesh);
    b.items.forEach(m=>{if(m.parent)m.parent.remove(m);removed++;});merged++;
   }catch(err){console.warn('mergeStatic bucket gagal',err);}
  });
  return {meshes:merged,removed};
 }


 /* ---------- rel lintas kota (v27): jalur panjang, jembatan laut, stasiun desa, terowongan, perlintasan jalan ---------- */
 const railState={};
 function buildRail(st){
  const sx=st.x,pts=routePts(sx).map(p=>({x:p[0],z:p[1]})),seg=[0];
  for(let i=1;i<pts.length;i++)seg.push(seg[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  const L=seg[seg.length-1];
  const sample=s=>{s=Math.max(0,Math.min(L,s));let i=1;while(i<seg.length-1&&seg[i]<s)i++;const a=pts[i-1],b=pts[i],k=(s-seg[i-1])/Math.max(1e-6,seg[i]-seg[i-1]);return {x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k,ang:Math.atan2(b.z-a.z,b.x-a.x)};};
  const sAt=(x,z)=>{let bi=0,bd=1e9;pts.forEach((p,i)=>{const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;bi=i;}});return seg[bi];};
  const ribbon=(off,half,y,col,i0,i1)=>{i0=i0||0;i1=i1==null?pts.length-1:i1;if(i1-i0<1)return;const pos=[],nor=[],idx=[];
   for(let i=i0;i<=i1;i++){const p=pts[i],q=sample(seg[i]),nx=-Math.sin(q.ang),nz=Math.cos(q.ang);[1,-1].forEach(sd=>{pos.push(p.x+nx*(off+sd*half),y,p.z+nz*(off+sd*half));nor.push(0,1,0);});}
   for(let i=0;i<i1-i0;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));g.setAttribute('normal',new T.BufferAttribute(new Float32Array(nor),3));g.setIndex(idx);
   const m=new T.Mesh(g,new T.MeshStandardMaterial({color:col,roughness:1,side:T.DoubleSide}));m.receiveShadow=true;m.userData.noMerge=true;m.userData.warped=true;G().add(m);return m;};
  ribbon(0,1.05,.05,'#a89a7e');ribbon(.55,.06,.075,'#2b2e29');ribbon(-.55,.06,.075,'#2b2e29');
  {const sl=[];for(let s=0.6;s<L;s+=1.1){const q=sample(s);sl.push([q.x,.06,q.z,1,1,1,-q.ang]);}const im=new T.InstancedMesh(new T.BoxGeometry(.22,.06,1.9),mat('sleeper','#6b5239'),sl.length),dm=new T.Object3D();sl.forEach((p,i)=>{dm.position.set(p[0],p[1],p[2]);dm.rotation.set(0,p[6],0);dm.updateMatrix();im.setMatrixAt(i,dm.matrix);});im.instanceMatrix.needsUpdate=true;im.receiveShadow=true;im.userData.warped=true;G().add(im);}
  /* perlintasan sebidang: aspal menutup balas & bantalan rel di tempat jalan memotong; rel baja tertanam rata dengan jalan (bukan rel melayang di atas jalan) */
  {const LY=C.layout,runs=[];let a0=-1;
   pts.forEach((p,i)=>{const on=p.x>-114&&p.x<RT.XP-2&&LY.roadDist(p.x,p.z)<3.2;if(on&&a0<0)a0=i;if(a0>=0&&(!on||i===pts.length-1)){runs.push([Math.max(0,a0-1),Math.min(pts.length-1,i)]);a0=-1;}});
   runs.forEach(([i0,i1])=>{ribbon(0,1.3,.108,'#4a5262',i0,i1);ribbon(1.3,.05,.11,'#ebe5cf',i0,i1);ribbon(-1.3,.05,.11,'#ebe5cf',i0,i1);ribbon(.55,.07,.113,'#2b2e29',i0,i1);ribbon(-.55,.07,.113,'#2b2e29',i0,i1);});}
  /* jembatan laut + pulau "KOTA LAIN" */
  {const zk=RT.ZK,bx0=-210,bx1=-146,len=bx1-bx0,cxm=(bx0+bx1)/2;
   bx(G(),len,.5,3.6,'#9a9da3',cxm,-.22,zk);[-1,1].forEach(sd=>bx(G(),len,.3,.14,'#d94a3a',cxm,.2,zk+sd*1.65));
   for(let x=bx0+4;x<bx1-4;x+=7)[-1,1].forEach(sd=>cy(G(),.45,.55,2.8,'#6f747b',x,-1.4,zk+sd*1.1));
   const ic=-214;cy(G(),17,18,.6,'#ead59c',ic,-.26,zk,28);
   bx(G(),.4,.9,1.6,'#d94a3a',RT.XK-.4,.5,zk);bx(G(),16,.22,2.4,'#cfcbbb',-207,.13,zk+2.5);bx(G(),14,.12,2.6,'#c4553f',-207,2.3,zk+2.5);[-6.5,6.5].forEach(dx=>bx(G(),.2,2.2,.2,'#6f747b',-207+dx,1.2,zk+3.5));
   const gk=new T.Group();gk.position.set(-207,0,zk+3.9);G().add(gk);C.sign(gk,'KOTA LAIN · BARAT',0,3.1,0,6.4,.8,'#12304f','#ffffff');
   [[-5,-9,5,7,5,'#7aa7d9'],[3,-10,6,10,5,'#e7c35c'],[11,-8,5,6,4,'#d97a6a'],[-9,9,6,5,5,'#8fc58a'],[2,11,5,9,5,'#b894d6'],[10,10,6,6,5,'#e8e1d0']].forEach(([dx,dz,w,h,d,c])=>{bx(G(),w,h,d,c,ic+dx,h/2,zk+dz);bx(G(),w+.4,.3,d+.4,'#4a4d46',ic+dx,h+.15,zk+dz);});}
  /* stasiun desa */
  {const xv=RT.XW,zv=RT.ZV;bx(G(),2,.25,11,'#cfcbbb',xv+2.2,.12,zv);bx(G(),1.7,.12,7,'#c4553f',xv+2.4,2.3,zv);[-3,3].forEach(dz=>bx(G(),.18,2.2,.18,'#6f747b',xv+3,1.2,zv+dz));
   const gv=new T.Group();gv.position.set(xv+3.4,0,zv);gv.rotation.y=Math.PI/2;G().add(gv);C.sign(gv,'ST. DESA',0,3.1,0,3.6,.7,'#2a5a3a','#ffffff');}
  /* terowongan di ujung timur: kereta masuk ke bukit lalu berbalik */
  {const zc=cityZ(RT.XP+5,sx),hx=RT.XP+5.5;bx(G(),11,3.4,10.6,'#8f8c80',hx,1.7,zc);bx(G(),9.6,1.5,9,'#68b447',hx+.1,4.1,zc);C.solids.push({x:hx,z:zc,w:11,d:10.6});}
  /* kereta 3 gerbong */
  const cols=['#d7ff3f','#171914','#d7ff3f'],carsT=[];
  cols.forEach((c,i)=>{const g=new T.Group();g.userData.noMerge=true;G().add(g);bx(g,2.6,1,.95,c,0,.8,0);bx(g,2.2,.3,.97,'#9fc4cf',0,1.05,0).castShadow=false;bx(g,2.4,.12,.8,'#2a2d28',0,1.35,0);carsT.push(g);});
  const stops=[{s:sAt(-211.5,RT.ZK),end:1,dw:6},{s:sAt(RT.XW,RT.ZV)},{s:sAt(sx,cityZ(sx,sx))},{s:sAt(RT.XE,cityZ(RT.XE,sx)),end:1,dw:2.5}];
  Object.assign(railState,{L,sample,carsT,stops,done:stops.map(()=>0),cur:0,dw:4.5,s:stops[2].s-40,dir:1,speed:0,state:'run',t:0});
  const place=()=>{carsT.forEach((g,i)=>{const q=sample(railState.s-railState.dir*i*2.9);g.position.set(q.x,.1,q.z);g.rotation.y=-q.ang;});};place();railState.place=place;
 }
 function updateTrain(dt){
  const R=railState;if(!R.carsT)return;const V=7;
  if(R.state==='dwell'){R.t+=dt;R.speed=0;
   if(R.t>R.dw){R.state='run';R.done[R.cur]=R.dir;
    if(R.stops[R.cur].end){R.s-=R.dir*5.8;R.dir=-R.dir;R.speed=.5;R.done=R.stops.map(()=>0);R.done[R.cur]=R.dir;}}
  }else{
   let tg=V,best=null;
   R.stops.forEach((p,i)=>{if(R.done[i]===R.dir)return;const d=((p.end?p.s:p.s+R.dir*2.9)-R.s)*R.dir;if(d>-1.5&&(!best||d<best.d))best={i,d};});
   if(best){const d=best.d;if(d>0&&d<12)tg=Math.max(1.2,V*d/12);if(d<=.35){R.state='dwell';R.t=0;R.speed=0;R.cur=best.i;R.dw=R.stops[best.i].dw||4.5;}}
   R.speed+=(tg-R.speed)*Math.min(1,dt*2);R.s+=R.dir*R.speed*dt;
  }
  R.place();
 }

 
 /* ---------- STADION BESAR: Maguwo, GBK, Old Trafford (bentuk terinspirasi, tanpa logo) ---------- */
 const epts=(a,b,n)=>{const o=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;o.push([Math.cos(t)*a,Math.sin(t)*b]);}return o;};
 function ringMesh(g,a1,b1,a2,b2,h,y,col){
  const sh=new T.Shape(),o=epts(a2,b2,44);sh.moveTo(o[0][0],o[0][1]);o.slice(1).forEach(q=>sh.lineTo(q[0],q[1]));sh.closePath();
  const hp=new T.Path(),i2=epts(a1,b1,44);hp.moveTo(i2[0][0],i2[0][1]);i2.slice(1).forEach(q=>hp.lineTo(q[0],q[1]));hp.closePath();sh.holes.push(hp);
  const geo=new T.ExtrudeGeometry(sh,{depth:h,bevelEnabled:false,curveSegments:1});geo.rotateX(-Math.PI/2);
  const m=new T.Mesh(geo,typeof col==='string'?mat(col,col):col);m.position.y=y;return put(m,g);
 }
 function pitchPlane(g,w,d,y,c1,c2){
  const t=tex(cv(256,160,(x,W,H)=>{for(let i=0;i<10;i++){x.fillStyle=i%2?c1:c2;x.fillRect(i*W/10,0,W/10+1,H);}x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=3;x.strokeRect(10,10,W-20,H-20);x.beginPath();x.moveTo(W/2,10);x.lineTo(W/2,H-10);x.stroke();x.beginPath();x.arc(W/2,H/2,22,0,7);x.stroke();x.strokeRect(10,H/2-34,34,68);x.strokeRect(W-44,H/2-34,34,68);}),null,true);
  t.repeat.set(1,1);const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:t,roughness:1}));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.userData.noMerge=true;g.add(m);return m;
 }
 function flood(g,x,z,h){cy(g,.16,.22,h,'#8d98a3',x,h/2,z,6);const hd=bx(g,1.8,.9,.4,mat('flood','#fffbe0',{emissive:'#fff2a8',emissiveIntensity:.7}),x,h+.2,z);hd.rotation.y=Math.atan2(x,z)+Math.PI;}
 function gate(g,x,z,w,col,text,bg,fg){bx(g,w,4.2,3,col,x,2.1,z);bx(g,w+.8,.4,3.6,'#2a2d28',x,4.4,z);bx(g,w*.4,3,.12,mat('gate-glass','#9fd6ee',{emissive:'#5fb3d9',emissiveIntensity:.25}),x,1.6,z+1.55);}
 function stand(g,cx,cz,w,d,dir,cols,hs,step){ // tangga tribun bertingkat menjauhi lapangan; dir=[dx,dz]
  hs.forEach((h,k)=>{const off=k*step+step/2,x=cx+dir[0]*off,z=cz+dir[1]*off,sw=dir[0]!==0;bx(g,sw?step:w,h,sw?w:step,cols[k%cols.length],x,h/2,z);});
 }
 function stadiumGBK(cx,cz){
  const g=new T.Group();g.position.set(cx,0,cz);G().add(g);
  bx(g,40,.12,35,'#d9d3c3',0,.05,0);pitchPlane(g,22,13.6,.16,'#3aa83a','#46bb44');
  [[11.6,7.6,14,10.2,2.4,'#c8372d'],[14,10.2,16.4,12.6,4.8,'#f4f1ea'],[16.4,12.6,18.4,14.6,7.4,'#c8372d']].forEach(([a1,b1,a2,b2,h,c])=>ringMesh(g,a1,b1,a2,b2,h,.1,c));
  ringMesh(g,18.4,14.6,19.1,15.3,8.1,.1,'#cfc9b8');
  ringMesh(g,13.4,9.6,20.4,16.6,.5,8.3,'#ffffff');ringMesh(g,13.4,9.6,14.2,10.4,.8,8.3,'#ffcf3f');
  epts(19.7,15.9,28).forEach(([x,z])=>cy(g,.2,.22,8.4,'#e9eef3',x,4.2,z,6));
  [[-20,-16],[20,-16],[-20,16],[20,16]].forEach(([x,z])=>flood(g,x,z,12));
  gate(g,0,16.6,9,'#f4f1ea','GELORA BUNG KARNO','#c8372d','#ffffff');
  return {w:40,d:35,H:12};
 }
 function stadiumOT(cx,cz){
  const g=new T.Group();g.position.set(cx,0,cz);G().add(g);
  bx(g,36,.12,31,'#d9d3c3',0,.05,0);pitchPlane(g,20,12.4,.16,'#3d9e3a','#49b244');
  const red='#c8372d',brick='#9c3a2b',hs=[2.2,4.6,7.2],cols=[red,'#d84a3c',red];
  stand(g,0,-6.2,20,3,[0,-1],cols,hs,2.4);stand(g,0,6.2,20,3,[0,1],cols,hs,2.4);stand(g,-10,0,12.4,3,[-1,0],cols,hs,2.4);stand(g,10,0,12.4,3,[1,0],cols,hs,2.4);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{bx(g,5,3.6,4,red,a*(10+1.6),1.8,b*(6.2+1.2));bx(g,5.4,.3,4.4,'#f0eeea',a*(10+1.6),7.4,b*(6.2+1.2));});
  bx(g,26,8.6,1,brick,0,4.3,-15);bx(g,26,8.6,1,brick,0,4.3,14.2);bx(g,1,8.6,26,brick,-18.2,4.3,0);bx(g,1,8.6,26,brick,18.2,4.3,0);
  [-1,1].forEach(sd=>{bx(g,22,.4,6.8,'#f0eeea',0,9.2,sd*7.6);for(let x=-10;x<=10;x+=5)bx(g,.24,9,.24,'#cfd6dc',x,4.6,sd*10.6);});
  [-1,1].forEach(sd=>{bx(g,6.8,.4,13.6,'#f0eeea',sd*11.6,9.2,0);});
  [[-18,-15],[18,-15],[-18,15],[18,15]].forEach(([x,z])=>flood(g,x,z,11));
  gate(g,0,14.6,8,brick,'OLD TRAFFORD','#c8372d','#ffffff');
  return {w:36,d:31,H:11};
 }
 function stadiumMaguwo(cx,cz){
  const g=new T.Group();g.position.set(cx,0,cz);G().add(g);
  bx(g,36,.12,31,'#dcd8c8',0,.05,0);pitchPlane(g,21,13.4,.16,'#35a042','#41b24c');
  [[11.2,7.4,13.6,9.8,2.2,'#1f8f46'],[13.6,9.8,16,12.2,4.4,'#f4f1ea'],[16,12.2,17.8,14,6.6,'#1f8f46']].forEach(([a1,b1,a2,b2,h,c])=>ringMesh(g,a1,b1,a2,b2,h,.1,c));
  ringMesh(g,17.8,14,18.4,14.6,7.4,.1,'#bdb9aa');
  for(let k=0;k<30;k++){const t=k/30*Math.PI*2,a=16.4,b=12.6,x=Math.cos(t)*a,z=Math.sin(t)*b,h=7.9+Math.sin(t*3)*1.1,m=new T.Mesh(new T.BoxGeometry(3.6,.4,9),mat(k%2?'#ffffff':'#e8f5ec',k%2?'#ffffff':'#e8f5ec'));m.position.set(x,h,z);m.rotation.y=Math.PI/2-t;put(m,g);}
  epts(18.2,14.4,22).forEach(([x,z],i)=>cy(g,.18,.2,7.6+Math.sin(i/22*Math.PI*6)*1.1,'#d6dde2',x,3.8,z,6));
  [[-19,-15],[19,-15],[-19,15],[19,15]].forEach(([x,z])=>flood(g,x,z,11));
  gate(g,0,15.6,8.4,'#1f8f46','STADION MAGUWO','#ffffff','#1f8f46');
  return {w:36,d:31,H:11};
 }
 function buildStadium(kind,x,z){return kind==='gbk'?stadiumGBK(x,z):kind==='ot'?stadiumOT(x,z):stadiumMaguwo(x,z);}

 /* ---------- animasi ---------- */
 function update(dt,t){
  updateTrain(dt);
  if(anim.tex){anim.tex.offset.x+=dt*.018;anim.tex.offset.y+=dt*.011;}
  if(anim.wheel){anim.wheel.rotation.z-=dt*.22;anim.gond.forEach(g=>{g.rotation.z=-anim.wheel.rotation.z;});}
  ANIM_AN.forEach(a=>{const ang=t*a.sp+a.ph,x=a.cx+Math.cos(ang)*a.rx,z=a.cz+Math.sin(ang)*a.rz;a.g.rotation.y=Math.atan2(-Math.cos(ang)*a.rz,-Math.sin(ang)*a.rx)+Math.PI/2*0;a.g.position.set(x,0,z);});
  anim.boats.forEach(b=>{b.g.position.y=b.y+Math.sin(t*b.sp*1.6+b.ph)*(b.duck?.012:.05);if(!b.duck)b.g.rotation.z=Math.sin(t*b.sp+b.ph)*.025;});
  anim.ferries.forEach(f=>{f.g.position.x+=f.dir*f.sp*dt;if(f.g.position.x>235)f.g.position.x=-90;if(f.g.position.x<-90)f.g.position.x=235;f.g.position.y=.08+Math.sin(t*1.3+f.z)*.04;});
 }
 const roadEnd=COAST_Z-.4;
 return {COAST_Z,SAND_Z,shoreZ,coastLimit,inLand,makeGround,reserved,roadEnd,grassMat,river,buildCoast,buildParks,buildRail,buildStadium,tower,styleFor,mergeStatic,update,waterMat,railState};
}
