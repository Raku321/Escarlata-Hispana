
(() => {
  'use strict';
  if (window.__EH_MARKET__) return;

  const inHunt = () => {
    const city = /\b(?:cerulean(?: city)?|pewter(?: city)?|lavender(?: town)?|viridian(?: city)?|cassino|casino)\b/i;
    const loc = String(document.querySelector('.phud-tloc,[data-guide="player-location"],[data-guide="location"],.phud-location,.location-name')?.textContent || '').trim();
    if (loc && city.test(loc)) return false;
    const here = [...document.querySelectorAll('.hunt-marker.here,[data-guide^="hunt-"].here')]
      .some(x => !city.test((x.querySelector('.hunt-name')?.textContent || x.textContent || '').trim()));
    if (here) return true;
    const battle = [...document.querySelectorAll('[data-guide="capture-bar"],.hunt-ui,.battle-window,.wild-pokemon,.battle-area,.battle-screen')].some(x => { const cs=getComputedStyle(x); return cs.display!=='none' && cs.visibility!=='hidden' && x.getClientRects().length>0; });
    if (battle) return true;
    if (loc && !city.test(loc)) return true;
    return false;
  };

  const tokens = () => { try { return JSON.parse(sessionStorage.getItem('pokeweb:tokens') || 'null'); } catch { return null; } };
  async function refreshToken(){
    const t=tokens(); if(!t?.refreshToken) return null;
    const r=await fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:t.refreshToken})});
    if(!r.ok) return null;
    const j=await r.json(); if(j?.accessToken) sessionStorage.setItem('pokeweb:tokens',JSON.stringify(j));
    return j?.accessToken||null;
  }
  async function api(url,opt={}){
    const send=a=>fetch(url,{...opt,headers:{...(opt.body?{'Content-Type':'application/json'}:{}),...(a?{Authorization:`Bearer ${a}`} :{}),...(opt.headers||{})}});
    let r=await send(tokens()?.accessToken);
    if(r.status===401){ const a=await refreshToken(); if(a) r=await send(a); }
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j?.message||`HTTP ${r.status}`);
    return j;
  }
  const listings=p=>{
    if(Array.isArray(p)) return p;
    for(const k of ['listings','items','results','offers','data']){
      if(Array.isArray(p?.[k])) return p[k];
      if(p?.[k]&&p[k]!==p){const a=listings(p[k]);if(a.length)return a;}
    }
    return [];
  };
  const cur=v=>/DIAM|^DD$/i.test(String(v||''))?'DIAMONDS':'GOLD';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let timer=null, current=[], category='Pokemon';

  function nativeSell(){
    if(inHunt()) return alert('🔒 Venta bloqueada: debes salir de la hunt.');
    const selectors=['[data-guide*="market" i]','[data-guide*="mercado" i]','.mkt2-open','.market-open'];
    let b=null;
    for(const sel of selectors){ b=document.querySelector(sel); if(b)break; }
    if(!b){
      b=[...document.querySelectorAll('button,[role="button"],a')].find(x=>/mercado\\s*global|global\\s*market|mercado/i.test((x.textContent||'').trim()));
    }
    if(b){ b.click(); return; }
    // Fallback: Escarlata can still buy here; selling requires native sell UI because it exposes owned IDs safely.
    alert('Para publicar una venta, abre una vez el Mercado Global desde el menú del juego. Escarlata detectará esa ventana sin salir de esta cuenta.');
  }

  async function buy(e,btn){
    if(inHunt()) return alert('🔒 Compra bloqueada: debes salir de la hunt.');
    const price=Number(e.price??e.totalPrice??e.value??0), qty=Number(e.quantity??e.qty??e.amount??1);
    if(!(price>0)) return;
    const name=e.name||e.title||e.itemName||e.pokemonName||e.item?.name||e.pokemon?.name||'anuncio';
    if(!confirm(`Comprar ${name} por ${price.toLocaleString('es-CL')} ${cur(e.currency)==='DIAMONDS'?'DD':'$'}?`)) return;
    btn.disabled=true;
    try{
      if(inHunt()) throw new Error('Sal de la hunt antes de comprar.');
      const action=(e.kind==='pokemon'||category==='Pokemon')
        ? {action:'buy',id:e.id,quantity:1}
        : {action:'buy-stack',kind:e.kind||'item',refId:e.refId??e.itemId,price:e.price,currency:e.currency,quantity:1,ids:(e.ids??[e.id]).slice(0,1)};
      await api('/api/game/market/action',{method:'POST',body:JSON.stringify(action)});
      await load();
    }catch(err){alert('No se pudo comprar: '+err.message);btn.disabled=false;}
  }

  function render(){
    const root=document.getElementById('eh-market-list'); if(!root)return;
    const q=(document.getElementById('eh-market-q')?.value||'').toLowerCase();
    const iv=Number(document.getElementById('eh-market-iv')?.value||0);
    const sort=document.getElementById('eh-market-sort')?.value||'level-desc';
    const currencyFilter=document.getElementById('eh-market-currency')?.value||'ALL';
    let arr=current.filter(e=>{
      const r=e.item||e.pokemon||e.product||{};
      const n=String(e.name||e.title||e.itemName||e.pokemonName||r.name||'');
      const ec=cur(e.currency||e.currencyType||r.currency||r.currencyType);
      return (!q||n.toLowerCase().includes(q)) && (!iv||Number(e.ivTotal??r.ivTotal??e.iv??r.iv??0)>=iv) && (currencyFilter==='ALL'||ec===currencyFilter);
    });
    const level=e=>Number(e.level??e.pokemon?.level??e.product?.level??0);
    const price=e=>Number(e.price??e.totalPrice??e.value??0);
    if(sort==='level-desc') arr.sort((a,b)=>level(b)-level(a)||Number(b.ivTotal??b.iv??0)-Number(a.ivTotal??a.iv??0));
    else if(sort==='iv-desc') arr.sort((a,b)=>Number(b.ivTotal??b.iv??0)-Number(a.ivTotal??a.iv??0)||level(b)-level(a));
    else if(sort==='price-asc') arr.sort((a,b)=>price(a)-price(b));
    else if(sort==='price-desc') arr.sort((a,b)=>price(b)-price(a));
    root.innerHTML='';
    for(const e of arr.slice(0,300)){
      const r=e.item||e.pokemon||e.product||{}, n=e.name||e.title||e.itemName||e.pokemonName||r.name||'—';
      const p=price(e), ivt=e.ivTotal??r.ivTotal??e.iv??r.iv, qual=e.quality??r.quality;
      const qty=Number(e.quantity??e.qty??e.amount??e.ids?.length??1);
      const lvl=level(e);
      const currency=cur(e.currency||e.currencyType||r.currency||r.currencyType);
      const money=currency==='DIAMONDS'?`💎 ${p.toLocaleString('es-CL')} DD`:`💲 ${p.toLocaleString('es-CL')} Dollars`;
      const row=document.createElement('div'); row.className='ehm-row';
      row.innerHTML=`<div><b>${esc(n)}${lvl?` · Nv.${lvl}`:''}</b><small>${ivt!=null?`IV ${esc(ivt)}/192`:''}${qual!=null?` · Q ${Number(qual).toFixed(2)}`:''}${category!=='Pokemon'?` · Cantidad: ${qty.toLocaleString('es-CL')}`:''}</small></div><strong>${p?money:'Oferta'}</strong>`;
      const b=document.createElement('button');b.textContent='Comprar';b.disabled=!(p>0)||inHunt();b.onclick=()=>buy(e,b);row.appendChild(b);root.appendChild(row);
    }
    document.getElementById('eh-market-status').textContent=`${arr.length} anuncios · ${inHunt()?'🔒 EN HUNT: comprar/vender bloqueado':'🟢 Fuera de hunt: operaciones habilitadas'} · actualización cada 20 s`;
  }
  async function load(){
    const st=document.getElementById('eh-market-status'); if(st)st.textContent='Actualizando mercado…';
    try{ current=listings(await api(`/api/game/market?category=${encodeURIComponent(category)}`)); render(); }
    catch(e){ if(st)st.textContent='Error al cargar mercado: '+e.message; }
  }

  function close(){ clearInterval(timer);timer=null;document.getElementById('eh-market-back')?.remove(); }
  function open(){
    close();
    const d=document.createElement('div');d.id='eh-market-back';
    d.innerHTML=`<style>
#eh-market-back{position:fixed;inset:0;z-index:2147483000;background:#000b;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}
#eh-market-box{width:min(920px,96vw);height:min(720px,92vh);background:#0d1119;border:2px solid #8d2436;border-radius:12px;color:#eef2f7;display:flex;flex-direction:column;box-shadow:0 20px 70px #000}
#eh-market-head{display:flex;gap:8px;align-items:center;padding:12px;border-bottom:1px solid #35202a}#eh-market-head b{flex:1;font-size:18px}
#eh-market-controls{display:flex;gap:8px;flex-wrap:wrap;padding:10px}#eh-market-controls input,#eh-market-controls select,#eh-market-controls button,#eh-market-head button{background:#171e2a;color:#fff;border:1px solid #4b5568;border-radius:7px;padding:8px}
#eh-market-controls button{background:#7d2030;border-color:#b83a50;font-weight:800}#eh-market-list{overflow:auto;flex:1;padding:0 10px 10px}
.ehm-row{display:grid;grid-template-columns:1fr 150px 90px;gap:10px;align-items:center;padding:9px;border-bottom:1px solid #222c3a}.ehm-row small{display:block;color:#9da9ba;margin-top:3px}.ehm-row strong{color:#f2c55c}.ehm-row button{background:#238636;color:white;border:1px solid #3fb950;border-radius:7px;padding:7px;font-weight:800}.ehm-row button:disabled{opacity:.35}
#eh-market-status{padding:8px 12px;color:#b8c0ce;border-top:1px solid #252e3b;font-size:12px}
</style><div id="eh-market-box"><div id="eh-market-head"><b>🌐 Mercado Global — Escarlata Hispana</b><button id="eh-market-close">✕</button></div>
<div id="eh-market-controls"><select id="eh-market-cat"><option value="Pokemon">Pokémon</option><option value="Items">Ítems</option><option value="Stones">Stones</option><option value="Poke Balls">Poké Balls</option><option value="Diamonds">Diamantes</option><option value="All">Todo</option></select><input id="eh-market-q" placeholder="Buscar…"><input id="eh-market-iv" type="number" min="0" max="192" placeholder="IV mín."><select id="eh-market-currency"><option value="ALL">💰 Todas</option><option value="DIAMONDS">💎 Solo DD</option><option value="GOLD">💲 Solo Dollars</option></select><select id="eh-market-sort"><option value="level-desc">Nivel: mayor a menor</option><option value="iv-desc">IV: mayor a menor</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option></select><button id="eh-market-refresh">↻ Actualizar</button><button id="eh-market-sell">📤 Vender / publicar</button></div><div id="eh-market-list"></div><div id="eh-market-status"></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#eh-market-close').onclick=close;
    d.querySelector('#eh-market-refresh').onclick=load;
    d.querySelector('#eh-market-sell').onclick=nativeSell;
    d.querySelector('#eh-market-q').oninput=render; d.querySelector('#eh-market-iv').oninput=render; d.querySelector('#eh-market-currency').onchange=render; d.querySelector('#eh-market-sort').onchange=render;
    d.querySelector('#eh-market-cat').onchange=e=>{category=e.target.value;load();};
    load(); timer=setInterval(load,20000);
  }
  window.__EH_MARKET__={
    open,close,load,isInHunt:inHunt,
    apiRaw:api,listingsRaw:listings,
    buyRaw:async(e,cat)=>{
      if(inHunt()) throw new Error('Sal de la hunt antes de comprar.');
      const action=(e.kind==='pokemon'||cat==='Pokemon')
        ? {action:'buy',id:e.id,quantity:1}
        : {action:'buy-stack',kind:e.kind||'item',refId:e.refId??e.itemId,price:e.price,currency:e.currency,quantity:1,ids:(e.ids??[e.id]).slice(0,1)};
      return api('/api/game/market/action',{method:'POST',body:JSON.stringify(action)});
    }
  };
})();
