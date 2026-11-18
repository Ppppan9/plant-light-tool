# 植物光路 · 3D 动画导出

浏览器直接生成真实 `scene.glb` 和二进制 `scene.fbx`，两者内嵌 PNG 贴图与 TRS 动画；同时包含 `scene3d.json`、`timeline.json`、独立透明贴图 `assets/`、`blender_import.py`、本说明，以及记录了声音时的 `audio/` 文件。`assets/` 也可用于不自动解包 FBX 内嵌贴图的软件手动重连材质。

本游戏为 2D 植物光路玩法。导出采用可编辑的 **2.5D 多层花园景箱**：每个实际绘制精灵对应带透明贴图的独立网格，背景、棋盘、藤蔓、叶片、花朵、HUD、粒子、手指按类别放在不同景深。它不是植物实体的全视角雕塑模型。动画包括种子运动、藤蔓逐段生长、花朵弹跳和弹窗等对应精灵的位置/缩放/旋转/显隐。

基准画幅 720×1600，1 世界单位=100设计像素。相机为 30° 透视；各平面按景深补偿，原始视角与网页构图对齐，环绕相机可看到各层间距。图层入出点写入父级 `*_vis` 节点的 STEP 缩放动画。材质透明度动画写入 `scene3d.json.opacity`，Blender 脚本负责还原。

先在网页记录 AE 时间轴，再点“导出 3D 动画”。实际使用 `export3dFps`，支持 24/25/30/60fps；`export3dHand=false` 时不生成手指节点，`export3dParticles=false` 时过滤粒子素材。

## Blender

```bash
blender --background --python blender_import.py -- --save
blender --background --python blender_import.py -- --render 0s,1.5s --out renders
blender --background --python blender_import.py -- --save --fbx --verify
```

脚本导入 GLB，配置相机、帧率和分辨率，使用自发光+透明材质还原网页色彩，并通过 Raw 视图与原始贴图数值重现 Canvas 2D 的 sRGB 透明叠加，避免半透明遮罩变亮。脚本还写入透明度/显隐关键帧，按事件时间加载音频。`--fbx` 是可选的 Blender 二次导出；ZIP 中已经包含浏览器生成的真实 FBX。

## UE5 / C4D

导入 `scene.fbx` 并启用动画。贴图应连接自发光，材质使用透明混合；glTF/FBX 不承载本工具的材质透明度曲线，需按 `scene3d.json.opacity` 补充。声音按 `audio[].t` 对齐到时间轴。本次导出并不意味着已逐版本验证所有 UE5/C4D 导入器。

3D 包用于素材制作，体积大于 H5，不用于直接投放。记录后修改画幅或外观时，应重新记录。
