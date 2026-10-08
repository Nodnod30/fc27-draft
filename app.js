'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types=['Club','Position','Match','Permanent'];
const fresh=()=>({coins:10000,diamonds:0,owned:{},pity:Object.fromEntries(types.map(t=>[t,{six:0,seven:0,guaranteed:false}])),history:[],exchanges:{},total:0});
let state;try{state=JSON.parse(localStorage.getItem('fc27-v1'))||fresh()}catch{state=fresh()}
// Retain six/seven counters; the retired 80-draw counter does not imply a lost 50/50.
for(const t of types){const p=state.pity[t]||{};state.pity[t]={six:p.six||0,seven:p.seven||0,guaranteed:t!=='Permanent'&&!!p.guaranteed}}
let players=[],all=[],type='Club',pool=[],featured=[],shop=[],weekKey='',weekly,view='draft';
const limits={pool:48,owned:48,db:48};
const save=()=>{try{localStorage.setItem('fc27-v1',JSON.stringify(state))}catch{toast('浏览器未允许保存；当前进度仅本次有效')}};
function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('toast').style.opacity=0,3000)}
function week(){const now=new Date(Date.now()+8*3600000);now.setUTCHours(0,0,0,0);now.setUTCDate(now.getUTCDate()-(now.getUTCDay()+6)%7);const key=now.toISOString().slice(0,10);return key==='2026-10-05'?key+'-r2':key}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function shuffle(a,seed){a=[...a];let x=seed||1;for(let i=a.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function eligible(a){return [5,6,7].every(r=>a.some(p=>p.stars===r))}
function rotate(){
 weekKey=week();const seed=hash(weekKey),sevenCount=players.filter(p=>p.stars===7).length;
 const themeReady=a=>[6,7].every(r=>a.some(p=>p.stars===r))&&a.filter(p=>p.stars===7).length<sevenCount;
 const clubs=[...new Set(players.map(p=>p.club))].filter(c=>themeReady(players.filter(p=>p.club===c))).sort();
 const positions=[...new Set(players.map(p=>p.position))].filter(c=>themeReady(players.filter(p=>p.position===c))).sort();
 if(clubs.length<4||!positions.length)throw Error('数据不足以支持本周主题');
 const cs=shuffle(clubs,seed),pos=shuffle(positions,seed+11)[0];
 const setup=(title,desc,theme)=>({title,desc,theme:[...theme].sort(FC.scoreSort),pool:FC.themePool(players,theme)});
 weekly={
  Club:setup(cs[0]+' / '+cs[1],'双俱乐部主题 · 七星50/50精选，五星全库补充',players.filter(p=>cs.slice(0,2).includes(p.club))),
  Position:setup(pos+' / 位置精选','六星限定主位置 '+pos+' · 七星50/50精选，五星全库补充',players.filter(p=>p.position===pos)),
  Match:setup(cs[2]+' × '+cs[3],'双俱乐部主题对阵（非实时赛程） · 七星50/50精选',players.filter(p=>cs.slice(2,4).includes(p.club))),
  Permanent:{title:'常驻 / 全明星招募',desc:'完整男足 Gold 卡池 · 全部球员 · 无精选大保底',theme:players,pool:players}
 };
 shop=shuffle(players.filter(p=>p.stars===7),seed+39).slice(0,8).sort(FC.scoreSort);
 $('week').textContent=weekKey.slice(0,10)+(weekKey.endsWith('-r2')?' · 10月8日测试更新':'')+' 本周精选 · 周一更新';setType(type);renderShop();
}
function card(p,status='',action=''){
 return `<div class="cardwrap" data-score="${p.score}"><div class="card r${p.stars}"><div class="cardtop"><span class="score">${p.score}</span><span class="pos">${esc(p.position)}</span></div><div class="portrait"><span class="initials">${esc(p.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span>${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove()">`:''}</div><div class="name" title="${esc(p.name)}">${esc(p.name)}</div><div class="club" title="${esc(p.club)}">${esc(p.club)}</div><div class="nationality">${esc(p.nationality)}</div><div class="stars">${'★'.repeat(p.stars)}</div><div class="stats"><span>能力 <b>${p.overall}</b></span><span>潜力 <b>${p.potential}</b></span></div></div>${status?`<div class="status">${esc(status)}</div>`:''}${action}</div>`;
}
function setType(t){
 if(!weekly)return toast('球员数据加载中，请稍候');
 type=t;pool=weekly[t].pool;featured=t==='Permanent'?[]:weekly[t].theme.filter(p=>p.stars===7);
 $('poolTitle').textContent=weekly[t].title;$('poolDesc').textContent=weekly[t].desc;
 const hero=(t==='Permanent'?players.filter(p=>p.stars===7):featured).slice(0,3);
 $('heroCards').innerHTML=hero.map(p=>card(p)).join('');document.querySelector('.tag').textContent=t==='Permanent'?'ALWAYS AVAILABLE':'WEEKLY SELECTION';
 document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===t));$('pityType').textContent=t==='Permanent'?'常驻':t;
 $('poolPageTitle').textContent=t==='Permanent'?'常驻全卡池':weekly[t].title+' · 主题球员';
 $('poolPageDesc').textContent=t==='Permanent'?'显示全部可抽男足球员，按评分降序排列。':'仅展示符合本期主题的球员。实际五星档含全库五星；七星歪出档含主题外七星，这些补充卡不在本页展示。';
 limits.pool=48;refreshFacets('pool');renderPool();renderWallet();
}
function renderWallet(){
 $('coins').textContent=state.coins.toLocaleString();$('diamonds').textContent=state.diamonds.toLocaleString();$('totalDraws').textContent=state.total+' 次招募';
 const p=state.pity[type];$('meters').innerHTML=[['six','六星及以上',10],['seven','七星球员',60]].map(([k,n,max])=>`<div class="meter"><label>${n}<b>${p[k]} / ${max}</b></label><progress max="${max}" value="${p[k]}"></progress><small>最迟 ${max-p[k]} 抽内获得</small></div>`).join('')+(type==='Permanent'?'<div class="guarantee">常驻池 · 无精选大保底</div>':`<div class="guarantee ${p.guaranteed?'ready':''}"><b>${p.guaranteed?'大保底已就绪':'七星精选 · 50/50'}</b><p>${p.guaranteed?'下一次七星一定符合本期主题':'七星50%精选，50%其他；歪出后下一次七星必精选'}</p></div>`);
 $('single').disabled=state.coins<100;$('ten').disabled=state.coins<1000;
}
function draw(n){
 if(week()!==weekKey)rotate();if(state.coins<n*100)return toast('金币不足，领取试玩金币后再招募');if(!eligible(pool))return toast('当前主题数据不完整，无法招募');
 const tx=JSON.parse(JSON.stringify(state)),results=[];
 try{
  for(let i=0;i<n;i++){const r=FC.draw(pool,featured,tx.pity[type],tx.owned,secureRandom);tx.pity[type]=r.pity;tx.coins-=100;tx.diamonds+=r.diamonds;tx.owned[r.card.id]=(tx.owned[r.card.id]||0)+1;tx.total++;results.push({...r,time:new Date().toISOString(),type,week:weekKey});}
  tx.history=[...results].reverse().concat(tx.history).slice(0,200);state=tx;save();renderWallet();renderRecent();renderOwned();renderShop();
  $('revealCards').innerHTML=[...results].sort((a,b)=>FC.scoreSort(a.card,b.card)).map(r=>card(r.card,(r.duplicate?'重复 · +'+r.diamonds+' 钻石':'首次签约')+(r.reason!=='基础概率'?' · '+r.reason:''))).join('');
  $('revealSummary').textContent=`${n} 次招募 · ${n*100} 金币 · 返还 ${results.reduce((s,r)=>s+r.diamonds,0)} 钻石 · 按评分降序`;$('reveal').showModal();
 }catch(e){toast(e.message)}
}
function secureRandom(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296}
function renderRecent(){
 $('recent').classList.toggle('empty',!state.history.length);
 $('recent').innerHTML=state.history.length?state.history.slice(0,5).sort((a,b)=>FC.scoreSort(a.card,b.card)).map(r=>card(r.card,r.duplicate?'重复 +'+r.diamonds+'◇':'新球员')).join(''):'灯光即将亮起。开启你的第一次招募。';
}
function renderOwned(){refreshFacets('owned');renderList('owned')}
function renderShop(){
 $('shopCards').innerHTML=shop.map(p=>{const done=state.exchanges[weekKey+':'+p.id];return card(p,state.owned[p.id]?'已拥有 · 再兑换返10钻':'自选七星',`<button class="primary" data-exchange="${esc(p.id)}" ${done||state.diamonds<80?'disabled':''}>${done?'本周已兑换':'◇ 80 · 兑换球员'}</button>`)}).join('');
 document.querySelectorAll('[data-exchange]').forEach(b=>b.onclick=()=>exchange(b.dataset.exchange));
}
function exchange(id){
 if(week()!==weekKey){rotate();return toast('商店已换周，请重新选择')}
 const p=shop.find(x=>x.id===id),key=weekKey+':'+id;if(!p||state.diamonds<80||state.exchanges[key])return;
 const dup=!!state.owned[id];state.diamonds-=80;if(dup)state.diamonds+=10;state.owned[id]=(state.owned[id]||0)+1;state.exchanges[key]=true;save();renderWallet();renderShop();renderOwned();toast('已签约 '+p.name+(dup?' · 重复返10钻':''));
}
const filterKeys=['search','stars','position','min','max','club','nationality'];
function scope(prefix){return prefix==='pool'?(weekly?.[type].theme||[]):prefix==='owned'?players.filter(p=>state.owned[p.id]):players}
function mountFilters(prefix){
 const controls=`<label class="searchlabel">搜索<input id="${prefix}-search" placeholder="球员、俱乐部、国籍" type="search"></label><label>星级<select id="${prefix}-stars"><option value="">全部星级</option><option value="7">七星</option><option value="6">六星</option><option value="5">五星</option></select></label><label>位置<select id="${prefix}-position"><option value="">全部位置</option></select></label><label>最低评分<input id="${prefix}-min" type="number" min="75" max="100" step="0.5" placeholder="75"></label><label>最高评分<input id="${prefix}-max" type="number" min="75" max="100" step="0.5" placeholder="不限"></label><label class="wide">俱乐部<select id="${prefix}-club"><option value="">全部俱乐部</option></select></label><label class="wide">国籍<select id="${prefix}-nationality"><option value="">全部国籍</option></select></label><button id="${prefix}-reset" class="ghost">重置筛选</button><span class="filterhint">俱乐部／国籍按本页球员人数降序 · 球员按评分降序</span>`;
 $(prefix+'-filters').innerHTML=controls;
 for(const key of filterKeys)$(prefix+'-'+key)[key==='search'||key==='min'||key==='max'?'oninput':'onchange']=()=>{limits[prefix]=48;renderList(prefix)};
 $(prefix+'-reset').onclick=()=>{for(const key of filterKeys)$(prefix+'-'+key).value='';limits[prefix]=48;renderList(prefix)};
 $(prefix+'-more').onclick=()=>{limits[prefix]+=48;renderList(prefix)};
}
function refreshFacets(prefix){
 const base=scope(prefix);
 for(const [key,label] of [['position','全部位置'],['club','全部俱乐部'],['nationality','全部国籍']]){
  const select=$(prefix+'-'+key),previous=select.value;
  const options=FC.facetOptions(base,key);select.innerHTML=`<option value="">${label}</option>`+options.map(o=>`<option value="${esc(o.value)}">${esc(o.value)} (${o.count})</option>`).join('');select.value=options.some(o=>o.value===previous)?previous:'';
 }
}
function readFilters(prefix){return Object.fromEntries(filterKeys.map(k=>[k,$(prefix+'-'+k).value]))}
function renderList(prefix){
 const base=scope(prefix),filters=readFilters(prefix),a=FC.filterPlayers(base,filters);
 const invalid=filters.min!==''&&filters.max!==''&&+filters.min>+filters.max;
 $(prefix+'-count').textContent=`${a.length} / ${base.length} 位球员 · 评分降序`;
 if(prefix==='owned')$('ownedCount').textContent=base.length+' 位已签约球员';
 const action=p=>prefix==='db'?`<a class="fine" href="${esc(p.source)}" target="_blank" rel="noreferrer">数据来源 ↗</a>`:'';
 $(prefix+'-cards').innerHTML=a.length?a.slice(0,limits[prefix]).map(p=>card(p,prefix==='owned'?'持有 '+state.owned[p.id]+' 张':'',action(p))).join(''):`<p class="empty">${invalid?'最低评分不能高于最高评分':prefix==='owned'&&!base.length?'完成首次招募，组建你的俱乐部。':'没有符合筛选条件的球员，请调整或重置筛选。'}</p>`;
 $(prefix+'-more').hidden=a.length<=limits[prefix];
}
function renderPool(){renderList('pool')}
function renderDB(){renderList('db')}
function show(v){
 view=v;document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!==v);document.querySelectorAll('nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
 if(v==='database')renderDB();if(v==='shop')renderShop();if(v==='collection')renderOwned();if(v==='poolview')renderPool();
}
for(const prefix of ['pool','owned','db'])mountFilters(prefix);
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>setType(b.dataset.type));
$('single').onclick=()=>draw(1);$('ten').onclick=()=>draw(10);$('fund').onclick=()=>{state.coins+=10000;save();renderWallet();toast('已领取 10,000 试玩金币')};$('closeReveal').onclick=()=>$('reveal').close();$('showPool').onclick=()=>show('poolview');
fetch('players.json').then(r=>{if(!r.ok)throw Error('数据文件加载失败');return r.json()}).then(data=>{
 all=data.players.filter(p=>p.gender==='men');players=all.filter(p=>p.potential!==null&&p.stars!==null).sort(FC.scoreSort);
 const valid=new Set(players.map(p=>p.id));state.owned=Object.fromEntries(Object.entries(state.owned).filter(([id])=>valid.has(id)));state.history=state.history.filter(r=>valid.has(r.card.id)).map(r=>({...r,card:players.find(p=>p.id===r.card.id)}));save();
 $('dbCount').textContent=players.length;$('warning').textContent='试玩数据说明：仅男足 · FC27 能力值 + FC26 沿用潜力；主位置待与 Gold 卡面逐卡核验。快照 2026-10-05 · '+players.length+' 位可抽球员';
 $('distribution').innerHTML='<h3>06 / 当前快照的划档分布</h3><p>'+[5,6,7].map(r=>`${r}星：${players.filter(p=>p.stars===r).length} 位（${(players.filter(p=>p.stars===r).length/players.length*100).toFixed(1)}%）`).join(' · ')+'。球员数量占比不是抽卡概率。</p><p>Gold记录 '+all.length+' 位；排除缺失或不适用评分 '+(all.length-players.length)+' 位。</p>';
 refreshFacets('db');rotate();renderRecent();renderOwned();if(view==='database')renderDB();
 setInterval(()=>{if(week()!==weekKey){rotate();toast('每周精选与商店已更新，计数和大保底已继承')}},30000);
}).catch(e=>{$('warning').textContent='数据暂不可用：'+e.message;$('single').disabled=$('ten').disabled=true});
