export function createPanel({root,groups,S,onChange,onAction}) {
  const refs=new Map();let fold={};try{fold=JSON.parse(localStorage.getItem('plantLight.panel.v1')||'{}');}catch{}
  for(const g of groups){
    const d=document.createElement('details');d.open=g.name in fold?fold[g.name]:!!g.open;d.dataset.group=g.name;
    const sm=document.createElement('summary');sm.innerHTML=`<span class="gi">${g.icon}</span><span class="gn"></span><span class="gc">${g.items.length}</span>`;sm.querySelector('.gn').textContent=g.name;d.append(sm);
    d.ontoggle=()=>{fold[g.name]=d.open;try{localStorage.setItem('plantLight.panel.v1',JSON.stringify(fold));}catch{}};
    for(const p of g.items){
      const row=document.createElement('div');row.className='row';row.dataset.key=p.key;const lab=document.createElement('label');lab.textContent=p.label;lab.htmlFor=`setting-${p.key}`;row.append(lab);let el,num;
      const commit=v=>onChange(p.key,v);
      if(p.type==='button'){el=document.createElement('button');el.textContent=p.text;el.onclick=()=>onAction(p.key);}
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
  function filter(q){q=String(q).trim().toLowerCase();for(const d of root.querySelectorAll('details')){let any=false;for(const row of d.querySelectorAll('.row')){const yes=!q||d.dataset.group.toLowerCase().includes(q)||row.textContent.toLowerCase().includes(q)||String(row.dataset.key).toLowerCase().includes(q);row.hidden=!yes;any||=yes;}d.hidden=!any;if(q&&any)d.open=true;}}
  sync();return {refs,sync,filter,setButton(key,text,on){const r=refs.get(key);if(r){r.el.textContent=text;r.el.classList.toggle('on',!!on);}}};
}
