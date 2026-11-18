const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));

// A sampled cross-section, from the shaded rim to the upper-left rim. The
// broad highlight and reflected green remain continuous around every bend.
const profileStops=[
  [0,58,141,57],[.10,74,163,66],[.26,94,184,78],[.42,101,190,83],
  [.56,121,204,100],[.72,136,213,112],[.83,132,211,108],[.94,111,196,96],[1,90,173,81]
];
const greenProfile=Array.from({length:256},(_,i)=>{
  const t=i/255;
  const j=profileStops.findIndex((stop,n)=>n>0&&t<=stop[0]);
  const a=profileStops[j-1],b=profileStops[j],u=clamp((t-a[0])/(b[0]-a[0])),mix=u*u*(3-2*u);
  return [1,2,3].map(ch=>Math.round(a[ch]+(b[ch]-a[ch])*mix));
});
const green=signed=>greenProfile[Math.round(clamp(.5+.5*signed)*255)];
function surface(w,h){
  const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.ceil(h*2);return c;
}

export function paintStem({point,dist,width,k,phase}) {
  const root=point(0),tip=point(dist),horiz=Math.abs(tip.x-root.x)>Math.abs(tip.y-root.y);
  const sign=Math.sign(horiz?tip.x-root.x:tip.y-root.y);
  const count=Math.ceil(dist*2)+1;
  const stations=Array.from({length:count},(_,i)=>{
    const t=i/(count-1),s=t*dist,p=point(s),a=point(Math.max(0,s-k)),b=point(Math.min(dist,s+k));
    const axis=horiz?b.x-a.x:b.y-a.y,cross=horiz?b.y-a.y:b.x-a.x,slope=cross/axis;
    return {p,center:horiz?p.y:p.x,normal:1/Math.hypot(1,slope),radius:width*(.505-.027*t+.009*Math.sin(s/(25*k)+phase))};
  });
  const pad=width*.56+6*k,xs=stations.map(q=>q.p.x),ys=stations.map(q=>q.p.y);
  const minX=Math.floor((Math.min(...xs)-pad)*2)/2,minY=Math.floor((Math.min(...ys)-pad)*2)/2;
  const w=Math.ceil((Math.max(...xs)-minX+pad)*2)/2,h=Math.ceil((Math.max(...ys)-minY+pad+2*k)*2)/2;
  const layer=surface(w,h),g=layer.getContext('2d'),pixels=g.createImageData(layer.width,layer.height);
  const along=horiz?layer.width:layer.height,across=horiz?layer.height:layer.width;
  const base=horiz?minX-root.x:minY-root.y,crossBase=horiz?minY:minX;
  for(let i=0;i<along;i++){
    const s=sign*(base+(i+.5)*.5);if(s<0||s>dist)continue;
    const q=stations[Math.round(s/dist*(count-1))],reach=(q.radius+1)/q.normal;
    const lo=Math.max(0,Math.floor(2*(q.center-reach-crossBase))),hi=Math.min(across-1,Math.ceil(2*(q.center+reach-crossBase)));
    for(let j=lo;j<=hi;j++){
      const off=(q.center-crossBase-(j+.5)*.5)*q.normal;
      const a=clamp(.5+(q.radius-Math.abs(off))*1.45);if(!a)continue;
      const color=green(off/q.radius),at=4*(horiz?j*layer.width+i:i*layer.width+j);
      pixels.data[at]=color[0];pixels.data[at+1]=color[1];pixels.data[at+2]=color[2];pixels.data[at+3]=255*a;
    }
  }
  g.putImageData(pixels,0,0);
  const c=surface(w,h),out=c.getContext('2d');out.shadowColor='rgba(67,66,26,.28)';out.shadowBlur=4*k;out.shadowOffsetY=3.8*k;out.drawImage(layer,0,0);
  return {c,minX,minY,w,h};
}

const smooth=u=>{const t=clamp(u);return t*t*(3-2*t);};
// An inset fold in one fleshy terminal, rather than an open wire silhouette.
// The same coordinates describe its turn, but the light stays in board space.
const coil=Array.from({length:85},(_,i)=>{
  const t=i/84,a=3.65-t*TAU*1.13,r=14.1*(1-t)**.9+.38;
  return {u:6.6+Math.cos(a)*r,v:1.9+Math.sin(a)*r,width:1.95*(.66+.34*Math.sin(t*Math.PI))*(.16+.84*smooth(t/.14))*(.20+.80*smooth((1-t)/.15))};
});
function drawTip(g,dx,dy) {
  const size=64,center=32,layer=surface(size,size),ctx=layer.getContext('2d'),pixels=ctx.createImageData(layer.width,layer.height);
  const acrossLight=dy-dx,forwardLight=-dx-dy;
  const grooveInk=[51,135,53],foldLight=[162,223,127],shadowInk=[67,66,26];
  const edgeAt=(u,v)=>{
    const dome=clamp((u-4.5)/18.9),blend=smooth((u+8)/12.5),mid=2*blend,radius=14.45+1.6*blend;
    return Math.min(23.4-u,radius*Math.sqrt(1-dome*dome)-Math.abs(v-mid));
  };
  for(let j=0;j<layer.height;j++)for(let i=0;i<layer.width;i++){
    const x=(i+.5)*.5-center,y=(j+.5)*.5-center,u=x*dx+y*dy,v=y*dx-x*dy;
    if(u< -9||u>29||Math.abs(v)>26)continue;
    const alpha=clamp(.5+edgeAt(u,v)*1.42)*smooth((u+9)/8);
    const shadow=.24*smooth((u-1)/8)*clamp(.5+edgeAt(u-2*dy,v-2*dx)/4.8),outAlpha=alpha+shadow*(1-alpha);
    if(!outAlpha)continue;
    const at=4*(j*layer.width+i);
    if(!alpha){
      for(let ch=0;ch<3;ch++)pixels.data[at+ch]=shadowInk[ch];
      pixels.data[at+3]=255*outAlpha;continue;
    }
    const dome=clamp((u-4.5)/18.9),blend=smooth((u+8)/12.5),mid=2*blend,radius=14.45+1.6*blend;
    const r=(v-mid)/radius;
    const illumination=Math.max(-1,Math.min(1,r*acrossLight+dome*forwardLight*.54));
    const base=green(illumination);
    let groove=0,lip=0;
    for(const p of coil){
      const du=u-p.u,dv=v-p.v;
      if(Math.abs(du)>4.6||Math.abs(dv)>4.6)continue;
      groove=Math.max(groove,clamp((p.width+.85-Math.hypot(du,dv))/1.7));
      lip=Math.max(lip,clamp((p.width*.97+.85-Math.hypot(du-forwardLight*1.35,dv-acrossLight*1.35))/1.7));
    }
    const shade=groove*.81,highlight=lip*(1-groove)*.42,roll=1-.09*dome*dome;
    for(let ch=0;ch<3;ch++){
      let val=base[ch]*roll;
      val+=(foldLight[ch]-val)*highlight;
      val+=(grooveInk[ch]-val)*shade;
      pixels.data[at+ch]=(val*alpha+shadowInk[ch]*shadow*(1-alpha))/outAlpha;
    }
    pixels.data[at+3]=outAlpha*255;
  }
  ctx.putImageData(pixels,0,0);g.drawImage(layer,0,0,size,size);
}

export function installVineArt(sprite) {
  for(const [side,dx,dy] of [['right',1,0],['down',0,1],['left',-1,0],['up',0,-1]])
    sprite('vine_tip_'+side,64,64,g=>drawTip(g,dx,dy),32,32);
}
