// The five petals share the light and color of the original modeled flower.
// Each opening petal has a pivot at the receptacle, directly below the disk.
const turn = Math.PI * 2;
const step = turn / 5;
const headSize = 126;
const centerX = 63;
const centerY = 64;
const diskRadius = 12.15;
const delays = [0.02, 0.16, 0.25, 0.19, 0.08];
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

function vein(g, x, y, side) {
  g.beginPath();
  g.moveTo(x, y);
  g.bezierCurveTo(x + side * 3, y - 4, x + side * 8, y - 7, x + side * 8, y - 14);
  g.stroke();
}

function flowerFace(g, image) {
  g.drawImage(image, 0, 0, headSize, headSize);
  g.save();
  g.translate(centerX, centerY);
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate(i * step);
    g.lineCap = 'round';
    g.lineWidth = 0.9;
    g.strokeStyle = 'rgba(119,58,87,.22)';
    vein(g, -1.6, -18, -1);
    vein(g, 1.8, -22, 1);
    g.translate(-0.65, -0.4);
    g.lineWidth = 0.8;
    g.strokeStyle = 'rgba(255,245,229,.36)';
    vein(g, -1.6, -18, -1);
    vein(g, 1.8, -22, 1);
    g.restore();
  }
  // Raised anthers follow the dome's upper-left light. Keep the center open
  // so it still reads as a single gold disk at phone size.
  for (let i = 0; i < 13; i++) {
    const angle = i * 2.39996;
    const radius = 2.1 + 6.9 * Math.sqrt(i / 12);
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * 0.86;
    g.beginPath();
    g.ellipse(x, y + 0.65, 1.45, 1.25, angle, 0, turn);
    g.fillStyle = 'rgba(154,93,33,.53)';
    g.fill();
    g.beginPath();
    g.ellipse(x - 0.24, y - 0.2, 1.15, 1.05, angle, 0, turn);
    g.fillStyle = i % 3 === 0 ? '#fff3aa' : '#ffe17c';
    g.fill();
  }
  g.restore();
}

export function installFlower(sprite, color, image) {
  const key = `flower_${color}`;
  sprite(key, headSize, headSize, g => flowerFace(g, image));
  // Each petal is stored upright. Scaling the Y axis foreshortens that petal
  // alone. The circular cut is covered by a separate textured flower disk.
  for (let i = 0; i < 5; i++) {
    sprite(`flower_petal_${color}_${i}`, 76, 66, g => {
      g.translate(38, 61);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 72, -Math.PI / 2 - step / 2 - 0.008, -Math.PI / 2 + step / 2 + 0.008);
      g.closePath();
      g.clip();
      g.rotate(-i * step);
      g.translate(-centerX, -centerY);
      flowerFace(g, image);
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      g.arc(centerX, centerY, diskRadius - 0.45, 0, turn);
      g.fill();
    }, 38, 61);
  }
  sprite(`flower_disk_${color}`, 30, 30, g => {
    g.translate(15, 15);
    g.beginPath();
    g.arc(0, 0, diskRadius + 0.7, 0, turn);
    g.clip();
    g.translate(-centerX, -centerY);
    flowerFace(g, image);
  });
}

export function composeFlower({ item, items, id, color, x, y, scale, rotation, progress }) {
  // At the end replace the moving parts with their original continuous face.
  // This retains the exact silhouette without seams or permanent extra tracks.
  const whole = smooth((progress - 0.82) / 0.18);
  if (whole > 0) {
    items.push(item(`${id}_bloom`, `flower_${color}`, x, y - scale, scale, scale, rotation, whole, 55));
  }
  if (progress >= 1) return;

  const visible = smooth(progress / 0.23);
  for (let i = 0; i < 5; i++) {
    const open = smooth((progress - delays[i]) / (0.78 - delays[i]));
    const outward = i <= 2 ? i * step : (i - 5) * step;
    const angle = rotation + outward * (0.32 + 0.68 * open);
    const settle = 1 + Math.sin(open * Math.PI) * 0.065;
    items.push(item(`${id}_petal_${i}`, `flower_petal_${color}_${i}`, x, y,
      scale * (0.47 + 0.53 * open), scale * (0.36 + 0.64 * open) * settle,
      angle, visible, 53 + i * 0.1));
  }
  const showDisk = smooth((progress - 0.18) / 0.48);
  if (showDisk > 0) {
    const diskScale = scale * (0.42 + 0.58 * showDisk);
    items.push(item(`${id}_disk`, `flower_disk_${color}`, x, y, diskScale, diskScale,
      rotation, showDisk, 54));
  }
}
