// 植物光路 · 参考视频画幅 720×1600。每一个可运动元素保持独立精灵，供网页 / AE / 3D 同源采样。
import BUD_PINK from './art-assets/polished/bud-pink.webp';
import BUD_PURPLE from './art-assets/polished/bud-purple.webp';
import BUD_BLUE from './art-assets/polished/bud-blue.webp';
import BUD_ORANGE from './art-assets/polished/bud-orange.webp';
import BUD_WHITE from './art-assets/polished/bud-white.webp';
import FLOWER_PINK from './art-assets/polished/flower-pink.webp';
import FLOWER_PURPLE from './art-assets/polished/flower-purple.webp';
import FLOWER_BLUE from './art-assets/polished/flower-blue.webp';
import FLOWER_ORANGE from './art-assets/polished/flower-orange.webp';
import FLOWER_WHITE from './art-assets/polished/flower-white.webp';
import TILE from './art-assets/soil-tile.png';
import BOUQUET from './art-assets/bouquet.png';
import FONT_URL from './art-assets/baloo800.woff';
import GRASS_BACKGROUND from './art-assets/reference-grass.png';
import GARDEN_FRAME from './art-assets/garden-frame.png';
import FLOWER_ROOT from './art-assets/polished/leaf-root.webp';
import {createVinePainter} from './botanical.js';
import {installFlower,composeFlower} from './flower-bloom.js';
import {createInteractionFX} from './interaction-fx.js';
import {preview as previewPlant} from './core.js';
import {paintAimPreview} from './aim-preview.js';
import GRASS_TUFT from './art-assets/grass-tuft.png';
import BUSH_RIGHT from './art-assets/bush-right.png';
import BUSH_LEFT from './art-assets/bush-left.png';
import WATERING_CAN from './art-assets/watering-can.png';
import {installSoilSurfaces, soilVariant} from './garden-soil.js';
import {brushBend, entrancePose, flowerPose, pruneGardenBrushes} from './garden-life.js';

export const DW=720,DH=1600;
const TAU=Math.PI*2, A={}, SOURCES={};
let STYLE={}, fontReady=false;
const FONT='"Bloom Rounded", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const easeOut=t=>1-(1-clamp(t))**3;
function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return(n>>>0).toString(36);}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function gradient(g,y0,y1,c0,c1){const p=g.createLinearGradient(0,y0,0,y1);p.addColorStop(0,c0);p.addColorStop(1,c1);return p;}
function sprite(key,w,h,draw,ax=w/2,ay=h/2){if(A[key])return key;const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*2));c.height=Math.max(1,Math.ceil(h*2));const g=c.getContext('2d');g.scale(2,2);draw(g,w,h);A[key]={c,w,h,ax,ay};return key;}
function imageSprite(key,img,ax=img.width/2,ay=img.height/2){if(A[key])return key;const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);A[key]={c,w:img.width,h:img.height,ax,ay};return key;}
function drawLeaf(g,x,y,w,h,angle=0,color='#58bb32'){
  g.save();g.translate(x,y);g.rotate(angle);g.shadowColor='rgba(34,79,19,.25)';g.shadowBlur=4;g.shadowOffsetY=3;
  const gr=g.createLinearGradient(-w/2,-h/2,w/2,h/2);gr.addColorStop(0,'#c7ec77');gr.addColorStop(.3,color);gr.addColorStop(1,'#278623');
  g.fillStyle=gr;g.beginPath();g.moveTo(0,h/2);g.bezierCurveTo(-w,-h/6,-w*.44,-h*.72,0,-h/2);g.bezierCurveTo(w*.63,-h*.45,w*.56,h*.3,0,h/2);g.fill();g.shadowColor='transparent';
  g.strokeStyle='rgba(211,244,141,.38)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,h*.4);g.lineTo(0,-h*.35);g.stroke();g.restore();
}
function card(g,w,h,r=30,fill1='#fffde9',fill2='#f8f0cf',edge='#e0d7b7'){
  g.save();g.shadowColor='rgba(37,68,15,.28)';g.shadowBlur=5;g.shadowOffsetY=7;rr(g,3,3,w-6,h-10,r);g.fillStyle=edge;g.fill();g.shadowColor='transparent';
  rr(g,3,0,w-6,h-12,r);g.fillStyle=gradient(g,0,h,fill1,fill2);g.fill();g.restore();
}
function textAsset(text,size=30,color='#273410',opts={}){
  const key='text_'+hash(JSON.stringify([text,size,color,opts]));if(A[key])return key;
  const m=document.createElement('canvas').getContext('2d');m.font=`800 ${size}px ${FONT}`;
  const lines=String(text).split('\n'),lh=size*(opts.lineHeight||1.13),w=Math.ceil(Math.max(...lines.map(s=>m.measureText(s).width))+16),h=Math.ceil(lh*lines.length+14);
  return sprite(key,w,h,g=>{g.font=`800 ${size}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
    lines.forEach((s,i)=>{const y=9+lh*(i+.5)-size*.05;if(opts.shadow){g.fillStyle=opts.shadowColor||'rgba(51,80,20,.32)';g.fillText(s,w/2,y+3);}g.fillStyle=color;g.fillText(s,w/2,y);});});
}
function addText(items,id,text,x,y,size=30,color='#273410',z=82,opts={}){const k=textAsset(text,size,color,opts);items.push(item(id,k,x,y,1,1,0,1,z));}
function fitText(items,id,text,x,y,size,color,width,z=82,opts={}){const k=textAsset(text,size,color,opts),sc=Math.min(1,width/A[k].w);items.push(item(id,k,x,y,sc,sc,0,1,z));}
function item(id,asset,x,y,sx=1,sy=sx,rot=0,op=1,z=0){return{id,asset,a:true,x,y,sx,sy,rot,op:clamp(op),z};}
const vinePainter=createVinePainter({sprite,item});
const interactionFX=createInteractionFX({sprite,item});

export async function createAssets(S={}){
  if(!fontReady){try{const f=new FontFace('Bloom Rounded',`url(${FONT_URL})`,{weight:'800'});await f.load();document.fonts.add(f);}catch{}fontReady=true;}
  const urls={bud_pink:BUD_PINK,bud_purple:BUD_PURPLE,bud_blue:BUD_BLUE,bud_orange:BUD_ORANGE,bud_white:BUD_WHITE,flower_pink:FLOWER_PINK,flower_purple:FLOWER_PURPLE,flower_blue:FLOWER_BLUE,flower_orange:FLOWER_ORANGE,flower_white:FLOWER_WHITE,soil:TILE,bouquet:BOUQUET,grass_background:GRASS_BACKGROUND,frame_art:GARDEN_FRAME,flower_root:FLOWER_ROOT,tuft_art:GRASS_TUFT,bush_right:BUSH_RIGHT,bush_left:BUSH_LEFT,watering_can:WATERING_CAN};
  await Promise.all(Object.entries(urls).map(async([k,url])=>{if(!SOURCES[k]){const im=new Image();im.src=url;await im.decode();SOURCES[k]=im;}}));
  for(const [key,im]of Object.entries(SOURCES)){
    if(key.startsWith('bud_'))sprite(key,126,150,g=>g.drawImage(im,0,0,126,150),63,135.9375);
    else if(key.startsWith('flower_')&&key!=='flower_root')installFlower(sprite,key.slice(7),im);
    else if(key!=='flower_root')imageSprite(key,im);
  }
  sprite('flower_leaves',116,65.25,g=>g.drawImage(SOURCES.flower_root,0,0,116,65.25),58,52.5625);
  vinePainter.install();
  interactionFX.install();
  let endIcon=null;
  if(S.endIcon){try{const im=new Image();im.src=S.endIcon;await im.decode();endIcon='end_icon_'+hash(S.endIcon);imageSprite(endIcon,im);}catch{}}
  const colors={top:S.bgTop||'#72b945',mid:S.bgMid||'#54a437',bottom:S.bgBottom||'#216f25',tile:S.tileColor||'#d59c69',frame:S.frameColor||'#f2ce7d',theme:S.theme||'reference'};
  const sig=hash(JSON.stringify(colors));
  STYLE={sig,bg:'background_'+sig,tile:'soil_'+hash(colors.tile),frame:colors.frame,endIcon};
  sprite(STYLE.bg,720,1600,g=>{const p=g.createLinearGradient(0,0,620,1600);p.addColorStop(0,colors.top);p.addColorStop(.47,colors.mid);p.addColorStop(1,colors.bottom);g.fillStyle=p;g.fillRect(0,0,720,1600);
    g.drawImage(SOURCES.grass_background,0,0,720,1600);
    if(colors.top!=='#72b945'||colors.mid!=='#54a437'||colors.bottom!=='#216f25'){g.globalAlpha=.55;g.fillStyle=p;g.fillRect(0,0,720,1600);g.globalAlpha=1;}
  });
  sprite(STYLE.tile,118,97,g=>{g.drawImage(SOURCES.soil,0,0,118,97);if(colors.tile.toLowerCase()!=='#d59c69'){g.globalCompositeOperation='source-atop';g.globalAlpha=.55;g.fillStyle=colors.tile;g.fillRect(0,0,118,97);g.globalAlpha=1;g.globalCompositeOperation='source-over';}});
  STYLE.beds = installSoilSurfaces(sprite, STYLE.tile, A[STYLE.tile].c);
  sprite('grass_clump',75,80,g=>{g.save();g.filter='blur(3px)';g.fillStyle='rgba(18,76,18,.23)';g.beginPath();g.ellipse(39,67,27,9,0,0,TAU);g.fill();g.restore();drawLeaf(g,29,45,14,48,-.28,'#80c745');drawLeaf(g,46,54,13,35,.33,'#75be3a');drawLeaf(g,21,59,12,24,-.65,'#6fb139');});
  sprite('bush',270,260,g=>{g.save();g.filter='blur(4px)';g.shadowColor='rgba(11,78,19,.35)';g.shadowBlur=12;g.shadowOffsetY=11;const p=g.createRadialGradient(77,67,8,140,139,145);p.addColorStop(0,'#9fdb6a');p.addColorStop(.45,'#5aba4f');p.addColorStop(1,'#269332');g.fillStyle=p;g.beginPath();g.ellipse(124,135,114,104,-.3,0,TAU);g.fill();g.restore();});
  sprite('small_flower',50,50,g=>{for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5,x=25+Math.cos(a)*10,y=25+Math.sin(a)*10;g.fillStyle=gradient(g,y-8,y+9,'#ffc9e8','#ef83ba');g.beginPath();g.ellipse(x,y,8,9,a,0,TAU);g.fill();}g.fillStyle='#ffe578';g.beginPath();g.arc(25,25,6,0,TAU);g.fill();});
  sprite('butterfly',54,44,g=>{g.save();g.shadowColor='rgba(50,82,25,.16)';g.shadowBlur=2;g.fillStyle='#effff2';g.beginPath();g.ellipse(16,18,10,15,-.4,0,TAU);g.fill();g.beginPath();g.ellipse(36,18,10,15,.4,0,TAU);g.fill();g.strokeStyle='#2d4018';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(26,9);g.lineTo(27,32);g.stroke();g.restore();});
  sprite('bee',52,44,g=>{g.save();g.fillStyle='rgba(255,247,174,.8)';g.beginPath();g.ellipse(16,13,10,14,-.6,0,TAU);g.fill();g.beginPath();g.ellipse(36,13,10,14,.6,0,TAU);g.fill();g.fillStyle='#ffdc54';g.beginPath();g.ellipse(26,27,15,12,0,0,TAU);g.fill();g.strokeStyle='#6a5225';g.lineWidth=4;g.beginPath();g.moveTo(24,17);g.lineTo(26,36);g.stroke();g.restore();});
  sprite('cream_button',96,104,(g,w,h)=>card(g,w,h,28));
  sprite('stat_card',312,122,(g,w,h)=>{g.save();g.shadowColor='rgba(46,74,18,.4)';g.shadowBlur=3;g.shadowOffsetY=8;rr(g,0,0,w,h-6,31);g.fillStyle='#447f27';g.fill();g.shadowColor='transparent';card(g,w,h-2,29);g.restore();});
  sprite('stat_glow',354,152,(g,w,h)=>{g.save();g.shadowColor='rgba(255,231,87,.6)';g.shadowBlur=11;g.lineWidth=7;g.strokeStyle='#ffe797';rr(g,9,9,w-18,h-27,36);g.stroke();g.shadowColor='transparent';g.lineWidth=5;g.strokeStyle='#d9ac32';rr(g,17,17,w-34,h-43,30);g.stroke();g.restore();});
  sprite('seed',57,75,g=>{g.save();g.shadowColor='rgba(96,72,13,.2)';g.shadowBlur=3;g.shadowOffsetY=3;g.beginPath();g.moveTo(30,1);g.bezierCurveTo(24,19,4,33,5,51);g.bezierCurveTo(4,78,51,81,53,52);g.bezierCurveTo(54,34,38,16,30,1);const p=g.createLinearGradient(4,22,53,66);p.addColorStop(0,'#ffe398');p.addColorStop(.35,'#e7bb55');p.addColorStop(.7,'#bd8a2d');p.addColorStop(1,'#9e671f');g.fillStyle=p;g.fill();g.restore();},28.5,37.5);
  sprite('seed_badge',38,38,g=>{g.fillStyle='#f8ffe5';g.beginPath();g.arc(19,19,18,0,TAU);g.fill();g.fillStyle='#479b44';g.beginPath();g.arc(19,19,14,0,TAU);g.fill();g.strokeStyle='#fffbd9';g.lineWidth=2.4;g.lineJoin='round';g.beginPath();g.moveTo(19,9);g.lineTo(29,19);g.lineTo(19,29);g.lineTo(9,19);g.closePath();g.stroke();g.beginPath();g.moveTo(19,10);g.lineTo(19,28);g.moveTo(10,19);g.lineTo(28,19);g.stroke();});
  sprite('seed_root',54,62,g=>{const p=g.createRadialGradient(20,22,2,28,30,24);p.addColorStop(0,'#ffe08a');p.addColorStop(.4,'#dcb64d');p.addColorStop(1,'#976222');g.save();g.shadowColor='rgba(61,81,13,.35)';g.shadowBlur=4;g.shadowOffsetY=4;g.fillStyle=p;g.beginPath();g.ellipse(27,30,21,25,-.12,0,TAU);g.fill();g.restore();});
  sprite('booster_cream',126,140,(g,w,h)=>{g.fillStyle='#ddd8bd';g.beginPath();g.ellipse(w/2,h/2+4,60,62,0,0,TAU);g.fill();g.fillStyle='#fffbe3';g.beginPath();g.ellipse(w/2,h/2-5,60,60,0,0,TAU);g.fill();});
  sprite('booster_locked',126,140,(g,w,h)=>{g.fillStyle='#bdbba6';g.beginPath();g.ellipse(w/2,h/2+4,60,62,0,0,TAU);g.fill();g.fillStyle='#d8d6bd';g.beginPath();g.ellipse(w/2,h/2-5,60,60,0,0,TAU);g.fill();});
  sprite('booster_hint',126,140,(g,w,h)=>{g.fillStyle='#d3af46';g.beginPath();g.ellipse(w/2,h/2+4,60,62,0,0,TAU);g.fill();g.fillStyle=gradient(g,6,130,'#fff2a1','#ffe37b');g.beginPath();g.ellipse(w/2,h/2-5,60,60,0,0,TAU);g.fill();});
  sprite('booster_water',126,140,(g,w,h)=>{g.fillStyle='#91c2ca';g.beginPath();g.ellipse(w/2,h/2+4,60,62,0,0,TAU);g.fill();g.fillStyle=gradient(g,6,130,'#e6ffff','#c3edff');g.beginPath();g.ellipse(w/2,h/2-5,60,60,0,0,TAU);g.fill();});
  sprite('badge',49,52,g=>{g.fillStyle='#bf3936';g.beginPath();g.ellipse(24,27,23,24,0,0,TAU);g.fill();g.fillStyle=gradient(g,0,45,'#ff7c70','#ed514a');g.beginPath();g.ellipse(24,23,23,23,0,0,TAU);g.fill();});
  sprite('icon_lock',42,51,g=>{g.fillStyle='#95907a';rr(g,8,22,28,26,6);g.fill();g.strokeStyle='#95907a';g.lineWidth=6;g.beginPath();g.arc(22,22,9,Math.PI,0);g.stroke();});
  for(const kind of ['gear','reset','undo','hint','water'])sprite('icon_'+kind,76,76,g=>{g.strokeStyle='#26330e';g.fillStyle='#26330e';g.lineWidth=6;g.lineCap='round';g.lineJoin='round';
    if(kind==='gear'){g.save();g.translate(38,38);g.beginPath();for(let i=0;i<32;i++){const a=i/32*TAU,r=i%4===0||i%4===3?27:20;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.stroke();g.beginPath();g.arc(0,0,9,0,TAU);g.stroke();g.restore();}
    else if(kind==='hint'){g.lineWidth=7;g.beginPath();g.moveTo(27,49);g.bezierCurveTo(27,41,18,38,18,25);g.bezierCurveTo(18,4,59,2,59,26);g.bezierCurveTo(59,39,49,43,49,51);g.lineTo(27,51);g.stroke();g.beginPath();g.moveTo(28,58);g.lineTo(49,58);g.moveTo(32,65);g.lineTo(45,65);g.stroke();}
    else if(kind==='water'){g.lineWidth=5;rr(g,19,31,36,29,7);g.stroke();g.beginPath();g.moveTo(54,44);g.lineTo(69,29);g.lineTo(73,35);g.lineTo(55,56);g.moveTo(19,39);g.bezierCurveTo(1,35,2,59,20,55);g.moveTo(30,30);g.lineTo(35,19);g.lineTo(48,19);g.stroke();}
    else{g.lineWidth=7;g.beginPath();if(kind==='reset'){g.arc(37,37,23,-2.7,2.9);g.stroke();g.beginPath();g.moveTo(15,11);g.lineTo(16,30);g.lineTo(34,28);g.stroke();}else{g.moveTo(14,29);g.lineTo(48,29);g.bezierCurveTo(76,28,75,64,47,64);g.lineTo(35,64);g.moveTo(15,29);g.lineTo(32,12);g.moveTo(15,29);g.lineTo(32,45);g.stroke();}}});
  sprite('preview_line',20,128,g=>{g.strokeStyle='rgba(255,255,234,.83)';g.lineWidth=6;g.lineCap='round';g.setLineDash([15,15]);g.beginPath();g.moveTo(10,0);g.lineTo(10,128);g.stroke();});
  sprite('preview_cell',118,97,g=>{rr(g,3,2,112,91,15);g.fillStyle='rgba(255,255,238,.23)';g.fill();});
  sprite('ring',120,120,g=>{g.strokeStyle='rgba(255,255,245,.96)';g.lineWidth=6;g.beginPath();g.arc(60,60,44,0,TAU);g.stroke();});
  sprite('hint_ring',120,120,g=>{g.save();g.shadowColor='#ffe988';g.shadowBlur=10;g.lineWidth=7;g.strokeStyle='#fff3a3';g.beginPath();g.arc(60,60,43,0,TAU);g.stroke();g.restore();});
  sprite('tap_ring',120,120,g=>{g.strokeStyle='#fffde3';g.lineWidth=6;g.beginPath();g.arc(60,60,48,0,TAU);g.stroke();});
  sprite('missed_flower',120,120,g=>{g.strokeStyle='rgba(255,238,221,.9)';g.lineWidth=8;g.beginPath();g.arc(60,60,47,0,TAU);g.stroke();g.strokeStyle='#ee6150';g.lineWidth=5;g.stroke();});
  sprite('blocked_cross',66,66,g=>{g.lineCap='round';for(const [w,c]of[[11,'#fff1ce'],[7,'#ec5747']]){g.lineWidth=w;g.strokeStyle=c;g.beginPath();g.moveTo(15,15);g.lineTo(51,51);g.moveTo(51,15);g.lineTo(15,51);g.stroke();}});
  sprite('helper_medallion',222,222,g=>{g.save();g.shadowColor='#ffe881';g.shadowBlur=15;g.fillStyle='#fff0a5';g.beginPath();g.arc(111,111,103,0,TAU);g.fill();g.shadowColor='transparent';g.fillStyle='#fffef4';g.beginPath();g.arc(111,111,91,0,TAU);g.fill();g.restore();});
  sprite('spark',22,22,g=>{g.fillStyle='#fffbd8';g.beginPath();g.moveTo(11,0);g.lineTo(14,8);g.lineTo(22,11);g.lineTo(14,14);g.lineTo(11,22);g.lineTo(8,14);g.lineTo(0,11);g.lineTo(8,8);g.closePath();g.fill();});
  sprite('veil',720,1600,g=>{g.fillStyle='rgba(21,46,7,.34)';g.fillRect(0,0,720,1600);});
  sprite('next_button',344,118,(g,w,h)=>{g.save();g.shadowColor='rgba(91,55,15,.16)';g.shadowBlur=4;g.shadowOffsetY=4;rr(g,0,8,w,h-8,32);g.fillStyle='#b93131';g.fill();g.shadowColor='transparent';rr(g,0,0,w,h-15,32);g.fillStyle=gradient(g,0,h,'#f55e55','#e4433e');g.fill();g.strokeStyle='rgba(255,190,159,.55)';g.lineWidth=5;rr(g,4,3,w-8,h-22,28);g.stroke();g.restore();});
  sprite('gift',65,72,g=>{g.fillStyle='#ef9fba';rr(g,9,30,49,40,3);g.fill();g.fillStyle='#ffcf6c';g.fillRect(28,25,12,45);g.fillRect(7,28,54,12);g.strokeStyle='#f8d47f';g.lineWidth=7;g.beginPath();g.moveTo(34,30);g.bezierCurveTo(7,26,13,4,28,16);g.lineTo(34,30);g.bezierCurveTo(51,5,65,22,34,30);g.stroke();});
  return A;
}

export function boardLayout(L,S={}){
  const cols=L.cols||5,rows=L.rows||5,scale=+S.boardScale||1;
  const innerW=cols===5?590:Math.min(604,cols*118),cellW=innerW/cols,k=cellW/118,cellH=96*k;
  const fh=(rows*96+132)*k,fy=(+S.boardY||910)-(rows>=7?7:0)-fh/2,fx=18;
  const raw={x:360-innerW/2,y:fy+49*k,w:innerW,h:rows*cellH,cellW,cellH};
  const centreX=360,centreY=+S.boardY||910;
  const x=centreX+(raw.x-centreX)*scale,y=centreY+(raw.y-centreY)*scale;
  return{x,y,w:raw.w*scale,h:raw.h*scale,cellW:cellW*scale,cellH:cellH*scale,k:k*scale,
    frame:{x:centreX+(fx-centreX)*scale,y:centreY+(fy-centreY)*scale,w:684*scale,h:fh*scale},
    cx:c=>x+(c+.5)*cellW*scale,cy:r=>y+(r+.5)*cellH*scale};
}

function frameSprite(layout,S){
  const f=layout.frame,key='garden_frame_'+hash([f.w,f.h,S.frameColor||'#f2ce7d',STYLE.sig].join('|'));
  return sprite(key,f.w,f.h,g=>{const w=f.w,h=f.h,c=S.frameColor||'#f2ce7d';
    rr(g,48,48,w-94,h-122,20);g.fillStyle='#b88252';g.fill();
    const sx=[0,50,636,684],sy=[0,51,536,615],dx=[0,50,w-48,w],dy=[0,51,h-79,h];
    for(let r=0;r<3;r++)for(let j=0;j<3;j++)g.drawImage(SOURCES.frame_art,sx[j],sy[r],sx[j+1]-sx[j],sy[r+1]-sy[r],dx[j],dy[r],dx[j+1]-dx[j],dy[r+1]-dy[r]);
    if(c!=='#f2ce7d'){g.globalCompositeOperation='source-atop';g.globalAlpha=.36;g.fillStyle=c;g.fillRect(0,0,w,h);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
  });
}

export function composeFrame({L,ST,S={},time=0,ui={},hand=null}){
  pruneGardenBrushes(ui,time);
  const items=[],hits=[],layout=boardLayout(L,S),k=layout.k,numeric=Number(L.id)||2;
  const moving=interactionFX.enabled(S);
  const entryAge=moving && !ST.used && !ST.bloomed?.length ? time-(ui.enteredAt??-Infinity) : Infinity;
  items.push(item('background',STYLE.bg||'background',360,800,1,1,0,1,0));
  const T=S.bgMotion===false?0:time;
  items.push(item('bush_right','bush_right',663,387.5,1,1,0,1,1),item('bush_left','bush_left',17,288.5,1,1,0,1,1));
  for(const [i,x,y,s,r]of[[2,-79,1392,.9,-.2],[3,761,1455,.9,.2]])items.push(item('bush_'+i,'bush',x,y,s,s,r,1,1));
  const grass=[[418,154,.73],[237,410,.83],[425,423,1],[578,381,1.07],[338,1280,1],[520,1259,1.1],[673,1280,1]];
  grass.forEach(([x,y,s],i)=>items.push(item('grass_'+i,'tuft_art',x,y,s,s,Math.sin(T*.8+i)*.025,1,2)));
  [[75,504,.8],[522,507,.75]].forEach(([x,y,s],i)=>items.push(item('wildflower_'+i,'small_flower',x,y,s,s,Math.sin(T+i)*.04,1,3)));
  if(S.bgMotion!==false){items.push(item('butterfly','butterfly',215+125*Math.sin(T*.37),455+55*Math.sin(T*.51),.65,.65,Math.sin(T)*.3,1,75));items.push(item('bee','bee',450+120*Math.sin(T*.45+1),880+85*Math.sin(T*.62),.67,.67,-.2+Math.sin(T*.6)*.2,1,75));}
  const frame=frameSprite(layout,S),f=layout.frame;items.push(item('garden_frame',frame,f.x+f.w/2,f.y+f.h/2,1,1,0,1,10));
  for(let r=0;r<L.rows;r++)for(let c=0;c<L.cols;c++){
    if(L.mask&&!L.mask[r*L.cols+c])continue;
    const pressed=moving&&!ui.pressed?.hit&&ui.pressed?.c===c&&ui.pressed?.r===r;
    const bed = STYLE.beds[soilVariant(c, r)];
    const enter=entrancePose(entryAge,c,r,layout,L);
    items.push(item(`soil_${c}_${r}`,bed,layout.cx(c),layout.cy(r)+(pressed?3*k:0)+(enter?.y??0),
      layout.cellW/118*(pressed ? .985 : 1)*(enter?.sx??1),
      layout.cellH/97*(pressed ? .965 : 1)*(enter?.sy??1),0,enter?.op??1,20));
  }
  for(let i=0;i<(ST.vines||[]).length;i++)vinePainter.compose({v:ST.vines[i],index:i,layout,L,S,time,items,motion:moving});
  if(moving&&ui.brushes) for(const leaf of items){
    if(leaf.id.startsWith('vine_leaf_')&&ui.brushes[leaf.id]) leaf.rot+=.31*brushBend(ui.brushes[leaf.id],time);
  }
  for(let i=0;i<(ST.moves||[]).length;i++){
    const m=ST.moves[i],age=Math.max(0,time-(m.time||0)),moving=interactionFX.enabled(S),land=clamp((age-.18)/.25),squash=moving?Math.sin(land*Math.PI):0,bounce=squash*7*k,sc=k*(.7+.3*easeOut(age/.2));
    items.push(item('seed_shadow_'+i,'plant_shadow_polished',layout.cx(m.c),layout.cy(m.r)+6*k,k*.55,k*.55,0,.70,38));
    items.push(item('seed_'+i,'vine_gold_joint',layout.cx(m.c),layout.cy(m.r)-15*k-Math.max(0,1-age/.18)*35*k-bounce,sc*.91*(1+squash*.05),sc*.91*(1-squash*.04),moving?Math.sin(land*Math.PI*2)*.045:0,1,39));
  }
  for(const fl of L.flowers||[]){
    const color=['pink','purple','blue','orange','white'].includes(fl.color)?fl.color:'pink',opened=(ST.bloomed||[]).includes(fl.id),at=ST.bloomTimes?.[fl.id]??-100;
    const arrived=opened&&time>=at;
    const p=arrived?(moving?clamp((time-at)/((+S.bloomMs||350)/1000)):1):0,sc=k*(+S.flowerScale||1),x=layout.cx(fl.c),y=layout.cy(fl.r);
    const enter=entrancePose(entryAge,fl.c,fl.r,layout,L,true);
    const opacity=enter?.op??1, entryY=enter?.y??0;
    items.push(item(fl.id+'_shadow','plant_shadow_polished',x,y+3*k,k*.70*(enter?.sx??1),k*.70,0,.72*opacity,38));
    const brush=ui.brushes?.[fl.id],pose=flowerPose(fl,time,moving,brush);
    const sway=pose.stem;
    const budAmount=1-clamp((p-.08)/.48);
    if(budAmount>0)items.push(item(fl.id+'_bud','bud_'+color,x,y+entryY,
      sc*(1-p*.14)*(1+pose.breath)*(enter?.sx??1),sc*(1-p*.22)*(1+pose.breath)*(enter?.sy??1),
      sway+Math.sin(p*Math.PI*2)*.035,budAmount*opacity,50));
    if(p>0){
      const roots=easeOut(p/.72),settle=Math.sin(p*TAU)*.045*(1-p);
      items.push(item(fl.id+'_leaves','flower_leaves',x,y,sc*(.62+.38*roots),sc*(.62+.38*roots),pose.leaves-settle,clamp(p*3),49));
      const tilt=pose.face+settle+Math.sin(fl.c*2.1+fl.r*.93)*.075;
      const flowerX=x+Math.sin(sway+settle)*43*sc;
      composeFlower({item,items,id:fl.id,color,x:flowerX,
        y:y-39*k-(1-easeOut(p))*(64*sc-39*k),scale:sc*(1+pose.breath),rotation:tilt,progress:p});
      interactionFX.bloom({fl,x:flowerX,y,k,time,at,S,items});
    }
  }
  const prev=ui.preview;
  if(prev&&S.showPreview!==false&&!ui.helper){
    paintAimPreview({preview:previewPlant(L,ST,prev.c,prev.r),origin:prev,level:L,state:ST,ui,
      settings:S,time,moving:interactionFX.enabled(S),layout,items,assets:A,sprite,item});
  }
  if(ui.hint){const sc=k*(.85+(interactionFX.enabled(S)?.06*Math.sin(time*6):0));items.push(item('hint','hint_ring',layout.cx(ui.hint.c),layout.cy(ui.hint.r),sc,sc,0,1,67));}
  if(ST.status==='lost'){
    for(const f of L.flowers||[])if(!(ST.bloomed||[]).includes(f.id))items.push(item('missed_'+f.id,'missed_flower',layout.cx(f.c),layout.cy(f.r)-39*k,k*.94,k*.94,0,1,69));
    const prior=new Set(),marked=new Set(),key=(c,r)=>c+','+r;
    for(const [mi,m]of(ST.moves||[]).entries()){
      const rays=(ST.vines||[]).filter(v=>v.c1===m.c&&v.r1===m.r);
      for(const [dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){let c=m.c+dx,r=m.r+dy;
        while(c>=0&&r>=0&&c<L.cols&&r<L.rows&&(!L.mask||L.mask[r*L.cols+c])&&!prior.has(key(c,r))){c+=dx;r+=dy;}
        const at=key(c,r);if(prior.has(at)&&!marked.has(at)){marked.add(at);items.push(item('blocked_'+mi+'_'+at,'blocked_cross',layout.cx(c),layout.cy(r)-12*k,k*.8,k*.8,0,1,70));}
      }
      prior.add(key(m.c,m.r));for(const v of rays){let c=v.c1,r=v.r1;const dx=Math.sign(v.c2-c),dy=Math.sign(v.r2-r);for(let n=0;n<30;n++){prior.add(key(c,r));if(c===v.c2&&r===v.r2)break;c+=dx;r+=dy;}}
    }
  }

  if(S.showHud!==false){
    items.push(item('gear_button','cream_button',74,145,1,1,0,1,80),item('gear','icon_gear',74,140,.85,.85,0,1,81));
    items.push(item('reset_button','cream_button',646,145,1,1,0,1,80),item('reset','icon_reset',646,140,.85,.85,0,1,81));
    hits.push({id:'gear',x:28,y:94,w:94,h:101},{id:'reset',x:599,y:94,w:94,h:101});
    addText(items,'level',/^\d+$/.test(String(L.id))?`Level ${L.id}`:(L.title||'My garden'),360,141,47,'#fffde6',82,{shadow:true});
    items.push(item('seeds_card','stat_card',190,265,1,1,0,1,80),item('flowers_card','stat_card',530,265,1,1,0,1,80));
    const displayed=(ST.bloomed||[]).map(id=>ST.bloomTimes?.[id]??-100).filter(at=>time>=at+.10),flowerDone=displayed.length,lastBloom=displayed.length?Math.max(...displayed)+.10:-100;
    if(ST.used>=L.seeds&&flowerDone===(L.flowers||[]).length)items.push(item('flowers_active','stat_glow',530,265,.92,.92,0,1,81));
    else if([3,10].includes(numeric)&&ST.used===0)items.push(item('seeds_active','stat_glow',190,265,.92,.92,0,1,81));
    addText(items,'seeds_label','SEEDS',190,225,23,'#5b5c3e');addText(items,'flowers_label','FLOWERS',530,225,23,'#5b5c3e');
    const n=Math.min(4,L.seeds||1),seedX=n===1?146:n===2?113:n===3?98:76,gap=n>=3?54:61;
    for(let i=0;i<n;i++){const used=i<ST.used,sc=n>=3?.75:.86;items.push(item('seed_hud_'+i,'seed',seedX+i*gap,277,sc,sc,0,used?.15:1,82));items.push(item('seed_badge_'+i,'seed_badge',seedX+i*gap+17,300,n>=3?.72:.83,n>=3?.72:.83,0,used?.15:1,83));}
    addText(items,'seed_count',`${ST.used||0}/${L.seeds}`,n>=3?274:240,278,n>=3?42:48,'#22310d');
    const countPulse=interactionFX.enabled(S)?Math.sin(clamp((time-lastBloom)/.22)*Math.PI):0;
    items.push(item('flower_hud','bud_pink',485,297,.5*(1+countPulse*.07),.5*(1+countPulse*.07),countPulse*.08,1,82));addText(items,'flower_count',`${flowerDone}/${(L.flowers||[]).length}`,557,278,48,'#22310d');items[items.length-1].sx*=1+countPulse*.08;items[items.length-1].sy*=1+countPulse*.08;
  }
  const tutorial=S.showTutorial!==false&&!ST.used?L.hintText:'';
  const message=ui.message||(ST.status==='lost'?'Still stuck — undo one more seed.':tutorial);
  if(message){
    const txt=String(message).replace('aim. Slide off','aim. Slide\noff'),lines=txt.split('\n'),tkey=textAsset(txt,lines.length>1?31:30,'#2a3517',{lineHeight:1.05});
    const tw=numeric===2&&tutorial?678:Math.min(678,Math.max(350,A[tkey].w+100)),th=lines.length>1?105:73,bkey='tip_'+tw+'_'+th;
    sprite(bkey,tw,th,(g,w,h)=>card(g,w,h,30));items.push(item('tutorial_background',bkey,360,334+th/2,1,1,0,1,84));
    const scale=Math.min(1,(tw-34)/A[tkey].w);items.push(item('tutorial_text',tkey,360,328+th/2,scale,scale,0,1,85));
  }
  if(S.showBoosters!==false){
    const specs=[['undo',4,ui.undoCount??S.undoCount??3],['hint',7,ui.hintCount??S.hintCount??1],['water',12,ui.waterCount??S.waterCount??2],['locked',18,0]];
    specs.forEach(([id,unlock,count],i)=>{const x=118+i*162,y=1484,on=(numeric>=unlock||S.unlockBoosters)&&id!=='locked',bg=!on?'booster_locked':id==='hint'?'booster_hint':id==='water'?'booster_water':'booster_cream';
      items.push(item('booster_'+id,bg,x,y,1,1,0,1,81));items.push(item('booster_icon_'+id,'icon_'+(on?id:'lock'),x,y-6,on?.85:.9,on?.85:.9,0,on?1:.9,82));
      addText(items,'booster_label_'+id,on?({undo:'Undo',hint:'Hint',water:'Watering can'}[id]):`Lv. ${unlock}`,x,1566,id==='water'&&on?20:27,'#fffce1',83,{shadow:true});
      if(on){items.push(item('booster_badge_'+id,'badge',x+45,y-51,1,1,0,count?1:.55,84));addText(items,'booster_count_'+id,String(count),x+45,y-54,27,'#fffbe5',85);hits.push({id,x:x-63,y:y-67,w:126,h:145});}
      if(on&&id==='water'&&ui.waterMode)items.push(item('booster_water_selected','fx_focus_water',x,y,1.20,1.40,0,.9,83));
    });
  }

  const won=ST.status==='won'&&time-(ui.winAt??time)>=(+S.winDelay||0)/1000;
  if(S.tapRipple&&ui.tap){const p=(time-ui.tap.time)/.55;if(p>=0&&p<1){const sc=.2+p*.82;items.push(item('tap_ripple','tap_ring',ui.tap.x,ui.tap.y,sc,sc,0,(1-p)*.8,88));}}
  if(won&&!ui.hideWin&&!ui.endMode){
    items.push(item('win_veil','veil',360,800,1,1,0,1,90));
    const rich=numeric>=4,y=rich?587:692,h=rich?592:390,cardKey='win_card_'+h;
    sprite(cardKey,622,h,(g,w,hh)=>card(g,w,hh,46,'#fffce9','#fdf8e1','#ddd2b0'));
    const winPop=easeOut((time-(ui.winAt||time)-(+S.winDelay||0)/1000)/.22),scale=.92+.08*winPop;
    items.push(item('end_card',cardKey,360,y+h/2,scale,scale,0,1,92));
    items.push(item('bouquet','bouquet',360,y-25,1,1,0,1,94));
    addText(items,'win_level',`LEVEL ${/^\d+$/.test(String(L.id))?L.id:'✓'}`,360,y+130,26,'#667045',95);
    addText(items,'win_title',numeric===2||numeric===3||numeric===11?'In full bloom!':numeric%2?'Flower magic!':'What a garden!',360,y+190,52,'#368f2b',95);
    if(rich){addText(items,'basket_label','SEED BASKET',360,y+257,25,'#60663b',95);
      for(let i=0;i<4;i++)items.push(item('win_seed_'+i,'seed',261+i*53,y+328,.65,.65,0,i<(numeric-3)%5?1:.16,95));
      items.push(item('win_gift','gift',525,y+330,.7,.7,0,.72,95));
      addText(items,'basket_progress',`${5-((numeric-3)%5)} more wins for a gift`,360,y+397,27,'#63683d',95);
    }
    const by=rich?y+h-88:y+h-94;items.push(item('next_button','next_button',360,by,1,1,0,1,95));addText(items,'next_text','Next garden',360,by-5,38,'#fffbe7',96,{shadow:true,shadowColor:'rgba(150,55,32,.13)'});
    hits.length=0;hits.push({id:'next',x:188,y:by-59,w:344,h:118});
  }
  if(ui.endMode&&S.endCard!==false){
    items.push(item('end_veil','veil',360,800,1,1,0,1,150));
    const cardKey='final_end_card';sprite(cardKey,622,664,(g,w,h)=>card(g,w,h,46,'#fffce9','#fdf8e1','#ddd2b0'));
    items.push(item('final_end_card',cardKey,360,830,1,1,0,1,152));
    const icon=STYLE.endIcon||'bouquet',a=A[icon],sc=Math.min(220/a.w,220/a.h);
    items.push(item('final_end_icon',icon,360,625,sc,sc,0,1,154));
    fitText(items,'final_end_title',S.endTitle||'Let your garden bloom!',360,821,46,'#368f2b',536,155);
    addText(items,'final_end_caption','A little seed. A beautiful garden.',360,894,26,'#6b7348',155);
    items.push(item('final_cta','next_button',360,1040,1.25,1,0,1,155));
    fitText(items,'final_cta_text',S.endButton||'Play now',360,1034,38,'#fffbe7',390,156,{shadow:true});
    hits.length=0;hits.push({id:'cta',x:145,y:981,w:430,h:118});
  }
  if(['undo','hint','water'].includes(ui.helper)){
    const id=ui.helper,info={undo:['Undo','Takes back your last seed\nso you can try another way.','+3 free'],hint:['Hint','Shows the cell for a right move.','+1 free'],water:['Watering can','Water any bud and\nit blooms right away.','+2 free']}[id];
    items.push(item('helper_veil','veil',360,800,1,1,0,1,170));
    sprite('helper_card',570,736,(g,w,h)=>card(g,w,h,48,'#fffce9','#fdf8e1','#ddd2b0'));
    items.push(item('helper_card','helper_card',360,848,1,1,0,1,172));
    addText(items,'helper_header','NEW HELPER',360,540,26,'#677044',174);
    items.push(item('helper_medallion','helper_medallion',360,676,1,1,0,1,174));
    items.push(item('helper_icon',id==='water'?'watering_can':'icon_'+id,360,674,id==='water'?1:1.35,id==='water'?1:1.35,0,1,175));
    fitText(items,'helper_title',info[0],360,828,52,'#273410',510,175);
    fitText(items,'helper_description',info[1],360,919,30,'#5c633e',510,175,{lineHeight:1.25});
    addText(items,'helper_grant',info[2],360,1008,36,'#e65e55',175);
    items.push(item('helper_try_button','next_button',360,1115,.61,.96,0,1,175));
    addText(items,'helper_try_text','Try it',360,1109,38,'#fffbe7',176);
    hits.length=0;hits.push({id:'helper',x:255,y:1057,w:210,h:114});
  }
  interactionFX.compose({layout,L,ST,S,time,ui,items,hits,A});
  items.sort((a,b)=>a.z-b.z);
  return{items,hits,layout};
}

export function drawScene(ctx,items,assets=A){
  ctx.clearRect(0,0,DW,DH);
  for(const it of items){const a=assets[it.asset];if(!a||!it.a||it.op<=0)continue;ctx.save();ctx.globalAlpha=clamp(it.op);ctx.translate(it.x,it.y);if(it.rot)ctx.rotate(it.rot);ctx.scale(it.sx??1,it.sy??1);ctx.drawImage(a.c,-a.ax,-a.ay,a.w,a.h);ctx.restore();}
}
