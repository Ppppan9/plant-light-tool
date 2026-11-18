// Verify the shared emitters at fixed timestamps, then play both shipped entries.
import path from 'node:path';
import { composeSoilParticles, composeGrowthParticles, composeBloomParticles } from '../src/garden-particles.js';
import { ROOT, serve, launch, newPage, waitGame, nextDownload, unzip, check, eq, stage, summary, ensureArt, writeJson } from './helpers.mjs';

const out = await ensureArt('garden-detail');
const item = (id, asset, x, y, sx, sy, rot, op, z) => ({ id, asset, x, y, sx, sy, rot, op, z });
const limits = { soil: [12,22,32], growth: [16,32,44], bloom: [22,48,68] };
const kinds = Object.keys(limits);
const levels = ['low','normal','high'];
const x = 480, y = 770;

function emit(kind, items, S, age, n = 0, k = 1, angle = 0) {
  const shared = { items, item, S, age, x, y, k };
  if (kind === 'soil') return composeSoilParticles({ ...shared, id: `plant_${n}`, seed: n + 11 });
  if (kind === 'bloom') return composeBloomParticles({ ...shared, fl: { id:`f${n}`, color:'blue', c:n % 6, r:3 } });
  const dist = 270 * k, duration = 0.65;
  const length = dist * (1 - (1 - Math.max(0, Math.min(1, age / duration))) ** 3);
  const point = t => ({ x:t * Math.cos(angle), y:t * Math.sin(angle) });
  return composeGrowthParticles({ ...shared, index:n, angle, dist, duration, point, length, x0:x, y0:y });
}

function emitterChecks() {
  const stats = {};
  for (const kind of kinds) {
    stats[kind] = [];
    for (const [index, particleDensity] of levels.entries()) {
      const S = { particleDensity, showParticles:true, interactionMotion:true, bloomMs:500, flowerScale:1.15 };
      let peak = 0, total = 0, finite = true, local = true, bounded = true, outsideLifetime = false;
      const assets = new Set();
      for (let frame = -2; frame <= 108; frame++) {
        const age = frame / 60;
        const many = [];
        for (let instance = 0; instance < 40; instance++) emit(kind, many, S, age, instance);
        peak = Math.max(peak, many.length);
        bounded &&= many.length <= limits[kind][index];
        for (const scale of [.65, 1.35]) for (const angle of [0, Math.PI/2, Math.PI, Math.PI*1.5]) {
          const single = [];
          emit(kind, single, S, age, 3, scale, angle);
          total += single.length;
          if ((age < 0 || age > 1.5) && single.length) outsideLifetime = true;
          for (const p of single) {
            assets.add(p.asset);
            finite &&= [p.x,p.y,p.sx,p.sy,p.rot,p.op,p.z].every(Number.isFinite) && p.op >= 0 && p.op <= 1 && p.sx > 0 && p.sy > 0;
            const dx = (p.x - x) / scale, dy = (p.y - y) / scale;
            if (kind === 'growth') {
              const along = dx * Math.cos(angle) + dy * Math.sin(angle);
              const across = dy * Math.cos(angle) - dx * Math.sin(angle);
              local &&= along >= -10 && along <= 280 && Math.abs(across) < 38;
            } else local &&= Math.hypot(dx,dy) < (kind === 'soil' ? 77 : 180);
          }
        }
      }
      check(total > 0 && assets.size >= 2, `${kind} ${particleDensity} 能观察到多种粒子`, [...assets]);
      check(finite && local, `${kind} ${particleDensity} 各缩放和生长方向下均有有限、局部的可见轨迹`);
      check(!outsideLifetime, `${kind} ${particleDensity} 释放前和寿命结束后无粒子`);
      check(bounded && peak > 0, `${kind} ${particleDensity} 并发 40 个来源不会越过帧预算`, {peak});
      stats[kind].push({ total, peak, assets:[...assets] });
    }
    check(stats[kind].slice(1).every((v,i) => v.total > stats[kind][i].total && v.peak > stats[kind][i].peak), `${kind} 三档的单条轨迹数量和高负载并发数量严格递增`, stats[kind]);
    for (const setting of ['showParticles','interactionMotion']) {
      const suppressed = [];
      for (let frame=1; frame < 70; frame++) emit(kind, suppressed, {[setting]:false}, frame/60);
      eq(suppressed.length,0,`${kind} 遵守 ${setting} 开关`);
    }
  }
  return stats;
}

const options = {level:'10', interactionMotion:true, showParticles:true, particleDensity:'high', growMs:650, bloomMs:400,
  showTutorial:false, manualHand:false, autoNext:false, endCard:false, sfxMute:true, h5Format:'generic', h5AutoPlay:false,
  h5Device:'adaptive', h5StoreUrl:'https://example.com/garden', winDelay:6000};

async function screenPoint(page, p) {
  const b = await page.locator('#stage').boundingBox();
  return {x:b.x + p.x * b.width / 720, y:b.y + p.y * b.height / 1600};
}

// Starting in a requestAnimationFrame keeps the sample inside the first visual
// frame even when the browser has been busy constructing or exporting assets.
async function begin(page, overrides = {}) {
  return page.evaluate(({options, overrides}) => new Promise(resolve => requestAnimationFrame(() => {
    Object.assign(__app.S, options, overrides);
    __app.newGame('10');
    requestAnimationFrame(() => {
      const layout = __app.boardLayout(), move = __app.core.solve(__app.L, __app.ST)[0];
      const beds = __app.items.filter(i => i.id.startsWith('soil_'));
      const buds = __app.items.filter(i => i.id.endsWith('_bud'));
      const invisible = buds.filter(i => i.op < .05);
      const orphanShadows = invisible.filter(i => (__app.items.find(j => j.id === i.id.slice(0,-4) + '_shadow')?.op || 0) > .11);
      resolve({ x:layout.cx(move.c), y:layout.cy(move.r), invisible:invisible.length, orphanShadows:orphanShadows.length,
        entering:beds.some(i=>i.op<.99), flower:__app.L.flowers[0].id });
    });
  })), {options,overrides});
}

async function startParticleObserver(page) {
  await page.evaluate(() => {
    const seen = new Set();
    const deadline = performance.now() + 1800;
    window.gardenSample = new Promise(resolve => {
      function collect() {
        for (const it of __app.items) if (/^fx_(earth_grain|seed_husk|sap_streak|leaf_chip|anther_dust|petal_flake)/.test(it.asset)) seen.add(it.asset);
        if (performance.now()<deadline) requestAnimationFrame(collect); else resolve([...seen]);
      }
      collect();
    });
  });
}

async function pose(page, id) {
  return page.evaluate(id => {
    const part = __app.items.find(i => i.id === id);
    return part && [part.x,part.y,part.sx,part.sy,part.rot,part.op];
  }, id);
}

async function cursorTest(page,label) {
  const leaf = await page.evaluate(() => {
    const candidates = __app.items.filter(i=>i.id.startsWith('vine_leaf_') && i.op>.99);
    const i = candidates[Math.floor(candidates.length/2)];
    return i && {id:i.id,rot:i.rot,x:i.x+Math.sin(i.rot)*21*i.sy,y:i.y-Math.cos(i.rot)*21*i.sy};
  });
  check(!!leaf, `${label} 实际落种后可检查成形叶片`);
  if (!leaf) return;
  const p = await screenPoint(page,leaf);
  await page.mouse.move(p.x,p.y);
  await page.waitForTimeout(185);
  const touched = await pose(page,leaf.id);
  check(Math.abs(touched[4]-leaf.rot) > .08, `${label} 指针停在叶片上会产生可见偏转`, {angleBefore:leaf.rot, angleAfter:touched[4]});
  await page.mouse.move(0,0);
  await page.waitForTimeout(760);
  const released = await pose(page,leaf.id);
  check(Math.abs(released[4]-leaf.rot) < .075, `${label} 离开后叶片回到待机姿态`);
}

async function play(page, label) {
  await waitGame(page);
  await page.mouse.move(0,0);
  let entry = await begin(page);
  check(entry.entering && entry.invisible > 0, `${label} 首帧存在分批入场的土块和花苞`, entry);
  eq(entry.orphanShadows,0,`${label} 入场时没有单独悬在空格上的花影`);
  const target = await screenPoint(page,entry);
  await startParticleObserver(page);
  await page.evaluate(() => {
    const stage = document.querySelector('#stage');
    stage.addEventListener('pointerdown', () => {
      window.gardenTapDuringEntrance = __app.items.some(i => i.id.startsWith('soil_') && i.op < .99);
    }, {once:true,capture:true});
  });
  await page.mouse.move(target.x,target.y);
  await page.mouse.down();
  const down = await page.evaluate(() => ({used:__app.ST.used, c:__app.UI.pressed?.c, entering:window.gardenTapDuringEntrance}));
  check(down.entering && down.used === 0 && Number.isInteger(down.c), `${label} 入场中可按下并保持瞄准`,down);
  await page.mouse.up();
  eq(await page.evaluate(()=>__app.ST.used),1,`${label} 第一次松手立即成功落种`);
  const seen = await page.evaluate(()=>window.gardenSample);
  check(['earth_grain','sap_streak','anther_dust','petal_flake'].every(type=>seen.some(k=>k.startsWith('fx_'+type))), `${label} 真正的落种、生长、开花帧均产生所需粒子`,seen);
  await cursorTest(page,label);
  await page.locator('#stage').screenshot({path:path.join(out,`${label}-garden.png`)});

  await page.emulateMedia({ reducedMotion:'reduce' });
  entry = await begin(page);
  check(!entry.entering && entry.invisible === 0, `${label} 系统减少动效让第一帧完整呈现棋盘和花苞`);
  const budId = `${entry.flower}_bud`;
  const standing = await pose(page,budId);
  const hover = await screenPoint(page,{x:standing[0],y:standing[1]-37});
  await page.mouse.move(hover.x,hover.y);
  await page.waitForTimeout(260);
  const after = await pose(page,budId);
  eq(JSON.stringify(after),JSON.stringify(standing),`${label} 减少动效时花苞在待机和触碰期间均保持原姿态`);
  const cell = await screenPoint(page,entry);
  await startParticleObserver(page);
  await page.mouse.click(cell.x,cell.y);
  eq(await page.evaluate(()=>__app.ST.used),1,`${label} 减少动效时仍可种植`);
  eq((await page.evaluate(()=>window.gardenSample)).length,0,`${label} 减少动效时三种植物粒子都不绘制`);
}

const report = {emitters:emitterChecks()};
const server = await serve(), browser = await launch();
try {
  stage('核对工具及其实际导出的 Generic H5');
  const tool=await newPage(browser);
  await tool.page.goto(server.origin); await waitGame(tool.page);
  await tool.page.evaluate(settings=>Object.assign(__app.S,settings),options);
  const zip=await nextDownload(tool.page,()=>tool.page.evaluate(()=>__app.action('_exportH5')),out);
  const archive=await unzip(zip,path.join(out,'h5-unzipped'));
  await play(tool.page,'tool');
  check(!tool.errors.length,'工具运行时无浏览器错误',tool.errors);
  const h5=await newPage(browser,{width:390,height:844});
  const h5Path=path.relative(ROOT,path.join(archive,'generic','index.html')).split(path.sep).join('/');
  await h5.page.goto(server.origin+'/'+h5Path);await waitGame(h5.page);
  eq(await h5.page.evaluate(()=>__app.S.particleDensity),'high','H5 导出保留选定粒子强度');
  await play(h5.page,'generic');
  check(!h5.errors.length,'H5 运行时无浏览器错误',h5.errors);
} catch (error) { check(false, '花园细节测试异常',String(error.stack||error)); }
finally { await browser.close(); await server.close(); }
await writeJson(path.join(out,'test-result.json'),{...report,...summary('花园细节、粒子与减少动态效果')});
