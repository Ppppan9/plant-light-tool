// node scripts/measure_frames.mjs <standalone HTML> <output directory> [CPU slowdown] [desktop|mobile]
// Run builds sequentially on the same host. A slowdown models CPU pressure only.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launch, newPage, waitGame} from '../test/helpers.mjs';

const [html = 'index.html', out = 'test/artifacts/frame-times', cpuText = '1', device = 'desktop'] = process.argv.slice(2);
const cpu = Number(cpuText);
if (!(cpu >= 1 && cpu <= 20)) throw Error('Expected a CPU slowdown between 1 and 20.');
await fs.mkdir(out, {recursive:true});
const browser = await launch();
try {
  const {page, errors} = await newPage(browser,
    device === 'mobile' ? {width:390, height:844} : {width:1440, height:1000});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:cpu});
  await page.addInitScript(() => {
    // Identify the game's self-rescheduling RAF without depending on its minified name.
    const nativeRaf = window.requestAnimationFrame.bind(window);
    let active, recurring, samples = [], inputs = [], firstFrameMs;
    const starts = new WeakMap();
    for (const type of ['pointerdown','pointerup']) {
      document.addEventListener(type, e => starts.set(e, performance.now()), true);
      document.addEventListener(type, e => inputs.push({type,start:starts.get(e),ms:performance.now()-starts.get(e)}));
    }
    let countCalls = false, drawCalls = 0;
    window.requestAnimationFrame = cb => {
      if (active === cb) recurring = cb;
      return nativeRaf(ts => {
        active = cb;
        const start = performance.now();
        try { cb(ts); }
        finally {
          if (cb === recurring && window.__ready) {
            const end = performance.now();
            firstFrameMs ??= end;
            samples.push([ts, end - start, drawCalls]);
          }
          active = null;
          drawCalls = 0;
        }
      });
    };
    window.frameAudit = {
      clear(){ samples = []; inputs = []; }, read(){ return samples; }, inputs(){ return inputs; },
      first(){ return firstFrameMs; },
      count() {
        if (countCalls) return;
        countCalls = true;
        const proto = CanvasRenderingContext2D.prototype, orig = proto.drawImage;
        proto.drawImage = function(...args) {
          if (this.canvas.id === 'stage') drawCalls++;
          return orig.apply(this, args);
        };
      }
    };
  });
  await page.goto(pathToFileURL(path.resolve(html)).href);
  await waitGame(page);
  await page.waitForTimeout(1000);
  const report = {browser:browser.version(), cpu, viewport:page.viewportSize(),
    firstGameFrameMs:await page.evaluate(() => Math.round(frameAudit.first())), phases:{}};
  const capture = async (name, run, setup) => {
    await page.evaluate(fn => {
      window.frameAudit.clear();
      if (fn === 'newGame') window.__app.newGame('12');
    }, setup || '');
    await run();
    const samples = await page.evaluate(() => window.frameAudit.read());
    const intervals = samples.slice(1).map((s,i) => s[0] - samples[i][0]);
    const dist = values => {
      const sorted = [...values].sort((a,b) => a-b);
      const q = p => Number(sorted[Math.max(0, Math.ceil(sorted.length*p)-1)].toFixed(2));
      return {median:q(.5), p95:q(.95), max:q(1)};
    };
    if (intervals.length < 8) throw Error(`Only ${intervals.length} frames captured in ${name}`);
    const ms = samples.at(-1)[0] - samples[0][0];
    report.phases[name] = {intervals:intervals.length, ms:+ms.toFixed(1), fps:+(intervals.length*1000/ms).toFixed(1),
      frameIntervalMs:dist(intervals), callbackMs:dist(samples.map(s => s[1])),
      above25ms:intervals.filter(v => v>25).length};
    if (name === 'firstPlant') {
      const input = await page.evaluate(() => frameAudit.inputs());
      report.phases[name].inputMs = Object.fromEntries(input.map(e => [e.type, +e.ms.toFixed(2)]));
    }
    console.log(name, report.phases[name]);
  };
  await capture('entry', () => page.waitForTimeout(1100), 'newGame');
  const first = await page.evaluate(() => {
    const a = __app, s = a.core.solve(a.L, a.ST)[0], b = a.boardLayout(), r = document.querySelector('#stage').getBoundingClientRect();
    return {x:r.x+b.cx(s.c)*r.width/720, y:r.y+b.cy(s.r)*r.height/1600};
  });
  await capture('firstPlant', async () => {
    await page.waitForTimeout(100);
    await page.mouse.click(first.x, first.y);
    await page.mouse.move(0,0);
    await page.waitForTimeout(1600);
  });
  if (!await page.evaluate(() => __app.ST.used === 1 && __app.ST.vines.length && __app.ST.bloomed.length)) throw Error('Expected a planted board with blooms.');
  await capture('idle', () => page.waitForTimeout(4500));
  await page.locator('#stage').screenshot({path:path.join(out, 'idle.png')});
  const cells = await page.evaluate(() => {
    const a = __app, b = a.boardLayout(), r = document.querySelector('#stage').getBoundingClientRect();
    return a.L.flowers.map(f => ({x:r.x+b.cx(f.c)*r.width/720,y:r.y+b.cy(f.r)*r.height/1600}));
  });
  await page.mouse.move(cells[0].x, cells[0].y);
  await page.mouse.down();
  await capture('drag', async () => {
    for (let j=0;j<2;j++) for (const p of cells) await page.mouse.move(p.x,p.y,{steps:6});
  });
  await page.locator('#stage').screenshot({path:path.join(out, 'drag.png')});
  await page.mouse.move(0,0);
  await page.mouse.up();
  await page.evaluate(() => { frameAudit.count(); frameAudit.clear(); });
  await page.waitForTimeout(400);
  report.stageBlitsPerIdleFrame = await page.evaluate(() => {
    const all = frameAudit.read().map(s => s[2]).sort((a,b) => a-b);
    return all[Math.floor(all.length/2)];
  });
  report.scene = await page.evaluate(() => ({
    level:__app.L.id, planted:__app.ST.used, flowers:__app.ST.bloomed.length,
    canvas:[document.querySelector('#stage').width, document.querySelector('#stage').height]
  }));
  if (errors.length) throw Error(errors.join('\n'));
  await fs.writeFile(path.join(out, 'frames.json'), JSON.stringify(report,null,2)+'\n');
  console.log('stage drawImage calls/frame:', report.stageBlitsPerIdleFrame, report.scene);
} finally { await browser.close(); }
