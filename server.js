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
const initial = { version:1, wallets:{}, ledger:[], jobs:{}, chat:[], football:{season:1,fixtures:[],clubs:[],players:[],transfers:[],demos:[]}, players:[] };
let state = initial;
try { if (fs.existsSync(DATA_FILE)) state = {...initial, ...JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}; } catch (e) { console.error('State load failed; using fresh state:', e.message); }
let saveChain = Promise.resolve();
function save(){ const snapshot=JSON.stringify(state); saveChain=saveChain.then(()=>fs.promises.writeFile(DATA_FILE+'.tmp',snapshot).then(()=>fs.promises.rename(DATA_FILE+'.tmp',DATA_FILE))).catch(e=>console.error('save failed',e)); return saveChain; }
const clients = new Map(); const rate = new Map();
const now = () => Date.now(); const safeName = s => String(s||'Visitor').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'Visitor';
const safeText = s => String(s||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,280);
function allowed(req){ const o=req.headers.origin; return !o || ORIGINS.has(o); }
function send(res,code,obj){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});res.end(JSON.stringify(obj));}
function broadcast(room,payload,except){const raw=JSON.stringify(payload);for(const [ws,c] of clients){if(ws!==except&&c.room===room&&ws.readyState===WebSocket.OPEN)ws.send(raw);}}
function onlineList(room){return [...clients.values()].filter(c=>c.room===room).map(c=>({id:c.id,name:c.name,x:c.x,z:c.z,district:c.district,avatar:c.avatar}));}
function addLedger(user,delta,reason,ref){const current=Number(state.wallets[user]??1250);const next=current+delta;if(next<0)return {ok:false,balance:current};state.wallets[user]=next;state.ledger.unshift({id:crypto.randomUUID(),user,delta,reason,ref:ref||null,balance:next,at:new Date().toISOString()});state.ledger=state.ledger.slice(0,10000);return {ok:true,balance:next};}
function limiter(key,max=12,windowMs=10000){const t=now();const a=(rate.get(key)||[]).filter(x=>t-x<windowMs);if(a.length>=max){rate.set(key,a);return false;}a.push(t);rate.set(key,a);return true;}
const server=http.createServer((req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});return res.end();}
 if(!allowed(req))return send(res,403,{error:'origin_not_allowed'});
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'fttr-city-realtime',version:1,online:clients.size,uptime:Math.round(process.uptime())});
 if(req.method==='GET'&&url.pathname==='/api/world')return send(res,200,{online:clients.size,players:state.players.length,chat:state.chat.slice(-30),football:state.football,features:{presence:true,chat:true,virtualWallet:true,jobs:true,serverPersistence:true}});
 if(req.method==='GET'&&url.pathname==='/api/leaderboard'){const totals={};for(const x of state.ledger)totals[x.user]=(totals[x.user]||0)+x.delta;return send(res,200,{leaderboard:Object.entries(totals).map(([name,earned])=>({name,earned})).sort((a,b)=>b.earned-a.earned).slice(0,20)});}
 if(req.method==='POST'&&url.pathname==='/api/action'){
  let body='';req.on('data',c=>{body+=c;if(body.length>10000)req.destroy();});req.on('end',async()=>{try{const b=JSON.parse(body||'{}');const user=safeName(b.user);const key=`${req.socket.remoteAddress}:${user}`;if(!limiter(key,10,60000))return send(res,429,{error:'rate_limited'});let result;
   if(b.type==='wallet'){return send(res,200,{balance:Number(state.wallets[user]??1250),ledger:state.ledger.filter(x=>x.user===user).slice(0,20)});}
   if(b.type==='job'){const jobs={store:{reward:180,label:'Store assistant'},station:{reward:150,label:'Station staff'},bus:{reward:170,label:'Bus driver'},stadium:{reward:200,label:'Stadium staff'},photo:{reward:220,label:'Match photographer'},journalist:{reward:210,label:'City journalist'},food:{reward:160,label:'Food worker'}};const j=jobs[b.job];if(!j)return send(res,400,{error:'unknown_job'});const idempotency=String(b.idempotency||'').slice(0,100);if(!idempotency)return send(res,400,{error:'idempotency_required'});const scopedKey=`${user}:${idempotency}`;if(state.jobs[scopedKey])return send(res,200,{...state.jobs[scopedKey],duplicate:true});result=addLedger(user,j.reward,`Job: ${j.label}`,scopedKey);if(!result.ok)return send(res,409,{error:'insufficient_funds'});state.jobs[scopedKey]={ok:true,balance:result.balance,reward:j.reward,job:j.label};await save();return send(res,200,state.jobs[scopedKey]);}
   if(b.type==='spend'){const cost=Math.floor(Number(b.cost));if(!Number.isFinite(cost)||cost<1||cost>100000)return send(res,400,{error:'invalid_cost'});const idempotency=String(b.idempotency||'').slice(0,100);if(!idempotency)return send(res,400,{error:'idempotency_required'});const prior=state.ledger.find(x=>x.ref===idempotency&&x.user===user);if(prior)return send(res,200,{ok:true,balance:prior.balance,duplicate:true});result=addLedger(user,-cost,safeText(b.reason)||'City purchase',idempotency);if(!result.ok)return send(res,409,{error:'insufficient_funds',balance:result.balance});await save();return send(res,200,result);}
   return send(res,400,{error:'unknown_action'});
  }catch(e){return send(res,400,{error:'invalid_json'});}});return;
 }
 return send(res,404,{error:'not_found'});
});
const wss=new WebSocketServer({server,path:'/ws',maxPayload:4096});
wss.on('connection',(ws,req)=>{
 if(!allowed(req)){ws.close(1008,'Origin not allowed');return;}
 const id=crypto.randomUUID();const room='central';const c={id,name:'Visitor',room,x:0,z:0,district:'Central City',avatar:'default',joined:now(),lastChat:0};clients.set(ws,c);
 ws.send(JSON.stringify({type:'welcome',id,room,online:onlineList(room),history:state.chat.slice(-30)}));broadcast(room,{type:'presence',action:'join',player:{id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);
 ws.on('message',(buf)=>{let m;try{m=JSON.parse(buf.toString());}catch{return;}if(!m||typeof m.type!=='string')return;
  if(m.type==='hello'){c.name=safeName(m.name);c.district=safeName(m.district||'Central City');c.avatar=safeName(m.avatar||'default');ws.send(JSON.stringify({type:'profile',id:c.id,name:c.name}));broadcast(c.room,{type:'presence',action:'update',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='move'){const x=Number(m.x),z=Number(m.z);if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1000||Math.abs(z)>1000)return;c.x=Math.round(x*100)/100;c.z=Math.round(z*100)/100;if(typeof m.district==='string')c.district=safeName(m.district).slice(0,24);if(now()-(c.lastMove||0)<180)return;c.lastMove=now();broadcast(c.room,{type:'player_move',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='room'){const next=String(m.room||'central').replace(/[^a-z0-9_-]/gi,'').slice(0,32)||'central';broadcast(c.room,{type:'presence',action:'leave',player:{id:c.id,name:c.name}},ws);c.room=next;ws.send(JSON.stringify({type:'room_joined',room:next,online:onlineList(next)}));broadcast(c.room,{type:'presence',action:'join',player:{id:c.id,name:c.name,x:c.x,z:c.z,district:c.district}},ws);return;}
  if(m.type==='chat'){const text=safeText(m.text);if(!text||now()-c.lastChat<900)return;if(!limiter(c.id,6,10000))return;c.lastChat=now();const msg={id:crypto.randomUUID(),user:c.name,text,room:c.room,at:new Date().toISOString()};state.chat.push(msg);state.chat=state.chat.slice(-500);save();broadcast(c.room,{type:'chat',message:msg});return;}
  if(m.type==='ping')ws.send(JSON.stringify({type:'pong',at:now()}));
 });
 ws.on('close',()=>{clients.delete(ws);broadcast(c.room,{type:'presence',action:'leave',player:{id:c.id,name:c.name}},ws);});
 ws.on('error',()=>{});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`FTTR CITY server listening on ${PORT}`));
process.on('SIGTERM',()=>{for(const ws of wss.clients)ws.close(1001,'Server restarting');server.close(()=>process.exit(0));});
