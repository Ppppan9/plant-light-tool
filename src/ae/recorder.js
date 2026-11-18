// 植物光路 · After Effects 精灵时间轴记录器
// 网页每帧绘制的就是 scene 列表（素材 + 中心位置/缩放/旋转/不透明度/层级）。
// 这里逐帧采样；导出时每个元素（id + 素材）的每段连续出现 = 一个独立图层。
import { makeZip } from './zip.js';
import JSX_TEXT from './build_ae_project.jsx';
import README_TEXT from './README_AE.md';
import { renderSfxOffline, encodeWav, SFX_NAMES, SFX_DUR } from '../audio.js';
const r3 = v => Math.round(v * 1000) / 1000;
const LABEL = { bg: 15, board: 14, flower: 9, vine: 10, seed: 11, scene: 12, ui: 15, fx: 5, end: 5, hand: 12, audio: 16 };
const TOOL_ID = 'plant-light-tool';

const NAMES = {
  background: ['背景', 'Background'], grass: ['草地', 'Grass'], board: ['花园棋盘', 'Garden board'],
  tile: ['泥土格', 'Soil tile'], soil: ['泥土格', 'Soil tile'], garden: ['花园', 'Garden'], flower: ['花朵', 'Flower'], bud: ['花苞', 'Bud'],
  vine: ['藤蔓', 'Vine'], leaf: ['叶片', 'Leaf'], seed: ['种子', 'Seed'],
  beam: ['生长路径', 'Growth path'], path: ['生长路径', 'Growth path'],
  hud: ['界面', 'HUD'], button: ['按钮', 'Button'], text: ['文字', 'Text'],
  decor: ['场景点缀', 'Decoration'], butterfly: ['蝴蝶', 'Butterfly'], bee: ['蜜蜂', 'Bee'],
  hint: ['提示', 'Hint'], fx: ['粒子', 'FX'], popup: ['提示气泡', 'Popup'],
  end: ['结束页', 'End card'], hand: ['手指', 'Hand'], audio: ['音效', 'SFX'],
};
function splitId(id) {
  const m = /^([a-z]+)_?(.*)$/.exec(id) || [id, id, ''];
  return { k: m[1], rest: m[2] };
}
export function layerName(id, asset, zh) {
  if (id === 'background') return zh ? '背景' : 'Background';
  if (id === 'hand') return zh ? '手指' : 'Hand';
  if (id === 'disclaimer') return zh ? '免责声明' : 'Disclaimer';
  if (id === 'end_card') return zh ? '结束页' : 'End card';
  if (/^plant_shadow(?:_|$)/.test(String(asset))) {
    const owner = layerName(String(id).replace(/_shadow(?=_|$)/, ''), '', zh);
    return (zh ? '植物阴影_' : 'Plant shadow_') + owner;
  }
  if (/^vine_leaf_/.test(id)) return (zh ? '叶片_' : 'Leaf_') + id.slice('vine_leaf_'.length);
  if (/^flower_leaves(?:_|$)/.test(String(asset)) && /_leaves$/.test(id)) {
    return (zh ? '根部叶片_' : 'Root leaves_') + id.replace(/^flower_/, '').replace(/_leaves$/, '');
  }
  const { k, rest } = splitId(id);
  const base = (NAMES[k] || [k, k])[zh ? 0 : 1];
  return rest ? base + '_' + rest : base;
}
const labelOf = id =>
  /^(flower|bud)/.test(id) ? LABEL.flower :
  /^(vine|leaf|path|beam)/.test(id) ? LABEL.vine :
  /^seed/.test(id) ? LABEL.seed :
  /^(fx|butterfly|bee)/.test(id) ? LABEL.fx :
  id.startsWith('end') || id === 'end_card' ? LABEL.end :
  id === 'hand' ? LABEL.hand :
  id === 'background' ? LABEL.bg :
  /^(board|tile|soil|garden)/.test(id) ? LABEL.board : LABEL.ui;
function folderOf(asset) {
  if (/^fx_/.test(asset)) return 'fx';
  if (/^plant_(?:shadow|root)(?:_|$)/.test(String(asset)) || /^flower_leaves(?:_|$)/.test(String(asset))) return 'plants';
  if (/^(flower|bud)/.test(String(asset))) return 'flowers';
  if (/^(vine|leaf|seed|path|beam)/.test(String(asset))) return 'plants';
  if (/^(background|grass|board|tile|soil|frame|decor|butterfly|bee)/.test(String(asset))) return 'scene';
  return 'ui';
}

export function createAERecorder(api) {
  let R = null;
  function start(opt = {}) {
    const E = api.env();
    R = {
      t0: performance.now(), lastT: 0, frames: 0, frameTimes: [], tracks: new Map(), sfx: [], snaps: [],
      snapEvery: opt.snapEvery || window.__aeSnapEvery || 0, maxSnaps: opt.maxSnaps || 40,
      L: E.L, levels: new Set(), levelRefs: new Set(), S: { ...E.S }, A: { ...E.A },
    };
    api.sfx.hook = (name, o) => { if (R) R.sfx.push({ ...(o || {}), t: (performance.now() - R.t0) / 1000, name }); };
  }
  function stop() { const r = R; R = null; return r; }
  function sample(now) {
    if (!R) return;
    const E = api.env();
    if (E.L && !R.levelRefs.has(E.L)) { R.levelRefs.add(E.L); R.levels.add(E.L.id ?? E.L.n ?? E.L.level ?? R.levelRefs.size); }
    Object.assign(R.A, E.A);
    const t = Math.max(R.lastT + (R.frames > 0 ? 1e-4 : 0), (now - R.t0) / 1000), f = R.frames;
    R.frameTimes.push(t);
    for (const it of E.items) {
      if (!it.a) continue;
      const key = it.id + '|' + it.asset;
      let tr = R.tracks.get(key);
      if (!tr) { tr = { id: it.id, asset: it.asset, z: it.z, s: [], order: R.tracks.size }; R.tracks.set(key, tr); }
      tr.s.push([t, r3(it.x), r3(it.y), r3(it.sx), r3(it.sy), r3(it.rot), r3(it.op), f, r3(it.lift || 0), r3(it.z)]);
    }
    if (R.snapEvery && f % R.snapEvery === R.snapEvery - 1 && R.snaps.length < R.maxSnaps) R.snaps.push({ t, url: E.canvas.toDataURL('image/png') });
    R.lastT = t; R.frames++;
  }

  async function exportZip(rec = R, So = null) {
    if (!rec || rec.frames < 2) throw new Error('没有可导出的记录：请先自动通关或手动游玩');
    const E = api.env(), S = So ? { ...rec.S, ...So } : rec.S, AS = rec.A;
    const fps = +S.aeFps || 30, bake = S.aeSampling === 'bake', CW = 720, CH = 1600, zh = S.aeNames !== 'en';
    const D = Math.max(1 / fps, Math.ceil((rec.lastT + 1 / fps) * fps - 1e-6) / fps);
    const assets = [], assetFiles = [], pending = [], used = new Map();
    const folders = [
      { id: 'root', name: zh ? '植物光路_AE工程' : 'PlantLight_AE' },
      { id: 'img', name: zh ? '素材' : 'Assets', parent: 'root' },
      { id: 'scene', name: zh ? '场景' : 'Scene', parent: 'img' },
      { id: 'flowers', name: zh ? '花朵' : 'Flowers', parent: 'img' },
      { id: 'plants', name: zh ? '藤蔓与种子' : 'Vines and seeds', parent: 'img' },
      { id: 'fx', name: zh ? '花园特效' : 'Garden effects', parent: 'img' },
      { id: 'ui', name: zh ? '界面' : 'UI', parent: 'img' },
      { id: 'aud', name: zh ? '音频' : 'Audio', parent: 'root' },
      { id: 'pre', name: zh ? '预合成' : 'Precomps', parent: 'root' },
    ];
    const toPng = c => new Promise(res => c.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png'));
    function assetFor(key) {
      if (used.has(key)) return used.get(key);
      const a = AS[key];
      if (!a) throw new Error('缺少素材: ' + key);
      const c = a.c;
      const file = 'assets/' + key + '.png';
      const o = { id: key, file, folder: folderOf(key), w: c.width, h: c.height, name: key + '.png', kx: c.width / a.w, ky: c.height / a.h, ax: a.ax, ay: a.ay };
      assets.push(o); pending.push(toPng(c).then(data => assetFiles.push({ name: file, data }))); used.set(key, o); return o;
    }
    const rnd = v => Array.isArray(v) ? v.map(x => Math.round(x * 100) / 100) : Math.round(v * 100) / 100;
    const r4 = x => Math.round(x * 10000) / 10000;
    function resample(s) {
      const f0 = Math.round(s[0][0] * fps), f1 = Math.max(f0, Math.round(s[s.length - 1][0] * fps)), out = []; let j = 0;
      for (let f = f0; f <= f1; f++) {
        const tau = f / fps;
        while (j < s.length - 2 && s[j + 1][0] <= tau + 1e-9) j++;
        const a = s[j], b = s[j + 1] || a, u = b[0] > a[0] ? Math.min(1, Math.max(0, (tau - a[0]) / (b[0] - a[0]))) : 0;
        out.push({ t: tau, v: a.map((x, i) => i === 0 ? tau : x + (b[i] - x) * u) });
      }
      return { f0, f1, list: out };
    }
    function prop(fr, get, tol) {
      const t = fr.list.map(o => o.t), vv = fr.list.map(o => get(o.v));
      const same = (a, b, e) => Array.isArray(a) ? a.every((x, i) => Math.abs(x - b[i]) <= e) : Math.abs(a - b) <= e;
      if (vv.every(x => same(x, vv[0], 1e-6))) return rnd(vv[0]);
      let keep;
      if (bake) keep = vv.map((_, i) => i);
      else {
        keep = [0]; let a = 0;
        for (let b = 2; b < vv.length; b++) {
          let ok = true;
          for (let m = a + 1; m < b && ok; m++) {
            const u = (t[m] - t[a]) / (t[b] - t[a]);
            const lin = Array.isArray(vv[a]) ? vv[a].map((x, i) => x + (vv[b][i] - x) * u) : vv[a] + (vv[b] - vv[a]) * u;
            ok = same(lin, vv[m], tol);
          }
          if (!ok) { keep.push(b - 1); a = b - 1; }
        }
        if (vv.length > 1) keep.push(vv.length - 1);
      }
      return { t: keep.map(i => r4(t[i])), v: keep.map(i => rnd(vv[i])) };
    }
    const keyCount = p => (p && typeof p === 'object' && !Array.isArray(p) && p.t) ? p.t.length : 0;
    const segs = [], layers = [], markers = [], comps = [];
    for (const tr of rec.tracks.values()) {
      let a = 0;
      for (let i = 1; i <= tr.s.length; i++) {
        if (i === tr.s.length || tr.s[i][7] !== tr.s[i - 1][7] + 1) {
          segs.push({ tr, s: tr.s.slice(a, i) }); a = i;
        }
      }
    }
    const nSeg = new Map();
    segs.forEach(g => nSeg.set(g.tr.id + '|' + g.tr.asset, (nSeg.get(g.tr.id + '|' + g.tr.asset) || 0) + 1));
    segs.sort((p, q) => p.tr.z - q.tr.z || p.tr.order - q.tr.order || p.s[0][0] - q.s[0][0]);
    const segK = new Map();
    for (const g of segs) {
      const a = assetFor(g.tr.asset), fr = resample(g.s);
      // Visibility changes on the observed display frame, independent of the
      // export frame rate used for interpolated transforms.
      const first = g.s[0], last = g.s[g.s.length - 1];
      const tin = first[7] === 0 ? 0 : first[0];
      const tout = rec.frameTimes[last[7] + 1] ?? D;
      const k = g.tr.id + '|' + g.tr.asset, n = (segK.get(k) || 0) + 1; segK.set(k, n);
      const nm = layerName(g.tr.id, g.tr.asset, zh) + (nSeg.get(k) > 1 ? ` #${n}` : '');
      layers.push({
        name: nm, src: { asset: a.id }, in: tin, out: tout, label: labelOf(g.tr.id), z: g.tr.z,
        tr: {
          anchor: [rnd(a.ax * a.kx), rnd(a.ay * a.ky)],
          position: prop(fr, e => [e[1], e[2]], 0.25),
          scale: prop(fr, e => [e[3] * 100 / a.kx, e[4] * 100 / a.ky], 0.25),
          rotation: prop(fr, e => e[5] * 180 / Math.PI, 0.2),
          opacity: prop(fr, e => Math.max(0, Math.min(100, e[6] * 100)), 0.5),
        },
      });
    }
    // 音频
    const audioFiles = [], ZH = n => (SFX_NAMES[n] || [0, n])[1];
    if (S.aeAudio !== 'none' && rec.sfx.length) {
      try {
        if (S.aeAudio === 'both' || S.aeAudio === 'mixed') {
          const buf = await renderSfxOffline(rec.sfx, D, S);
          if (buf) {
            audioFiles.push({ name: 'audio/mix.wav', data: encodeWav(buf) });
            assets.push({ id: 'mix', file: 'audio/mix.wav', folder: 'aud', name: 'mix.wav' });
            layers.push({ name: zh ? '混合音轨' : 'Mixed audio', src: { asset: 'mix' }, label: LABEL.audio, audioEnabled: S.aeAudio !== 'both' });
          }
        }
        if (S.aeAudio === 'both' || S.aeAudio === 'events') {
          const kinds = new Map();
          rec.sfx.forEach(e => { const k = e.name; if (!kinds.has(k)) kinds.set(k, e); e.k = k; });
          for (const [k, e] of kinds) {
            const buf = await renderSfxOffline([{ t: 0, name: e.name, dur: e.dur }], (SFX_DUR[e.name] || 0.4) + 0.2, S);
            if (!buf) continue;
            audioFiles.push({ name: `audio/sfx_${k}.wav`, data: encodeWav(buf) });
            assets.push({ id: 'sfx_' + k, file: `audio/sfx_${k}.wav`, folder: 'aud', name: `sfx_${k}.wav` });
          }
          const al = rec.sfx.map((e, i) => {
            const st = r4(e.t);
            return { name: zh ? `音效 ${i + 1} ${ZH(e.name)}` : `SFX ${i + 1} ${e.name}`, src: { asset: 'sfx_' + e.k }, start: st, in: st, label: LABEL.audio };
          });
          comps.push({ id: 'sfx', name: zh ? '音效_逐事件' : 'SFX events', w: CW, h: CH, duration: D, fps, folder: 'pre', layers: al });
          layers.push({ name: zh ? '音效_逐事件' : 'SFX events', src: { comp: 'sfx' }, label: LABEL.audio });
        }
      } catch (e) { console.warn('audio export', e); }
    }
    for (const e of rec.sfx) markers.push([r4(e.t), ZH(e.name)]);
    const d = new Date(), p2 = x => String(x).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
    comps.push({ id: 'main', name: zh ? '主合成_植物光路' : 'Main_PlantLight', w: CW, h: CH, duration: D, fps, folder: 'root', bg: [0, 0, 0], layers, markers });
    const [CW2, CH2] = S.aeSize && S.aeSize !== 'canvas' ? S.aeSize.split('x').map(Number) : [E.canvas.width, E.canvas.height];
    const K = Math.round(CW2 / CW * 1e6) / 1e6;
    if (K !== 1) {
      const mul = (P, f) => P == null ? P : Array.isArray(P) ? P.map(x => x * f) : P.t ? { ...P, v: P.v.map(x => Array.isArray(x) ? x.map(y => y * f) : x * f) } : P;
      for (const c of comps) {
        c.w = CW2; c.h = CH2;
        for (const l of c.layers) if (l.tr) { l.tr.position = mul(l.tr.position, K); l.tr.scale = mul(l.tr.scale, K); }
      }
    }
    if (!zh) {
      const T = [['主合成_植物光路','Main_PlantLight'],['植物光路_AE工程','PlantLight_AE'],['音效_逐事件','SFX events'],['混合音轨','Mixed audio'],['预合成','Precomps'],['音效','SFX'],['素材','Assets'],['界面','UI'],['音频','Audio'],['场景','Scene'],['花朵','Flowers'],['藤蔓与种子','Vines and seeds'],['手指','Hand'],['结束页','End card'],['免责声明','Disclaimer'],['背景','Background'],['播种','seed'],['生长','grow'],['开花','bloom'],['撤销','undo'],['通关','win'],['失败','fail']];
      const tr = x => { if (typeof x !== 'string') return x; for (const [a, b] of T) x = x.split(a).join(b); return x; };
      for (const c of comps) { c.name = tr(c.name); if (c.markers) c.markers = c.markers.map(([t, m]) => [t, tr(m)]); for (const l of c.layers) l.name = tr(l.name); }
      for (const f of folders) f.name = tr(f.name);
    }
    const stats = { comps: comps.length, layers: 0, keys: 0, perComp: {}, flowers: rec.L?.flowers?.length ?? rec.L?.buds?.length ?? 0, levels: rec.levels?.size || 1, sfx: rec.sfx.length };
    for (const c of comps) {
      stats.perComp[c.id] = c.layers.length; stats.layers += c.layers.length;
      for (const l of c.layers) if (l.tr) for (const k of ['position', 'scale', 'rotation', 'opacity']) { const kc = keyCount(l.tr[k]); if (kc > 1) stats.keys += kc; }
    }
    const timeline = {
      meta: {
        tool: TOOL_ID, format: 1, created: d.toISOString(), fps, width: CW2, height: CH2, duration: D,
        canvas: [E.canvas.width, E.canvas.height], sampling: bake ? 'bake' : 'reduce', scale: K,
        names: zh ? 'zh' : 'en', saveAep: S.aeSaveAep !== false, aepName: `plantlight_${stamp}.aep`, newProject: true, stats,
        board: { cols: rec.L?.cols, rows: rec.L?.rows, flowers: rec.L?.flowers?.length ?? rec.L?.buds?.length ?? 0 },
        note: '图层从下到上排列；时间单位秒；位置/锚点单位像素（合成坐标）；缩放为百分比',
      },
      folders, assets: assets.map(({ id, file, folder, w, h, name }) => ({ id, file, folder, w, h, name })), comps, mainComp: 'main',
    };
    await Promise.all(pending);
    const enc = new TextEncoder();
    const files = [
      { name: 'build_ae_project.jsx', data: enc.encode(JSX_TEXT) },
      { name: 'timeline.json', data: enc.encode(JSON.stringify(timeline)) },
      { name: 'README_AE.md', data: enc.encode(README_TEXT) },
      ...assetFiles.sort((a, b) => a.name < b.name ? -1 : 1),
      ...audioFiles,
    ];
    return {
      blob: makeZip(files), name: `plantlight_ae_export_${stamp}.zip`, timeline, stats,
      files: files.length, fileList: files, snaps: rec.snaps.map(s => s.t),
      segs: segs.map(g => ({ id: g.tr.id, asset: g.tr.asset, z: g.tr.z, s: g.s, m: g.tr.m || null })),
    };
  }
  return { start, stop, sample, exportZip, get rec() { return R; }, set rec(v) { R = v; } };
}
