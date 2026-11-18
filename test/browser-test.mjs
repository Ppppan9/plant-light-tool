import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {serve,launch,newPage,waitGame,applySettings,clickSolution,nextDownload,check,eq,summary,stage,ensureArt,writeJson,ROOT} from './helpers.mjs';

const out=await ensureArt('browser'),server=await serve(),browser=await launch();let context,page;
async function clickXY(x,y){const b=await page.locator('#stage').boundingBox();await page.mouse.click(b.x+x/720*b.width,b.y+y/1600*b.height);await page.waitForTimeout(120);}
async function clickCell(c,r){const p=await page.evaluate(({c,r})=>{const b=__app.boardLayout();return{x:b.cx(c),y:b.cy(r)};},{c,r});await clickXY(p.x,p.y);}
async function state(){return page.evaluate(()=>({id:__app.L.id,status:__app.ST.status,used:__app.ST.used,bloomed:__app.ST.bloomed.length,seeds:__app.L.seeds,flowers:__app.L.flowers.length,history:__app.ST.history.length}));}
const steps=[];
try{
  let errors;({context,page,errors}=await newPage(browser));
  await page.goto(server.origin+'/index.html',{waitUntil:'load'});await waitGame(page);
  eq(await page.evaluate(()=>__app.S.autoRec),false,'初次打开默认不自动录制');
  check(await page.locator('#btnAuto').isVisible(),'标准工具栏可见');
  const image=await page.locator('#stage').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let color=0;for(let i=0;i<d.length;i+=400)if(d[i]+d[i+1]+d[i+2]>80)color++;return color;});
  check(image>1000,'离线自包含画布已绘制内容');
  await page.screenshot({path:path.join(out,'tool-desktop.png')});
  await applySettings(page,{sfxMute:true,manualHand:false,growMs:150,bloomMs:100,winDelay:150,endCard:false});

  stage('真实鼠标：按住预览、移出取消、花苞约束、种植');
  const p=await page.evaluate(()=>{const b=__app.boardLayout();return{x:b.cx(1),y:b.cy(3)};}),b=await page.locator('#stage').boundingBox();
  await page.mouse.move(b.x+p.x/720*b.width,b.y+p.y/1600*b.height);await page.mouse.down();await page.waitForTimeout(80);
  check(await page.evaluate(()=>__app.UI.preview?.c===1&&__app.UI.preview?.r===3),'按住空格实时显示十字预览');
  await page.mouse.move(b.x+b.width/2,b.y+b.height*.27);await page.mouse.up();await page.waitForTimeout(100);
  eq((await state()).used,0,'移出棋盘再松开不会消耗种子');
  check(await page.evaluate(()=>__app.UI.preview===null),'取消后清除预览');
  await clickCell(1,0);eq((await state()).used,0,'实际点击花苞不消耗种子');
  await clickCell(1,3);let st=await state();check(st.status==='won'&&st.used===1&&st.bloomed===4,'实际点击正确格按规则开出 4 朵花');
  await page.waitForTimeout(500);await page.locator('#stage').screenshot({path:path.join(out,'level2-win.png')});
  steps.push({name:'manual-level2',...st});

  stage('参考道具：撤销、提示、浇水');
  await page.selectOption('#levelSel','4');await clickSolution(page);
  st=await state();check(st.used===1&&st.history===1,'第 4 关种植加入可撤销历史');
  await clickXY(118,1484);st=await state();check(st.used===0&&st.bloomed===0&&st.status==='playing','点击 Undo 恢复上一状态');
  eq(await page.evaluate(()=>__app.UI.undoCount),2,'撤销道具扣除 1 次');
  await page.selectOption('#levelSel','7');await page.waitForFunction(()=>__app.items.some(i=>i.id==='booster_badge_hint'));await clickXY(280,1484);
  const hint=await page.evaluate(()=>({hint:__app.UI.hint,count:__app.UI.hintCount,used:__app.ST.used,expected:__app.core.solve(__app.L,__app.ST)?.[0]}));
  check(hint.hint?.c===hint.expected?.c&&hint.hint?.r===hint.expected?.r,'Hint 显示求解器实际下一步');
  check(hint.count===0&&hint.used===0,'提示扣道具次数但不自动种植');
  await page.selectOption('#levelSel','12');await page.waitForFunction(()=>__app.items.some(i=>i.id==='booster_badge_water'));await clickXY(442,1484);
  eq(await page.evaluate(()=>__app.UI.waterMode),true,'点击浇水壶进入选花模式');
  const bud=await page.evaluate(()=>__app.L.flowers[0]);await clickCell(bud.c,bud.r);st=await state();
  check(st.bloomed===1&&st.used===0,'浇水只让所选花苞绽放，不消耗种子');
  check(await page.evaluate(()=>__app.ST.vines.length===0&&__app.UI.waterCount===1&&!__app.UI.waterMode),'浇水不生成藤蔓并退出选花模式');
  await clickXY(442,1484);const secondBud=await page.evaluate(()=>__app.L.flowers.find(f=>!__app.ST.bloomed.includes(f.id)));await clickCell(secondBud.c,secondBud.r);
  await clickXY(442,1484);
  const exhausted=await page.evaluate(()=>{const f=__app.L.flowers.find(f=>!__app.ST.bloomed.includes(f.id));return {accepted:__app.waterFlower(f.c,f.r),count:__app.UI.waterCount,bloomed:__app.ST.bloomed.length,mode:__app.UI.waterMode};});
  check(!exhausted.accepted&&exhausted.count===0&&exhausted.bloomed===2&&!exhausted.mode,'浇水次数耗尽后按钮和直接调用均不能扣成负数');
  await page.selectOption('#levelSel','7');
  const locked=await page.evaluate(()=>{const f=__app.L.flowers[0];return {accepted:__app.waterFlower(f.c,f.r),count:__app.UI.waterCount,bloomed:__app.ST.bloomed.length};});
  check(!locked.accepted&&locked.count===2&&locked.bloomed===0,'未解锁浇水壶的关卡拒绝直接调用且不改变次数');

  stage('手动进入新道具关卡：介绍阻挡种植，Try it 关闭');
  await page.selectOption('#levelSel','3');await clickSolution(page,{all:true});
  await page.waitForFunction(()=>__app.items.some(i=>i.id==='next_button'));
  const next=await page.evaluate(()=>{const i=__app.items.find(i=>i.id==='next_button');return{x:i.x,y:i.y};});await clickXY(next.x,next.y);
  await page.waitForFunction(()=>__app.UI.helper==='undo'&&__app.items.some(i=>i.id==='helper_card'));
  check((await state()).id===4,'第 3 关 Next garden 进入第 4 关并显示 Undo 介绍');
  await page.locator('#stage').screenshot({path:path.join(out,'new-helper-undo.png')});
  await clickSolution(page);eq((await state()).used,0,'新道具介绍显示期间不能在棋盘种植');
  await clickXY(360,1115);await page.waitForFunction(()=>!__app.UI.helper&&!__app.items.some(i=>i.id==='helper_card'));
  check(await page.evaluate(()=>__app.UI.helper===null&&__app.ST.used===0),'点击 Try it 关闭介绍且不误种植');
  // 新页面清空本次会话的 seenHelpers，让自动流程也独立经过三种介绍。
  await page.reload();await waitGame(page);

  stage('11 关自动通关走真实规则，默认不自动录制');
  await applySettings(page,{level:'2',autoSpeed:6,moveMin:50,moveMax:50,delayMin:0,delayMax:0,thinkChance:0,jitter:0,curve:0,growMs:100,bloomMs:100,winDelay:0,endDelay:0,nextDelay:100,autoNext:true,autoLevelCount:11,endCard:true,endTitle:'QA Garden Complete',endButton:'Grow again',autoStop:false});
  await page.evaluate(()=>{window.__autoObserved=[];window.__helpersObserved=[];window.__autoObserver=setInterval(()=>{const a=__app,seen=window.__autoObserved;if(a.UI.helper&&!window.__helpersObserved.includes(a.UI.helper))window.__helpersObserved.push(a.UI.helper);if(a.ST.status==='won'&&!seen.some(x=>x.id===a.L.id))seen.push({id:a.L.id,used:a.ST.used,seeds:a.L.seeds,bloomed:a.ST.bloomed.length,flowers:a.L.flowers.length});},15);});
  await page.locator('#btnAuto').click();await page.waitForFunction(()=>__app.AUTO.running);
  eq(await page.evaluate(()=>__app.REC.recorder),null,'按自动通关不会启动 MediaRecorder');
  await page.waitForFunction(()=>!__app.AUTO.running&&__app.AUTO.completed===11,null,{timeout:90000});
  const auto=await page.evaluate(()=>{clearInterval(window.__autoObserver);return {completed:__app.AUTO.completed,seen:window.__autoObserved,helpers:window.__helpersObserved,recording:!!__app.REC.recorder,list:__app.REC.list.length};});
  eq(auto.completed,11,'自动演示完成全部 11 关');eq(auto.seen.length,11,'逐关观察到全部 11 次真实胜利');
  check(auto.seen.every(x=>x.used<=x.seeds&&x.bloomed===x.flowers),'每关均遵守种子预算并覆盖全部花朵',auto.seen);
  check(auto.recording===false&&auto.list===0,'自动演示完成后没有意外录像或下载');
  check(JSON.stringify(auto.helpers)===JSON.stringify(['undo','hint','water']),'自动通关依次处理 Undo / Hint / Watering can 三个新道具介绍',auto.helpers);
  await page.waitForFunction(()=>__app.UI.endMode&&__app.items.some(i=>i.id==='final_cta'));
  const originalEnd=await page.evaluate(()=>({title:__app.items.find(i=>i.id==='final_end_title').asset,button:__app.items.find(i=>i.id==='final_cta_text').asset}));
  await applySettings(page,{endTitle:'Every flower is blooming!',endButton:'Start a new garden'});
  const customEnd=await page.evaluate(()=>{const t=__app.items.find(i=>i.id==='final_end_title'),b=__app.items.find(i=>i.id==='final_cta_text');return{title:t.asset,button:b.asset,titleWidth:__app.A[t.asset].w*Math.abs(t.sx),buttonWidth:__app.A[b.asset].w*Math.abs(b.sx)};});
  check(customEnd.title!==originalEnd.title&&customEnd.button!==originalEnd.button,'结束页标题和按钮文案设置实际重建对应文字素材');
  check(customEnd.titleWidth<=536&&customEnd.buttonWidth<=390,'结束页可调文案自适应卡片和按钮宽度');
  await writeJson(path.join(out,'auto-11-levels.json'),auto);await page.locator('#stage').screenshot({path:path.join(out,'auto-level12-endcard.png')});
  await clickXY(360,1040);
  check(await page.evaluate(()=>__app.L.id===2&&__app.ST.status==='playing'&&!__app.UI.endMode),'实际点击结束页 CTA 返回第 2 关并清空结束状态');

  stage('关卡编辑、保存、JSON 往返和设置持久化');
  await page.selectOption('#levelSel','2');await page.locator('#btnBuilder').click();await page.waitForSelector('#pl-editor.open');
  eq(await page.locator('#pl-editor [role=gridcell]').count(),25,'搭建器生成原生 5×5 可编辑格');
  await page.locator('#ed-name').fill('QA 花园');await page.locator('#ed-name').press('Tab');
  await page.locator('#ed-check').click();await page.waitForFunction(()=>document.querySelector('#ed-result').textContent.includes('可解'));
  await page.locator('#ed-save').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('plantLight.levels.v1')||'[]').length===1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('plantLight.levels.v1'))[0]);
  check(saved.title==='QA 花园'&&!saved.draft,'可解关卡保存到本机关卡库');
  const levelFile=await nextDownload(page,()=>page.locator('#ed-export').click(),out),levelJSON=JSON.parse(await fs.readFile(levelFile,'utf8'));
  check(levelJSON.app==='plant-light-tool'&&levelJSON.level.flowers.length===4,'关卡 JSON 导出包含准确结构');
  await page.locator('#ed-name').fill('临时名字');await page.locator('#ed-name').press('Tab');
  await page.locator('#ed-import-file').setInputFiles(levelFile);await page.waitForFunction(()=>document.querySelector('#ed-name').value==='QA 花园');
  eq(await page.locator('#ed-name').inputValue(),'QA 花园','导入关卡 JSON 恢复编辑内容');
  await page.locator('#ed-play').click();await page.waitForFunction(()=>!__app.editor.isOpen);
  check(await page.evaluate(()=>__app.S.level==='custom'&&__app.L.title==='QA 花园'),'编辑关卡可以直接试玩');
  await clickSolution(page,{all:true});eq((await state()).status,'won','编辑后关卡按实际指针点击通关');
  await applySettings(page,{growMs:770,handSize:.53,sfxVolume:1.17,theme:'mint'});
  const settingFile=await nextDownload(page,()=>page.locator('#btnExport').click(),out),settingsJSON=JSON.parse(await fs.readFile(settingFile,'utf8'));
  check(settingsJSON.app==='plant-light-tool'&&settingsJSON.version===3&&settingsJSON.settings.growMs===770,'设置下载符合版本信封且保留用户值');
  await applySettings(page,{growMs:220});await page.locator('#importFile').setInputFiles(settingFile);await page.waitForFunction(()=>__app.S.growMs===770);
  eq(await page.evaluate(()=>__app.S.growMs),770,'真实文件导入恢复设置');
  await page.reload();await waitGame(page);
  check(await page.evaluate(()=>__app.S.growMs===770&&__app.S.handSize===.53&&__app.S.theme==='mint'),'刷新后用户外观和节奏设置保持');
  check((await page.locator('#levelSel option').allTextContents()).some(t=>t.includes('QA 花园')),'刷新后本机关卡库保持');
  await page.locator('#panelSearch').fill('vineWidth');
  check(await page.locator('[data-key=vineWidth]').isVisible(),'设置搜索定位并展开匹配参数');
  check(await page.locator('[data-key=recFps]').isHidden(),'设置搜索隐藏不匹配项');
  await page.locator('#panelSearch').fill('');

  stage('截图与真实录像下载');
  const shot=await nextDownload(page,()=>page.locator('#btnShot').click(),out),shotBytes=await fs.readFile(shot);
  check(shotBytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'截图按钮输出有效 PNG');
  await applySettings(page,{level:'2',theme:'reference',recRes:'360x800',recFormat:'auto',recFps:25,recBitrate:2,aeWithRec:false,autoRec:false,autoStop:false,growMs:150,winDelay:200});
  await page.locator('#btnRec').click();await page.waitForFunction(()=>!!__app.REC.recorder);
  await page.locator('#panelSearch').fill('recRes');await page.locator('#setting-recRes').selectOption('720x1600');
  const protectedRes=await page.evaluate(()=>({setting:__app.S.recRes,value:document.querySelector('#setting-recRes').value,width:document.querySelector('#stage').width,height:document.querySelector('#stage').height}));
  check(protectedRes.setting==='360x800'&&protectedRes.value==='360x800'&&protectedRes.width===360&&protectedRes.height===800,'录制中从真实面板修改分辨率被拒绝，设置/控件/画布保持一致',protectedRes);
  await page.locator('#panelSearch').fill('');await page.waitForTimeout(400);await clickSolution(page,{all:true});await page.waitForTimeout(1000);
  const movie=await nextDownload(page,()=>page.locator('#btnRec').click(),out),movieStat=await fs.stat(movie);
  check(movieStat.size>10000,'MediaRecorder 停止后下载真实视频');
  const ffprobe=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_streams','-show_format','-of','json',movie],{encoding:'utf8'}));
  const vs=ffprobe.streams.find(s=>s.codec_type==='video'),as=ffprobe.streams.find(s=>s.codec_type==='audio');
  check(vs?.width===360&&vs?.height===800,'实际视频采用设定 360×800 分辨率');
  check(Number(ffprobe.format.duration)>1,'实际视频有连续时长');
  check(!!as,'实际录制包含 WebAudio 音轨');
  eq(await page.locator('#recList a').count(),1,'录制列表保留下载链接');
  await writeJson(path.join(out,'recording-ffprobe.json'),ffprobe);

  stage('移动布局与 file:// 离线运行');
  await page.setViewportSize({width:390,height:844});await page.locator('#stage').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,canvas:document.querySelector('#stage').getBoundingClientRect().toJSON(),panel:document.querySelector('#panel').getBoundingClientRect().toJSON()}));
  check(layout.scroll<=layout.width+1,'390px 手机宽度没有横向溢出',layout);
  check(layout.canvas.width>100&&layout.canvas.right<=391,'移动端画布完整放入视口');
  await page.screenshot({path:path.join(out,'tool-mobile.png'),fullPage:false});
  check(errors.length===0,'完整浏览器流程无 console/page error',errors);
  const offline=await newPage(browser,{width:1200,height:900});await offline.page.goto('file://'+path.join(ROOT,'index.html'));await waitGame(offline.page);
  check(await offline.page.evaluate(()=>__app.items.length>40&&__app.ST.status==='playing'),'直接双击 file:// 自包含文件可运行');
  check(offline.errors.length===0,'file:// 无加载或脚本错误',offline.errors);await offline.context.close();
  await writeJson(path.join(out,'steps.json'),steps);
}catch(e){check(false,'测试异常：'+e.message);console.error(e);}finally{await context?.close().catch(()=>{});await browser.close().catch(()=>{});await server.close();}
await writeJson(path.join(out,'test-result.json'),summary('真实浏览器玩法 / 编辑 / 截图 / 录制 / 离线'));
