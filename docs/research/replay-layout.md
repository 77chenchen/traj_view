# Replay 单屏工作台 · 2026-11-15

本次只调整 Replay 的布局与选中行取景，沿用既有浅色系统、顶部六项导航和 frozen v1。Graph / Timeline 的上一轮单屏行为不变。预览：<http://127.0.0.1:8765/#view=replay&run=dashboard-baseline&step=60>。

## 布局与层级

此前主工作区固定 760px，证据标签位于底端，Terminal 在整个工作区下面；1586×912 的页面实际高 1399px，固定播放条会横跨完整页面截图。现在桌面宽度 ≥1101px 使用屏幕余高：左侧源步骤、中央证据与 Terminal、按需右侧 Step details，下方为独立播放行。

| 模块 | 新位置与大小 | 行为与来源 |
| --- | --- | --- |
| 运行信息 / 阶段 | 紧凑头部与 44px 阶段条 | 元数据、快照、预览入口不变 |
| Trajectory | 左列 264px / 紧凑桌面 248px | 58px 最小行高；源 idx、错误、时间、搜索与分类保留；列表局部滚动；选择和缩放窗口后自动露出当前行 |
| 当前证据 | 中央占剩余宽度 | 步骤头下固定 Auto / Output / Diff / Updated File / File Context；代码保留行号、语法色、增删标记、复制及扩大 |
| Terminal / Tests | 中央第二行；收起 40px，展开约 26%、至少 112px | 当前源 observation；独立滚动；保持手选输出标签及展开状态 |
| Step details | 右列 320px / 300px，默认关闭 | 同一 Inspector 与精确源 idx；参数、记录文本、引用及注释按需阅读 |
| Playback | 独立 64px 最小底行 | 与工作台间隔 12px，距视口底 16px；播放、拖动、速度、详情与全屏沿用 |

1586×912：工作台 **1522×539px**；1280×800：**1232×427px**。两种尺寸的文档宽高均等于视口，没有页面级横纵溢出。打开详情后，1280px 中央仍约 **682px** 宽；长代码、日志与 Inspector 各自滚动。窄屏继续使用已有文档滚动、详情抽屉及固定播放条，不作为本轮重设计范围。

## 截图

全部为独立、完整浏览器 PNG；同尺寸前后使用相同公开合成 fixture、source #60、暂停及文档顶部。没有拼图。改前图较高，是原页面真实高度；播放条位于原视口底部是浏览器 full-page 截图行为。

| 状态 | 1586×912 | 1280×800 |
| --- | --- | --- |
| 改前：补丁、详情关闭 | [before](replay-layout/before-1586.png) | [before](replay-layout/before-1280.png) |
| 新版：补丁、详情关闭 | [after](replay-layout/after-1586.png) | [after](replay-layout/after-1280.png) |
| 新版：补丁与详情 | [patch](replay-layout/patch-details-1586.png) | [patch](replay-layout/patch-details-1280.png) |
| 失败重跑 #70 | [failure](replay-layout/failure-1586.png) | [failure](replay-layout/failure-1280.png) |
| 后续验证通过 #100 | [validation](replay-layout/validation-1586.png) | [validation](replay-layout/validation-1280.png) |

[capture-manifest.json](replay-layout/capture-manifest.json) 记录 10 张截图的尺寸、SHA-256 和嵌入来源；[captures.json](replay-layout/captures.json) 保存新布局的 URL、视口与几何。

## 验证与复现

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

- **81 Python tests passed（4.18s）**；TypeScript 通过；构建通过（7.98s）。既有 bundle warning 保留。
- **38 Chrome scenarios passed**，包含本地和断网单文件 HTML。结果存于 [verification.json](replay-layout/verification.json)。精确交付报告零 HTTP 请求、零页面错误。
- `workbench.mjs` 验证 #50 失败 → #60 修改 → #70 仍失败 → #100 通过、真实命令/补丁/滑块/详情同步、筛选恢复、长日志、空数据及缩放后的当前行可见。
- `document-workspace.mjs` 验证 1586×912 / 1280×800 单屏、标签在代码上方、Terminal 与证据同列同宽、输出开关两态均不遮播放。`playback-preferences.mjs` 保持 Diff、Context、Output、Inspector 标签和挂载区域，覆盖缺补丁间隔。
- DAG/Timeline 回归：909 次拓扑排序、1,908 scopes / 3,161 source paths / 5,189 routes、61 inline states / 1,735 routes、126 时间线布局通过。500 / 2,000 源步骤 Overview 首绘 **97.1 / 130.3ms**（三节点、app load 后 click→SVG→下一帧，非完整节点渲染；[原始结果](replay-layout/first-render.json)）。

视觉复查打开了全部 10 张 PNG：主次顺序为中央证据 → 当前源 → 按需详情，两个桌面尺寸下控件均可达，分隔线连续。没有新增图像资产或改变产品视觉系统。单次 layout detector 返回 `[]`；未重复运行。历史 Taste 营销页面 gate 仍为 OPEN，不代表本次工作台测试结果。

数据限制不变：没有记录的补丁、完整文件版本、独立推理角色、调用时长或费用不能补造。手选 Diff 后遇到没有补丁的 action 会显示缺失态。打开阶段预览会使用更多垂直空间，可通过 Previews 关闭或扩大证据局部阅读。
