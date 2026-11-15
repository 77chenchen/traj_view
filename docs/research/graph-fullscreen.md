# Graph 全屏工作区 · 2026-11-15

本轮只优化桌面 Graph 全屏及进出路径。沿用垂直源顺序、节点形状、依赖/重试/顺序边、连续区间合并与原地展开、React/Vite 和冻结 v1。Replay 的单屏改版独立记录在 [Replay 报告](replay-layout.md)。本地入口：<http://127.0.0.1:8765/#view=graph&run=dag-baseline>，点击左侧 Fullscreen graph。

后续 [字体改进](graph-typography.md) 已合入本轮最终截图：当前节点名 16px、代码/正文 13px、标签 12px；DAG 标题 13px、元数据 11px，采用自然省略而非压缩字形。字体改前/改后另保留两尺寸的四张完整截图。

## 参考与改前复现

先完整查看用户的 [图二：改前](../design-references/graph-fullscreen-comparison/02-graph-fullscreen.png) 与 [图一：目标](../design-references/graph-fullscreen-comparison/01-graph-fullscreen.png)，检查顶部、画布边缘、工具带、两级标签、右栏元数据/补丁及底部活动。改前以 `c13e74b` 工作树、同一 `dag-baseline`、Final Answer `#9007199254741049`、Code Diff、暂停、Agent activity 打开和文档顶部复现；两尺寸的原始边界保存于 [before.json](graph-fullscreen/before.json)。

复现了首个可见节点裁切、选中层级偏弱、静态顶部引导和播放控件藏在活动披露内。该次复现没有重现原图中的明显横向左偏。历史黑带也未重现：改前/改后 Chrome 的全屏根与顶栏均从 `y=0` 开始，根宽高等于视口。无法据此确认历史黑带来自截图边界还是浏览器；本轮把页面可控制的 backdrop 设置为面板底色，消除可控外边距，并用根/顶栏几何断言防止顶部留带。没有把原图中的黑色像素说成已查明的页面 bug。

## 布局与相机

顶栏固定占 52px，显示 run、当前记录标题及精确 source ID、帮助、唯一 Exit fullscreen。下方为左图右证据：右栏 350px，紧凑桌面 330px，余宽给画布。Graph/Timeline、Layers、Legend、搜索和 PNG/SVG 同行。主视图用实蓝，侧栏工作区与内层证据用浅蓝；类别形状、红色失败边和独立选中轮廓继续保留。

画布白底、有独立细框；导航 gutter 为 48px，常用顺序是放大、缩小、Fit、Locate。底部至少 34px 状态带显示可见节点/边及实际布局名称；没有可操作的布局选择器，所以名称不带下拉箭头。Playback 独立显示，Agent activity 默认只有 36px 披露行；展开区域上限为 `min(24dvh, 220px)`，内部滚动，不挤出检查器。

| 视口 | 实际 SVG 可视区（活动收起） | Inspector | 首尾及七节点 Fit |
| --- | --- | --- | --- |
| 1586×912 | 1162×636.1px | 350px | 全部完整，四周留安全区 |
| 1280×800 | 876×524.1px | 330px | 全部完整，四周留安全区 |

ResizeObserver 直接测量 SVG，避免把含工具 gutter 的 frame 尺寸用于 viewBox。Fit 由绘图 bounds 和 SVG 宽高计算，并留 32px 余量。全屏进入时只对不超过 12 个源步骤的小图自动 Fit；按完整源规模判断，避免把长轨迹的几个合并节点当成小图。长轨迹保持可读缩放，源定位在必要时恢复至少 0.9 倍；显式 Fit 仍可查看全部。

选择、搜索、Inspector 前后、上下文、活动和显式 Locate 均沿用 run ID + 原始 `idx`；完整节点矩形而非中心点参与可见性检查。活动开关/视口变化只在需要时调整选择，用户拖动或滚轮后不会被自动吸回。Fit 状态随 resize 重新适应；原地展开仍优先保持锚点和缩放。退出后焦点回到所选 SVG 节点；Graph 内 Timeline 模式回到选中事件，无选中则回全屏入口。

## 逐区功能对照与验收

以下通过项由 `graph-fullscreen.mjs`、现有 `node-appearance.mjs`、`neutral-vertical.mjs`、`timeline-workspace.mjs` 以及完整 smoke 联合覆盖。截图来自实际 React 渲染，设计图没有作为 UI 背景或覆盖层。

| 图一/问题区域 | 新版位置与默认态 | 操作、来源与验证结果 |
| --- | --- | --- |
| 顶部 run 与引导 | 52px 顶栏 | 未选提示；选中后标题/精确 idx 更新；Final Answer 不再沿用未选提示。通过 |
| 顶部黑带 | 根/顶栏 y=0、浅色 backdrop | 两尺寸断言根与顶栏边界。历史黑带未复现，来源未确认 |
| 帮助与退出 | 顶栏右端 | 帮助在全屏树内；键盘触发唯一退出，焦点恢复。通过 |
| Graph / Timeline | 左列首行，Graph 实蓝选中 | 切换与时间线事件点选保留 source；Timeline 模式退出也恢复当前事件焦点。通过 |
| Layers | 工具带披露，默认关闭 | 类别、模式、边类型与依赖开关仍可用；弹层不越出全屏视口。通过 |
| Legend | 工具带按钮，默认关闭 | 节点形状/类别、失败、重试、汇合、完成含义；浮层位于全屏树内。通过 |
| 节点搜索 | 同一工具带 | 精确大索引、结果定位、重复搜索；长轨迹 Fit 后搜索恢复可读尺寸。通过 |
| PNG / SVG | 搜索右侧 | 两种下载实际产生文件；SVG 包含当前节点和选择，PNG 头有效。通过 |
| 左侧工具 | 画布内 48px gutter | 每个按钮有名称、title 和焦点；+ / − / Fit / Locate，无重复退出。通过 |
| 七节点与居中 | 独立白画布 | `dag-baseline` 七个完整矩形均在 SVG 安全区；节点簇中心距实际 SVG 中线小于 10% 宽。通过 |
| Final Answer 定位 | 画布 + 顶栏 + Inspector | `#9007199254741049` 完整可见、原值不转不安全 Number，URL 一致。通过 |
| 长轨迹取景 | 保留 Overview/原地展开 | 96 源步骤、搜索 `#10000000000000053`；两尺寸与活动展开后完整可见、节点高度≥42px。通过 |
| 普通滚轮/修饰键 | SVG 内 | 普通滚轮垂直平移，Ctrl/⌘ 滚轮缩放；Locate 恢复当前源。通过 |
| 键盘/原地分组 | 现有画布与源导航 | Arrow 平移、Tab 节点、Alt+↑/Collapse last、锚点和源映射回归。通过 |
| 节点/边/布局 | 同一底部状态带 | 实际可见计数；ELK / Execution / 回退名称为纯文本，非假下拉。通过 |
| 侧栏一级标签 | Details / Files & activity / Signatures | 浅蓝选中；切工作区后选择保留；文件与签名定位沿用数据层。通过 |
| 无选择 Inspector | 标题下简短提示 | 清除选中后不伪造节点；未选退出焦点回入口。通过 |
| 节点摘要/状态 | 右栏摘要与 metadata | 名称、来源、类型、时间、状态、次数；红色失败仍独立可辨。通过 |
| 前后/清除 | Inspector 标题右端 | 精确源选择与画布同步；清除入口保留。通过 |
| 完整 Source ID / 复制 | Node / Source 行 | 可换行长 ID；真实 Copy 操作反馈；切源不沿用上一个 Copied 反馈。通过 |
| Recording details | metadata 下披露 | 记录 phase/tokens 与缺失时长；零值与未记录保持区别。入口保留 |
| 二级证据标签 | 摘要下有分隔的 sticky 工具带 | Details / Code Diff / Error Output / Context；不因换源重置当前标签。通过 |
| 字体与证据阅读 | 16 / 14 / 13 / 12px 分层 | 两尺寸标题、代码、标签与完整 Source ID；SVG 自然字形不越轮廓，PNG/SVG 同源。通过 |
| 无补丁 | 可用 Code Diff 标签内 | 一条 No patch recorded；View Full Diff 禁用且有原因，不补造 patch。通过 |
| 真实已记录补丁 | Code Diff | 文件头、上下文、行号、红删绿增、复制、View Full Diff；嵌套全屏回归。通过 |
| 错误及此前证据 | Error Output | 当前 observation、同签名先前失败、其他先前失败分别注明来源。通过 |
| 上下文/相关步骤 | Context | 文件、上下游、消息和相关步骤按已有图关系；Show 跳转保持精确 idx。通过 |
| Raw reference | Inspector 正文尾部 | 原始文件/行与 tags；长路径换行，正文独立滚动。入口保留 |
| Playback | 左列图下，始终可见 | 前/播放/暂停/后、滑块、位置和 Inspect current step；seek 与源/顶部/检查器一致。通过 |
| Agent activity | Playback 下，默认收起 | By Agent/Category、共用标尺、源点、失败、选中与定位；上限内局部滚动。通过 |
| 全屏弹层与出口 | 当前全屏容器内 | Layers、Legend、帮助、搜索、相关源和导出均可达。通过 |
| 普通 Graph 与其他页 | 保留既有界面 | 普通 Graph、Timeline、Compare、Replay、目录/CSV/Sankey 与固定证据标签回归。结果见最终 scenario 文件 |
| 保留的深色主题 | 白画布 + 原有深色面板 | 浅蓝摘要固定使用深色正文，避免继承浅色字；本地/离线断言摘要颜色及白画布。通过 |
| 单文件离线 | 交付的根 HTML | HTTP 全部阻断后重走 Fit、选中、检查器、活动、搜索与退出；0 HTTP / 0 page errors。通过 |

## 独立截图

全部使用公开、明确标注的合成数据；文档滚动位置为 0、暂停、真实浏览器 full-page PNG，无拼图/裁切。设计引用的 1924×1242 / 2047×1331 与验收的 CSS 视口不同，因此按区块层级和实际边界核对，不声称像素级重合。

| 状态 / 操作 | 1586×912 | 1280×800 |
| --- | --- | --- |
| 改前：Final Answer、Code Diff、活动打开 | [before](graph-fullscreen/before-1586.png) | [before](graph-fullscreen/before-1280.png) |
| 新版：无选中，Fit | [unselected](graph-fullscreen/fullscreen-unselected-1586.png) | [unselected](graph-fullscreen/fullscreen-unselected-1280.png) |
| 新版：点 Final Answer → Code Diff | [no patch](graph-fullscreen/fullscreen-final-no-patch-1586.png) | [no patch](graph-fullscreen/fullscreen-final-no-patch-1280.png) |
| 新版：`node-types-synthetic` 搜索 #60 → Code Diff | [recorded patch](graph-fullscreen/fullscreen-patch-1586.png) | [recorded patch](graph-fullscreen/fullscreen-patch-1280.png) |
| 新版：Final Answer → 展开 Agent activity | [activity](graph-fullscreen/fullscreen-activity-1586.png) | [activity](graph-fullscreen/fullscreen-activity-1280.png) |
| 长轨迹：搜索 #10000000000000053 → Code Diff | [located](graph-fullscreen/fullscreen-long-located.png) | [resize + activity](graph-fullscreen/fullscreen-long-located-1280.png) |

断网根 HTML 另有 [Final Answer](graph-fullscreen/offline-fullscreen-final-no-patch-1586.png) 和 [长源定位](graph-fullscreen/offline-fullscreen-long-located.png)。共 14 张公开 PNG 的尺寸、来源、fixture、URL 和 SHA-256 在 [capture-manifest.json](graph-fullscreen/capture-manifest.json)。逐张检查选中、边界、栏宽、层级与证据可读性。

`dag-baseline` 共七步，无时间戳，其 edit `#9007199254740993` 保存的是 content，不能当成 patch。补丁截图使用单独的 `node-types-synthetic` #60（return 1 → return 2）。96 步的 `execution-long-synthetic` 同时覆盖错误 #10000000000000040、补丁 #10000000000000053、非连续超大索引、依赖和重试；没有使用真实私有轨迹来替代公开验收。

## 复现与结果

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
# 单独终端：python -m backend.cli serve out
node scripts/verify-graph-fullscreen.mjs
node scripts/verify-node-appearance.mjs
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

Chrome 默认 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，可设 `CHROME_PATH`；专项服务默认 `http://127.0.0.1:8765/`，可设 `TRAJVIZ_URL`。专项输出在 `test-results/graph-fullscreen/`；公开副本为 [verification.json](graph-fullscreen/verification.json)。完整测试、首绘和最终构建结果随 [scenarios.json](graph-fullscreen/scenarios.json)、[first-render.json](graph-fullscreen/first-render.json) 保存。

- 最终 **81 Python tests 通过（3.89s）**；TypeScript 通过；Vite 构建通过（7.35s），保留既有大 bundle 警告（JS 2,443.09kB / gzip 757.71kB）。
- Chrome **157.0.8103.52，40/40 场景通过**。本地专项、断网精确根 HTML 和普通 Graph / Timeline / Compare / Replay 回归均通过；离线 **0 HTTP / 0 page errors**。完整命令与摘要保存在 [test-summary.json](graph-fullscreen/test-summary.json)。
- 909 次 DAG 拓扑排序、1,908 scopes / 3,161 精确 paths / 5,189 routes、61 inline states / 1,735 routes、126 Timeline 布局通过。
- 500 / 2,000 源步骤 Overview 首绘 **95.2 / 129.9ms**，各显示三个合并节点；口径仍是 app load 后 click → 可见 SVG → 下一帧，排除初始 bundle 加载，不等于全部源节点的绘制时间。2,000 步缩放、筛选恢复和最终源详情亦通过。

中间完整回归曾出现正则超时提示等待、PNG 捕获、全屏节点点击稳定性等待的 12s 超时；单独专项及最终完整复跑通过。保留原超时和断言，没有屏蔽失败场景。这些等待失败没有被表述为已确定根因的应用修复。

## 改动路径与限制

- `GraphView.tsx`：SVG 测量、Fit/完整边界、源定位、用户相机与退出焦点、工具/状态带。
- `RunGraph.tsx`：当前源顶栏、帮助、独立 Playback、选中活动点、Graph 专用 Inspector。
- `Inspector.tsx` / `ui.tsx`：完整 source 复制、可访问按钮、Graph 缺补丁短态，保留标签选择。
- `Timeline.tsx`：已全屏挂载时初始化状态、Graph Timeline 退出焦点、活动点选中。
- `graphFullscreen.css` / `main.tsx`：最后加载的全屏范围布局、两级蓝色、固定 Inspector 内滚动及普通 Graph 活动兼容。
- 浏览器专项、smoke 与既有 exit 定位随唯一全屏退出入口更新；无 schema、CLI 或适配器改动。

仍不记录逐步调用时长、独立推理角色、逐步 agent/调用父级、尝试次数、完整文件版本、费用或测试通过率。活动条按源步序/时间点表达事件，不能冒充工作时长或并行；依赖继续使用已有文件/观察启发式，结构边表示包含。缺失补丁不能恢复，节点标题仍可截断，完整值可在 Inspector、tooltip 与复制入口读取。小图 Fit 会缩小节点以呈现全体；长轨迹默认可读并依赖本地平移/定位，显式 Fit 可自行缩小。既有生产 bundle 超过 500kB 的构建警告保留。

本轮单次 scoped layout detector 返回 `[]`，没有反复扫描；视觉复查与浏览器功能结果独立于该扫描。历史 Taste 营销页面 gate 仍为 OPEN，不构成本次调试工作台的通过结论；本轮没有新增产品图像资产。
