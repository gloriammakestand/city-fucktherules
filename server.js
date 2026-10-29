'use strict';
// FTTR CITY realtime starter. For production, use managed durable storage + authentication.
// This server never touches the existing FTTR store, checkout, orders, or payment database.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = Number(process.env.PORT || 8787);
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS || 'https://city.fucktherules.my.id,http://localhost:8000,http://127.0.0.1:8000').split(',').map(x=>x.trim()).filter(Boolean));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'world.json');
fs.mkdirSync(DATA_DIR, {recursive:true});
const initial = { version:1, wallets:{}, ledger:[], jobs:{}, chat:[], football:{season:1,fixtures:[],clubs:[],players:[],transfers:[],demos:[]}, players:[], art:[], reports:[] };
let state = initial;
try { if (fs.existsSync(DATA_FILE)) state = {...initial, ...JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}; } catch (e) { console.error('State load failed; using fresh state:', e.message); }
let saveChain = Promise.resolve();
function save(){ const snapshot=JSON.stringify(state); saveChain=saveChain.then(()=>fs.promises.writeFile(DATA_FILE+'.tmp',snapshot).then(()=>fs.promises.rename(DATA_FILE+'.tmp',DATA_FILE))).catch(e=>console.error('save failed',e)); return saveChain; }
const clients = new Map(); const rate = new Map();
const now = () => Date.now(); const safeName = s => String(s||'Visitor').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'Visitor';
const safeText = s => String(s||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,280);
function allowed(req){ const o=req.headers.origin; if(!o||ORIGINS.has(o))return true;try{return new URL(o).host===req.headers.host;}catch{return false;} }
function send(res,code,obj){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-admin-token'});res.end(JSON.stringify(obj));}
function broadcast(room,payload,except){const raw=JSON.stringify(payload);for(const [ws,c] of clients){if(ws!==except&&c.room===room&&ws.readyState===WebSocket.OPEN)ws.send(raw);}}
function onlineList(room){return [...clients.values()].filter(c=>c.room===room).map(c=>({id:c.id,name:c.name,x:c.x,z:c.z,district:c.district,avatar:c.avatar}));}
function addLedger(user,delta,reason,ref){const current=Number(state.wallets[user]??1250);const next=current+delta;if(next<0)return {ok:false,balance:current};state.wallets[user]=next;state.ledger.unshift({id:crypto.randomUUID(),user,delta,reason,ref:ref||null,balance:next,at:new Date().toISOString()});state.ledger=state.ledger.slice(0,10000);return {ok:true,balance:next};}
function limiter(key,max=12,windowMs=10000){const t=now();const a=(rate.get(key)||[]).filter(x=>t-x<windowMs);if(a.length>=max){rate.set(key,a);return false;}a.push(t);rate.set(key,a);return true;}

const ART_DIR=path.join(DATA_DIR,'art');fs.mkdirSync(ART_DIR,{recursive:true});
const ADMIN_TOKEN=process.env.ADMIN_TOKEN||'';
const MIME={png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const artPub=a=>({id:a.id,owner:a.owner,kind:a.kind,surface:a.surface,u:a.u,v:a.v,w:a.w,rot:a.rot,slot:a.slot,at:a.at,likes:a.likes.length,url:'/api/art/file/'+a.id+'.'+a.ext});
function readBody(req,res,limit,cb){let b='',dead=false;req.on('data',c=>{b+=c;if(b.length>limit&&!dead){dead=true;send(res,413,{error:'too_large'});req.destroy();}});req.on('end',()=>{if(dead)return;try{cb(JSON.parse(b||'{}'));}catch(e){send(res,400,{error:'invalid_json'});}});}
function sniff(buf){if(buf.length>12&&buf[0]===0x89&&buf[1]===0x50&&buf[2]===0x4e&&buf[3]===0x47)return 'png';if(buf[0]===0xff&&buf[1]===0xd8)return 'jpg';if(buf.length>12&&buf.toString('latin1',0,4)==='RIFF'&&buf.toString('latin1',8,12)==='WEBP')return 'webp';return null;}
function dropArt(a){a.status='removed';fs.promises.unlink(path.join(ART_DIR,a.id+'.'+a.ext)).catch(()=>{});}
function handleArt(req,res,url){
 const p=url.pathname;
 if(req.method==='GET'&&p==='/api/art'){const sf=String(url.searchParams.get('surface')||'').replace(/[^a-z0-9_-]/gi,'').slice(0,40);return send(res,200,{works:state.art.filter(a=>a.status==='ok'&&a.surface===sf).slice(-80).map(artPub)}),true;}
 if(req.method==='GET'&&p.startsWith('/api/art/file/')){const f=p.slice(14).replace(/[^a-z0-9.-]/gi,''),ext=f.split('.').pop();if(!MIME[ext])return send(res,404,{error:'not_found'}),true;const id=f.slice(0,f.lastIndexOf('.')),a=state.art.find(x=>x.id===id&&x.status==='ok');if(!a)return send(res,404,{error:'not_found'}),true;
  fs.readFile(path.join(ART_DIR,a.id+'.'+a.ext),(e,d)=>{if(e)return send(res,404,{error:'not_found'});res.writeHead(200,{'content-type':MIME[a.ext],'cache-control':'public, max-age=86400','access-control-allow-origin':'*','x-content-type-options':'nosniff'});res.end(d);});return true;}
 if(req.method==='POST'&&p==='/api/art'){readBody(req,res,520000,b=>{const gid=String(b.guest||'').replace(/[^a-z0-9-]/gi,'').slice(0,40);if(!gid)return send(res,400,{error:'guest_required'});if(!limiter('art'+req.socket.remoteAddress+gid,6,60000))return send(res,429,{error:'rate_limited'});
   const kind=b.kind==='graffiti'?'graffiti':b.kind==='sticker'?'sticker':null,surface=String(b.surface||'').replace(/[^a-z0-9_-]/gi,'').slice(0,40);if(!kind||!surface)return send(res,400,{error:'invalid_target'});
   const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img||''));if(!m)return send(res,400,{error:'invalid_image'});const buf=Buffer.from(m[2],'base64'),ext=sniff(buf);if(!ext)return send(res,400,{error:'invalid_image'});if(buf.length>(kind==='graffiti'?300000:160000))return send(res,413,{error:'image_too_large'});
   const num=(v,lo,hi,d)=>{v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):d;},slot=Math.round(num(b.slot,0,2,0));
   if(kind==='graffiti'){for(const a of state.art)if(a.status==='ok'&&a.kind==='graffiti'&&a.surface===surface&&a.slot===slot)dropArt(a);}
   else{const mine=state.art.filter(a=>a.status==='ok'&&a.kind==='sticker'&&a.surface===surface);if(mine.length>=40)dropArt(mine[0]);}
   const id=crypto.randomUUID().replace(/-/g,'').slice(0,20),w={id,owner:safeName(b.name),guest:crypto.createHash('sha256').update(gid).digest('hex').slice(0,12),kind,surface,u:num(b.u,0,1,.5),v:num(b.v,0,1,.5),w:Math.round(num(b.w,40,400,150)),rot:num(b.rot,-7,7,0),slot,ext,at:new Date().toISOString(),likes:[],reports:[],status:'ok'};
   fs.writeFile(path.join(ART_DIR,id+'.'+ext),buf,e=>{if(e)return send(res,500,{error:'storage_failed'});state.art.push(w);state.art=state.art.filter(a=>a.status==='ok').slice(-600);save();send(res,200,{work:artPub(w)});});});return true;}
 if(req.method==='POST'&&(p==='/api/art/like'||p==='/api/art/report'||p==='/api/art/delete')){readBody(req,res,2000,b=>{const a=state.art.find(x=>x.id===String(b.id||'')&&x.status==='ok');if(!a)return send(res,404,{error:'not_found'});const gid=String(b.guest||'').replace(/[^a-z0-9-]/gi,'').slice(0,40);
   if(p==='/api/art/delete'){if(!ADMIN_TOKEN||req.headers['x-admin-token']!==ADMIN_TOKEN)return send(res,403,{error:'forbidden'});dropArt(a);save();return send(res,200,{ok:true});}
   if(!gid||!limiter('ar'+req.socket.remoteAddress+gid,20,60000))return send(res,429,{error:'rate_limited'});
   if(p==='/api/art/like'){if(!a.likes.includes(gid))a.likes.push(gid);save();return send(res,200,{likes:a.likes.length});}
   if(!a.reports.includes(gid))a.reports.push(gid);if(a.reports.length>=3){a.status='hidden';}state.reports.push({id:crypto.randomUUID(),art:a.id,by:gid,at:new Date().toISOString()});save();return send(res,200,{ok:true});});return true;}
 return false;}
const PUBLIC_FILES=new Set(['index.html','city.html','city.css','ui-game.css','city.js','ui-game.js','art.js','online.js','football.js','config.js','sw.js','manifest.webmanifest','logo.png','favicon.png','mural.png','qris.jpg']);
const STATIC_TYPE={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png',jpg:'image/jpeg'};
function serveStatic(req,res,pathname){
 if(req.method!=='GET'&&req.method!=='HEAD')return false;
 let name;try{name=decodeURIComponent(pathname==='/'?'index.html':pathname.slice(1));}catch{return false;}
 if(!PUBLIC_FILES.has(name))return false;
 const file=path.join(__dirname,name),type=STATIC_TYPE[name.split('.').pop()]||'application/octet-stream';
 fs.readFile(file,(e,data)=>{if(e)return send(res,404,{error:'not_found'});res.writeHead(200,{'content-type':type,'cache-control':name.endsWith('.html')?'no-cache':'public, max-age=300','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});return true;
}
const server=http.createServer((req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-admin-token'});return res.end();}
 if(!allowed(req))return send(res,403,{error:'origin_not_allowed'});
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'fttr-city-realtime',version:1,online:clients.size,uptime:Math.round(process.uptime())});
 if(req.method==='GET'&&url.pathname==='/api/world')return send(res,200,{online:clients.size,players:state.players.length,chat:state.chat.slice(-30),football:state.football,features:{presence:true,chat:true,virtualWallet:true,jobs:true,serverPersistence:true}});
 if(req.method==='GET'&&url.pathname==='/api/leaderboard'){const totals={};for(const x of state.ledger)totals[x.user]=(totals[x.user]||0)+x.delta;return send(res,200,{leaderboard:Object.entries(totals).map(([name,earned])=>({name,earned})).sort((a,b)=>b.earned-a.earned).slice(0,20)});}
 if(req.method==='POST'&&url.pathname==='/api/action'){
  let body='';req.on('data',c=>{body+=c;if(body.length>10000)req.destroy();});req.on('end',async()=>{try{const b=JSON.parse(body||'{}');const user=b.gid?('g_'+String(b.gid).replace(/[^a-z0-9-]/gi,'').slice(0,40)):safeName(b.user);const key=`${req.socket.remoteAddress}:${user}`;if(!limiter(key,10,60000))return send(res,429,{error:'rate_limited'});let result;
   if(b.type==='wallet'){return send(res,200,{balance:Number(state.wallets[user]??1250),ledger:state.ledger.filter(x=>x.user===user).slice(0,20)});}
   if(b.type==='job'){const jobs={store:{reward:180,label:'FTTR Store Assistant'},station:{reward:160,label:'Station Staff'},bus:{reward:190,label:'Bus Driver'},stadium:{reward:210,label:'Stadium Crew'},photo:{reward:220,label:'Matchday Photographer'},journalist:{reward:210,label:'City Journalist'},food:{reward:165,label:'Kitchen Worker'},barista:{reward:155,label:'Barista'},doctor:{reward:240,label:'Hospital Nurse'},medic:{reward:250,label:'Paramedic'},police:{reward:230,label:'Police Officer'},cleaner:{reward:145,label:'Street Cleaner'},mechanic:{reward:205,label:'Mechanic'},builder:{reward:200,label:'Construction Worker'},security:{reward:185,label:'Event Security'},gardener:{reward:140,label:'Park Gardener'}};const j=jobs[b.job];if(!j)return send(res,400,{error:'unknown_job'});const idempotency=String(b.idempotency||'').slice(0,100);if(!idempotency)return send(res,400,{error:'idempotency_required'});const scopedKey=`${user}:${idempotency}`;if(state.jobs[scopedKey])return send(res,200,{...state.jobs[scopedKey],duplicate:true});result=addLedger(user,j.reward,`Job: ${j.label}`,scopedKey);if(!result.ok)return send(res,409,{error:'insufficient_funds'});state.jobs[scopedKey]={ok:true,balance:result.balance,reward:j.reward,job:j.label};await save();return send(res,200,state.jobs[scopedKey]);}
   if(b.type==='spend'){const cost=Math.floor(Number(b.cost));if(!Number.isFinite(cost)||cost<1||cost>100000)return send(res,400,{error:'invalid_cost'});const idempotency=String(b.idempotency||'').slice(0,100);if(!idempotency)return send(res,400,{error:'idempotency_required'});const prior=state.ledger.find(x=>x.ref===idempotency&&x.user===user);if(prior)return send(res,200,{ok:true,balance:prior.balance,duplicate:true});result=addLedger(user,-cost,safeText(b.reason)||'City purchase',idempotency);if(!result.ok)return send(res,409,{error:'insufficient_funds',balance:result.balance});await save();return send(res,200,result);}
   return send(res,400,{error:'unknown_action'});
  }catch(e){return send(res,400,{error:'invalid_json'});}});return;
 }
 if(url.pathname.startsWith('/api/art')&&handleArt(req,res,url))return;
 if(serveStatic(req,res,url.pathname))return;
 return send(res,404,{error:'not_found'});
});
const wss=new WebSocketServer({server,path:'/ws',maxPayload:4096});
wss.on('connection',(ws,req)=>{
 if(!allowed(req)){ws.close(1008,'Origin not allowed');return;}
 const id=crypto.randomUUID();const room='central';const c={id,name:'Visitor',room,x:0,z:0,district:'Central City',avatar:'default',joined:now(),lastChat:0};clients.set(ws,c);
 ws.send(JSON.stringify({type:'welcome',id,room,online:onlineList(room),history:state.chat.slice(-30)}));broadcast(room,{type:'presence',action:'join',player:{id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);
 ws.on('message',(buf)=>{let m;try{m=JSON.parse(buf.toString());}catch{return;}if(!m||typeof m.type!=='string')return;
  if(m.type==='hello'){if(m.gid){c.gid=String(m.gid).replace(/[^a-z0-9-]/gi,'').slice(0,40);for(const [o,oc] of clients){if(o!==ws&&oc.gid&&oc.gid===c.gid){broadcast(oc.room,{type:'presence',action:'leave',player:{id:oc.id,name:oc.name}},o);clients.delete(o);try{o.close(4000,'replaced');}catch{}}}}c.name=safeName(m.name);c.district=safeName(m.district||'Central City');c.avatar=safeName(m.avatar||'default');ws.send(JSON.stringify({type:'profile',id:c.id,name:c.name}));broadcast(c.room,{type:'presence',action:'update',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='move'){let x=Number(m.x),z=Number(m.z);if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1000||Math.abs(z)>1000)return;const t=now(),dt=Math.max(.05,Math.min(2,(t-(c.lastMove||t-100))/1000)),step=Math.hypot(x-c.x,z-c.z),maxStep=dt*9+.5;c.lastMove=t;if(c.moved&&step>maxStep){ws.send(JSON.stringify({type:'correct',x:c.x,z:c.z}));return;}c.moved=true;c.x=Math.round(x*100)/100;c.z=Math.round(z*100)/100;if(typeof m.district==='string')c.district=safeName(m.district).slice(0,24);if(now()-(c.lastMove||0)<180)return;c.lastMove=now();broadcast(c.room,{type:'player_move',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='room'){const next=String(m.room||'central').replace(/[^a-z0-9_-]/gi,'').slice(0,32)||'central';broadcast(c.room,{type:'presence',action:'leave',player:{id:c.id,name:c.name}},ws);c.room=next;ws.send(JSON.stringify({type:'room_joined',room:next,online:onlineList(next)}));broadcast(c.room,{type:'presence',action:'join',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='chat'){const text=safeText(m.text);if(!text||now()-c.lastChat<900)return;if(!limiter(c.id,6,10000))return;c.lastChat=now();const msg={id:crypto.randomUUID(),user:c.name,text,room:c.room,at:new Date().toISOString()};state.chat.push(msg);state.chat=state.chat.slice(-500);save();broadcast(c.room,{type:'chat',message:msg});return;}
  if(m.type==='report'){if(!limiter('rp'+c.id,4,60000))return;state.reports.push({id:crypto.randomUUID(),by:c.name,user:safeName(m.user),text:safeText(m.text),at:new Date().toISOString()});if(state.reports.length>500)state.reports.shift();save();return;}
  if(m.type==='ping')ws.send(JSON.stringify({type:'pong',at:now()}));
 });
 ws.on('close',()=>{clients.delete(ws);broadcast(c.room,{type:'presence',action:'leave',player:{id:c.id,name:c.name}},ws);});
 ws.on('error',()=>{});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`FTTR CITY server listening on ${PORT}`));
process.on('SIGTERM',()=>{for(const ws of wss.clients)ws.close(1001,'Server restarting');server.close(()=>process.exit(0));});
