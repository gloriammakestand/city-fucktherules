/* FTTR CITY realtime client: koneksi otomatis ke server kota (alamat dari config.js). */
(() => {
 'use strict';
 const $=s=>document.querySelector(s);
 const API=String(window.FTTR_CITY_API||'').replace(/\/$/,'');
 const guest=(()=>{let g=localStorage.getItem('fttr.city.guest');if(!g){g=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());localStorage.setItem('fttr.city.guest',g);}return g;})();
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let ws=null,state=API?'connecting':'unconfigured',retry=0,timer=null,pingT=null,myId=null,room='central',players=new Map(),sent=[],lastSend=0,unread=0,open=false,ui=null;
 const blocked=new Set(JSON.parse(localStorage.getItem('fttr.city.blocked')||'[]'));
 const nameNow=()=>(window.FTTRCity?.name?.()||localStorage.getItem('fttr.city.name')||'Warga').slice(0,24);
 const LABEL={unconfigured:'Mode solo · server belum dikonfigurasi',connecting:'Menghubungkan...',on:'Online',reconnecting:'Menghubungkan kembali...',off:'Koneksi terputus',down:'Server sedang tidak tersedia'};
 function setState(s){state=s;const b=$('#onlineBtn');if(b)b.dataset.state=s==='on'?'on':s==='unconfigured'||s==='off'||s==='down'?'off':'wait';render();}
 function build(){if(ui)return;ui=document.createElement('section');ui.id='chatDock';ui.hidden=true;
  ui.innerHTML='<header><div><b id="chatStatus"></b><small id="chatCount"></small></div><button class="solid-btn" id="chatRetry" hidden>COBA LAGI</button><button class="round-close" id="chatClose" aria-label="Tutup">×</button></header><div id="chatPlayers" class="chat-players"></div><div id="chatLog" class="online-chat" aria-live="polite"></div><form id="chatForm"><input class="input" id="chatDraft" maxlength="280" autocomplete="off" placeholder="Pesan ke kota..."><button class="solid-btn acid" type="submit">KIRIM</button></form>';
  document.body.appendChild(ui);$('#chatClose').onclick=()=>toggle(false);$('#chatRetry').onclick=()=>{retry=0;connect();};
  $('#chatForm').onsubmit=e=>{e.preventDefault();const i=$('#chatDraft'),t=i.value.trim();if(!t)return;if(!say(t))return;i.value='';};render();}
 function toggle(v){build();open=v===undefined?!open:v;ui.hidden=!open;if(open){unread=0;$('#chatLog').scrollTop=1e9;}badge();}
 function badge(){const b=$('#onlineBtn');if(b)b.dataset.unread=unread&&!open?String(Math.min(unread,9)):'';}
 function render(){if(!ui)return;$('#chatStatus').textContent=(state==='on'?'● ':'○ ')+LABEL[state];$('#chatStatus').className=state==='on'?'is-online':'';$('#chatRetry').hidden=!(state==='off'||state==='down');
  $('#chatCount').textContent=state==='on'?players.size+' pemain online':'';$('#chatDraft').disabled=state!=='on';$('#chatDraft').placeholder=state==='on'?'Pesan ke kota...':'Chat aktif saat online';
  $('#chatPlayers').innerHTML=[...players.values()].filter(p=>p.id!==myId).slice(0,12).map(p=>'<span class="chat-chip">'+esc(p.name)+'</span>').join('');}
 function addChat(m,silent){if(blocked.has(m.user))return;build();const el=$('#chatLog'),d=document.createElement('div'),me=m.user===nameNow();d.className='online-chat-message';
  d.innerHTML='<small>'+esc(m.user||'?')+' · '+esc(new Date(m.at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))+(me?'':' <button data-a="block" aria-label="Blokir">⛔</button><button data-a="report" aria-label="Laporkan">⚑</button>')+'</small><div>'+esc(m.text||'')+'</div>';
  d.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.a==='block'){blocked.add(m.user);localStorage.setItem('fttr.city.blocked',JSON.stringify([...blocked]));d.remove();window.FTTRCity?.toast?.('Pemain diblokir');}else{raw({type:'report',user:m.user,text:m.text,id:m.id});window.FTTRCity?.toast?.('Laporan dikirim');}});
  el.appendChild(d);while(el.children.length>80)el.firstChild.remove();el.scrollTop=el.scrollHeight;if(!open&&!silent){unread++;badge();}}
 function raw(o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}
 function say(t){if(state!=='on'){return false;}const n=Date.now();sent=sent.filter(x=>n-x<10000);if(n-lastSend<1000||sent.length>=5){window.FTTRCity?.toast?.('Pelan-pelan, jangan spam');return false;}lastSend=n;sent.push(n);raw({type:'chat',text:t.slice(0,280)});return true;}
 function hello(){raw({type:'hello',name:nameNow(),gid:guest,district:window.FTTRCity?.district?.()||'Central City'});}
 function handle(m){
  if(m.type==='welcome'||m.type==='room_joined'){if(m.type==='welcome')myId=m.id;room=m.room||room;players.clear();(m.online||[]).forEach(p=>{players.set(p.id,p);if(p.id!==myId)window.FTTRCity?.remoteMove?.(p);});build();(m.history||[]).forEach(x=>addChat(x,true));retry=0;setState('on');if(m.type==='welcome')hello();return;}
  if(m.type==='presence'){if(m.action==='leave'){players.delete(m.player.id);window.FTTRCity?.removeRemote?.(m.player.id);}else if(m.player.id!==myId){players.set(m.player.id,m.player);window.FTTRCity?.remoteMove?.(m.player);}render();return;}
  if(m.type==='player_move'){if(m.player.id===myId)return;players.set(m.player.id,m.player);window.FTTRCity?.remoteMove?.(m.player);return;}
  if(m.type==='chat'){addChat(m.message);return;}
  if(m.type==='correct'){window.FTTRCity?.teleport?.(m.x,m.z);return;}}
 function connect(){clearTimeout(timer);if(!API){setState('unconfigured');return;}if(ws){ws.onclose=null;try{ws.close();}catch{}}
  setState(retry?'reconnecting':'connecting');let sock;try{sock=new WebSocket(API.replace(/^http/,'ws')+'/ws');}catch{setState('down');return;}ws=sock;
  sock.onopen=()=>{clearInterval(pingT);pingT=setInterval(()=>raw({type:'ping'}),25000);};
  sock.onmessage=e=>{try{handle(JSON.parse(e.data));}catch{}};
  sock.onerror=()=>{};
  sock.onclose=()=>{clearInterval(pingT);players.clear();myId=null;window.FTTRCity?.clearRemotes?.();retry++;setState(retry>5?'down':'reconnecting');timer=setTimeout(connect,Math.min(15000,1000*retry*1.5));};}
 async function action(data){if(!API)throw new Error('Server kota belum dikonfigurasi');const r=await fetch(API+'/api/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...data,user:nameNow(),gid:guest})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Permintaan gagal');return j;}
 function sendPosition(x,z,district){if(state==='on')raw({type:'move',x,z,district});}
 function sendRoom(next){room=next;raw({type:'room',room:next});}
 window.FTTROnline={open:()=>toggle(),toggle,hello,sendPosition,sendRoom,action,get api(){return API;},get connected(){return state==='on';},get name(){return nameNow();},get guest(){return guest;}};
 const start=()=>{$('#onlineBtn')?.addEventListener('click',()=>toggle());build();setState(state);if(API)connect();};
 addEventListener('online',()=>{if(API&&state!=='on'){retry=0;connect();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&API&&state!=='on'&&state!=='connecting'){retry=0;connect();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
