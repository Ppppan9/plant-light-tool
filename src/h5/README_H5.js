export default `# 植物光路 · H5 试玩广告包

每个渠道子目录是一份独立的自包含 HTML5 试玩。打开对应的 index.html 即可游玩，底部 CTA 使用导出时填写的应用商店或落地页地址。上传时只使用目标渠道的目录。

## 玩法与输入

- 种子在落点向上、下、左、右长出藤蔓，让每朵花苞绽放。
- 按住花园可以预览十字路径，拖动调整落点，松手种植；移出花园后松手取消。
- 默认由真人操作，不显示模拟手指，也不自动通关。
- 试玩包不包含控制台、关卡编辑器、录屏、AE 或 3D 工程导出代码。

## 设计画幅、采样与设备视口

植物光路的玩法和美术始终使用 720×1600 的逻辑坐标（9:20）。recRes 只决定 Canvas 的像素采样密度，不改变关卡坐标、格子比例或点击位置。面板的机型宽高表示目标设备视口，不重排或拉伸花园。

舞台在视口可用区中采用 contain 等比缩放，剩余区域使用 letterbox 留边。底部 CTA 单独保留空间，不覆盖棋盘。手机、平板、折叠屏和横屏设备仍显示完整的 9:20 玩法。

- 自适应机型：使用当前设备视口进行 contain，推荐用于投放。
- 指定机型或自定义宽高：用于预览和记录目标设备尺寸；设计画幅仍为 720×1600。
- h5Orientation：1 为竖屏投放声明，2 为横屏投放声明，0 为双向；声明不旋转游戏内容。
- 运行时探针：window.__h5FitStage()、window.__h5StageLayout；resize、orientationchange 和 visualViewport 变化时重新计算布局。
- 全屏壳层使用设备宽度、动态视口高度和安全区；CTA 预留底部安全区。

## 渠道目录与当前导出配置

| 目录 | CTA / 运行时 | 单个 HTML 检查阈值 |
|------|-------------|--------------------|
| applovin/ | MRAID 2.0，等待 ready 和 viewable；mraid.open() | 5 MB |
| facebook/ | FbPlayableAd.onCTAClick()，资源内联 | 2 MB |
| google/ | ExitApi.exit()，带 fallback | 5 MB |
| mintegral/ | window.install()，带 fallback | 5 MB |
| moloco/ | FbPlayableAd.onCTAClick()，不加载 MRAID 脚本 | 5 MB |
| tiktok/ | window.openAppStore()，附 config.json | 5 MB |
| unity/ | 使用 WebView 注入的 MRAID，等待 ready 和 viewable | 5 MB |
| generic/ | window.open(商店地址)，附 README.txt | 用户设置的阈值 |

体积告警逐个检查渠道的 index.html，使用用户阈值与该渠道配置阈值中的较小值。多个渠道合在一起的 ZIP 只是交付容器，不参与单渠道体积告警。发布前仍需以投放后台的实际校验为准。

## 本地预览

可直接打开 index.html；涉及渠道 SDK 时建议使用本地静态服务器。用浏览器设备工具切换 iPhone SE、较长手机、iPad、折叠屏和横屏视口，确认花园完整、比例一致、CTA 不遮挡棋盘。MRAID 安装调用应在相应渠道的测试容器中验证。
`;
