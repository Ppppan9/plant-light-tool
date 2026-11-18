// Cursor visibility follows the actual rendered hand, including missing artwork.
import path from 'node:path';
import {serve,launch,newPage,waitGame,applySettings,check,eq,summary,stage,ensureArt,writeJson} from './helpers.mjs';
const outDir=await ensureArt('cursor'),server=await serve(),browser=await launch();let context,page;
const rendered=()=>page.evaluate(()=>__app.items.some(i=>i.id==='hand'));
const cursor=()=>page.locator('#stage').evaluate(c=>getComputedStyle(c).cursor);
async function waitState(hand,cur){await page.waitForFunction(({hand,cur})=>__app.items.some(i=>i.id==='hand')===hand&&getComputedStyle(document.querySelector('#stage')).cursor===cur,{hand,cur},{timeout:6000});}
try {
  let errors;({context,page,errors}=await newPage(browser));await page.goto(server.origin+'/index.html',{waitUntil:'load'});await waitGame(page);const defaultHand=await page.evaluate(()=>__app.S.handImage);await applySettings(page,{manualHand:true,hideCursor:true,endCardHand:false,autoRec:false,autoNext:false,autoSpeed:1,moveMin:1500,moveMax:1500,sfxMute:true});const box=await page.locator('#stage').boundingBox(),inside={x:box.x+box.width*.55,y:box.y+box.height*.6},outside={x:box.x+box.width+30,y:box.y+30};
  stage('手动指针进出与隐藏开关');
  await page.mouse.move(outside.x,outside.y);await waitState(false,'pointer');eq(await rendered(),false,'画布外不显示手指');eq(await cursor(),'pointer','无手指时光标 pointer');await page.mouse.move(inside.x,inside.y);await waitState(true,'none');eq(await rendered(),true,'移入画布显示手指');eq(await cursor(),'none','手指显示时系统光标隐藏');await page.screenshot({path:path.join(outDir,'manual-hand.png')});
  await applySettings(page,{hideCursor:false});await waitState(true,'pointer');eq(await cursor(),'pointer','关闭隐藏开关立即恢复系统光标');await applySettings(page,{hideCursor:true});await waitState(true,'none');await page.mouse.move(outside.x,outside.y);await waitState(false,'pointer');eq(await cursor(),'pointer','移出画布恢复光标');
  await applySettings(page,{manualHand:false});await page.mouse.move(inside.x,inside.y);await waitState(false,'pointer');eq(await rendered(),false,'关闭手动跟随后不画手指');
  stage('自动演示与停止后的光标复位');
  await page.locator('#btnAuto').click();await page.waitForFunction(()=>__app.AUTO.running);await page.mouse.move(outside.x,outside.y);await waitState(true,'none');eq(await rendered(),true,'自动时指针离开仍显示演示手指');await page.locator('#btnAuto').click();await page.waitForFunction(()=>!__app.AUTO.running);await waitState(false,'pointer');eq(await cursor(),'pointer','停止自动后恢复光标');
  stage('结束页与空手指素材');
  await applySettings(page,{manualHand:true,hideCursor:true,endCardHand:false});await page.mouse.move(inside.x,inside.y);await waitState(true,'none');await page.evaluate(()=>{__app.UI.endMode=true;});await waitState(false,'pointer');eq(await rendered(),false,'结束页关闭手指时光标恢复');await applySettings(page,{endCardHand:true});await waitState(true,'none');eq(await rendered(),true,'结束页允许手指时联动隐藏光标');await page.screenshot({path:path.join(outDir,'endcard-hand.png')});
  await applySettings(page,{handImage:''});await waitState(false,'pointer');eq(await rendered(),false,'素材为空不会绘制手指');eq(await cursor(),'pointer','素材为空不会隐藏光标');await applySettings(page,{handImage:defaultHand});await waitState(true,'none');eq(await rendered(),true,'恢复默认手指后显示');await page.locator('#btnNew').click();await page.mouse.move(inside.x,inside.y);await waitState(true,'none');eq(await cursor(),'none','重开后正常联动');
  const panel=await page.evaluate(()=>({body:getComputedStyle(document.body).cursor,panel:getComputedStyle(document.querySelector('#panel')).cursor,button:getComputedStyle(document.querySelector('#btnAuto')).cursor}));check(Object.values(panel).every(c=>c!=='none'),'控制台与页面光标始终保留',panel);await page.mouse.move(outside.x,outside.y);await waitState(false,'pointer');check(errors.length===0,'所有光标操作无浏览器错误',errors);
}catch(e){check(false,'测试异常：'+e.message);console.error(e);}finally{await context?.close().catch(()=>{});await browser.close().catch(()=>{});await server.close();}
await writeJson(path.join(outDir,'test-result.json'),summary('实际绘制手指与系统光标联动'));
