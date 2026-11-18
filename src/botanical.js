// Stem slices and their foliage remain ordinary sprites for recording and export.
import {paintStem,installVineArt} from './vine-art.js';
import {installVineTrim} from './vine-trim.js';
import {composeGrowthParticles} from './garden-particles.js';

const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=t=>1-(1-clamp(t))**3;
const noise=n=>{const v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v);};

function foliage(seed,dist,k,dy) {
  const leaves=[],tufts=[],flowers=[];
  for(let s=(dy?46:54)*k,n=0;s<dist-4*k;n++){
    const side=dy?(n%2?-1:1)*-dy:(n%3===1?-1:1);
    leaves.push({s,side,variant:noise(seed+n)>.5,size:.77+.13*noise(seed+17*n+4)});
    s+=(dy?45+8*noise(seed+n+2):106+12*noise(seed+n+2))*k;
  }
  // Vertical verges stand up against the soil on both sides of the stem.
  // The horizontal run has a shorter fringe that peeks out below the flowers.
  for(const side of [-1,1]){
    for(let s=(dy?(side===dy?19:12):21+7*side)*k,n=0;s<dist-2*k;n++){
      const t=seed+59*n+side*13;
      tufts.push({s,side,offset:dy?20+11*noise(t+4):11+5*noise(t+4),
        size:(dy?.91:.64)+noise(t+3)*.24,tilt:(noise(t+2)-.5)*.45,variant:noise(t)>.54});
      s+=(dy?15+12*noise(t+1):25+9*noise(t+1))*k;
    }
  }
  if(dy) for(let s=(dy<0?20:72)*k,n=0;s<dist-6*k;n++,s+=96*k)
    flowers.push({s,size:.92+noise(seed+n)*.13,tilt:(noise(seed+n+9)-.5)*.16});
  return {leaves,tufts,flowers};
}

export function createVinePainter({sprite,item}) {
  const stemPaintings=new Map();
  function install() {
    installVineArt(sprite);
    installVineTrim(sprite);
    sprite('plant_shadow_polished',92,30,g=>{g.save();g.translate(46,15);g.scale(1,.28);const q=g.createRadialGradient(0,0,2,0,0,43);q.addColorStop(0,'rgba(63,66,22,.27)');q.addColorStop(.46,'rgba(71,66,25,.15)');q.addColorStop(1,'rgba(69,60,24,0)');g.fillStyle=q;g.fillRect(-46,-50,92,100);g.restore();});
  }
  function compose({v,index,layout,L,S,time,items,motion=true}) {
    const k=layout.k,dx=Math.sign(v.c2-v.c1),dy=Math.sign(v.r2-v.r1),angle=Math.atan2(dy,dx);
    const x0=layout.cx(v.c1),y0=layout.cy(v.r1)-12*k;
    const dist=Math.hypot((v.c2-v.c1)*layout.cellW,(v.r2-v.r1)*layout.cellH);
    if(!dist)return;
    const seed=index*43+v.c1*7+v.r1*19+3,phase=noise(seed)*TAU;
    const width=(+S.vineWidth||14)*2.1*k,age=time-(v.time||0),duration=v.duration||(+S.growMs||500)/1000;
    const length=dist*ease(age/duration),bodyDist=Math.max(dist*.65,dist-.73*width);
    const curve=s=>{const envelope=clamp(s/(32*k))*clamp((dist-s)/(33*k));return (Math.sin(s/(170*k)*TAU+phase)*(dy?4.8:2.0)+Math.sin(s/(104*k)*TAU+phase*.54)*.85)*k*envelope;};
    const point=s=>({x:dx*s-dy*curve(s),y:dy*s+dx*curve(s)});
    const stemKey=`${dx}_${dy}_${dist.toFixed(2)}_${k.toFixed(3)}_${width.toFixed(2)}_${seed}`;
    let painting=stemPaintings.get(stemKey);
    if(!painting){
      const trim=foliage(seed,dist,k,dy);
      painting={...paintStem({point,dist:bodyDist,width,k,phase}),...trim};
      stemPaintings.set(stemKey,painting);
    }
    const tipScale=width/30*clamp(length/width),bodyLength=Math.max(0,length-.73*width*clamp(length/width));
    const count=Math.ceil(bodyDist/(48*k)),step=bodyDist/count;
    for(let n=0;n<count;n++){
      const start=n*step,end=(n+1)*step,part=clamp((bodyLength-start)/(end-start));if(part<=0)break;
      const origin=point(start),pad=width/2+7*k;
      const lo=dx?Math.min(dx*start,dx*end):Math.min(dy*start,dy*end),hi=dx?Math.max(dx*start,dx*end):Math.max(dy*start,dy*end);
      const lowOutside=(dx||dy)>0?n===0:n===count-1,highOutside=(dx||dy)>0?n===count-1:n===0;
      const begin=Math.floor((lo-(lowOutside?pad:.5))*2)/2,finish=Math.ceil((hi+(highOutside?pad:.5))*2)/2;
      const cropX=dx?Math.max(painting.minX,begin):painting.minX,cropY=dy?Math.max(painting.minY,begin):painting.minY;
      const w=dx?Math.min(painting.minX+painting.w,finish)-cropX:painting.w,h=dy?Math.min(painting.minY+painting.h,finish)-cropY:painting.h;
      const key=`vine_stem_polished_${stemKey}_${n}`;
      sprite(key,w,h,g=>g.drawImage(painting.c,(cropX-painting.minX)*2,(cropY-painting.minY)*2,w*2,h*2,0,0,w,h),origin.x-cropX,origin.y-cropY);
      items.push(item(`vine_${index}_${n}`,key,x0+origin.x,y0+origin.y,dx?part:1,dy?part:1,0,1,30));
    }
    const opened=(s,seconds)=>{
      if(length<s)return 0;
      const crossed=duration*(1-Math.cbrt(1-clamp(s/dist)));
      return motion?ease((age-crossed)/seconds):1;
    };
    const border=width/(29.4*k);
    for(const [n,t] of painting.tufts.entries()){
      const q=opened(t.s,.18);if(!q)continue;
      const p=point(t.s),sc=k*t.size*q;
      const x=x0+p.x+(dy?t.side*t.offset*k*Math.sqrt(border):0);
      const y=y0+p.y+(dy?(dy>0?17:12)*k:t.side*t.offset*k*Math.sqrt(border)+7*k);
      items.push(item(`vine_sprig_${index}_${n}`,t.variant?'vine_meadow_b':'vine_meadow_a',x,y,sc,sc,t.tilt,q,28));
    }
    for(const [n,l] of painting.leaves.entries()){
      const q=opened(l.s,.22);if(!q)continue;
      const p=point(l.s),x=x0+p.x,y=y0+p.y;
      const sc=k*l.size*(.18+.82*q);
      const rot=dy?Math.atan2(l.side*.86,-dy*.68):Math.atan2(dx*.68,-l.side*.82);
      const sway=motion?Math.sin(time*1.6+n*.83+phase)*.018+l.side*(1-q)*.23:0;
      items.push(item(`vine_leaf_${index}_${n}`,l.variant?'vine_blade_b':'vine_blade_a',
        x+(dy?l.side*width*.22:0),y+(dx?l.side*width*.21:0),sc,sc,rot+sway,q,33));
    }
    for(const [n,f] of painting.flowers.entries()){
      const q=opened(f.s,.25);if(!q)continue;
      const p=point(f.s),x=x0+p.x+27*k*Math.sqrt(border),y=y0+p.y;
      // These are small verge flowers, separate from numbered puzzle goals.
      if(L?.flowers.some(fl=>Math.hypot(x-layout.cx(fl.c),y-(layout.cy(fl.r)-39*k))<43*k))continue;
      const sc=k*f.size*q;
      items.push(item(`vine_floret_${index}_${n}`,'vine_meadow_flower',x,y+15*k,sc,sc,f.tilt,q,35));
    }
    if(length>0){
      const p=point(bodyLength),prev=point(Math.max(0,bodyLength-2*k)),next=point(Math.min(dist,bodyLength+2*k));
      const tangent=Math.atan2(next.y-prev.y,next.x-prev.x);
      const tip=dx===1?'right':dx===-1?'left':dy===1?'down':'up';
      const wobble=motion?Math.sin(phase+age*16)*.035*Math.max(0,1-age/duration):0;
      items.push(item(`vine_tip_${index}`,'vine_tip_'+tip,x0+p.x,y0+p.y,tipScale,tipScale,Math.atan2(Math.sin(tangent-angle),Math.cos(tangent-angle))+wobble,1,32));
    }
    if(motion&&S.showParticles!==false&&length>0)composeGrowthParticles({items,item,S,index,point,length,dist,x0,y0,k,angle,time,age,duration});
  }
  return{install,compose};
}
