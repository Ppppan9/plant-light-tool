import {icon} from './atlas-icons.js';

const groupIcons = ['grid-2x2','palette','timer','audio-lines','mouse-pointer-2','video','film','box','smartphone','flag'];
const commandLabel = text => String(text).replace(/^[^\p{L}\p{N}]+/u,'');

export function createPanel({root,groups,S,onChange,onAction}) {
  for(const node of document.querySelectorAll('[data-icon]')) if(!node.querySelector('svg'))node.prepend(icon(node.dataset.icon));
  const canvas=document.querySelector('#stage'), size=document.querySelector('#atlasCanvasSize');
  if(canvas&&size){const setSize=()=>{size.textContent=`${canvas.width} × ${canvas.height}`;};setSize();new MutationObserver(setSize).observe(canvas,{attributes:true,attributeFilter:['width','height']});}
  const refs=new Map();let fold={},query='';try{fold=JSON.parse(localStorage.getItem('plantLight.panel.v1')||'{}')||{};}catch{}
  for(const [i,g] of groups.entries()){
    const d=document.createElement('details');d.open=g.name in fold?fold[g.name]:!!g.open;d.dataset.group=g.name;
    const sm=document.createElement('summary');sm.innerHTML=`<span class="gi"></span><span class="gn"></span><span class="gc">${g.items.length}</span>`;sm.querySelector('.gi').append(icon(groupIcons[i]));sm.querySelector('.gn').textContent=g.name;d.append(sm);
    d.ontoggle=()=>{if(query)return;fold[g.name]=d.open;try{localStorage.setItem('plantLight.panel.v1',JSON.stringify(fold));}catch{}};
    for(const p of g.items){
      const row=document.createElement('div');row.className='row';row.dataset.key=p.key;const lab=document.createElement('label');lab.textContent=p.label;lab.htmlFor=`setting-${p.key}`;row.append(lab);let el,num;
      const commit=v=>onChange(p.key,v);
      if(p.type==='button'){el=document.createElement('button');el.textContent=commandLabel(p.text);el.onclick=()=>onAction(p.key);}
      else if(p.type==='range'){el=document.createElement('input');el.type='range';el.min=p.min;el.max=p.max;el.step=p.step;num=document.createElement('input');num.className='val';num.type='number';num.min=p.min;num.max=p.max;num.step=p.step;num.setAttribute('aria-label',p.label+'数值');const set=v=>{v=Math.max(p.min,Math.min(p.max,+v));if(!Number.isFinite(v))return;el.value=v;num.value=v;commit(v);};el.oninput=()=>set(el.value);num.onchange=()=>set(num.value);}
      else if(p.type==='bool'){el=document.createElement('input');el.type='checkbox';row.classList.add('t-checkbox');el.onchange=()=>commit(el.checked);}
      else if(p.type==='select'){el=document.createElement('select');for(const [v,t]of p.options){const o=document.createElement('option');o.value=v;o.textContent=t;el.append(o);}el.onchange=()=>commit(typeof p.value==='number'?+el.value:el.value);}
      else if(p.type==='file'){el=document.createElement('input');el.type='file';el.accept='image/png,image/webp,image/jpeg';el.onchange=()=>{const f=el.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>commit(fr.result);fr.readAsDataURL(f);};}
      else{el=document.createElement('input');el.type=p.type==='color'?'color':'text';el.onchange=()=>commit(el.value);}
      el.id=`setting-${p.key}`;row.append(el);if(num)row.append(num);d.append(row);refs.set(p.key,{el,num,row,spec:p});
      if(p.key==='handImage'){const r=document.createElement('div');r.className='row handprev';r.innerHTML='<label>点击预览设置指尖锚点</label><canvas id="handPrev" width="150" height="190"></canvas>';d.append(r);}
    }
    root.append(d);
  }
  function sync(){for(const [k,{el,num,spec}]of refs){if(spec.type==='button'||spec.type==='file')continue;if(spec.type==='bool')el.checked=!!S[k];else el.value=S[k];if(num)num.value=S[k];}}
  let beforeSearch=null;
  function filter(q){query=String(q).trim().toLowerCase();const sections=[...root.querySelectorAll('details')];if(query&&!beforeSearch)beforeSearch=new Map(sections.map(d=>[d,d.open]));for(const d of sections){let any=false;for(const row of d.querySelectorAll('.row')){const yes=!query||d.dataset.group.toLowerCase().includes(query)||row.textContent.toLowerCase().includes(query)||(row.dataset.key||'').toLowerCase().includes(query);row.hidden=!yes;any||=yes;}d.hidden=!any;if(query&&any)d.open=true;else if(!query&&beforeSearch)d.open=beforeSearch.get(d);}if(!query)beforeSearch=null;}
  sync();return {refs,sync,filter,setButton(key,text,on){const r=refs.get(key);if(r){r.el.textContent=commandLabel(text);r.el.classList.toggle('on',!!on);}}};
}
