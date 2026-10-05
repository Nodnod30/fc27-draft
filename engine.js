(function(root){
'use strict';
const stars=p=>p.score>=86?7:p.score>=82?6:5;
const scoreSort=(a,b)=>b.score-a.score||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
const pick=(a,r)=>{if(!a.length)throw Error('当前卡池缺少对应稀有度球员');return a[Math.min(a.length-1,Math.floor(r()*a.length))]};
function draw(pool,featured,pity,owned,random=Math.random){
 const themed=featured.length>0;
 const next={six:pity.six+1,seven:pity.seven+1,guaranteed:themed&&!!pity.guaranteed};
 const r=random();let rarity,reason='基础概率';
 if(next.seven>=60){rarity=7;reason='60抽七星保底'}
 else if(r<.008)rarity=7;
 else if(next.six>=10){rarity=6;reason='10抽六星保底'}
 else rarity=r<.059?6:5;
 let candidates=pool.filter(p=>p.stars===rarity),isFeatured=false;
 if(rarity===7&&themed){
  const ids=new Set(featured.map(p=>p.id));
  const other=candidates.filter(p=>!ids.has(p.id));
  if(!other.length)throw Error('当前主题缺少非精选七星，无法执行50/50');
  isFeatured=next.guaranteed||random()<.5;
  if(next.guaranteed)reason+=' · 精选大保底';
  else reason+=isFeatured?' · 50/50命中精选':' · 50/50非精选，下次七星必精选';
  candidates=isFeatured?featured:other;
  next.guaranteed=!isFeatured;
 }
 const card=pick(candidates,random);
 if(rarity>=6)next.six=0;
 if(rarity===7)next.seven=0;
 const duplicate=!!owned[card.id],diamonds=duplicate?{5:1,6:3,7:10}[rarity]:0;
 return {card,rarity,reason,duplicate,diamonds,pity:next,isFeatured};
}
function themePool(players,theme){return players.filter(p=>p.stars===5||p.stars===7||(p.stars===6&&theme.some(t=>t.id===p.id)))}
function filterPlayers(players,f={}){
 const q=(f.search||'').trim().toLowerCase();
 return players.filter(p=>(!q||(p.name+' '+p.club+' '+p.nationality).toLowerCase().includes(q))&&(!f.stars||p.stars===+f.stars)&&(!f.position||p.position===f.position)&&(!f.club||p.club===f.club)&&(!f.nationality||p.nationality===f.nationality)&&(f.min==null||f.min===''||p.score>=+f.min)&&(f.max==null||f.max===''||p.score<=+f.max)).sort(scoreSort);
}
function facetOptions(players,key){const counts=new Map();for(const p of players)counts.set(p[key],(counts.get(p[key])||0)+1);return [...counts].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value))}
const api={draw,stars,scoreSort,themePool,filterPlayers,facetOptions};if(typeof module!=='undefined')module.exports=api;root.FC=api;
})(globalThis);
