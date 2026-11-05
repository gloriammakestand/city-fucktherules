/* FTTR CITY v21 — tata letak organik (murni matematika, tanpa THREE).
   Jaringan jalan dibangun dari diagram Voronoi: persimpangan hampir selalu T/Y, jalan membelok, ada jalan buntu,
   ukuran blok beragam. Sungai membelah pusat kota; jalan menyeberang lewat jembatan. Bangunan diletakkan MENGHADAP
   jalan baru (bukan jalur grid lama). Semua koordinat sudah di ruang dunia (tidak ada warp lagi). */
export const DOM={x1:-64,x2:204,z1:-66,z2:55.4};
export const RAIL={z:-14.8,x1:-72,x2:70,hz:3.8};
export const RIVER_HW=3.4,HW=3;
export const LAKE={x:132,z:-19,rx:15,rz:9.5};
const RIVER_CP=[[132,-17],[112,-9],[92,0],[72,8],[52,12],[32,9],[12,11],[-6,16],[-24,13],[-42,17],[-60,23],[-80,19],[-104,27],[-128,29],[-152,24]];
/* persegi yang tidak boleh dilewati jalan/bangunan: [x1,x2,z1,z2] */
export const STADIUM_RECTS=[[-69,-27,-66,-29],[160,202,-60.5,-23.5],[160,202,5,42]];
export const SITES={plaza:{x:-12,z:-36.5,r:[-19,-5,-40.4,-32.6]},court:{x:22,z:-28,r:[17.6,26.4,-30.8,-25.2]},
  ponds:[{x:-38,z:36,rx:4.4,rz:2.4},{x:50,z:34,rx:4.8,rz:2.5},{x:144,z:22,rx:8,rz:5}]};
const pondRect=p=>[p.x-p.rx-5,p.x+p.rx+5,p.z-p.rz-5,p.z+p.rz+5];
const FARM_EDGES=[[48,-176,48,-66],[48,-88,66,-88],[-66,-132,0,-132],[-48,-176,66,-176],[-48,-176,-48,-132],[0,-190,0,-176],[0,-132,0,-88]];
const ART_OLD={poles:[[-13.5,-3.3,'pole-01'],[10.5,-3.3,'pole-02'],[-30,-3.3,'pole-03'],[30,-3.3,'pole-04'],[-4.8,18.7,'pole-05'],[-42,18.7,'pole-06'],[42,18.7,'pole-07']],boards:[[-8,-17.4,'board-01']],walls:[[-34,-17.5,'wall-01'],[34,-17.5,'wall-02'],[-34,10.6,'wall-03'],[34,10.6,'wall-04'],[-15.5,10.8,'wall-05']]};

const rng=seed=>{let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const hyp=Math.hypot,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dSeg=(px,pz,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,t=clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1),0,1);return hyp(px-(ax+dx*t),pz-(az+dz*t));};
const inRect=(x,z,r,m=0)=>x>r[0]-m&&x<r[1]+m&&z>r[2]-m&&z<r[3]+m;
function segSeg(ax,az,bx,bz,cx,cz,dx,dz){const r=(bx-ax)*(dz-cz)-(bz-az)*(dx-cx);if(Math.abs(r)<1e-9)return null;const t=((cx-ax)*(dz-cz)-(cz-az)*(dx-cx))/r,u=((cx-ax)*(bz-az)-(cz-az)*(bx-ax))/r;return t>=0&&t<=1&&u>=0&&u<=1?{t,u}:null;}
function segRect(ax,az,bx,bz,r,m){const L=hyp(bx-ax,bz-az),n=Math.max(1,Math.ceil(L/1.5));for(let i=0;i<=n;i++){const t=i/n;if(inRect(ax+(bx-ax)*t,az+(bz-az)*t,r,m))return true;}return false;}
function clipSeg(ax,az,bx,bz){let t0=0,t1=1;const dx=bx-ax,dz=bz-az;const P=[-dx,dx,-dz,dz],Q=[ax-DOM.x1,DOM.x2-ax,az-DOM.z1,DOM.z2-az];for(let i=0;i<4;i++){if(Math.abs(P[i])<1e-12){if(Q[i]<0)return null;}else{const t=Q[i]/P[i];if(P[i]<0){if(t>t1)return null;if(t>t0)t0=t;}else{if(t<t0)return null;if(t<t1)t1=t;}}}return t1-t0>1e-6?[t0,t1]:null;}
function catmull(P,step){const out=[],n=P.length;for(let i=0;i<n-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n-1,i+2)],m=Math.max(2,Math.ceil(hyp(p2[0]-p1[0],p2[1]-p1[1])/step));for(let k=0;k<m;k++){const t=k/m,t2=t*t,t3=t2*t,f=a=>.5*(2*p1[a]+(-p0[a]+p2[a])*t+(2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t2+(-p0[a]+3*p1[a]-3*p2[a]+p3[a])*t3);out.push([f(0),f(1)]);}}out.push(P[n-1]);return out;}
const resample=(pts,step)=>{const o=[pts[0]];let acc=0;for(let i=1;i<pts.length;i++){let a=o[o.length-1];let L=hyp(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);acc+=L;while(acc>=step){const k=(acc-step)/(L||1);o.push([pts[i][0]-(pts[i][0]-pts[i-1][0])*k,pts[i][1]-(pts[i][1]-pts[i-1][1])*k]);acc-=step;}}const l=pts[pts.length-1],e=o[o.length-1];if(hyp(l[0]-e[0],l[1]-e[1])>.4)o.push(l);return o;};

/* ---------- OBB ---------- */
const obbPts=(o,m=0)=>{const c=Math.cos(o.rot),s=Math.sin(o.rot),hw=o.w/2+m,hd=o.d/2+m;return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd],[0,-hd],[0,hd],[-hw,0],[hw,0],[0,0]].map(([a,b])=>[o.x+a*c+b*s,o.z-a*s+b*c]);};
function obbOverlap(A,B,m){const dx=B.x-A.x,dz=B.z-A.z,ra=hyp(A.w,A.d)/2,rb=hyp(B.w,B.d)/2;if(hyp(dx,dz)>ra+rb+m)return false;
 const ca=Math.cos(A.rot),sa=Math.sin(A.rot),cb=Math.cos(B.rot),sb=Math.sin(B.rot),axes=[[ca,-sa],[sa,ca],[cb,-sb],[sb,cb]];
 for(const [ax,az] of axes){const pa=A.w/2*Math.abs(ax*ca-az*sa)+A.d/2*Math.abs(ax*sa+az*ca),pb=B.w/2*Math.abs(ax*cb-az*sb)+B.d/2*Math.abs(ax*sb+az*cb);if(Math.abs(dx*ax+dz*az)>pa+pb+m)return false;}return true;}

export function buildLayout(opts={}){
 const R=rng(opts.seed||21);
 /* ===== sungai & danau ===== */
 const rpts=resample(catmull(RIVER_CP,3),3).map(p=>({x:p[0],z:p[1]}));
 rpts.forEach((p,i)=>{const a=rpts[Math.max(0,i-1)],b=rpts[Math.min(rpts.length-1,i+1)],L=hyp(b.x-a.x,b.z-a.z)||1;p.tx=(b.x-a.x)/L;p.tz=(b.z-a.z)/L;});
 const riverDist=(x,z)=>{let d=99;for(let i=0;i<rpts.length-1;i++){const v=dSeg(x,z,rpts[i].x,rpts[i].z,rpts[i+1].x,rpts[i+1].z);if(v<d)d=v;}return d;};
 const lakeIn=(x,z,m=0)=>((x-LAKE.x)/(LAKE.rx+m))**2+((z-LAKE.z)/(LAKE.rz+m))**2<1;
 const crossRiver=(ax,az,bx,bz)=>{const out=[];for(let i=0;i<rpts.length-1;i++){const h=segSeg(ax,az,bx,bz,rpts[i].x,rpts[i].z,rpts[i+1].x,rpts[i+1].z);if(h){const tx=rpts[i+1].x-rpts[i].x,tz=rpts[i+1].z-rpts[i].z,L=hyp(tx,tz)||1,ex=bx-ax,ez=bz-az,EL=hyp(ex,ez)||1;out.push({x:ax+ex*h.t,z:az+ez*h.t,s:Math.abs((tx*ez-tz*ex)/(L*EL))});}}return out;};
 /* ===== rintangan keras untuk jalan ===== */
 const HARD=[...STADIUM_RECTS,SITES.plaza.r,SITES.court.r,...SITES.ponds.map(pondRect)];
 const hardSeg=(ax,az,bx,bz,m)=>HARD.some(r=>segRect(ax,az,bx,bz,r,m))||segLake(ax,az,bx,bz,3.5);
 function segLake(ax,az,bx,bz,m){const L=hyp(bx-ax,bz-az),n=Math.max(1,Math.ceil(L/2));for(let i=0;i<=n;i++){const t=i/n;if(lakeIn(ax+(bx-ax)*t,az+(bz-az)*t,m))return true;}return false;}
 /* ===== benih (Poisson-disc dengan jari-jari bervariasi) ===== */
 const rad=(x,z)=>{const n=.5+.25*Math.sin(x*.021+1.3)+.25*Math.sin(z*.033+.4)*Math.cos(x*.012);return (opts.rmin||12)+(opts.rvar||13)*n;};
 const seeds=[],X1=DOM.x1-26,X2=DOM.x2+26,Z1=DOM.z1-26,Z2=DOM.z2+26;
 for(let t=0;t<6000;t++){const x=X1+R()*(X2-X1),z=Z1+R()*(Z2-Z1),r=rad(x,z);if(seeds.every(s=>hyp(s.x-x,s.z-z)>=(r+s.r)/2*.96))seeds.push({x,z,r});}
 /* ===== Delaunay (Bowyer–Watson) → Voronoi ===== */
 const n0=seeds.length,P=seeds.map(s=>({x:s.x,z:s.z}));P.push({x:-1e5,z:-1e5},{x:1e5,z:-1e5},{x:0,z:1e5});
 const mkTri=(a,b,c)=>{const A=P[a],B=P[b],C=P[c],d=2*(A.x*(B.z-C.z)+B.x*(C.z-A.z)+C.x*(A.z-B.z)),ux=((A.x*A.x+A.z*A.z)*(B.z-C.z)+(B.x*B.x+B.z*B.z)*(C.z-A.z)+(C.x*C.x+C.z*C.z)*(A.z-B.z))/d,uz=((A.x*A.x+A.z*A.z)*(C.x-B.x)+(B.x*B.x+B.z*B.z)*(A.x-C.x)+(C.x*C.x+C.z*C.z)*(B.x-A.x))/d;return {a,b,c,cx:ux,cz:uz,r2:(A.x-ux)**2+(A.z-uz)**2};};
 let tris=[mkTri(n0,n0+1,n0+2)];
 for(let i=0;i<n0;i++){const p=P[i],bad=[],keep=[];tris.forEach(t=>((p.x-t.cx)**2+(p.z-t.cz)**2<t.r2?bad:keep).push(t));
  const cnt=new Map();bad.forEach(t=>[[t.a,t.b],[t.b,t.c],[t.c,t.a]].forEach(([u,v])=>{const k=u<v?u+','+v:v+','+u;cnt.set(k,(cnt.get(k)||0)+1);}));
  tris=keep;cnt.forEach((c,k)=>{if(c===1){const [u,v]=k.split(',').map(Number);tris.push(mkTri(u,v,i));}});}
 tris=tris.filter(t=>t.a<n0&&t.b<n0&&t.c<n0);
 const emap=new Map();tris.forEach((t,ti)=>[[t.a,t.b],[t.b,t.c],[t.c,t.a]].forEach(([u,v])=>{const k=u<v?u+','+v:v+','+u;(emap.get(k)||emap.set(k,[]).get(k)).push(ti);}));
 /* ===== graf ===== */
 let nodes=[],edges=[];const nmap=new Map();
 const addNode=(x,z)=>{const k=Math.round(x*2)+','+Math.round(z*2);let i=nmap.get(k);if(i===undefined){i=nodes.length;nodes.push({x,z});nmap.set(k,i);}return i;};
 emap.forEach(l=>{if(l.length!==2)return;const A=tris[l[0]],B=tris[l[1]];const c=clipSeg(A.cx,A.cz,B.cx,B.cz);if(!c)return;
  const ax=A.cx+(B.cx-A.cx)*c[0],az=A.cz+(B.cz-A.cz)*c[0],bx=A.cx+(B.cx-A.cx)*c[1],bz=A.cz+(B.cz-A.cz)*c[1];if(hyp(bx-ax,bz-az)<2)return;
  if(hardSeg(ax,az,bx,bz,3.5))return;
  edges.push({a:addNode(ax,az),b:addNode(bx,bz)});});
 const onB=n=>n.x<=DOM.x1+.05||n.x>=DOM.x2-.05||n.z<=DOM.z1+.05||n.z>=DOM.z2-.05;
 const len=e=>hyp(nodes[e.a].x-nodes[e.b].x,nodes[e.a].z-nodes[e.b].z);
 let ADJ=[];
 const rebuild=()=>{edges=edges.filter(e=>!e.dead&&e.a!==e.b);const seen=new Set();edges=edges.filter(e=>{const k=Math.min(e.a,e.b)+','+Math.max(e.a,e.b);if(seen.has(k))return false;seen.add(k);return true;});
  ADJ=nodes.map(()=>[]);edges.forEach((e,i)=>{ADJ[e.a].push(i);ADJ[e.b].push(i);});};
 rebuild();
 const DBG=opts.debug?(m=>console.log('  ',m,edges.length)):()=>{};DBG('voronoi');
 const other=(e,n)=>e.a===n?e.b:e.a;
 /* kontraksi ruas pendek (hindari persimpangan berdempetan) */
 for(let pass=0;pass<4;pass++){let ch=false;rebuild();const order=edges.map((e,i)=>i).sort((i,j)=>len(edges[i])-len(edges[j]));
  for(const i of order){const e=edges[i];if(e.dead||len(e)>=(opts.minE||10))continue;const A=nodes[e.a],B=nodes[e.b];if(onB(A)&&onB(B))continue;
   const keepA=onB(A)||!onB(B);const [k,r]=keepA?[e.a,e.b]:[e.b,e.a];if(!onB(nodes[k])){nodes[k].x=(A.x+B.x)/2;nodes[k].z=(A.z+B.z)/2;}
   edges.forEach(f=>{if(f.a===r)f.a=k;if(f.b===r)f.b=k;});e.dead=true;ch=true;}
  rebuild();if(!ch)break;}
 const comps=()=>{const c=new Array(nodes.length).fill(-1);let id=0;for(let s=0;s<nodes.length;s++){if(c[s]>=0||!ADJ[s].length)continue;const q=[s];c[s]=id;while(q.length){const u=q.pop();ADJ[u].forEach(ei=>{const v=other(edges[ei],u);if(c[v]<0){c[v]=id;q.push(v);}});}id++;}return {c,n:id};};
 const connectedWithout=(ei)=>{const e=edges[ei],seen=new Set([e.a]),q=[e.a];while(q.length){const u=q.pop();if(u===e.b)return true;ADJ[u].forEach(j=>{if(j===ei)return;const v=other(edges[j],u);if(!seen.has(v)){seen.add(v);q.push(v);}});}return false;};
 DBG('contract');
 /* ===== sungai: hanya beberapa jembatan ===== */
 const cross=edges.map(e=>crossRiver(nodes[e.a].x,nodes[e.a].z,nodes[e.b].x,nodes[e.b].z));
 const isCross=i=>cross[i]&&cross[i].length>0;
 edges.forEach((e,i)=>{if(isCross(i))return;const A=nodes[e.a],B=nodes[e.b],L=len(e),m=Math.max(2,Math.ceil(L/3));for(let k=0;k<=m;k++){const t=k/m;if(riverDist(A.x+(B.x-A.x)*t,A.z+(B.z-A.z)*t)<RIVER_HW+2.4){e.dead=true;break;}}});
 const candIdx=[];edges.forEach((e,i)=>{if(!e.dead&&isCross(i))candIdx.push(i);});
 const crossEdges=candIdx.map(i=>({e:edges[i],c:cross[i]}));edges.forEach((e,i)=>{if(isCross(i))e.dead=true;});
 const alive=edges.filter(e=>!e.dead);edges=alive;rebuild();DBG('river-del');
 let cm=comps();const uf=Array.from({length:cm.n},(_,i)=>i),find=x=>uf[x]===x?x:(uf[x]=find(uf[x]));
 const bridges=[];
 crossEdges.filter(o=>o.c.length===1&&o.c[0].s>.55).sort((p,q)=>(q.c[0].s-p.c[0].s)||0).forEach(o=>{
  const ca=cm.c[o.e.a],cb=cm.c[o.e.b];if(ca<0&&cb<0)return;const c=o.c[0];
  const need=ca>=0&&cb>=0&&find(ca)!==find(cb),spaced=bridges.every(b=>hyp(b.x-c.x,b.z-c.z)>34);
  if(need||(spaced&&bridges.length<6&&c.s>.75)){if(need)uf[find(ca)]=find(cb);edges.push({a:o.e.a,b:o.e.b,bridge:true});bridges.push({x:c.x,z:c.z});}});
 rebuild();
 DBG('bridges');
 /* ===== sambungkan komponen terpisah (pakai ruas terdekat) ===== */
 for(let it=0;it<30;it++){cm=comps();if(cm.n<=1)break;const size=new Array(cm.n).fill(0);cm.c.forEach(c=>{if(c>=0)size[c]++;});const main=size.indexOf(Math.max(...size));
  let best=null;for(let i=0;i<nodes.length;i++){if(cm.c[i]<0||cm.c[i]===main)continue;for(let j=0;j<nodes.length;j++){if(cm.c[j]!==main)continue;const d=hyp(nodes[i].x-nodes[j].x,nodes[i].z-nodes[j].z);if((!best||d<best.d)&&d<70&&!hardSeg(nodes[i].x,nodes[i].z,nodes[j].x,nodes[j].z,2)){const cr=crossRiver(nodes[i].x,nodes[i].z,nodes[j].x,nodes[j].z);if(cr.length===0||(cr.length===1&&cr[0].s>.5))best={i,j,d,cr};}}}
  if(!best){edges.forEach(e=>{if(cm.c[e.a]!==main)e.dead=true;});rebuild();continue;}
  edges.push({a:best.i,b:best.j,bridge:best.cr.length>0});if(best.cr.length)bridges.push({x:best.cr[0].x,z:best.cr[0].z});rebuild();}
 DBG('connect');
 /* ===== buang sebagian ruas acak (blok lebih besar + jalan buntu), tetap tersambung ===== */
 {const order=edges.slice().sort(()=>R()-.5);for(const e of order){if(e.dead||e.bridge||R()>(opts.del??.12))continue;if(ADJ[e.a].length<3&&ADJ[e.b].length<3)continue;const i=edges.indexOf(e);if(i>=0&&connectedWithout(i)){e.dead=true;rebuild();}}}
 DBG('rand-del');
 /* ===== sudut tajam: hapus ruas terpendek dari pasangan ===== */
 for(let pass=0;pass<3;pass++){for(let n=0;n<nodes.length;n++){if(ADJ[n].length<2)continue;const L=ADJ[n].map(ei=>{const e=edges[ei],o=nodes[other(e,n)];return {ei,a:Math.atan2(o.z-nodes[n].z,o.x-nodes[n].x),len:len(e)};}).sort((p,q)=>p.a-q.a);
   for(let i=0;i<L.length;i++){const p=L[i],q=L[(i+1)%L.length];let da=Math.abs(q.a-p.a);if(da>Math.PI)da=Math.PI*2-da;if(L.length>=3&&i===L.length-1&&L.length===2)continue;if(da<.66&&L.length>=2){const del=p.len<q.len?p:q;if(!edges[del.ei].dead&&!edges[del.ei].bridge&&connectedWithout(del.ei)){edges[del.ei].dead=true;rebuild();break;}}}}}
 DBG('angle');
 /* ===== pangkas ujung buntu pendek ===== */
 for(let it=0;it<6;it++){let ch=false;for(let n=0;n<nodes.length;n++){if(ADJ[n].length!==1)continue;const ei=ADJ[n][0],e=edges[ei];if(e.bridge)continue;if(len(e)<(onB(nodes[n])?12:17)){e.dead=true;ch=true;}}if(ch)rebuild();else break;}
 DBG('spur');
 /* ===== hubungkan jalan tani (utara) ke kota ===== */
 const farmTop={x:48,z:-66};let ftN=-1;{let bd=1e9;nodes.forEach((n,i)=>{if(!ADJ[i].length)return;const d=hyp(n.x-farmTop.x,n.z-farmTop.z);if(d<bd){bd=d;ftN=i;}});
  if(ftN>=0){const fi=addNode(farmTop.x,farmTop.z);ADJ[fi]=[];if(fi!==ftN&&bd>2)edges.push({a:fi,b:ftN,farmLink:true});rebuild();}}
 /* ===== tangen halus di tiap simpul → kurva Hermite ===== */
 const unit=(x,z)=>{const l=hyp(x,z)||1;return [x/l,z/l];};
 const tan=new Map();// key node|edge → arah menjauhi simpul
 for(let n=0;n<nodes.length;n++){const inc=ADJ[n];if(!inc.length)continue;const ch=inc.map(ei=>{const o=nodes[other(edges[ei],n)];return unit(o.x-nodes[n].x,o.z-nodes[n].z);});
  inc.forEach((ei,k)=>tan.set(n+'|'+ei,ch[k]));
  if(inc.length>=2){let bi=0,bj=1,bd=2;for(let i=0;i<inc.length;i++)for(let j=i+1;j<inc.length;j++){const d=ch[i][0]*ch[j][0]+ch[i][1]*ch[j][1];if(d<bd){bd=d;bi=i;bj=j;}}
   const t=unit(ch[bi][0]-ch[bj][0],ch[bi][1]-ch[bj][1]);tan.set(n+'|'+inc[bi],t);tan.set(n+'|'+inc[bj],[-t[0],-t[1]]);}}
 const farm=FARM_EDGES.map(([x1,z1,x2,z2])=>({farm:true,pts:resample([[x1,z1],[x2,z2]],2.5).map(p=>({x:p[0],z:p[1]}))}));
 const sampleEdge=(e,bulge)=>{const A=nodes[e.a],B=nodes[e.b],L=hyp(B.x-A.x,B.z-A.z),k=1.05;let t0=tan.get(e.a+'|'+edges.indexOf(e))||unit(B.x-A.x,B.z-A.z),t1=tan.get(e.b+'|'+edges.indexOf(e))||unit(A.x-B.x,A.z-B.z);
  const ch=unit(B.x-A.x,B.z-A.z),lim=(t,c)=>{let d=t[0]*c[0]+t[1]*c[1];if(d<.64){const f=(.64-d)/(1-d+1e-6);t=unit(t[0]+(c[0]-t[0])*f*1.4,t[1]+(c[1]-t[1])*f*1.4);}return t;};
  t0=lim(t0,ch);t1=lim(t1,[-ch[0],-ch[1]]);const m0=[t0[0]*L*k,t0[1]*L*k],m1=[-t1[0]*L*k,-t1[1]*L*k],n=Math.max(4,Math.round(L/2.5)),out=[];
  const sg=e.sg,bl=bulge*L*e.amp;
  for(let i=0;i<=n;i++){const t=i/n,t2=t*t,t3=t2*t,h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;let x=h00*A.x+h10*m0[0]+h01*B.x+h11*m1[0],z=h00*A.z+h10*m0[1]+h01*B.z+h11*m1[1];
   const s=Math.sin(Math.PI*t)*bl*sg;x+=-ch[1]*s;z+=ch[0]*s;out.push({x:clamp(x,DOM.x1,DOM.x2),z:clamp(z,DOM.z1,DOM.z2)});}
  out[0]={x:A.x,z:A.z};out[n]={x:B.x,z:B.z};return out;};
 edges.forEach(e=>{e.sg=R()<.5?-1:1;e.amp=.02+R()*.07;});
 edges.forEach((e,i)=>{let p=sampleEdge(e,1);
  const bad=q=>q.some(s=>HARD.some(r=>inRect(s.x,s.z,r,2.6))||lakeIn(s.x,s.z,2.4)||(!e.bridge&&riverDist(s.x,s.z)<RIVER_HW+3.2));
  if(bad(p)){p=sampleEdge(e,0);if(bad(p)&&!e.bridge){p=sampleEdge(e,0);}}
  e.pts=p;e.len=0;for(let k=1;k<p.length;k++)e.len+=hyp(p[k].x-p[k-1].x,p[k].z-p[k-1].z);});
 /* ===== bundaran ===== */
 const deg=n=>ADJ[n].length,rbs=[];
 {const elig=[];nodes.forEach((n,i)=>{if(deg(i)<3||onB(n))return;if(ADJ[i].some(ei=>edges[ei].len<15||edges[ei].bridge))return;if(riverDist(n.x,n.z)<11||(Math.abs(n.z-RAIL.z)<12&&n.x>RAIL.x1-12&&n.x<RAIL.x2+12))return;if(HARD.some(r=>inRect(n.x,n.z,r,12)))return;elig.push(i);});
  elig.sort((a,b)=>R()-.5);for(const i of elig){if(rbs.length>=3)break;if(rbs.every(b=>hyp(b.x-nodes[i].x,b.z-nodes[i].z)>70)&&hyp(nodes[i].x-nodes[i].z*0,nodes[i].z)>=0)rbs.push({x:nodes[i].x,z:nodes[i].z,r:7,node:i});}}
 const trim=(pts,c,r)=>{let out=[];const inside=p=>hyp(p.x-c.x,p.z-c.z)<r;if(inside(pts[0])){let k=0;while(k<pts.length&&inside(pts[k]))k++;if(k>=pts.length)return pts;const a=pts[k-1],b=pts[k],da=hyp(a.x-c.x,a.z-c.z),db=hyp(b.x-c.x,b.z-c.z),t=(r-da)/((db-da)||1);out=[{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},...pts.slice(k)];}else out=pts.slice();
  if(inside(out[out.length-1])){let k=out.length-1;while(k>=0&&inside(out[k]))k--;const a=out[k],b=out[k+1],da=hyp(a.x-c.x,a.z-c.z),db=hyp(b.x-c.x,b.z-c.z),t=(r-da)/((db-da)||1);out=[...out.slice(0,k+1),{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}];}return out;};
 rbs.forEach(b=>ADJ[b.node].forEach(ei=>{edges[ei].pts=trim(edges[ei].pts,b,b.r);}));
 edges.forEach(e=>{e.len=0;for(let k=1;k<e.pts.length;k++)e.len+=hyp(e.pts[k].x-e.pts[k-1].x,e.pts[k].z-e.pts[k-1].z);});
 const allEdges=[...farm,...edges.map(e=>e)];
 /* ===== indeks spasial ruas jalan ===== */
 const CELL=12,grid=new Map(),gk=(i,j)=>i*4096+j;
 allEdges.forEach((e,ei)=>{for(let k=0;k<e.pts.length-1;k++){const a=e.pts[k],b=e.pts[k+1],i0=Math.floor((Math.min(a.x,b.x)-HW)/CELL),i1=Math.floor((Math.max(a.x,b.x)+HW)/CELL),j0=Math.floor((Math.min(a.z,b.z)-HW)/CELL),j1=Math.floor((Math.max(a.z,b.z)+HW)/CELL);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const key=gk(i+200,j+200);(grid.get(key)||grid.set(key,[]).get(key)).push([a.x,a.z,b.x,b.z,ei]);}}});
 const nearest=(x,z,skip=-1,R2=1)=>{let d=99,qx=x,qz=z,E=-1;const ci=Math.floor(x/CELL),cj=Math.floor(z/CELL);for(let i=ci-R2;i<=ci+R2;i++)for(let j=cj-R2;j<=cj+R2;j++){const l=grid.get(gk(i+200,j+200));if(!l)continue;for(const s of l){if(s[4]===skip)continue;const dx=s[2]-s[0],dz=s[3]-s[1],t=clamp(((x-s[0])*dx+(z-s[1])*dz)/(dx*dx+dz*dz||1),0,1),px=s[0]+dx*t,pz=s[1]+dz*t,v=hyp(x-px,z-pz);if(v<d){d=v;qx=px;qz=pz;E=s[4];}}}return {d,x:qx,z:qz,e:E};};
 const roadDist=(x,z,skip)=>{const r=nearest(x,z,skip);let d=r.d;for(const b of rbs){const v=Math.abs(hyp(x-b.x,z-b.z)-b.r);if(v<d)d=v;}return d;};
 const jn=[];nodes.forEach((n,i)=>{if(ADJ[i].length>=3&&!rbs.some(b=>b.node===i))jn.push({x:n.x,z:n.z,r:5.3});else if(ADJ[i].length===1)jn.push({x:n.x,z:n.z,r:4.5});});
 const roadClear=(x,z,m=.4)=>{if(roadDist(x,z)<HW+.6+m)return false;for(const n of jn)if(hyp(x-n.x,z-n.z)<n.r+m)return false;for(const b of rbs)if(hyp(x-b.x,z-b.z)<b.r+5.2+m)return false;return true;};
 /* ===== penempatan benda: OBB ===== */
 const placed=[],pg=new Map(),pk=(i,j)=>i*4096+j,PC=16;
 const putObb=o=>{placed.push(o);const r=hyp(o.w,o.d)/2,i0=Math.floor((o.x-r)/PC),i1=Math.floor((o.x+r)/PC),j0=Math.floor((o.z-r)/PC),j1=Math.floor((o.z+r)/PC);for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=pk(i+200,j+200);(pg.get(k)||pg.set(k,[]).get(k)).push(o);}};
 const HARDO=[...STADIUM_RECTS,SITES.plaza.r,SITES.court.r,...SITES.ponds.map(pondRect),[RAIL.x1,RAIL.x2,RAIL.z-RAIL.hz-.1,RAIL.z+RAIL.hz+.1],[DOM.x1-30,DOM.x2+30,54.7,120]];
 const free=(o,m=.5,rm=0)=>{const pts=obbPts(o,0);for(const [x,z] of pts){if(x<DOM.x1-2||x>DOM.x2+2||z<DOM.z1||z>54.7)return false;if(HARDO.some(r=>inRect(x,z,r,.4)))return false;if(riverDist(x,z)<RIVER_HW+1.8||lakeIn(x,z,3))return false;if(!roadClear(x,z,rm))return false;}
  const r=hyp(o.w,o.d)/2+m+3,i0=Math.floor((o.x-r)/PC),i1=Math.floor((o.x+r)/PC),j0=Math.floor((o.z-r)/PC),j1=Math.floor((o.z+r)/PC);
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const l=pg.get(pk(i+200,j+200));if(l)for(const q of l)if(obbOverlap(o,q,m))return false;}return true;};
 /* sampel sepanjang ruas */
 const at=(e,u)=>{const p=e.pts;let s=0;for(let k=1;k<p.length;k++){const L=hyp(p[k].x-p[k-1].x,p[k].z-p[k-1].z);if(s+L>=u||k===p.length-1){const t=clamp((u-s)/(L||1),0,1),tx=(p[k].x-p[k-1].x)/(L||1),tz=(p[k].z-p[k-1].z)/(L||1);return {x:p[k-1].x+(p[k].x-p[k-1].x)*t,z:p[k-1].z+(p[k].z-p[k-1].z)*t,tx,tz};}s+=L;}const q=p[p.length-1];return {x:q.x,z:q.z,tx:1,tz:0};};
 const rotToward=(fx,fz)=>Math.atan2(fx,fz);
 /* ===== seni dinding: cari tembok lurus barat-timur ===== */
 const art={poles:[],boards:[],walls:[]};
 {const cand=[];edges.forEach(e=>{if(e.bridge)return;for(let u=6;u<e.len-6;u+=2){const a=at(e,u-4),b=at(e,u+4);if(hyp(b.x-a.x,b.z-a.z)<7)continue;const c=at(e,u);cand.push({x:c.x,z:c.z,sl:Math.abs((b.z-a.z)/((b.x-a.x)||1e-6))});}});
  const put=(list,old,w,d,off,maxSl,pad)=>old.forEach(([ox,oz,id])=>{let best=null;cand.forEach(c=>{if(c.sl>maxSl)return;const x=c.x,z=c.z-off,sc=hyp(x-ox,z-oz);if(best&&sc>=best.sc)return;const o={x,z,w,d,rot:0};if(!free(o,pad,0))return;best={sc,o,x,z};});
   if(best){putObb(best.o);list.push([best.x,best.z,id]);}});
  put(art.walls,ART_OLD.walls,8.8,1.4,6.3,.22,.6);put(art.boards,ART_OLD.boards,4,1.2,-5.4,.4,.5);put(art.poles,ART_OLD.poles,.6,.6,4.1,.6,.2);}
 /* ===== bangunan bernama (menghadap jalan terdekat) ===== */
 const named={};
 const placeNamed=list=>list.forEach(it=>{let best=null;const base=it.base||4.6;
  edges.forEach(e=>{if(e.bridge)return;const step=1.5;for(let u=4;u<e.len-4;u+=step)for(const s of [-1,1]){const c=at(e,u),nx=-c.tz*s,nz=c.tx*s,x=c.x+nx*(base+it.d/2),z=c.z+nz*(base+it.d/2),sc=hyp(x-it.tx,z-it.tz);if(best&&sc>=best.sc)continue;const o={x,z,w:it.w,d:it.d,rot:rotToward(-nx,-nz)};if(!free(o,.6,.4))continue;best={sc,o};}});
  if(best){putObb(best.o);named[it.id]={x:best.o.x,z:best.o.z,rot:best.o.rot};}});
 const lots=[];
 const dims=()=>{const k=R(),kind=k<.3?'house':k<.55?'shop':k<.8?'apt':'office',q=v=>Math.round(v*2)/2;return {k,kind,w:q(kind==='house'?4.6+R():4.5+R()*2.5),d:q(kind==='house'?3.8+R()*.8:4+R()*1.4)};};
 const MAXL=opts.maxLots||1000;
 const tryLot=(x,z,rot,D,front)=>{const o={x,z,w:D.w,d:D.d,rot};if(!free(o,.5,.2))return false;const kind=front&&(D.kind==='office'||D.kind==='apt')?(D.k<.675?'house':'shop'):D.kind;putObb(o);lots.push({x,z,rot,w:D.w,d:D.d,kind,k:D.k});return true;};
 const frontage=(base)=>edges.forEach(e=>{if(e.bridge)return;for(const s of [-1,1]){const du=n=>ADJ[n].length===2?.6:4.6;let u=du(e.a)+R()*.8;const end=e.len-du(e.b);let guard=0;while(u<end&&guard++<30&&lots.length<MAXL){const D=dims(),uc=u+D.w/2;if(uc+D.w/2>end)break;const c=at(e,uc),nx=-c.tz*s,nz=c.tx*s,cx=c.x+nx*(base+D.d/2),cz=c.z+nz*(base+D.d/2),front=(nx+nz)>.15;
   if(tryLot(cx,cz,rotToward(-nx,-nz),D,front))u=uc+D.w/2+.5;else u+=1.5;}}});
 const infill=(step=3.9,skip=.15,dmin=6.6,dmax=30)=>{for(let x=DOM.x1+3;x<DOM.x2;x+=step)for(let z=DOM.z1+3;z<54;z+=step){if(lots.length>=MAXL)return;const px=x+R()*3-1.5,pz=z+R()*3-1.5;if(R()<skip)continue;const r=nearest(px,pz,-1,3);if(r.d<dmin||r.d>dmax)continue;const f=unit(r.x-px,r.z-pz),D=dims();tryLot(px,pz,rotToward(f[0],f[1]),D,(-f[0]-f[1])>.15);}};
 return {infill,R,nodes,edges,farm,allEdges,rbs,rpts,riverDist,lakeIn,crossRiver,bridges,roadDist,nearest,roadClear,free,putObb,placed,art,named,placeNamed,lots,dims,tryLot,frontage,at,rotToward,deg:n=>ADJ[n].length,ADJ,HARD,onB,MAXL,unit};
}
