// Continuous shaded stems, with independently growing leaves. All pieces are
// ordinary sprites, so recording and AE / 3D use the exact same artwork.
const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=t=>1-(1-clamp(t))**3;
const noise=n=>{const v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v);};

export function createVinePainter({sprite,item}) {
  const stemPaintings=new Map();
  function install() {
    sprite('vine_sprig_polished',72,70,g=>{g.lineCap='round';g.lineJoin='round';const q=g.createLinearGradient(14,8,40,67);q.addColorStop(0,'#c0e98b');q.addColorStop(1,'#69ac42');g.strokeStyle=q;g.lineWidth=3;g.beginPath();g.moveTo(36,66);g.bezierCurveTo(37,48,54,40,60,15);g.moveTo(38,54);g.bezierCurveTo(27,47,22,31,20,21);g.moveTo(44,42);g.bezierCurveTo(45,28,38,16,38,8);g.stroke();},36,66);
    sprite('vine_floret_polished',44,38,g=>{g.strokeStyle='#6cab41';g.lineWidth=2;g.beginPath();g.moveTo(22,37);g.lineTo(20,14);g.moveTo(23,31);g.lineTo(33,23);g.stroke();for(const [x,y,s]of[[19,11,1],[32,21,.68],[10,24,.60]]){for(let n=0;n<5;n++){const a=n*TAU/5;g.fillStyle=n%2?'#ef95bf':'#ffc3dd';g.beginPath();g.ellipse(x+Math.sin(a)*4.1*s,y+Math.cos(a)*4.1*s,3.4*s,3.8*s,-a,0,TAU);g.fill();}g.fillStyle='#ffe58b';g.beginPath();g.arc(x,y,2.2*s,0,TAU);g.fill();}},22,37);
    sprite('plant_shadow_polished',92,30,g=>{g.save();g.translate(46,15);g.scale(1,.28);const q=g.createRadialGradient(0,0,2,0,0,43);q.addColorStop(0,'rgba(63,66,22,.27)');q.addColorStop(.46,'rgba(71,66,25,.15)');q.addColorStop(1,'rgba(69,60,24,0)');g.fillStyle=q;g.fillRect(-46,-50,92,100);g.restore();});
    sprite('vine_tip_polished',88,76,g=>{
      const trace=(offset=0)=>{g.beginPath();g.moveTo(12,48+offset);g.bezierCurveTo(30,48+offset,52,52+offset,60,37+offset);g.bezierCurveTo(72,17+offset,41,13+offset,44,31+offset);g.bezierCurveTo(46,42+offset,58,33+offset,53,29+offset);};
      g.lineCap='round';g.lineJoin='round';g.save();g.shadowColor='rgba(42,67,20,.15)';g.shadowBlur=3;g.shadowOffsetY=3;g.strokeStyle='#39882e';g.lineWidth=6;trace();g.stroke();g.restore();
      const c=g.createLinearGradient(0,20,0,54);c.addColorStop(0,'#badf74');c.addColorStop(.42,'#8dca55');c.addColorStop(1,'#4d9c37');g.strokeStyle=c;g.lineWidth=4;trace(-.7);g.stroke();
    },12,48);
  }
  function compose({v,index,layout,L,S,time,items,motion=true}) {
    const k=layout.k,dx=Math.sign(v.c2-v.c1),dy=Math.sign(v.r2-v.r1),angle=Math.atan2(dy,dx);
    const x0=layout.cx(v.c1),y0=layout.cy(v.r1)-12*k;
    const dist=Math.hypot((v.c2-v.c1)*layout.cellW,(v.r2-v.r1)*layout.cellH);
    if(!dist)return;
    const phase=(index*1.77+v.c1*.63+v.r1*.42)%TAU;
    const width=(+S.vineWidth||14)*1.42*k;
    const length=dist*ease((time-(v.time||0))/(v.duration||(+S.growMs||500)/1000));
    const curve=s=>{const taper=clamp(s/(35*k))*clamp((dist-s)/(35*k));return Math.sin(s/(142*k)*TAU+phase)*3.2*k*taper;};
    const point=s=>({x:dx*s-dy*curve(s),y:dy*s+dx*curve(s)});
    const stemKey=`${dx}_${dy}_${dist.toFixed(2)}_${k.toFixed(3)}_${width.toFixed(2)}_${phase.toFixed(3)}`;
    let painting=stemPaintings.get(stemKey);
    if(!painting){
      // Shade one uninterrupted vine, then cut that same painting into the
      // independently recorded growth pieces. Internal ends have no caps.
      const sampleCount=Math.ceil(dist/(2*k))+1,p=Array.from({length:sampleCount},(_,j)=>point(dist*j/(sampleCount-1)));
      const pad=width/2+7*k,minX=Math.floor((Math.min(...p.map(q=>q.x))-pad)*2)/2,minY=Math.floor((Math.min(...p.map(q=>q.y))-pad)*2)/2;
      const w=Math.ceil((Math.max(...p.map(q=>q.x))-minX+pad)*2)/2,h=Math.ceil((Math.max(...p.map(q=>q.y))-minY+pad+3*k)*2)/2;
      const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);const g=c.getContext('2d');g.scale(2,2);
      const path=(ox=0,oy=0)=>{g.beginPath();p.forEach((q,j)=>{const x=q.x-minX+ox,y=q.y-minY+oy;j?g.lineTo(x,y):g.moveTo(x,y);});};
      g.lineCap='round';g.lineJoin='round';
      g.save();g.shadowColor='rgba(56,67,22,.16)';g.shadowBlur=3*k;g.shadowOffsetY=3*k;g.strokeStyle='#478e33';g.lineWidth=width+1.1*k;path();g.stroke();g.restore();
      const relief=dx?g.createLinearGradient(0,-minY-width*.58,0,-minY+width*.5):g.createLinearGradient(-minX-width*.55,0,-minX+width*.55,0);
      for(const [at,color]of[[0,'#9ed56a'],[.22,'#8ccd58'],[.5,'#67b84a'],[.82,'#4b9c38'],[1,'#3c862e']])relief.addColorStop(at,color);
      g.strokeStyle=relief;g.lineWidth=width-.9*k;path();g.stroke();g.strokeStyle='rgba(226,249,173,.28)';g.lineWidth=width*.24;path(-width*.15,-width*.18);g.stroke();
      painting={c,minX,minY,w,h};stemPaintings.set(stemKey,painting);
    }
    const chunk=48*k,count=Math.ceil(dist/chunk),step=dist/count;
    for(let n=0;n<count;n++){
      const start=n*step,end=(n+1)*step,part=clamp((length-start)/(end-start));if(part<=0)break;
      const origin=point(start),pad=width/2+7*k;
      const lo=dx?Math.min(dx*start,dx*end):Math.min(dy*start,dy*end),hi=dx?Math.max(dx*start,dx*end):Math.max(dy*start,dy*end);
      // A shared half-pixel bleed avoids subpixel display hairlines without
      // introducing any new outline or lighting at the cut.
      const lowOutside=(dx||dy)>0?n===0:n===count-1,highOutside=(dx||dy)>0?n===count-1:n===0;
      const begin=Math.floor((lo-(lowOutside?pad:.5))*2)/2,finish=Math.ceil((hi+(highOutside?pad:.5))*2)/2;
      const cropX=dx?Math.max(painting.minX,begin):painting.minX,cropY=dy?Math.max(painting.minY,begin):painting.minY;
      const w=dx?Math.min(painting.minX+painting.w,finish)-cropX:painting.w,h=dy?Math.min(painting.minY+painting.h,finish)-cropY:painting.h;
      const key=`vine_stem_polished_${stemKey}_${n}`;
      sprite(key,w,h,g=>g.drawImage(painting.c,(cropX-painting.minX)*2,(cropY-painting.minY)*2,w*2,h*2,0,0,w,h),origin.x-cropX,origin.y-cropY);
      items.push(item(`vine_${index}_${n}`,key,x0+origin.x,y0+origin.y,dx?part:1,dy?part:1,0,1,30));
    }
    // The leaf silhouettes never stretch with the growing stem. They unfurl
    // uniformly after the growth front reaches their own, stable attachment.
    const spacing=47*k;
    for(let n=0,s=27*k+noise(index+3)*10*k;s<dist-12*k;n++,s+=spacing*(.87+noise(index*7+n+2)*.24)){
      const q=clamp((length-s)/(22*k));if(q<=0)break;
      const side=n%2===0?1:-1,p=point(s),variance=.70+noise(index*11+n*3)*.23;
      const sc=k*variance*(.24+.76*ease(q))*(motion?1+Math.sin(q*Math.PI)*.035:1);
      const rot=angle+Math.PI/2+side*(1.03+noise(index*2+n)*.18)+(motion?Math.sin(time*1.35+n+index)*.012+side*Math.sin(q*Math.PI)*.13:0);
      items.push(item(`vine_leaf_${index}_${n}`,(n+index)%3===0?'vine_leaf_b_polished':'vine_leaf_polished',x0+p.x-dy*side*width*.22,y0+p.y+dx*side*width*.22,sc,sc,rot,q,33));
    }
    // Sparse secondary growth breaks the evenly-spaced main-leaf rhythm.
    for(let n=0,s=(88+noise(index+20)*34)*k;s<dist-24*k;n++,s+=(148+noise(index+n+25)*35)*k){
      const p=point(s),x=x0+p.x,y=y0+p.y,q=clamp((length-s)/(25*k));if(q<=0)break;
      if((L?.flowers||[]).some(f=>Math.hypot(x-layout.cx(f.c),y-(layout.cy(f.r)-20*k))<58*k))continue;
      const side=n%2?-1:1,sc=k*.58*ease(q),rot=angle+Math.PI/2+side*.6;
      items.push(item(`vine_sprig_${index}_${n}`,'vine_sprig_polished',x,y,sc,sc,rot,q,31));
      if(n===0&&dist>175*k&&index%2===0)items.push(item(`vine_floret_${index}`,'vine_floret_polished',x-dy*side*8*k,y+dx*side*8*k,k*.70*ease(q),k*.70*ease(q),rot*.3,q,35));
    }
    if(length>15*k){const p=point(Math.max(0,length-3*k)),progress=length/dist;const sc=k*.60*clamp(length/(28*k))*(motion?.86+.14*ease(progress):1);items.push(item(`vine_tip_${index}`,'vine_tip_polished',x0+p.x,y0+p.y,sc,sc,angle+(motion?Math.sin(progress*Math.PI)*.18:0),1,34));if(motion&&S.showParticles!==false&&progress<.995)items.push(item(`vine_glow_${index}`,'fx_growth_glow',x0+p.x,y0+p.y,k*.65,k*.65,0,Math.sin(progress*Math.PI)*.65,32));}
  }
  return{install,compose};
}
