# TrajViz 三页信息层级改版 · 实施 Prompt

接手 `/Users/wangqichen/Documents/ChatGPT/traj` 当前工作树，完成 **Graph、Compare、Replay** 的信息层级改版，并交付可操作的界面和浏览器截图。核心任务是降低首屏密度，保留三张原图提供的全部功能和证据入口。每页让一个工作区主导，使用留白、对齐、字重和分隔线建立层级。将选中后才需要的内容放在联动详情中，将低频内容放在命名清楚的标签页或展开区。

**本轮设计、实现、截图与验收仅覆盖桌面端。**

## 三张原图

| 页面 | 唯一设计参考 |
| --- | --- |
| Graph · Multi-Agent Execution Graph | `/Users/wangqichen/Downloads/ChatGPT Image Nov 14, 2026 at 12_07_56 PM.png` |
| Compare · Trajectory Comparison | `/Users/wangqichen/Downloads/ChatGPT Image Nov 14, 2026 at 12_08_24 PM.png` |
| Replay · Trajectory Replay | `/Users/wangqichen/Downloads/ChatGPT Image Nov 14, 2026 at 12_08_53 PM.png` |

逐张打开原图并分区检查。原图定义功能范围、语义和浅色视觉基调。本 prompt 定义新版的布局优先级、入口和验收状态。以产品顶栏为截图起点。图里的 run、任务、金额、次数、时间、代码和状态都是界面示例。

## 开工与共享界面

- 先读 `AGENTS.md`、`DESIGN.md`、`PRODUCT.md`、`docs/SCHEMA.md`、`docs/VERIFICATION.md` 及 `docs/research/density-verification.md`。执行 `git status --short`，基于当前代码和已有改动继续。优先复用 `frontend/src/` 里的 `RunGraph.tsx`、`GraphView.tsx`、`Compare.tsx`、`Replay.tsx`、`Inspector.tsx`、`Evidence.tsx` 和共享外壳。
- 保留原图的产品标志和名称、面包屑、全局搜索及快捷键、通知、帮助和头像入口。将通知接到本地可用状态，头像接到本地偏好。左侧保留 Replay、Timeline、Graph、Compare、Analytics、Datasets、当前数据集和运行上下文。次要运行摘要可用一行状态加展开入口。页面标题下只常驻 run 或任务、结果及少量必要字段。agent、日期、完整时长、步数等可进入 Run details。保留 Share 和更多操作，提供可定位当前视图的链接。
- 统一浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中、绿成功、红失败，沿用项目主题切换。用连续工作面承载一类信息。列表和指标优先用平铺行和细分隔线，边框优先用于可操作控件、选择和代码或画布边界。正文、代码和状态保持可读。
- 同一 run 的快照、阶段、列表、画布、播放和详情通过 run ID 加精确源步骤索引联动。切换标签、开关抽屉或调整缩放时保持选择。保留键盘导航、焦点提示、关闭后焦点恢复和长内容局部滚动。
- 图中功能若缺少真实数据，保留可发现的入口并说明“未记录”或禁用原因。时间缺失时使用源步序。仅有时间点时按事件点显示。补丁、文件版本、失败原因、agent 身份、调用时长、尝试次数、Token、成本和通过率各自按真实数据或项目现有统计定义显示，未知值与 0 分开。摘要可回查对应步骤。合成测试数据明确标注。沿用冻结的数据契约、离线读取方式、权限和脱敏边界。

## Graph

首屏优先展示宽大的执行画布。运行摘要后放一条轻量阶段导航，画布上方只显示一行工具。右侧详情用细竖线与画布分开，选中节点后呈现证据。

| 原图功能 | 新版入口与交互 |
| --- | --- |
| Run ID、结果、任务、agent 列表、日期、耗时、Share、更多 | 常用字段放在标题下，完整元数据由 Run details 打开。 |
| Function Call Phases | 把 Planning、Investigation、Failed Test、Code Patch、Re-run、Passed Tests 做成单行阶段导航。选择阶段定位相关节点；在阶段详情中保留编号、时间、计划文本、文件清单、失败输出、补丁、重跑命令和通过输出。 |
| Graph / Timeline、Layers、Legend | 保留 Graph / Timeline 切换、缩放、适应画布、全屏及图中已有定位控件。将 Agents、Reasoning、Tool Calls、Results 四类开关放入 Layers，Legend 可展开查看节点和连线的含义。 |
| 执行图 | 保留方向箭头、分支、汇合、错误与重试的视觉语义。原图中的用户任务、计划、研究、代码、测试、工具调用、失败、重试、汇合、完成均有对应可识别样式。重试标注来自记录或已有统计。点击节点同步阶段和详情。 |
| Node Inspector | 默认仅显示选中提示。选中后显示节点、类型、状态、时间、次数、上一项和下一项，以及 Details、Code Diff、Error Output、Context。可查看描述、带行号和增删标记的补丁及 View Full Diff、此前尝试的错误、相关文件、上游、下游、记录消息与跳转。 |
| Agent Activity Timeline | 移到画布下方的 Agent activity 展开区。保留 By Agent 选择、展开、总活动时长与比例、共用时间标尺、分段活动、失败样式及点击定位。 |

## Compare

首屏是一张共享的 A/B 对齐表，两侧动作按统一阅读顺序排列。突出首次分歧，清楚区分对齐、单边额外步骤、重试和重新对齐。用状态图标和小色点区分 A/B；表里只展示一份主轨迹。

| 原图功能 | 新版入口与交互 |
| --- | --- |
| 任务、数据集、Agent A/B、run ID 和结果 | 一个紧凑选择区。沿用同任务校验和项目已有多 run 支持。 |
| Overall Comparison 与六项指标 | 首屏仅平铺时长、工具调用、重试三项。All metrics 提供全部六项，包括 Token、成本和测试通过率，并保留 A/B 数值、成对横条、对应柱图和每项共同尺度。总体概述和 Key Findings 放在独立可展开的分析区。 |
| Trajectory Alignment & Divergence | 保留 Aligned、Diverged、Rejoined 图例、两侧标签、共享状态列及连接语义。突出首分歧。未匹配项用清楚的空位表达，重新对齐由可核对的规则计算。点击任一侧步骤高亮匹配项，并打开 Step comparison。 |
| 两侧完整轨迹及 Stage Snapshots | 通过 Agent A/B 详情查看模型、步数、重试、时长、完整步骤清单、时间和逐步状态。快照列表可查看计划、失败、修改、重跑及成功的预览。每个快照可跳回对齐位置。 |
| Key Code Difference (Final Patch) | Patch comparison 提供 Unified Diff、Agent A (Final)、Agent B (Final)，保留文件路径、行号、上下文、增删和复制或全屏能力。选中步骤的补丁与最终补丁分别标明来源。 |

## Replay

首屏用左侧步骤清单、中央证据和底部播放条组成工作台。中央占主要宽度。Step details 默认收起，打开后留出可读的代码或输出宽度。选中后显示的证据与播放位置同步。

| 原图功能 | 新版入口与交互 |
| --- | --- |
| 六个阶段快照 | 用紧凑阶段条承载 Plan、Tool Call、Test Failed、Code Edit、Re-run、Success。可按需打开预览，保留编号、名称、选中态及真实计划、命令、错误、补丁和成功输出。选择后定位到具体步骤。 |
| Trajectory 步骤清单 | 保留步序、类型图标、标题、摘要、时间、状态和选中标记。用户任务、推理、终端、失败、反思、编辑、验证和最终答复按真实记录显示。 |
| 中央选中步骤 | 显示步骤序号、工具/类型、相对时间、可计算的时间差、描述和文件路径。保留 Diff、Updated File、File Context 及相应工具输出，含行号、上下文、增删计数、语法色、复制及扩大显示。根据当前步骤切换记录证据。 |
| Step Details | 打开后提供 Step ID、Type、Time、Status、Description、Edit Summary、Files Changed、Agent Reasoning 和原始引用。文件可定位中央证据。引用逐条对应记录。 |
| 底部播放条 | 全程可达。保留上一步、播放/暂停、下一步、已播/总时长、可拖动进度、当前步骤读数、倍速、面板开关、全屏。播放、拖动和倍速实际作用于同一条轨迹。 |

## 验收和交付

1. 建立逐图功能对照表，逐项记录原图位置、新版入口、默认可见性、触发方式、数据来源和验收结果。原图上低频按钮、图例、标签、统计和证据均须有一条对应记录。遇到数据缺口，验证入口和缺失态。
2. **每页至少两张独立全页 PNG，共六张基础截图。** 使用同一份合成数据、同一桌面视口、同一滚动位置。同页前后状态只改变选择或详情，避免拼图和裁切。用真实浏览器渲染截图。
   - `graph-before.png` 显示未选中节点、画布可操作。 `graph-after.png` 显示已选节点、联动阶段及带补丁的 Inspector。
   - `compare-before.png` 显示已加载的 A/B 对齐、首分歧与详情关闭态。 `compare-after.png` 显示选中分歧步骤、匹配标记及 Step comparison 面板。
   - `replay-before.png` 显示选中前、暂停、详情收起的起始工作台。 `replay-after.png` 显示选中 Code Edit 后的中央补丁、已打开的 Step Details 和仍可操作的播放条。
3. **为按需功能单独补图。** 每个独立的披露区有打开态截图，若可用基础图作为同页关闭态则在对照表中引用。至少覆盖 Graph 的阶段预览、Layers/Legend、错误或上下文详情、Agent activity；Compare 的两侧轨迹/快照、Patch comparison、All metrics 与 Key Findings；Replay 的阶段预览、文件上下文、失败工具输出和播放控件。标签页互斥时各取可读截图。截图路径和复现操作写入功能对照表。
4. 在桌面 1586 × 912 和 1280 × 800 验证主次层级、焦点、滚动、详情关闭、数据缺失态。跑三条完整操作链。Graph 测选阶段、筛图层、选节点、查输出和活动。Compare 测换 run、选分歧、查补丁和指标。Replay 测失败 → 修改 → 验证、查看文件、拖动和倍速。对照源步骤标识，检查线上与单文件离线版本，并核对现有 PNG/SVG/CSV 导出。
5. 执行 `python -m pytest`、`npm --prefix frontend run check`、`npm --prefix frontend run build`、`PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs`。优先复用已有密度验收脚本。交付功能对照表、前后态和按需状态截图、复现命令、测试结果及实际限制。
