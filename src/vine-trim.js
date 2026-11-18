const TAU = Math.PI * 2;

function paintStops(gradient, stops) {
  for (const [at, colour] of stops) gradient.addColorStop(at, colour);
  return gradient;
}

function grassBlade(g, bx, by, tx, ty, width, lighter) {
  const dx=tx-bx, dy=ty-by, len=Math.hypot(dx,dy), w=width*1.65;
  const curl=(dx>0?-1:1)*w*.63;
  g.save(); g.translate(bx,by); g.rotate(Math.atan2(dy,dx)+Math.PI/2);
  g.beginPath(); g.moveTo(-.65,-.15);
  g.bezierCurveTo(curl-w,-len*.22,curl-w*.72,-len*.66,0,-len);
  g.bezierCurveTo(curl+w*.04,-len*.64,curl+w*1.17,-len*.32,1.1,-.5);
  g.quadraticCurveTo(.2,.6,-.65,-.15); g.closePath(); g.clip();
  const surface=g.createLinearGradient(curl-w,0,curl+w,0);
  paintStops(surface,[[0,'#79ac54'],[.30,lighter?'#b8d77d':'#a2cb70'],[.55,'#87ba60'],[1,'#508f48']]);
  g.fillStyle=surface; g.fillRect(-12,-len-1,24,len+3);
  const shadow=g.createLinearGradient(0,0,0,-len);
  paintStops(shadow,[[0,'rgba(55,126,55,.86)'],[.49,'rgba(64,142,56,.16)'],
    [.78,'rgba(156,207,113,0)'],[1,'rgba(212,233,159,.70)']]);
  g.fillStyle=shadow; g.fillRect(-12,-len-1,24,len+3); g.restore();
}

function broadLeaf(g, b) {
  const {width,height}=g.canvas, raster=g.createImageData(width,height);
  const sx=width/36, sy=height/46, tip=b?14:22;
  function profile(x,y) {
    const t=Math.max(.0001,Math.min(.9999,(y-2)/42));
    const fullness=Math.sin(t*Math.PI), center=tip+(18-tip)*t+(b?1.65:-1.85)*fullness;
    const half=(b?14.35:14.15)*fullness**.90*(.77+.39*t);
    const q=(x-center)/Math.max(.012,half), rim=Math.max(0,1-q*q);
    const rib=-.12+fullness*.24, crest=Math.exp(-(((q-rib)/.32)**2));
    const z=(7.6*rim**.75+1.20*crest)*fullness**.79;
    return {q,z,crest,edge:Math.min(half-Math.abs(x-center),y-2,44-y),fullness};
  }
  // A rounded lamina and a low central rib share one continuous light field.
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const x=(i+.5)/sx,y=(j+.5)/sy,p=profile(x,y);
    if(p.edge<-.5/sx)continue;
    const dx=(profile(x+.22,y).z-profile(x-.22,y).z)/.44;
    const dy=(profile(x,y+.22).z-profile(x,y-.22).z)/.44;
    const light=Math.max(0,(.61*dx+.43*dy+.68)/Math.hypot(dx,dy,1));
    const roll=Math.max(0,1-Math.abs(p.q)**4);
    const tone=Math.max(0,Math.min(1,.04+.78*light+.11*roll+.05*p.crest*p.fullness));
    const k=(j*width+i)*4;
    raster.data[k]=66+tone*107; raster.data[k+1]=126+tone*82; raster.data[k+2]=48+tone*64;
    raster.data[k+3]=255*Math.min(1,Math.max(0,.5+p.edge*sx));
  }
  g.putImageData(raster,0,0);
}

function flower(g) {
  g.lineCap = 'round';
  g.strokeStyle = '#6c9d48'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(16.0, 31); g.quadraticCurveTo(17.7, 24.4, 15.8, 16); g.stroke();
  const cx = 16, cy = 14, order = [0, 4, 1, 3, 2];
  for (const n of order) {
    const angle = n * TAU / 5 - .21;
    const x = cx + Math.sin(angle) * 8.35, y = cy - Math.cos(angle) * 7.4;
    const pigment = g.createRadialGradient(x - 2.3, y - 2.8, .25, x, y + .3, 6.7);
    paintStops(pigment, [[0, '#ffc4cd'], [.39, '#fca6bd'], [.72, '#f38ca8'], [1, '#d46f92']]);
    g.fillStyle = pigment; g.beginPath(); g.ellipse(x, y, n === 2 ? 5.35 : 5.65, 6, angle, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(158,91,69,.25)'; g.beginPath(); g.ellipse(cx + .3, cy + 1, 4.75, 4.1, 0, 0, TAU); g.fill();
  const disk = g.createRadialGradient(cx - 1.6, cy - 1.7, .2, cx, cy, 4.75);
  paintStops(disk, [[0, '#fff399'], [.47, '#ffe574'], [.84, '#f7c04c'], [1, '#dc9b3d']]);
  g.fillStyle = disk; g.beginPath(); g.ellipse(cx, cy, 4.5, 4.1, 0, 0, TAU); g.fill();
}

export function installVineTrim(sprite) {
  sprite('vine_meadow_a', 22, 33, g => {
    grassBlade(g, 11.5, 31, 13.4, 1.9, 2.7, false);
    grassBlade(g, 11.7, 30.7, 2.1, 11.0, 2.5, true);
    grassBlade(g, 11.1, 30.9, 20.2, 10.1, 2.5, true);
  }, 11.3, 30.8);
  sprite('vine_meadow_b', 22, 30, g => {
    grassBlade(g, 10.5, 28, 6.5, 2, 2.4, false);
    grassBlade(g, 10.8, 27.8, 2.2, 13, 2.3, false);
    grassBlade(g, 10.7, 28.0, 20, 6, 2.8, true);
  }, 10.7, 27.8);
  sprite('vine_blade_a', 36, 46, g => broadLeaf(g, false), 18, 44);
  sprite('vine_blade_b', 36, 46, g => broadLeaf(g, true), 18, 44);
  sprite('vine_meadow_flower', 32, 33, flower, 16, 31);
  sprite('vine_gold_joint', 50, 50, g => {
    const light = g.createRadialGradient(17.5, 15.4, 1, 25.5, 26.6, 23);
    paintStops(light, [[0, '#ffe59a'], [.26, '#f9d57b'], [.55, '#efbd62'],
      [.78, '#dfa750'], [.95, '#cb9349'], [1, '#bc8848']]);
    g.fillStyle = light; g.beginPath(); g.ellipse(25, 25, 22.0, 22.1, -.08, 0, TAU); g.fill();
  }, 25, 25);
}
