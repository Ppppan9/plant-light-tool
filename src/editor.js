// 植物光路关卡搭建器：所有 CSS 都限制在 #pl-editor，纯 DOM、离线可用。
import { validateLevel, normalizeLevel, solve, generateLevel, createState } from './core.js';

const STORAGE_KEY = 'plantLight.levels.v1';
const PALETTE = [ ['pink', '粉色', '#ef4c9d'], ['purple', '紫色', '#7652e8'], ['blue', '蓝色', '#32bde5'], ['orange', '橙色', '#fa8651'], ['white', '白色', '#f7f8ff'] ];
const clone = o => JSON.parse(JSON.stringify(o));
function validateEditorLevel(raw) {
  const result = validateLevel(raw);
  if (raw && (+raw.cols > 9 || +raw.rows > 9)) result.errors.push('搭建器最大支持 9×9 花园');
  if (raw && +raw.seeds > 4) result.errors.push('搭建器最多支持 4 颗种子');
  return {ok:!result.errors.length,errors:result.errors};
}
function normalizeEditorLevel(raw) { const v=validateEditorLevel(raw); if(!v.ok)throw new Error(v.errors.join('；')); return normalizeLevel(raw); }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || lo)));
const uid = () => 'garden_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

export function loadCustomLevels() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter(x => x && validateEditorLevel(x).ok).map(x => ({ ...normalizeEditorLevel(x), draft: !!x.draft, savedAt: x.savedAt || '' }));
  } catch { return []; }
}

const CSS = `
#pl-editor{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;background:rgba(19,47,28,.69);backdrop-filter:blur(4px);font:13px/1.5 "PingFang SC","Microsoft YaHei",sans-serif;color:#503a20}
#pl-editor.open{display:flex}#pl-editor *{box-sizing:border-box}#pl-editor button,#pl-editor input,#pl-editor select{font:inherit}
#pl-editor .ed-window{width:min(1180px,97vw);height:min(850px,96vh);border:5px solid #805323;border-radius:24px;background:linear-gradient(#fffae9,#f7e9ba);box-shadow:0 12px 0 #4f381b,0 24px 60px #13281688;display:flex;flex-direction:column;overflow:hidden}
#pl-editor .ed-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:4px solid #805323;background:linear-gradient(#8bc56b,#589247);flex-wrap:wrap}
#pl-editor .ed-title{font-size:22px;font-weight:900;color:#fff9df;text-shadow:0 2px #3e642f;margin-right:auto}
#pl-editor button{border:2px solid #754f28;border-bottom-width:4px;border-radius:11px;background:linear-gradient(#c69862,#946137);color:#fff8e7;font-weight:800;padding:6px 11px;cursor:pointer;white-space:nowrap;text-shadow:0 1px #4f361a88}
#pl-editor button:hover{filter:brightness(1.08)}#pl-editor button:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}#pl-editor button:disabled{opacity:.4;pointer-events:none}
#pl-editor button.ed-green{background:linear-gradient(#8ad46a,#4b9b3d);border-color:#366d2d}#pl-editor button.ed-blue{background:linear-gradient(#77b9e7,#3f80b9);border-color:#365d80}#pl-editor button.ed-cream{background:linear-gradient(#fff9df,#edd7a7);color:#68451e;text-shadow:none;border-color:#ae8b54}#pl-editor button.ed-red{background:linear-gradient(#f5907d,#d45a4e);border-color:#8c3e32}
#pl-editor .ed-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(300px,1.1fr) minmax(340px,1fr);gap:14px;padding:14px;overflow:hidden}
#pl-editor .ed-preview{min-width:0;display:flex;flex-direction:column;gap:10px;border:3px solid #c8a264;border-radius:18px;background:linear-gradient(#9ac96c,#4e8a41);padding:16px}
#pl-editor .ed-board{display:grid;gap:4px;width:100%;max-width:490px;margin:auto;aspect-ratio:1;align-content:center;border:11px solid #edc878;border-bottom-width:17px;border-radius:20px;padding:8px;background:#b77743;box-shadow:inset 0 2px 4px #74432066,0 6px #9f6b2d;touch-action:none}
#pl-editor .ed-cell{position:relative;padding:0;min-width:0;min-height:0;aspect-ratio:1.14;border:0;border-radius:8px;box-shadow:inset 0 -5px 5px #9b5d2e66,inset 1px 2px 2px #ffe0a466,0 2px 1px #79522c99;background:linear-gradient(#cf955e,#dda46e 72%,#e6b47e);text-shadow:none;overflow:visible;cursor:crosshair;outline-offset:-2px}
#pl-editor .ed-cell:hover{outline:3px solid #fff4ab;filter:brightness(1.07);z-index:2}#pl-editor .ed-cell.hole{opacity:.27;background:repeating-linear-gradient(45deg,#466332 0 5px,#5a7c40 5px 10px);box-shadow:none}
#pl-editor .ed-cell.ed-hit{outline:4px solid #fff394;box-shadow:0 0 18px #ffed79;z-index:3}
#pl-editor .ed-flower{position:absolute;width:47%;height:51%;left:27%;top:10%;border-radius:65% 65% 50% 50%;background:radial-gradient(ellipse at 30% 24%,#ffffff80,transparent 60%),var(--plant);filter:drop-shadow(0 2px 1px #794c2870);transform:rotate(0deg);pointer-events:none}
#pl-editor .ed-flower:before,#pl-editor .ed-flower:after{content:"";position:absolute;top:88%;width:66%;height:38%;background:linear-gradient(145deg,#c2f46e,#4ca940);border-radius:20% 80% 25% 80%;box-shadow:0 2px #347d32}
#pl-editor .ed-flower:before{right:44%;transform:rotate(5deg)}#pl-editor .ed-flower:after{left:44%;transform:scaleX(-1) rotate(5deg)}
#pl-editor .ed-coordinate{position:absolute;bottom:2px;right:4px;font:9px/1.2 monospace;color:#6d432678;pointer-events:none}
#pl-editor .ed-caption{font-size:12px;text-align:center;color:#f3ffe5;font-weight:700;padding:3px 6px;background:#356a354d;border-radius:9px}
#pl-editor .ed-stats{display:flex;gap:7px;flex-wrap:wrap;justify-content:center}#pl-editor .ed-chip{padding:3px 9px;border-radius:20px;background:#fff8df;border:2px solid #c5a26b;font-size:12px;font-weight:800;color:#6b4b28}
#pl-editor .ed-side{min-height:0;overflow:auto;padding-right:4px}#pl-editor .ed-card{background:#fffaf0;border:3px solid #d6b575;border-radius:15px;padding:10px 12px;margin-bottom:10px}#pl-editor .ed-card h3{font-size:14px;margin:0 0 8px;color:#765126}
#pl-editor .ed-row{display:flex;gap:8px;align-items:center;margin:7px 0;flex-wrap:wrap}#pl-editor .ed-row label{min-width:55px;font-weight:700}#pl-editor .ed-row input[type=text]{flex:1;min-width:0}#pl-editor input,#pl-editor select{border:2px solid #b49059;border-radius:8px;background:#fffef9;color:#4a381e;padding:5px 8px;outline:none}#pl-editor input:focus,#pl-editor select:focus{border-color:#65a74c;box-shadow:0 0 0 3px #8cc87333}#pl-editor input[type=number]{width:65px}
#pl-editor .ed-tools{display:flex;flex-wrap:wrap;gap:7px}#pl-editor .ed-swatch{min-width:47px;border-color:#7c5d35;padding:5px 8px;background:var(--paint);color:#fff;text-shadow:0 1px 2px #0008;box-shadow:inset 0 2px #fff4}#pl-editor .ed-swatch[data-color=white]{color:#75654b;text-shadow:none}#pl-editor .selected{outline:3px solid #e4ae3b;outline-offset:2px}
#pl-editor .ed-tips{font-size:12px;color:#94774e;line-height:1.7;margin:7px 0 0}#pl-editor .ed-result{padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;background:#f5ebcc;color:#7c653a;white-space:pre-wrap}#pl-editor .ed-result.ok{color:#2d732b;background:#e5f3d6}#pl-editor .ed-result.bad{color:#a14e35;background:#fae5d5}
#pl-editor .ed-library{display:flex;flex-direction:column;gap:6px}#pl-editor .ed-library-item{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:7px;background:#f7ecd2;border-radius:10px;border:1px solid #e0c38d}#pl-editor .ed-library-item strong{flex:1;min-width:100px;font-size:12px;overflow-wrap:anywhere}#pl-editor .ed-library-item small{font-weight:400;color:#927b56}#pl-editor .ed-library-item button{font-size:11px;padding:3px 6px;border-radius:7px}
#pl-editor .ed-foot{padding:10px 14px;background:#efdbab;border-top:3px solid #c9a66e;display:flex;align-items:center;gap:8px;flex-wrap:wrap}#pl-editor .ed-foot-message{flex:1;min-width:160px;font-size:12px;font-weight:700;color:#7d6039}#pl-editor .ed-hidden{display:none!important}
#pl-editor .ed-confirm{position:absolute;inset:0;background:#24432499;display:flex;align-items:center;justify-content:center;padding:20px;z-index:10}#pl-editor .ed-confirm>div{max-width:450px;border:4px solid #97713a;background:#fff9e6;padding:25px;border-radius:22px;box-shadow:0 8px #543c1e55}#pl-editor .ed-confirm h3{margin:0 0 10px;color:#906130}#pl-editor .ed-confirm p{margin:0 0 20px}
@media(max-width:820px){#pl-editor .ed-window{height:100dvh;width:100vw;max-height:none;border:0;border-radius:0}#pl-editor .ed-head{padding:9px 10px;gap:6px}#pl-editor .ed-title{font-size:18px}#pl-editor .ed-body{display:flex;flex-direction:column;overflow:auto;padding:9px;gap:10px}#pl-editor .ed-preview{padding:12px;flex:none}#pl-editor .ed-board{max-width:370px;aspect-ratio:auto}#pl-editor .ed-side{overflow:visible;flex:none}#pl-editor .ed-caption{font-size:11px}#pl-editor .ed-foot{padding:8px;gap:6px}#pl-editor .ed-foot-message{flex-basis:100%}#pl-editor button{padding:5px 8px}#pl-editor .ed-board .ed-cell{aspect-ratio:1.25}#pl-editor .ed-coordinate{display:none}}
`;

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') Object.assign(node.style, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) if (child != null) node.append(child.nodeType ? child : document.createTextNode(String(child)));
  return node;
}
const button = (text, action, cls = '', props = {}) => el('button', { type:'button', text, class:cls, onclick:action, ...props });

export function createEditor({getLevel, onPlay, onSaved, toast = () => {}} = {}) {
  const style = el('style', {text:CSS}); document.head.append(style);
  const host = el('div', {id:'pl-editor', role:'dialog', 'aria-modal':'true', 'aria-label':'植物光路关卡搭建器'});
  const win = el('div', {class:'ed-window'}); host.append(win); document.body.append(host);
  let level = null, savedId = null, brush = 'pink', history = [], future = [], library = loadCustomLevels(), solveTimer = 0, checkSeq = 0, solution = null, checkStatus = 'idle', openBeforeFocus = null;
  const beforeSnapshot = () => JSON.stringify({level, savedId});
  function notify(message) { footMessage.textContent = message; toast(message); }
  function remember() { history.push(beforeSnapshot()); if (history.length > 100) history.shift(); future = []; }
  function mutate(fn) { remember(); fn(); solution = null; checkStatus='idle'; drawAll(); scheduleCheck(); }
  function pushToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(library)); if (onSaved) onSaved(clone(library)); return true; }
    catch { notify('本机存储失败，请导出 JSON 保存。'); return false; }
  }
  function adopt(raw, customId = null) {
    level = clone(raw); level.title = String(level.title || `Level ${level.id || ''}` || '我的花园');
    level.flowers = (level.flowers || []).map((f,i)=>({...f,id:f.id || `flower_${i}`}));
    level.mask = level.mask ? level.mask.map(Boolean) : null; savedId = customId;
    history=[];future=[];solution=null;checkStatus='idle';drawAll();scheduleCheck();
  }
  function restore(snapshot) { const j=JSON.parse(snapshot);level=j.level;savedId=j.savedId;solution=null;checkStatus='idle';drawAll();scheduleCheck(); }
  function undoEdit() { if(!history.length)return; future.push(beforeSnapshot()); restore(history.pop()); }
  function redoEdit() { if(!future.length)return; history.push(beforeSnapshot()); restore(future.pop()); }
  const undoButton=button('↶ 撤销',undoEdit,'ed-cream',{id:'ed-undo'}),redoButton=button('↷ 重做',redoEdit,'ed-cream',{id:'ed-redo'});
  const head=el('div',{class:'ed-head'},el('div',{class:'ed-title',text:'🌱 关卡搭建器'}),undoButton,redoButton,button('✕',close,'ed-red',{title:'关闭',id:'ed-close'}));win.append(head);
  const body=el('div',{class:'ed-body'}),left=el('div',{class:'ed-preview'}),right=el('div',{class:'ed-side'});body.append(left,right);win.append(body);
  const board=el('div',{class:'ed-board',role:'grid','aria-label':'关卡编辑网格'}),stats=el('div',{class:'ed-stats'});left.append(board,stats,el('div',{class:'ed-caption',text:'点击格子种花 · 擦除花苞 · 编辑花园形状'}));
  const paramCard=el('section',{class:'ed-card'},el('h3',{text:'🪴 花园参数'}));
  const nameInput=el('input',{type:'text',id:'ed-name',maxLength:60,'aria-label':'关卡名称',onchange:()=>mutate(()=>{level.title=nameInput.value.trim()||'我的花园';})});
  paramCard.append(el('div',{class:'ed-row'},el('label',{htmlFor:'ed-name',text:'关卡名'}),nameInput));
  const colsInput=el('input',{type:'number',id:'ed-cols',min:3,max:9,'aria-label':'列数'}),rowsInput=el('input',{type:'number',id:'ed-rows',min:3,max:9,'aria-label':'行数'}),seedsInput=el('input',{type:'number',id:'ed-seeds',min:1,max:4,'aria-label':'种子数'});
  function resize() {
    const cols=clamp(colsInput.value,3,9),rows=clamp(rowsInput.value,3,9),oldCols=level.cols,oldRows=level.rows,oldMask=level.mask;
    mutate(()=>{level.cols=cols;level.rows=rows;level.flowers=level.flowers.filter(f=>f.c<cols&&f.r<rows);if(oldMask)level.mask=Array.from({length:cols*rows},(_,i)=>{const c=i%cols,r=Math.floor(i/cols);return c<oldCols&&r<oldRows?!!oldMask[r*oldCols+c]:true;});});
  }
  colsInput.addEventListener('change',resize);rowsInput.addEventListener('change',resize);seedsInput.addEventListener('change',()=>mutate(()=>{level.seeds=clamp(seedsInput.value,1,4);}));
  paramCard.append(el('div',{class:'ed-row'},el('label',{htmlFor:'ed-cols',text:'列数'}),colsInput,el('label',{htmlFor:'ed-rows',text:'行数'}),rowsInput),el('div',{class:'ed-row'},el('label',{htmlFor:'ed-seeds',text:'种子数'}),seedsInput,button('使用当前关',()=>{try{adopt(getLevel());notify('已载入当前关卡，可自由修改后另存。');}catch(e){notify(e.message);}},'ed-cream')));
  right.append(paramCard);
  const paintCard=el('section',{class:'ed-card'},el('h3',{text:'🎨 花苞画笔'})),tools=el('div',{class:'ed-tools'}),brushButtons=[];
  for(const [color,name,hex]of PALETTE){const b=button(name,()=>{brush=color;drawTools();},'ed-swatch',{'data-color':color,'aria-label':`${name}花苞画笔`});b.style.setProperty('--paint',hex);b.dataset.brush=color;brushButtons.push(b);tools.append(b);}
  for(const [k,text]of[['erase','⌫ 擦除花苞'],['mask','▦ 可用格/缺口']]){const b=button(text,()=>{brush=k;drawTools();},'ed-cream');b.dataset.brush=k;brushButtons.push(b);tools.append(b);}
  paintCard.append(tools,el('p',{class:'ed-tips',text:'颜色画笔：点击格子添加或改色。擦除只移除花苞；形状工具切换可用格。花苞不能位于缺口，藤蔓遇缺口会停止。'}),el('div',{class:'ed-row'},button('清空花苞',()=>mutate(()=>{level.flowers=[];}),'ed-cream'),button('恢复完整花园',()=>mutate(()=>{level.mask=null;}),'ed-cream')));right.append(paintCard);
  const solveCard=el('section',{class:'ed-card'},el('h3',{text:'✅ 结构与可解性'})),result=el('div',{class:'ed-result',id:'ed-result',role:'status'});
  const solveButton=button('🔍 检查可解性',()=>check(22000),'ed-green',{id:'ed-check'});
  const randomButton=button('🎲 随机可解关',()=>{
    try{const generated=generateLevel({cols:level.cols,rows:level.rows,seedCount:level.seeds,flowerCount:Math.max(3,level.flowers.length)},Date.now()>>>0,level.mask?level.mask.slice():null);mutate(()=>{level={...generated,title:level.title||'我的花园'};savedId=null;});notify('已按当前尺寸和形状生成可解花园。');}catch(e){notify(e.message);}
  },'ed-blue',{id:'ed-random'});
  solveCard.append(result,el('div',{class:'ed-row'},solveButton,randomButton),el('p',{class:'ed-tips',text:'先检查结构，再按当前规则求解。搜索有节点上限；“未找到解”不等于数学上无解。无解或未确认的关卡可保存草稿，试玩前会提示。'}));right.append(solveCard);
  const libraryCard=el('section',{class:'ed-card'},el('h3',{text:'📁 本机关卡库'})),libraryList=el('div',{class:'ed-library'});libraryCard.append(libraryList);right.append(libraryCard);
  const foot=el('div',{class:'ed-foot'}),footMessage=el('div',{class:'ed-foot-message',text:'设置种子落点的挑战，让每朵花都盛开。'}),saveButton=button('💾 保存',save,'ed-blue',{id:'ed-save'}),playButton=button('▶ 试玩',play,'ed-green',{id:'ed-play'});
  const importInput=el('input',{type:'file',accept:'.json,application/json',class:'ed-hidden',id:'ed-import-file'});
  foot.append(footMessage,button('⬆ 导入 JSON',()=>importInput.click(),'ed-cream',{id:'ed-import'}),button('⬇ 导出 JSON',()=>exportJson(false),'ed-cream',{id:'ed-export'}),saveButton,playButton,importInput);win.append(foot);

  function drawTools(){for(const b of brushButtons){const sel=b.dataset.brush===brush;b.classList.toggle('selected',sel);b.setAttribute('aria-pressed',String(sel));}}
  function paint(c,r){
    const index=r*level.cols+c,active=!level.mask||!!level.mask[index];
    if(brush!=='mask'&&!active){notify('这是花园缺口，请先用形状工具恢复可用格。');return;}
    const old=level.flowers.find(f=>f.c===c&&f.r===r);
    if(brush==='erase'&&!old)return;if(brush!=='erase'&&brush!=='mask'&&old?.color===brush)return;
    mutate(()=>{
      if(brush==='mask'){if(!level.mask)level.mask=Array(level.cols*level.rows).fill(true);level.mask[index]=!level.mask[index];if(!level.mask[index])level.flowers=level.flowers.filter(f=>!(f.c===c&&f.r===r));if(level.mask.every(Boolean))level.mask=null;}
      else if(brush==='erase')level.flowers=level.flowers.filter(f=>!(f.c===c&&f.r===r));
      else if(old)old.color=brush;
      else level.flowers.push({c,r,color:brush,id:`flower_${c}_${r}`});
    });
  }
  function drawBoard(){
    board.replaceChildren();board.style.gridTemplateColumns=`repeat(${level.cols}, minmax(0,1fr))`;board.style.aspectRatio=String(level.cols/level.rows*1.14);
    for(let r=0;r<level.rows;r++)for(let c=0;c<level.cols;c++){
      const f=level.flowers.find(x=>x.c===c&&x.r===r),active=!level.mask||!!level.mask[r*level.cols+c],item=button('',()=>paint(c,r),'ed-cell'+(active?'':' hole'),{role:'gridcell','aria-label':`第${r+1}行第${c+1}列：${!active?'缺口':f?PALETTE.find(x=>x[0]===f.color)?.[1]+'花苞':'空格'}`});
      item.dataset.c=c;item.dataset.r=r;
      if(f){const fl=el('span',{class:'ed-flower'});fl.style.setProperty('--plant',PALETTE.find(x=>x[0]===f.color)?.[2]||'#ec5aa4');item.append(fl);}
      item.append(el('span',{class:'ed-coordinate',text:`${c+1},${r+1}`}));board.append(item);
    }
    const cells=level.mask?level.mask.filter(Boolean).length:level.cols*level.rows;
    stats.replaceChildren(...[`${level.cols} × ${level.rows}`,`${level.flowers.length} 朵花苞`,`${level.seeds} 颗种子`,`${cells} 个可用格`].map(text=>el('span',{class:'ed-chip',text})));
  }
  function drawLibrary(){
    libraryList.replaceChildren();if(!library.length){libraryList.append(el('p',{class:'ed-tips',text:'还没有保存的关卡。保存后仅保留在本浏览器；需要跨设备请导出 JSON。'}));return;}
    for(const item of library){
      const label=el('strong',{},item.title||'我的花园',el('small',{text:` · ${item.cols}×${item.rows} / ${item.flowers.length}花${item.draft?' · 草稿':''}`}));
      const row=el('div',{class:'ed-library-item'},label,button('编辑',()=>{adopt(item,item.id);notify('已载入关卡，可继续编辑。');},'ed-cream'),button('复制',()=>{const cp=clone(item);cp.id=uid();cp.title=(cp.title||'我的花园')+' 副本';library.unshift(cp);if(pushToStorage())drawLibrary();},'ed-cream'),button('导出',()=>download({app:'plant-light-tool',format:'plant-light-level/1',level:item},`${item.title||'garden'}.json`),'ed-cream'),button('删除',()=>{library=library.filter(x=>x.id!==item.id);if(savedId===item.id)savedId=null;if(pushToStorage())drawLibrary();},'ed-red'));
      libraryList.append(row);
    }
    libraryList.append(button('⬇ 导出全部关卡',()=>exportJson(true),'ed-cream',{id:'ed-export-all'}));
  }
  function drawAll(){if(!level)return;nameInput.value=level.title||'';colsInput.value=level.cols;rowsInput.value=level.rows;seedsInput.value=level.seeds;undoButton.disabled=!history.length;redoButton.disabled=!future.length;solveButton.disabled=checkStatus==='checking';drawTools();drawBoard();drawLibrary();drawResult();}
  function drawResult(){
    const v=validateEditorLevel(level);result.className='ed-result';
    if(!v.ok){result.classList.add('bad');result.textContent='结构待修正：'+v.errors.join('；');saveButton.disabled=true;playButton.disabled=true;return;}
    saveButton.disabled=false;playButton.disabled=false;
    if(checkStatus==='checking')result.textContent='正在搜索安全种植路线…';
    else if(checkStatus==='solved'){result.classList.add('ok');result.textContent=`✓ 结构有效，可解 · ${solution.length} 步路线：`+solution.map(p=>`(${p.c+1},${p.r+1})`).join(' → ');}
    else if(checkStatus==='unknown'){result.classList.add('bad');result.textContent='结构有效，但在本次搜索上限内未找到解。可保存草稿，或调整花苞和种子数。';}
    else result.textContent='结构有效；编辑后自动进行小规模搜索，也可以手动检查。';
    saveButton.textContent=checkStatus==='solved'?'💾 保存关卡':'💾 保存草稿';
  }
  function scheduleCheck(){clearTimeout(solveTimer);checkSeq++;const v=validateEditorLevel(level);if(!v.ok){drawResult();return;}solveTimer=setTimeout(()=>check(level.cols*level.rows>49?1500:5000),700);}
  function check(budget=22000){
    clearTimeout(solveTimer);const seq=++checkSeq,v=validateEditorLevel(level);if(!v.ok){drawResult();return Promise.resolve(null);}checkStatus='checking';drawResult();solveButton.disabled=true;
    return new Promise(resolve=>setTimeout(()=>{
      if(seq!==checkSeq){resolve(null);return;}
      try{const clean=normalizeEditorLevel(level),found=solve(clean,createState(),budget);if(seq!==checkSeq){resolve(null);return;}solution=found;checkStatus=found?'solved':'unknown';}
      catch(e){solution=null;checkStatus='unknown';notify('校验未完成：'+e.message);}
      finally{if(seq===checkSeq){solveButton.disabled=false;drawResult();}resolve(solution);}
    },30));
  }
  async function save(){
    const v=validateEditorLevel(level);if(!v.ok){notify(v.errors.join('；'));return;}
    if(checkStatus==='idle')await check(8000);
    const item={...normalizeEditorLevel(level),id:savedId||uid(),draft:checkStatus!=='solved',savedAt:new Date().toISOString()};
    const i=library.findIndex(x=>x.id===item.id);if(i>=0)library[i]=item;else library.unshift(item);
    if(pushToStorage()){savedId=item.id;drawLibrary();notify(item.draft?'草稿已保存（尚未确认可解）。':'关卡已保存到本机。');}
  }
  async function play(){
    const v=validateEditorLevel(level);if(!v.ok){notify(v.errors.join('；'));return;}
    if(checkStatus!=='solved')await check(12000);
    if(checkStatus!=='solved'){showWarning();return;}launch();
  }
  function launch(){const clean={...normalizeEditorLevel(level),id:savedId||'custom',solution:solution||[]};close();if(onPlay)onPlay(clean);}
  function showWarning(){
    const overlay=el('div',{class:'ed-confirm'},el('div',{},el('h3',{text:'尚未确认此关可解'}),el('p',{text:'结构校验通过，但在当前搜索上限内没有找到完整解。它可能无解，也可能需要更深搜索。你可以继续编辑，或明确选择试玩当前草稿。'}),el('div',{class:'ed-row'},button('继续编辑',()=>overlay.remove(),'ed-cream'),button('仍然试玩草稿',()=>{overlay.remove();launch();},'ed-red',{id:'ed-play-draft'}))));host.append(overlay);
  }
  function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=el('a',{href:url,download:name.replace(/[\\/:*?"<>|]/g,'_')});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function exportJson(all=false){if(all){download({app:'plant-light-tool',format:'plant-light-library/1',levels:library},'plant-light-levels.json');return;}const v=validateEditorLevel(level);if(!v.ok){notify('结构无效，无法导出：'+v.errors.join('；'));return;}download({app:'plant-light-tool',format:'plant-light-level/1',level:{...normalizeEditorLevel(level),draft:checkStatus!=='solved'}},'plant-light-garden.json');}
  importInput.addEventListener('change',async()=>{
    const file=importInput.files?.[0];if(!file)return;
    try{
      if(file.size>2*1024*1024)throw new Error('关卡文件超过 2MB。');const data=JSON.parse(await file.text());
      const many=Array.isArray(data)?data:Array.isArray(data.levels)?data.levels:null;
      if(many){if(many.length>200)throw new Error('一次最多导入 200 关。');const incoming=many.map(raw=>({...normalizeEditorLevel(raw),id:uid(),draft:true,savedAt:new Date().toISOString()}));library=[...incoming,...library];if(pushToStorage()){drawLibrary();if(incoming[0])adopt(incoming[0],incoming[0].id);notify(`已导入 ${incoming.length} 个关卡，暂列草稿。`);}}
      else{const raw=data.level||data;const clean=normalizeEditorLevel(raw);adopt(clean,null);notify('关卡已导入编辑器，请检查后保存或试玩。');}
    }catch(e){notify('导入失败：'+e.message);}finally{importInput.value='';}
  });
  function open(raw){
    openBeforeFocus=document.activeElement;library=loadCustomLevels();
    try{const source=raw||getLevel?.()||generateLevel();adopt(source,library.some(x=>x.id===source.id)?source.id:null);host.classList.add('open');host.setAttribute('aria-hidden','false');setTimeout(()=>nameInput.focus(),0);}catch(e){notify('打开关卡失败：'+e.message);}
  }
  function close(){clearTimeout(solveTimer);checkSeq++;solveButton.disabled=false;host.classList.remove('open');host.setAttribute('aria-hidden','true');for(const o of host.querySelectorAll('.ed-confirm'))o.remove();openBeforeFocus?.focus?.();}
  host.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();event.shiftKey?redoEdit():undoEdit();}
    if(event.key==='Tab'){const focusables=[...host.querySelectorAll('button:not([disabled]),input:not([type=file]),select')].filter(n=>n.offsetParent);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  return {open,close,check,getLevel:()=>clone(level),get isOpen(){return host.classList.contains('open');},getSaved:()=>clone(library)};
}
