// 植物光路纯逻辑：与 Canvas、动画和 DOM 分离。坐标均为从零起的列 c / 行 r。
import referenceData from '../ref/reference-levels.json' with { type: 'json' };
export const COLORS = ['pink', 'purple', 'blue', 'orange', 'white'];
const flower = (c, r, color, id) => ({ c, r, color, id });
const definition = (id, cols, rows, seeds, coordinates, solution, hintText = '') => ({ id, title: `Level ${id}`, cols, rows, seeds, flowers: coordinates.map((p, i) => flower(p[0], p[1], p[2] || COLORS[i % COLORS.length], `flower_${i}`)), solution: solution.map(([c,r]) => ({c,r})), hintText, mask: null });
const INITIAL_LEVELS = [
  definition(2,5,5,1,[[1,0,'white'],[0,3,'pink'],[2,3,'purple'],[3,3,'orange']],[[1,3]],'Slide your finger to aim. Slide\noff the garden to cancel.'),
  definition(3,5,6,2,[[1,0,'white'],[0,1,'pink'],[2,1,'purple'],[2,4,'purple'],[4,4,'blue'],[3,5,'orange']],[[1,1],[3,4]],'You have 2 seeds now — plant them both.'),
  definition(4,5,6,2,[[1,0,'white'],[0,1,'pink'],[4,1,'blue'],[2,4,'purple'],[4,4,'blue'],[3,5,'orange']],[[1,1],[3,4]],'Order matters — vines block each other.'),
];
export const REFERENCE_LEVELS = referenceData.map(L => ({...L, title:`Level ${L.id}`, mask:null, flowers:L.flowers.map((f,i)=>({...f,id:`flower_${i}`}))}));
export function random(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const cellKey = (c,r) => `${c},${r}`;
export function inBounds(L,c,r) { return Number.isInteger(c) && Number.isInteger(r) && c>=0 && r>=0 && c<L.cols && r<L.rows && (!L.mask || !!L.mask[r*L.cols+c]); }
export function occupied(ST) { const out = new Set(); for (const m of ST.moves) out.add(cellKey(m.c,m.r)); for (const s of ST.vines) { let c=s.c1,r=s.r1; const dx=Math.sign(s.c2-c),dy=Math.sign(s.r2-r); for(let n=0;n<100;n++){out.add(cellKey(c,r));if(c===s.c2&&r===s.r2)break;c+=dx;r+=dy;} } return out; }
export function createState() { return { moves:[], vines:[], bloomed:[], bloomTimes:{}, status:'playing', used:0, history:[] }; }
export function copyState(st) { return { ...st, moves:st.moves.map(x=>({...x})), vines:st.vines.map(x=>({...x})), bloomed:[...st.bloomed], bloomTimes:{...st.bloomTimes}, history:[] }; }
export function preview(L,ST,c,r) {
  if (!inBounds(L,c,r)) return {ok:false,reason:'请在花园格子内种植',cells:[],segments:[],blooms:[]};
  const occ=occupied(ST);
  if (occ.has(cellKey(c,r))) return {ok:false,reason:'藤蔓已占据这个位置',cells:[],segments:[],blooms:[]};
  if (L.flowers.some(f=>f.c===c&&f.r===r)) return {ok:false,reason:'花苞上不能种下种子',cells:[],segments:[],blooms:[]};
  const segments=[],cells=[{c,r,distance:0}],blooms=[];
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
    let ec=c,er=r,n=0;
    while(inBounds(L,ec+dx,er+dy) && !occ.has(cellKey(ec+dx,er+dy))) { ec+=dx;er+=dy;n++;cells.push({c:ec,r:er,distance:n}); }
    if(n)segments.push({c1:c,r1:r,c2:ec,r2:er,distance:n});
  }
  const seen=new Set(cells.map(p=>cellKey(p.c,p.r)));
  for(const f of L.flowers)if(!ST.bloomed.includes(f.id)&&seen.has(cellKey(f.c,f.r)))blooms.push(f.id);
  return {ok:true,c,r,cells,segments,blooms};
}
export function plant(L,ST,c,r,time=0,options={}) {
  if(ST.status!=='playing')return {ok:false,reason:'本局已结束，请撤销或重新开始'};
  if(ST.used>=L.seeds)return {ok:false,reason:'种子已用完，可撤销重试'};
  const p=preview(L,ST,c,r);if(!p.ok)return p;
  const previous=copyState(ST); if(!options.noHistory)ST.history.push(previous);
  ST.moves.push({c,r,time});ST.used=ST.moves.length;
  const speed=(options.growMs??450)/1000;
  for(const s of p.segments)ST.vines.push({...s,time,duration:speed});
  for(const id of p.blooms){ST.bloomed.push(id);const f=L.flowers.find(x=>x.id===id);const d=Math.max(Math.abs(f.c-c),Math.abs(f.r-r));ST.bloomTimes[id]=time+speed*d/Math.max(L.cols,L.rows);}
  if(ST.bloomed.length===L.flowers.length)ST.status='won';else if(ST.used>=L.seeds)ST.status='lost';
  return {...p,events:[{type:'seed',c,r},...p.blooms.map(id=>({type:'bloom',id})),...(ST.status==='won'?[{type:'win'}]:ST.status==='lost'?[{type:'fail'}]:[])]};
}
export function undo(ST) { const old=ST.history.pop();if(!old)return false;const history=ST.history;Object.assign(ST,copyState(old),{history});return true; }
export function solve(L,start=createState(),maxNodes=120000) {
  let nodes=0;const seen=new Set();
  function dfs(ST) {
    if(ST.bloomed.length===L.flowers.length)return [];
    if(ST.used>=L.seeds||++nodes>maxNodes)return null;
    const key=ST.used+'|'+[...occupied(ST)].sort().join(';')+'|'+[...ST.bloomed].sort().join(',');if(seen.has(key))return null;seen.add(key);
    const candidates=[];
    for(let r=0;r<L.rows;r++)for(let c=0;c<L.cols;c++){const p=preview(L,ST,c,r);if(p.ok&&p.blooms.length)candidates.push(p);}
    candidates.sort((a,b)=>b.blooms.length-a.blooms.length||a.r-b.r||a.c-b.c);
    for(const p of candidates){const next=copyState(ST);plant(L,next,p.c,p.r,0,{noHistory:true});const tail=dfs(next);if(tail)return [{c:p.c,r:p.r},...tail];}
    return null;
  }
  return dfs(copyState(start));
}
export function validateLevel(raw) {
  const errors=[];if(!raw||typeof raw!=='object')return {ok:false,errors:['关卡格式无效']};
  const cols=Number(raw.cols),rows=Number(raw.rows),seeds=Number(raw.seeds);
  if(!Number.isInteger(cols)||cols<3||cols>10)errors.push('列数须为 3–10 的整数');
  if(!Number.isInteger(rows)||rows<3||rows>10)errors.push('行数须为 3–10 的整数');
  if(!Number.isInteger(seeds)||seeds<1||seeds>5)errors.push('种子须为 1–5 颗');
  if(!Array.isArray(raw.flowers)||!raw.flowers.length||raw.flowers.length>40)errors.push('花苞须为 1–40 个');
  const used=new Set();for(const f of raw.flowers||[]){if(!inBounds(raw,f.c,f.r))errors.push('花苞坐标超出花园');const k=cellKey(f.c,f.r);if(used.has(k))errors.push('花苞位置重复');used.add(k);}
  if(raw.mask&&(!Array.isArray(raw.mask)||raw.mask.length!==cols*rows))errors.push('花园形状数据长度错误');
  return {ok:!errors.length,errors};
}
export function normalizeLevel(raw) {
  const test=validateLevel(raw);if(!test.ok)throw new Error(test.errors.join('；'));
  return {id:raw.id||'custom',title:String(raw.title||'My garden').slice(0,60),cols:+raw.cols,rows:+raw.rows,seeds:+raw.seeds,mask:raw.mask?raw.mask.map(Boolean):null,flowers:raw.flowers.map((f,i)=>({id:`flower_${i}`,c:f.c,r:f.r,color:COLORS.includes(f.color)?f.color:COLORS[i%COLORS.length]})),hintText:String(raw.hintText||'Every flower deserves a little sunshine.').slice(0,160)};
}
export function generateLevel(settings={},seed=20261118,mask=null) {
  const cols=Math.max(3,Math.min(9,+settings.cols||6)),rows=Math.max(3,Math.min(9,+settings.rows||6)),seeds=Math.max(1,Math.min(4,+settings.seedCount||2)),rnd=random(seed);
  for(let attempt=0;attempt<300;attempt++) {
    const L={id:'random',title:'New garden',cols,rows,seeds,flowers:[],mask,hintText:'Find the right places. Let your garden bloom.'},ST=createState(),origins=[];
    const free=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(inBounds(L,c,r))free.push({c,r});
    for(let n=0;n<seeds;n++){
      const choices=free.map(p=>preview(L,ST,p.c,p.r)).filter(p=>p.ok&&p.cells.length>=3);
      if(!choices.length)break;
      const best=choices[Math.floor(rnd()*choices.length)];origins.push({c:best.c,r:best.r});
      ST.moves.push({c:best.c,r:best.r});ST.used++;ST.vines.push(...best.segments);
    }
    if(origins.length!==seeds)continue;
    const originKeys=new Set(origins.map(p=>cellKey(p.c,p.r))),covered=[...occupied(ST)].filter(k=>!originKeys.has(k));
    for(let i=covered.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[covered[i],covered[j]]=[covered[j],covered[i]];}
    const n=Math.min(covered.length,Math.max(seeds+2,+settings.flowerCount||8));if(n<3)continue;
    L.flowers=covered.slice(0,n).map((k,i)=>{const [c,r]=k.split(',').map(Number);return flower(c,r,COLORS[Math.floor(rnd()*COLORS.length)],`flower_${i}`);});
    const verify=createState();for(const o of origins)if(verify.status==='playing')plant(L,verify,o.c,o.r,0,{noHistory:true});
    if(verify.status==='won'){L.solution=origins;return L;}
  }
  throw new Error('当前形状无法生成可解关卡，请扩大花园或减少种子。');
}
export function getLevel(id,settings={}) {
  if(id==='random')return generateLevel(settings,+settings.seed||20261118,settings.shapeMask||null);
  if(id==='custom'&&settings.customData)return normalizeLevel(settings.customData);
  const lv=REFERENCE_LEVELS.find(l=>String(l.id)===String(id))||REFERENCE_LEVELS[0];return structuredClone(lv);
}
