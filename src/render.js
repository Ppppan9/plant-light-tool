// 花候图志 · Canvas、录制、AE 和 3D 使用同一套独立图层。
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
import FLOWER_ROOT from './art-assets/polished/leaf-root.webp';
import {createVinePainter} from './botanical.js';
import {installFlower,composeFlower} from './flower-bloom.js';
import {createInteractionFX} from './interaction-fx.js';
import {preview as previewPlant} from './core.js';
import {paintAimPreview} from './aim-preview.js';
import {brushBend, entrancePose, flowerPose, pruneGardenBrushes} from './garden-life.js';
import {installAtlasScene,composeAtlasBackdrop,atlasFrameSprite} from './atlas-scene.js';
import {ATLAS_FONTS,installAtlasHud,composeAtlasHud} from './atlas-hud.js';
import {soilVariant} from './garden-soil.js';

export const DW=720,DH=1600;
const TAU=Math.PI*2, A={}, SOURCES={};
let STYLE={};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const easeOut=t=>1-(1-clamp(t))**3;
function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return(n>>>0).toString(36);}
function sprite(key,w,h,draw,ax=w/2,ay=h/2){if(A[key])return key;const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*2));c.height=Math.max(1,Math.ceil(h*2));const g=c.getContext('2d');g.scale(2,2);draw(g,w,h);A[key]={c,w,h,ax,ay};return key;}
function imageSprite(key,img,ax=img.width/2,ay=img.height/2){if(A[key])return key;const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);A[key]={c,w:img.width,h:img.height,ax,ay};return key;}
function textAsset(text,size=30,color='#f5edd8',opts={}){
  const key='text_'+hash(JSON.stringify([text,size,color,opts]));if(A[key])return key;
  const font=`${opts.weight||580} ${size}px ${ATLAS_FONTS[opts.face]||ATLAS_FONTS.text}`;
  const m=document.createElement('canvas').getContext('2d');m.font=font;
  const lines=String(text).split('\n'),lh=size*(opts.lineHeight||1.13),w=Math.ceil(Math.max(...lines.map(s=>m.measureText(s).width))+16),h=Math.ceil(lh*lines.length+14);
  return sprite(key,w,h,g=>{g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
    lines.forEach((s,i)=>g.fillText(s,w/2,7+lh*(i+.5)));});
}
function addText(items,id,text,x,y,size=30,color='#f5edd8',z=82,opts={}){const k=textAsset(text,size,color,opts);items.push(item(id,k,x,y,1,1,0,1,z));}
function fitText(items,id,text,x,y,size,color,width,z=82,opts={}){const k=textAsset(text,size,color,opts),sc=Math.min(1,width/A[k].w);items.push(item(id,k,x,y,sc,sc,0,1,z));}
function item(id,asset,x,y,sx=1,sy=sx,rot=0,op=1,z=0){return{id,asset,a:true,x,y,sx,sy,rot,op:clamp(op),z};}
const vinePainter=createVinePainter({sprite,item});
const interactionFX=createInteractionFX({sprite,item});

export async function createAssets(S={}){
  const urls={bud_pink:BUD_PINK,bud_purple:BUD_PURPLE,bud_blue:BUD_BLUE,bud_orange:BUD_ORANGE,bud_white:BUD_WHITE,flower_pink:FLOWER_PINK,flower_purple:FLOWER_PURPLE,flower_blue:FLOWER_BLUE,flower_orange:FLOWER_ORANGE,flower_white:FLOWER_WHITE,flower_root:FLOWER_ROOT};
  await Promise.all(Object.entries(urls).map(async([k,url])=>{if(!SOURCES[k]){const im=new Image();im.src=url;await im.decode();SOURCES[k]=im;}}));
  for(const [key,im]of Object.entries(SOURCES)){
    if(key.startsWith('bud_'))sprite(key,126,150,g=>g.drawImage(im,0,0,126,150),63,135.9375);
    else if(key.startsWith('flower_')&&key!=='flower_root')installFlower(sprite,key.slice(7),im);
  }
  sprite('flower_leaves',116,65.25,g=>g.drawImage(SOURCES.flower_root,0,0,116,65.25),58,52.5625);
  vinePainter.install();
  let endIcon=null;
  if(S.endIcon){try{const im=new Image();im.src=S.endIcon;await im.decode();endIcon='end_icon_'+hash(S.endIcon);imageSprite(endIcon,im);}catch{}}
  STYLE={...installAtlasScene(sprite,S),endIcon};
  installAtlasHud(sprite);
  interactionFX.install();
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


export function composeFrame({L,ST,S={},time=0,ui={},hand=null}){
  pruneGardenBrushes(ui,time);
  const items=[],hits=[],layout=boardLayout(L,S),k=layout.k;
  const moving=interactionFX.enabled(S);
  const entryAge=moving && !ST.used && !ST.bloomed?.length ? time-(ui.enteredAt??-Infinity) : Infinity;
  composeAtlasBackdrop({items,item,style:STYLE,time,S,motion:moving});
  const frame=atlasFrameSprite(sprite,layout,S),f=layout.frame;
  items.push(item('garden_frame',frame,f.x+f.w/2,f.y+f.h/2,1,1,0,1,10));
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

  composeAtlasHud({L,ST,S,time,ui,items,hits,item,addText,fitText,moving,endIcon:STYLE.endIcon,assets:A});
  interactionFX.compose({layout,L,ST,S,time,ui,items,hits,A});
  items.sort((a,b)=>a.z-b.z);
  return{items,hits,layout};
}

export function drawScene(ctx,items,assets=A){
  ctx.clearRect(0,0,DW,DH);
  for(const it of items){const a=assets[it.asset];if(!a||!it.a||it.op<=0)continue;ctx.save();ctx.globalAlpha=clamp(it.op);ctx.translate(it.x,it.y);if(it.rot)ctx.rotate(it.rot);ctx.scale(it.sx??1,it.sy??1);ctx.drawImage(a.c,-a.ax,-a.ay,a.w,a.h);ctx.restore();}
}
