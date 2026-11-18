import { interactionMotionEnabled } from './feedback.js';

const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => (t = clamp(t), t * t * (3 - 2 * t));

// The sweep is normalized to the garden dimensions, including custom masks.
export function entrancePose(age, c, r, layout, level, plant = false) {
  if (age >= .8) return null;
  const column = c / Math.max(1, level.cols - 1), row = r / Math.max(1, level.rows - 1);
  const t = clamp((age - .045 - .225 * column - .145 * row - (plant ? .11 : 0)) / (plant ? .27 : .23));
  if (t >= 1) return null;
  const arrive = 1 - (1 - t) ** 3, settle = Math.sin(t * Math.PI) * t * (1 - t);
  return {
    y: ((1 - arrive) * (plant ? 21 : -24) - settle * (plant ? 9 : 0)) * layout.k,
    sx: (plant ? .52 : .86) + (plant ? .48 : .14) * arrive + .16 * settle,
    sy: (plant ? .24 : .85) + (plant ? .76 : .15) * arrive + .27 * settle,
    op: smooth(t / .53)
  };
}

const hold = age => smooth(age / .105) + .14 * Math.sin(clamp(age / .23) * Math.PI);
export function brushBend(contact, time) {
  if (!contact) return 0;
  if (contact.left == null) return contact.dir * hold(time - contact.enter);
  const t = time - contact.left;
  if (t >= .64) return 0;
  // Preserve both the lean and a short impulse on taps that last less than a frame.
  const angle = t * 15.5;
  return contact.dir * Math.exp(-6.6 * t) * (1 - smooth((t - .45) / .19)) *
    (hold(contact.left - contact.enter) * Math.cos(angle) + .8 * Math.sin(angle));
}

export function flowerPose(fl, time, motion, contact) {
  if (!motion) return { stem: 0, leaves: 0, face: 0, breath: 0 };
  const phase = fl.c * 1.73 + fl.r * 2.31, beat = time * (1.66 + .14 * Math.sin(phase)) + phase;
  const breeze = .057 * Math.sin(beat) + .020 * Math.sin(beat * .47 + phase);
  const lift = Math.sin(beat * .72 + phase), bend = brushBend(contact, time);
  return { stem: breeze + .245 * bend, leaves: .62 * breeze + .099 * bend,
    face: 1.2 * breeze + .27 * bend, breath: .019 * lift - .045 * Math.abs(bend) };
}

export function pruneGardenBrushes(ui, time) {
  if (!ui.brushes) return;
  for (const [id, v] of Object.entries(ui.brushes)) {
    if (v.left != null && time - v.left >= .64) delete ui.brushes[id];
  }
}

function distance(p, a, b, rx, ry) {
  const x = (a.x - p.x) / rx, y = (a.y - p.y) / ry;
  const dx = (b.x - a.x) / rx, dy = (b.y - a.y) / ry;
  const f = clamp(-(x * dx + y * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(x + dx * f, y + dy * f);
}

// This observes pointer input without taking ownership of aiming or planting.
export function bindGardenLife(canvas, { env, position, clock }) {
  let previous = null, pointer = null;
  const ui = env().ui;
  function release(at = clock()) {
    for (const v of Object.values(ui.brushes || {})) if (v.left == null) v.left = at;
    previous = null;
  }
  function start() {
    ui.enteredAt = clock(); ui.brushes = Object.create(null); previous = null; pointer = null;
  }
  function move(p, auto = false) {
    const { L, S, layout, items, blocked, automatic } = env(), at = clock();
    if (!L || automatic && !auto || blocked || ui.helper || ui.endMode ||
        items.some(it => it.id === 'win_veil') || !interactionMotionEnabled(S)) {
      release(at); return;
    }
    const b = layout(), k = b.k, flowerScale = k * (+S.flowerScale || 1), brushes = ui.brushes;
    if (!brushes) return;
    const a = previous || p, dx = p.x - a.x;
    const retained = new Set();
    function visit(id, x, y, rx, ry) {
      const centre = { x, y }, under = distance(centre, p, p, rx, ry) <= 1;
      if (!under && (!previous || distance(centre, a, p, rx, ry) > 1)) return;
      if (under) retained.add(id);
      const old = brushes[id];
      if (!old || old.left != null && (under || at - old.left > .12)) {
        const dir = Math.abs(dx) > 2 * k ? Math.sign(dx) : p.x >= x ? 1 : -1;
        brushes[id] = { enter: at, dir, left: under ? null : at };
      }
    }
    for (const f of L.flowers) visit(f.id, b.cx(f.c), b.cy(f.r) - 42 * flowerScale, 44 * flowerScale, 57 * flowerScale);
    for (const it of items) if (it.id.startsWith('vine_leaf_') && it.op > .6) {
      visit(it.id, it.x + Math.sin(it.rot) * 21 * it.sy, it.y - Math.cos(it.rot) * 21 * it.sy, 23 * k, 23 * k);
    }
    for (const [id, v] of Object.entries(brushes)) {
      if (v.left == null && !retained.has(id)) v.left = at;
      else if (v.left != null && at - v.left >= .64) delete brushes[id];
    }
    previous = p;
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.isPrimary === false || pointer !== null) return;
    pointer = e.pointerId;
    ui.enteredAt = -Infinity;
    move(position(e));
  });
  canvas.addEventListener('pointermove', e => {
    if (e.isPrimary !== false && (pointer === null ? e.pointerType !== 'touch' : pointer === e.pointerId)) move(position(e));
  });
  function end(e) {
    if (e.pointerId !== pointer) return;
    pointer = null;
    release();
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, end);
  canvas.addEventListener('pointerleave', e => { if (pointer === null || e.pointerId === pointer) release(); });
  window.addEventListener('blur', () => { pointer = null; release(); });
  return { start, move, release };
}
