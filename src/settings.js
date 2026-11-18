import { DEFAULT_HAND, isRetiredHand } from './default_hand.js';
import { h5DeviceSelectOptions } from './h5/index.js';
export const APP_ID='plant-light-tool', VERSION=2, LS_KEY='plantLight.settings.v1';
export const ATLAS_THEMES={cyanotype:['#183f47','#205956','#102f38'],dusk:['#393447','#545068','#2c2c42'],mint:['#294e46','#41685a','#223f3d']};
const R=(key,label,value,min,max,step=1)=>({key,label,type:'range',value,min,max,step});
const B=(key,label,value)=>({key,label,type:'bool',value});
const C=(key,label,value)=>({key,label,type:'color',value});
const T=(key,label,value)=>({key,label,type:'text',value});
const F=(key,label,value='')=>({key,label,type:'file',value});
const O=(key,label,value,options)=>({key,label,type:'select',value,options:options.map(x=>Array.isArray(x)?x:[x,String(x)])});
const A=(key,label,text)=>({key,label,type:'button',text});
export const GROUPS=[
  {name:'关卡 / 玩法规则',icon:'🌱',open:true,items:[
    O('level','观测页','2',[...[2,3,4,5,6,7,8,9,10,11,12].map(x=>[String(x),`观测页 ${String(x).padStart(2,'0')}`]),['random','随机样地'],['custom','自编样地']]),
    R('seed','随机种子',20261118,1,99999999),R('cols','随机关卡列数',6,3,9),R('rows','随机关卡行数',7,3,9),R('seedCount','随机关卡种子数',2,1,4),R('flowerCount','随机关卡花朵数',8,3,22),
    A('_editor','可视化编辑与本机关卡库','打开样地编辑器'),A('_shape','用透明 PNG 的轮廓生成样地','导入样地轮廓'),
    B('showTutorial','显示观测提示',true),B('showHud','显示种子 / 花朵统计',true),B('showBoosters','显示底部道具栏',true),B('unlockBoosters','在所有关卡开放道具',false),
    R('undoCount','撤销道具次数',3,0,20),R('hintCount','提示道具次数',1,0,20),R('waterCount','浇水壶道具次数',2,0,20),
  ]},
  {name:'图版 / 配色',icon:'◈',items:[
    O('theme','图版色调','cyanotype',[['cyanotype','蓝晒'],['dusk','暮色'],['mint','苔墨']]),
    C('bgTop','图版上色',ATLAS_THEMES.cyanotype[0]),C('bgMid','图版中色',ATLAS_THEMES.cyanotype[1]),C('bgBottom','图版下色',ATLAS_THEMES.cyanotype[2]),C('tileColor','样方底色','#bbae98'),C('frameColor','装订边色','#364f50'),
    R('flowerScale','花苞与花朵缩放',1,0.65,1.4,0.01),R('vineWidth','藤蔓粗细(px)',14,7,25),R('boardScale','样方整体缩放',1,0.7,1.1,0.01),R('boardY','样方中心 Y',910,760,1030),
    B('bgMotion','图版环境动效',true),B('showParticles','落种 / 生长 / 开花粒子',true),O('particleDensity','粒子强度','normal',[['low','轻'],['normal','标准'],['high','丰富']]),B('showPreview','按住时显示十字预览',true),B('interactionMotion','植物 / 按压 / 落种 / 浇水 / 撤销动效',true),
  ]},
  {name:'节奏 / 演出',icon:'✨',items:[R('growMs','藤蔓生长时长(ms)',500,100,1800,10),R('bloomMs','花苞绽放时长(ms)',350,100,1200,10),R('winDelay','全开后结算延迟(ms)',900,0,3500,50),B('autoNext','自动演示连续点击下一关',true),R('autoLevelCount','自动演示连续关数',11,1,20),R('nextDelay','结算页停留(ms)',1000,100,4000,50),B('autoRecover','自动演示前撤回无解操作',true)]},
  {name:'音效',icon:'🔊',items:[B('sfxMute','静音',false),R('sfxVolume','总音量',0.65,0,1.5,0.01),B('sfxSeed','种下种子',true),B('sfxGrow','藤蔓生长',true),B('sfxBloom','花朵绽放',true),B('sfxWin','通关',true),B('sfxUndo','撤销',true),B('sfxFail','种子耗尽',true),B('sfxHint','提示',true),B('sfxWater','浇水',true),A('_sfx','试听工具音效','▶ 试听')]},
  {name:'演示指针 / 自动通关',icon:'👆',items:[
    R('autoSpeed','整体速度倍率',1,0.25,6,0.05),R('moveMin','移动耗时最小(ms)',380,50,2000,10),R('moveMax','移动耗时最大(ms)',700,50,3000,10),R('delayMin','点击间隔最小(ms)',220,0,2000,10),R('delayMax','点击间隔最大(ms)',520,0,4000,10),R('thinkChance','思考停顿概率',0.12,0,0.6,0.01),R('thinkMax','思考停顿最长(ms)',900,0,4000,50),R('jitter','落点抖动(px)',5,0,35),R('curve','曲线路径弯曲度',0.15,0,0.6,0.01),
    R('handSize','指针大小（画面宽比例）',0.20,0.1,0.9,0.01),R('handAnchorX','笔尖锚点 X',0.0625,0,1,0.005),R('handAnchorY','笔尖锚点 Y',0.0625,0,1,0.005),R('handRotation','指针旋转(度)',0,-60,60),B('handFlip','水平翻转',false),F('handImage','替换演示指针',DEFAULT_HAND),A('_resetHand','恢复图志记录笔及默认锚点','恢复记录笔'),
    R('pressDepth','按压缩小幅度',0.08,0,0.3,0.01),B('pressEnabled','点击按压效果',true),B('manualHand','手动操作时跟随鼠标',true),B('hideCursor','演示指针出现时隐藏系统鼠标',true),B('tapRipple','显示点击波纹',false),
  ]},
  {name:'录制',icon:'⏺',items:[O('recRes','画布 / 录制分辨率','720x1600',[['360x800','360×800'],['540x1200','540×1200'],['720x1600','720×1600（默认）'],['1080x2400','1080×2400']]),O('recFps','录制帧率',30,[24,25,30,60]),O('recFormat','录制格式','auto',[['auto','自动（优先 MP4）'],['mp4','MP4'],['webm','WebM']]),R('recBitrate','码率(Mbps)',8,1,30,0.5),B('autoRec','自动通关时自动开始录制',false),B('autoStop','通关后停止录制并下载',true),R('tailSec','结束后继续录制(秒)',2.5,0,10,0.1)]},
  {name:'导出 AE 工程',icon:'🎞',items:[A('_aeToggle','记录手动操作或自动演示','● 开始记录'),A('_aeExport','重新导出上一次记录','⬇ 导出 ZIP'),B('aeWithRec','录屏时同步记录 AE 时间轴',true),O('aeFps','AE 帧率',30,[24,25,30,60]),O('aeSize','AE 合成尺寸','canvas',[['canvas','同画布'],['720x1600','720×1600'],['1080x2400','1080×2400']]),O('aeSampling','关键帧采样','reduce',[['reduce','精简关键帧'],['bake','逐帧烘焙']]),O('aeNames','图层命名','zh',[['zh','中文'],['en','English']]),O('aeAudio','导出音频','both',[['both','混音 + 逐事件'],['mixed','仅混音'],['events','仅逐事件'],['none','无音频']]),B('aeSaveAep','脚本完成后提示另存 AEP',true)]},
  {name:'导出 3D 动画（UE5 / C4D / Blender）',icon:'🧊',items:[A('_export3d','独立元素 / 动画 / 相机 / 音轨','导出 3D 动画 (glTF/FBX/Blender)'),O('export3dFps','3D 动画帧率',30,[24,25,30,60]),B('export3dHand','包含指针贴图平面',true)]},
  {name:'导出 H5 试玩广告',icon:'📱',items:[A('_exportH5','导出不含控制台的离线试玩','⬇ 导出 H5 试玩 ZIP'),O('h5Format','渠道格式','applovin,facebook,google,mintegral,moloco,tiktok,unity,generic',[['applovin,facebook,google,mintegral,moloco,tiktok,unity,generic','全部 8 个渠道'],...['applovin','facebook','google','mintegral','moloco','tiktok','unity','generic'].map(x=>[x,x])]),O('h5Orientation','试玩方向','1',[['0','双向'],['1','竖屏'],['2','横屏']]),O('h5Device','预览机型','adaptive',h5DeviceSelectOptions()),R('h5DeviceW','自定义机型宽',390,240,1440),R('h5DeviceH','自定义机型高',844,400,2560),T('h5CtaText','CTA 文案','立即游玩'),T('h5StoreUrl','应用商店 / 落地页 URL',''),T('h5GameName','游戏名','花候图志'),F('h5Icon','应用图标'),R('h5MaxMb','体积告警阈值(MB)',5,1,20,0.5),B('h5AutoPlay','打开试玩后自动演示',false)]},
  {name:'结束页(End Card)',icon:'🏵',items:[B('endCard','连续演示结束后显示结束页',true),B('endCardHand','结束页显示演示指针',false),R('endDelay','结束页延迟(ms)',900,0,5000,50),T('endTitle','结束页标题','花候图志'),T('endButton','结束页按钮','开始观测'),F('endIcon','结束页应用图标')]},
];
export const DEFAULTS=Object.fromEntries(GROUPS.flatMap(g=>g.items.filter(x=>!['button','note'].includes(x.type)).map(x=>[x.key,x.value])));
DEFAULTS.settingsVersion=VERSION;DEFAULTS.customData=null;DEFAULTS.shapeMask=null;
export function migrate(input={}) {
  const old=input&&input.settings&&typeof input.settings==='object'?input.settings:input;
  const settings={...DEFAULTS};
  for(const [k,v]of Object.entries(old||{}))if(Object.hasOwn(DEFAULTS,k)&&v!==undefined)settings[k]=v;
  if ((old?.settingsVersion ?? input?.version ?? 0)<2) {
    const oldThemes={reference:['#72b945','#54a437','#216f25'],dusk:['#897cbb','#52669b','#35466c'],mint:['#9ed6a7','#62b99b','#397e68']};
    const previous=old?.theme==='dusk'?'dusk':old?.theme==='mint'?'mint':'reference';
    const next=ATLAS_THEMES[previous==='reference'?'cyanotype':previous];
    if (settings.theme==='reference') settings.theme='cyanotype';
    ['bgTop','bgMid','bgBottom'].forEach((k,i)=>{
      if(old?.[k]===undefined||String(old[k]).toLowerCase()===oldThemes[previous][i]) settings[k]=next[i];
    });
    for (const [k,v] of Object.entries({tileColor:'#d59c69',frameColor:'#f2ce7d'}))
      if(String(old?.[k]).toLowerCase()===v)settings[k]=DEFAULTS[k];
    for (const [k,v] of Object.entries({h5GameName:'Bloom Garden',endTitle:'Let your garden bloom!',endButton:'Play now'}))
      if(old?.[k]===v)settings[k]=DEFAULTS[k];
    if(old?.handImage===undefined||isRetiredHand(old.handImage)){
      settings.handImage=DEFAULT_HAND;
      for (const [k,v] of Object.entries({handSize:.42,handAnchorX:.22039473684210525,handAnchorY:.03667763157894737,handRotation:6}))
        if(old?.[k]===v)settings[k]=DEFAULTS[k];
    }
  }
  settings.settingsVersion=VERSION;
  const spec=GROUPS.flatMap(g=>g.items);
  for(const x of spec){if(x.type==='range')settings[x.key]=Math.max(x.min,Math.min(x.max,Number.isFinite(+settings[x.key])?+settings[x.key]:x.value));if(x.type==='bool')settings[x.key]=!!settings[x.key];}
  if(typeof settings.handImage!=='string'||settings.handImage&&!/^data:image\//.test(settings.handImage))settings.handImage=DEFAULT_HAND;
  return settings;
}
export function loadSettings() {try{return migrate(JSON.parse(localStorage.getItem(LS_KEY)||'{}'));}catch{return {...DEFAULTS};}}
export function saveSettings(S) {try{localStorage.setItem(LS_KEY,JSON.stringify({app:APP_ID,version:VERSION,settings:S}));return true;}catch{return false;}}
export function settingsEnvelope(S) {return {app:APP_ID,version:VERSION,settings:S};}
