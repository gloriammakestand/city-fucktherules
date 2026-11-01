/* FTTR CITY — Wilayah Tani & Ternak (utara kota, z -70 sampai -190).
   Ladang gandum/jagung/padi/sayur, kebun apel, lumbung, silo, kandang sapi/domba/ayam, kincir angin,
   hewan yang berkeliaran, dan traktor yang bekerja. Dipanggil dari city.js lewat createFarm(ctx). */
export function createFarm(C){
 const T=C.THREE,G=()=>C.group(),RND=C.RND,M={};
 const mat=(k,c,e)=>M[k]||(M[k]=new T.MeshStandardMaterial({color:c,roughness:.9,...(e||{})}));
 const put=(m,p,cast)=>{m.castShadow=cast!==false;m.receiveShadow=true;(p||G()).add(m);return m;};
 const bx=(p,w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),typeof c==='string'?mat(c,c):c);m.position.set(x,y,z);return put(m,p);};
 const cy=(p,r1,r2,h,c,x,y,z,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg||10),typeof c==='string'?mat(c,c):c);m.position.set(x,y,z);return put(m,p);};
 const cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;};
 const tex=(c,rep)=>{const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.NearestFilter;if(rep)t.repeat.set(rep[0],rep[1]);return t;};
 const anim={animals:[],blades:[],tractor:null,wheels:[]};
 const pts={wheat:[],corn:[],ranch:[],sheep:[],coop:[],veg:[],stall:null};

 /* ---- lantai ladang (bertekstur, rata dengan tanah) ---- */
 const fieldCache={};
 function fieldMat(kind){
  if(fieldCache[kind])return fieldCache[kind];
  const r=RND(kind.length*7+3);
  const c=cv(64,64,(x,w,h)=>{
   if(kind==='wheat'){x.fillStyle='#e6c24e';x.fillRect(0,0,w,h);for(let i=0;i<8;i++){x.fillStyle=i%2?'#d4ac38':'#efd36a';x.fillRect(i*8,0,4,h);}for(let i=0;i<40;i++){x.fillStyle='#b98f26';x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,2,2);}}
   else if(kind==='corn'||kind==='soil'){x.fillStyle='#8a6a44';x.fillRect(0,0,w,h);for(let i=0;i<8;i++){x.fillStyle=i%2?'#76583a':'#9a7a52';x.fillRect(i*8,0,4,h);}}
   else if(kind==='paddy'){x.fillStyle='#5eb7d6';x.fillRect(0,0,w,h);for(let i=0;i<8;i++){x.fillStyle=i%2?'#4f9a3c':'#69b44d';for(let j=0;j<8;j++)x.fillRect(i*8+1,j*8+1,5,5);}x.fillStyle='rgba(255,255,255,.25)';for(let i=0;i<12;i++)x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,4,2);}
   else if(kind==='veg'){const cols=['#59b84a','#d84a3a','#e89a2a','#7ac34f'];for(let i=0;i<4;i++){x.fillStyle='#7d5e3c';x.fillRect(i*16,0,16,h);x.fillStyle=cols[i];for(let j=0;j<4;j++)x.fillRect(i*16+3,j*16+3,10,10);}}
   else if(kind==='path'){x.fillStyle='#b69a6d';x.fillRect(0,0,w,h);for(let i=0;i<30;i++){x.fillStyle=i%2?'#a28756':'#c7ad82';x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,3,2);}}
   else{x.fillStyle='#8bd05a';x.fillRect(0,0,w,h);for(let i=0;i<50;i++){x.fillStyle=i%2?'#7cc04e':'#9be06a';x.fillRect(Math.floor(r()*32)*2,Math.floor(r()*32)*2,2,2);}}
  });
  return fieldCache[kind]=new T.MeshStandardMaterial({map:tex(c),roughness:1});
 }
 function field(kind,x1,x2,z1,z2,y){
  const w=x2-x1,d=z2-z1,mt=fieldMat(kind).clone();mt.map=fieldMat(kind).map.clone();mt.map.repeat.set(w/8,d/8);mt.map.needsUpdate=true;
  const m=new T.Mesh(new T.PlaneGeometry(w,d),mt);m.rotation.x=-Math.PI/2;m.position.set((x1+x2)/2,y||.03,(z1+z2)/2);m.receiveShadow=true;m.userData.noMerge=true;G().add(m);return m;
 }
 const instMesh=(geo,mt,list)=>{if(!list.length)return null;const m=new T.InstancedMesh(geo,mt,list.length),d=new T.Object3D();list.forEach((p,i)=>{d.position.set(p[0],p[1],p[2]);d.scale.set(p[3]||1,p[4]||1,p[5]||1);d.rotation.set(0,p[6]||0,0);d.updateMatrix();m.setMatrixAt(i,d.matrix);});m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;G().add(m);return m;};

 /* ---- pagar (dengan celah gerbang) + collider ---- */
 function fence(x1,x2,z1,z2,gate){ // gate: {side:'S',cx,w}
  const posts=[],rails=[],edge=(ax,az,bx_,bz,skip)=>{const L=Math.hypot(bx_-ax,bz-az),n=Math.max(1,Math.round(L/2.2));for(let i=0;i<=n;i++){const t=i/n,x=ax+(bx_-ax)*t,z=az+(bz-az)*t;if(skip&&skip(x,z))continue;posts.push([x,.55,z,.16,1.1,.16]);}
   const ang=Math.atan2(bz-az,bx_-ax);const segs=Math.max(1,Math.round(L/2.2));for(let i=0;i<segs;i++){const t0=i/segs,t1=(i+1)/segs,mx=ax+(bx_-ax)*(t0+t1)/2,mz=az+(bz-az)*(t0+t1)/2;if(skip&&skip(mx,mz))continue;[.4,.8].forEach(y=>rails.push([mx,y,mz,L/segs,.08,.07,-ang]));}};
  const gs=gate?(x,z)=>Math.abs(z-z2)<.2&&Math.abs(x-gate.cx)<gate.w/2:null;
  edge(x1,z1,x2,z1);edge(x2,z1,x2,z2);edge(x2,z2,x1,z2,gs);edge(x1,z2,x1,z1);
  instMesh(new T.BoxGeometry(1,1,1),mat('fence-post','#7a5a3a'),posts);instMesh(new T.BoxGeometry(1,1,1),mat('fence-rail','#8d6a44'),rails);
  const t=.5;C.solids.push({x:(x1+x2)/2,z:z1,w:x2-x1,d:t},{x:x2,z:(z1+z2)/2,w:t,d:z2-z1},{x:x1,z:(z1+z2)/2,w:t,d:z2-z1});
  if(gate){const l=(gate.cx-gate.w/2)-x1,r=x2-(gate.cx+gate.w/2);C.solids.push({x:x1+l/2,z:z2,w:l,d:t},{x:x2-r/2,z:z2,w:r,d:t});}else C.solids.push({x:(x1+x2)/2,z:z2,w:x2-x1,d:t});
 }

 /* ---- bangunan & properti ---- */
 function barn(x,z,w,d,col,name,id,info){
  const g=new T.Group();g.position.set(x,0,z);G().add(g);
  bx(g,w,4.2,d,col,0,2.1,0);C.gable(g,w,d,2.6,'#5a4a42',4.2);
  bx(g,w*.34,3.2,.12,'#f4efe2',0,1.7,d/2+.04);[-1,1].forEach(s=>{const a=bx(g,.14,3.4,.1,'#f4efe2',s*w*.1,1.7,d/2+.12);a.rotation.z=s*.9;});bx(g,w*.36,3.4,.1,mat('barn-door',col==='#8b2f25'?'#7a2820':'#6e8f5a'),0,1.7,d/2+.1);
  bx(g,1.2,1,.1,'#f4efe2',0,5,d/2+.1);C.sign(g,name,0,4.0,d/2+.16,w*.62,.9,'#2a2d28','#ffe07a');
  C.regPlace({id,name:info.name,type:info.type,desc:info.desc,glyph:info.glyph,tag:info.tag,x,z,w,d,H:7,group:g});
  return g;
 }
 function silo(x,z){const g=new T.Group();g.position.set(x,0,z);G().add(g);cy(g,1.5,1.6,8,'#d6dde2',0,4,0,14);for(let y=1.4;y<8;y+=1.6)cy(g,1.62,1.62,.12,'#9aa6b0',0,y,0,14);const d=new T.Mesh(new T.SphereGeometry(1.55,12,6,0,Math.PI*2,0,Math.PI/2),mat('silo-top','#8d98a3'));d.position.y=8;put(d,g);C.solids.push({x,z,w:3.4,d:3.4});}
 function stall(x,z){
  const g=new T.Group();g.position.set(x,0,z);G().add(g);
  bx(g,12,.3,5.4,'#c9b389',0,.15,0);[-5.2,5.2].forEach(sx=>[-2,2].forEach(sz=>cy(g,.12,.12,3,'#7a5a3a',sx,1.6,sz,6)));
  for(let i=0;i<12;i++)bx(g,1,.12,6,i%2?'#ffffff':'#e5483b',-5.5+i*1,3.2+(i%2?.02:0),0);
  [-3.6,0,3.6].forEach((cx,i)=>{bx(g,2.4,.9,1.2,'#a8793a',cx,.75,-1.4);const col=['#e5483b','#f2a824','#7ac34f'][i];for(let k=0;k<6;k++)bx(g,.45,.3,.45,col,cx-.7+(k%3)*.7,1.35,-1.6+(k>2?.6:0));});
  C.sign(g,'PASAR TANI',0,3.9,2.8,6,.9,'#2f6b3a','#ffffff');
  C.regPlace({id:'farmstall',name:'PASAR TANI',type:'FARM MARKET',desc:'Pasar hasil kebun dan ternak. Titik serah hasil panen dan pangkalan truk pengantar ke kota.',glyph:'PASAR TANI',tag:'FARM',x,z,w:12.5,d:6,H:4.5,group:g});
 }
 function farmhouse(x,z,col,id,name){
  const g=new T.Group();g.position.set(x,0,z);G().add(g);
  bx(g,7,3.6,5,col,0,1.8,0);C.gable(g,7,5,2.2,'#a8483a',3.6);bx(g,1.2,2.2,.1,'#6e4d2e',0,1.1,2.54);[-2,2].forEach(sx=>bx(g,1.1,1.1,.1,'#8fd0ee',sx,1.9,2.54));cy(g,.35,.35,2,'#9a8f84',2.2,5,-1,6);
  bx(g,2.6,.2,1.6,'#b98a54',0,.1,3.4);
  if(id)C.regPlace({id,name,type:'FARMHOUSE',desc:'Rumah petani di desa tani. Hangat, sederhana, dan dekat ke lumbung.',glyph:'RUMAH TANI',tag:'DESA TANI',x,z,w:7,d:5.4,H:5,group:g});else C.solids.push({x,z,w:7.4,d:5.6});
 }
 function windmill(x,z){
  const g=new T.Group();g.position.set(x,0,z);G().add(g);cy(g,1.1,2,9,'#f4f1ea',0,4.5,0,10);const cap=new T.Mesh(new T.ConeGeometry(1.4,1.6,10),mat('mill-cap','#c8372d'));cap.position.y=9.8;put(cap,g);
  const hub=new T.Group();hub.position.set(0,8.6,1.4);g.add(hub);for(let i=0;i<4;i++){const b=new T.Group();b.rotation.z=i*Math.PI/2;hub.add(b);bx(b,.5,4.4,.12,'#f4efe2',0,2.4,0);bx(b,.3,.1,.1,'#7a5a3a',0,.3,0);}
  hub.userData.noMerge=true;anim.blades.push(hub);C.solids.push({x,z,w:4.4,d:4.4});
 }
 function waterTower(x,z){const g=new T.Group();g.position.set(x,0,z);G().add(g);[-1.2,1.2].forEach(a=>[-1.2,1.2].forEach(b=>cy(g,.12,.12,6.5,'#8d98a3',a,3.2,b,6)));cy(g,2,2,2.6,'#6fa3c8',0,7.8,0,14);const c=new T.Mesh(new T.ConeGeometry(2.1,1,14),mat('wt-roof','#8d98a3'));c.position.y=9.6;put(c,g);C.solids.push({x,z,w:3.4,d:3.4});}
 function greenhouse(x,z,w,d){const g=new T.Group();g.position.set(x,0,z);G().add(g);const gl=new T.MeshStandardMaterial({color:'#bfe6f2',transparent:true,opacity:.42,roughness:.2});const b=new T.Mesh(new T.BoxGeometry(w,2.4,d),gl);b.position.y=1.2;b.castShadow=false;put(b,g,false);C.gable(g,w,d,1.2,'#bfe6f2',2.4);for(let i=0;i<=4;i++)bx(g,.12,2.4,.12,'#e8eef2',-w/2+i*w/4,1.2,d/2);bx(g,w-.6,.4,d-.6,'#7d5e3c',0,.2,0);for(let i=0;i<12;i++)bx(g,.5,.7,.5,i%3?'#59b84a':'#d84a3a',-w/2+1+(i%6)*(w-2)/5,.7,(i>5?.8:-.8));C.solids.push({x,z,w:w+.4,d:d+.4});}
 function scarecrow(x,z){const g=new T.Group();g.position.set(x,0,z);G().add(g);cy(g,.06,.06,2,'#7a5a3a',0,1,0,5);bx(g,1.4,.1,.1,'#7a5a3a',0,1.5,0);bx(g,.5,.7,.3,'#4a74c8',0,1.35,0);bx(g,.4,.4,.4,'#e6c9a0',0,1.95,0);bx(g,.7,.08,.7,'#c9a23a',0,2.2,0);bx(g,.4,.3,.4,'#c9a23a',0,2.4,0);}
 const bales=[];const hay=(x,z)=>bales.push([x,.5,z,1,1,1,Math.random()*3]);

 /* ---- hewan ---- */
 function animal(kind,home){
  const g=new T.Group();g.userData.noMerge=true;G().add(g);const u={kind,home,t:null,wait:Math.random()*2,speed:kind==='chicken'?1.1:kind==='horse'?1.6:.7,ph:Math.random()*6};
  const body={cow:[1.5,.9,.8,'#f4f1ea',.75],sheep:[1.05,.72,.62,'#f7f4ee',.62],chicken:[.34,.28,.26,'#f7f4ee',.3],horse:[1.8,.95,.6,'#8a5a3a',1.0]}[kind];
  const [bw,bh,bd,bc,by]=body,legH=by-bh/2;
  bx(g,bd,bh,bw,bc,0,by,0);
  const head=bx(g,bd*.8,bh*.7,bd*.9,kind==='sheep'?'#3a332e':kind==='cow'?'#f4f1ea':kind==='horse'?'#7a4a2e':'#f7f4ee',0,by+bh*.25,bw/2+bd*.35);
  if(kind==='cow'){[[.3,.1],[-.3,-.2]].forEach(([a,b])=>bx(g,.35,.3,.3,'#2a2d28',a,by+.2+b*.2,.2+b));bx(g,.5,.18,.3,'#f2b8b8',0,by+.1,bw/2+bd*.8);[-1,1].forEach(s=>bx(g,.08,.2,.08,'#e8e0c8',s*.2,by+bh*.7,bw/2+bd*.35));}
  if(kind==='chicken'){bx(g,.08,.14,.12,'#e5483b',0,by+bh*.7,bw/2+bd*.2);bx(g,.08,.06,.12,'#f2a824',0,by+bh*.3,bw/2+bd*.7);}
  if(kind==='horse'){bx(g,bd*.5,.8,.3,'#7a4a2e',0,by+.5,bw/2-.1);bx(g,.12,.7,.3,'#2a2d28',0,by+.4,-bw/2);}
  const front=bx(g,bd*.95,legH,.22,kind==='sheep'?'#3a332e':'#5a4a42',0,legH/2,bw*.32),back=bx(g,bd*.95,legH,.22,kind==='sheep'?'#3a332e':'#5a4a42',0,legH/2,-bw*.32);
  u.front=front;u.back=back;g.userData=Object.assign(g.userData,u);g.userData.noMerge=true;
  g.position.set(home[0]+Math.random()*(home[1]-home[0]),0,home[2]+Math.random()*(home[3]-home[2]));anim.animals.push(g);return g;
 }
 function herd(kind,n,home){for(let i=0;i<n;i++)animal(kind,home);}

 function tractorModel(){
  const g=new T.Group(),wheels=[];
  const wheel=(x,y,z,r,w)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,w,10),mat('tire','#1b1c18'));m.rotation.z=Math.PI/2;m.castShadow=true;const h=new T.Group();h.position.set(x,y,z);h.add(m);g.add(h);wheels.push(h);};
  wheel(-.85,.7,-.7,.7,.4);wheel(.85,.7,-.7,.7,.4);wheel(-.7,.4,1,.4,.3);wheel(.7,.4,1,.4,.3);
  bx(g,1.2,.8,2.4,'#2f9a4a',0,.9,.3);bx(g,1.1,.5,1,'#2f9a4a',0,1.25,.9);bx(g,1,.1,1.1,'#2a2d28',0,1.6,-.7);[-.5,.5].forEach(s=>[-1.1,-.3].forEach(zz=>bx(g,.08,1,.08,'#2a2d28',s,2.1,zz)));bx(g,1.2,.08,1.1,'#2f9a4a',0,2.6,-.7);cy(g,.08,.08,.9,'#2a2d28',.35,1.8,1.1,5);bx(g,.4,.4,.3,mat('tr-lamp','#fff6c0',{emissive:'#fff2a8',emissiveIntensity:.8}),0,.95,1.55);
  return {g,wheels};
 }

 function build(){
  const r=RND(97);
  // ===== lantai =====
  field('wheat',-43,-5,-126,-103);field('soil',5,43,-126,-103);field('paddy',-68,-53,-126,-93);field('veg',6,42,-83,-70.5);
  field('path',-45,45,-102.6,-100.2,.028);field('path',-45,45,-146.4,-143.8,.028);
  field('pasture',-43,-5,-170,-146,.026);field('pasture',5,43,-170,-146,.026);field('pasture',53,69,-126,-93,.026);
  // ===== jagung (instansi) & gandum =====
  const corn=[];for(let z=-124.5;z<=-104;z+=1.7)for(let x=6;x<=42;x+=1.1){corn.push([x+r()*.2,.85,z+r()*.2,.18,1.5+r()*.6,.18]);}
  instMesh(new T.BoxGeometry(1,1,1),mat('corn','#4fa83a'),corn);instMesh(new T.BoxGeometry(1,1,1),mat('corn-tas','#e6c24e'),corn.filter((_,i)=>i%3===0).map(p=>[p[0],p[1]+p[4]/2,p[2],.22,.3,.22]));
  const wheat=[];for(let z=-125;z<=-104;z+=1.2)for(let x=-42;x<=-6;x+=1.25)wheat.push([x+r()*.3,.45,z+r()*.3,.1,.9,.1]);
  instMesh(new T.BoxGeometry(1,1,1),mat('wheat','#f0d24e'),wheat);
  // kebun apel
  const trunks=[],crowns=[],apples=[];for(let x=-41;x<=-7;x+=6)for(let z=-82;z<=-72;z+=5){trunks.push([x,.9,z,.3,1.8,.3]);crowns.push([x,2.7,z,1.7,1.4,1.7,r()]);for(let k=0;k<4;k++)apples.push([x+Math.cos(k*1.7)*1.3,2.5+k%2*.5,z+Math.sin(k*1.7)*1.3,.28,.28,.28]);}
  instMesh(new T.CylinderGeometry(.5,.7,1,6),mat('apple-trunk','#6b5239'),trunks);instMesh(new T.IcosahedronGeometry(1,1),mat('apple-leaf','#4fb84a'),crowns);instMesh(new T.SphereGeometry(1,6,5),mat('apple','#e5483b'),apples);
  // sawah: pematang
  [[-68,-53,-126],[-68,-53,-93]].forEach(([x1,x2,z])=>bx(G(),x2-x1,.25,.5,'#9a7a52',(x1+x2)/2,.12,z));[-68,-53].forEach(x=>bx(G(),.5,.25,33,'#9a7a52',x,.12,-109.5));
  for(let z=-122;z<=-96;z+=8)bx(G(),15,.12,.4,'#9a7a52',-60.5,.1,z);
  // ===== bangunan =====
  barn(-24,-95.6,12,8,'#8b2f25','LUMBUNG TANI','barn',{name:'LUMBUNG TANI',type:'FARM BARN',desc:'Lumbung dan garasi traktor. Petani mengambil topi jerami dan traktor di sini sebelum bekerja di ladang.',glyph:'LUMBUNG',tag:'PERTANIAN'});
  silo(-12,-96.5);silo(-9,-96.5);
  stall(24,-95.6);
  barn(-24,-139.6,14,7,'#f1eee6','PETERNAKAN SAPI','dairy',{name:'PETERNAKAN SAPI',type:'DAIRY FARM',desc:'Kandang sapi perah dan kandang ayam. Peternak mengambil ember pakan di sini, lalu memberi makan hewan dan mengumpulkan susu dan telur.',glyph:'PETERNAKAN',tag:'TERNAK'});
  barn(24,-139.6,12,7,'#b98a54','KANDANG DOMBA','sheepfold',{name:'KANDANG DOMBA',type:'SHEEP FOLD',desc:'Kandang domba dan pos penggembala. Ambil tongkat gembala di sini sebelum menggiring domba ke padang rumput.',glyph:'KANDANG',tag:'TERNAK'});
  farmhouse(-22,-184,'#f4e3c8','farmhouse','RUMAH PETANI');farmhouse(22,-184,'#d9e8c8','',null);waterTower(10,-186);windmill(-60,-152);windmill(60,-152);
  greenhouse(30,-79.5,14,4.4);scarecrow(-10,-114);scarecrow(30,-114);scarecrow(-60,-110);
  // ===== pagar & hewan =====
  fence(-43,-5,-170,-146,{cx:-24,w:5});herd('cow',6,[-40,-8,-168,-148]);cy(G(),.6,.6,.5,'#6fa3c8',-24,.3,-158,10);bx(G(),2.4,.5,.9,'#8d6a44',-12,.3,-162);
  fence(5,43,-170,-146,{cx:24,w:5});herd('sheep',9,[8,40,-168,-148]);bx(G(),2.4,.5,.9,'#8d6a44',36,.3,-160);
  fence(36,44,-146.2,-139.5,null);herd('chicken',6,[37,43,-146,-141]);bx(G(),2,1.6,1.4,'#c9a23a',40,.8,-142);
  fence(53,69,-126,-93,{cx:61,w:5});herd('horse',2,[55,67,-123,-97]);
  [[-14,-163],[-38,-150],[30,-162],[12,-150],[-20,-109],[62,-110],[56,-100]].forEach(([x,z])=>hay(x,z));
  instMesh((()=>{const g=new T.CylinderGeometry(.55,.55,.9,10);g.rotateZ(Math.PI/2);return g;})(),mat('hay','#e0c25a'),bales);
  // peneduh angin & hutan
  const tt=[],tc=[];for(let z=-188;z<=-72;z+=5){[-69.5,69.5].forEach(x=>{tt.push([x,1,z+r()*1.5,.35,2,.35]);tc.push([x,3,z+r()*1.5,1.5,2,1.5,r()]);});}
  for(let i=0;i<260;i++){const x=72+r()*128,z=-188+r()*118;tt.push([x,.9,z,.3,1.8,.3]);tc.push([x,2.8,z,1.2+r()*.8,1.6+r()*.8,1.2+r()*.8,r()]);}
  instMesh(new T.CylinderGeometry(.5,.7,1,6),mat('wb-trunk','#6b5239'),tt);instMesh(new T.IcosahedronGeometry(1,1),mat('wb-leaf','#3f9a3d'),tc);
  // titik kerja untuk misi
  for(let i=0;i<5;i++){pts.wheat.push({x:-38+i*7.5,z:-108-(i%2)*8});pts.corn.push({x:10+i*7.5,z:-108-(i%2)*8});}
  pts.ranch=[{x:-30,z:-156},{x:-16,z:-160},{x:-36,z:-164}];pts.sheep=[{x:12,z:-156},{x:28,z:-160},{x:38,z:-152},{x:16,z:-166}];pts.coop={x:40,z:-144.5};pts.veg=[{x:12,z:-77},{x:24,z:-76},{x:36,z:-78}];pts.stall={x:24,z:-90.6};
  // traktor yang bekerja
  const tm=tractorModel();G().add(tm.g);tm.g.userData.noMerge=true;anim.tractor={g:tm.g,wheels:tm.wheels,t:0,path:[[-42,-118],[-6,-118],[-6,-108],[-42,-108]]};anim.wheels=tm.wheels;
  // petani NPC
  [[-30,-112,'#c98f68'],[-14,-120,'#d9a441'],[16,-112,'#7ac34f'],[34,-120,'#c4533f'],[-60,-100,'#59b84a'],[-24,-152,'#4a74c8'],[24,-154,'#d9a441']].forEach(([x,z,c])=>C.addNPC(x,z,c));
 }

 const WALK={cow:1,sheep:1,chicken:1,horse:1};
 function update(dt,t){
  anim.blades.forEach(b=>{b.rotation.z+=dt*.8;});
  anim.animals.forEach(g=>{const u=g.userData;
   if(!u.t){u.wait-=dt;if(u.wait<=0){u.t={x:u.home[0]+Math.random()*(u.home[1]-u.home[0]),z:u.home[2]+Math.random()*(u.home[3]-u.home[2])};}u.front.rotation.x=u.back.rotation.x=0;return;}
   const dx=u.t.x-g.position.x,dz=u.t.z-g.position.z,d=Math.hypot(dx,dz);
   if(d<.25){u.t=null;u.wait=1+Math.random()*4;return;}
   const st=Math.min(d,u.speed*dt);g.position.x+=dx/d*st;g.position.z+=dz/d*st;g.rotation.y=Math.atan2(dx,dz);u.ph+=dt*u.speed*7;
   const s=Math.sin(u.ph)*.5;u.front.rotation.x=s;u.back.rotation.x=-s;});
  const tr=anim.tractor;if(tr){const p=tr.path,a=p[Math.floor(tr.t)%p.length],b=p[(Math.floor(tr.t)+1)%p.length],k=tr.t%1,v=2.2;const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;tr.t+=dt*v/L;const x=a[0]+(b[0]-a[0])*k,z=a[1]+(b[1]-a[1])*k;tr.g.position.set(x,0,z);tr.g.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);tr.wheels.forEach(w=>{w.rotation.x+=dt*v*2.5;});}
 }
 return {build,update,points:pts,tractorModel};
}
