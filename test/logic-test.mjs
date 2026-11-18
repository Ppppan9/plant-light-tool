import fs from 'node:fs/promises';
import path from 'node:path';
import * as C from '../src/core.js';
import {DEFAULTS,APP_ID,VERSION,migrate,settingsEnvelope} from '../src/settings.js';
import {check,eq,summary,stage,ensureArt,writeJson} from './helpers.mjs';

const out=await ensureArt('logic'),reference=[];
function run(L,solution){const s=C.createState();for(const p of solution||[]){if(s.status==='won')break;const r=C.plant(L,s,p.c,p.r,0);if(!r.ok)return {s,failed:r};}return {s};}
function level(flowers,seeds=2,mask=null){return {id:'test',title:'Test',cols:5,rows:5,seeds,mask,flowers:flowers.map(([c,r,color='pink'],i)=>({c,r,color,id:'f'+i}))};}

stage('视频第 2–12 关：原始路线和求解器均按真实规则执行');
eq(C.REFERENCE_LEVELS.length,11,'包含 11 个视频参考关卡');
for(const L of C.REFERENCE_LEVELS){
  check(C.validateLevel(L).ok,`第 ${L.id} 关结构有效`);
  const provided=run(L,L.solution),solution=C.solve(L),solved=run(L,solution);
  eq(provided.s.status,'won',`第 ${L.id} 关视频标注路线可通关`);
  check(Array.isArray(solution)&&solution.length>0&&solution.length<=L.seeds,`第 ${L.id} 关求解步数在种子预算内`);
  eq(solved.s.status,'won',`第 ${L.id} 关求解路线真实执行获胜`);
  eq(solved.s.bloomed.length,L.flowers.length,`第 ${L.id} 关没有遗漏花朵`);
  reference.push({id:L.id,seeds:L.seeds,flowers:L.flowers.length,solution,status:solved.s.status});
}

stage('射线方向、阻挡、输入约束与撤销');
const L=level([[2,1],[4,1],[3,0]],2),s=C.createState(),before=JSON.stringify(s);
check(!C.plant(L,s,2,1).ok,'花苞位置不能种下种子');
check(!C.plant(L,s,-1,0).ok,'边界外不能种下种子');
check(!C.plant(L,s,1.5,1).ok,'小数坐标不能种下种子');
eq(JSON.stringify(s),before,'无效操作不改变状态或历史');
check(C.plant(L,s,1,1,2,{growMs:600}).ok,'第一颗种子合法种下');
check(s.bloomed.includes('f0')&&s.bloomed.includes('f1'),'穿过近花苞继续直行，远花苞也绽放');
check(!s.bloomed.includes('f2'),'不产生斜向或反射射线');
check(!C.plant(L,s,1,4).ok,'已有藤蔓格不能再次种植');
const preview=C.preview(L,s,3,3);
check(preview.ok,'第二个空格可以预览');
check(preview.cells.some(p=>p.c===3&&p.r===2),'射线到达阻挡前一格');
check(!preview.cells.some(p=>p.c===3&&p.r<=1),'已有藤蔓阻挡后续射线，阻挡格和后方均不穿透');
check(C.plant(L,s,3,3).ok,'第二颗种子按预览合法执行');
eq(s.status,'lost','种子耗尽且仍有花苞时标记失败');
check(s.moves.length===2&&s.vines.length>0,'失败仍保留棋盘和已种种子');
check(!C.plant(L,s,4,4).ok,'失败后不能再加种子');
check(C.undo(s),'失败局可以撤销');
check(s.status==='playing'&&s.used===1&&s.moves.length===1,'撤销恢复剩余种子和游玩状态');
check(s.bloomed.length===2&&s.history.length===1,'撤销保持之前的开花和历史');
check(C.undo(s),'第一颗种子也能撤销');
eq(JSON.stringify(s),JSON.stringify(C.createState()),'全部撤销完整恢复初始状态');
check(!C.undo(s),'空历史撤销安全返回 false');
const copied=C.copyState(s);copied.moves.push({c:0,r:0});eq(s.moves.length,0,'复制状态不共享可变数组');
const early=level([[4,0]],4),earlyState=run(early,[{c:0,r:0}]).s;
check(earlyState.status==='won'&&earlyState.used===1,'种子是预算，覆盖全部花朵可提前获胜');

stage('花园缺口与关卡格式');
const mask=Array(25).fill(true);mask[2*5+2]=false;
const ML=level([[4,2]],2,mask),ms=C.createState();
check(!C.inBounds(ML,2,2)&&!C.plant(ML,ms,2,2).ok,'缺口不能种植');
const mp=C.preview(ML,ms,0,2);
check(mp.cells.some(p=>p.c===1&&p.r===2)&&!mp.cells.some(p=>p.c>1&&p.r===2),'射线遇缺口停止');
check(!C.validateLevel({...ML,flowers:[{id:'bad',c:2,r:2}]}).ok,'花苞不能位于缺口');
check(!C.validateLevel(level([[0,0],[0,0]])).ok,'拒绝重叠花苞');
check(!C.validateLevel({...L,cols:2}).ok,'拒绝无效尺寸');
check(!C.validateLevel({...L,seeds:0}).ok,'拒绝零种子');
check(!C.validateLevel({...L,mask:[true]}).ok,'拒绝长度错误的形状数据');
check(!C.validateLevel(null).ok,'空关卡输入安全拒绝');
const normalized=C.normalizeLevel({...L,title:'Custom',flowers:[{c:0,r:0,color:'unknown'}]});
check(normalized.flowers[0].id==='flower_0'&&C.COLORS.includes(normalized.flowers[0].color),'标准化补花朵 ID 和有效颜色');

stage('随机关卡、异形花园与确定性');
const generated=[];
for(const cols of [3,5,7,9])for(const rows of [3,6,9])for(const seeds of [1,2,3])for(let seed=1;seed<=5;seed++){
  // 3×3 没有足够空间容纳 3 条相互阻挡的十字，本测试只验证有空间的组合。
  if(cols===3&&rows===3&&seeds===3)continue;
  const L=C.generateLevel({cols,rows,seedCount:seeds,flowerCount:Math.min(12,cols*rows-3)},seed),r=run(L,L.solution);
  check(C.validateLevel(L).ok&&r.s.status==='won',`${cols}×${rows}/${seeds} 种子/${seed} 生成路线可真实获胜`);
  generated.push({cols,rows,seeds,seed,steps:L.solution.length,flowers:L.flowers.length});
}
const sameA=C.generateLevel({cols:6,rows:7,seedCount:2,flowerCount:8},2026),sameB=C.generateLevel({cols:6,rows:7,seedCount:2,flowerCount:8},2026);
eq(JSON.stringify(sameA),JSON.stringify(sameB),'同一随机种子产生完全相同的关卡');
const cross=Array.from({length:49},(_,i)=>i%7===3||Math.floor(i/7)===3),crossLevel=C.generateLevel({cols:7,rows:7,seedCount:1,flowerCount:8},72,cross);
check(run(crossLevel,crossLevel.solution).s.status==='won','透明十字轮廓生成可解关卡');
check(crossLevel.flowers.every(f=>cross[f.r*7+f.c]),'异形关卡所有花苞均位于可用格');
let rejected=false;try{C.generateLevel({cols:3,rows:3,seedCount:2},1,Array(9).fill(false));}catch{rejected=true;}check(rejected,'无可用格的形状明确报错');

stage('设置信封与迁移');
eq(DEFAULTS.autoRec,false,'默认自动演示不自动录制');
eq(DEFAULTS.h5AutoPlay,false,'默认 H5 由用户操作');
check(typeof DEFAULTS.handImage==='string'&&DEFAULTS.handImage.startsWith('data:image/'),'内置统一手指图无需网络');
check(decodeURIComponent(DEFAULTS.handImage).includes('<path'),'内置记录笔由本地矢量笔画构成');
const stock=migrate({version:1,settings:{theme:'reference',bgTop:'#72B945',bgMid:'#123456',frameColor:'#f2ce7d',endTitle:'Let your garden bloom!',endButton:'自订按钮',level:'saved:0'}});
check(stock.theme==='cyanotype'&&stock.bgTop===DEFAULTS.bgTop&&stock.bgMid==='#123456'&&stock.frameColor===DEFAULTS.frameColor,'升级逐个替换旧默认色并保留自选颜色');
check(stock.endTitle==='花候图志'&&stock.endButton==='自订按钮'&&stock.level==='saved:0','升级保留自订文案和选中的本机关卡');
const upload='data:'+ 'image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><circle r="3"/></svg>');
eq(migrate({handImage:'',handRotation:6}).handImage,'','清空过的指针保持为空');
check(migrate({handImage:upload,handRotation:6}).handImage===upload&&migrate({handImage:upload,handRotation:6}).handRotation===6,'自定义指针不被替换或旋转');
eq(migrate({settingsVersion:2,bgTop:'#72b945'}).bgTop,'#72b945','新版主动选用的旧色再次读取时保持');
const custom={sfxVolume:1.17,growMs:770,handSize:.53,theme:'mint',autoRec:true,seed:456789};
const migrated=migrate({app:APP_ID,version:0,settings:custom});
check(Object.entries(custom).every(([k,v])=>Object.is(migrated[k],v)),'迁移保留用户已经修改的设置');
eq(migrated.settingsVersion,VERSION,'迁移升级设置版本');
eq(migrated.recFps,DEFAULTS.recFps,'迁移只补缺失的默认值');
check(!Object.hasOwn(migrate({unknownFlag:1}),'unknownFlag'),'忽略未知设置键');
const clamp=migrate({growMs:-3,handSize:99,sfxVolume:'bad'});
check(clamp.growMs===100&&clamp.handSize===.9&&clamp.sfxVolume===DEFAULTS.sfxVolume,'导入数值按范围和有效性约束');
const env=settingsEnvelope(migrated);
check(env.app===APP_ID&&env.version===VERSION&&env.settings===migrated,'设置统一导出 {app,version,settings}');
check(C.getLevel('3').id===3&&C.getLevel('not-real').id===2,'参考关读取与无效选择回退正常');
await writeJson(path.join(out,'reference-solutions.json'),reference);
await writeJson(path.join(out,'generated-cases.json'),generated);
await writeJson(path.join(out,'test-result.json'),summary('玩法 / 生成器 / 求解器 / 设置迁移'));
