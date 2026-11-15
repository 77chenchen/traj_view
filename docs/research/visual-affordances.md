# 六页颜色与操作辨识 · 2026-11-15

本轮回应“颜色单一、文字占比太大、操作不直观”。沿用现有白色工作台，给动作类别稳定的颜色和图标，缩短重复文字，并将解释放到命名清楚的披露区。代码、输出和原始证据仍使用现有大字号；没有新增 schema 字段。

桌面验收视口为 **1586×912 / 1280×800**。Graph、Timeline、Replay 保持一屏和局部滚动；Compare、Analytics、Datasets 自然纵向滚动。顶部仍只有网站图标和六个功能标签，DAG 保持白底、垂直源顺序和当前画布内展开。

## 颜色、图标与层级

| 语义 | 浅色底 / 文字 | 使用位置 |
| --- | --- | --- |
| 当前选择和主操作 | `#eaf3fc` / `#235f9a` | 导航、节点选框、证据标签、播放 |
| 终端 | `#eaf2fc` / `#2d5885` | 命令类别、节点、步骤图标 |
| 读取 | `#e6f4f2` / `#276b62` | 文件读取、Timeline、Compare |
| 修改 | `#fff2da` / `#825c1b` | 编辑、补丁、Edit 跳转 |
| 验证 | `#eaf5e9` / `#366a34` | 验证、Validation 跳转 |
| 记录文本 | `#f1f3f6` / `#516071` | 文本步骤、完成消息 |
| 失败 | `#fbecef` / `#ac3c4c` | 失败输出、警告、Failure 跳转 |

颜色总是配合名称、图标、状态或 Diff 符号。节点保留原有不同轮廓。选中失败节点时同时保留蓝色选择与红色错误边界。Final Answer 本身不推断成功。深色外壳使用单独的类别文字/底色，DAG 仍为白色。

正文 16px、代码/日志 15px 本地 JetBrains Mono、控件 14px、目录/来源约 13px。源码索引保持精确字符串；显示步序与源 `idx` 不混用。

## 六页功能与前后截图

以下截图均在相同数据、视口、文档顶部拍摄；before 来自 `2d4ab83`。所有示例为明确标注的公开合成记录。

| 页面 | 本轮变化 | 改前 1586 | 改后 1586 | 改后 1280 |
| --- | --- | --- | --- | --- |
| Replay | Failure / Edit / Validation 图标跳转；类别色步骤；证据标签图标；Auto 跟随状态独立显示 | [before](visual-affordances/replay-before.png) | [after](visual-affordances/replay-1586.png) | [compact](visual-affordances/replay-1280.png) |
| Timeline | 同色事件与阶段；Recorded text 类别；长说明移入 Reading guide | [before](visual-affordances/timeline-before.png) | [after](visual-affordances/timeline-1586.png) | [compact](visual-affordances/timeline-1280.png) |
| Graph | 类别色更明确；Fit/Locate 图标加文字；工具槽留 54px；后续步骤文字保持清晰 | [before](visual-affordances/graph-before.png) | [after](visual-affordances/graph-1586.png) | [compact](visual-affordances/graph-1280.png) |
| Compare | 工具名只呈现一份，命令/路径独立；类别与结果分开；分歧可直接定位；四个详情标签完整可见 | [before](visual-affordances/compare-before.png) | [after](visual-affordances/compare-1586.png) | [compact](visual-affordances/compare-1280.png) |
| Analytics | 指标图标；中位步数共享尺度条；错误/缺验证图标；可操作的 run records 入口 | [before](visual-affordances/analytics-before.png) | [after](visual-affordances/analytics-1586.png) | [compact](visual-affordances/analytics-1280.png) |
| Datasets | Run 链接图标/箭头；精确错误率条；重复动作图标 | [before](visual-affordances/datasets-before.png) | [after](visual-affordances/datasets-1586.png) | [compact](visual-affordances/datasets-1280.png) |

## 按需状态与操作链

| 功能/入口 | 验证方式及证据 |
| --- | --- |
| Replay 失败 → 修改 → 验证 | 键盘激活 Failure 定位源 `#50`，查看失败输出；Edit 定位 `#60` 及保存的补丁；Validation 定位 `#70`，再到 `#100` 查看通过输出。[失败](visual-affordances/replay-failure-1280.png)、[补丁与详情](visual-affordances/replay-edit-details-1280.png) |
| 手选 Diff 持续 | 选 Diff 后跳到验证步骤，标签不重置；该步骤没有补丁时显示自己的缺失态。既有播放/拖动/多补丁回归继续覆盖。 |
| Graph 全屏证据 | Code Diff 与当前源同步；Inspector 前后步保持标签；无补丁仍可访问空态；Attempts 保留在 Recording details。[全屏补丁](visual-affordances/graph-fullscreen-1280.png) |
| 记录文本活动 | Agent activity → By Category 显示 Recorded text；点击 `#40` 同步 Inspector。[活动](visual-affordances/graph-activity-recorded-text-1280.png) |
| Timeline 说明 | 键盘打开 Reading guide，解释事件点、阶段、分组和不推断并行。[说明打开](visual-affordances/timeline-reading-guide-1280.png) |
| Compare 首分歧 | 点击首次分歧打开 Step comparison，精确源 `#30` 与 A/B 对齐相符，四个证据标签均在面板边界内。[分歧详情](visual-affordances/compare-divergence-1280.png) |
| Analytics 尺度 | 相同中位步数使用相同宽度；所有组使用当前 scope 的共同最大值。0 与未记录分别处理。 |
| 深色偏好 | 保留代码、选择和状态可读性；DAG 仍为白色。[Replay](visual-affordances/replay-dark-1280.png)、[Graph](visual-affordances/graph-dark-1280.png) |
| 离线 HTML | 精确根报告断网执行相同六页和交互。`offline-` 前缀的独立 PNG、0 HTTP/页面异常结果见 manifest 与 verification。 |

Copy 与证据标题共行，避免另占一行。重复的字段解释进入 Recording note；未记录 Attempts 等进入 Recording details，入口仍可发现。图层、图例、全部折叠、搜索、文件活动、源引用、补丁/文件上下文、指标、CSV/PNG/SVG 和既有离线入口保留。

## 实现路径

- [affordances.css](../../frontend/src/affordances.css) 是最后导入的共享色彩/操作层；原有布局和字体表继续负责尺寸。
- [ui.tsx](../../frontend/src/ui.tsx)、[Evidence.tsx](../../frontend/src/Evidence.tsx) 提供统一图标、类别与阶段编码。
- Replay、Timeline、Inspector、RunGraph/GraphView、Compare、Sankey、RunList 复用既有选择与数据层。
- [nodeAppearance.ts](../../frontend/src/nodeAppearance.ts) 更新填充/描边；[graphDrawing.tsx](../../frontend/src/graphDrawing.tsx) 让尚未播放节点只淡化填充与非错误边界，保留可读文字。SVG/PNG 共享此渲染器。
- [浏览器场景](../../tests/e2e/visual-affordances.mjs) 同时接入完整 smoke 的在线和离线场景；节点外观测试核对画布与导出的实际选框颜色。

## 复现

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
python -m backend.cli serve out --port 8765
```

另一个终端执行：

```sh
node scripts/verify-visual-affordances.mjs
PYTHON="$PWD/.venv/bin/python" node scripts/smoke-e2e.mjs
```

打开 [本地 Replay](http://127.0.0.1:8765/#view=replay&run=dashboard-baseline&step=60)。`TRAJVIZ_URL`、`CHROME_PATH`、`PYTHON` 可按项目约定设置。专项脚本检查已启动的公开数据服务和精确根 `trajviz-report.html`；完整 smoke 自建临时合成数据与服务。

## 测试与复核记录

最终结果：**81 Python tests（4.62s）**、TypeScript 检查、生产构建（**7.66s**）及 **46 / 46 Chrome 场景通过**。500 / 2,000 源步骤首绘分别为 **96.9 / 131.1ms**，均在应用加载后绘制 3 个 Overview 节点，采用 run click → 首个可见 SVG → 下一帧口径。

结构化结果、首绘口径、完整场景以及修正记录由 [test-summary.json](visual-affordances/test-summary.json)、[scenarios.json](visual-affordances/scenarios.json)、[first-render.json](visual-affordances/first-render.json) 和 [专项断言](visual-affordances/verification.json) 保存。

专项覆盖六路由、两种桌面尺寸、键盘跳转、同一步骤证据、手选 Diff、全屏、缺失字段披露、Recorded text 活动、四标签边界和共同尺度。103 个语义文字/图标样本的最低对比度为 **5.2346:1**；这项数字覆盖采样的类别组件，不代表全站每一像素的对比度。单文件报告断网检查 **0 HTTP / 0 page errors**。

第一次 smoke 暴露窄屏画布工具槽和旧泳道名断言，修正后第二次发现外观测试仍写死旧选框颜色；现在改为核对实际画布与导出的选框。一轮完整 46 场景通过后，独立复核要求统一 Event Log、lane title 与 Agent activity 的 Recorded text 名称；针对该项补回归并重建、重截，结果见最终记录。初次/中间/术语修正前结果保留，未把失败轮次当作通过。新增类别断言的一次专项运行因使用了旧 DOM 选择器而失败，修正为实际 Event Log 选择器后通过；未改动记录数据。

非生成源文件的 `git diff --check` 通过。根 HTML 内第三方 bundle 的多行字符串保留原有行尾空格（改前/改后各 19 行），未对生成 JavaScript 做可能改变字符串内容的清洗；本次 diff 标出的 5 处见 [generated-whitespace.json](visual-affordances/generated-whitespace.json)。

任务范围内 detector 只执行一次，结果 [空数组](visual-affordances/detector.json)。[初次独立复核](visual-affordances/finish-review.md) 与[修正后的最终裁定](visual-affordances/finish-verdict.md)独立保存。初次六页审阅仅提出一项术语修正；最终裁定将这一项评为 resolved / ship，未把修正裁定扩大为新一轮全站认证。最终共 **46 张独立 PNG**（6 张改前、20 张本地改后、20 张断网改后）。完整 PNG 尺寸、SHA-256、数据来源和截图方式见 [capture-manifest.json](visual-affordances/capture-manifest.json)。

## 仍有影响的边界

- 冻结 v1 仍缺少独立推理角色、逐调用 agent/父调用、调用时长、attempts、完整文件版本、成本及测试通过率；分别显示未记录。Recorded text 不推断推理或并行，最终消息不代表验证通过。
- Fit 为完整轨迹概览，长链会缩小标签；Locate/搜索恢复所选节点的可读尺度。保留当前分组与展开语义，未另造逻辑依赖。
- 现有大 bundle 提示仍在；首绘样本排除初始 bundle 下载，不能当作冷启动或所有原始节点绘制时间。
- 新截图使用公开合成 fixtures；本轮未调用模型、使用 key 或公开真实 NL2Repo 日志。既有本地真实数据验证记录继续保留。
- 本轮设计验收限桌面，窄屏仅运行已有兼容回归。历史 Taste 营销页 gate 和旧设计侧车的漂移不属于本轮修复范围。
