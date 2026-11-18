// A crop of the running game, without overlays or reference pixels.
// node scripts/capture_reference_vine.mjs [path/to/output.jpg]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, applySettings, ensureArt, launch, newPage, saveDataUrl, serve, waitGame, writeJson } from '../test/helpers.mjs';

const scratch = await ensureArt('reference-vine');
const output = path.resolve(process.argv[2] || path.join(scratch, 'trial.jpg'));
const build = createHash('sha256').update(await fs.readFile(path.join(ROOT,'index.html'))).digest('hex');
const server = await serve(), browser = await launch();
try {
  const {page, errors} = await newPage(browser, {width:1440, height:1000});
  await page.clock.install({time:new Date('2026-01-01T12:00:00Z')});
  await page.goto(server.origin);
  await waitGame(page);
  await applySettings(page, {
    recRes:'1080x2400', bgMotion:false, manualHand:false, showTutorial:false,
    growMs:700, bloomMs:450, winDelay:9000, autoNext:false, sfxMute:true
  });
  await page.clock.pauseAt(new Date('2026-01-01T12:01:00Z'));
  await page.locator('#levelSel').selectOption('2');
  await page.clock.runFor(850);
  const cell = {c:1,r:3};
  const point = await page.evaluate(cell => {
    const b = __app.boardLayout(), stage = document.querySelector('#stage').getBoundingClientRect();
    return {x:stage.left+b.cx(cell.c)*stage.width/720,y:stage.top+b.cy(cell.r)*stage.height/1600};
  },cell);
  await page.mouse.click(point.x,point.y);
  await page.clock.runFor(2400);
  const {url,...report} = await page.locator('#stage').evaluate((stage,cell) => {
    const b=__app.boardLayout(), scale=stage.width/720;
    // Frame relative to the root and grid pitch so the same three flower
    // centres and curled lower tip remain in view on a fresh replay.
    const x=Math.round((b.cx(cell.c)-.96*b.cellW)*scale);
    const y=Math.round((b.cy(cell.r)-2.23*b.cellH)*scale);
    const w=Math.round(3.36*b.cellW*scale), h=Math.round(4.23*b.cellH*scale);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(stage,x,y,w,h,0,0,w,h);
    return {url:c.toDataURL('image/jpeg',.97),crop:{x,y,w,h},level:__app.L.id,
      used:__app.ST.used,flowers:__app.ST.bloomed.length,status:__app.ST.status,
      segments:__app.ST.vines.map(v=>[v.c1,v.r1,v.c2,v.r2])};
  },cell);
  assert.deepEqual([Number(report.level),report.used,report.flowers,report.status],[2,1,4,'won']);
  assert.ok(report.segments.some(v=>v.join(',')==='1,3,1,4'),'curled lower branch must reach the last row');
  assert.deepEqual(errors,[]);
  await saveDataUrl(url,output);
  await writeJson(path.join(scratch,'capture.json'),{build,cell,millisecondsAfterClick:2400,output,...report});
  console.log(JSON.stringify({build,cell,output,...report}));
} finally {await browser.close();await server.close();}
