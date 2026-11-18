// 植物光路：WebAudio 合成播种、藤蔓、花朵与界面音效，无外部音频依赖。
export const SFX_NAMES = {
  seed: ['sfxSeed', '播种'], grow: ['sfxGrow', '生长'], bloom: ['sfxBloom', '开花'],
  win: ['sfxWin', '通关'], undo: ['sfxUndo', '撤销'], fail: ['sfxFail', '失败'],
  hint: ['sfxHint', '提示'], water: ['sfxWater', '浇水'], click: ['sfxClick', '点击'],
  pick: ['sfxSeed', '播种'], land: ['sfxGrow', '生长'], match: ['sfxBloom', '开花'],
};
export const SFX_DUR = { seed:.25, grow:.32, bloom:.65, win:1.7, undo:.32, fail:.65, hint:.5, water:.55, click:.09, pick:.25, land:.32, match:.65 };
const audible=S=>!S?.sfxMute&&!(+S?.sfxVolume<=0);
export class Sfx {
  constructor() { this.ctx=null; this._t=null; this.hook=null; }
  ensure() {
    if(this.ctx) return this.ctx;
    const C=window.AudioContext||window.webkitAudioContext; if(!C)return null;
    this.ctx=new C(); this.master=this.ctx.createGain(); this.master.connect(this.ctx.destination);
    return this.ctx;
  }
  get recDest() {
    if(!this._recDest&&this.ctx?.createMediaStreamDestination){
      this._recDest=this.ctx.createMediaStreamDestination();this.master.connect(this._recDest);
    }
    return this._recDest;
  }
  prepare(S) {
    // Open the device during asset loading; the first gesture still resumes it.
    if(audible(S))try{this.ensure();}catch{/* Some browsers require a gesture to create the context. */}
  }
  makeNoise() {
    const n=Math.round(this.ctx.sampleRate*.8),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=b.getChannelData(0);let x=2463534242;
    for(let i=0;i<n;i++){x^=x<<13;x^=x>>>17;x^=x<<5;data[i]=(x>>>0)/4294967295*2-1;}this.noise=b;
  }
  now(){return this._t!=null?this._t:this.ctx.currentTime;}
  resume(S){if(!audible(S))return;const c=this.ensure();if(c&&(c.state==='suspended'||c.state==='interrupted'))return c.resume();}
  play(name,S={},options={}) {
    const [key]=SFX_NAMES[name]||[];if(!key||S.sfxMute||S[key]===false)return;
    const volume=Math.max(0,Number.isFinite(+S.sfxVolume)?+S.sfxVolume:.7);if(!volume)return;
    if(this.hook&&this._t==null)this.hook(name,options);if(!this.ensure())return;
    const ev=Number.isFinite(+S[key+'Vol'])?Math.max(0,+S[key+'Vol']):1;
    const fn=this['_'+name];if(fn)fn.call(this,this.now(),volume*ev,options);
  }
  env(g,t,a,peak,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);}
  osc(t,type,f0,f1,dur,v,a=.006){
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(20,f0),t);
    if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    this.env(g,t,a,v,dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+a+dur+.025);
  }
  nz(t,type,f0,f1,q,dur,v,a=.006){
    if(!this.noise)this.makeNoise();
    const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noise;f.type=type;f.frequency.setValueAtTime(Math.max(40,f0),t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);f.Q.value=q;this.env(g,t,a,v,dur);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+a+dur+.025);
  }
  _seed(t,v){this.osc(t,'sine',540,250,.11,v*.24);this.osc(t+.035,'triangle',850,500,.13,v*.075);this.nz(t,'lowpass',1300,420,.7,.07,v*.10);}
  _grow(t,v){this.nz(t,'bandpass',1100,3300,1.1,.25,v*.08,.02);this.osc(t,'sine',430,1000,.19,v*.07,.018);}
  _bloom(t,v,o={}){const r=Math.pow(2,(Math.max(0,o.index||0)%5)*2/12);[784,988,1175].forEach((f,i)=>{this.osc(t+i*.055,'sine',f*r,f*r,.4,v*.13);this.osc(t+i*.055,'sine',f*2*r,f*2*r,.18,v*.022);});}
  _win(t,v){[523,659,784,1047,1319].forEach((f,i)=>{this.osc(t+i*.115,'triangle',f,f,.62,v*.14);this.osc(t+i*.115,'sine',f*2,f*2,.35,v*.035);});this.nz(t+.1,'highpass',3200,6000,.7,.8,v*.045,.03);}
  _undo(t,v){this.osc(t,'sine',900,390,.24,v*.14);this.osc(t+.06,'triangle',600,260,.2,v*.04);}
  _fail(t,v){this.osc(t,'triangle',300,150,.35,v*.13);this.osc(t+.17,'sine',225,112,.42,v*.1);}
  _hint(t,v){[880,1175,1568].forEach((f,i)=>this.osc(t+i*.07,'sine',f,f,.3,v*.1));}
  _water(t,v){[0,.07,.15,.23].forEach((d,i)=>{this.osc(t+d,'sine',1000+i*170,450+i*80,.14,v*.055);this.nz(t+d,'highpass',2200,1100,.7,.08,v*.025);});}
  _click(t,v){this.osc(t,'sine',1000,650,.045,v*.08);}
  _pick(t,v,o){this._seed(t,v,o);}_land(t,v,o){this._grow(t,v,o);}_match(t,v,o){this._bloom(t,v,o);}
}
export async function renderSfxOffline(events,duration,S={}){
  const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!C)return null;
  const sr=44100,oc=new C(1,Math.max(1,Math.ceil(sr*Math.max(.2,duration))),sr);
  const x=new Sfx();x.ctx=oc;x.master=oc.createGain();x.master.connect(oc.destination);
  for(const e of events){x._t=Math.max(0,+e.t||0);x.play(e.name,{...S,sfxMute:false},e);}return oc.startRendering();
}
export function encodeWav(buffer){
  const samples=buffer.getChannelData(0),n=samples.length,d=new DataView(new ArrayBuffer(44+n*2));
  const str=(o,s)=>{for(let i=0;i<s.length;i++)d.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');d.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,buffer.sampleRate,true);d.setUint32(28,buffer.sampleRate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const x=Math.max(-1,Math.min(1,samples[i]));d.setInt16(44+i*2,x<0?x*32768:x*32767,true);}return new Uint8Array(d.buffer);
}
