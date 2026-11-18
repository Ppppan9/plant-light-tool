const TAU=Math.PI*2;
const marks=[
  [[19,66],[92,23],[88,21]],[[82,68],[86,65],[28,20]],[[87,30],[28,71]],
  [[26,23],[32,25],[94,67]],[[69,73],[80,23],[85,26]],[[24,54],[89,29]]
];
export function soilVariant(c,r){return (c*7+r*11+(c*r)%5)%marks.length;}

function plate(g,x,y,w,h,r,fill){
  g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();
}
export function installSoilSurfaces(sprite,key,color='#bbae98'){
  return marks.map((specks,n)=>sprite(`${key}_bed_${n}`,118,97,g=>{
    plate(g,2.0,3.0,114,92,6,'rgba(12,33,33,.36)');
    plate(g,2.5,2.0,113,91,6,color);
    g.save();g.beginPath();g.roundRect(2.5,2,113,91,6);g.clip();
    const light=g.createLinearGradient(17,0,58,104);
    light.addColorStop(0,'rgba(255,248,226,.35)');light.addColorStop(.68,'rgba(255,248,226,.05)');
    light.addColorStop(1,'rgba(73,66,53,.13)');g.fillStyle=light;g.fillRect(0,0,118,97);
    g.strokeStyle='rgba(255,248,228,.35)';g.lineWidth=1;
    g.beginPath();g.moveTo(4,74);g.lineTo(4,9);g.quadraticCurveTo(4,4,9,4);g.lineTo(106,4);g.stroke();
    // A shallow slipcast edge and minute mineral inclusions leave the face quiet.
    g.strokeStyle='rgba(68,65,53,.22)';g.beginPath();g.moveTo(7,90);g.lineTo(108,90);
    g.quadraticCurveTo(113,90,113,85);g.stroke();
    for(const [i,[x,y]]of specks.entries()){
      g.fillStyle=i===0?'rgba(75,68,54,.19)':'rgba(75,68,54,.12)';
      g.beginPath();g.ellipse(x,y,i===0?1.65:.95,.70-i*.09,-.48,0,TAU);g.fill();
    }
    let seed=n*31+17;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<180;i++){
      const x=rand()*118,y=rand()*97,bright=rand()>.56;
      g.fillStyle=bright?'rgba(255,252,232,.15)':'rgba(77,75,61,.072)';g.fillRect(x,y,.62+rand()*.42,.64);
    }
    g.restore();
  }));
}
