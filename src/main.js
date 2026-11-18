import { APP_ID, DEFAULTS, GROUPS, ATLAS_THEMES, loadSettings, saveSettings, settingsEnvelope, migrate } from './settings.js';
import * as Core from './core.js';
import { createAssets, composeFrame, drawScene, boardLayout, DW, DH } from './render.js';
import { createPanel } from './ui.js';
import { createEditor } from './editor.js';
import { DEFAULT_HAND } from './default_hand.js';
import { Sfx } from './audio.js';
import { createAERecorder } from './ae/recorder.js';
import { export3DAnimation } from './export3d/export3d.js';
import { exportH5PlayableFromPage, applyPlayableMode, bindEditorDevicePreview, isPlayableNoHand } from './h5/index.js';
import { createFeedback, undoFeedback, interactionDelay, scheduleGrowthFeedback } from './feedback.js';
import { bindGardenLife } from './garden-life.js';

// 先捕获原始自包含页面；file:// 导出不需要 fetch 文件或启动服务器。
window.__PLANTLIGHT_BASE_HTML__=__PLAYABLE_DOCUMENT__;
const $=s=>document.querySelector(s),canvas=$('#stage'),ctx=canvas.getContext('2d');
const S=loadSettings(),sfx=new Sfx(),NO_HAND=isPlayableNoHand();
let L=null,ST=Core.createState(),A={},items=[],hits=[],lastRecord=null,frame=0,assetEpoch=0,busy=false;
const AUTO={running:false,token:0,completed:0};
const seenHelpers=new Set();
const HAND={x:470,y:1120,visible:false,press:0,inside:false,image:null,asset:'',serial:0};
const REC={recorder:null,chunks:[],t0:0,mime:'',list:[]};
const UI={preview:null,hint:null,winAt:0,undoCount:S.undoCount,hintCount:S.hintCount,waterCount:S.waterCount,waterMode:false,endMode:false,lastAction:-Infinity};
let panel,editor,fitPreview,toastTimer,drag=null,lastPointer=null;
const now=()=>performance.now()/1000;
const sleep=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms)));
const rand=(a,b)=>a+Math.random()*(b-a);
const feedback=createFeedback(UI,now);
const gardenLife=bindGardenLife(canvas,{env:()=>({L,S,layout:()=>boardLayout(L,S),items,ui:UI,blocked:busy,automatic:AUTO.running}),position,clock:now});
const recorder=createAERecorder({env:()=>({L,S,A,items,canvas}),sfx});

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function status(message){$('#status').textContent=message||`${L?.title||'Garden'} · 种子 ${ST.used}/${L?.seeds||0} · 开花 ${ST.bloomed.length}/${L?.flowers.length||0}${ST.status==='lost'?' · 种子用尽，可撤销重试':ST.status==='won'?' · 花园已盛开':''}`;}
function save(){if(!NO_HAND&&!saveSettings(S))toast('本地存储空间不足，请导出设置保存。');}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function stamp(){const d=new Date();return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;}
function sync(){panel?.sync();$('#btnAuto').textContent=AUTO.running?'停止':'自动通关';$('#btnAuto').classList.toggle('on',AUTO.running);$('#btnRec').textContent=REC.recorder?'停止录制':'开始录制';$('#btnRec').classList.toggle('on',!!REC.recorder);panel?.setButton('_aeToggle',recorder.rec?'■ 停止并导出':'● 开始记录',!!recorder.rec);const sel=$('#levelSel');if(sel.querySelector(`option[value="${S.level}"]`))sel.value=S.level;status();}
function resize(){const [w,h]=String(S.recRes||'720x1600').split('x').map(Number);canvas.width=w||720;canvas.height=h||1600;canvas.style.aspectRatio=`${canvas.width}/${canvas.height}`;fitPreview?.();}
async function rebuildArt(){const token=++assetEpoch;const assets=await createAssets(S);if(token!==assetEpoch)return;A=assets;if(HAND.image)addHandAsset();}
function addHandAsset(){const img=HAND.image;if(!img)return;const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d').drawImage(img,0,0);HAND.asset=`hand_${++HAND.serial}`;A[HAND.asset]={c,w:c.width,h:c.height,ax:c.width*S.handAnchorX,ay:c.height*S.handAnchorY};drawHandPreview();}
async function loadHand(){HAND.image=null;if(NO_HAND||!S.handImage){drawHandPreview();return;}const url=S.handImage,im=new Image();im.src=url;try{await im.decode();if(S.handImage!==url)return;HAND.image=im;addHandAsset();}catch{toast('手指图片加载失败，请换一张透明 PNG。');}}
function drawHandPreview(){const cv=$('#handPrev');if(!cv)return;const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);c.fillStyle='#edf1e9';c.fillRect(0,0,cv.width,cv.height);const im=HAND.image;if(!im)return;const sc=Math.min(cv.width/im.width,cv.height/im.height),w=im.width*sc,h=im.height*sc,x=(cv.width-w)/2,y=(cv.height-h)/2;c.drawImage(im,x,y,w,h);const ax=x+S.handAnchorX*w,ay=y+S.handAnchorY*h;c.strokeStyle='#ae503c';c.lineWidth=1.5;c.beginPath();c.moveTo(ax-10,ay);c.lineTo(ax+10,ay);c.moveTo(ax,ay-10);c.lineTo(ax,ay+10);c.stroke();cv.onpointerdown=ev=>{const b=cv.getBoundingClientRect(),px=(ev.clientX-b.left)/b.width*cv.width,py=(ev.clientY-b.top)/b.height*cv.height;S.handAnchorX=Math.max(0,Math.min(1,(px-x)/w));S.handAnchorY=Math.max(0,Math.min(1,(py-y)/h));addHandAsset();sync();save();};}
function loadCustomList(){try{const j=JSON.parse(localStorage.getItem('plantLight.levels.v1')||'[]');return Array.isArray(j)?j:[];}catch{return [];}}
function populateLevels(){const sel=$('#levelSel');sel.replaceChildren();for(const l of Core.REFERENCE_LEVELS){const o=document.createElement('option');o.value=String(l.id);o.textContent=`观测页 ${String(l.id).padStart(2,'0')} · ${l.flowers.length} 朵花 / ${l.seeds} 颗种子`;sel.append(o);}for(const [value,label]of [['random','随机样地'],['custom','当前自编样地']]){const o=document.createElement('option');o.value=value;o.textContent=label;sel.append(o);}for(const [i,l]of loadCustomList().entries()){const o=document.createElement('option');o.value='saved:'+i;o.textContent='本机 · '+(l.title||l.name||`花园 ${i+1}`);sel.append(o);}sel.value=S.level;}
function newGame(id=S.level,{keepAuto=false,level=null}={}){
  if(!keepAuto)stopAuto(false);
  try{if(level){L=Core.normalizeLevel(level);S.customData=L;S.level='custom';}else if(String(id).startsWith('saved:')){const custom=loadCustomList()[+String(id).slice(6)];if(!custom)throw new Error('本机关卡不存在');L=Core.normalizeLevel(custom);S.level=String(id);}else{S.level=String(id);L=Core.getLevel(S.level,S);}
    ST=Core.createState();Object.assign(UI,{preview:null,hint:null,tap:null,helper:null,winAt:0,undoCount:+S.undoCount,hintCount:+S.hintCount,waterCount:+S.waterCount,waterMode:false,endMode:false,lastAction:-Infinity});feedback.clear();gardenLife.start();drag=null;sync();save();return L;
  }catch(e){toast(e.message);if(!L){S.level='2';L=Core.getLevel('2');}return null;}
}
function doPlant(c,r,{automatic=false}={}){
  const invalid=reason=>{if(L&&Core.inBounds(L,c,r))feedback.emit('invalid',{c,r,reason});return false;};
  if(busy||!L||UI.helper||AUTO.running&&!automatic)return invalid('当前暂不能种植');
  if(now()-UI.lastAction<0.08)return invalid('操作过快');
  const firstVine=ST.vines.length,plantedAt=now(),result=Core.plant(L,ST,c,r,plantedAt,{growMs:S.growMs});
  if(!result.ok){if(!automatic)toast(result.reason);return invalid(result.reason);}
  const growthDelay=scheduleGrowthFeedback({L,ST,result,firstVine,time:plantedAt,S});
  UI.lastAction=now();UI.hint=null;UI.preview=null;const b=boardLayout(L,S);UI.tap={x:b.cx(c),y:b.cy(r),time:now()};feedback.emit('plant',{c,r,automatic,blooms:[...result.blooms]});sfx.play('seed',S);sfx.play('grow',S);
  const state=ST;for(const id of result.blooms){const delay=Math.max(0,(ST.bloomTimes[id]-now())*1000);setTimeout(()=>{if(ST===state)sfx.play('bloom',S);},delay);}
  if(ST.status==='won'){UI.winAt=plantedAt+growthDelay;setTimeout(()=>{if(ST===state)sfx.play('win',S);},+S.growMs);if(!AUTO.running&&REC.recorder&&S.autoStop)setTimeout(()=>{if(ST===state&&REC.recorder)stopRecording();},+S.growMs+S.winDelay+S.tailSec*1000);}
  if(ST.status==='lost'){sfx.play('fail',S);if(!automatic)toast('种子用完了。试试撤销，换一个种植位置。');}
  sync();return true;
}
function doUndo(force=false){if(!force&&!S.unlockBoosters&&Number(L.id)<4){toast('撤回在第 4 关解锁；可点右上角重新开始。');return false;}if(!force&&UI.undoCount<=0){toast('本关撤销次数已用完，可重新开始。');return false;}const before=Core.copyState(ST);if(!Core.undo(ST)){if(!force)toast('还没有可以撤销的种子');return false;}feedback.emit('undo',undoFeedback(before,ST,items,L));if(!force)UI.undoCount--;UI.winAt=0;UI.hint=null;UI.endMode=false;UI.waterMode=false;sfx.play('undo',S);sync();return true;}
function doHint(force=false){if(!force&&!S.unlockBoosters&&Number(L.id)<7){toast('罗盘在第 7 关解锁');return false;}if(!force&&UI.hintCount<=0){toast('本关提示次数已用完');return false;}const solution=Core.solve(L,ST);if(!solution?.length){toast('当前路线已被阻断，请先撤销或重新开始。');return false;}UI.hint={...solution[0],time:now()};feedback.emit('hint',solution[0]);if(!force)UI.hintCount--;sfx.play('hint',S);sync();return true;}
function waterFlower(c,r){const invalid=reason=>{if(Core.inBounds(L,c,r))feedback.emit('invalid',{c,r,reason});return false;};if(busy||ST.status==='won'||(!S.unlockBoosters&&Number(L.id)<12)||UI.waterCount<=0){toast('浇水壶未解锁或次数已用完');return invalid('浇水壶未解锁或次数已用完');}const f=L.flowers.find(x=>x.c===c&&x.r===r&&!ST.bloomed.includes(x.id));if(!f){toast('请选择还没绽放的花苞');return invalid('请选择还没绽放的花苞');}ST.history.push(Core.copyState(ST));ST.bloomed.push(f.id);const at=now(),bloomAt=at+interactionDelay(S,.28);ST.bloomTimes[f.id]=bloomAt;UI.waterCount--;UI.waterMode=false;feedback.emit('water',{c,r,flowerId:f.id});sfx.play('water',S);if(ST.bloomed.length===L.flowers.length){ST.status='won';UI.winAt=bloomAt;sfx.play('win',S);if(!AUTO.running&&REC.recorder&&S.autoStop){const state=ST;setTimeout(()=>{if(ST===state&&REC.recorder)stopRecording();},+S.winDelay+S.tailSec*1000);}}else if(ST.used<L.seeds)ST.status='playing';sync();return true;}
function nextLevel(keepAuto=false){const i=Core.REFERENCE_LEVELS.findIndex(l=>String(l.id)===S.level);if(i>=0&&i<Core.REFERENCE_LEVELS.length-1)newGame(String(Core.REFERENCE_LEVELS[i+1].id),{keepAuto});else if(S.level==='random'){S.seed++;newGame('random',{keepAuto});}else newGame('2',{keepAuto});const helper={4:'undo',7:'hint',12:'water'}[L.id];if(helper&&S.showTutorial&&!seenHelpers.has(helper)){seenHelpers.add(helper);UI.helper=helper;}}
async function moveHand(x,y,token,press=false){const x0=HAND.x,y0=HAND.y,d=rand(+S.moveMin,+S.moveMax)/(+S.autoSpeed||1),start=performance.now(),curve=(S.curve||0)*Math.hypot(x-x0,y-y0),dx=x-x0,dy=y-y0,len=Math.hypot(dx,dy)||1;HAND.visible=true;
  while(performance.now()-start<d){if(!AUTO.running||token!==AUTO.token)return false;const t=Math.min(1,(performance.now()-start)/d),u=t*t*(3-2*t),arc=Math.sin(t*Math.PI)*curve;HAND.x=x0+dx*u-dy/len*arc;HAND.y=y0+dy*u+dx/len*arc;gardenLife.move({x:HAND.x,y:HAND.y},true);await sleep(16);}HAND.x=x;HAND.y=y;gardenLife.move({x,y},true);if(press){HAND.press=1;await sleep(90/(+S.autoSpeed||1));HAND.press=0;gardenLife.release();}return true;
}
async function startAuto(){if(AUTO.running){stopAuto();return;}if(busy)return;AUTO.running=true;const token=++AUTO.token;AUTO.completed=0;HAND.visible=true;sync();
  if(ST.status==='won')newGame(S.level,{keepAuto:true});if(S.autoRec&&!REC.recorder)startRecording();
  try{while(AUTO.running&&token===AUTO.token){
    if(UI.helper){await sleep(60);const h=hits.find(h=>h.id==='helper');if(h)await moveHand(h.x+h.w/2,h.y+h.h/2,token,true);if(!AUTO.running||token!==AUTO.token)break;UI.helper=null;sfx.play('click',S);await sleep(200);continue;}
    if(ST.status==='won'){
      AUTO.completed++;await sleep(+S.growMs+Math.max(+S.winDelay,+S.endDelay)+(+S.nextDelay||800)/(+S.autoSpeed||1));
      if(!AUTO.running||token!==AUTO.token)break;
      if(!S.autoNext||AUTO.completed>=+S.autoLevelCount){UI.endMode=!!S.endCard;break;}
      const nextHit=hits.find(h=>h.id==='next');if(nextHit)await moveHand(nextHit.x+nextHit.w/2,nextHit.y+nextHit.h/2,token,true);nextLevel(true);await sleep(250);continue;
    }
    let plan=Core.solve(L,ST);
    if(!plan?.length&&S.autoRecover){while(ST.history.length&&!plan?.length){doUndo(true);plan=Core.solve(L,ST);}if(!plan?.length){newGame(S.level,{keepAuto:true});plan=Core.solve(L,ST);}}
    if(!plan?.length){toast('当前花园未找到解，请在编辑器检查。');break;}
    const p=plan[0],layout=boardLayout(L,S),j=Math.min(+S.jitter,Math.min(layout.cellW,layout.cellH)*0.2),x=layout.cx(p.c)+rand(-j,j),y=layout.cy(p.r)+rand(-j,j);
    if(Math.random()<S.thinkChance)await sleep(rand(0,+S.thinkMax)/(+S.autoSpeed||1));
    if(!await moveHand(x,y,token))break;UI.preview={c:p.c,r:p.r};HAND.press=1;await sleep(130/(+S.autoSpeed||1));
    if(!AUTO.running||token!==AUTO.token)break;HAND.press=0;doPlant(p.c,p.r,{automatic:true});await sleep(+S.growMs+rand(+S.delayMin,+S.delayMax)/(+S.autoSpeed||1));
  }}catch(e){toast('自动演示中止：'+e.message);console.error(e);}finally{if(token===AUTO.token){AUTO.running=false;UI.preview=null;HAND.press=0;HAND.visible=HAND.inside&&S.manualHand;sync();if(REC.recorder&&S.autoStop)setTimeout(()=>{if(REC.recorder)stopRecording();},+S.tailSec*1000);}}
}
function stopAuto(show=true){AUTO.running=false;AUTO.token++;HAND.press=0;HAND.visible=HAND.inside&&S.manualHand;gardenLife.release();UI.preview=null;sync();if(show)toast('已停止自动通关');}
function addRecordingLink(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.textContent=`⬇ ${name} · ${(blob.size/1048576).toFixed(2)} MB`;$('#recList').prepend(a);REC.list.push({blob,name});download(blob,name);}
async function startRecording(){if(REC.recorder)return;if(!canvas.captureStream||!window.MediaRecorder){toast('当前浏览器不支持画布录制，请用 Chrome / Edge。');return;}await sfx.resume();const formats=S.recFormat==='webm'?['video/webm;codecs=vp9,opus','video/webm']:S.recFormat==='mp4'?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4']:['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'];const mime=formats.find(x=>MediaRecorder.isTypeSupported(x));if(!mime){toast('所选录制格式不受浏览器支持，请选自动或 WebM。');return;}
  try{const stream=canvas.captureStream(+S.recFps||30);for(const track of sfx.recDest?.stream.getAudioTracks()||[])stream.addTrack(track);REC.chunks=[];REC.mime=mime;const media=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:(+S.recBitrate||8)*1e6});REC.recorder=media;REC.t0=performance.now();if(S.aeWithRec&&!recorder.rec)recorder.start();media.ondataavailable=e=>{if(e.data.size)REC.chunks.push(e.data);};media.onstop=async()=>{const blob=new Blob(REC.chunks,{type:mime});for(const track of stream.getVideoTracks())track.stop();const name=`plantlight_${stamp()}.${mime.includes('mp4')?'mp4':'webm'}`;addRecordingLink(blob,name);$('#recInfo').textContent=`录制完成 · ${(blob.size/1048576).toFixed(2)} MB`;if(S.aeWithRec&&recorder.rec){lastRecord=recorder.stop();try{await exportAE(true);}catch(e){toast(e.message);}}sync();};media.start(250);sync();}catch(e){REC.recorder=null;toast('录制失败：'+e.message);}
}
function stopRecording(){const media=REC.recorder;if(!media)return;REC.recorder=null;if(media.state!=='inactive')media.stop();sync();}
async function exportAE(withDownload=false){const rec=recorder.rec||lastRecord;if(!rec)throw new Error('请先开始记录，再游玩或自动通关。');const result=await recorder.exportZip(rec,S);window.__lastAEExport=result;if(withDownload)download(result.blob,result.name);return result;}
async function export3D(withDownload=false){const rec=recorder.rec||lastRecord;if(!rec)throw new Error('请先记录一段时间轴，再导出 3D 动画。');status('正在生成 GLB / FBX 与逐帧动画…');const result=await export3DAnimation({rec,S,recorder,canvas});window.__last3DExport=result;if(withDownload)download(result.blob,result.name);status();return result;}
async function action(key){if(busy)return;try{if(key==='_editor')return editor.open(L);if(key==='_shape')return $('#shapeFile').click();if(key==='_resetHand'){S.handImage=DEFAULT_HAND;S.handAnchorX=DEFAULTS.handAnchorX;S.handAnchorY=DEFAULTS.handAnchorY;S.handSize=DEFAULTS.handSize;S.handRotation=DEFAULTS.handRotation;S.handFlip=false;await loadHand();sync();save();return;}if(key==='_sfx'){await sfx.resume();['seed','grow','bloom','undo','hint','water','win'].forEach((n,i)=>setTimeout(()=>sfx.play(n,S),i*500));return;}
  if(key==='_aeToggle'){if(recorder.rec){lastRecord=recorder.stop();sync();await exportAE(true);toast('AE 工程包已导出');}else{recorder.start();sync();toast('已开始记录 AE 时间轴');}return;}
  busy=true;if(key==='_aeExport'){await exportAE(true);toast('AE 工程包已导出');}else if(key==='_export3d'){await export3D(true);toast('已导出真实 GLB / FBX / Blender 动画包');}else if(key==='_exportH5'){if(!S.h5StoreUrl)toast('尚未填写落地页 URL；请在投放前填写。');const playableSettings={...S,level:'custom',customData:structuredClone(L)};await exportH5PlayableFromPage({toolId:APP_ID,S:playableSettings,status,toast,stripDataUrls:[DEFAULT_HAND,S.handImage].filter(Boolean)});}
 }catch(e){toast(e.message);console.error(e);}finally{busy=false;sync();}}
async function settingChanged(key,value){if(key==='recRes'&&REC.recorder){sync();toast('请先停止录制，再更改画布分辨率。');return;}S[key]=value;if(key==='level'){newGame(value);return;}if(['cols','rows'].includes(key)&&S.shapeMask){S.shapeMask=null;toast('尺寸已改变，已恢复完整花园；可重新导入轮廓。');}if(['seed','cols','rows','seedCount','flowerCount'].includes(key)&&S.level==='random')newGame('random');if(key==='recRes')resize();if(key==='handImage')await loadHand();if(['handAnchorX','handAnchorY'].includes(key))addHandAsset();if(['handSize','handRotation','handFlip'].includes(key))drawHandPreview();if(['undoCount','hintCount','waterCount'].includes(key))UI[key]=value;
  if(key==='theme'){S.theme=Object.hasOwn(ATLAS_THEMES,value)?value:'cyanotype';[S.bgTop,S.bgMid,S.bgBottom]=ATLAS_THEMES[S.theme];sync();}
  if(['theme','bgTop','bgMid','bgBottom','tileColor','frameColor','flowerScale','vineWidth','endIcon'].includes(key))await rebuildArt();if(key.startsWith('h5'))fitPreview?.();save();}
function position(ev){const b=canvas.getBoundingClientRect();return {x:(ev.clientX-b.left)/b.width*DW,y:(ev.clientY-b.top)/b.height*DH};}
function gridAt(p){const b=boardLayout(L,S),c=Math.floor((p.x-b.x)/b.cellW),r=Math.floor((p.y-b.y)/b.cellH);return Core.inBounds(L,c,r)?{c,r}:null;}
function hitAt(p){return [...hits].reverse().find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);}
function handleHit(id){feedback.emit('button',{hit:id});if(id==='helper'){UI.helper=null;sfx.play('click',S);return;}if(id==='reset')return newGame();if(id==='gear'){if(NO_HAND)return;$('#panelSearch').focus();$('#panel').scrollIntoView({behavior:'smooth',block:'start'});return;}if(id==='undo')return doUndo();if(id==='hint')return doHint();if(id==='water'){if((!S.unlockBoosters&&+L.id<12)||UI.waterCount<=0){toast('浇水壶在第 12 关解锁');return;}UI.waterMode=!UI.waterMode;toast(UI.waterMode?'点一朵花苞，浇水让它绽放':'已取消浇水');return;}if(id==='next')return nextLevel();if(id==='cta'){if(NO_HAND&&window.__h5Install)return window.__h5Install();UI.endMode=false;return newGame('2');}}
canvas.addEventListener('pointerdown',ev=>{if(busy||AUTO.running||drag)return;sfx.resume();const p=position(ev);lastPointer=p;HAND.inside=true;HAND.x=p.x;HAND.y=p.y;HAND.press=1;HAND.visible=S.manualHand;const h=hitAt(p),cell=gridAt(p);drag={id:ev.pointerId,hit:h?.id||null};feedback.press(h?.id,cell);if(!h){UI.preview=cell;drag.cell=cell;}canvas.setPointerCapture(ev.pointerId);ev.preventDefault();});
canvas.addEventListener('pointermove',ev=>{const p=position(ev);lastPointer=p;HAND.inside=true;if(!AUTO.running){HAND.x=p.x;HAND.y=p.y;HAND.visible=S.manualHand;}if(drag&&drag.id===ev.pointerId){const cell=gridAt(p);feedback.move(cell);if(!drag.hit){UI.preview=cell;drag.cell=cell;}} });
canvas.addEventListener('pointerup',ev=>{if(!drag||drag.id!==ev.pointerId)return;const p=position(ev),d=drag;drag=null;feedback.release();HAND.press=0;UI.preview=null;if(d.hit){const h=hitAt(p);if(h?.id===d.hit)handleHit(d.hit);}else{const cell=gridAt(p);if(cell){if(UI.waterMode)waterFlower(cell.c,cell.r);else doPlant(cell.c,cell.r);}}});
canvas.addEventListener('pointercancel',ev=>{if(drag&&drag.id!==ev.pointerId)return;drag=null;feedback.release();UI.preview=null;HAND.press=0;});canvas.addEventListener('pointerleave',()=>{HAND.inside=false;if(!AUTO.running&&!drag)HAND.visible=false;});
function frameLoop(ms){try{if(L){feedback.prune(ms/1000);const out=composeFrame({L,ST,S,time:ms/1000,ui:UI,hand:null});items=out.items;hits=out.hits;const show=!NO_HAND&&HAND.image&&S.handImage&&HAND.visible&&(!UI.endMode||S.endCardHand);if(show){const a=A[HAND.asset],size=S.handSize*DW/a.w,press=S.pressEnabled?1-HAND.press*S.pressDepth:1;items.push({id:'hand',asset:HAND.asset,a:true,x:HAND.x,y:HAND.y,sx:size*press*(S.handFlip?-1:1),sy:size*press,rot:S.handRotation*Math.PI/180,op:1,z:1000});}canvas.style.cursor=show&&S.hideCursor?'none':'pointer';ctx.setTransform(canvas.width/DW,0,0,canvas.height/DH,0,0);ctx.clearRect(0,0,DW,DH);drawScene(ctx,items,A);recorder.sample(ms);if(++frame%20===0){status();if(REC.recorder)$('#recInfo').textContent=`● 录制中 ${((ms-REC.t0)/1000).toFixed(1)}s · ${S.recFps}fps · ${REC.mime.includes('mp4')?'MP4':'WebM'}`;if(recorder.rec)panel?.setButton('_aeToggle',`■ 停止并导出（${recorder.rec.lastT.toFixed(1)}s）`,true);}}}catch(e){console.error('render',e);stopAuto(false);}requestAnimationFrame(frameLoop);}

async function boot(){
  // H5 settings 必须在首个关卡、素材和手指创建之前应用。
  const P=window.__PLAYABLE__;if(P?.settings)Object.assign(S,migrate(P.settings));if(NO_HAND){S.handImage='';S.manualHand=false;S.hideCursor=false;S.endCardHand=false;S.autoRec=false;S.autoLevelCount=1;}
  panel=createPanel({root:$('#panelBody'),groups:GROUPS,S,onChange:settingChanged,onAction:action});
  editor=createEditor({getLevel:()=>L,onPlay:level=>newGame('custom',{level}),onSaved:()=>populateLevels(),toast});
  populateLevels();resize();await rebuildArt();await loadHand();newGame(S.level);requestAnimationFrame(frameLoop);
  $('#btnAuto').onclick=startAuto;$('#btnRec').onclick=()=>REC.recorder?stopRecording():startRecording();$('#btnNew').onclick=()=>newGame();$('#btnSeed').onclick=()=>{S.seed=Math.floor(Math.random()*99999998)+1;newGame('random');};$('#btnBuilder').onclick=()=>editor.open(L);$('#btnShape').onclick=()=>$('#shapeFile').click();$('#btnShot').onclick=()=>canvas.toBlob(b=>download(b,`plantlight_${stamp()}.png`));
  $('#btnExport').onclick=()=>download(new Blob([JSON.stringify(settingsEnvelope(S),null,2)],{type:'application/json'}),`plantlight_settings_${stamp()}.json`);$('#btnImport').onclick=()=>$('#importFile').click();
  $('#importFile').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.app&&data.app!==APP_ID)throw new Error('请选择花候图志或其旧版本的设置文件');Object.assign(S,migrate(data));resize();await rebuildArt();await loadHand();newGame();sync();toast('设置已导入');}catch(e){toast('导入失败：'+e.message);}ev.target.value='';};
  $('#btnReset').onclick=async()=>{stopAuto(false);Object.assign(S,migrate({}));resize();await rebuildArt();await loadHand();newGame('2');sync();toast('已恢复默认设置');};
  $('#levelSel').onchange=ev=>newGame(ev.target.value);$('#panelSearch').oninput=ev=>panel.filter(ev.target.value);$('#btnExpandAll').onclick=()=>$('#panelBody').querySelectorAll('details').forEach(d=>d.open=true);$('#btnCollapseAll').onclick=()=>$('#panelBody').querySelectorAll('details').forEach(d=>d.open=false);
  $('#shapeFile').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{const img=await createImageBitmap(file),cv=document.createElement('canvas');cv.width=+S.cols;cv.height=+S.rows;const c=cv.getContext('2d');c.drawImage(img,0,0,cv.width,cv.height);const data=c.getImageData(0,0,cv.width,cv.height).data;S.shapeMask=Array.from({length:cv.width*cv.height},(_,i)=>data[i*4+3]>96);img.close();newGame('random');toast('已按透明轮廓生成并验证可解花园');}catch(e){toast('图形导入失败：'+e.message);}ev.target.value='';};
  if(!P)fitPreview=bindEditorDevicePreview(()=>S);else applyPlayableMode({applySettings:v=>Object.assign(S,migrate(v)),onResize:()=>{},state:()=>JSON.stringify({moves:ST.moves.length,bloomed:ST.bloomed,status:ST.status}),isEnded:()=>ST.status!=='playing',autoPlay:startAuto});
  window.__app={get S(){return S;},get L(){return L;},get ST(){return ST;},get A(){return A;},get items(){return items;},UI,AUTO,HAND,REC,recorder,core:Core,plant:(c,r)=>doPlant(c,r),newGame,setSetting:settingChanged,startAuto,stopAuto,doUndo,doHint,waterFlower,exportAE,export3D,action,editor,startRecording,stopRecording,get lastRecord(){return lastRecord;},set lastRecord(v){lastRecord=v;},boardLayout:()=>boardLayout(L,S)};
  window.__ready=true;sync();
}
boot().catch(e=>{console.error(e);status('花园加载失败：'+e.message);});
