// Real-pointer regression of contextual feedback, including an actual exported H5.
// Runtime setup uses the public debug surface; every action under test uses mouse input.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {ROOT,serve,launch,newPage,waitGame,observeHudText,applySettings,nextDownload,unzip,saveDataUrl,check,eq,near,summary,stage,ensureArt,writeJson} from './helpers.mjs';

const out=await ensureArt('motion'),server=await serve(),browser=await launch();
const contexts=new Set(),runs=[];
const BASE={level:'12',recRes:'720x1600',sfxMute:true,manualHand:false,hideCursor:false,autoRec:false,autoStop:false,autoNext:false,endCard:false,unlockBoosters:true,undoCount:8,hintCount:8,waterCount:8,showTutorial:false,bgMotion:false,showParticles:true,showPreview:true,interactionMotion:true,growMs:600,bloomMs:350,winDelay:3500,h5Format:'generic',h5AutoPlay:false,h5Device:'adaptive',h5Orientation:1,h5StoreUrl:'https://example.com/plantlight-motion',h5MaxMb:5};
const branchIndex=id=>{const m=/^vine_(?:(?:leaf|tip|stem|sprig|floret)_)?(\d+)(?:_|$)/.exec(id);return m?+m[1]:null;};
const eventFx=it=>/^fx_/.test(it.id)||/^(?:fx_watering_can|fx_water_drop|fx_water_splash|fx_pollen|fx_growth_glow|fx_bloom_halo)$/.test(it.asset);
async function frames(page,n=2){await page.evaluate(n=>new Promise(resolve=>{const next=()=>n--?requestAnimationFrame(next):resolve();requestAnimationFrame(next);}),n);}
// The installed Playwright clock runs normally except during these short
// samples. Pause before the action, so slow CDP or capture never ages it.
async function pauseBeforeAction(page){await page.clock.pauseAt(await page.evaluate(()=>Date.now()+60000));}
async function reset(page,id='12',patch={}){
  await page.evaluate(({id,patch,base})=>{Object.assign(__app.S,base,patch);__app.newGame(id);__app.UI.helper=null;__app.UI.message=null;__app.UI.hideWin=false;}, {id,patch,base:BASE});
  // The playable end-state hook polls every 250ms; let a restarted board clear it.
  await frames(page);await page.waitForTimeout(275);
}
async function xy(page,x,y){const b=await page.locator('#stage').boundingBox();if(!b)throw Error('stage is not visible');return{x:b.x+x/720*b.width,y:b.y+y/1600*b.height};}
async function cellXY(page,c,r){const p=await page.evaluate(({c,r})=>{const b=__app.boardLayout();return{x:b.cx(c),y:b.cy(r)};},{c,r});return xy(page,p.x,p.y);}
async function clickCell(page,c,r){const p=await cellXY(page,c,r);await page.mouse.click(p.x,p.y);await frames(page);}
async function clickHit(page,id){const p=await xy(page,...({undo:[118,1484],hint:[280,1484],water:[442,1484],reset:[646,145]})[id]);await page.mouse.click(p.x,p.y);await frames(page);}
async function read(page){return page.evaluate(()=>({time:performance.now()/1000,paintedFlowerCount:window.readPaintedHudText?.('flower_count'),enteredAt:__app.UI.enteredAt,brushes:structuredClone(__app.UI.brushes||{}),used:__app.ST.used,status:__app.ST.status,moves:structuredClone(__app.ST.moves),vines:structuredClone(__app.ST.vines),bloomed:[...__app.ST.bloomed],bloomTimes:{...__app.ST.bloomTimes},flowers:structuredClone(__app.L.flowers),feedback:structuredClone(__app.UI.feedback),pressed:structuredClone(__app.UI.pressed),waterMode:__app.UI.waterMode,waterCount:__app.UI.waterCount,items:__app.items.map(i=>({...i})),missing:__app.items.filter(i=>!__app.A[i.asset]||!__app.A[i.asset].c?.width||!__app.A[i.asset].c?.height).map(i=>({id:i.id,asset:i.asset}))}));}
async function shot(page,dir,name){await saveDataUrl(await page.locator('#stage').evaluate(c=>c.toDataURL('image/png')),path.join(dir,name+'-canvas.png'));await page.locator('#stage').screenshot({path:path.join(dir,name+'.png')});}
async function startDemo(page){await page.evaluate(()=>{const c=document.querySelector('#stage');if(!c.captureStream||typeof MediaRecorder!=='function')return;const mime=['video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)return;const stream=c.captureStream(30),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});window.__motionDemo={rec,stream,chunks:[]};rec.ondataavailable=e=>{if(e.data.size)__motionDemo.chunks.push(e.data);};rec.start(200);});}
async function stopDemo(page,dir){const url=await page.evaluate(()=>new Promise(resolve=>{const d=window.__motionDemo;if(!d||d.rec.state==='inactive')return resolve(null);d.rec.onstop=()=>{for(const t of d.stream.getTracks())t.stop();const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(new Blob(d.chunks,{type:d.rec.mimeType}));};d.rec.stop();}));if(url)await saveDataUrl(url,path.join(dir,'interaction-demo.webm'));}

async function runSuite(page,label,dir,{record=false}={}){
  await fs.mkdir(dir,{recursive:true});const evidence={label,steps:[],missing:[]};
  const take=async name=>{const s=await read(page);evidence.steps.push({name,...s});evidence.missing.push(...s.missing);return s;};
  stage(label+' · 花园入场 / 待机 / 触碰回弹');
  await reset(page,'2',{showTutorial:false});await pauseBeforeAction(page);
  await page.evaluate(()=>__app.newGame());await page.clock.runFor(32);
  const entering=await take('level-entry'),firstTile=entering.items.find(i=>i.id==='soil_0_0');
  check(entering.time-entering.enteredAt<.2,label+' 新关卡记录独立入场起点');
  check(firstTile?.sy<.94&&firstTile?.op<.9,label+' 左上方土格仍在入场途中');
  await page.clock.fastForward(900);await page.clock.runFor(16);const settledEntry=await take('level-entry-settled');
  await page.clock.resume();
  check(settledEntry.items.find(i=>i.id==='soil_0_0')?.sy>firstTile.sy,label+' 土格入场弹落到完整尺寸');
  const startAngles=settledEntry.items.filter(i=>i.id.endsWith('_bud')).map(i=>[i.id,i.rot]);
  await page.waitForTimeout(150);const idle=await take('flower-idle');
  check(idle.items.some(i=>{const prev=startAngles.find(([id])=>id===i.id);return prev&&Math.abs(i.rot-prev[1])>.002;}),label+' 靜置花苞有连续待机摇摆');
  const touchFlower=idle.flowers[0],point=await cellXY(page,touchFlower.c,touchFlower.r);
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(170);const touched=await take('flower-touch');
  check(!!touched.brushes[touchFlower.id],label+' 手指停留在花苞上形成接触状态');
  const beforeTouch=startAngles.find(([id])=>id===touchFlower.id+'_bud')?.[1],afterTouch=touched.items.find(i=>i.id===touchFlower.id+'_bud')?.rot;
  check(Number.isFinite(beforeTouch)&&Number.isFinite(afterTouch)&&Math.abs(afterTouch-beforeTouch)>.08,label+' 触碰花朵明显倾斜');
  const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x-8,box.y+box.height*.5);await page.mouse.up();await page.waitForTimeout(700);const recovered=await take('flower-touch-recovered');
  eq(recovered.used,0,label+' 滑出花园后取消触碰不种下种子');
  check(!recovered.brushes[touchFlower.id],label+' 花朵触碰回弹状态已清理');
  stage(label+' · 真实按压 / 抬起 / 移出取消');
  await reset(page);if(record)await startDemo(page);
  const initial=await take('initial'),waterBefore=initial.items.find(i=>i.id==='booster_water'),wp=await xy(page,442,1484);
  await page.mouse.move(wp.x,wp.y);await page.mouse.down();await frames(page);const down=await take('button-down');
  eq(down.pressed?.hit,'water',label+' 按下道具时记录 pressed.hit');
  near(down.items.find(i=>i.id==='booster_water')?.sx,waterBefore.sx*.94,.001,label+' 道具本体真实压缩到94%');
  eq(down.waterMode,false,label+' pointerdown 不提前执行道具动作');await shot(page,dir,'pressed');
  await page.mouse.up();await frames(page);const up=await take('button-up');
  eq(up.pressed,null,label+' pointerup 清除 pressed');eq(up.waterMode,true,label+' pointerup 才切换浇水模式');
  check(up.feedback.some(e=>e.kind==='button'&&e.hit==='water'),label+' 松手发出 button feedback');
  await reset(page);const origin=await page.evaluate(()=>__app.core.solve(__app.L,__app.ST)[0]),gp=await cellXY(page,origin.c,origin.r);
  const soilBefore=(await read(page)).items.find(i=>i.id===`soil_${origin.c}_${origin.r}`);
  await page.mouse.move(gp.x,gp.y);await page.mouse.down();await frames(page);const gridDown=await take('grid-down');
  eq(gridDown.pressed?.c,origin.c,label+' 按下格子记录列');eq(gridDown.pressed?.r,origin.r,label+' 按下格子记录行');
  check(gridDown.items.find(i=>i.id===soilBefore.id).sy<soilBefore.sy,label+' 土格按下发生压缩');
  const expected = await page.evaluate(({c,r})=>__app.core.preview(__app.L,__app.ST,c,r).blooms,origin);
  const marked = gridDown.items.filter(i=>i.id.startsWith('preview_target_')).map(i=>i.id.slice('preview_target_'.length));
  check(expected.length > 0 && expected.length === marked.length && expected.every(id=>marked.includes(id)), label+' 按下只标记本次能开花的花苞');
  const stageBox=await page.locator('#stage').boundingBox();await page.mouse.move(stageBox.x-8,stageBox.y+stageBox.height*.55);await page.mouse.up();await frames(page);
  const cancel=await take('off-board-release');eq(cancel.pressed,null,label+' 移出舞台松手清除 pressed');eq(cancel.used,0,label+' 移出舞台松手不耗种');
  check(!cancel.items.some(i=>i.id.startsWith('preview_')),label+' 取消后清除目标轮廓和路径');

  stage(label+' · 非法落点与落种 / 花数时序');
  await reset(page);const flower=(await read(page)).flowers[0];await clickCell(page,flower.c,flower.r);const invalid=await take('invalid');
  eq(invalid.used,0,label+' 花苞非法点击不耗种');check(invalid.feedback.some(e=>e.kind==='invalid'&&e.c===flower.c&&e.r===flower.r),label+' 非法点击保留目标格反馈');
  check(invalid.items.some(i=>/^fx_invalid_/.test(i.id)&&i.asset==='fx_focus_invalid'),label+' 非法落点可见焦点');await shot(page,dir,'invalid');
  await reset(page,'2',{growMs:1800});const beforePlant=await take('before-plant'),zeroAsset=beforePlant.items.find(i=>i.id==='flower_count')?.asset;
  eq(beforePlant.paintedFlowerCount,`0/${beforePlant.flowers.length}`,label+' 初始 flower_count 确为0/总数贴图');
  const solution=await page.evaluate(()=>__app.core.solve(__app.L,__app.ST)[0]);await clickCell(page,solution.c,solution.r);const planted=await take('plant-immediate');
  eq(planted.used,1,label+' 真实松手落下一颗种子');check(planted.feedback.some(e=>e.kind==='plant'&&e.c===solution.c&&e.r===solution.r),label+' 落种发出 plant feedback');
  eq(planted.bloomed.length,planted.flowers.length,label+' 逻辑层已即时记录将开放花朵');
  check(Math.min(...Object.values(planted.bloomTimes))>planted.time,label+' 取样仍早于第一朵藤蔓到达');
  eq(planted.items.find(i=>i.id==='flower_count')?.asset,zeroAsset,label+' 藤未到时 FLOWERS 贴图保持0');
  await page.waitForTimeout(150);const landing=await take('seed-landing');check(landing.items.some(i=>/^fx_plant_.*_crumb_/.test(i.id)),label+' 种子落地有局部土粒反馈');await shot(page,dir,'seed-landing');
  const remaining=Math.max(0,Math.max(...Object.values(planted.bloomTimes))+.55-(await read(page)).time);await page.waitForTimeout(remaining*1000);await frames(page);const full=await take('full-bloom');
  const fullAsset=full.items.find(i=>i.id==='flower_count')?.asset;check(fullAsset!==zeroAsset,label+' 开花后 FLOWERS 贴图更新');eq(full.paintedFlowerCount,`${full.flowers.length}/${full.flowers.length}`,label+' 满开flower_count为总数/总数');
  eq(full.items.filter(i=>/_bloom$/.test(i.id)).length,full.flowers.length,label+' 每株花都真实呈现全开头部');await shot(page,dir,'full-bloom');

  stage(label+' · 浇水动作与逻辑即时 / 演出延迟');
  await reset(page);await clickHit(page,'water');const waterReady=await take('water-selected');eq(waterReady.waterMode,true,label+' 道具点击选择浇水模式');
  check(waterReady.items.some(i=>i.id==='booster_water_selected'),label+' 浇水道具有选择边框');
  const target=waterReady.flowers.find(f=>f.color==='blue')||waterReady.flowers[0];
  const waterPoint=await cellXY(page,target.c,target.r);
  await pauseBeforeAction(page);
  await page.mouse.click(waterPoint.x,waterPoint.y);await page.clock.runFor(32);
  const watered=await take('water-immediate'),event=[...watered.feedback].reverse().find(e=>e.kind==='water');
  check(!!event,label+' 浇水生成 water 事件');eq(watered.used,0,label+' 浇水不耗种');eq(watered.vines.length,0,label+' 浇水不生藤');eq(watered.bloomed.length,1,label+' 浇水逻辑即时只开目标一朵');eq(watered.bloomed[0],target.id,label+' 浇水逻辑命中目标花');eq(watered.waterCount,waterReady.waterCount-1,label+' 浇水次数只扣一次');eq(watered.waterMode,false,label+' 使用后退出浇水模式');
  near(watered.bloomTimes[target.id]-event?.time,.28,.025,label+' bloomTimes延后约280ms');
  check(watered.bloomTimes[target.id]>watered.time,label+' 逻辑更新早于视觉开花时刻');
  check(watered.items.some(i=>/^fx_water_.*_can$/.test(i.id)&&i.asset==='fx_watering_can'),label+' 浇水事件存在独立水壶精灵');
  await page.clock.runFor(208);const pouring=await take('water-pouring');check(pouring.items.some(i=>/^fx_water_.*_drop_/.test(i.id)&&i.asset==='fx_water_drop'),label+' 浇水中存在独立水滴');check(pouring.items.some(i=>/^fx_water_.*_can$/.test(i.id)),label+' 水滴出现时水壶仍可见');
  await saveDataUrl(await page.locator('#stage').evaluate(canvas=>canvas.toDataURL('image/png')),path.join(dir,'watering-canvas.png'));
  await page.clock.resume();
  await page.locator('#stage').screenshot({path:path.join(dir,'watering.png')});
  await page.waitForTimeout(2100);const cleaned=await take('water-cleaned');eq(cleaned.feedback.length,0,label+' 两秒后反馈事件已清理');eq(cleaned.items.filter(eventFx).length,0,label+' 演出结束无残留瞬态fx');

  // A slow bloom gives real mouse input the same generous sampling window on busy machines.
  await reset(page, '12', {bloomMs: 2000});
  await clickHit(page, 'water');
  await clickCell(page, target.c, target.r);
  await page.waitForFunction(id => __app.items.some(i => i.id === id+'_disk' && i.op > .25), target.id);
  const opening = await read(page);
  const petals = opening.items.filter(i=>i.id.startsWith(target.id+'_petal_'));
  check(petals.length === 5 && new Set(petals.map(i=>i.sy.toFixed(3))).size > 1, label+' 五片花瓣以不同进度展开');
  check(opening.items.some(i=>i.asset==='soil_damp' && i.op>0), label+' 水滴落下后土面变深');
  await clickHit(page, 'undo');
  const canceledWater = await read(page);
  check(!canceledWater.items.some(i=>i.asset==='soil_damp' || i.asset==='fx_watering_can'), label+' 中途撤销浇水清除湿土和水壶');
  check(canceledWater.bloomed.length===0 && canceledWater.items.some(i=>i.id.startsWith('fx_undo_') && i.asset.startsWith('flower_petal_')), label+' 半开时撤销能收回已展开的花瓣');

  stage(label+' · 撤销仅回收移除分枝 / 立即再次种植');
  await reset(page,'10',{growMs:350,bloomMs:200});const plan=await page.evaluate(()=>__app.core.solve(__app.L,__app.ST));check(plan.length>=3,label+' 撤销回归使用至少三步的真实关卡');
  const settled=()=>page.waitForFunction(()=>__app.ST.bloomed.every(id=>__app.items.some(it=>it.id===id+'_bloom'&&it.op===1)) && __app.ST.vines.every(v=>performance.now()/1000>=v.time+v.duration));
  await clickCell(page,plan[0].c,plan[0].r);await settled();const one=await take('first-branch-settled'),firstVines=one.vines.length;
  await clickCell(page,plan[1].c,plan[1].r);await settled();const two=await take('second-branch-settled');eq(two.used,2,label+' 两次种植形成两个独立根系');eq(two.status,'playing',label+' 撤销前仍可继续游玩');
  const removedBloom=two.bloomed.filter(id=>!one.bloomed.includes(id));
  const fromRemovedMove=i=>{
    const index=branchIndex(i.id);
    if(index!==null)return index>=firstVines;
    if(i.id==='seed_1'||i.id==='seed_sprout_1')return true;
    return removedBloom.some(id=>i.id===id+'_bloom'||i.id===id+'_leaves');
  };
  const required=two.items.filter(fromRemovedMove).map(i=>i.id);
  const undoPoint=await xy(page,118,1484),plantPoint=await cellXY(page,plan[1].c,plan[1].r);
  await pauseBeforeAction(page);
  await page.mouse.click(undoPoint.x,undoPoint.y);await page.clock.runFor(48);
  const undo=await take('undo-active'),ue=[...undo.feedback].reverse().find(e=>e.kind==='undo'),ghosts=ue?.ghosts||[],ghostIds=ghosts.map(i=>i.id);
  eq(undo.used,1,label+' 撤销恢复上一颗种子状态');eq(undo.vines.length,one.vines.length,label+' 撤销仅移除第二根系藤蔓');check(ghosts.length>0,label+' 撤销存在ghost快照');
  check(required.every(id=>ghostIds.includes(id)),label+' 被移除主藤/叶/小枝/小花/种子完整进入ghost',{missing:required.filter(id=>!ghostIds.includes(id))});
  check(ghosts.every(fromRemovedMove),label+' 满开后撤销只回收被移除分枝，不含保留分枝/棋盘/HUD',{unexpected:ghosts.filter(i=>!fromRemovedMove(i)).map(i=>i.id)});
  eq(new Set(ghostIds).size,ghostIds.length,label+' 每个移除精灵只生成一次ghost');check(undo.items.some(i=>/^fx_undo_/.test(i.id)),label+' 撤销快照已进入真实渲染列表');
  const ghostCount=undo.items.filter(i=>/^fx_undo_/.test(i.id)).length;eq(ghostCount,ghosts.length,label+' ghost快照与实际绘制一一对应');
  // Replant while the old removal effect is still alive. Retained branch IDs and transforms stay intact.
  await page.mouse.click(plantPoint.x,plantPoint.y);await page.clock.runFor(48);
  const replanted=await take('replant-during-undo');eq(replanted.used,2,label+' 撤销动画中再次落子成功');
  await page.clock.resume();
  const retained=two.items.filter(i=>{const index=branchIndex(i.id);return index!==null&&index<firstVines;});
  const changes=retained.flatMap(old=>{const it=replanted.items.find(i=>i.id===old.id);return !it||it.asset!==old.asset||['x','y','sx','sy','op'].some(k=>Math.abs(it[k]-old[k])>.001)?[old.id]:[];});
  check(changes.length===0,label+' 再次种植不改变保留分枝位置/尺寸/透明度',changes);check(replanted.items.some(i=>/^fx_undo_/.test(i.id)),label+' 再次种植期间原撤销效果仍独立存在');await shot(page,dir,'undoing');
  await page.waitForTimeout(2100);const undoClean=await take('undo-cleaned');eq(undoClean.feedback.length,0,label+' 撤销与再次落种反馈两秒后清理');eq(undoClean.items.filter(i=>/^fx_undo_/.test(i.id)).length,0,label+' 撤销ghost无残留');

  stage(label+' · 关闭交互动效');
  await reset(page,'12',{interactionMotion:false});const offTarget=(await read(page)).flowers.find(f=>f.color==='blue');await clickHit(page,'water');await clickCell(page,offTarget.c,offTarget.r);await page.waitForTimeout(220);const offWater=await take('motion-off-water');eq(offWater.items.filter(eventFx).length,0,label+' 关闭动效后浇水无瞬态fx');
  const offWaterEv=[...offWater.feedback].reverse().find(e=>e.kind==='water');near(offWater.bloomTimes[offTarget.id]-offWaterEv.time,0,.025,label+' 关闭动效后浇水不保留280ms演出等待');
  await reset(page,'10',{interactionMotion:false,growMs:350});const offPlan=await page.evaluate(()=>__app.core.solve(__app.L,__app.ST));await clickCell(page,offPlan[0].c,offPlan[0].r);await page.waitForTimeout(180);const offPlant=await take('motion-off-plant');eq(offPlant.items.filter(eventFx).length,0,label+' 关闭动效后落种无瞬态fx');
  await page.waitForTimeout(450);await clickHit(page,'undo');const offUndo=await take('motion-off-undo');eq(offUndo.items.filter(eventFx).length,0,label+' 关闭动效后撤销无瞬态fx');
  check(evidence.missing.length===0,label+' 所有已采样画面缺失素材数为0',evidence.missing);
  if(record)await stopDemo(page,dir);await writeJson(path.join(dir,'evidence.json'),evidence);return {label,samples:evidence.steps.length,missing:evidence.missing};
}

async function reducedSuite(url,label,dir){
  const {context,page,errors}=await newPage(browser,{width:1440,height:1100});contexts.add(context);await page.emulateMedia({reducedMotion:'reduce'});const requests=[];page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
  try{
    await page.goto(url,{waitUntil:'load'});await waitGame(page);await reset(page);eq(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true,label+' 浏览器已启用reduced-motion');
    const before=await read(page),p=await xy(page,442,1484),waterBefore=before.items.find(i=>i.id==='booster_water');await page.mouse.move(p.x,p.y);await page.mouse.down();await frames(page);const down=await read(page);
    eq(down.pressed?.hit,'water',label+' reduced-motion仍正确记录输入');near(down.items.find(i=>i.id==='booster_water').sx,waterBefore.sx,.001,label+' reduced-motion不播放道具压缩');await page.mouse.up();await frames(page);
    const target=before.flowers.find(f=>f.color==='blue')||before.flowers[0];await clickCell(page,target.c,target.r);await page.waitForTimeout(230);const water=await read(page);eq(water.bloomed.length,1,label+' reduced-motion浇水功能保留');eq(water.items.filter(eventFx).length,0,label+' reduced-motion无水壶/水滴/花粉等非必要反馈');
    await reset(page,'10');const plan=await page.evaluate(()=>__app.core.solve(__app.L,__app.ST));await clickCell(page,plan[0].c,plan[0].r);await page.waitForTimeout(180);const plant=await read(page);eq(plant.items.filter(eventFx).length,0,label+' reduced-motion无落种/生长光晕');await clickHit(page,'undo');const undo=await read(page);eq(undo.items.filter(eventFx).length,0,label+' reduced-motion无撤销ghost');
    await page.waitForTimeout(2100);eq((await read(page)).feedback.length,0,label+' reduced-motion事件也在两秒后清理');
    check([water,plant,undo].every(s=>s.missing.length===0),label+' reduced-motion素材完整');check(errors.length===0,label+' reduced-motion页面错误数0',errors);check(requests.length===0,label+' reduced-motion网络失败数0',requests);await writeJson(path.join(dir,'reduced-motion.json'),{water,plant,undo,errors,requests});
  }finally{await context.close();contexts.delete(context);}
}

let toolPage,toolContext;
try{
  const build=await fs.readFile(path.join(ROOT,'index.html'));const buildSha=crypto.createHash('sha256').update(build).digest('hex');
  const tool=await newPage(browser,{width:1440,height:1100});toolPage=tool.page;toolContext=tool.context;contexts.add(toolContext);const toolRequests=[];toolPage.on('requestfailed',r=>toolRequests.push({url:r.url(),error:r.failure()?.errorText}));
  await toolPage.clock.install();await observeHudText(toolPage);await toolPage.goto(server.origin+'/index.html',{waitUntil:'load'});await waitGame(toolPage);await applySettings(toolPage,BASE);await reset(toolPage);
  stage('从工具实际导出本次构建的 Generic H5 ZIP');
  const zip=await nextDownload(toolPage,()=>toolPage.evaluate(()=>__app.action('_exportH5')),out),unpacked=path.join(out,'h5-unzipped');await unzip(zip,unpacked);
  const h5Path=path.join(unpacked,'generic','index.html'),h5Html=await fs.readFile(h5Path,'utf8'),h5Url=server.origin+'/'+path.relative(ROOT,h5Path).split(path.sep).join('/');
  check(h5Html.includes('window.__PLAYABLE__='),'实际导出ZIP含Generic可玩配置');check(!h5Html.includes('ed-window'),'Generic H5剥离编辑器界面');eq((await toolPage.evaluate(()=>window.__lastH5Export?.formats))?.join(','),'generic','本次实际导出Generic渠道');
  runs.push(await runSuite(toolPage,'工具版',path.join(out,'tool'),{record:true}));
  check(tool.errors.length===0,'工具版页面错误数0',tool.errors);check(toolRequests.length===0,'工具版网络失败数0',toolRequests);
  const h5=await newPage(browser,{width:390,height:844});contexts.add(h5.context);const h5Requests=[];h5.page.on('requestfailed',r=>h5Requests.push({url:r.url(),error:r.failure()?.errorText}));await h5.page.clock.install();await observeHudText(h5.page);await h5.page.goto(h5Url,{waitUntil:'load'});await waitGame(h5.page);await h5.page.waitForFunction(()=>window.__h5StageLayout);runs.push(await runSuite(h5.page,'实际导出Generic H5',path.join(out,'generic')));check(h5.errors.length===0,'实际导出Generic H5页面错误数0',h5.errors);check(h5Requests.length===0,'实际导出Generic H5网络失败数0',h5Requests);await h5.context.close();contexts.delete(h5.context);
  stage('工具版与实际导出H5的reduced-motion回归');await reducedSuite(server.origin+'/index.html','工具版',path.join(out,'tool'));await reducedSuite(h5Url,'实际导出Generic H5',path.join(out,'generic'));
  const afterSha=crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT,'index.html'))).digest('hex');eq(afterSha,buildSha,'整个回归使用同一份构建，未中途改写index.html');
  await writeJson(path.join(out,'build-and-export.json'),{buildSha,zip,h5Sha:crypto.createHash('sha256').update(h5Html).digest('hex'),h5Bytes:Buffer.byteLength(h5Html),runs,errors:{tool:tool.errors,h5:h5.errors},requests:{tool:toolRequests,h5:h5Requests}});
}catch(e){check(false,'交互动效回归异常：'+e.message);console.error(e);}finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close().catch(()=>{});await server.close();}
await writeJson(path.join(out,'test-result.json'),summary('工具版与实际导出Generic H5交互动效'));
