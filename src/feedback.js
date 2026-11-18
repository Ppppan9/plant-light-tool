// Shared transient input/action data. Effects consume these events; game rules do not.
let reducedMotion;
export function interactionMotionEnabled(settings={}){
  if(settings.interactionMotion===false)return false;
  reducedMotion ??= globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  return !reducedMotion?.matches;
}
export const interactionDelay=(settings,seconds)=>interactionMotionEnabled(settings)?seconds:0;

// The seed falls first. Then the vine's eased growth front reaches each flower;
// keep Core's immediate rules/history intact and adjust visual timestamps only.
export function scheduleGrowthFeedback({L,ST,result,firstVine,time,S}){
  const delay=interactionDelay(S,.14);
  if(!delay)return 0;
  const vines=ST.vines.slice(firstVine);
  for(const v of vines)v.time+=delay;
  for(const id of result.blooms){
    const flower=L.flowers.find(f=>f.id===id);if(!flower)continue;
    let arrival=Infinity;
    for(const v of vines){
      const dc=v.c2-v.c1,dr=v.r2-v.r1,total=Math.abs(dc)+Math.abs(dr);
      if(!total||dc&&dr)continue;
      if(dc?(flower.r!==v.r1||flower.c<Math.min(v.c1,v.c2)||flower.c>Math.max(v.c1,v.c2)):(flower.c!==v.c1||flower.r<Math.min(v.r1,v.r2)||flower.r>Math.max(v.r1,v.r2)))continue;
      const fraction=Math.max(0,Math.min(1,(Math.abs(flower.c-v.c1)+Math.abs(flower.r-v.r1))/total));
      const duration=v.duration||(+S.growMs||500)/1000;
      arrival=Math.min(arrival,time+delay+duration*(1-Math.cbrt(1-fraction)));
    }
    ST.bloomTimes[id]=Number.isFinite(arrival)?arrival:ST.bloomTimes[id]+delay;
  }
  return delay;
}

export function createFeedback(ui, clock=()=>performance.now()/1000){
  let serial=0;
  ui.feedback=[];ui.pressed=null;
  function prune(at=clock()){
    const events=ui.feedback;
    for(let i=events.length-1;i>=0;i--)if(at-events[i].time>2)events.splice(i,1);
    if(events.length>24)events.splice(0,events.length-24);
    return events;
  }
  function emit(kind,data={},at=clock()){
    prune(at);
    if(kind==='undo'){
      // A quick undo may land before the first drop or the seed hits the soil.
      for(let i=ui.feedback.length-1;i>=0;i--){
        const e=ui.feedback[i];
        if((e.kind==='water'||e.kind==='plant')&&e.c===data.c&&e.r===data.r){
          ui.feedback.splice(i,1);
          break;
        }
      }
    }
    const event={...data,id:++serial,kind,time:at,c:data.c??null,r:data.r??null};
    ui.feedback.push(event);
    if(ui.feedback.length>24)ui.feedback.splice(0,ui.feedback.length-24);
    return event;
  }
  function clear(){ui.feedback.length=0;ui.pressed=null;}
  function press(hit,cell,at=clock()){ui.pressed={hit:hit||null,c:cell?.c??null,r:cell?.r??null,time:at};}
  function move(cell){if(ui.pressed){ui.pressed.c=cell?.c??null;ui.pressed.r=cell?.r??null;}}
  function release(){ui.pressed=null;}
  return {emit,prune,clear,press,move,release};
}

// Only capture sprites that cease to exist after this undo. Existing flowers,
// other moves, the board and HUD must never be replayed as disappearing ghosts.
export function undoFeedback(before,after,items,level){
  const removedVines=new Set(),removedMoves=new Set();
  for(let i=0;i<before.vines.length;i++){
    const a=before.vines[i],b=after.vines[i];
    if(!b||['c1','r1','c2','r2','time','duration'].some(k=>a[k]!==b[k]))removedVines.add(i);
  }
  for(let i=0;i<before.moves.length;i++){
    const a=before.moves[i],b=after.moves[i];
    if(!b||['c','r','time'].some(k=>a[k]!==b[k]))removedMoves.add(i);
  }
  const removedBlooms=new Set(before.bloomed.filter(id=>!after.bloomed.includes(id)));
  const ghosts=items.filter(it=>{
    const id=String(it.id||'');
    const vine=/^vine_(?:(?:leaf|tip|stem|sprig|floret|glow)_)?(\d+)(?:_|$)/.exec(id);
    if(vine)return removedVines.has(+vine[1]);
    const seed=/^seed_(?:sprout_)?(\d+)$/.exec(id);
    if(seed)return removedMoves.has(+seed[1]);
    for(const flower of removedBlooms){
      if(id===flower+'_bloom'||id===flower+'_leaves'||id===flower+'_disk'||id.startsWith(flower+'_petal_'))return true;
    }
    return false;
  }).map(it=>({...it}));
  const removedMove=removedMoves.size?before.moves[Math.max(...removedMoves)]:null;
  const origin=removedMove||(level?.flowers||[]).find(f=>removedBlooms.has(f.id));
  return {c:origin?.c??null,r:origin?.r??null,ghosts};
}
