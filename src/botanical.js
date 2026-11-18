// Continuous shaded stems, with independently growing leaves. All pieces are
// ordinary sprites, so recording and AE / 3D use the exact same artwork.
import {paintStem,installVineArt} from './vine-art.js';
import {composeGrowthParticles} from './garden-particles.js';

const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=t=>1-(1-clamp(t))**3;
const noise=n=>{const v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v);};

function leafNodes(seed,dist,k){
  const nodes=[];
  let side=noise(seed+1)<.5?-1:1;
  for(let s=(23+13*noise(seed+2))*k,i=0;s<dist-13*k;i++){
    const r=b=>noise(seed+i*17+b);
    nodes.push({s,side,paired:r(3)>.56,scale:.68+.27*r(4),tilt:.85+.52*r(5),twig:r(6)>.63,variant:r(9)>.54});
    s+=(36+24*r(7))*k;
    side=r(8)>.17?-side:side;
  }
  return nodes;
}

export function createVinePainter({sprite,item}) {
  const stemPaintings=new Map();
  function install() {
    installVineArt(sprite);
    sprite('vine_floret_polished',44,38,g=>{g.strokeStyle='#6cab41';g.lineWidth=2;g.beginPath();g.moveTo(22,37);g.lineTo(20,14);g.moveTo(23,31);g.lineTo(33,23);g.stroke();for(const [x,y,s]of[[19,11,1],[32,21,.68],[10,24,.60]]){for(let n=0;n<5;n++){const a=n*TAU/5;g.fillStyle=n%2?'#ef95bf':'#ffc3dd';g.beginPath();g.ellipse(x+Math.sin(a)*4.1*s,y+Math.cos(a)*4.1*s,3.4*s,3.8*s,-a,0,TAU);g.fill();}g.fillStyle='#ffe58b';g.beginPath();g.arc(x,y,2.2*s,0,TAU);g.fill();}},22,37);
    sprite('plant_shadow_polished',92,30,g=>{g.save();g.translate(46,15);g.scale(1,.28);const q=g.createRadialGradient(0,0,2,0,0,43);q.addColorStop(0,'rgba(63,66,22,.27)');q.addColorStop(.46,'rgba(71,66,25,.15)');q.addColorStop(1,'rgba(69,60,24,0)');g.fillStyle=q;g.fillRect(-46,-50,92,100);g.restore();});
  }
  function compose({v,index,layout,L,S,time,items,motion=true}) {
    const k=layout.k,dx=Math.sign(v.c2-v.c1),dy=Math.sign(v.r2-v.r1),angle=Math.atan2(dy,dx);
    const x0=layout.cx(v.c1),y0=layout.cy(v.r1)-12*k;
    const dist=Math.hypot((v.c2-v.c1)*layout.cellW,(v.r2-v.r1)*layout.cellH);
    if(!dist)return;
    const seed=index*43+v.c1*7+v.r1*19+3,phase=noise(seed)*TAU;
    const width=(+S.vineWidth||14)*1.40*k,age=time-(v.time||0),duration=v.duration||(+S.growMs||500)/1000;
    const length=dist*ease(age/duration);
    const curve=s=>{const taper=clamp(s/(35*k))*clamp((dist-s)/(28*k));return (Math.sin(s/(155*k)*TAU+phase)*4.4+Math.sin(s/(89*k)*TAU+phase*.54)*1.8)*k*taper;};
    const point=s=>({x:dx*s-dy*curve(s),y:dy*s+dx*curve(s)});
    const stemKey=`${dx}_${dy}_${dist.toFixed(2)}_${k.toFixed(3)}_${width.toFixed(2)}_${seed}`;
    let painting=stemPaintings.get(stemKey);
    if(!painting){
      // Shade one uninterrupted vine, then cut that same painting into the
      // independently recorded growth pieces. Internal ends have no caps.
      const nodes=leafNodes(seed,dist,k);
      painting={...paintStem({point,dist,width,k,phase,nodes}),nodes};stemPaintings.set(stemKey,painting);
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
    let lastTwig=-100*k,hasFloret=false;
    for(const [n,node] of painting.nodes.entries()){
      const {s,side}=node;if(length<=s)break;
      const p=point(s),x=x0+p.x,y=y0+p.y;
      const clearance=(L?.flowers||[]).some(f=>Math.abs(x-layout.cx(f.c))<35*k&&Math.abs(y-(layout.cy(f.r)-23*k))<44*k)?.72:1;
      // Use time since the front crossed the node so leaves near a stopped
      // tip can finish unfolding even when there is no travel left.
      const at=duration*(1-Math.cbrt(1-s/dist)),elapsed=age-at;
      for(let j=0;j<(node.paired?2:1);j++){
        const q=motion?clamp((elapsed-j*.045)/(.20+j*.035)):1;if(q<=0)continue;
        const sideJ=j?-side:side,rot=angle+Math.PI/2+sideJ*(node.tilt-(j?.28:0));
        const sc=k*node.scale*clearance*(j?.58:1)*(.87+.13*(1-s/dist))*(.16+.84*ease(q));
        const sway=motion?Math.sin(time*1.6+n*.83+phase)*.022+sideJ*(1-ease(q))*.36:0;
        items.push(item(`vine_leaf_${index}_${n}${j?'_pair':''}`,(j?!node.variant:node.variant)?'vine_leaf_b_polished':'vine_leaf_polished',x-dy*sideJ*width*.12,y+dx*sideJ*width*.12,sc*(motion?.68+.32*ease(q):1),sc,rot+sway,q,33));
      }
      if(!node.twig||s-lastTwig<110*k||clearance<1||s<40*k)continue;
      lastTwig=s;
      const q=motion?clamp(elapsed/.27):1,sc=k*.65*ease(q),rot=angle-side*.36;
      items.push(item(`vine_sprig_${index}_${n}`,'vine_sprig_polished',x,y,sc,sc*side,rot,q,32));
      if(!hasFloret&&dist>175*k&&index%2===0){
        hasFloret=true;const fsc=k*.53*ease(q);
        items.push(item(`vine_floret_${index}`,'vine_floret_polished',x-dy*side*6*k,y+dx*side*6*k,fsc,fsc,side*.23,q,35));
      }
    }
    if(length>4*k){
      const p=point(Math.max(0,length-3*k)),prev=point(Math.max(0,length-6*k)),next=point(length);
      const tangent=Math.atan2(next.y-prev.y,next.x-prev.x);
      const hand=seed%3?-1:1,sc=k*(.64+.12*(+S.vineWidth||14)/14)*clamp(length/(28*k));
      const twitch=motion?Math.sin(phase+age*17)*.09*Math.max(0,1-age/(duration+.14)):0;
      items.push(item(`vine_tip_${index}`,seed%3?'vine_tip_polished':'vine_tip_open',x0+p.x,y0+p.y,sc,sc*hand,tangent+twitch,1,34));
    }
    if(motion&&S.showParticles!==false&&length>0)composeGrowthParticles({items,item,S,index,point,length,dist,x0,y0,k,angle,time,age,duration});
  }
  return{install,compose};
}
