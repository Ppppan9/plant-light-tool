// Export the current build, then capture real touch input in its mobile H5.
// Run after npm run build. Animated WebP encoding requires Python and Pillow.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT, applySettings, ensureArt, launch, newPage, nextDownload,
  saveDataUrl, serve, unzip, waitGame
} from '../test/helpers.mjs';

const scratch = await ensureArt('garden-motion-demo');
const output = path.resolve(process.argv[2] || path.join(ROOT, 'screenshots/garden-motion.webp'));
const server = await serve();
const browser = await launch();
try {
  const tool = await newPage(browser);
  await tool.page.goto(server.origin);
  await waitGame(tool.page);
  await applySettings(tool.page, {
    level: '2', h5Format: 'generic', h5AutoPlay: false, h5Device: 'adaptive',
    h5StoreUrl: 'https://example.com/garden', sfxMute: true, recRes: '720x1600',
    growMs: 1100, bloomMs: 750, winDelay: 3500, bgMotion: false, showTutorial: false
  });
  const zip = await nextDownload(tool.page, () => tool.page.evaluate(() => __app.action('_exportH5')), scratch);
  const unpacked = path.join(scratch, 'h5');
  await unzip(zip, unpacked);
  await tool.context.close();

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true
  });
  const page = await phone.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  const relative = path.relative(ROOT, path.join(unpacked, 'generic', 'index.html')).split(path.sep).join('/');
  await page.goto(new URL(relative, server.origin).href);
  await waitGame(page);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 100)));

  const stage = page.locator('#stage');
  const box = await stage.boundingBox();
  const cta = await page.locator('#h5-cta button').boundingBox();
  assert(box.x >= -1 && box.y >= -1 && box.width + box.x <= 391 && box.height + box.y <= 845);
  assert(cta && cta.y >= box.y + box.height - 1, 'CTA overlaps the playable canvas');
  const cells = await page.evaluate(() => {
    const layout = __app.boardLayout();
    const goal = __app.core.solve(__app.L, __app.ST)[0];
    return [ { c: 3, r: 2 }, { c: goal.c, r: 2 }, goal ].map(({ c, r }) => ({
      x: layout.cx(c), y: layout.cy(r)
    }));
  });
  const touch = await phone.newCDPSession(page);
  async function input(type, cell) {
    const point = cell && {
      x: box.x + cell.x / 720 * box.width, y: box.y + cell.y / 1600 * box.height
    };
    await touch.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [point] : [] });
  }

  // Advancing the browser's frame clock between samples keeps the capture
  // cadence independent of how long image encoding or disk writes take.
  const frames = await fs.mkdtemp(path.join(scratch, 'frames-'));
  try {
    for (let frame = 0; frame < 78; frame++) {
      if (frame === 5) await input('touchStart', cells[0]);
      if (frame === 11) await input('touchMove', cells[1]);
      if (frame === 18) await input('touchMove', cells[2]);
      if (frame === 32) await input('touchEnd');
      await page.clock.runFor(50);
      if (frame === 27) {
        assert(await page.evaluate(() => __app.UI.preview?.c === 1 && __app.UI.preview?.r === 3));
        await page.screenshot({ path: path.join(scratch, 'mobile-aim.png') });
      }
      if (frame === 43) await page.screenshot({ path: path.join(scratch, 'mobile-flowering.png') });
      // Only trim surrounding grass for the preview. The separately captured
      // mobile screenshots retain the actual viewport, counters and CTA.
      const image = await stage.evaluate(canvas => {
        const board = __app.boardLayout().frame;
        const crop = 716;
        const image = document.createElement('canvas');
        image.width = image.height = 504;
        const context = image.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(canvas, (720 - crop) / 2, board.y + (board.h - crop) / 2,
          crop, crop, 0, 0, 504, 504);
        return image.toDataURL('image/png');
      });
      await saveDataUrl(image, path.join(frames, `${String(frame).padStart(3, '0')}.png`));
    }
    const game = await page.evaluate(() => ({
      moves: __app.ST.moves.length, blooms: __app.ST.bloomed.length, status: __app.ST.status
    }));
    assert.deepEqual(game, { moves: 1, blooms: 4, status: 'won' });
    assert.deepEqual(errors, []);
    await fs.mkdir(path.dirname(output), { recursive: true });
    execFileSync(process.env.PYTHON || 'python3', ['-c', `
from pathlib import Path
from PIL import Image
import sys
frames = [Image.open(p).convert('RGB') for p in sorted(Path(sys.argv[1]).glob('*.png'))]
frames[0].save(sys.argv[2], 'WEBP', save_all=True, append_images=frames[1:],
               duration=50, loop=0, quality=85, method=5)
`, frames, output]);
    console.log(JSON.stringify({ output, bytes: (await fs.stat(output)).size, seconds: 3.9, game }));
  } finally {
    await fs.rm(frames, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  await server.close();
}
