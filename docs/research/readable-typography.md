# 字体、字号与配色 · 2026-11-15

本轮把阅读内容放大，同时让目录、来源和导航保持克制。范围覆盖桌面四页、共享 DAG 及 Graph 全屏；既有白色垂直图、选择状态、原地展开和数据契约继续沿用。验收仅使用公开、已标注的合成轨迹。

## 字体与层级

参考 [GitHub Primer](https://primer.style/product/primitives/typography/) 的 16px / 14px 正文角色，以及 [Linear 的界面改版](https://linear.app/now/how-we-redesigned-the-linear-ui) 对齐、字重和阅读层级的处理。本项目仍使用系统无衬线作为界面字体，没有声称采用 Linear 当前应用的具体字号。

代码、命令、日志和路径使用 [JetBrains Mono](https://www.jetbrains.com/lp/mono/)。本地打包未修改的 2.304 Regular WOFF2（92,164 bytes），关闭运算符连字；OFL 许可证保留在字体目录、第三方声明和离线 HTML。构建将字体内联到 CSS，断网不依赖 CDN。中文等未覆盖字形由本机字体回退。

| 角色 | 本轮前 | 本轮后 |
| --- | --- | --- |
| 正文 | 13px | 16px，1.5–1.65 行高 |
| 当前证据标题 | 16px | 18px / 600 |
| Inspector 标题 | 14px | 16px / 600 |
| 工具与证据标签 | 12–13px | 14px |
| 元数据值 | 13px | 15px |
| 目录、文件路径、Source ID、元数据标签 | 11–12px | 13px；低于正文和代码 |
| 顶部导航 | 14px | 保持 14px |
| 代码 / Terminal | 12–13px 系统等宽 | 15px JetBrains Mono，1.65–1.7 行高 |
| DAG 标题 / 元数据 | 13 / 11px | 15 / 12px |
| 合并节点标题 / 摘要 / 计数 | 14 / 12 / 11px | 16 / 13 / 12px |

112px 元数据标签列与 8px 间隔避免英文标签挤压；大整数保留完整原文与复制。SVG 省略计算随字号同步更新，不压缩字形，节点和文件夹尺寸保持不变。小范围导航使用 12–13px，避免展开时工具提示换行挤动画布。Timeline 两行泳道标签使用紧凑行高，六条泳道在 1280×800 中完整可见。长代码继续在证据区内滚动。

## 颜色

正文为深蓝灰 `#273442`，辅助文字为 `#556575`。Graph 和 Timeline 用同组低饱和类别色：终端淡蓝、读取浅青绿、编辑浅沙色、验证浅绿、计划和消息冷灰蓝。白画布、类别轮廓和选择外框分别保留作用；红色错误描边不被选中外框覆盖。Timeline 阶段带同步降低填色强度。

语法用蓝色关键字、绿色字符串、棕色数字和灰蓝注释。Diff 使用浅红 / 浅绿行底与 `− / +`，保留行号和来源。深色主题继续使用原有语义色，Graph 仍保持白色。

[相对亮度复核](readable-typography/contrast.json)：普通节点辅助文字与底色最小 5.35:1，代码及辅助颜色在白底和 Diff 红绿底上的最小值 4.58:1，类别轮廓与填色至少约 3:1。检查针对非禁用的配色；回放中尚未到达步骤的有意淡化单独保留。

## 浏览器截图

同一视口、同一 `node-types-synthetic` 源 #60、Code Diff、暂停、活动收起、文档顶部，前后各为独立完整 PNG。没有拼图、裁切或参考图覆盖。

| 视口 | 本轮前 | 本轮后 | 断网单文件 |
| --- | --- | --- | --- |
| 1586×912 | [before](readable-typography/before-1586.png) | [after](readable-typography/after-1586.png) | [offline](readable-typography/offline-after-1586.png) |
| 1280×800 | [before](readable-typography/before-1280.png) | [after](readable-typography/after-1280.png) | [offline](readable-typography/offline-after-1280.png) |

四页使用同一合成任务 `dashboard-baseline`、源 #60；Compare 对照 `dashboard-variant`。Compare 是完整文档长图，其余为单屏工作台。

| 页面 | 1586×912 | 1280×800 |
| --- | --- | --- |
| Graph | [截图](readable-typography/graph-1586.png) | [截图](readable-typography/graph-1280.png) |
| Timeline | [截图](readable-typography/timeline-1586.png) | [截图](readable-typography/timeline-1280.png) |
| Replay | [截图](readable-typography/replay-1586.png) | [截图](readable-typography/replay-1280.png) |
| Compare | [截图](readable-typography/compare-1586.png) | [截图](readable-typography/compare-1280.png) |

[verification.json](readable-typography/verification.json) 保存真实 computed style、已加载字体、视口、精确来源与网络结果；[before.json](readable-typography/before.json) 是本轮前的测量。[capture-manifest.json](readable-typography/capture-manifest.json) 记录 PNG 来源、尺寸与哈希。

## 复现

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html
# 另开终端：python -m backend.cli serve out
node scripts/verify-readable-typography.mjs
node scripts/verify-graph-fullscreen.mjs
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

预览 <http://127.0.0.1:8765/#view=graph&run=node-types-synthetic> → Fullscreen graph → 搜索 #60 → Code Diff。四页截图脚本同时断网打开根目录交付 HTML，检查字体真正加载、字号层级、页面无横向溢出和零 HTTP 请求。

## 验证与边界

验证结果：**81 项 Python（3.65s）、类型检查、构建（7.72s）、40 个 Chrome 场景全部通过**。字号专项保存 12 张新版全页图与 2 张本轮前图；本地和精确单文件 HTML 中 JetBrains Mono 均实际加载，断网 **0 HTTP / 0 页面错误**。一次 type detector 返回 `[]`。全屏检查同时测量两层标签与工具带、11 个节点的自然文字边界、七节点 Fit、精确大整数、缺失 / 已记录补丁、活动、播放、焦点恢复与 PNG/SVG；完整回归保留 CSV、目录、Compare、播放偏好和 Timeline 检查。

500 / 2,000 源步骤首绘为 **96.7 / 130.2ms**，均初始绘制 3 个 Overview 节点。沿用 app 加载后点击 → SVG → 下一帧口径，排除初始 bundle，不代表全部源节点渲染。另有 909 次 DAG 拓扑排序、1,908 执行范围、3,161 精确路径、5,189 路由、61 原地展开状态及 126 Timeline 布局检查。

结构化记录：[test-summary.json](readable-typography/test-summary.json)、[scenarios.json](readable-typography/scenarios.json)、[fullscreen-verification.json](readable-typography/fullscreen-verification.json)、[first-render.json](readable-typography/first-render.json)。

首次整体放大暴露 Graph 紧凑导航展开定位偏移和 Timeline 末泳道裁切；收紧辅助文字、泳道行高并调整最小高度后，专项已复验。首次完整回归还出现既有 12 秒等待超时，保留原阈值执行最终回归，最终结果以结构化文件为准。

Fit 仍会按整图缩小标签，Locate 用于回到可读尺度；未来回放步骤继续有淡化状态。未记录的时长、补丁、版本、agent、成本等仍显示缺失状态。本轮不新增手机端布局。字体内联增加约 123KB 未压缩 CSS，保留既有大 JS bundle 警告。
