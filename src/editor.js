// 植物光路关卡搭建器：所有 CSS 都限制在 #pl-editor，纯 DOM、离线可用。
import { validateLevel, normalizeLevel, solve, generateLevel, createState } from './core.js';
import {icon} from './atlas-icons.js';
import {editorStyle as CSS} from './atlas-editor-style.js';

const STORAGE_KEY = 'plantLight.levels.v1';
const PALETTE = [
  ['pink','粉色','#db9caa',5,'M0 1Q-6-4-5-8Q-4-12 0-9Q4-12 5-8Q6-4 0 1Z'],
  ['purple','紫色','#a190bb',3,'M0 1Q-6-4-4-9L0-12 4-9Q6-4 0 1Z'],
  ['blue','蓝色','#87adbe',5,'M0 1Q-4-5-3-8L0-12 3-8Q4-5 0 1Z'],
  ['orange','橙色','#d89661',6,'M0 1Q-5-4-3-9Q0-12 3-9Q5-4 0 1Z'],
  ['white','白色','#fcfbeb',8,'M0 1Q-3-4-2.2-8Q0-12 2.2-8Q3-4 0 1Z']
];
function specimen(color, swatch=false){
  const [,,paint,n,petal]=PALETTE.find(p=>p[0]===color)||PALETTE[0];
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',swatch?'4 0 32 32':'0 0 40 40');svg.setAttribute('aria-hidden','true');svg.setAttribute('class',swatch?'ed-pigment':'ed-flower');
  svg.innerHTML=`${swatch?'':'<g fill="#a7b798" stroke="#4a6354" stroke-width="1"><path d="M20 25q2 6-2 13" fill="none"/><path d="M20 32q-5-6-10-5 2 6 10 5Zm0 2q5-7 10-6-2 5-10 6Z"/></g>'}<g transform="translate(20 16)" fill="${paint}" stroke="#534d45" stroke-width=".75">${Array.from({length:n},(_,i)=>`<path transform="rotate(${i*360/n})" d="${petal}"/>`).join('')}<circle r="2" fill="#d8b86e"/></g>`;return svg;
}
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
const button = (text, action, cls = '', {symbol,...props} = {}) => el('button', { type:'button', class:cls, onclick:action, ...props },...(symbol?[icon(symbol)]:[]),...(text?[text]:[]));

export function createEditor({getLevel, onPlay, onSaved, toast = () => {}} = {}) {
  const style = el('style', {text:CSS}); document.head.append(style);
  const host = el('div', {id:'pl-editor', role:'dialog', 'aria-modal':'true', 'aria-labelledby':'ed-title','aria-hidden':'true'});
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
  const undoButton=button('',undoEdit,'ed-symbol',{id:'ed-undo',symbol:'undo-2',title:'撤销','aria-label':'撤销'}),redoButton=button('',redoEdit,'ed-symbol',{id:'ed-redo',symbol:'redo-2',title:'重做','aria-label':'重做'});
  const head=el('div',{class:'ed-head'},el('h2',{class:'ed-title',id:'ed-title'},icon('grid-2x2'),'样方编辑器'),undoButton,redoButton,button('',close,'ed-symbol',{symbol:'x',title:'关闭编辑器','aria-label':'关闭编辑器',id:'ed-close'}));win.append(head);
  const body=el('div',{class:'ed-body'}),left=el('div',{class:'ed-preview'}),right=el('div',{class:'ed-side'});body.append(left,right);win.append(body);
  const board=el('div',{class:'ed-board',role:'grid','aria-label':'关卡编辑网格'}),stats=el('div',{class:'ed-stats'}),plateSize=el('small');
  left.append(el('div',{class:'ed-plate-head'},el('h3',{text:'种植样方'}),plateSize),el('div',{class:'ed-board-wrap'},board),stats);
  const paramCard=el('section',{class:'ed-card'},el('h3',{text:'关卡参数'}));
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
  const paintCard=el('section',{class:'ed-card ed-paints'},el('h3',{text:'花苞画笔'})),tools=el('div',{class:'ed-tools',role:'group','aria-label':'画笔'}),brushButtons=[];
  for(const [color,name]of PALETTE){const title=`${name}花苞画笔`,b=button('',()=>{brush=color;drawTools();},'ed-swatch',{'data-color':color,title,'aria-label':title});b.append(specimen(color,true));b.dataset.brush=color;brushButtons.push(b);tools.append(b);}
  for(const [k,symbol,title]of[['erase','eraser','擦除花苞'],['mask','grid-3x3','切换可用格与缺口']]){const b=button('',()=>{brush=k;drawTools();},'ed-swatch',{symbol,title,'aria-label':title});b.dataset.brush=k;brushButtons.push(b);tools.append(b);}
  paintCard.append(tools,el('div',{class:'ed-row'},button('清空花苞',()=>mutate(()=>{level.flowers=[];}),'ed-cream'),button('恢复完整样方',()=>mutate(()=>{level.mask=null;}),'ed-cream')));left.append(paintCard);
  const solveCard=el('section',{class:'ed-card'},el('h3',{text:'解法校验'})),result=el('div',{class:'ed-result',id:'ed-result',role:'status'});
  const solveButton=button('检查可解性',()=>check(22000),'ed-green',{id:'ed-check',symbol:'search'});
  const randomButton=button('随机可解关',()=>{
    try{const generated=generateLevel({cols:level.cols,rows:level.rows,seedCount:level.seeds,flowerCount:Math.max(3,level.flowers.length)},Date.now()>>>0,level.mask?level.mask.slice():null);mutate(()=>{level={...generated,title:level.title||'我的花园'};savedId=null;});notify('已按当前尺寸和形状生成可解花园。');}catch(e){notify(e.message);}
  },'ed-blue',{id:'ed-random',symbol:'shuffle'});
  solveCard.append(result,el('div',{class:'ed-row'},solveButton,randomButton));right.append(solveCard);
  const libraryCard=el('section',{class:'ed-card'},el('h3',{text:'本机关卡库'})),libraryList=el('div',{class:'ed-library'});libraryCard.append(libraryList);right.append(libraryCard);
  const foot=el('div',{class:'ed-foot'}),footMessage=el('div',{class:'ed-foot-message',role:'status'}),saveLabel=el('span',{text:'保存'}),saveButton=button('',save,'ed-blue',{id:'ed-save',symbol:'save'}),playButton=button('试玩',play,'ed-green',{id:'ed-play',symbol:'play'});saveButton.append(saveLabel);
  const importInput=el('input',{type:'file',accept:'.json,application/json',class:'ed-hidden',id:'ed-import-file'});
  foot.append(footMessage,button('导入',()=>importInput.click(),'ed-cream',{id:'ed-import',symbol:'upload',title:'导入 JSON'}),button('导出',()=>exportJson(false),'ed-cream',{id:'ed-export',symbol:'download',title:'导出 JSON'}),saveButton,playButton,importInput);win.append(foot);

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
  let cursor={c:0,r:0};
  function drawBoard(){
    const restoreFocus=board.contains(document.activeElement);
    cursor.c=Math.min(cursor.c,level.cols-1);cursor.r=Math.min(cursor.r,level.rows-1);
    board.replaceChildren();board.style.setProperty('--cols',level.cols);board.style.setProperty('--rows',level.rows);board.setAttribute('aria-colcount',level.cols);board.setAttribute('aria-rowcount',level.rows);
    plateSize.textContent=`${level.cols} × ${level.rows}`;
    for(let r=0;r<level.rows;r++)for(let c=0;c<level.cols;c++){
      const f=level.flowers.find(x=>x.c===c&&x.r===r),active=!level.mask||!!level.mask[r*level.cols+c],item=button('',()=>paint(c,r),'ed-cell'+(active?'':' hole'),{role:'gridcell',tabIndex:c===cursor.c&&r===cursor.r?0:-1,'aria-rowindex':r+1,'aria-colindex':c+1,'aria-label':`第${r+1}行第${c+1}列：${!active?'缺口':f?PALETTE.find(x=>x[0]===f.color)?.[1]+'花苞':'空格'}`});
      item.dataset.c=c;item.dataset.r=r;
      if(f)item.append(specimen(f.color));
      item.append(el('span',{class:'ed-coordinate',text:`${c+1},${r+1}`}));board.append(item);
    }
    if(restoreFocus)board.querySelector('[tabindex="0"]')?.focus({preventScroll:true});
    const cells=level.mask?level.mask.filter(Boolean).length:level.cols*level.rows;
    stats.replaceChildren(...[`${level.flowers.length} 朵花苞`,`${level.seeds} 颗种子`,`${cells} 个可用格`].map(text=>el('span',{class:'ed-chip',text})));
  }
  board.addEventListener('focusin',e=>{const cell=e.target.closest('[data-c]');if(!cell)return;const old=board.querySelector('[tabindex="0"]');if(old)old.tabIndex=-1;cell.tabIndex=0;cursor={c:+cell.dataset.c,r:+cell.dataset.r};});
  board.addEventListener('keydown',e=>{const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!dir)return;e.preventDefault();const c=Math.max(0,Math.min(level.cols-1,cursor.c+dir[0])),r=Math.max(0,Math.min(level.rows-1,cursor.r+dir[1]));board.querySelector(`[data-c="${c}"][data-r="${r}"]`)?.focus();});
  function drawLibrary(){
    libraryList.replaceChildren();if(!library.length){libraryList.append(el('p',{class:'ed-empty',text:'本浏览器尚未保存关卡。'}));return;}
    for(const item of library){
      const label=el('strong',{},item.title||'我的花园',el('small',{text:` · ${item.cols}×${item.rows} / ${item.flowers.length}花${item.draft?' · 草稿':''}`}));
      const row=el('div',{class:'ed-library-item'},label,button('编辑',()=>{adopt(item,item.id);notify('已载入关卡，可继续编辑。');},'ed-cream'),button('复制',()=>{const cp=clone(item);cp.id=uid();cp.title=(cp.title||'我的花园')+' 副本';library.unshift(cp);if(pushToStorage())drawLibrary();},'ed-cream'),button('导出',()=>download({app:'plant-light-tool',format:'plant-light-level/1',level:item},`${item.title||'garden'}.json`),'ed-cream'),button('删除',()=>{library=library.filter(x=>x.id!==item.id);if(savedId===item.id)savedId=null;if(pushToStorage())drawLibrary();},'ed-red'));
      libraryList.append(row);
    }
    libraryList.append(button('导出全部关卡',()=>exportJson(true),'ed-cream',{id:'ed-export-all',symbol:'download'}));
  }
  function drawAll(){if(!level)return;nameInput.value=level.title||'';colsInput.value=level.cols;rowsInput.value=level.rows;seedsInput.value=level.seeds;undoButton.disabled=!history.length;redoButton.disabled=!future.length;solveButton.disabled=checkStatus==='checking';drawTools();drawBoard();drawLibrary();drawResult();}
  function drawResult(){
    const v=validateEditorLevel(level);result.className='ed-result';
    if(!v.ok){result.classList.add('bad');result.textContent='结构待修正：'+v.errors.join('；');saveButton.disabled=true;playButton.disabled=true;return;}
    saveButton.disabled=false;playButton.disabled=false;
    if(checkStatus==='checking')result.textContent='正在搜索安全种植路线…';
    else if(checkStatus==='solved'){result.classList.add('ok');result.textContent=`可解 · ${solution.length} 步：`+solution.map(p=>`(${p.c+1},${p.r+1})`).join(' → ');}
    else if(checkStatus==='unknown'){result.classList.add('bad');result.textContent='结构有效，但在本次搜索上限内未找到解。可保存草稿，或调整花苞和种子数。';}
    else result.textContent='结构有效，等待校验。';
    saveLabel.textContent=checkStatus==='solved'?'保存关卡':'保存草稿';
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
    try{const source=raw||getLevel?.()||generateLevel();footMessage.textContent='';adopt(source,library.some(x=>x.id===source.id)?source.id:null);host.classList.add('open');host.setAttribute('aria-hidden','false');setTimeout(()=>host.querySelector('#ed-close').focus({preventScroll:true}),0);}catch(e){notify('打开关卡失败：'+e.message);}
  }
  function close(){clearTimeout(solveTimer);checkSeq++;solveButton.disabled=false;host.classList.remove('open');host.setAttribute('aria-hidden','true');for(const o of host.querySelectorAll('.ed-confirm'))o.remove();openBeforeFocus?.focus?.();}
  host.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();event.shiftKey?redoEdit():undoEdit();}
    if(event.key==='Tab'){const focusables=[...host.querySelectorAll('button:not([disabled]),input:not([type=file]),select')].filter(n=>n.offsetParent);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  return {open,close,check,getLevel:()=>clone(level),get isOpen(){return host.classList.contains('open');},getSaved:()=>clone(library)};
}
