# 三页桌面信息层级 · 实施与逐图验收

类型：software / Operate。使用者在本地分析 coding-agent 记录，主要操作是定位失败 → 查看证据 → 检查修改 → 验证后续结果。

本轮采用用户完整指定的方向：「统一浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中、绿成功、红失败」。Graph 以执行画布为主，Compare 以唯一的共享 A/B 对齐表为主，Replay 以中央记录证据为主。保留产品名、标志、导航、真实数据和冻结 v1；不新增营销视觉、推断 agent 或生成文件版本。桌面验收为 1586×912、1280×800，手机不在本轮设计与截图范围。

唯一参考为 [Graph](../design-references/three-page-hierarchy/graph.png)、[Compare](../design-references/three-page-hierarchy/compare.png)、[Replay](../design-references/three-page-hierarchy/replay.png)。已逐张查看全图，并放大检查顶栏、两侧、中央与底部。浏览器窗口栏不属于产品。

基础图均为真实 Chrome 的独立全页 PNG；按需状态均为独立浏览器截图，Run DAGs 补图使用主区视口，避免内部滚动内容形成截图空白尾部。基础 before/after 指本轮的未选中/已选中或详情关闭/打开状态，不是历史版本。公开数据统一使用 `dashboard-baseline`（合成），Compare A 使用同任务 `dashboard-baseline`、B 使用 `dashboard-variant`。默认截图均从产品顶栏、main.scrollTop=0 开始。原有 dark density 报告保留为历史。

## Direction contract

**THESIS.** 使用者能从失败找到当时保存的命令和补丁，再确认之后的验证记录；降低同时出现的辅助内容，保留所有证据入口。

**WORLD.** 用户锁定：「统一浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中、绿成功、红失败，沿用项目主题切换。」以本轮三张原图为唯一视觉参考，桌面 Operate 工作台；保留真实产品名、标志与冻结 v1 的证据边界。

**STORY.** run / task → 阶段、首分歧或失败 → run + 精确源索引 → 保存的命令、输出、补丁或读取 → 后续验证结果。低频内容进入命名清楚的标签或展开区，关闭或缩放不丢失选择。

**FIRST VIEWPORT.** Graph：「首屏优先展示宽大的执行画布。」Compare：「首屏是一张共享的 A/B 对齐表，两侧动作按统一阅读顺序排列。」Replay：「首屏用左侧步骤清单、中央证据和底部播放条组成工作台。中央占主要宽度。Step details 默认收起」。Graph 的 Inspector 在未选中时仅显示提示；Compare 的 Step comparison 初始关闭。

**FORM.** `seed: none (pinned)`。世界与三页构图均由用户指定，不另做概念抽签。连续工作面、1px 分隔、克制的字重与紫色焦点服务阅读顺序；图相机和回放反馈只回应操作。验收为 1586×912、1280×800，保持局部滚动与可达播放条，不加入营销视觉或新移动版。

## 共享界面

| ID / 原图位置 | 新版入口 / 默认可见性 / 触发 | 数据与语义 | 验收与证据 |
| --- | --- | --- | --- |
| S01 顶部标志、名称、分隔 | 顶栏常驻；品牌回目录 | 现有 SVG 图标、Agent Trajectory Viewer | 通过 · [graph-before.png](three-page/graph-before.png) |
| S02 面包屑 | 顶栏常驻；Runs / run / 页面可导航 | URL、实际 run ID | 通过 · [replay-after.png](three-page/replay-after.png) |
| S03 搜索、图标、⌘K | 顶栏常驻；输入/Enter/Escape | 本地 search.json、元数据 | 通过 · [shared-search.png](three-page/shared-search.png) |
| S04 通知铃 | 点击查看本地状态 | 数据集数量、在线/离线、live 状态 | 通过 · [shared-status.png](three-page/shared-status.png) |
| S05 帮助 | 点击打开、关闭、Escape | 键盘与关系语义说明 | 通过 · [shared-help.png](three-page/shared-help.png) |
| S06 圆形头像 | 本地偏好；可切换明暗主题 | 浏览器 localStorage | 通过 · [shared-dark.png](three-page/shared-dark.png) |
| S07 左侧六项导航/当前项 | 常驻；实际路由，紫色选中 | Replay / Timeline / Graph / Compare / Analytics / Datasets | 通过 · [compare-before.png](three-page/compare-before.png) |
| S08 左下 Dataset | 常驻；下拉进入目录 | 本地已加载数据集 | 通过 · [graph-before.png](three-page/graph-before.png) |
| S09 左下运行/比较上下文 | 一行摘要+展开 | 实际结果、时长、步数；合成标识 | 通过 · [shared-run-details.png](three-page/shared-run-details.png) |
| S10 标题/紫色图标/说明 | 标题常驻、说明按 info 展开 | 视图用途 | 通过 · [graph-before.png](three-page/graph-before.png) |
| S11 标题下元数据 | run、结果、task 常驻；Run details 展开其余 | agent、model、date、duration、steps、dataset，缺失分别显示未记录 | 通过 · [shared-run-details.png](three-page/shared-run-details.png) |
| S12 Share/更多 | 常驻；复制精确 URL / CSV / 离线 HTML | run ID + 精确源索引；离线嵌入数据 | 通过 · [shared-actions.png](three-page/shared-actions.png) |
| S13 焦点/滚动/关闭 | 可见焦点、Escape 关闭并恢复；长内容局部滚动 | 不改变源选择；未知与 0 分开 | 通过 · [replay-after-1280.png](three-page/replay-after-1280.png) |

## Graph · 原图 2

| ID / 原图位置 | 新版入口 / 默认可见性 / 触发 | 数据与语义 | 验收与截图 |
| --- | --- | --- | --- |
| G01 元数据整行 | 共享 Run details | run summary、首个记录日期 | 通过 · [shared-run-details.png](three-page/shared-run-details.png) |
| G02 六张 Function Call Phases | 单行阶段导航；Previews 展开 | Planning / Investigation / Failed Test / Code Patch / Re-run / Passed Tests；缺项禁用 | 通过 · [graph-stages.png](three-page/graph-stages.png) |
| G03 阶段编号、时间、计划 | 预览或定位后 Details | 记录原文与时间点，非虚构阶段时长 | 通过 · [graph-stages.png](three-page/graph-stages.png) |
| G04 文件清单 | Investigation 预览、Files & activity | action.targets / 记录 read | 通过 · [graph-files.png](three-page/graph-files.png) |
| G05 失败、补丁、重跑、通过 | 预览及 Inspector 对应标签 | observation、patch argument、command、exit 0 | 通过 · [graph-after.png](three-page/graph-after.png) |
| G06 主面板标题与 info | 画布单行工具栏 | source DAG；info/Legend 解释边界 | 通过 · [graph-before.png](three-page/graph-before.png) |
| G07 Graph / Timeline | 同行切换 | 同一源选择与事件点 | 通过 · [graph-timeline.png](three-page/graph-timeline.png) |
| G08 Layers 下拉 | 同行 Layers，默认关闭 | 独立 Reasoning / Tool Calls / Results；Agents 未记录并禁用 | 通过（含未记录态） · [graph-layers.png](three-page/graph-layers.png) |
| G09 阶段、工具、错误、边开关 | Layers 内 | 现有过滤与四类边；不重接边 | 通过 · [graph-layers.png](three-page/graph-layers.png) |
| G10 层级、连续折叠 | Layers 内 Steps / Hierarchy、Fold repeats | 连续区间保留成员索引；非连续重复独立 | 通过 · [graph-layers.png](three-page/graph-layers.png) |
| G11 缩放、适应、全屏、定位 | 画布左边常驻 | 同一相机；方向箭头 | 通过 · [graph-before.png](three-page/graph-before.png) |
| G12 节点搜索、PNG、SVG | 工具栏右侧常驻 | 当前图、过滤、主题与选择 | 通过 · [graph-after.png](three-page/graph-after.png) |
| G13 节点类型、图标、标题、副文案、状态 | 宽大主画布 | recorded text / plan / tool category / error / final，agent 缺失不伪造 | 通过（含未记录态） · [graph-after.png](three-page/graph-after.png) |
| G14 箭头、分支、汇合、重试及次数 | 主画布；Legend 展开解释 | temporal / dependency（既有启发式）/ retry / structural（包含）；跨块向前 | 通过 · [graph-legend.png](three-page/graph-legend.png) |
| G15 Inspector 空态 | 默认右侧仅提示选节点 | 没有选择时不加载伪详情 | 通过 · [graph-before.png](three-page/graph-before.png) |
| G16 节点摘要、上一/下一、清除 | 选中后右侧 | 精确索引、type、status、time；attempts 未记录 | 通过（含未记录态） · [graph-after.png](three-page/graph-after.png) |
| G17 Details / Description | Inspector Details | 记录文本、调用参数 | 通过 · [graph-context.png](three-page/graph-context.png) |
| G18 Code Diff / View Full Diff | Inspector Code Diff | 文件头、行号、上下文、红删绿增、复制/扩大 | 通过 · [graph-after.png](three-page/graph-after.png) |
| G19 Error Output / prior attempt | Inspector Error Output | 当前输出与同签名的此前失败；无记录明确空态 | 通过 · [graph-error.png](three-page/graph-error.png) |
| G20 Context / Show | Inspector Context | relevant files、upstream/downstream、messages、原始引用可回查 | 通过 · [graph-context.png](three-page/graph-context.png) |
| G21 Agent Activity Timeline | 画布下方 Agent activity 展开 | By Agent / By Category、共享标尺、事件点；active duration/比例/逐步身份缺失 | 通过（含未记录态） · [graph-activity.png](three-page/graph-activity.png) |
| G22 活动失败样式、点击定位、扩大 | activity 内 | 同一源步骤与选择 | 通过 · [graph-activity.png](three-page/graph-activity.png) |
| G23 签名频次、循环指标 | 右侧 Signatures | aggregated 频次与 cycle summary | 通过 · [graph-signatures.png](three-page/graph-signatures.png) |

## Compare · 原图 1

| ID / 原图位置 | 新版入口 / 默认可见性 / 触发 | 数据与语义 | 验收与截图 |
| --- | --- | --- | --- |
| C01 Task / Dataset | 一行紧凑选择区 | 实际同任务、本地合成数据集 | 通过 · [compare-before.png](three-page/compare-before.png) |
| C02 A/B 圆点、下拉、run、状态 | 选择区常驻 | 绿色 A / 紫色 B；不允许重复/异任务；保留 2–4 run | 通过 · [compare-dags.png](three-page/compare-dags.png) |
| C03 Overall Comparison | Key Findings 独立展开区 | 可复算动作、结果、分歧；来源索引 | 通过 · [compare-findings.png](three-page/compare-findings.png) |
| C04 Duration / Tool Calls / Retries | 首屏三项平铺 | wall_s、action sequence count、retry edges；0 与未记录分别表达 | 通过 · [compare-before.png](three-page/compare-before.png) |
| C05 Token / Cost / Test Pass Rate | All metrics | token input+output；后两项未记录 | 通过（含未记录态） · [compare-metrics.png](three-page/compare-metrics.png) |
| C06 成对横条、精确值、单位、共同尺度 | All metrics 表 | 每项共同 max，数值始终可读 | 通过 · [compare-metrics.png](three-page/compare-metrics.png) |
| C07 六张柱图、轴线、刻度、柱顶数值、A/B | All metrics / Comparison charts | 同六项指标，绿紫一致 | 通过 · [compare-charts.png](three-page/compare-charts.png) |
| C08 对齐主区、两侧身份、共享状态列 | Alignment 默认唯一主轨迹 | LCS 归一化动作签名，长序列 fallback 原动作偏移 | 通过 · [compare-before.png](three-page/compare-before.png) |
| C09 Aligned / Diverged / Rejoined 图例 | 对齐表头常驻，规则可展开 | rejoin 为缺口后的同签名配对，不声称语义相等 | 通过 · [compare-before.png](three-page/compare-before.png) |
| C10 首分歧及源索引 | 顶部定位按钮与行标记 | 沿用原动作序列 zero-based offset、两侧精确索引 | 通过 · [compare-after.png](three-page/compare-after.png) |
| C11 单边空位、失败、重试、输出差异、连接 | 对齐共享状态列 | 不重复展示主轨迹；空位标明哪侧额外动作 | 通过 · [compare-before.png](three-page/compare-before.png) |
| C12 选中、匹配高亮 | 点击任一侧，Step comparison 打开 | 选中一个源节点，高亮所有同签名出现；每次出现保留位置 | 通过 · [compare-matches.png](three-page/compare-matches.png) |
| C13 Step comparison / 关闭 | 右侧联动详情；默认关闭 | 配对来源与其他同签名候选明确区分；关闭恢复焦点 | 通过 · [compare-after.png](three-page/compare-after.png) |
| C14 Agent A 模型/步数/重试/时长/状态 | Agent A details | actual run、metrics 与完整列表 | 通过 · [compare-agent-a.png](three-page/compare-agent-a.png) |
| C15 Agent B 元数据、完整清单/时间/状态 | Agent B details | 失败、编辑、重试、通过、文本和 final 按记录 | 通过 · [compare-agent-b.png](three-page/compare-agent-b.png) |
| C16 A 五个 / B 六个快照位置及预览 | Agent details / Stage snapshots / Previews | 记录计划、失败、修改、重跑、通过；缺项禁用 | 通过 · [compare-snapshots-a.png](three-page/compare-snapshots-a.png) |
| C17 快照定位共享表 | 点快照回到 Alignment 相应分页 | run + 精确 idx，不用显示序号作身份 | 通过 · [compare-snapshots-b.png](three-page/compare-snapshots-b.png) |
| C18 Key Code Difference (Final Patch) | Patch comparison | 最后记录补丁，标明两侧源索引；完整最终版本未记录 | 通过 · [compare-patch.png](three-page/compare-patch.png) |
| C19 Unified Diff / Agent A (Final) / B | Patch comparison 标签 | 文件头、行号、上下文、增删、复制、全屏；缺失文件版本空态 | 通过（含未记录态） · [compare-final-a.png](three-page/compare-final-a.png) |
| C20 选中补丁与最终补丁来源 | Step comparison / Code Diff 与独立 Patch comparison | 当前步骤 vs last saved patch 明确区分 | 通过 · [compare-selected-patch.png](three-page/compare-selected-patch.png) |
| C21 独立 DAG、阶段带、Jaccard、CSV | Run DAGs / CSV 操作 | 保留原 2–4 run 支持 | 通过 · [compare-dags.png](three-page/compare-dags.png) |

## Replay · 原图 4

| ID / 原图位置 | 新版入口 / 默认可见性 / 触发 | 数据与语义 | 验收与截图 |
| --- | --- | --- | --- |
| R01 六阶段编号、名称、选择 | 单行阶段条常驻 | Plan / Tool Call / Failed Test / Code Edit / Re-run / Success 依据记录命名 | 通过 · [replay-before.png](three-page/replay-before.png) |
| R02 六预览、命令/计划/错误/diff/通过 | Previews，默认关闭 | actual saved text / args / observation | 通过 · [replay-stages.png](three-page/replay-stages.png) |
| R03 Trajectory 标题、步数、步序线 | 左侧常驻 | source order；显示序号与精确 idx 分离 | 通过 · [replay-before.png](three-page/replay-before.png) |
| R04 每行类型、标题、摘要、时间、状态 | 整行选择、紫色选中 | 真实事件，缺消息/推理角色明确标注 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R05 搜索、失败/编辑/验证跳转 | 左侧过滤、轻量步骤操作 | 同一源选择；不合成失败原因 | 通过 · [replay-failure.png](three-page/replay-failure.png) |
| R06 中央步骤号、tool/type、相对时间/Δ | 中央常驻 | 时间差不是调用时长；无 ts 显示源步序 | 通过（含未记录态） · [missing-time.png](three-page/missing-time.png) |
| R07 描述、文件头、路径、增删数 | 中央常驻 | 源 thought、targets、patchStats | 通过 · [replay-after.png](three-page/replay-after.png) |
| R08 Diff 行号、上下文、符号、语法色 | 中央 Diff | 记录补丁，不推断未保存文件 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R09 Updated File | 中央标签 | args.content / read excerpt；未记录空态 | 通过（含未记录态） · [replay-file.png](three-page/replay-file.png) |
| R10 File Context | 中央标签 | 先前同文件的 saved read；定位原步骤 | 通过 · [replay-context.png](three-page/replay-context.png) |
| R11 复制、扩大 | 中央标签栏右侧 | 当前标签的真实证据 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R12 工具输出、错误、最终文本 | 中央随选择切换 | command、observation、recorded text | 通过 · [replay-failure.png](three-page/replay-failure.png) |
| R13 Terminal / Tests | 中央底部按需展开 | 当前 observation；避免失败输出默认重复 | 通过 · [replay-validation.png](three-page/replay-validation.png) |
| R14 Step Details 开/关与焦点 | 顶部或 transport 面板按钮；默认关闭 | 选择不变；Escape 和关闭恢复控制焦点 | 通过 · [replay-before.png](three-page/replay-before.png) |
| R15 Step ID / Type / Time / Status | 右侧打开后 | 精确索引与真实状态 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R16 Description / Edit Summary / Files Changed | 右侧打开后 | 可定位中央证据；红删绿增 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R17 Agent Reasoning / 引用 / 原始行 | 右侧记录文本与 Raw reference | v1 未分角色；逐段原文，不声称未记录的 reasoning | 通过（含未记录态） · [replay-details.png](three-page/replay-details.png) |
| R18 上一步/播放暂停/下一步/回到开头 | 底部常驻 | 同一条源序列 | 通过 · [replay-playback.png](three-page/replay-playback.png) |
| R19 已播/总时长、拖动条、步骤读数 | 底部常驻 | 时间点或步序，不是 wall_s 插值 | 通过 · [replay-after.png](three-page/replay-after.png) |
| R20 Speed、面板开关、全屏、播放结束 | 底部常驻 | speed 改变步进间隔；结束暂停；按钮状态可辨 | 通过 · [replay-playback.png](three-page/replay-playback.png) |

## 验证执行记录

全部 77 个映射项已完成入口和数据边界核对；存在字段缺口的项目验收其缺失态，不把图中示例内容当作数据。功能检查由 `tests/e2e/three-page.mjs` 执行，旧浏览器用例同步改为先打开对应披露区。原有窄屏测试保留，本轮设计与交付截图只覆盖桌面。

| 检查 | 实际结果 |
| --- | --- |
| `python -m pytest` | 80 passed，3.79s |
| `npm --prefix frontend run check` | 通过 |
| `npm --prefix frontend run build` | 通过；JS 2,413.28 kB / gzip 747.61 kB，CSS 132.18 kB / gzip 24.82 kB；保留大包提醒 |
| `PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs` | 26 场景通过；746 项 DAG 拓扑/映射检查通过 |
| 500 / 2,000 步首绘 | 81.7 / 89.6ms；修正后的单次本机样本，沿用点击 run → 可见 SVG → 下一动画帧，排除初始 bundle 读取 |
| `node scripts/verify-three-page.mjs` | 本地服务及根目录单文件 HTML 通过；两种桌面尺寸、三条操作链、PNG/SVG/CSV、精确索引及缺失态 |
| 线上与离线 | 离线上下文阻断网络；HTTP 请求 0，页面异常 0；通知内容按服务/离线场景有所区别 |
| Impeccable detector | 一次机械检查返回 `[]`；后续保留窄屏导航及命令可读性，交由独立复核 |
| Taste gate | 既有状态 `GATE: OFF`；不宣称营销页面检查通过 |

浏览器为系统 Chrome 157.0.8103.52。基础截图 6 张 1586×912 加 6 张 1280×800，均从产品顶栏及同一 main.scrollTop=0 开始；同页 before/after 仅改变源选择与详情。其余截图逐项对应已命名的按需入口。详见 [机器验证记录](three-page/verification.json)、[捕获与哈希清单](three-page/capture-manifest.json) 和 [浏览器场景结果](three-page/scenarios.json)。独立设计复核记录在 [review.md](three-page/review.md)。

最终交付本地 49 个状态及完全阻断网络的离线 49 个状态，共 98 张独立 PNG。全部实际图像尺寸与记录视口一致；本地/离线 48/49 对截图逐字节一致，仅通知中的服务状态文本不同。完整 [截图目录](three-page/screenshots.md) 记录每张图的尺寸、main 滚动位置和源步骤，哈希清单同时固定了前端 bundle、离线 HTML、fixture 与捕获脚本版本。搜索补图保留焦点和可见的结果面板。

独立完整复核提出三项收尾修正：浅色 Graph 选中环改为紫色、图例文字对比度由 1.96:1 提升至 5.92:1、Replay 文件标签的可访问名称与可见文字一致。修正后重新构建并重跑 26 场景与同一组截图；[最终 verdict](three-page/verdict.md) 将 F1–F3 全部判为 resolved，`disposition: ship`。该结论覆盖三项修正及其引入的回归检查；保留此前的完整复核记录。

### 复现

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
python -m backend.cli serve out
# 保持本地服务运行，在另一个终端执行：
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/verify-three-page.mjs
```

打开 [Graph](http://127.0.0.1:8765/#view=graph&run=dashboard-baseline)、[Compare](http://127.0.0.1:8765/#view=compare&compare=dashboard-baseline&compare=dashboard-variant)、[Replay](http://127.0.0.1:8765/#view=replay&run=dashboard-baseline)。直接用 Chrome 打开根目录 `trajviz-report.html` 复现同样入口。

- Graph：Previews → Failed Test #50 → Layers 筛选后复原 → 搜索 #60 → Code Diff / Context → Agent activity → 点击 #50。图、阶段及 Inspector 共用精确源索引。
- Compare：Agent B 换成 dashboard-short 再换回 variant → First divergence（动作偏移 1，A#30 / B#30）→ #60 对齐行与双方签名高亮 → Step comparison → Patch comparison → All metrics / charts → Key Findings。
- Replay：Next failure #50 → Next edit #60 → File Context（已保存的 #30 读取）→ Next validation #70（仍失败）→ Next validation #100（通过）→ 拖动进度、0.5× / 4×、播放结束自动暂停。列表、中央证据、详情、URL 与播放读数同步。

### 实际限制与语义

- 原 v1 未分别保存消息/推理角色、逐步 agent 与 parent links、调用时长、尝试次数、完整最终文件版本、成本和测试通过率。保留入口并显示未记录；Agent 图层禁用；活动显示事件点与类别，不编造四名 agent 的持续区间、时长或比例。相邻时间差 Δ 仅为记录时间差。
- 只有明确保存的 action.targets / path 参数进入文件定位；这表示记录中的目标，不证明文件系统已经成功修改。File Context 展示之前的已保存读取；Updated File 只有明确内容时才显示。原始行引用可回查，缺少补丁时不重建。
- DAG 始终按源顺序从左向右。顺序、现有启发式依赖、重试和包含关系分别编码；连续重复压缩成区间，块内边在成员详情，非连续重复保持原位。公开 dashboard 样例主要为串行；不照搬设计示意中的并行 agent 分支。
- A/B 表按归一化动作签名的 LCS 对齐，超长序列回退到原动作偏移；Rejoined 只表示缺口后重新匹配签名，不证明语义等价。First divergence 仍采用原动作序列的首差异和两侧源索引。签名匹配会标出每次重复出现，选中项有更强外框。
- Patch comparison 显示两侧最后已保存的补丁参数（本样例 A#60/B#60），不声称是重建的最终文件差异。选中步骤补丁在 Step comparison 单独注明来源。最终文件未记录时两个 Final 标签明确空态。
- 保留现有 schema、CLI、目录筛选、CSV、Sankey、主题、2–4 run DAG 和单文件离线读取；本轮不增加移动端设计或远端服务部署。私有轨迹与凭证不进入此报告、fixtures 或公开截图。
