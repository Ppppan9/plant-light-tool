# v1.2 植物细节与交互演出

日期：2026-11-18。范围为花苞、花头、嫩叶、根部叶簇、种子与藤蔓表现；游戏规则和工具面板沿用现有实现。

## 实际改动

- v1.2 在重制模型上加入花瓣浅中沟、轻叠层与五瓣自然差异、花苞弧形包裹缝和尖萼片、渐细叶脉；14 件素材仍保留原尺寸、锚点及主色。运行 WebP 总计 147,158 字节，较 v1.1 增加 4,316 字节。
- 藤蔓增加稀疏细侧枝与微型粉花簇，避开主花和种子；叶片沿前沿到达后轻回弹。交互包含土格/按钮按压、落种弹性与泥土颗粒、少量花粉、浇水壶/水滴/水圈和撤销回收。
- 按住预览使用规则层返回的真实可达格；花朵统计按视觉到达时序增加并轻弹。非必要动效可通过参数关闭，并响应系统减少动态效果偏好。
- 使用本地 Blender 实体网格、材质与柔光新制 14 件透明植物素材：五色花苞、五色五瓣花、两种嫩叶、根部叶簇与金色种子。运行时不再使用旧植物的逐帧抠图。
- 花瓣轮廓饱满、花心收小、暗部保留柔和体积，白花使用奶油色阴影；橙色单独提高饱和度。叶片具有轻微厚度与叶脉。
- 茎使用轻微 S 弯的连续路径和统一高光，先生成完整茎画面再切出生长片段，避免各段端帽造成竹节暗缝。叶片左右交错并独立等比舒展，不再拉伸带叶纹理。
- 按透明内容范围校正显示尺寸和根部锚点，加入柔和地面接触阴影，花头绽放与轻摆独立记录。
- 每片叶、茎段、花头、根部叶簇与阴影仍为独立显示元素。AE 对应图层具有可读名称，叶片与植物阴影按植物素材归类。

## 可重现源文件

- `scripts/render_botanicals.py`：程序化网格、灯光、材质及透明渲染。
- `scripts/finalize_botanicals.py`：预乘 alpha 降采样、色彩修整、PNG/WebP、清单和预览图。
- `src/art-assets/polished/`：PNG 源与内嵌运行使用的 WebP；`manifest.json` 记录锚点、有效像素范围和字节数。
- `src/botanical.js`：连续藤蔓着色、稳定分段、独立叶片与卷须。
- `src/interaction-fx.js`：原生精灵动效与道具演出；`src/feedback.js`：工具与 H5 共用的有界瞬态反馈。
- `scripts/capture_art_polish.mjs`：实际浏览器中采集第 2、3、10、12 关与生长过程；若存在上一版备份，则同时采集对照。

WebP 质量为 95，透明通道与 PNG 完全一致；14 件素材四边 alpha 均为零，无切边。检查见 `ref/analysis/polished/asset-qa.json`。这套新建植物遵循参考的软质休闲游戏美术方向，不作为与原片逐像素一致的证明。

## 视觉证据

- `screenshots/detail-pass-comparison.jpg` 为 v1.2 的植物细节对照图。
- `screenshots/detail-preview.png`、`detail-bloom.png`、`detail-water.png` 分别展示按压瞄准、开花与浇水。`screenshots/tool-polished.png` 展示工作台布局。
- `test/artifacts/art-polish/level-{2,3,10,12}-native.png`：稀疏与密集关卡。
- `test/artifacts/art-polish/growth-{early,middle,complete}.png`：生长过程。
- `test/artifacts/art-polish/scene-report.json`：真实通关、素材引用及叶片等比记录。
- `test/artifacts/motion/`：工具与实际导出 H5 的按压、浇水、撤销、完整开花、减少动态效果及真实演示证据。

`test/artifacts/` 为本地测试输出，`ref/analysis/` 为本地制作记录。仓库内保留可运行的代码、素材与精选截图。

导出与交互回归的最终结果见 `PROGRESS.md`。3D 动画包仍采用同源 2.5D 图层结构；新建植物模型的程序化源另行提供。
