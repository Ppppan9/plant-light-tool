const INK='#123e41',DEEP='#0e3339',PAPER='#f5edd8',MINT='#b0dec8',RED='#b84d3e',MUTED='#7da998';
const circle=(g,x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);};
const line=(g,...p)=>{g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke();};
function stamp(g,w,h,cut=9){
  g.beginPath();g.moveTo(cut,1);g.lineTo(w-1,1);g.lineTo(w-1,h-cut);g.lineTo(w-cut,h-1);g.lineTo(1,h-1);g.lineTo(1,cut);g.closePath();
}
function reg(g,x,y,s=4){line(g,x-s,y,x+s,y);line(g,x,y-s,x,y+s);}
function plate(g,w,h,{fill=PAPER,edge=INK,big=false}={}){
  g.fillStyle=fill;stamp(g,w,h,big?18:8);g.fill();g.strokeStyle=edge;g.lineWidth=1.5;g.stroke();
  g.strokeStyle=edge;g.globalAlpha=.42;g.lineWidth=1;
  if(big){g.strokeRect(12.5,12.5,w-25,h-25);for(const x of [23,w-23])for(const y of [24,h-24])reg(g,x,y,4);}
  else {line(g,7,h-7,25,h-7);line(g,w-7,7,w-25,7);}
  g.globalAlpha=1;
}
function icon(g,kind){
  g.strokeStyle=MINT;g.fillStyle=MINT;g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
  if(kind==='gear'){
    for(const [x,y] of [[4,-13],[-8,0],[8,13]]){
      line(g,-19,y,x-4,y);line(g,x+4,y,19,y);circle(g,x,y,3.7);g.stroke();
    }
  }else if(kind==='sound'||kind==='mute'){
    line(g,-18,-5,-12,-5,-4,-13,-4,13,-12,5,-18,5,-18,-5);
    if(kind==='mute'){line(g,5,-6,16,6);line(g,16,-6,5,6);}
    else for(const r of [9,16]){g.beginPath();g.arc(-1,0,r,-.78,.78);g.stroke();}
  }else if(kind==='reset'){
    g.beginPath();g.arc(1,1,15,-2.45,2.62);g.stroke();line(g,-13,-18,-13,-9,-4,-9);
    g.lineWidth=1.6;line(g,1,-4,1,2,7,5);
  }else if(kind==='undo'){
    line(g,-18,-5,-6,-16);line(g,-18,-5,-6,5);
    g.beginPath();g.moveTo(-15,-5);g.lineTo(5,-5);g.bezierCurveTo(24,-5,22,15,7,17);g.lineTo(-2,17);g.stroke();
  }else if(kind==='hint'){
    circle(g,0,0,16);g.stroke();g.lineWidth=1.2;circle(g,0,0,13);g.stroke();
    g.fillStyle=MINT;g.beginPath();g.moveTo(9,-12);g.lineTo(3,4);g.lineTo(-8,11);g.lineTo(-3,-3);g.closePath();g.fill();
    g.strokeStyle=INK;line(g,-6,7,6,-8);
  }else if(kind==='water'){
    g.save();g.rotate(.66);g.beginPath();g.moveTo(-5,-15);g.lineTo(5,-15);g.lineTo(5,7);g.lineTo(0,15);g.lineTo(-5,7);g.closePath();g.stroke();
    g.fillRect(-8,-20,16,5);g.lineWidth=1.4;for(let y=-8;y<=3;y+=5)line(g,1,y,5,y);g.restore();
    g.beginPath();g.moveTo(-12,11);g.quadraticCurveTo(-20,22,-13,23);g.quadraticCurveTo(-6,23,-12,11);g.fill();
  }else if(kind==='lock'){
    g.strokeStyle=MUTED;g.lineWidth=2.3;g.strokeRect(-10,-1,20,15);g.beginPath();g.arc(0,-1,7,Math.PI,0);g.stroke();line(g,0,4,0,9);
  }else if(kind==='seed'){
    g.fillStyle='#d6ad69';g.strokeStyle='#edcc8e';g.lineWidth=1.2;g.beginPath();g.moveTo(-9,12);g.bezierCurveTo(-14,-3,-3,-13,10,-13);g.bezierCurveTo(12,-1,7,11,-9,12);g.fill();g.stroke();
    g.strokeStyle='#866e4f';line(g,-8,9,6,-8);
  }else if(kind==='flower'){
    g.lineWidth=1.8;for(let n=0;n<5;n++){g.save();g.rotate(n*Math.PI*2/5);g.beginPath();g.ellipse(0,-9,5.5,8,0,0,Math.PI*2);g.stroke();g.restore();}g.fillStyle='#e8ad84';circle(g,0,0,4);g.fill();
  }
}

export function installAtlasHud(sprite){
  sprite('atlas_header_rules',646,122,(g,w,h)=>{
    g.strokeStyle=MINT;g.lineWidth=1.2;g.globalAlpha=.62;line(g,0,h-8,w,h-8);
    for(let i=0;i<29;i++){const x=i*w/28;line(g,x,h-8,x,h-8+(i%7?3:7));}
  });
  sprite('atlas_ledger',650,108,(g,w,h)=>{
    plate(g,w,h,{fill:DEEP,edge:'#79a69a'});g.lineWidth=1;g.strokeStyle='#4a7771';
    line(g,325,15,325,h-16);for(const x of [18,632])reg(g,x,h/2,4);
  });
  sprite('atlas_action',80,78,(g,w,h)=>plate(g,w,h,{fill:DEEP,edge:'#6c9a8e'}));
  sprite('atlas_dock',650,162,(g,w,h)=>{
    g.fillStyle='rgba(13,44,50,.94)';g.fillRect(0,0,w,h);g.strokeStyle='#679a8c';g.lineWidth=1.4;
    line(g,0,0,w,0);line(g,0,h-1,w,h-1);
    g.strokeStyle='#3e706c';for(let x=w/4;x<w;x+=w/4)line(g,x,17,x,h-17);
  });
  sprite('atlas_tool_cell',112,102,(g,w,h)=>{g.strokeStyle='#76998c';g.lineWidth=1;line(g,9,8,24,8);line(g,9,8,9,19);line(g,w-9,h-8,w-24,h-8);});
  sprite('atlas_tool_locked',112,102,(g,w,h)=>{g.strokeStyle='#4a6f69';g.lineWidth=1;for(let x=8;x<28;x+=5)line(g,x,12,x+6,6);});
  sprite('atlas_badge',32,29,(g,w,h)=>{g.fillStyle=RED;stamp(g,w,h,4);g.fill();});
  for(const kind of ['gear','sound','mute','reset','undo','hint','water','lock','seed','flower'])
    sprite('atlas_icon_'+kind,52,52,g=>{g.translate(26,26);icon(g,kind);});
  sprite('atlas_ledger_tick',44,8,g=>{g.fillStyle='#ea9374';g.fillRect(0,2,44,4);});
  for(const h of [88,112,148,176])sprite('atlas_tag_'+h,634,h,(g,w,h)=>{
    plate(g,w,h,{fill:'#d9e8d2',edge:INK});g.fillStyle=RED;g.fillRect(0,0,7,h);g.strokeStyle='#83a49a';line(g,57,13,57,h-13);
    g.strokeStyle=INK;g.lineWidth=2.4;circle(g,32,h/2,11);g.stroke();line(g,32,h/2-4,32,h/2+4);
  });
  sprite('atlas_veil',720,1600,g=>{g.fillStyle='rgba(6,28,34,.76)';g.fillRect(0,0,720,1600);});
  for(const [name,w,h] of [['result',604,502],['end',604,648],['helper',560,710]]){
    sprite('atlas_sheet_'+name,w,h,(g,w,h)=>{
      plate(g,w,h,{big:true});
      g.strokeStyle='#50756b';g.lineWidth=1.3;line(g,34,65,w-34,65);line(g,34,h-142,w-34,h-142);
      g.fillStyle=RED;g.fillRect(34,33,20,8);
      g.strokeStyle='#a5b4a2';for(let i=0;i<7;i++)line(g,w-36-i*6,33,w-36-i*6,33+(i%3?6:10));
    });
  }
  sprite('atlas_button',344,86,(g,w,h)=>{
    plate(g,w,h,{fill:RED,edge:'#8d4235'});g.strokeStyle='#f6cfb0';g.lineWidth=2;
    line(g,w-52,h/2,w-29,h/2);line(g,w-36,h/2-7,w-29,h/2,w-36,h/2+7);
  });
  sprite('atlas_seal',98,98,g=>{
    g.translate(49,49);g.strokeStyle=RED;g.lineWidth=2.5;circle(g,0,0,37);g.stroke();g.lineWidth=1;circle(g,0,0,32);g.stroke();
    for(let i=0;i<8;i++){g.save();g.rotate(i*Math.PI/4);line(g,0,-32,0,-28);g.restore();}
    g.strokeStyle=INK;g.lineWidth=2.8;line(g,0,19,0,-14);g.beginPath();g.moveTo(0,5);g.quadraticCurveTo(-19,3,-16,-6);g.quadraticCurveTo(-7,-8,0,5);g.moveTo(0,-1);g.quadraticCurveTo(2,-15,15,-17);g.quadraticCurveTo(15,-6,0,-1);g.stroke();
  });
  sprite('atlas_medallion',138,138,g=>{
    g.fillStyle=DEEP;g.strokeStyle='#769a85';g.lineWidth=1;
    g.beginPath();for(let i=0;i<8;i++){const a=(i+.5)*Math.PI/4,x=69+Math.cos(a)*62,y=69+Math.sin(a)*62;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();g.fill();g.stroke();
    circle(g,69,69,48);g.stroke();
  });
  sprite('preview_line',20,128,g=>{g.strokeStyle=MINT;g.lineWidth=4;g.setLineDash([14,11]);line(g,10,0,10,128);});
  sprite('preview_cell',118,97,g=>{g.fillStyle='rgba(185,235,203,.19)';g.fillRect(3,3,112,91);});
  for(const [key,color] of [['ring',MINT],['hint_ring',PAPER],['tap_ring',MINT],['missed_flower','#f28d72']])
    sprite(key,120,120,g=>{g.lineWidth=key==='tap_ring'?3:4;g.strokeStyle=color;if(key==='hint_ring')g.setLineDash([22,8]);circle(g,60,60,46);g.stroke();});
  sprite('blocked_cross',66,66,g=>{g.lineWidth=7;g.strokeStyle='#d95d49';line(g,16,16,50,50);line(g,50,16,16,50);});
}

export const ATLAS_FONTS={
  text:'"PingFang SC","Microsoft YaHei",system-ui,sans-serif',
  display:'"Songti SC","Noto Serif CJK SC","STSong",Georgia,serif',
  code:'"SFMono-Regular",Consolas,"Liberation Mono",monospace'
};
const meta={face:'code',weight:550},title={face:'display',weight:650};
const number=L=>/^\d+$/.test(String(L.id))?String(L.id).padStart(2,'0'):'EX';
const noteLayouts=new Map();
function noteLayout(value){
  const text=String(value);
  if(noteLayouts.has(text))return noteLayouts.get(text);
  const ctx=document.createElement('canvas').getContext('2d');
  let rows,size;
  for(size of [28,25,22,19]){
    ctx.font=`580 ${size}px ${ATLAS_FONTS.text}`;
    rows=[];
    for(const paragraph of text.split('\n')){
      let row='';
      for(const token of paragraph.match(/[A-Za-z0-9]+[.,!:;?'’-]*|\s+|./gu)||[]){
        if(row&&ctx.measureText(row+token).width>524){rows.push(row.trim());row='';}
        row+=token;
      }
      rows.push(row.trim());
    }
    if(rows.length*size*1.18<=143)break;
  }
  const h=[88,112,148,176].find(h=>h>=rows.length*size*1.18+16)||176;
  const result={h,size,text:rows.join('\n')};
  if(noteLayouts.size>=48)noteLayouts.delete(noteLayouts.keys().next().value);
  noteLayouts.set(text,result);return result;
}

export function composeAtlasHud({L,ST,S,time,ui,items,hits,item,addText,fitText,moving,endIcon,assets}){
  const id=Number(L.id)||2,serial=number(L);
  const pic=(id,asset,x,y,scale=1,z=82,op=1)=>items.push(item(id,asset,x,y,scale,scale,0,op,z));
  const txt=(id,text,x,y,size,ink=PAPER,z=84,opts={})=>addText(items,id,text,x,y,size,ink,z,opts);
  const fit=(id,text,x,y,size,ink,max,z=84,opts={})=>fitText(items,id,text,x,y,size,ink,max,z,opts);
  const shown=(ST.bloomed||[]).map(id=>ST.bloomTimes?.[id]??-100).filter(at=>time>=at+.10);
  const flowerTotal=(L.flowers||[]).length,used=ST.used||0;
  if(S.showHud!==false){
    pic('header_baseline','atlas_header_rules',360,156,1,79);
    pic('gear_button','atlas_action',74,145,1,80);pic('gear','atlas_icon_'+(ui.playable?(S.sfxMute?'mute':'sound'):'gear'),74,145,1,81);
    pic('reset_button','atlas_action',646,145,1,80);pic('reset','atlas_icon_reset',646,145,1,81);
    hits.push({id:'gear',x:28,y:94,w:94,h:101},{id:'reset',x:599,y:94,w:94,h:101});
    txt('atlas_kicker','FIELD ATLAS',360,88,22,MINT,81,meta);
    txt('atlas_title','花 候 图 志',360,146,54,PAPER,81,title);
    fit('level',serial==='EX'?(L.title||'自选花圃'):`观测页  /  ${serial}`,360,195,20,MINT,376,82);
    pic('seeds_card','atlas_ledger',360,273,1,80);
    txt('seeds_label','播种',113,251,24,MINT);txt('flowers_label','花录',432,251,24,MINT);
    const n=Math.min(4,L.seeds||1);
    for(let i=0;i<n;i++)pic('seed_hud_'+i,'atlas_icon_seed',99+i*29,291,.93,82,i<used?.23:1);
    txt('seed_count',`${used}/${L.seeds}`,267,275,48);
    const pulse=moving&&shown.length?Math.sin(Math.PI*Math.min(1,Math.max(0,(time-Math.max(...shown)-.10)/.22))):0;
    pic('flower_hud','atlas_icon_flower',435,293,1+.07*pulse,82);
    txt('flower_count',`${shown.length}/${flowerTotal}`,581,275,48);items.at(-1).sx*=1+.08*pulse;items.at(-1).sy*=1+.08*pulse;
    if(used>=L.seeds&&shown.length===flowerTotal)pic('flowers_active','atlas_ledger_tick',581,311,1,82);
    else if([3,10].includes(id)&&!used)pic('seeds_active','atlas_ledger_tick',267,311,1,82);
  }
  const tutorial=S.showTutorial!==false&&!used?L.hintText:'';
  const message=ui.message||(ST.status==='lost'?'仍有花苞未开。撤回一粒种子，再试一个位置。':tutorial);
  if(message){
    const note=noteLayout(message),y=347+note.h/2;
    pic('tutorial_background','atlas_tag_'+note.h,360,y,1,84);
    fit('tutorial_text',note.text,387,y,note.size,INK,540,85,{lineHeight:1.18});
  }
  if(S.showBoosters!==false){
    pic('tools_rail','atlas_dock',360,1495,1,80);
    const specs=[['undo',4,ui.undoCount??S.undoCount??3,'撤回'],['hint',7,ui.hintCount??S.hintCount??1,'罗盘'],['water',12,ui.waterCount??S.waterCount??2,'补水'],['locked',18,0,'封存']];
    specs.forEach(([id,unlock,count,label],i)=>{
      const x=118+i*162,y=1484,on=(Number(L.id)>=unlock||S.unlockBoosters)&&id!=='locked';
      pic('booster_'+id,on?'atlas_tool_cell':'atlas_tool_locked',x,y,1,81);
      pic('booster_icon_'+id,'atlas_icon_'+(on?id:'lock'),x,y-6,on?1.2:1,82);
      txt('booster_label_'+id,on?label:id==='locked'?'封存':`第 ${unlock} 页`,x,1545,24,on?PAPER:MUTED,83);
      if(on){pic('booster_badge_'+id,'atlas_badge',x+42,y-38,1,84,count?1:.55);txt('booster_count_'+id,String(count),x+42,y-39,20,PAPER,85,meta);hits.push({id,x:x-63,y:y-67,w:126,h:145});}
      if(on&&id==='water'&&ui.waterMode)pic('booster_water_selected','fx_focus_water',x,y,1.18,83);
    });
  }
  const modalTop=(name,asset,y,headline,z)=>{
    pic(name+'_veil','atlas_veil',360,800,1,z);
    pic(name==='win'?'end_card':name==='end'?'final_end_card':'helper_card',asset,360,y,1,z+2);
    const top=y-assets[asset].h/2;
    txt(name+'_folio',headline,360,top+38,19,INK,z+3,meta);return top;
  };
  const button=(id,label,by,z,scale=1)=>{
    items.push(item(id==='cta'?'final_cta':id==='helper'?'helper_try_button':'next_button','atlas_button',360,by,scale,1,0,1,z));
    fit(id==='cta'?'final_cta_text':id==='helper'?'helper_try_text':'next_text',label,344,by,32,PAPER,Math.min(390,242*scale),z+1,{weight:650});
    hits.length=0;hits.push({id,x:360-172*scale,y:by-58,w:344*scale,h:116});
  };
  if(S.tapRipple&&ui.tap){const p=(time-ui.tap.time)/.55;if(p>=0&&p<1)pic('tap_ripple','tap_ring',ui.tap.x,ui.tap.y,.2+p*.82,88,(1-p)*.8);}
  const won=ST.status==='won'&&time-(ui.winAt??time)>=(+S.winDelay||0)/1000;
  if(won&&!ui.hideWin&&!ui.endMode){
    const y=modalTop('win','atlas_sheet_result',868,`第 ${serial} 页  ·  观测记录`,90);
    pic('bouquet','atlas_seal',360,y+136,.98,94);
    txt('win_title','花录已成',360,y+234,62,INK,95,title);
    txt('basket_progress',`用种 ${used} 粒   ·   记花 ${flowerTotal} 朵`,360,y+313,25,INK,95);
    button('next','翻至下页',y+430,95);
  }
  if(ui.endMode&&S.endCard!==false){
    const y=modalTop('end','atlas_sheet_end',830,'观测存档',150);
    const icon=endIcon||'bouquet',a=assets[icon],sc=Math.min(215/a.w,215/a.h);
    pic('final_end_icon',icon,360,y+212,sc,154);
    fit('final_end_title',S.endTitle||'花候图志',360,y+364,57,INK,536,155,title);
    txt('final_end_caption',`本页收录 ${flowerTotal} 朵花`,360,y+435,28,INK,155);
    button('cta',S.endButton||'开始观测',1040,155,1.25);
  }
  if(['undo','hint','water'].includes(ui.helper)){
    const kind=ui.helper,info={undo:['撤回','取回最近播下的种子，重新选择落点。',ui.undoCount??S.undoCount??3],hint:['罗盘','标出一处可以播种的空格。',ui.hintCount??S.hintCount??1],water:['补水','选一朵未开的花苞，滴水催开。',ui.waterCount??S.waterCount??2]}[kind];
    const y=modalTop('helper','atlas_sheet_helper',848,'新器具入册',170);
    pic('helper_medallion','atlas_medallion',360,y+231,1,174);pic('helper_icon','atlas_icon_'+kind,360,y+231,1.8,175);
    txt('helper_title',info[0],360,y+350,56,INK,175,title);
    fit('helper_description',info[1],360,y+430,29,INK,478,175);
    txt('helper_grant',`可用 ${info[2]} 次`,360,y+502,27,RED,175);
    button('helper','收入工具匣',1115,175,.82);
  }
}
