// All cells share the original baked light direction. Their surface marks
// are distributed independently so adjacent tiles don't repeat the same pores.
const SURFACES = [
  [[24,59,2.9], [29,62,1.3], [83,30,1.5]],
  [[82,48,2.5], [78,44,1.7], [35,26,1.3]],
  [[39,31,2.1], [44,29,1.2], [74,69,2.3]],
  [[80,27,2.5], [84,25,1.1], [27,67,1.8]],
  [[32,48,1.6], [88,63,2.4], [84,67,1.5]],
  [[52,69,2.4], [58,70,1.3], [28,28,1.7]],
];

export function soilVariant(c, r) {
  return (c * 7 + r * 11 + (c * r) % 5) % SURFACES.length;
}

export function installSoilSurfaces(sprite, key, base) {
  return SURFACES.map((marks, i) => sprite(`${key}_bed_${i}`, 118, 97, ctx => {
    ctx.drawImage(base, 0, 0, 118, 97);
    for (const [x, y, size] of marks) {
      // An upper shadow and a tiny lower lip read as shallow impressions
      // at phone scale and stay in the user's chosen soil colour.
      ctx.fillStyle = 'rgba(87,46,16,.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.32, size * .74, -.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,233,186,.32)';
      ctx.lineWidth = .9;
      ctx.beginPath();
      ctx.ellipse(x, y + .55, size * 1.32, size * .74, -.38, .16, 2.8);
      ctx.stroke();
    }
  }));
}
