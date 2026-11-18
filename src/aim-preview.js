const TAU = Math.PI * 2;

export function paintAimPreview({ preview, origin, level, state, ui, settings, time, moving, layout, items, assets, sprite, item }) {
  const { k, cx, cy, cellW, cellH } = layout;
  const flowers = level.flowers || [];
  const water = ui.waterMode;
  const canPlant = !water && state.status === 'playing' && state.used < level.seeds && preview.ok;
  const waterFlower = water && state.status !== 'won' && ui.waterCount > 0
    && flowers.find(f => f.c === origin.c && f.r === origin.r && !state.bloomed.includes(f.id));
  const age = ui.pressed ? Math.max(0, time - ui.pressed.time) : time;

  if (canPlant) {
    for (const { c, r } of preview.cells) {
      items.push(item(`preview_cell_${c}_${r}`, 'preview_cell', cx(c), cy(r), cellW / 118, cellH / 97, 0, .64, 27));
      if (c === origin.c && r === origin.r) continue;
      const vertical = c === origin.c;
      items.push(item(`preview_line_${c}_${r}`, 'preview_line', cx(c), cy(r), k * .6, (vertical ? cellH : cellW) / 128, vertical ? 0 : Math.PI / 2, .58, 28));
    }
    if (moving && preview.segments.length) {
      const dart = sprite('preview_light_dart', 34, 12, g => {
        const light = g.createLinearGradient(0, 0, 34, 0);
        light.addColorStop(0, 'rgba(255,235,158,0)');
        light.addColorStop(.75, '#fff2ac');
        light.addColorStop(1, '#fffef1');
        g.fillStyle = light;
        g.beginPath();
        g.moveTo(0, 6);
        g.quadraticCurveTo(17, 5, 24, 2.5);
        g.quadraticCurveTo(30, 0, 34, 6);
        g.quadraticCurveTo(30, 12, 24, 9.5);
        g.quadraticCurveTo(17, 7, 0, 6);
        g.fill();
      }, 34, 6);
      const longest = Math.max(...preview.segments.map(s => s.distance));
      const distance = (age * 4.8) % (longest + .9);
      for (const segment of preview.segments) {
        if (distance >= segment.distance) continue;
        const dx = Math.sign(segment.c2 - origin.c), dy = Math.sign(segment.r2 - origin.r);
        const opacity = Math.min(1, distance / .24, (segment.distance - distance) / .22);
        items.push(item(`preview_flow_${dx}_${dy}`, dart, cx(origin.c) + dx * cellW * distance,
          cy(origin.r) + dy * cellH * distance, k, k, Math.atan2(dy, dx), opacity * .92, 29));
      }
    }
  }

  const mode = water ? 'water' : 'sun';
  const targets = waterFlower ? [waterFlower] : canPlant ? flowers.filter(f => preview.blooms.includes(f.id)) : [];
  for (const flower of targets) {
    const color = water ? '#b9f5ff' : '#fff0a3';
    const base = sprite(`preview_roots_${mode}`, 104, 40, g => {
      const ground = g.createRadialGradient(0, 0, 2, 0, 0, 47);
      ground.addColorStop(0, water ? 'rgba(109,222,255,.76)' : 'rgba(255,215,109,.72)');
      ground.addColorStop(1, water ? 'rgba(134,235,246,0)' : 'rgba(255,219,123,0)');
      g.save();
      g.translate(52, 18);
      g.scale(1, .32);
      g.fillStyle = ground;
      g.fillRect(-50, -50, 100, 100);
      g.restore();
      g.lineCap = 'round';
      g.lineWidth = 3.4;
      g.strokeStyle = color;
      g.beginPath();
      g.ellipse(52, 18, 39, 9.5, 0, -.12, Math.PI + .12);
      g.stroke();
    });
    const bud = assets[`bud_${flower.color}`] || assets.bud_pink;
    const rim = sprite(`preview_rim_${mode}_${flower.color}`, bud.w, bud.h, g => {
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8;
        g.drawImage(bud.c, Math.cos(angle) * 2.7, Math.sin(angle) * 2.7, bud.w, bud.h);
      }
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, bud.w, bud.h);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(bud.c, 0, 0, bud.w, bud.h);
    }, bud.ax, bud.ay);
    const sc = k * (+settings.flowerScale || 1);
    const sway = moving ? Math.sin(time * 1.5 + flower.c * .9 + flower.r * 1.7) * .011 : 0;
    items.push(item(`preview_target_${flower.id}`, base, cx(flower.c), cy(flower.r) + k, k, k, 0, 1, 40));
    items.push(item(`preview_rim_${flower.id}`, rim, cx(flower.c), cy(flower.r), sc, sc, sway, .92, 48));
  }
  const focus = waterFlower ? 'water' : canPlant ? 'valid' : 'invalid';
  const pulse = moving ? 1 + Math.sin(age * 7) * .035 : 1;
  items.push(item('preview_origin', `fx_focus_${focus}`, cx(origin.c), cy(origin.r), k * pulse, k * pulse, 0, .9, 66));
}
