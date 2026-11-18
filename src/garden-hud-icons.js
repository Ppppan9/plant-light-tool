// Tiny enamel and stained-wood garden tools. Each drawing uses a 24-unit grid.
const ink='#435338', green=['#b9d96b','#5a9e53'], honey=['#ffe793','#dfa249'];
const lake=['#ace3d7','#55aaa1'], clay=['#ffb19b','#ce7769'];

function paint(g,color) {
  if(typeof color==='string')return color;
  const p=g.createLinearGradient(6,3,17,22);
  p.addColorStop(0,color[0]);p.addColorStop(1,color[1]);return p;
}
function shape(g,d,fill,line=ink,w=1.35) {
  const p=new Path2D(d);
  if(fill){g.fillStyle=paint(g,fill);g.fill(p);}
  if(line){g.strokeStyle=line;g.lineWidth=w;g.stroke(p);}
}
function dot(g,x,y,r,fill,line,w=1.2) {
  g.beginPath();g.arc(x,y,r,0,Math.PI*2);
  g.fillStyle=paint(g,fill);g.fill();
  if(line){g.strokeStyle=line;g.lineWidth=w;g.stroke();}
}
const gleam=(g,d)=>shape(g,d,null,'#fff5cb',.9);

function gear(g) {
  for(const [y,x,fill] of [[7,15,green],[16,8,honey]]){
    shape(g,`M4 ${y-1.25}H20Q21.5 ${y-1.25} 21.5 ${y}T20 ${y+1.25}H4Q2.5 ${y+1.25} 2.5 ${y}T4 ${y-1.25}Z`,['#d7ae77','#ac8554'],ink,1.1);
    g.save();g.translate(x,y);g.rotate(-.5);
    shape(g,'M0 -4Q4 -3.5 4 0Q3.5 4 0 4Q-4 3.5 -4 0Q-3.5 -3.5 0 -4Z',fill);
    gleam(g,'M-2 -.5Q-1.8 -2 0 -2.2');g.restore();
  }
}
function reset(g) {
  shape(g,'M4 9A8.7 8.7 0 1 1 3.8 16L6.4 14.8A6 6 0 1 0 6.5 9.8L9.1 10L4.3 14.1L2.1 8.3Z',green);
  shape(g,'M11 16C10.2 12.7 12.2 9.6 16.2 9.2C16.1 12.9 14.9 15 11 16Z',honey,ink,1.05);
  gleam(g,'M10 5.1Q14.1 3.7 17.9 6.3');
}
function undo(g) {
  shape(g,'M2 10.7L9.4 4.4L9.7 8.7C15.7 8 21.9 10.1 21.9 15.8C21.9 19.5 19.3 21.6 16.2 21.3C18.8 19 19 16.7 17.2 15.2C15.4 13.7 12.9 13.4 9.6 13.7L9.2 17.5Z',green);
  gleam(g,'M5.1 10.6L8 8.1M11.8 10.6Q16.4 10.4 18.6 13');
}
function hint(g) {
  shape(g,'M7.7 7.2V6.1C7.7 1.5 15.8 1.5 15.8 6.1V7.2',null,ink,1.65);
  shape(g,'M7.3 8H16.2L18.9 16.8L16.1 19.6H7.2L4.7 16.8Z',honey);
  shape(g,'M5.3 8.3L8.7 5.7H14.9L18.7 8.3L17.6 9.5H6.2Z',green);
  shape(g,'M7.1 19.2H16.7L17.7 21.4H6.1Z',green);
  shape(g,'M11.7 17.3C9 16.1 9.6 14.2 12.2 11.8C12.1 14.4 15 14.8 11.7 17.3Z','#fff5bd','#bd853a',.75);
  gleam(g,'M7.9 11.2L6.9 15.4');
}
function water(g) {
  shape(g,'M15.6 7.4C19.9 1.4 24 7.2 19 12.7L17.9 13.7L16.7 12.2C20.5 9.5 20.6 4.6 17.7 8.8Z',lake);
  shape(g,'M8.6 12L4.3 9.2L3 10.2L7.8 17.9L9.7 17.4Z',lake);
  shape(g,'M7.9 9.1Q12.8 7.1 17.6 9L19 18.5Q14 21.5 8 19.4Z',lake);
  shape(g,'M8.3 9.2Q13.1 7.5 17.6 9Q13.4 10.8 8.3 9.2Z','#c3e7d8',ink,.95);
  shape(g,'M2.2 7.4L5.2 8.3L3.2 11.8L1.6 9.9Z',honey);
  gleam(g,'M10 11.7L10.2 16.3');
  shape(g,'M12.2 16Q12.1 13.1 15.9 12.4Q15.9 15.7 12.2 16Z','#eff0b7',null);
}
function lock(g) {
  shape(g,'M7.5 11V7C7.5 1.4 16.4 1.4 16.4 7V10.9',null,'#6c705b',2.45);
  shape(g,'M6.2 10.1Q11.6 8.6 17.6 10.1L18.1 17.4Q17.8 20.3 12 22Q6.3 20.4 5.9 17.6Z',['#babc9f','#979878'],'#67705b',1.6);
  dot(g,11.9,14,1.35,'#6a7057');shape(g,'M11.9 14.9V17.1',null,'#6a7057',1.4);
  gleam(g,'M8 11.8L10.4 11.3');
}
function speaker(g,off) {
  shape(g,'M3 9.1L7.2 9L13.3 4.6V19.4L7.2 15L3 14.7Z',lake);
  gleam(g,'M7.1 10.8L11.4 7.6');
  if(off) shape(g,'M17 9L21.2 14.8M21.2 9L17 14.8',null,'#8a5147',1.75);
  else {
    shape(g,'M16.3 9Q19.1 12 16.3 15M18.9 6.5Q24 12 18.9 17.5',null,ink,1.55);
  }
}
function seed(g) {
  shape(g,'M20 3C20 9 21.6 16.5 14.1 20.6C7.4 24.2 2.1 19 4.3 12.5C6.3 6.7 12.3 5.8 20 3Z',honey,'#8d642f',1.2);
  shape(g,'M7.2 18.3C10.8 16.8 11.2 11.1 16.2 7.6',null,'#a87738',1.1);
  gleam(g,'M6.6 13.2Q8.3 9.5 12.2 8.5');
}
function seedBadge(g) {
  dot(g,12,12,9.3,'#55804c','#fff6d3',1.8);
  shape(g,'M6.8 15.2Q7.2 8.4 16.9 7Q16.6 14.8 9.4 16.1Z','#f2f4b0',null);
}
function bloom(g) {
  for(let i=0;i<5;i++){
    g.save();g.translate(12,11.7);g.rotate(i*Math.PI*2/5);
    shape(g,'M-2.2 .2Q-5.9 -3.3 -4.2 -7.6Q-2.1 -11.5 1.8 -9.1Q5.5 -6.3 2.5 -.1Z',clay,'#98585b',1.05);
    gleam(g,'M-2.9 -6.4Q-2.8 -8 -1.4 -8.3');g.restore();
  }
  dot(g,12,11.7,3.8,honey,'#996b3d',1.05);dot(g,11.2,10.7,.95,'#fff7cb');
}
function gift(g) {
  shape(g,'M4.4 10.9L11.8 9.2L19.9 11L19.3 19.6L12.4 22.2L5.1 19.6Z',clay,'#865547');
  shape(g,'M3.3 10.1L12 7.7L20.8 10L20.7 12.8L12.1 15.4L3.4 12.8Z',honey,'#865547');
  shape(g,'M10.5 14.8L12.7 15.3L12.7 21.9L10.6 21.2Z','#ffeeac',null);
  shape(g,'M11.9 8.9Q5.2 9.1 5 3.7Q10.8 3.3 11.9 8.9ZM12 8.9Q12 3.8 18.4 2Q19.3 7.6 12 8.9Z',green);
}

export function installGardenHudIcons(sprite) {
  const art={
    icon_gear:[76,76,gear],icon_reset:[76,76,reset],icon_undo:[76,76,undo],
    icon_hint:[76,76,hint],icon_water:[76,76,water],icon_lock:[48,54,lock],
    icon_sound:[76,76,g=>speaker(g,false)],icon_mute:[76,76,g=>speaker(g,true)],
    seed:[57,75,seed],seed_badge:[38,38,seedBadge],gift:[65,72,gift],
    icon_flower_counter:[108,108,bloom,54,96]
  };
  for(const [id,[w,h,draw,ax,ay]] of Object.entries(art))sprite(id,w,h,g=>{
    const unit=Math.min(w,h)/24;
    g.save();g.translate((w-24*unit)/2,(h-24*unit)/2);g.scale(unit,unit);
    g.lineJoin='round';g.lineCap='round';draw(g);g.restore();
  },ax,ay);
}
