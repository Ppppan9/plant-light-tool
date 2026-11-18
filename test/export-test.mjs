// Actual game recording → AE/3D ZIP → independent replay/import checks.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {ROOT,BLENDER,serve,launch,newPage,waitGame,recordActualGame,blobResult,unzip,readJson,writeJson,saveDataUrl,check,eq,near,summary,log,stage,ensureArt,runJsxMock,compareTimeline,readGlb,imageStats,compareImages} from './helpers.mjs';

const mode=process.argv[2]||'ae';
if(!['ae','3d'].includes(mode))throw new Error('Usage: node test/export-test.mjs ae|3d');
const outDir=await ensureArt(mode),projectDir=path.join(outDir,'project');
const server=await serve(),browser=await launch();let page,context,errors;
try {
  stage('真实游戏：点击自动通关并记录完整一关');
  ({page,context,errors}=await newPage(browser));
  await page.goto(server.origin+'/index.html',{waitUntil:'load'});await waitGame(page);
  const run=await recordActualGame(page);
  eq(run.won,true,'自动演示真实通关');check(run.frames>60,'记录超过 60 帧',run.frames);check(run.snaps>=3,'至少三帧原始快照',run.snaps);check(run.sfx>0,'包含实际游戏音效事件',run.sfx);check(run.tracks>run.flowers,'每个游戏元素独立记录',run);
  await saveDataUrl(await page.locator('#stage').evaluate(c=>c.toDataURL('image/png')),path.join(outDir,'game-end.png'));
  await writeJson(path.join(outDir,'record.json'),run);
  const out=await blobResult(page,mode==='ae'?'__app.exportAE()':'__app.export3D()',outDir);
  check(new RegExp('^plantlight_'+(mode==='ae'?'ae':'3d')+'_export_\\d{8}_\\d{6}\\.zip$').test(out.name),'导出 ZIP 命名规范',out.name);
  await unzip(out.path,projectDir);
  const TL=await readJson(path.join(projectDir,'timeline.json')),main=TL.comps.find(c=>c.id===TL.mainComp),ids=main.layers.map(l=>l.src?.asset||'');
  eq(TL.meta.tool,'plant-light-tool','工具标识正确');eq(TL.meta.width,720,'画面宽 720');eq(TL.meta.height,1600,'画面高 1600');check(TL.meta.duration>1,'时长有效',TL.meta.duration);check(main.layers.length>run.flowers,'主合成包含独立元素',main.layers.length);
  for(const [kind,re]of [['tile',/^(?:soil|tile)(?:_|$)/],['bud',/^bud(?:_|$)/],['vine',/^vine(?:_|$)/],['flower',/^flower(?:_|$)/],['hand',/^hand(?:_|$)/]])check(ids.some(id=>re.test(id)),kind+' 使用独立素材与图层',ids.filter(id=>re.test(id)).length);
  const missing=TL.assets.filter(a=>!fs.existsSync(path.join(projectDir,a.file)));eq(missing.length,0,'所有素材引用真实存在');
  check(fs.existsSync(path.join(projectDir,'audio/mix.wav')),'包含混合音轨');check(TL.comps.some(c=>c.id==='sfx'&&c.layers.length>0),'包含逐事件音效预合成');
  if(mode==='ae') {
    stage('AE：精简/逐帧采样与 JSX 工程构建');
    eq(TL.meta.sampling,'reduce','默认精简关键帧');eq(TL.meta.names,'zh','中文命名');eq(main.name,'主合成_植物光路','主合成命名');
    check(main.layers.some(l=>l.name==='手指'),'固定手指层名');check(main.layers.some(l=>l.name==='背景'),'固定背景层名');
    const mix=main.layers.find(l=>l.src?.asset==='mix');eq(mix?.audioEnabled,false,'同时导出混音与事件时混音静音防止重叠');
    const mock=runJsxMock(projectDir,TL);await writeJson(path.join(outDir,'jsx-mock.json'),mock);
    check(mock.alerts.some(s=>s.includes('完成！')),'JSX 完成建工程');check(!mock.alerts.some(s=>/警告|缺少素材/.test(s)),'JSX 无素材或图层警告',mock.alerts);eq(mock.imports,TL.assets.length,'JSX 导入全部素材');eq(mock.layers,main.layers.length,'JSX 创建全部主合成图层');eq(mock.width,720,'JSX 合成宽');eq(mock.height,1600,'JSX 合成高');eq(mock.newProjects,1,'JSX 创建一次工程');eq(mock.saves,0,'saveAep=false 不另存文件');check(mock.allAssetsExist,'JSX 导入路径均存在');eq(mock.stats?.layers,TL.meta.stats.layers,'JSX 图层统计一致');check(mock.stats?.keys>0,'JSX 创建动画关键帧');check(mock.stats?.markers>0,'JSX 创建音效标记');
    const bake=await page.evaluate(async()=>{const r=await __app.recorder.exportZip(__app.lastRecord,{aeSampling:'bake',aeNames:'en',aeFps:25,aeSize:'1080x2400',aeAudio:'none'});return {meta:r.timeline.meta,main:r.timeline.comps.find(c=>c.id==='main'),assets:r.timeline.assets.length};});
    eq(bake.meta.sampling,'bake','可逐帧烘焙');eq(bake.meta.fps,25,'烘焙尊重 25fps');eq(bake.meta.width,1080,'可输出 1080 宽');eq(bake.meta.height,2400,'可输出 2400 高');eq(bake.main.name,'Main_PlantLight','可英文命名');check(bake.meta.stats.keys>=TL.meta.stats.keys,'烘焙关键帧不低于精简采样',{bake:bake.meta.stats.keys,reduce:TL.meta.stats.keys});await writeJson(path.join(outDir,'bake-meta.json'),bake.meta);
    stage('AE：独立时间轴回放与网页快照 PSNR');
    const snaps=await page.evaluate(()=>{const a=__app.lastRecord.snaps;return [...new Set([0,Math.floor(a.length*.25),Math.floor(a.length*.5),Math.floor(a.length*.75),a.length-1])].map(i=>a[i]);});
    const projectUrl=server.origin+'/'+path.relative(ROOT,projectDir).split(path.sep).join('/');
    const psnr=await compareTimeline(page,projectUrl,snaps,outDir);await writeJson(path.join(outDir,'psnr.json'),psnr);
    check(psnr.length>=3,'至少三帧独立重合成');for(const r of psnr){check(r.psnr>=28,'AE 回放 PSNR ≥28dB @ '+r.t.toFixed(3)+'s',r);check(r.badRatio<.08,'AE 回放大误差像素少于 8% @ '+r.t.toFixed(3)+'s',r.badRatio);}log('  PSNR '+psnr.map(r=>r.psnr.toFixed(2)).join(', ')+' dB');
  } else {
    stage('3D：GLB / 二进制 FBX / 场景结构');
    for(const f of ['scene.glb','scene.fbx','scene3d.json','timeline.json','blender_import.py','README_3D.md'])check(fs.existsSync(path.join(projectDir,f)),'存在 '+f);
    const meta=await readJson(path.join(projectDir,'scene3d.json')),glb=readGlb(await fsp.readFile(path.join(projectDir,'scene.glb'))),fbx=await fsp.readFile(path.join(projectDir,'scene.fbx'));
    eq(meta.format,'export3d/1','3D schema');eq(meta.tool,'plant-light-tool','3D 工具标识');eq(meta.fps,25,'3D 尊重设定 25fps');eq(meta.width,720,'3D 宽');eq(meta.height,1600,'3D 高');eq(meta.camera.name,'Camera_PlantLight','原生相机命名');near(meta.camera.aspect,9/20,.001,'相机比例 9:20');eq(meta.frames,meta.frameEnd+1,'帧范围一致');check(meta.nodes.length>=run.flowers,'每个元素有独立网格');check(meta.stats.tracks>0,'GLB/FBX 含动画轨道');check(meta.audio.length>0,'3D 包含事件音轨');
    eq(glb.magic,'glTF','GLB 二进制签名');eq(glb.version,2,'glTF 2.0');eq(glb.length,fs.statSync(path.join(projectDir,'scene.glb')).size,'GLB 长度字段');check(glb.binLen>0,'GLB 内嵌二进制数据');check(glb.json.images?.every(i=>i.bufferView!==undefined),'GLB 图片内嵌');check(glb.json.animations?.[0]?.channels?.length>0,'GLB 原生动画通道');check(glb.json.cameras?.length>0,'GLB 原生相机');eq(fbx.subarray(0,18).toString(),'Kaydara FBX Binary','FBX 为真实二进制文件');eq(fbx.readUInt32LE(23),7400,'FBX 7400');
    const soil=meta.nodes.find(n=>/^(soil|tile)_/.test(n.asset)),flower=meta.nodes.find(n=>/^flower_/.test(n.asset)),hand=meta.nodes.find(n=>/^hand(?:_|$)/.test(n.asset));check(soil&&flower&&soil.z<flower.z,'土壤位于花朵后方的独立景深',{soil:soil?.z,flower:flower?.z});check(hand&&hand.z>flower.z,'手指位于植物前方',{hand:hand?.z,flower:flower?.z});
    const noHand=await page.evaluate(async()=>{__app.S.export3dHand=false;try{const r=await __app.export3D();return r.meta.nodes.filter(n=>/^hand(?:_|$)/.test(n.asset)).length;}finally{__app.S.export3dHand=true;}});eq(noHand,0,'关闭3D手指导出时正确过滤动态 hand_* 素材');
    stage('3D：Blender 实际导入 GLB 并渲染三帧');
    if(!fs.existsSync(BLENDER))throw new Error('Blender unavailable: '+BLENDER);
    const renderSnaps=await page.evaluate(()=>{const a=__app.lastRecord.snaps;return [...new Set([0,Math.floor(a.length*.5),a.length-1])].map(i=>a[i]);});
    const renders=path.join(outDir,'blender'),times=renderSnaps.map(s=>s.t.toFixed(4)+'s');
    const args=['--background','--factory-startup','--python',path.join(projectDir,'blender_import.py'),'--','--render',times.join(','),'--out',renders,'--verify'];
    const result=spawnSync(BLENDER,args,{encoding:'utf8',timeout:240000,maxBuffer:20*1024*1024});await fsp.writeFile(path.join(outDir,'blender.log'),(result.stdout||'')+'\n'+(result.stderr||''));eq(result.status,0,'Blender GLB 导入渲染成功',result.error?.message);
    const reportLine=(result.stdout||'').split('\n').find(l=>l.startsWith('EXPORT3D_REPORT '));check(!!reportLine,'Blender 输出结构报告');
    if(reportLine){const report=JSON.parse(reportLine.slice('EXPORT3D_REPORT '.length));await writeJson(path.join(outDir,'blender-report.json'),report);check(!report.problems?.length,'Blender 验证无问题',report.problems);check(report.meshes>=meta.nodes.length,'Blender 独立网格数量一致');check(report.keyframes>0,'Blender 有实际关键帧');eq(report.fps,25,'Blender 帧率');eq(report.resolution.join('x'),'720x1600','Blender 分辨率');check(report.renders?.length>=3,'Blender 三帧真实渲染');const diffs=[];for(const [i,p]of (report.renders||[]).entries()){check(fs.existsSync(p),'渲染 PNG 存在 '+path.basename(p));const src='data:image/png;base64,'+(await fsp.readFile(p)).toString('base64'),s=await imageStats(page,src);check(s.mean>20&&s.colors>30,'Blender 渲染非空 '+path.basename(p),s);if(renderSnaps[i]){await saveDataUrl(renderSnaps[i].url,path.join(outDir,`web-blender-${i}.png`));const d=await compareImages(page,src,renderSnaps[i].url);diffs.push({t:renderSnaps[i].t,...d});check(d.psnr>=24,'Blender 与网页构图 PSNR ≥24dB @ '+renderSnaps[i].t.toFixed(3)+'s',d);}}await writeJson(path.join(outDir,'blender-psnr.json'),diffs);log('  Blender PSNR '+diffs.map(d=>d.psnr.toFixed(2)).join(', ')+' dB');}
    stage('3D：Blender 直接导入浏览器生成的 FBX');
    const fbxScript=path.join(outDir,'verify-fbx.py');
    await fsp.writeFile(fbxScript,`import bpy, json, os\nbpy.ops.object.select_all(action='SELECT')\nbpy.ops.object.delete(use_global=False)\nbpy.ops.import_scene.fbx(filepath=${JSON.stringify(path.join(projectDir,'scene.fbx'))})\nobjs=list(bpy.data.objects)\ncams=[o for o in objs if o.type=='CAMERA']\nscene=bpy.context.scene\nscene.camera=cams[0] if cams else None\nscene.render.engine='CYCLES'\nscene.cycles.samples=8\nscene.render.resolution_x=360\nscene.render.resolution_y=800\nscene.render.resolution_percentage=100\nscene.frame_set(1)\nscene.render.filepath=${JSON.stringify(path.join(outDir,'fbx-render.png'))}\nif cams: bpy.ops.render.render(write_still=True)\nprint('FBX_REPORT '+json.dumps({'meshes':sum(o.type=='MESH' for o in objs),'cameras':len(cams),'actions':len(bpy.data.actions),'rendered':os.path.exists(scene.render.filepath)}))\n`);
    const fr=spawnSync(BLENDER,['--background','--factory-startup','--python',fbxScript],{encoding:'utf8',timeout:180000,maxBuffer:20*1024*1024});await fsp.writeFile(path.join(outDir,'fbx-blender.log'),(fr.stdout||'')+'\n'+(fr.stderr||''));eq(fr.status,0,'浏览器 FBX 可由 Blender 直接导入');const line=(fr.stdout||'').split('\n').find(l=>l.startsWith('FBX_REPORT '));check(!!line,'FBX 输出报告');if(line){const report=JSON.parse(line.slice(11));await writeJson(path.join(outDir,'fbx-report.json'),report);check(report.meshes>=meta.nodes.length,'FBX 独立网格完整',report.meshes);check(report.cameras>=1,'FBX 相机存在');check(report.actions>0,'FBX 动画存在');check(report.rendered,'FBX 完成实际渲染');}
  }
  check(errors.length===0,'真实游戏与导出全程无 console/page 错误',errors);
  await writeJson(path.join(outDir,'latest.json'),{zip:out.path,projectDir,run,exportStats:out.stats,created:new Date().toISOString()});
}catch(e){check(false,'测试异常：'+e.message);console.error(e);}finally{await context?.close().catch(()=>{});await browser.close().catch(()=>{});await server.close();}
await writeJson(path.join(outDir,'test-result.json'),summary(mode==='ae'?'AE 实际游戏导出':'3D 实际游戏导出'));
