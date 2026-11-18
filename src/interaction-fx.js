// Contextual feedback stays in the scene graph: editable in AE / 3D as well as
// visible in the game. No DOM effects or flattened-frame overlays are used.
import {installGardenParticles,composeSoilParticles,composeBloomParticles,densityCount} from './garden-particles.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>1-(1-clamp(v))**3;
const TAU=Math.PI*2;
export function createInteractionFX({sprite,item}){
  const motionPreference=typeof matchMedia==='function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const enabled=S=>S.interactionMotion!==false&&!motionPreference?.matches;
  function install(){
    installGardenParticles(sprite);
    sprite('fx_watering_can',206,164,g=>{
      g.lineCap='round';g.lineJoin='round';g.save();g.shadowColor='rgba(25,91,112,.22)';g.shadowBlur=4;g.shadowOffsetY=4;
      g.strokeStyle='#2887b7';g.lineWidth=17;g.beginPath();g.ellipse(73,53,34,37,-.18,Math.PI,TAU+.15);g.stroke();g.restore();
      g.strokeStyle='#66c4e7';g.lineWidth=6;g.beginPath();g.ellipse(71,50,33,35,-.18,Math.PI+.12,TAU);g.stroke();
      const q=g.createLinearGradient(18,64,145,149);q.addColorStop(0,'#79d1ed');q.addColorStop(.35,'#48b2dc');q.addColorStop(.7,'#278fc2');q.addColorStop(1,'#1a70a2');g.fillStyle=q;g.beginPath();g.moveTo(110,101);g.lineTo(173,53);g.lineTo(183,65);g.lineTo(128,124);g.closePath();g.fill();
      g.fillStyle=q;g.beginPath();g.moveTo(33,61);g.bezierCurveTo(14,72,12,123,23,140);g.bezierCurveTo(42,159,107,159,124,139);g.bezierCurveTo(135,118,128,77,110,63);g.bezierCurveTo(88,51,55,50,33,61);g.fill();
      g.fillStyle='rgba(159,229,246,.6)';g.beginPath();g.ellipse(70,65,38,8,.03,0,TAU);g.fill();g.fillStyle='#2395c4';g.beginPath();g.ellipse(71,65,31,4,.03,0,TAU);g.fill();
      g.fillStyle='rgba(208,247,255,.25)';g.beginPath();g.ellipse(39,104,11,28,.12,0,TAU);g.fill();g.strokeStyle='rgba(172,229,244,.4)';g.lineWidth=3;g.beginPath();g.moveTo(44,142);g.quadraticCurveTo(77,150,108,139);g.stroke();
      g.save();g.translate(181,56);g.rotate(-.58);g.fillStyle='#278ab8';g.beginPath();g.ellipse(0,2,19,12,0,0,TAU);g.fill();const r=g.createLinearGradient(0,-12,0,11);r.addColorStop(0,'#b0e7f5');r.addColorStop(1,'#5bb8dc');g.fillStyle=r;g.beginPath();g.ellipse(0,0,19,11,0,0,TAU);g.fill();g.fillStyle='#277fa6';for(const [x,y]of[[-10,-2],[-3,-5],[5,-4],[11,0],[3,3],[-5,3]]){g.beginPath();g.ellipse(x,y,1.5,1,0,0,TAU);g.fill();}g.restore();
    },78,45);
    sprite('fx_water_drop',18,26,g=>{g.beginPath();g.moveTo(9,1);g.bezierCurveTo(8,6,1,12,2,18);g.bezierCurveTo(3,27,16,26,16,18);g.bezierCurveTo(17,12,11,5,9,1);let q=g.createLinearGradient(3,2,16,25);q.addColorStop(0,'#f1ffff');q.addColorStop(.35,'#a4e4ee');q.addColorStop(1,'#5bbacb');g.fillStyle=q;g.fill();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(6,15,1.5,4,.35,0,TAU);g.fill();});
    sprite('fx_water_splash',94,30,g=>{g.strokeStyle='rgba(184,239,240,.8)';g.lineWidth=3;g.beginPath();g.ellipse(47,15,41,8,0,0,TAU);g.stroke();});
    sprite('soil_damp',100,48,g=>{
      // Feather the edge against the custom soil colour. The light comes from
      // the same upper-left direction as the garden tiles.
      g.translate(50,24);g.scale(1,.43);
      const pigment=g.createRadialGradient(-4,-1,4,0,0,47);
      pigment.addColorStop(0,'rgba(89,57,38,.56)');
      pigment.addColorStop(.57,'rgba(100,63,41,.42)');
      pigment.addColorStop(.84,'rgba(110,71,45,.23)');
      pigment.addColorStop(1,'rgba(110,71,45,0)');
      g.fillStyle=pigment;g.fillRect(-50,-52,100,104);
      g.strokeStyle='rgba(239,220,167,.38)';g.lineWidth=1.8;g.lineCap='round';
      g.beginPath();g.ellipse(-11,0,15,8,-.25,3.2,4.65);g.stroke();
    });
    for(const [name,color]of [['valid','#fffde1'],['invalid','#dd7961'],['water','#acf0f1']])sprite('fx_focus_'+name,108,92,g=>{g.strokeStyle=color;g.lineWidth=3.5;g.lineCap='round';for(const [x,y,sx,sy]of[[10,12,1,1],[98,12,-1,1],[10,80,1,-1],[98,80,-1,-1]]){g.beginPath();g.moveTo(x,y+sy*17);g.lineTo(x,y+sy*5);g.quadraticCurveTo(x,y,x+sx*5,y);g.lineTo(x+sx*23,y);g.stroke();}});
    sprite('plant_root_sprout',58,37,g=>{for(const [x,y,c]of[[20,4,'#91cf5b'],[30,0,'#abd975'],[39,11,'#6fb84a']]){const q=g.createLinearGradient(x,y,x,34);q.addColorStop(0,c);q.addColorStop(1,'#539a37');g.fillStyle=q;g.beginPath();g.moveTo(29,35);g.quadraticCurveTo(x-10,y+9,x,y);g.quadraticCurveTo(x+8,y+10,29,35);g.fill();}});
  }
  function bloom({fl,x,y,k,time,at,S,items}){
    if(!enabled(S)||S.showParticles===false)return;
    composeBloomParticles({fl,x,y,k,age:time-at,S,item,items});
  }
  function compose({layout,L,ST,S,time,ui,items,hits,A}){
    if(!enabled(S))return;
    const k=layout.k,particles=S.showParticles!==false;
    for(const ev of ui.feedback||[]){
      const age=time-ev.time;if(age<0||age>2)continue;
      const x=Number.isFinite(ev.c)?layout.cx(ev.c):Number.isFinite(ev.x)?ev.x:360,y=Number.isFinite(ev.r)?layout.cy(ev.r):Number.isFinite(ev.y)?ev.y:800,id='fx_'+ev.kind+'_'+ev.id;
      if(ev.kind==='plant'&&particles)composeSoilParticles({items,item,S,id,age,x,y,k,seed:(ev.c||0)*7+(ev.r||0)*13});
      if(ev.kind==='invalid'&&age<.42){const p=age/.42;items.push(item(id,'fx_focus_invalid',x+Math.sin(p*TAU*2)*3*k*(1-p),y,k*.97,k*.97,0,(1-p)*.85,69));}
      if(ev.kind==='water'&&age>.28&&age<1.85){
        const spread=ease((age-.28)/.44),fade=1-ease((age-1.05)/.80);
        const scale=k*(.24+.70*spread);
        items.push(item(id+'_earth','soil_damp',x,y+3*k,scale,scale,-.04,spread*fade,25));
      }
      if(ev.kind==='water'&&age<1.2){
        const p=clamp(age/1.2),enter=ease(p/.18),leave=1-ease((p-.72)/.28);
        const side=x<180*k?1:-1;items.push(item(id+'_can','fx_watering_can',x+side*(78+(1-enter)*40)*k,y-123*k-(1-leave)*35*k,-side*k*.75,k*.75,-side*.27*enter*leave,Math.min(enter,leave),76));
        if(particles&&p>.13&&p<.78)for(let n=0;n<densityCount(S,4,7,10);n++){const fall=(p-.13)*8-n*.23;if(fall<0)continue;const q=fall%1;items.push(item(id+'_drop_'+n,'fx_water_drop',x-6*k*(1-q)+(n%3-1)*6*k,y-94*k+q**1.25*72*k,k*.45,k*.45,.12,Math.sin(q*Math.PI)*Math.min(1,(.78-p)*12),74));}
        if(particles&&p>.2){const q=clamp((p-.2)/.6);items.push(item(id+'_splash','fx_water_splash',x,y-10*k,k*(.3+q),k*(.3+q),0,(1-q)*.65,68));}
      }
      if(ev.kind==='undo'&&age<.48){const p=ease(age/.48);for(const [n,old]of(ev.ghosts||[]).entries()){if(!A[old.asset])continue;items.push({...old,id:id+'_'+n,x:old.x+(x-old.x)*p*.32,y:old.y+(y-old.y)*p*.32,sx:old.sx*(1-p*.65),sy:old.sy*(1-p*.65),op:old.op*(1-p),z:old.z+.5});}}
    }
    // Button artwork and labels compress together; hit rectangles stay stable.
    const pressed=ui.pressed?.hit;
    for(const h of hits){const recent=[...(ui.feedback||[])].reverse().find(e=>e.kind==='button'&&e.hit===h.id&&time-e.time<.32),age=recent?time-recent.time:2;
      const sc=pressed===h.id ? .94:age<.32?1+Math.sin(age/.32*Math.PI)*.045:1;if(sc===1)continue;
      const prefixes=h.id==='gear'?['gear']:h.id==='reset'?['reset']:h.id==='next'?['next_']:h.id==='cta'?['final_cta']:h.id==='helper'?['helper_try_']:['booster_'+h.id,'booster_icon_'+h.id,'booster_label_'+h.id,'booster_badge_'+h.id,'booster_count_'+h.id];
      const cx=h.x+h.w/2,cy=h.y+h.h/2;for(const it of items)if(prefixes.some(p=>it.id.startsWith(p))){it.x=cx+(it.x-cx)*sc;it.y=cy+(it.y-cy)*sc+(pressed===h.id?3:0);it.sx*=sc;it.sy*=sc;}
    }
  }
  return{install,compose,bloom,enabled};
}
