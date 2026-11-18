import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,serve,launch,newPage,waitGame,clickSolution,nextDownload,unzip} from '../test/helpers.mjs';

const images=path.join(ROOT,'screenshots'),tmp=path.join(ROOT,'test/artifacts/garden-controls-preview');
await Promise.all([fs.mkdir(images,{recursive:true}),fs.mkdir(tmp,{recursive:true})]);
const server=await serve(),browser=await launch();
try {
  const {page,errors}=await newPage(browser,{width:1360,height:900});
  await page.goto(server.origin);await waitGame(page);
  await page.locator('#levelSel').selectOption('12');
  await page.waitForFunction(()=>__app.L.id===12);
  await clickSolution(page);
  await page.mouse.move(1,1);await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(images,'garden-controls-studio.png')});
  await page.locator('#btnBuilder').click();
  await page.locator('#pl-editor.open').waitFor();
  await page.screenshot({path:path.join(images,'garden-controls-editor.png')});
  await page.keyboard.press('Escape');
  await page.evaluate(()=>__app.setSetting('h5Format','generic'));
  const zip=await nextDownload(page,()=>page.evaluate(()=>__app.action('_exportH5')),tmp);
  await unzip(zip,path.join(tmp,'unpacked'));
  const mobile=await newPage(browser,{width:390,height:844});
  await mobile.page.goto(server.origin+'/test/artifacts/garden-controls-preview/unpacked/generic/index.html');await waitGame(mobile.page);
  await clickSolution(mobile.page);
  await mobile.page.waitForTimeout(1100);
  await mobile.page.screenshot({path:path.join(images,'garden-controls-playable.png')});
  if(errors.length||mobile.errors.length)throw Error([...errors,...mobile.errors].join('\n'));
} finally {await browser.close();await server.close();}
