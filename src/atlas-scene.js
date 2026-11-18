import {installSoilSurfaces} from './garden-soil.js';

const TAU=Math.PI*2, MINT='#93cfb8', CREAM='#f2e8cc', INK='#243e40', RED='#dc7058';
const defaults={bgTop:'#183f47',bgMid:'#205956',bgBottom:'#102f38',tileColor:'#bbae98',frameColor:'#364f50'};
const tag=(...values)=>values.join('_').replace(/#/g,'');
const line=(g,x1,y1,x2,y2)=>{g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
function box(g,x,y,w,h,r,fill,edge,width=1){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill();}if(edge){g.lineWidth=width;g.strokeStyle=edge;g.stroke();}}
function dot(g,x,y,r,ink){g.fillStyle=ink;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
function gradient(g,x,y,x2,y2,stops){const p=g.createLinearGradient(x,y,x2,y2);for(const [at,c]of stops)p.addColorStop(at,c);return p;}
function stamp(g,text,x,y,size,ink,align='left'){
  g.save();g.textAlign=align;g.fillStyle=ink;g.font=`${size}px ui-monospace, Menlo, Consolas, monospace`;g.fillText(text,x,y);g.restore();
}
function texturedPaper(g,colors){
  g.fillStyle=gradient(g,40,0,580,1600,[[0,colors.bgTop],[.51,colors.bgMid],[1,colors.bgBottom]]);g.fillRect(0,0,720,1600);
  let state=493;
  const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  for(let i=0;i<10500;i++){
    const x=next()*720,y=next()*1600,bright=next();
    g.fillStyle=bright>.47?'rgba(221,237,208,.048)':'rgba(3,33,38,.071)';g.fillRect(x,y,.8+next()*2,.75);
  }
  for (const [pitch,ink,width] of [[24,'rgba(181,220,201,.061)',.65],[120,'rgba(186,223,205,.11)',.85]]){
    g.strokeStyle=ink;g.lineWidth=width;g.beginPath();
    for(let x=0;x<720;x+=pitch){g.moveTo(x+.5,0);g.lineTo(x+.5,1600);}
    for(let y=0;y<1600;y+=pitch){g.moveTo(0,y+.5);g.lineTo(720,y+.5);}g.stroke();
  }
  g.strokeStyle='rgba(207,231,208,.25)';g.lineWidth=1;
  for(const [x,y,sx,sy]of [[20,32,1,1],[700,32,-1,1],[20,1568,1,-1],[700,1568,-1,-1]]){
    line(g,x,y,x+sx*22,y);line(g,x,y,x,y+sy*22);
    g.strokeStyle='rgba(207,231,208,.19)';line(g,x+sx*4,y+sy*4,x+sx*10,y+sy*4);
  }
}

// Specimens are inked as individual lance-shaped leaves. Fine cross-veins
// follow the midrib so they read as a print even at the edge of the frame.
function inkLeaf(g,x,y,angle,length,width,filled=false){
  g.save();g.translate(x,y);g.rotate(angle);
  g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-width*.9,-length*.18,-width,-length*.62,1,-length);
  g.bezierCurveTo(width*.6,-length*.80,width*1.13,-length*.23,0,0);
  if(filled)g.fill();g.stroke();g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-width*.24,-length*.48,1,-length);g.stroke();
  g.lineWidth*=.64;
  for(const t of [.24,.42,.59,.73]){
    const spread=width*.72*Math.sin(t*Math.PI);g.beginPath();
    g.moveTo(-spread*.08,-t*length);g.quadraticCurveTo(-spread*.62,-t*length-1,-spread,-(t+.12)*length);
    g.moveTo(-spread*.08,-t*length);g.quadraticCurveTo(spread*.46,-t*length-1,spread*.81,-(t+.10)*length);g.stroke();
  }g.restore();
}
function etching(g,species){
  g.strokeStyle='#a3cdb7';g.fillStyle='rgba(146,191,170,.13)';g.lineWidth=1.25;g.lineCap='round';
  g.beginPath();g.moveTo(47,300);g.bezierCurveTo(66,252,126,164,134,65);g.quadraticCurveTo(134,44,132,27);g.stroke();
  if(species===0){
    for(const [x,y,a,l,w]of[[64,265,-.93,78,12],[72,248,.85,82,12],[83,224,-.66,84,11],
      [98,191,.92,78,11],[113,156,-.77,65,10],[122,125,.73,58,9],[129,92,-.46,47,8],[133,65,.43,36,6],[134,46,-.13,29,5]])inkLeaf(g,x,y,a,l,w,true);
  }else{
    for(const [x,y,a,l]of[[66,257,-.64,94],[78,235,.65,102],[90,213,-.60,88],[101,183,.67,88],
      [114,152,-.57,69],[125,116,.53,65],[130,88,-.48,47],[133,64,.38,36]]){
      g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-3,-l*.52,0,-l);g.stroke();
      for(let n=1;n<7;n++){const t=n/8,fl=14*(1-t)*Math.min(1,l/70)+5;inkLeaf(g,-Math.sin(t*Math.PI)*1.5,-l*t,-.91,fl,2.4,true);inkLeaf(g,-Math.sin(t*Math.PI)*1.5,-l*(t+.055),.88,fl*.95,2.2,true);}g.restore();
    }
  }
}
function herb(g){
  g.strokeStyle='#a4d1bd';g.fillStyle='rgba(166,205,177,.20)';g.lineWidth=1.5;g.lineCap='round';
  for(const [x,y,a,l,w]of[[29,60,-.53,38,3.7],[30,61,-.22,51,4.5],[30,60,.37,44,4],[31,61,.78,31,3.4]])inkLeaf(g,x,y,a,l,w,true);
}
function blossom(g,x,y,r,color,turn=0){
  g.save();g.translate(x,y);g.rotate(turn);
  for(let i=0;i<8;i++){
    g.rotate(TAU/8);g.fillStyle=color;g.strokeStyle='rgba(56,71,61,.47)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(-1,2);g.bezierCurveTo(-r*.40,-r*.30,-r*.28,-r*.85,-r*.06,-r);
    g.bezierCurveTo(r*.33,-r*.89,r*.33,-r*.35,1.5,1);g.fill();g.stroke();
    g.strokeStyle='rgba(255,250,218,.58)';g.lineWidth=.7;line(g,.4,-r*.21,0,-r*.83);
  }
  dot(g,0,0,r*.22,'#d8ae67');dot(g,-r*.035,-r*.035,r*.11,'#f3db9b');g.restore();
}
function specimenBouquet(g){
  g.lineJoin='round';g.lineCap='round';
  const stems=[[80,89,-.45,1],[187,103,.37,.82],[131,51,-.12,1.26],[148,114,.07,.61]];
  g.lineWidth=2;g.strokeStyle='#4e7769';
  for(const [x,y]of stems){g.beginPath();g.moveTo(132,226);g.quadraticCurveTo(111,153,x,y);g.stroke();}
  g.strokeStyle='#527b66';g.fillStyle='#93b89f';
  for(const [x,y,a,l,w]of [[131,185,-1.13,56,10],[132,180,.87,72,10],[111,146,-.81,45,8],[138,146,.65,44,9],[113,137,.38,34,7]])inkLeaf(g,x,y,a,l,w,true);
  for(const [i,[x,y,a,s]]of stems.entries())blossom(g,x,y,23*s,['#e78b70','#e7cf9b','#f1e2b9','#dd785d'][i],a);
  g.save();g.translate(128,192);g.rotate(-.13);box(g,-24,-9,49,16,2,'#c7a779','#826c55');g.strokeStyle='#a2845d';for(let x=-19;x<24;x+=8)line(g,x,6,x+6,-6);g.restore();
}
function wateringInstrument(g){
  g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
  g.strokeStyle=INK;g.beginPath();g.moveTo(44,74);g.bezierCurveTo(15,50,7,80,18,103);g.quadraticCurveTo(24,115,42,117);g.stroke();
  g.strokeStyle='#94c9ad';g.lineWidth=7;g.beginPath();g.moveTo(43,73);g.bezierCurveTo(19,53,11,78,22,99);g.quadraticCurveTo(27,109,42,111);g.stroke();
  g.lineWidth=2.2;g.strokeStyle=INK;g.fillStyle='#81b7a3';g.beginPath();g.moveTo(111,92);g.quadraticCurveTo(143,85,168,48);
  g.lineTo(181,53);g.bezierCurveTo(164,83,149,107,116,125);g.closePath();g.fill();g.stroke();
  g.fillStyle='#d7dcc4';g.beginPath();g.moveTo(164,46);g.lineTo(176,35);g.quadraticCurveTo(184,35,193,44);
  g.quadraticCurveTo(196,49,191,52);g.lineTo(180,59);g.closePath();g.fill();g.stroke();
  g.strokeStyle='#6c9388';g.lineWidth=1.4;for(let i=0;i<4;i++)line(g,177+i*3,40+i*.7,181+i*3,46+i*.9);
  g.strokeStyle=INK;g.lineWidth=2.2;
  g.fillStyle=gradient(g,48,70,118,132,[[0,'#d1dfc3'],[.34,'#a9cfba'],[1,'#74aa99']]);
  g.beginPath();g.moveTo(43,66);g.quadraticCurveTo(75,56,109,68);g.lineTo(125,120);
  g.quadraticCurveTo(127,129,116,134);g.quadraticCurveTo(82,143,46,132);g.quadraticCurveTo(39,130,38,123);g.closePath();g.fill();g.stroke();
  g.fillStyle='#49756c';g.beginPath();g.ellipse(76,67,31,5.7,.02,0,TAU);g.fill();
  g.strokeStyle='#e4e6c9';g.lineWidth=2.3;g.beginPath();g.ellipse(76,67,31,5.7,.02,0,TAU);g.stroke();
  g.strokeStyle='rgba(61,99,87,.65)';g.lineWidth=1.2;
  for(let n=0;n<4;n++)line(g,49,85+n*8,n%2?55:60,85+n*8);
  box(g,73,83,22,27,2,'#eddec0');g.strokeStyle='#be715b';g.lineWidth=2;
  g.beginPath();g.moveTo(83,88);g.quadraticCurveTo(71,103,84,104);g.quadraticCurveTo(94,102,83,88);g.closePath();g.stroke();
}
export function installAtlasScene(sprite,S={}){
  const colors={};for(const [k,v]of Object.entries(defaults))colors[k]=S[k]||v;
  const sig=tag(colors.bgTop,colors.bgMid,colors.bgBottom,colors.tileColor,colors.frameColor);
  const bg=sprite('background_atlas_'+tag(colors.bgTop,colors.bgMid,colors.bgBottom),720,1600,g=>texturedPaper(g,colors));
  const tile='soil_atlas_'+tag(colors.tileColor),beds=installSoilSurfaces(sprite,tile,colors.tileColor);
  sprite('decor_atlas_lance',245,318,g=>etching(g,0));
  sprite('decor_atlas_fern',245,318,g=>etching(g,1));
  sprite('decor_atlas_herb',64,68,herb);
  sprite('decor_atlas_flower',46,46,g=>blossom(g,23,23,18,'#8bb3a3',.19));
  sprite('bouquet',275,255,specimenBouquet);
  sprite('watering_can',156,116,g=>{g.save();g.scale(.76,.76);g.translate(0,-10);wateringInstrument(g);g.restore();});
  sprite('fx_watering_can',206,164,wateringInstrument,78,45);
  return {sig,bg,tile,beds,frame:colors.frameColor};
}
export function composeAtlasBackdrop({items,item,style,time,S,motion=true}){
  const t=motion&&S.bgMotion!==false?time:0;
  items.push(item('background',style.bg,360,800,1,1,0,1,0));
  items.push(item('decor_folio_lance','decor_atlas_lance',38,437,.85,.85,-.28+.008*Math.sin(t*.48),.40,1));
  items.push(item('decor_folio_fern','decor_atlas_fern',660,467,.83,.83,.38-.01*Math.sin(t*.4),.47,1));
  items.push(item('decor_folio_lower','decor_atlas_lance',690,1325,.65,.65,-1.02,.33,1));
  items.push(item('decor_folio_sedge','decor_atlas_herb',55,1320,.80,.80,-.68,.48,1));
  items.push(item('decor_folio_floret','decor_atlas_flower',96,1303,.70,.70,-.28,.36,1));
}

export function atlasFrameSprite(sprite,layout,S={}){
  const f=layout.frame,c=S.frameColor||defaults.frameColor;
  const l=layout.x-f.x,t=layout.y-f.y,b=t+layout.h,r=l+layout.w,w=f.w,h=f.h;
  const scale=w/684,key='frame_atlas_'+tag(c,...[w,h,l,t,b,r,layout.cellW,layout.cellH].map(x=>x.toFixed(2)));
  return sprite(key,w,h,g=>{
    g.save();g.scale(scale,scale);
    const W=w/scale,H=h/scale,L=l/scale,T=t/scale,B=b/scale,R=r/scale;
    box(g,2,8,W-4,H-10,13,'rgba(3,21,24,.44)');
    box(g,2,2,W-4,H-10,12,c,'rgba(216,224,197,.54)',1.6);
    box(g,6,6,W-12,H-18,9,null,'rgba(206,220,196,.30)',.85);
    g.strokeStyle='rgba(23,42,42,.47)';g.lineWidth=1;
    for(let j=10;j<W-10;j+=5)line(g,j,10,j+3,13);
    box(g,L-3,T-3,R-L+6,B-T+6,6,'#354749','rgba(223,225,199,.48)',1.2);
    g.strokeStyle='rgba(191,218,194,.67)';g.lineWidth=1;
    for(let i=0;i<=Math.round(layout.w/layout.cellW);i++){
      const x=L+i*layout.cellW/scale;line(g,x,T-6,x,T-11);
      if(i<Math.round(layout.w/layout.cellW))for(let n=1;n<4;n++){const q=x+n*layout.cellW/(scale*4);line(g,q,T-6,q,T-8.3);}
    }
    for(let i=0;i<=Math.round(layout.h/layout.cellH);i++){
      const y=T+i*layout.cellH/scale;line(g,R+5,y,R+10,y);
    }
    // Two short linen stitches on either rail, with visible sunk eyelets.
    for(const y of [T+(B-T)*.21,T+(B-T)*.79])for(const x of [L*.43,R+(W-R)*.51]){
      for(const off of [-8,8])dot(g,x,y+off,2.3,'#253b3b');
      g.strokeStyle='#c9b998';g.lineWidth=1.65;line(g,x-.35,y-8,x+.35,y+8);
    }
    const upper= T*.64, lower=B+(H-B)*.53;
    if(T>19){
      g.fillStyle=RED;g.fillRect(L,upper-6,11,4);stamp(g,'FIELD  /  ATLAS',L+17,upper,10,CREAM);
      g.strokeStyle=MINT;g.lineWidth=1;for(let i=0;i<5;i++)line(g,R-25+i*5,upper-6,R-25+i*5,upper-(i%2?3:0));
    }
    if(H-B>26){
      stamp(g,'SPECIMEN  /  TRAY',L,lower,9,'#c3d0b9');
      g.strokeStyle='rgba(194,214,188,.45)';line(g,L+107,lower-3,R-61,lower-3);
      box(g,R-51,lower-8,50,8,.5,'#b9b7a1');
      for(let i=0;i<4;i++)box(g,R-48+i*12,lower-6,7,4,.5,i===0?RED:'#71877c');
    }
    g.restore();
  });
}
