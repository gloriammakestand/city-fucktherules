(()=>{const P={map:'<path d="M12 21s-6-5.6-6-10a6 6 0 1112 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',chat:'<path d="M4 5h16v11H10l-5 4v-4H4z"/>',phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',aim:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',follow:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-4 3-6 6.5-6s5.900 2 6.500 6"/>',bus:'<rect x="4" y="4" width="16" height="13" rx="3"/><path d="M4 11h16M7.500 20v-3M16.500 20v-3"/>',ball:'<circle cx="12" cy="12" r="9"/><path d="M12 8l3.500 2.500-1.300 4h-4.400l-1.300-4zM12 8V3M15.500 10.500L20 9M14.200 14.500l2.800 3.500M9.800 14.500L7 18M8.500 10.500L4 9"/>',job:'<rect x="3" y="7.500" width="18" height="12.500" rx="2.500"/><path d="M9 7.500V5.500a1.500 1.500 0 011.500-1.500h3A1.500 1.500 0 0115 5.500v2M3 13h18"/>',burger:'<path d="M4 10a8 6 0 0116 0z"/><path d="M3 14h18"/><path d="M4.500 17.500h15a2 2 0 01-2 2.500h-11a2 2 0 01-2-2.500z"/>',drop:'<path d="M12 3s6 6.500 6 11a6 6 0 01-12 0c0-4.500 6-11 6-11z"/>',heart:'<path d="M12 20s-8-5-8-11a4.500 4.500 0 018-2.500A4.500 4.500 0 0120 9c0 6-8 11-8 11z"/>',bolt:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',smile:'<circle cx="12" cy="12" r="9"/><path d="M8.500 14.500a4.500 4.500 0 007 0M9 9.500h.01M15 9.500h.01"/>',mail:'<rect x="3" y="5.500" width="18" height="13" rx="2.500"/><path d="M3.500 7l8.500 6 8.500-6"/>',car:'<path d="M4 15v-3l2-5h12l2 5v3zM4 15v3M20 15v3M7 12h10"/>',cross:'<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M14.500 9a3 3 0 00-5 2c0 3 5 1.500 5 4.500a3 3 0 01-5 1.500M12 6.500v11"/>',home:'<path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4.500 21c.6-4.500 3.500-7 7.500-7s6.900 2.500 7.500 7"/>',bag:'<path d="M5 8h14l-1 12H6zM9 8V6.500a3 3 0 016 0V8"/>',seat:'<path d="M6 11V6h12v5M4 11h16v4H4zM6 15v5M18 15v5"/>',bed:'<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5"/><circle cx="7" cy="11" r="1.500"/>',star:'<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',menu:'<rect x="4" y="4" width="6.500" height="6.500" rx="1.800"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.800"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.800"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.800"/>',chev:'<path d="M6 9l6 6 6-6"/>',hand:'<path d="M9 11V5.500a1.500 1.500 0 013 0V11m0-1.500a1.500 1.500 0 013 0V11m0-.500a1.500 1.500 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-2.700L4 14.500a1.500 1.500 0 012.300-1.900L9 15"/>',gfx:'<path d="M12 3l1.800 4.700 4.700 1.800-4.700 1.800L12 16l-1.800-4.700L5.500 9.500l4.700-1.800z"/><path d="M19 15l.8 2.200 2.200.8-2.200.8L19 21l-.8-2.200-2.200-.8 2.200-.8z"/>'};
const ic=n=>'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+(P[n]||P.star)+'</svg>';
const E={'🍔':'burger','🥤':'drop','🏠':'home','🧑':'user','✚':'cross','🪑':'seat','😴':'bed','❤':'heart','⚡':'bolt','🙂':'smile','✉':'mail','⌖':'map','↗':'bus','⇄':'bus','◉':'ball','▤':'job','▦':'phone','₡':'coin','FT':'bag','✦':'star'};
const A={messages:'mail',map:'map',ride:'car',food:'burger',health:'cross',travel:'bus',football:'ball',jobs:'job',wallet:'coin',housing:'home',profile:'user',store:'bag'};
const set=(el,n)=>{if(el&&el.dataset.ic!==n){el.innerHTML=ic(n);el.dataset.ic=n;}};
const q=s=>document.querySelector(s),qa=s=>document.querySelectorAll(s);
function skin(){
 qa('[data-i]').forEach(e=>set(e,e.dataset.i));
 qa('.app-icon').forEach(b=>set(b.querySelector('span'),A[b.dataset.openApp]));
 qa('.service-icon').forEach(e=>{if(e.dataset.ic)return;const t=e.textContent.trim();set(e,E[t]||'star');});
 qa('.map-row .pin').forEach(e=>set(e,'map'));
 const ni=q('#noticeIcon');if(ni&&!ni.querySelector('svg')){delete ni.dataset.ic;set(ni,E[ni.textContent.trim()]||'star');}
}
let t=0;const run=()=>{cancelAnimationFrame(t);t=requestAnimationFrame(skin);};
new MutationObserver(run).observe(document.body,{childList:true,subtree:true,characterData:true});
/* ---- interaksi HUD (dock menu, status tambahan) ---- */
const dock=q('#hudDock'),tg=q('#dockToggle');
const setDock=v=>{if(!dock)return;dock.dataset.open=v?'true':'false';tg?.setAttribute('aria-expanded',v?'true':'false');};
tg?.addEventListener('click',()=>setDock(dock.dataset.open!=='true'));
qa('.quickbar button').forEach(b=>b.addEventListener('click',()=>setDock(false)));
q('#world')?.addEventListener('pointerdown',()=>setDock(false),{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setDock(false);});
const more=q('#statsMore'),stats=q('#hudStats');
more?.addEventListener('click',()=>{const v=!stats.classList.contains('expanded');stats.classList.toggle('expanded',v);more.setAttribute('aria-expanded',v?'true':'false');});
document.addEventListener('DOMContentLoaded',skin);skin();})();
