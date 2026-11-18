// Actual-browser integration helpers. All generated evidence stays in test/artifacts.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ART = path.join(ROOT, 'test', 'artifacts');
export const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const BLENDER = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.png':'image/png', '.wav':'audio/wav' };
let passed = 0;
const failures = [];
export const log = msg => process.stdout.write(String(msg) + '\n');
export const stage = msg => log('\n▶ ' + msg);
export function check(ok, msg, detail) { if (ok) passed++; else { failures.push({msg,detail}); log('  ✗ ' + msg + (detail === undefined ? '' : ' [' + JSON.stringify(detail) + ']')); } return !!ok; }
export const eq = (a,b,msg) => check(Object.is(a,b),msg,{actual:a,expected:b});
export const near = (a,b,tol,msg) => check(Math.abs(a-b)<=tol,msg,{actual:a,expected:b,tolerance:tol});
export function summary(title) { log(`\n${failures.length ? '✗' : '✓'} ${title}：${passed} 项通过，${failures.length} 项失败`); if(failures.length) process.exitCode=1; return {passed,failures}; }
export async function ensureArt(kind) { const p=path.join(ART,kind); await fsp.mkdir(p,{recursive:true}); return p; }
export const readJson = async p => JSON.parse(await fsp.readFile(p,'utf8'));
export async function writeJson(p,obj) { await fsp.mkdir(path.dirname(p),{recursive:true}); await fsp.writeFile(p,JSON.stringify(obj,null,2)); }
export async function saveDataUrl(url,p) { await fsp.mkdir(path.dirname(p),{recursive:true}); await fsp.writeFile(p,Buffer.from(url.slice(url.indexOf(',')+1),'base64')); }
// Read what Canvas actually painted for a HUD item without assuming a theme,
// font, asset name or palette. Weak keys preserve the renderer's cache lifetime.
export async function observeHudText(page) {
  await page.addInitScript(() => {
    const textByCanvas = new WeakMap();
    const prototype = CanvasRenderingContext2D.prototype, fillText = prototype.fillText;
    prototype.fillText = function(text, ...args) {
      const result = fillText.call(this, text, ...args);
      textByCanvas.set(this.canvas, String(text));
      return result;
    };
    window.readPaintedHudText = id => {
      const drawn = window.__app.items.find(it => it.id === id && it.op > 0);
      return textByCanvas.get(window.__app.A[drawn?.asset]?.c);
    };
  });
}
export async function unzip(p,dest) { await fsp.rm(dest,{force:true,recursive:true}); await fsp.mkdir(dest,{recursive:true}); execFileSync('unzip',['-q','-o',p,'-d',dest]); return dest; }
export async function serve(root=ROOT) {
  const server=http.createServer(async(req,res)=>{ try { const u=new URL(req.url,'http://localhost'); if(u.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;} let rel=decodeURIComponent(u.pathname);if(rel.endsWith('/'))rel+='index.html';const p=path.resolve(root,'.'+rel);if(p!==root&&!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}const st=await fsp.stat(p).catch(()=>null);if(!st?.isFile()){res.writeHead(404);res.end('not found');return;}res.writeHead(200,{'content-type':MIME[path.extname(p)]||'application/octet-stream','cache-control':'no-store','access-control-allow-origin':'*'});fs.createReadStream(p).pipe(res);}catch(e){res.writeHead(500);res.end(e.message);} });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
export async function launch() { if(!fs.existsSync(CHROME))throw new Error('Chrome unavailable: '+CHROME);return chromium.launch({executablePath:CHROME,headless:true,args:['--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--mute-audio']}); }
export async function newPage(browser,viewport={width:1440,height:1000}) { const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});return {context,page,errors}; }
export async function waitGame(page) { await page.waitForFunction(()=>window.__ready&&window.__app?.L&&window.__app?.items?.length>0,null,{timeout:60000}); }
export async function applySettings(page,settings={}) { await page.evaluate(async patch=>{for(const [k,v]of Object.entries(patch))await __app.setSetting(k,v);},settings);await page.waitForTimeout(100); }
export const FAST = {level:'2',recRes:'720x1600',autoSpeed:1,moveMin:550,moveMax:550,delayMin:50,delayMax:50,thinkChance:0,jitter:0,curve:0,growMs:600,bloomMs:350,winDelay:700,endDelay:700,nextDelay:700,autoNext:false,autoLevelCount:1,endCard:false,autoRec:false,autoStop:false,sfxMute:false,showParticles:true,bgMotion:true,aeFps:30,aeSampling:'reduce',aeNames:'zh',aeAudio:'both',aeSaveAep:false,export3dFps:25,export3dHand:true};
export async function recordActualGame(page,extra={}) {
  await applySettings(page,{...FAST,...extra});
  await page.evaluate(()=>{__app.newGame(__app.S.level);__app.recorder.start({snapEvery:10,maxSnaps:80});});
  await page.waitForTimeout(250);
  await page.locator('#btnAuto').click();
  await page.waitForFunction(()=>__app.ST.status==='won'&&!__app.AUTO.running,null,{timeout:90000});
  // Capture settled blooms as well as active growth. The full scene must be recorded.
  await page.waitForTimeout(1000);
  return page.evaluate(()=>{__app.lastRecord=__app.recorder.stop();const r=__app.lastRecord;return {won:__app.ST.status==='won',frames:r.frames,duration:r.lastT,sfx:r.sfx.length,tracks:r.tracks.size,snaps:r.snaps.length,flowers:__app.L.flowers.length,moves:__app.ST.moves.length};});
}
export async function blobResult(page,expression,outDir) { const result=await page.evaluate(async code=>{const r=await (0,eval)(code);return {name:r.name,base64:await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result.split(',')[1]);f.onerror=rej;f.readAsDataURL(r.blob);}),stats:r.stats,meta:r.meta};},expression);const p=path.join(outDir,result.name);await fsp.writeFile(p,Buffer.from(result.base64,'base64'));return {...result,path:p,base64:undefined}; }
export async function nextDownload(page,action,outDir) { const p=page.waitForEvent('download',{timeout:240000});await action();const dl=await p,pth=path.join(outDir,dl.suggestedFilename());await dl.saveAs(pth);return pth; }
export async function clickSolution(page,{all=false}={}) { let count=0;do { const p=await page.evaluate(()=>{if(__app.ST.status!=='playing')return null;const p=__app.core.solve(__app.L,__app.ST)?.[0],b=__app.boardLayout();return p?{x:b.cx(p.c),y:b.cy(p.r)}:null;});if(!p)break;const box=await page.locator('#stage').boundingBox();await page.mouse.click(box.x+p.x/720*box.width,box.y+p.y/1600*box.height);count++;await page.waitForTimeout(180); }while(all&&count<25);return count; }
export async function imageStats(page,src) { return page.evaluate(async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=144;c.height=320;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,144,320);const d=g.getImageData(0,0,144,320).data,colors=new Set();let sum=0,lit=0;for(let i=0;i<d.length;i+=4){const v=(d[i]+d[i+1]+d[i+2])/3;sum+=v;if(v>20)lit++;if(i%32===0)colors.add([d[i]>>3,d[i+1]>>3,d[i+2]>>3].join(','));}return {mean:sum/(d.length/4),lit:lit/(d.length/4),colors:colors.size};},src); }
export async function compareImages(page,a,b) { return page.evaluate(async([a,b])=>{const load=async src=>{const im=new Image();im.src=src;await im.decode();return im;},[A,B]=await Promise.all([load(a),load(b)]),c=document.createElement('canvas');c.width=720;c.height=1600;const g=c.getContext('2d',{willReadFrequently:true}),read=im=>{g.clearRect(0,0,720,1600);g.drawImage(im,0,0,720,1600);return g.getImageData(0,0,720,1600).data;},da=read(A),db=read(B);let se=0,ae=0,n=0,bad=0;for(let i=0;i<da.length;i+=4)for(let k=0;k<3;k++){const d=da[i+k]-db[i+k];se+=d*d;ae+=Math.abs(d);if(Math.abs(d)>24)bad++;n++;}return{psnr:se?10*Math.log10(65025/(se/n)):99,mae:ae/n,badRatio:bad/n};},[a,b]); }

// Runs the shipped ExtendScript using a bounded AE object-model mock. This does
// not replace an actual After Effects smoke test, but catches broken construction.
export function runJsxMock(projectDir,TL) {
  const alerts=[],imports=[],comps=[],saves=[];
  class Prop {constructor(v){this.value=v;this.keys=[];this.numKeys=0;this.dimensionsSeparated=false;}setValue(v){this.value=v;}setValuesAtTimes(t,v){this.keys=t.map((x,i)=>[x,v[i]]);this.numKeys=t.length;}setValueAtTime(t,v){this.keys.push([t,v]);this.numKeys=this.keys.length;}setInterpolationTypeAtKey(){}}
  class Layer {constructor(source,comp){this.source=source;this.name=source?.name||'Layer';this.inPoint=0;this.outPoint=comp.duration;this.startTime=0;this.audioEnabled=true;this.props={};}property(n){if(n==='ADBE Transform Group'||n==='ADBE Audio Group')return this.props[n]||(this.props[n]={props:{},property(k){return this.props[k]||(this.props[k]=new Prop(0));}});return this.props[n]||(this.props[n]=new Prop(0));}}
  class Comp {constructor(name,w,h,duration,fps){Object.assign(this,{name,width:w,height:h,duration,fps,layers:[],markerProperty:new Prop()});this.layers.add=s=>{const l=new Layer(s,this);this.layers.push(l);return l;};this.layers.addSolid=(s,n)=>this.layers.add({name:n});comps.push(this);}openInViewer(){}}
  class File {constructor(p){this.fsName=String(p);this.name=path.basename(this.fsName);this.parent={fsName:path.dirname(this.fsName)};this.exists=fs.existsSync(this.fsName);}open(){try{this.text=fs.readFileSync(this.fsName,'utf8');return true;}catch{return false;}}read(){return this.text;}close(){}}
  const project=()=>({items:{addFolder:name=>({name}),addComp:(n,w,h,pa,d,f)=>new Comp(n,w,h,d,f)},importFile(io){imports.push(io.file.fsName);return {name:io.file.name};},save(f){saves.push(f.fsName);}});
  const app={project:project(),calls:0,newProject(){this.project=project();this.calls++;},beginUndoGroup(){},endUndoGroup(){}};
  const sandbox={File,ImportOptions:class {constructor(file){this.file=file;}canImportAs(){return true;}},ImportAsType:{FOOTAGE:'footage'},KeyframeInterpolationType:{LINEAR:1,HOLD:2},BlendingMode:{ADD:'add'},MarkerValue:class {constructor(comment){this.comment=comment;}},app,alert:m=>alerts.push(String(m)),confirm:()=>true,$:{fileName:path.join(projectDir,'build_ae_project.jsx'),global:{}},console};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(projectDir,'build_ae_project.jsx'),'utf8'),sandbox,{timeout:60000});
  const stats=sandbox.$.global.__PLANT_LIGHT_BUILD_STATS,main=TL.comps.find(c=>c.id===TL.mainComp),made=comps.find(c=>c.name===main.name);
  return {alerts,imports:imports.length,comps:comps.length,layers:made?.layers.length,width:made?.width,height:made?.height,stats,saves:saves.length,newProjects:app.calls,allAssetsExist:imports.every(p=>fs.existsSync(p))};
}

export function readGlb(buf) { const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);let json=null,binLen=0;for(let o=12;o+8<=buf.length;){const n=dv.getUint32(o,true),type=dv.getUint32(o+4,true);if(type===0x4e4f534a)json=JSON.parse(buf.subarray(o+8,o+8+n).toString('utf8'));if(type===0x004e4942)binLen=n;o+=8+n;}return {magic:buf.subarray(0,4).toString(),version:dv.getUint32(4,true),length:dv.getUint32(8,true),json,binLen}; }

// Browser-side Canvas replay of the exported timeline, with no game renderer.
export async function compareTimeline(page,projectUrl,snaps,outDir) {
  const results=[];
  for(const [i,snap]of snaps.entries()) {
    const result=await page.evaluate(async ({projectUrl,snap})=>{
      const TL=await (await fetch(projectUrl+'/timeline.json')).json(),main=TL.comps.find(c=>c.id===TL.mainComp),assets=new Map(TL.assets.map(a=>[a.id,a])),images=new Map();
      const load=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('image '+src));im.src=src;});
      await Promise.all([...new Set(main.layers.map(l=>l.src?.asset).filter(id=>/\.png$/i.test(assets.get(id)?.file||'')))].map(async id=>images.set(id,await load(projectUrl+'/'+assets.get(id).file))));
      const val=(p,t,f)=>{if(p==null)return f;if(Array.isArray(p)||typeof p==='number')return p;if(!p.t?.length)return f;let i=0;while(i<p.t.length-1&&p.t[i+1]<=t)i++;if(i===p.t.length-1||p.hold||t<=p.t[0])return p.v[i];const u=(t-p.t[i])/(p.t[i+1]-p.t[i]),a=p.v[i],b=p.v[i+1];return Array.isArray(a)?a.map((v,k)=>v+(b[k]-v)*u):a+(b-a)*u;};
      const c=document.createElement('canvas');c.width=TL.meta.width;c.height=TL.meta.height;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);
      for(const l of main.layers){const a=assets.get(l.src?.asset),im=images.get(l.src?.asset);if(!im||!l.tr||snap.t<l.in||snap.t>=l.out)continue;const p=val(l.tr.position,snap.t,[0,0]),sc=val(l.tr.scale,snap.t,[100,100]),rot=val(l.tr.rotation,snap.t,0),op=val(l.tr.opacity,snap.t,100),anchor=l.tr.anchor||[a.w/2,a.h/2];g.save();g.translate(p[0],p[1]);g.rotate(rot*Math.PI/180);g.scale(sc[0]/100,sc[1]/100);g.globalAlpha=Math.max(0,Math.min(1,op/100));g.drawImage(im,-anchor[0],-anchor[1],a.w,a.h);g.restore();}
      const composite=c.toDataURL('image/png'),web=await load(snap.url),a=g.getImageData(0,0,c.width,c.height).data;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.clearRect(0,0,c.width,c.height);g.drawImage(web,0,0,c.width,c.height);const b=g.getImageData(0,0,c.width,c.height).data;let se=0,ae=0,bad=0,n=0;for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++){const d=a[i+k]-b[i+k];se+=d*d;ae+=Math.abs(d);if(Math.abs(d)>24)bad++;n++;}const mse=se/n;return {composite,psnr:mse?10*Math.log10(65025/mse):99,mae:ae/n,badRatio:bad/n,t:snap.t};
    },{projectUrl,snap});
    await saveDataUrl(snap.url,path.join(outDir,`web_${i}.png`));await saveDataUrl(result.composite,path.join(outDir,`ae_${i}.png`));delete result.composite;results.push(result);
  }
  return results;
}
