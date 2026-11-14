# 当前功能入口对照 · 桌面

本表逐项延续三张浅色原图的 77 项功能映射。最新用户指示优先：单行顶部图标与功能标签、移除左侧导航与顶栏辅助入口、白色竖向 DAG；Graph/Timeline 恢复单屏，其余页自然纵向滚动。旧图位置保留用于追踪，已删除的装饰或顶栏入口不按旧图恢复。合成数据为 `dashboard-baseline/variant`，长图为 `execution-long-synthetic`。

截图均在同一 built UI 上由 Chrome 独立捕获。链接是可读状态的代表图；行为通过 [38 场景及当前链断言](verification.json) 验证，不能从静态图推断行为。标签互斥的补图和尺寸见 [截图清单](captures.json)。

## 共享界面

| 原图位置 / ID | 当前入口与触发 | 默认可见性 | 数据来源与边界 | 结果 / 当前截图 |
| --- | --- | --- | --- | --- |
| S01 顶部标志、名称、分隔 | 产品图标；仅图标，点击回目录 | 常驻；无产品名称 | 现有黑白图标；生成图标已延期 | 通过；按最新指示替换旧名称区 · [graph-before.png](graph-before.png) |
| S02 面包屑 | 视图标题和 Run details；顶栏面包屑已按用户要求移除 | 元数据按需展开 | 实际 run ID / task / dataset | 通过；最新导航覆盖旧图 · [graph-before.png](graph-before.png) |
| S03 搜索、图标、⌘K | ⌘K / Ctrl+K 进入 Datasets 并聚焦本地搜索 | 快捷键；无顶栏搜索框 | 本地 search.json 与元数据 | 通过；快捷键实际验证 · [runs-1586.png](runs-1586.png) |
| S04 通知铃 | 本地 live 状态在有 live 源时显示于正文；移除通知按钮 | 条件可见 | 服务状态、SSE、50-run 本地状态 | 通过；live 场景通过，公开样例无 live 源 · [graph-before.png](graph-before.png) |
| S05 帮助 | 视图 info、Graph Legend 和对齐规则说明；移除问号入口 | 按需 | 现有证据与关系规则 | 通过；按最新导航简化 · [graph-legend.png](graph-legend.png) |
| S06 圆形头像 | Datasets → Local dataset & appearance；移除头像 | 展开后切换 | 浏览器 localStorage；Graph 两种主题均白底 | 通过；theme / node-appearance 场景 · [runs-1586.png](runs-1586.png) |
| S07 左侧六项导航/当前项 | 64px 单行顶栏：Replay / Timeline / Graph / Compare / Analytics / Datasets | 常驻；正常文档流；当前项下划线 | 实际路由；左 rail 已移除 | 通过；两种桌面尺寸 · [graph-before.png](graph-before.png) |
| S08 左下 Dataset | Datasets → Local dataset & appearance | 默认收起 | 实际本地数据集 | 通过；与旧 Dataset 区功能相同 · [runs-1586.png](runs-1586.png) |
| S09 左下运行/比较上下文 | run/task/结果单行；其他运行上下文进入 Run details | 摘要常驻；完整按需 | 实际状态、时长、源步数、合成标识 | 通过；不再堆叠上下文卡 · [graph-before.png](graph-before.png) |
| S10 标题/紫色图标/说明 | 标题、低对比线图标；info 打开说明 | 标题常驻；说明按需 | 视图用途；无紫色圆形装饰 | 通过；采用当前中性色调 · [graph-before.png](graph-before.png) |
| S11 标题下元数据 | Run details 展开完整元数据 | run/task/结果常驻；其他按需 | 实际 agent/model/date/duration/steps；各自缺失态 | 通过；未记录与 0 分开 · [graph-after.png](graph-after.png) |
| S12 Share/更多 | Share 与更多；复制精确 URL、CSV、单文件 HTML | 常驻；操作触发 | run ID + 精确源 idx；嵌入离线数据 | 通过；三页链与 offline export · [compare-before.png](compare-before.png) |
| S13 焦点/滚动/关闭 | 可见键盘焦点、Escape/关闭后恢复；局部滚动保持选择 | 按操作出现 | 精确 run + idx；详情和标签不因 resize 重置 | 通过；playback/document/focus 链 · [replay-after-1280.png](replay-after-1280.png) |

## Graph

| 原图位置 / ID | 当前入口与触发 | 默认可见性 | 数据来源与边界 | 结果 / 当前截图 |
| --- | --- | --- | --- | --- |
| G01 元数据整行 | 共享 Run details | 按表述；次要面板默认收起 | run summary、首个记录日期 | 通过；含适用缺失态 · [graph-before.png](graph-before.png) |
| G02 六张 Function Call Phases | 单行阶段导航；Previews 展开 | 按表述；次要面板默认收起 | Planning / Investigation / Failed Test / Code Patch / Re-run / Passed Tests；缺项禁用 | 通过；含适用缺失态 · [graph-stages.png](graph-stages.png) |
| G03 阶段编号、时间、计划 | 预览或定位后 Details | 按表述；次要面板默认收起 | 记录原文与时间点，非虚构阶段时长 | 通过；含适用缺失态 · [graph-stages.png](graph-stages.png) |
| G04 文件清单 | Investigation 预览、Files & activity | 按表述；次要面板默认收起 | action.targets / 记录 read | 通过；含适用缺失态 · [graph-files.png](graph-files.png) |
| G05 失败、补丁、重跑、通过 | 预览及 Inspector 对应标签 | 按表述；次要面板默认收起 | observation、patch argument、command、exit 0 | 通过；含适用缺失态 · [graph-after.png](graph-after.png) |
| G06 主面板标题与 info | 画布单行工具栏 | 主区或工具栏可见；证据随选择 | source DAG；info/Legend 解释边界 | 通过；含适用缺失态 · [graph-before.png](graph-before.png) |
| G07 Graph / Timeline | 同行切换 | 主区或工具栏可见；证据随选择 | 同一源选择与事件点 | 通过；含适用缺失态 · [timeline-timeline-scrolled.png](timeline-timeline-scrolled.png) |
| G08 Layers 下拉 | 同行 Layers，默认关闭 | 按表述；次要面板默认收起 | 独立 Reasoning / Tool Calls / Results；Agents 未记录并禁用 | 通过；含适用缺失态 · [graph-layers.png](graph-layers.png) |
| G09 阶段、工具、错误、边开关 | Layers 内 | 按表述；次要面板默认收起 | 现有过滤与四类边；不重接边 | 通过；含适用缺失态 · [graph-layers.png](graph-layers.png) |
| G10 层级、连续折叠 | Layers → Steps / Hierarchy / Fold repeats；长图默认内容分组，点击合并节点原位展开，header/Collapse last/all 返回 | 按表述；次要面板默认收起 | 连续区间保留成员索引；非连续重复独立 | 通过；含适用缺失态 · [vertical-expanded-1586.png](vertical-expanded-1586.png) |
| G11 缩放、适应、全屏、定位 | 画布左侧缩放 / Fit / 全屏 / 层级入口；普通滚轮上下浏览，修饰键滚轮缩放 | 主区或工具栏可见；证据随选择 | 同一相机；方向箭头 | 通过；含适用缺失态 · [vertical-fullscreen-1586.png](vertical-fullscreen-1586.png) |
| G12 节点搜索、PNG、SVG | 工具栏右侧常驻 | 主区或工具栏可见；证据随选择 | 当前图、过滤、主题与选择 | 通过；含适用缺失态 · [graph-after.png](graph-after.png) |
| G13 节点类型、图标、标题、副文案、状态 | 宽大主画布 | 主区或工具栏可见；证据随选择 | recorded text / plan / tool category / error / final，agent 缺失不伪造 | 通过；含适用缺失态 · [vertical-patch-1586.png](vertical-patch-1586.png) |
| G14 箭头、分支、汇合、重试及次数 | 主画布；Legend 展开解释 | 主区或工具栏可见；证据随选择 | temporal / dependency（既有启发式）/ retry / structural（包含）；跨块向前 | 通过；含适用缺失态 · [graph-legend.png](graph-legend.png) |
| G15 Inspector 空态 | 默认右侧仅提示选节点 | 主区或工具栏可见；证据随选择 | 没有选择时不加载伪详情 | 通过；含适用缺失态 · [graph-before.png](graph-before.png) |
| G16 节点摘要、上一/下一、清除 | 选中后右侧 | 选中后 | 精确索引、type、status、time；attempts 未记录 | 通过；含适用缺失态 · [graph-after.png](graph-after.png) |
| G17 Details / Description | Inspector Details | 选中后 | 记录文本、调用参数 | 通过；含适用缺失态 · [graph-context.png](graph-context.png) |
| G18 Code Diff / View Full Diff | Inspector Code Diff | 选中后 | 文件头、行号、上下文、红删绿增、复制/扩大 | 通过；含适用缺失态 · [graph-after.png](graph-after.png) |
| G19 Error Output / prior attempt | Inspector Error Output | 选中后 | 当前输出与同签名的此前失败；无记录明确空态 | 通过；含适用缺失态 · [graph-error.png](graph-error.png) |
| G20 Context / Show | Inspector Context | 选中后 | relevant files、upstream/downstream、messages、原始引用可回查 | 通过；含适用缺失态 · [graph-context.png](graph-context.png) |
| G21 Agent Activity Timeline | 画布下方 Agent activity 展开 | 按表述；次要面板默认收起 | By Agent / By Category、共享标尺、事件点；active duration/比例/逐步身份缺失 | 通过；含适用缺失态 · [graph-activity.png](graph-activity.png) |
| G22 活动失败样式、点击定位、扩大 | activity 内 | 按表述；次要面板默认收起 | 同一源步骤与选择 | 通过；含适用缺失态 · [graph-activity.png](graph-activity.png) |
| G23 签名频次、循环指标 | 右侧 Signatures | 按表述；次要面板默认收起 | aggregated 频次与 cycle summary | 通过；含适用缺失态 · [graph-signatures.png](graph-signatures.png) |

## Compare

| 原图位置 / ID | 当前入口与触发 | 默认可见性 | 数据来源与边界 | 结果 / 当前截图 |
| --- | --- | --- | --- | --- |
| C01 Task / Dataset | 一行紧凑选择区 | 主区或工具栏可见；证据随选择 | 实际同任务、本地合成数据集 | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C02 A/B 圆点、下拉、run、状态 | 选择区常驻 | 主区或工具栏可见；证据随选择 | 绿色 A / 钢蓝 B；不允许重复/异任务；保留 2–4 run | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C03 Overall Comparison | Key Findings 独立展开区 | 按表述；次要面板默认收起 | 可复算动作、结果、分歧；来源索引 | 通过；含适用缺失态 · [compare-findings.png](compare-findings.png) |
| C04 Duration / Tool Calls / Retries | 首屏三项平铺 | 主区或工具栏可见；证据随选择 | wall_s、action sequence count、retry edges；0 与未记录分别表达 | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C05 Token / Cost / Test Pass Rate | All metrics | 按表述；次要面板默认收起 | token input+output；后两项未记录 | 通过；含适用缺失态 · [compare-metrics.png](compare-metrics.png) |
| C06 成对横条、精确值、单位、共同尺度 | All metrics 表 | 按表述；次要面板默认收起 | 每项共同 max，数值始终可读 | 通过；含适用缺失态 · [compare-metrics.png](compare-metrics.png) |
| C07 六张柱图、轴线、刻度、柱顶数值、A/B | All metrics / Comparison charts | 按表述；次要面板默认收起 | 同六项指标，绿蓝一致 | 通过；含适用缺失态 · [compare-charts.png](compare-charts.png) |
| C08 对齐主区、两侧身份、共享状态列 | Alignment 默认唯一主轨迹 | 主区或工具栏可见；证据随选择 | LCS 归一化动作签名，长序列 fallback 原动作偏移 | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C09 Aligned / Diverged / Rejoined 图例 | 对齐表头常驻，规则可展开 | 主区或工具栏可见；证据随选择 | rejoin 为缺口后的同签名配对，不声称语义相等 | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C10 首分歧及源索引 | 顶部定位按钮与行标记 | 主区或工具栏可见；证据随选择 | 沿用原动作序列 zero-based offset、两侧精确索引 | 通过；含适用缺失态 · [compare-after.png](compare-after.png) |
| C11 单边空位、失败、重试、输出差异、连接 | 对齐共享状态列 | 主区或工具栏可见；证据随选择 | 不重复展示主轨迹；空位标明哪侧额外动作 | 通过；含适用缺失态 · [compare-before.png](compare-before.png) |
| C12 选中、匹配高亮 | 点击任一侧，Step comparison 打开 | 选中后 | 选中一个源节点，高亮所有同签名出现；每次出现保留位置 | 通过；含适用缺失态 · [compare-after.png](compare-after.png) |
| C13 Step comparison / 关闭 | 右侧联动详情；默认关闭 | 选中后 | 配对来源与其他同签名候选明确区分；关闭恢复焦点 | 通过；含适用缺失态 · [compare-after.png](compare-after.png) |
| C14 Agent A 模型/步数/重试/时长/状态 | Agent A details | 按表述；次要面板默认收起 | actual run、metrics 与完整列表 | 通过；含适用缺失态 · [compare-agent-a.png](compare-agent-a.png) |
| C15 Agent B 元数据、完整清单/时间/状态 | Agent B details | 按表述；次要面板默认收起 | 失败、编辑、重试、通过、文本和 final 按记录 | 通过；含适用缺失态 · [compare-agent-b.png](compare-agent-b.png) |
| C16 A 五个 / B 六个快照位置及预览 | Agent details / Stage snapshots / Previews | 按表述；次要面板默认收起 | 记录计划、失败、修改、重跑、通过；缺项禁用 | 通过；含适用缺失态 · [compare-snapshots-a.png](compare-snapshots-a.png) |
| C17 快照定位共享表 | 点快照回到 Alignment 相应分页 | 按表述；次要面板默认收起 | run + 精确 idx，不用显示序号作身份 | 通过；含适用缺失态 · [compare-snapshots-b.png](compare-snapshots-b.png) |
| C18 Key Code Difference (Final Patch) | Patch comparison | 按表述；次要面板默认收起 | 最后记录补丁，标明两侧源索引；完整最终版本未记录 | 通过；含适用缺失态 · [compare-patch.png](compare-patch.png) |
| C19 Unified Diff / Agent A (Final) / B | Patch comparison 标签 | 按表述；次要面板默认收起 | 文件头、行号、上下文、增删、复制、全屏；缺失文件版本空态 | 通过；Final 为保存的最后补丁，完整最终文件未记录 · [compare-patch.png](compare-patch.png) |
| C20 选中补丁与最终补丁来源 | Step comparison / Code Diff 与独立 Patch comparison | 选中后 | 当前步骤 vs last saved patch 明确区分 | 通过；含适用缺失态 · [compare-after.png](compare-after.png) |
| C21 独立 DAG、阶段带、Jaccard、CSV | Run DAGs / CSV 操作 | 按表述；次要面板默认收起 | 保留原 2–4 run 支持 | 通过；含适用缺失态 · [appearance-compare-fullscreen.png](../graph-appearance/appearance-compare-fullscreen.png) |

## Replay

| 原图位置 / ID | 当前入口与触发 | 默认可见性 | 数据来源与边界 | 结果 / 当前截图 |
| --- | --- | --- | --- | --- |
| R01 六阶段编号、名称、选择 | 单行阶段条常驻 | 主区或工具栏可见；证据随选择 | Plan / Tool Call / Failed Test / Code Edit / Re-run / Success 依据记录命名 | 通过；含适用缺失态 · [replay-before.png](replay-before.png) |
| R02 六预览、命令/计划/错误/diff/通过 | Previews，默认关闭 | 按表述；次要面板默认收起 | actual saved text / args / observation | 通过；含适用缺失态 · [replay-stages.png](replay-stages.png) |
| R03 Trajectory 标题、步数、步序线 | 左侧常驻 | 主区或工具栏可见；证据随选择 | source order；显示序号与精确 idx 分离 | 通过；含适用缺失态 · [replay-before.png](replay-before.png) |
| R04 每行类型、标题、摘要、时间、状态 | 整行选择、蓝灰选中 | 主区或工具栏可见；证据随选择 | 真实事件，缺消息/推理角色明确标注 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R05 搜索、失败/编辑/验证跳转 | 左侧过滤、轻量步骤操作 | 主区或工具栏可见；证据随选择 | 同一源选择；不合成失败原因 | 通过；含适用缺失态 · [replay-failure.png](replay-failure.png) |
| R06 中央步骤号、tool/type、相对时间/Δ | 中央常驻 | 主区或工具栏可见；证据随选择 | 时间差不是调用时长；无 ts 显示源步序 | 通过；含适用缺失态 · [missing-time.png](missing-time.png) |
| R07 描述、文件头、路径、增删数 | 中央常驻 | 主区或工具栏可见；证据随选择 | 源 thought、targets、patchStats | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R08 Diff 行号、上下文、符号、语法色 | 中央 Diff | 主区或工具栏可见；证据随选择 | 记录补丁，不推断未保存文件 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R09 Updated File | 中央标签 | 按表述；次要面板默认收起 | args.content / read excerpt；未记录空态 | 通过；已有保存文本和未记录版本均验证 · [missing-patch.png](missing-patch.png) |
| R10 File Context | 中央标签 | 按表述；次要面板默认收起 | 先前同文件的 saved read；定位原步骤 | 通过；含适用缺失态 · [replay-context.png](replay-context.png) |
| R11 复制、扩大 | 中央标签栏右侧 | 按表述；次要面板默认收起 | 当前标签的真实证据 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R12 工具输出、错误、最终文本 | 中央随选择切换 | 主区或工具栏可见；证据随选择 | command、observation、recorded text | 通过；含适用缺失态 · [replay-failure.png](replay-failure.png) |
| R13 Terminal / Tests | 主工作区下方全宽 Terminal/Tests；按需展开 | 按表述；次要面板默认收起 | 当前 observation；避免失败输出默认重复 | 通过；含适用缺失态 · [replay-context.png](replay-context.png) |
| R14 Step Details 开/关与焦点 | 顶部或 transport 面板按钮；默认关闭 | 按表述；次要面板默认收起 | 选择不变；Escape 和关闭恢复控制焦点 | 通过；含适用缺失态 · [replay-before.png](replay-before.png) |
| R15 Step ID / Type / Time / Status | 右侧打开后 | 选中后 | 精确索引与真实状态 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R16 Description / Edit Summary / Files Changed | 右侧打开后 | 选中后 | 可定位中央证据；红删绿增 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R17 Agent Reasoning / 引用 / 原始行 | 右侧记录文本与 Raw reference | 选中后 | v1 未分角色；逐段原文，不声称未记录的 reasoning | 通过；含适用缺失态 · [missing-patch.png](missing-patch.png) |
| R18 上一步/播放暂停/下一步/回到开头 | 底部常驻 | 主区或工具栏可见；证据随选择 | 同一条源序列 | 通过；含适用缺失态 · [replay-playback.png](replay-playback.png) |
| R19 已播/总时长、拖动条、步骤读数 | 底部常驻 | 主区或工具栏可见；证据随选择 | 时间点或步序，不是 wall_s 插值 | 通过；含适用缺失态 · [replay-after.png](replay-after.png) |
| R20 Speed、面板开关、全屏、播放结束 | 底部常驻 | 主区或工具栏可见；证据随选择 | speed 改变步进间隔；结束暂停；按钮状态可辨 | 通过；含适用缺失态 · [replay-playback.png](replay-playback.png) |

## 本轮追加验收

| 功能 | 复现 | 验收 / 证据 |
| --- | --- | --- |
| Graph/Timeline 单屏 | 两尺寸打开 Graph / Timeline；看 Inspector、底部活动或 Event Log | documentHeight = viewport；[Graph 1280](vertical-before-1280.png)、[Timeline 1280](timeline-1280.png) |
| Timeline 标签与密度 | 放大后横滚；缩小后点事件组并选择任一源 | 不重叠、标签遮挡正确、精确成员定位；[横滚](timeline-timeline-scrolled.png) |
| Timeline 全屏 | 选事件 → 全屏 → 前后切事件 | Inspector 同屏且位置正确；[1586](timeline-timeline-fullscreen.png)、[1280](timeline-timeline-fullscreen-1280.png) |
| 播放偏好 | 手选 Diff → 播放 60→70→80→90 | 无补丁区间保持 Diff 空态，随后显示第二个实际补丁；[Replay](playback-diff-updated.png)、[Graph](playback-inspector-diff-updated.png) |
| 自然滚动顶栏 | Replay/Compare/Analytics/Datasets 普通滚轮向下 | 静态顶栏离开；[Replay](replay-scrolled.png)、[Compare](compare-scrolled.png) |
| 真实长轨迹 | 本地 50-run 数据中最长三条；详见主报告私有复现命令 | 324/172/87 步、17 私有图；[脱敏断言](real-verification.json) |
| 离线与导出 | 打开根 HTML，阻断 HTTP；导出当前 SVG/PNG/CSV | 38 场景全部通过，离线无 HTTP / page error；[记录](verification.json) |
| Replay 末尾播放条避让 | 滚到文档底部，展开/收起 Terminal/Tests；两尺寸、本地及离线 | 模块完整位于 dock 上方至少 16px，按钮 hit-test 可点，选择/证据保持；[1586 收起](replay-scrolled.png)、[1586 展开](replay-terminal-expanded-1586.png)、[1280 收起](replay-scrolled-1280.png)、[1280 展开](replay-terminal-expanded-1280.png) |
