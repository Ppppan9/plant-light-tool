// These are ordinary scene items. The same timestamp produces the same drawing
// when playing, seeking, or sampling frames for layered exports.
const TAU=Math.PI*2;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>1-(1-clamp(n))**3;
const envelope=(p,attack=.14,fade=.55)=>clamp(p/attack)*clamp((1-p)/fade);
const noise=n=>{const t=Math.sin(n*17.31+9.47)*43758.5453;return t-Math.floor(t);};
const budgets=new WeakMap();
const limits={soil:[12,22,32],growth:[16,32,44],bloom:[22,48,68]};
export const densityCount=(S,low,normal,high)=>S.particleDensity==='low'?low:S.particleDensity==='high'?high:normal;
function remaining(items,S,kind){
  let used=budgets.get(items);
  if(!used){used={soil:0,growth:0,bloom:0};budgets.set(items,used);}
  if(used[kind]>=densityCount(S,...limits[kind]))return false;
  used[kind]++;return true;
}
const hidden=S=>S.showParticles===false||S.interactionMotion===false;

const petalInk={
  pink:['#fff0f0','#fa94bb','#d55885'],purple:['#eee8ff','#b69bef','#8464c0'],
  blue:['#dcfcff','#79d7ed','#3d9fce'],orange:['#fff1d3','#ffad73','#da744a'],
  white:['#fffef8','#f5e8dc','#c5b4ad']
};
const crumbShapes=[
  [[2,10],[5,4],[13,3],[19,8],[15,15],[7,16]],
  [[2,8],[9,4],[17,6],[20,10],[11,15],[4,13]],
  [[3,12],[4,6],[9,2],[15,6],[16,12],[12,16],[6,15]]
];
function face(g,points,fill){
  g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();
}
export function installGardenParticles(sprite){
  const clay=[['#b4784c','#875537','#d79f6c'],['#cb955f','#a36b43','#ecc08a'],['#a56c4a','#80543d','#cf9a77']];
  for(let n=0;n<3;n++)sprite('fx_earth_grain_'+n,22,18,g=>{
    const p=crumbShapes[n],[mid,shade,light]=clay[n],c=g.createLinearGradient(8,2,14,16);
    c.addColorStop(0,light);c.addColorStop(.4,mid);c.addColorStop(1,shade);face(g,p,c);
    face(g,[p[0],p[1],p[2],[10,8]],light);face(g,[[10,8],p[3],p[4]],mid);
  });
  sprite('fx_seed_husk',22,12,g=>{
    const c=g.createLinearGradient(4,1,10,11);c.addColorStop(0,'#f9dd92');c.addColorStop(.55,'#d5a66c');c.addColorStop(1,'#a57c50');
    g.fillStyle=c;g.beginPath();g.moveTo(1,8);g.quadraticCurveTo(6,2,20,2);g.quadraticCurveTo(15,13,1,8);g.fill();
    g.strokeStyle='#c09263';g.lineWidth=1;g.beginPath();g.moveTo(4,8);g.quadraticCurveTo(12,7,17,4);g.stroke();
  });
  sprite('fx_sap_streak',32,12,g=>{
    const c=g.createLinearGradient(1,6,31,6);c.addColorStop(0,'rgba(225,232,130,0)');c.addColorStop(.55,'#e7f5a3');c.addColorStop(.85,'#fcffd9');c.addColorStop(1,'#e9ee95');
    g.fillStyle=c;g.beginPath();g.moveTo(0,7);g.bezierCurveTo(13,7,20,1,28,3);g.bezierCurveTo(34,6,26,9,19,8);g.quadraticCurveTo(9,8,0,7);g.fill();
  },25,6);
  sprite('fx_leaf_chip',20,12,g=>{
    const c=g.createLinearGradient(5,2,15,11);c.addColorStop(0,'#ebf9a7');c.addColorStop(.48,'#c0dc72');c.addColorStop(.5,'#98c260');c.addColorStop(1,'#7ca34f');
    g.fillStyle=c;g.beginPath();g.moveTo(1,9);g.quadraticCurveTo(6,1,18,2);g.quadraticCurveTo(17,10,6,10);g.closePath();g.fill();
  });
  sprite('fx_anther_dust',17,15,g=>{
    let c=g.createRadialGradient(8,7,2,8,7,7);c.addColorStop(0,'rgba(255,240,148,.65)');c.addColorStop(1,'rgba(255,222,119,0)');
    g.fillStyle=c;g.fillRect(0,0,17,15);
    for(const [x,y,r,fill] of [[8,7,3.6,'#d6a650'],[7.3,6.1,3,'#ffe99a'],[6.7,5.5,1.25,'#fffae0'],[12.8,8.8,1.2,'#f8d181']]){
      g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
    }
  });
  for(const [color,[light,body,fold]]of Object.entries(petalInk))sprite('fx_petal_flake_'+color,24,20,g=>{
    const c=g.createLinearGradient(7,2,17,16);c.addColorStop(0,light);c.addColorStop(.48,body);c.addColorStop(1,fold);
    g.fillStyle=c;g.beginPath();g.moveTo(2,15);g.bezierCurveTo(3,10,7,3,14,3);g.quadraticCurveTo(18,3,18,6);g.quadraticCurveTo(20,5,22,6);g.bezierCurveTo(23,13,12,20,2,15);g.fill();
    g.strokeStyle=light;g.globalAlpha=.8;g.lineWidth=1.15;g.beginPath();g.moveTo(4,15);g.quadraticCurveTo(13,12,17,7);g.stroke();
  });
}

export function composeSoilParticles({items,item,S,id,age,x,y,k,seed}){
  if(hidden(S)||age<=.10||age>1.08)return;
  for(let n=0;n<densityCount(S,4,7,10);n++){
    const key=seed*37+n*11,flake=n%4===3,side=n%2?1:-1;
    const start=.10+noise(key+1)*.043,fly=(flake?.46:.25)+noise(key+2)*.12,t=(age-start)/fly;
    const settle=(t-1)*fly,rest=.18+noise(key+3)*.14;
    if(t<=0||settle>=rest||!remaining(items,S,'soil'))continue;
    const p=clamp(t),bounce=clamp(settle/.085),height=flake?23+noise(key+4)*15:13+noise(key+4)*19;
    const landing=2+noise(key+5)*9,travel=(17+noise(key+6)*26)*(flake?1.14:1);
    const X=side*(5+travel*(p*.84+p*(2-p)*.16)+3*bounce);
    const Y=-4+landing*p-4*height*p*(1-p)-(t>1?Math.sin(Math.PI*bounce)*(flake?.6:2.3):0);
    const sc=k*(flake?.54:.36+noise(key+7)*.31),rot=side*(.2+noise(key+8)*.8+p*(flake?2.9:1.8)+.27*bounce);
    items.push(item(`${id}_crumb_${n}`,flake?'fx_seed_husk':'fx_earth_grain_'+n%3,x+k*X,y+k*Y,sc,sc*(flake?.7+.3*Math.cos(p*TAU):1),rot,clamp(t*8)*clamp(1-Math.max(0,settle)/rest),42));
  }
}

// Release each fleck when the eased growth front reaches its fixed station.
// It first slips along the actual curved stem, then peels off the tangent.
const stations=[.16,.54,.30,.82,.07,.67,.40,.92,.22,.74,.47,.60];
export function composeGrowthParticles({items,item,S,index,point,length,dist,x0,y0,k,angle,age,duration}){
  if(hidden(S)||!(dist>0&&k>0&&age>0&&duration>0)||age>duration+.36||length<2*k)return;
  const count=densityCount(S,4,8,12),spacing=Math.min(1,dist/(135*k));
  for(let n=0;n<Math.max(2,Math.round(count*spacing));n++){
    const key=index*29+n*17,station=stations[n]*dist;
    const born=duration*(1-Math.cbrt(1-stations[n])),chip=n%3===1;
    const p=(age-born)/((chip?.24:.16)+noise(key+1)*.095);
    if(p<=0||p>=1||length<station||!remaining(items,S,'growth'))continue;
    const follow=Math.min(length,station+(chip?10:23)*k*ease(p)),a=point(follow);
    const a0=point(Math.max(0,follow-2*k)),a1=point(Math.min(dist,follow+2*k));
    const heading=a0.x===a1.x&&a0.y===a1.y?angle:Math.atan2(a1.y-a0.y,a1.x-a0.x);
    const side=(index+n)%2?1:-1,lateral=side*k*(4+p*(chip?18:9)),dx=-Math.sin(heading)*lateral,dy=Math.cos(heading)*lateral;
    const sc=k*(chip?.46:.58)*(1-.24*p),rot=heading+side*(chip?.5+p*2:.08+p*.14);
    items.push(item(`fx_growth_${index}_${chip?'leaf':'sap'}_${n}`,chip?'fx_leaf_chip':'fx_sap_streak',
      x0+a.x+dx,y0+a.y+dy-(chip?8*p*k:0),sc*(chip?1:.58+.67*Math.sin(p*Math.PI)),sc*(chip?.55+.45*Math.abs(Math.cos(p*3.5)):1),rot,envelope(p,.12,.45)*.92,36));
  }
}

export function composeBloomParticles({items,item,S,fl,x,y,k,age}){
  const bloom=(+S.bloomMs||350)/1000,release=Math.min(.32,bloom*.23);
  if(hidden(S)||age<release||age>release+1.22)return;
  const seed=fl.c*13+fl.r*29, color=Object.hasOwn(petalInk,fl.color)?fl.color:'pink';
  const sc=k*(+S.flowerScale||1);
  // Pollen lifts from the disk. A prevailing breeze bends the top of the
  // plume while each flower retains its own launch directions.
  for(let n=0;n<densityCount(S,4,7,11);n++){
    const key=seed+n*13,life=.48+noise(key+2)*.37;
    const p=(age-release-noise(key)*.09)/life;
    if(p<=0||p>=1||!remaining(items,S,'bloom'))continue;
    const side=n%2?-1:1, spread=side*(10+noise(key+1)*38);
    const dx=side*4+spread*ease(p)+p*p*15+Math.sin(p*3.5)*3;
    const dy=-7-(29+noise(key+3)*31)*ease(p)-p*12+16*p*p;
    const s=k*(.44+noise(key+4)*.38)*(1-.24*p);
    items.push(item(`${fl.id}_fx_pollen_${n}`,'fx_anther_dust',x+dx*sc,y-39*k+dy*sc,s,s,-.3+noise(key+5)*1.4,envelope(p)*.95,64));
  }
  // A few curled petal fragments roll broadside and edge-on as they fall.
  for(let n=0;n<densityCount(S,1,2,3);n++){
    const key=seed+19*n,side=(seed+n)%2?-1:1,life=.69+noise(key+3)*.18;
    const p=(age-release-.035-n*.09)/life;
    if(p<=0||p>=1||!remaining(items,S,'bloom'))continue;
    const wing=Math.sin(p*Math.PI*1.72),lift=20+noise(key+2)*10;
    const dx=side*(12+(28+noise(key+4)*13)*ease(p)+9*wing)+18*p;
    const dy=-14-lift*4*p*(1-p)+(16+noise(key)*14)*p*p;
    const s=k*(.54+noise(key+1)*.19),fold=.19+.81*Math.abs(Math.cos(.25+p*(4.6+n*.42)));
    items.push(item(`${fl.id}_fx_petal_${n}`,'fx_petal_flake_'+color,x+dx*sc,y-39*k+dy*sc,s,s*fold,side*(-.55+1.8*p+.5*wing),envelope(p,.14,.35)*.94,63));
  }
}
