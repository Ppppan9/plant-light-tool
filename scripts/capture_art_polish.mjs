// Capture the current Canvas renderer after npm run build.
import fs from 'node:fs/promises';
import path from 'node:path';
import {serve,launch,newPage,waitGame,applySettings,saveDataUrl,writeJson,ROOT} from '../test/helpers.mjs';

const out=path.join(ROOT,'test/artifacts/art-polish');await fs.mkdir(out,{recursive:true});
const server=await serve(),browser=await launch(),report=[];
const settings={sfxMute:true,manualHand:false,bgMotion:false,showParticles:false,winDelay:15000,growMs:500,bloomMs:350,recRes:'720x1600',autoNext:false};
async function canvas(page,name){await saveDataUrl(await page.locator('#stage').evaluate(c=>c.toDataURL('image/png')),path.join(out,name+'.png'));}
async function solve(page){for(let n=0;n<10;n++){const move=await page.evaluate(()=>__app.ST.status==='playing'?__app.core.solve(__app.L,__app.ST)?.[0]:null);if(!move)break;await page.evaluate(p=>__app.plant(p.c,p.r),move);await page.waitForTimeout(450);}await page.waitForTimeout(1050);}
try{
  const {page,errors}=await newPage(browser);await page.goto(server.origin);await waitGame(page);await applySettings(page,settings);
  for(const lv of ['2','3','10','12']){
    await page.selectOption('#levelSel',lv);await page.waitForTimeout(180);
    if(lv==='2'){await canvas(page,'after-buds-native');await page.screenshot({path:path.join(out,'tool.png')});}
    await solve(page);await canvas(page,`level-${lv}-native`);
    if(lv==='2')await canvas(page,'after-bloom-native');
    report.push(await page.evaluate(()=>({level:__app.L.id,status:__app.ST.status,flowers:__app.ST.bloomed.length,items:__app.items.length,missing:__app.items.filter(i=>!__app.A[i.asset]).map(i=>i.asset),leavesUniform:__app.items.filter(i=>i.id.startsWith('vine_leaf_')).every(i=>i.sx===i.sy)})));
  }
  await page.selectOption('#levelSel','2');await page.evaluate(()=>__app.plant(1,3));
  // Hold deterministic growth progress while screenshots are encoded. A busy
  // browser can otherwise finish the animation during screenshot delivery.
  for(const [name,progress]of [['early',.2],['middle',.55],['complete',1]]){
    await page.evaluate(progress=>{const t=performance.now()/1000,duration=1e6,age=1-Math.cbrt(1-progress);for(const v of __app.ST.vines){v.duration=duration;v.time=t-duration*age;}for(const id of __app.ST.bloomed)__app.ST.bloomTimes[id]=progress===1?t-10:t+duration;},progress);
    await page.waitForTimeout(80);await canvas(page,'growth-'+name);
  }
  await writeJson(path.join(out,'scene-report.json'),{date:new Date().toISOString(),report,errors});
  if(errors.length||report.some(r=>r.status!=='won'||r.missing.length||!r.leavesUniform))throw Error(JSON.stringify({report,errors}));
  console.log(JSON.stringify({report,errors}));
}finally{await browser.close();await server.close();}
