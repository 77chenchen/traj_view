# TrajViz 四图设计交接 Prompt

你是接手续作的实现 agent。请在现有 TrajViz 工作树中完成设计和功能实现，交付一个可运行、可操作、可逐项对图验收的版本。四张图分别指定 **Compare、Graph、Timeline、Replay** 四个页面。先完整打开每张图，再放大检查顶部、左右边缘、内容区及底部。下文是最低覆盖清单，图片中能辨认出的细节都要进入你的实现与验收清单。

## 四张设计图

使用工作区内的持久副本。原始附件地址用于核对。四张原图均为 1586 × 992。

| 图 | 页面 | 工作区副本 | 原始附件地址 |
| --- | --- | --- | --- |
| 1 | Compare · Trajectory Comparison | `/Users/wangqichen/Documents/ChatGPT/traj/docs/design-references/trajectory-viewer/01-compare.png` | `/var/folders/ts/9ls7_pfj2hb3xg89wfs0gsr00000gn/T/codex-clipboard-da88eefb-bffa-4f1b-a3d7-0f17d34761a6.png` |
| 2 | Graph · Multi-Agent Execution Graph | `/Users/wangqichen/Documents/ChatGPT/traj/docs/design-references/trajectory-viewer/02-graph.png` | `/var/folders/ts/9ls7_pfj2hb3xg89wfs0gsr00000gn/T/codex-clipboard-4dc4edca-95e1-469b-9ec9-b0093a5369b8.png` |
| 3 | Timeline · Execution Timeline | `/Users/wangqichen/Documents/ChatGPT/traj/docs/design-references/trajectory-viewer/03-timeline.png` | `/var/folders/ts/9ls7_pfj2hb3xg89wfs0gsr00000gn/T/codex-clipboard-c71f52bb-79e7-4167-8036-5430fd307fca.png` |
| 4 | Replay · Trajectory Replay | `/Users/wangqichen/Documents/ChatGPT/traj/docs/design-references/trajectory-viewer/04-replay.png` | `/var/folders/ts/9ls7_pfj2hb3xg89wfs0gsr00000gn/T/codex-clipboard-418ebfc2-0770-4d5f-b5e0-6a729f065a32.png` |

## 接续现有工作

工作目录为 `/Users/wangqichen/Documents/ChatGPT/traj`。先读 `AGENTS.md`、`README.md`、`DESIGN.md`、`PRODUCT.md`、`docs/SCHEMA.md` 和 `docs/VERIFICATION.md`。执行 `git status --short`，以当前工作树为起点保留已有改动。先找 `frontend/src/main.tsx`、`Replay.tsx`、`RunGraph.tsx`、`GraphView.tsx`、`Compare.tsx`、`Inspector.tsx`、`TraceOverview.tsx`、`styles.css` 和已有浏览器测试，尽量复用已有组件与状态。完成真实 React 界面、可选中数据和交互，用组件渲染图里的快照、终端、代码和图表。设计图本身只作为验收参考。

## 四页共享外壳与视觉规范

- 以参考图深色界面为默认展示。统一近黑藏蓝画布、略亮的面板、细蓝灰描边、适度圆角、紧凑间距、浅色主文字和次级灰蓝文字。紫色用于主操作、选中和焦点，绿色表示成功或 Agent A，紫色区分 Agent B，红色表示错误和删除，蓝色用于工具或协作活动，黄色用于图中的工具节点。状态同时通过图标或文字表达。终端、错误输出和代码统一使用等宽字体，代码区有行号、语法着色、红删绿增、文件头及复制入口。
- 共用顶栏保留左侧层叠品牌图标、产品名、分隔线及面包屑。Compare 使用 `Runs / Trajectory Comparison`，单 run 页面显示 `Runs / run ID / 页面名`。右侧有全局搜索框、搜索图标、`⌘K` 提示、通知、帮助及圆形头像。沿用本地数据提供搜索、帮助和状态。截图顶部的系统窗口按钮、浏览器标签栏及地址栏属于浏览器外壳，实现范围从产品顶栏开始。
- 左侧共用图标导航，顺序为 Replay、Timeline、Graph、Compare、Analytics、Datasets。当前项使用紫底高亮。面包屑和导航可进入真实视图。侧栏底部固定 Current Dataset 下拉及上下文卡。Replay、Timeline、Graph 显示运行状态、时长、总步数、结果。Compare 显示当前比较的 run，颜色与页面一致。分析和数据集入口复用现有统计或目录能力。
- 主区标题使用圆形紫色视图图标、标题和说明。单 run 页用带细分隔线的元数据栏展示终端/run 图标、run ID、状态标签、任务、agent 或 agent 列表、日期和时长，右端是 Share 和更多菜单。Compare 使用专用任务与数据集条。Share 复制当前可分享的本地视图定位，离线入口沿用已有报告导出或可用的本地链接。工具条、边栏、卡片和表格需要明确的悬停、焦点、选中、折叠及禁用样式。
- 四页在相同 run 下共享稳定的源步骤标识。切换视图、选中快照、列表行、图节点或回放跳转时，保持对应详情和选择一致。支持键盘焦点和可辨认的工具提示。窄屏让三栏或四栏有序折叠成可访问面板，保留局部滚动、关键选择及回放能力。

## 图 1 · Trajectory Comparison

- **标题和选择条**。双向箭头圆形图标、标题、副标题。横条左侧显示 Task 和 Dataset，右侧两个带绿色/紫色圆点的 run 下拉。每个选择器显示 Agent A/B、run ID、状态标签和展开箭头。同任务比较沿用现有选择能力，双 run 布局按图实现。
- **顶部七张卡**。依次为 Overall Comparison、Duration、Tool Calls、Retries、Token Usage、Cost (USD)、Test Pass Rate。第一张包含概述文字和图标，其余六张各有对应图标、单位及两值摘要，下面两行 A/B 标签、成对横条和末端精确数值。相同指标的两条使用共同尺度，明确显示 0 和缺失值。
- **主体四列**。左侧是绿色边框的 Agent A 卡，中间为较宽的 Trajectory Alignment & Divergence 和下方 Key Code Difference，右邻是紫色边框的 Agent B 卡，最右列为 Summary & Key Findings 和 Comparison Charts。维持截图的栏序、对应头部与分区比例。
- **两侧轨迹和快照**。Agent 标识色、run ID、状态、模型、步数、重试次数、时长。Trajectory 有纵向步序线、编号、步骤标题、短说明、右对齐时间及逐步成功/失败图标。用图中的 A 侧五步和 B 侧八步作为覆盖样例，包括 Plan、失败测试、初版及二次修改、重试、通过测试、Reflection、Final Answer。Stage Snapshots 显示带窗口色点的终端或代码缩略预览、序号、名称及 Plan、Test (Failed)、Code Edit、Test、Success 等标签。A 侧有五个快照位置，B 侧有六个，点选后定位同一条记录。
- **中间对齐图**。标题和 Aligned、Diverged、Rejoined 图例，顶部有 A/B 身份胶囊，两侧事件卡体现成功、失败和当前差异。中线显示对齐说明、分歧卡及重新对齐的位置。实线或虚线、箭头方向、颜色和状态标签都要有对应语义。对齐、额外步骤与回合汇合从可核对的动作或阶段计算，图例与说明公开匹配标准。A 或 B 侧选中步骤时高亮另一侧可匹配的步骤及对应连接。
- **补丁与右栏**。Key Code Difference (Final Patch) 提供 Unified Diff、Agent A (Final)、Agent B (Final) 切换。保留文件图标和路径、diff 上下文、行号、符号及红删绿增。右栏保留外层标题、Key Findings 内卡与紫色项目符号。发现项覆盖可计算的效率、结果和分歧。Comparison Charts 使用两列三行小柱图，依次覆盖时长（秒）、工具调用、重试、Token（K）、美元成本、测试通过率。每图包含标题、轴线、刻度、A/B、柱顶值和一致的绿/紫编码。

## 图 2 · Multi-Agent Execution Graph

- **运行头部和六段概览**。元数据条显示 run ID、结果、任务、agent 列表、日期、时长、Share 和更多菜单。下一行左侧是 Function-Call Phases 与数量，右侧是带编号及起止时间的 Planning、Investigation、Failed Test、Code Patch、Re-run、Passed Tests 卡。内容对应计划、文件清单、红色失败输出、红绿补丁、执行命令、绿色通过输出。各卡可跳到图中对应证据。
- **Graph 主面板**。标题、类型及 info 图标，Graph/Timeline 切换，Layers 下拉、Agents/Reasoning/Tool Calls/Results 四个独立勾选、Legend 按钮。深色点阵画布左侧提供加减缩放、适应画布、全屏和层级定位入口。保留带图标、标题、副文案、状态角标的节点卡，带箭头的连接、分支、汇合、失败和重试的视觉语义。参考图节点覆盖 User Task、Planner、Researcher、Coder、Tester、Tool Calls、Error、Retry、Merge、Success。紫、蓝、黄、红、绿区分类型，重试使用紫色虚线与次数标注。画布下方完整呈现 Reasoning、Sub-Agent、Tool Call、Failure、Retry、Merge、Completion 图例及解释。
- **底部 Agent Activity Timeline**。标题、信息提示、总时长说明，右侧 View: By Agent 下拉与展开入口。左侧 agent 名和 Total Active（秒数与比例），右侧共享时间轴、刻度、栅格和标注起止时刻的活动条。覆盖 Planner、Researcher、Coder、Tester 的多段活动以及斜纹失败段。选择活动段应定位相应记录。
- **右侧 Node Inspector**。贯穿图和活动时间线两段，头部有图标、标题、上一项/下一项。摘要展示 Node、Type、Status、Time、Attempts。保留 Details、Code Diff、Error Output、Context 标签页，以及可折叠的 Description、Related Code Diff、Error Output (from prior attempt)、Context。Diff 有 View Full Diff、文件头、行号和增删样式。Context 有 Relevant files、Upstream nodes、Downstream nodes、Messages 数量及 Show 跳转。图选中、活动条、Inspector 的前后切换共用节点或源步骤标识。

## 图 3 · Execution Timeline

- **快照条**。元数据下面先有左箭头、Stage Snapshots 小标题、info 和简短说明，再排列 Plan、Test Failure、Code Edit、Retry、Success 卡及右箭头。卡内含编号、标题、时间和等宽内容预览。展示命令、失败栈、红绿 diff 或成功输出。当前快照用紫色描边和焦点效果。
- **中部多泳道时间线**。左侧宽面板标题包含 run ID。工具条含 Fit、1m、2m、5m、放大/缩小、Stages、Events 开关和全屏。时间标尺、栅格、阶段边界对齐。顶部箭头形阶段条按记录呈现规划、读文件、测试、错误、编辑、重试、再次测试、成功，失败红色、通过绿色。泳道有图标与标签，顺序为 User Task、Reasoning、Tool Calls、File Changes、Sub-agents、Final Answer。条内显示阶段或事件标签、文件名和增删统计、成功或失败图标。支持点击条、按阶段切换显示、按时间缩放与横向滚动。
- **下部 Event Log**。与时间线同宽。标题显示事件数，右侧事件搜索、All Categories 与 All Statuses 下拉。表格包含 `#`、Timestamp、Category、Event、Status、Duration。等宽时间、类别小图标、成功/失败文字和图标、交替行色、选中行紫色描边。用截图的失败测试事件作为选中态样例，表格、快照、时间线与 Inspector 同步。
- **右侧 Event Inspector**。头部有图标、前后导航，选中失败事件时有红色图标、标题和说明。元数据依次呈现 Timestamp、Duration、Category、Status、Tool Name。保留可折叠 Arguments、Output / Stderr 和 Analysis。参数用带行号的 JSON、语法色和复制按钮。输出区区分普通内容、stderr、断言失败和测试摘要并支持复制。分析区展示记录里的分析或有证据的简短诊断。

## 图 4 · Trajectory Replay

- **头部与六个快照**。元数据下并列 Plan、Tool Call、Test Failed、Code Edit、Re-run、Success。每张带编号胶囊、标题、深色终端/代码预览。保留错误红、diff 红绿、通过绿色等内容处理。当前选中的 Code Edit 样式用明显紫色外框。
- **左栏 Trajectory**。标题和步数。每行有步序、纵向连接线、分类圆图标、事件标题、摘要、右对齐时间和状态图标。覆盖 User Task、Reasoning、terminal.exec、Test Failure、Reflection、file.edit、test.run 和 Final Answer。当前项整行紫底描边，点击后同步右侧和播放位置。状态取源数据。
- **中栏选中步骤**。标题为 Step 序号、工具名、类型徽标，右侧显示相对时间和时间差，下方是步骤描述。文件头显示图标、路径、删除/新增数。代码窗口有上下文行、行号、删除行、添加行、语法色，保留内部滚动。底部有 Diff（含计数）、Updated File、File Context 切换以及复制、扩大显示。工具调用、错误或最终回答等其他步骤显示相应终端输出或文本内容。
- **右栏 Step Details**。依次有 Step ID、Type、Time、Status、Description、Edit Summary、Files Changed、Agent Reasoning。增删摘要分别着色，文件行包含路径与计数。推理区是带引号标记的原文引用样式。文件与引用能回到当前步骤的证据。
- **底部回放控制**。全宽且在回放时始终可达。依次有上一条、紫色圆形播放/暂停、下一条、已播/总时长、带紫色进度与滑块的进度条、步骤前后键与当前步骤读数、Speed 下拉、面板显示控制与全屏。进度拖动、逐步和速度切换都实际生效，进入页面、切换步骤和播完均有清晰状态。

## 数据与功能约束

- 保留现有 schema、CLI、数据导入、目录筛选、导出和离线分析入口。通过现有数据层组装页面；新增视图数据优先由已保存记录派生，必要时记录字段缺口。
- 图中的 run ID、日期、模型、测试结果、补丁、成本、Token 和重试计数是设计示例。产品展示实际记录和可复算的统计。缺字段的模块仍保留布局并显示“未记录”或相应空态。无时间戳时使用步序模式。有时间点而无时长时使用事件标记。未记录 agent、文件版本、分析、补丁、成本或通过率时，使用各自的缺失状态。正式数据里的内容、摘要、分支、汇合、失败与结果应能回查来源。
- 如果现有公开样例不足以展示四图的主要状态，用清楚标注的合成 fixture 覆盖它们。保留截图中的组件和状态，不把样例文字、互相矛盾的步骤编号、时间或统计当作产品数据。私有轨迹与凭证使用已有本地约定。
- 所有可点击元素接入真实操作。依赖缺失数据的按钮保留位置，提供清楚的禁用理由。纯视觉元素保持合适的语义与可访问标签。

## 验收与交付

1. 开工前按截图逐区做四份清单，记录区块、位置与比例、标题和说明、图标、颜色与状态、交互及数据来源。每个图上能看见的细节至少映射到一个清单项。实现后标记已通过或具体偏差，空数据状态也要验收。
2. 按 1586 × 992 原图去除浏览器外壳后的产品区域对照，四页分别截取桌面图。对照导航和面包屑、栏序、面板边界、字体、卡片和表格密度、图例、选中高亮及首屏能看到的底部控件。再测试 1280px 和约 390px 宽度，检查文字、键盘、滚动和操作可达性。
3. 在 Chrome 或 Playwright 跑四条完整操作链。Compare 更换 run、点分歧、同步高亮、切 diff。Graph 切图层、缩放、点节点、展开上下文。Timeline 切尺度、筛选失败事件并核对三处联动。Replay 从失败跳到修改和验证，测试播放、拖动、速度和证据切换。覆盖全局搜索、分享或导出入口、离线报告及缺数据场景。
4. 执行 `python -m pytest`、`npm --prefix frontend run check`、`npm --prefix frontend run build` 和 `PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs`。环境变量、Chrome 路径和新增测试按项目说明设置。将设计清单、四张新版页面截图和测试结果交付，并给出复现命令与仍存在的偏差。
