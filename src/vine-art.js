const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));

// Work in a spine-relative coordinate system so a ridge follows the turns
// and the changing diameter. Positive normals always face the garden light.
export function paintStem({point,dist,width,k,phase,nodes}) {
  const count=Math.ceil(dist/(2*k))+1;
  const spine=Array.from({length:count},(_,i)=>{
    const t=i/(count-1),s=t*dist,p=point(s);
    const a=point(Math.max(0,s-k)),b=point(Math.min(dist,s+k)),d=Math.hypot(b.x-a.x,b.y-a.y);
    let nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
    if(nx+ny>0){nx=-nx;ny=-ny;}
    let joint=0;
    for(const n of nodes){const u=Math.abs(s-n.s)/(11*k);if(u<1)joint=Math.max(joint,(1-u*u)**2);}
    const radius=width*.5*(.98-.20*t-.28*t**4+.09*joint+.028*Math.sin(s/(19*k)+phase));
    return {...p,nx,ny,radius,t,s};
  });
  const pad=width*.64+7*k,xs=spine.map(p=>p.x),ys=spine.map(p=>p.y);
  const minX=Math.floor((Math.min(...xs)-pad)*2)/2,minY=Math.floor((Math.min(...ys)-pad)*2)/2;
  const w=Math.ceil((Math.max(...xs)-minX+pad)*2)/2,h=Math.ceil((Math.max(...ys)-minY+pad+3*k)*2)/2;
  const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);
  const g=c.getContext('2d');g.scale(2,2);g.translate(-minX,-minY);
  const longitudinal=(a,b)=>{
    const root=spine[0],tip=spine.at(-1),gradient=g.createLinearGradient(root.x,root.y,tip.x,tip.y);
    gradient.addColorStop(0,a);gradient.addColorStop(1,b);return gradient;
  };
  const band=(lo,hi,color,first=0,last=count-1)=>{
    g.beginPath();
    for(let i=first;i<=last;i++){const p=spine[i],r=hi(p)*p.radius,x=p.x+p.nx*r,y=p.y+p.ny*r;i===first?g.moveTo(x,y):g.lineTo(x,y);}
    for(let i=last;i>=first;i--){const p=spine[i],r=lo(p)*p.radius;g.lineTo(p.x+p.nx*r,p.y+p.ny*r);}
    g.closePath();g.fillStyle=color;g.fill();
  };
  g.save();g.shadowColor='rgba(73,67,26,.28)';g.shadowBlur=4*k;g.shadowOffsetY=3.6*k;
  band(()=>-1,()=>1,longitudinal('#35723a','#77a744'));g.restore();
  band(()=>-.88,()=>.97,longitudinal('#559a48','#9fc851'));
  band(p=>-.14+.13*Math.sin(p.s/(27*k)+phase),()=>.91,longitudinal('#73b352','#b3d86a'));
  const ridge=p=>.46+.16*Math.sin(p.s/(33*k)+phase*.5)+.06*Math.sin(p.s/(12*k)+phase);
  band(p=>ridge(p)-.07,p=>ridge(p)+.12,longitudinal('rgba(198,225,141,.60)','rgba(228,242,151,.74)'));
  // Fine curved stipule scars interrupt the sheen at real leaf attachments.
  for(const node of nodes){
    const i=Math.round(node.s/dist*(count-1)),p=spine[i],a=spine[Math.max(0,i-3)],b=spine[Math.min(count-1,i+3)];
    g.lineCap='round';g.lineWidth=Math.max(.85*k,p.radius*.16);g.strokeStyle='rgba(49,101,44,.39)';
    g.beginPath();g.moveTo(a.x-p.nx*p.radius*.90,a.y-p.ny*p.radius*.90);
    g.quadraticCurveTo(p.x-p.nx*p.radius*.28,p.y-p.ny*p.radius*.28,b.x+p.nx*p.radius*.23,b.y+p.ny*p.radius*.23);g.stroke();
  }
  return {c,minX,minY,w,h};
}

// Bud scales have one warm lit lip over a cooler folded face. Their stems
// are bevelled once in the sprite rather than stacked glow outlines.
function bud(g,x,y,angle,size) {
  g.save();g.translate(x,y);g.rotate(angle);g.scale(size,size);
  const fill=g.createLinearGradient(-3,-12,3,-3);
  fill.addColorStop(0,'#d9e888');fill.addColorStop(.48,'#b6d870');fill.addColorStop(.52,'#8cbd59');fill.addColorStop(1,'#629d49');
  g.fillStyle=fill;
  g.beginPath();g.moveTo(0,1);g.bezierCurveTo(-5,-2,-5,-8,-2,-15);g.bezierCurveTo(4,-11,6,-3,0,1);g.fill();
  g.lineWidth=.85;g.strokeStyle='rgba(236,244,176,.8)';g.beginPath();g.moveTo(-.5,-1);g.quadraticCurveTo(.6,-7,-2,-13);g.stroke();
  g.restore();
}

function taperedStroke(g,points,root,tip) {
  const samples=[];
  let [ax,ay]=points[0];
  for(const [bx,by,cx,cy,ex,ey] of points.slice(1)){
    for(let i=samples.length?1:0;i<=14;i++){
      const t=i/14,u=1-t;
      samples.push({x:u**3*ax+3*u*u*t*bx+3*u*t*t*cx+t**3*ex,y:u**3*ay+3*u*u*t*by+3*u*t*t*cy+t**3*ey});
    }
    ax=ex;ay=ey;
  }
  function ribbon(lo,hi,color){
    const edge=(i,r)=>{
      const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],p=samples[i];
      const d=Math.hypot(b.x-a.x,b.y-a.y)||1,t=i/(samples.length-1),w=(root*(1-t)+tip*t)*.5*r;
      return [p.x-(b.y-a.y)*w/d,p.y+(b.x-a.x)*w/d];
    };
    g.fillStyle=color;g.beginPath();g.moveTo(...edge(0,hi));
    for(let i=1;i<samples.length;i++)g.lineTo(...edge(i,hi));
    for(let i=samples.length-1;i>=0;i--)g.lineTo(...edge(i,lo));
    g.closePath();g.fill();
  }
  ribbon(-1,1,'#65994a');ribbon(-.92,.34,'#b5d774');
}

export function installVineArt(sprite) {
  sprite('vine_sprig_polished',70,58,g=>{
    taperedStroke(g,[[9,48],[21,47,26,34,36,30],[46,26,55,30,57,20],[59,13,54,11,51,14],[49,17,52,20,54,17]],4.6,1.0);
    taperedStroke(g,[[26,38],[30,34,28,24,32,19]],2.6,1);
    bud(g,32,20,.56,.78);bud(g,37,30,1.09,.57);
  },9,48);
  sprite('vine_tip_polished',74,64,g=>{
    taperedStroke(g,[[9,44],[20,45,32,46,39,39],[47,32,44,22,52,20],[62,18,66,29,60,33],[55,37,49,33,52,29],[53,27,56,27,57,29]],7,.85);
    bud(g,35,42,.62,.68);
  },9,44);
  sprite('vine_tip_open',74,64,g=>{
    taperedStroke(g,[[9,44],[23,45,33,43,39,34],[46,25,44,20,51,16],[54,14,58,14,61,16]],7,1);
    taperedStroke(g,[[35,39],[40,36,45,37,48,33]],2.2,1);
    bud(g,49,32,.82,.62);bud(g,44,25,-.36,.65);
  },9,44);
}
