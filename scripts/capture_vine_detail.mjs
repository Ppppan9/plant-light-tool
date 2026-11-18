// Run after building: node scripts/capture_vine_detail.mjs [all|comparison|touch] [outDir]
// Compare two stages in this build. The touch capture uses a newly exported H5.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, applySettings, ensureArt, launch, newPage, nextDownload, saveDataUrl, serve, unzip, waitGame } from '../test/helpers.mjs';

const mode = process.argv[2] || 'all';
assert(['all', 'comparison', 'touch'].includes(mode));
const scratch = await ensureArt('vine-detail');
const out = path.resolve(process.argv[3] || scratch);
const settings = {
  level: '10', recRes: '720x1600', bgMotion: false, manualHand: false, showTutorial: false,
  interactionMotion: true, showParticles: true, sfxMute: true, growMs: 1100, bloomMs: 750,
  winDelay: 9000, h5Format: 'generic', h5Device: 'adaptive', h5AutoPlay: false,
  h5StoreUrl: 'https://example.com/garden'
};
await fs.mkdir(out, { recursive: true });
const server = await serve(), browser = await launch();
const python = (code, ...args) => execFileSync(process.env.PYTHON || 'python3', ['-c', code, ...args]);

async function startClock(page, url, reset = true) {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.goto(url);
  await waitGame(page);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 150)));
  if (reset) await page.evaluate(() => __app.newGame('10'));
}
async function screenPoint(page, cell, dx = 0, dy = 0) {
  return page.evaluate(({ cell, dx, dy }) => {
    const stage = document.querySelector('#stage').getBoundingClientRect(), b = __app.boardLayout();
    return {
      x: stage.x + (b.cx(cell.c) + dx*b.k)/720*stage.width,
      y: stage.y + (b.cy(cell.r) + dy*b.k)/1600*stage.height
    };
  }, { cell, dx, dy });
}
async function scene(page, name) {
  await saveDataUrl(await page.locator('#stage').evaluate(c => c.toDataURL('image/png')), path.join(scratch, name + '.png'));
}
async function comparisonBoard(url, tag) {
  const { context, page, errors } = await newPage(browser);
  try {
    await page.goto(url);
    await waitGame(page);
    await applySettings(page, settings);
    await startClock(page, url);
    await page.clock.runFor(1000);
    const plan = await page.evaluate(() => __app.core.solve(__app.L, __app.ST));
    assert.equal(plan.length, 3);
    for (const [i, move] of plan.entries()) {
      const p = await screenPoint(page, move);
      await page.mouse.click(p.x, p.y);
      if (!i) {
        await page.clock.runFor(320);
        await scene(page, `${tag}-grow`);
      }
      await page.clock.runFor(2000);
    }
    await scene(page, `${tag}-settled`);
    assert.deepEqual(await page.evaluate(() => [__app.ST.status, __app.ST.used]), ['won', 3]);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
}
async function comparison() {
  await comparisonBoard(server.origin, 'current');
  python(`
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import sys
src,dest=map(Path,sys.argv[1:])
def font(size):
    for name in ['DejaVuSans.ttf','/System/Library/Fonts/Supplemental/Arial.ttf']:
        try: return ImageFont.truetype(name,size)
        except OSError: pass
    return ImageFont.load_default()
w,h=440,242
canvas=Image.new('RGB',(w*2+44,h+52),'#183f47'); draw=ImageDraw.Draw(canvas)
for i,(phase,label) in enumerate([('grow','01  /  GROWTH'),('settled','02  /  FULLY GROWN')]):
    x=16+i*(w+12); draw.text((x,10),label,font=font(16),fill='#f2e8cc')
    with Image.open(src/f'current-{phase}.png') as im: canvas.paste(im.crop((107,755,547,997)),(x,37))
canvas.save(dest,quality=94,subsampling=0,optimize=True)
`, scratch, path.join(out, 'vine-comparison.jpg'));
}
async function touch() {
  const tool = await newPage(browser);
  let unpacked;
  try {
    await tool.page.goto(server.origin); await waitGame(tool.page);
    await applySettings(tool.page, { ...settings, bgMotion: true });
    const zip = await nextDownload(tool.page, () => tool.page.evaluate(() => __app.action('_exportH5')), scratch);
    unpacked = await unzip(zip, path.join(scratch, 'h5'));
  } finally { await tool.context.close(); }
  const context = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, hasTouch:true, isMobile:true });
  const frames = await fs.mkdtemp(path.join(scratch,'frames-'));
  try {
    const page = await context.newPage(), err = [];
    page.on('pageerror', e => err.push(e.message));
    const url = new URL(path.relative(ROOT, path.join(unpacked,'generic','index.html')).split(path.sep).join('/'),server.origin).href;
    await startClock(page, url, false);
    const cdp = await context.newCDPSession(page);
    const origin = await page.evaluate(() => __app.core.solve(__app.L,__app.ST)[0]);
    const originFocus = await page.evaluate(cell => {const b=__app.boardLayout();return [b.cx(cell.c),b.cy(cell.r)];},origin);
    const flower = await page.evaluate(() => __app.L.flowers.find(f => f.id==='flower_4'));
    const focus = await page.evaluate(f => {const b=__app.boardLayout();return [b.cx(f.c),b.cy(f.r)-39*b.k];},flower);
    const materials = new Set();
    async function event(type, cell, dx, dy) {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: cell ? [await screenPoint(page,cell,dx,dy)] : [] });
    }
    for(let n = 0; n < 142; n++) {
      if(n===21) await event('touchStart',origin,0,0);
      if(n===23) await event('touchEnd');
      if(n===91) await event('touchStart',flower,-38,-39);
      if(n>=92&&n<=99) await event('touchMove',flower,-38+(n-91)*10,-39);
      if(n===100) await event('touchCancel');
      await page.clock.runFor(50);
      if(n>=24 && n<=65) {
        const live=await page.evaluate(()=>__app.items.filter(it=>it.op>.08).map(it=>it.asset));
        for(const asset of live) materials.add(asset);
      }
      if([2,14,35,96,110].includes(n)) await page.screenshot({path:path.join(scratch,`phone-${n}.png`)});
      const image=await page.locator('#stage').evaluate((stage,{n,focus,origin})=>{
        const smooth=t=>(t=Math.max(0,Math.min(1,t)),t*t*(3-2*t));
        const a=smooth((n-14)/14),b=smooth((n-72)/17);
        const extent=720-260*a-35*b;
        const cx=Math.max(extent/2,Math.min(720-extent/2,(360+(origin[0]-360)*a)*(1-b)+focus[0]*b));
        const cy=(902+(origin[1]-902)*a)*(1-b)+focus[1]*b;
        const c=document.createElement('canvas');c.width=c.height=504;
        const g=c.getContext('2d');g.imageSmoothingQuality='high';
        g.drawImage(stage,cx-extent/2,cy-extent/2,extent,extent,0,0,504,504);
        return c.toDataURL('image/png');
      },{n,focus,origin:originFocus});
      await saveDataUrl(image,path.join(frames,`${String(n).padStart(3,'0')}.png`));
      if(n===95)assert(await page.evaluate(id=>!!__app.UI.brushes?.[id],flower.id),'touch sweep must engage the flower flex response');
    }
    for(const family of ['fx_earth_grain_', 'fx_sap_streak', 'fx_leaf_chip', 'fx_anther_dust', 'fx_petal_flake_']){
      assert([...materials].some(key=>key.startsWith(family)),`missing live particle ${family}`);
    }
    assert.deepEqual(await page.evaluate(()=>[__app.ST.status,__app.ST.used,__app.ST.bloomed.length]),['playing',1,4]);
    assert.deepEqual(err,[]);
    python(`
from pathlib import Path
from PIL import Image
import sys
frames=[Image.open(p).convert('RGB') for p in sorted(Path(sys.argv[1]).glob('*.png'))]
frames[0].save(sys.argv[2],'WEBP',save_all=True,append_images=frames[1:],duration=50,loop=0,quality=86,method=5)
`,frames,path.join(out,'flower-touch.webp'));
  } finally { await context.close(); await fs.rm(frames,{recursive:true,force:true}); }
}
try {
  if(mode!=='touch') await comparison();
  if(mode!=='comparison') await touch();
  console.log(`Captured ${mode} in ${out}`);
} finally {await browser.close();await server.close();}
