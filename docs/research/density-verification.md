# 四页信息密度与层级调整 · 2026-11-14

已将四页改为「主工作区 → 辅助导航 → 按需详情」。沿用深藏蓝、紫色选择、实际轨迹和同一源步骤标识。当前本地入口：[Replay](http://127.0.0.1:8765/#view=replay&run=dashboard-baseline&step=60)。

## 各页变化与截图

| 页面 | 首屏重点 | 辅助信息入口 | 桌面截图 |
| --- | --- | --- | --- |
| Replay | 当前命令、输出或代码补丁；中央最宽 | 阶段 Previews；检查器参数、记录文本、观察、原始引用；可展开 Terminal/Tests | [新版](density/density-replay-1586.png) · [调整前](density/before-replay.png) |
| Timeline | 六条证据泳道与时间分布 | 可收起 Event Log；参数、分析、记录元数据按需展开 | [新版](density/density-timeline-1586.png) · [调整前](density/before-timeline.png) |
| Graph | 执行 DAG 画布 | Filters & layers、Legend、Playback & activity；详情/文件与活动/签名切换 | [新版](density/density-graph-1586.png) · [调整前](density/before-graph.png) |
| Compare | 两侧动作对齐、失败和首分歧 | Recorded patch、Metrics & findings、Run DAGs；源轨迹、快照和图表折叠 | [新版](density/density-compare-1586.png) · [调整前](density/before-compare.png) |

共享摘要保留 run、结果、任务和耗时；Run details 提供 agent、模型、日期、步数和数据集。页面说明与侧栏上下文改为展开入口。桌面证据正文、检查器和主要对齐行使用 12px，列表行约 52–56px；通过减少重复和划分任务降低密度。

同一 1586×912、同一公开 fixture 的实测：Replay 阶段导航 **108 → 40px**；中央证据 **644.4×363.2 → 739.8×417.5px**；Graph 画布高度 **180 → 470px**。数值来自 [调整前](density/before.json) 与 [新版几何记录](density/verification.json)。调整前的粗略按钮计数未排除所有裁切祖先，不用作密度指标。

| 宽度 | Replay | Timeline | Graph | Compare |
| --- | --- | --- | --- | --- |
| 1280×800 | [截图](density/density-replay-1280.png) | [截图](density/density-timeline-1280.png) | [截图](density/density-graph-1280.png) | [截图](density/density-compare-1280.png) |
| 390×844 | [截图](density/density-replay-390.png) | [截图](density/density-timeline-390.png) | [截图](density/density-graph-390.png) | [截图](density/density-compare-390.png) |

另有 [失败步骤](density/density-replay-failure.png)、[修改步骤](density/density-replay-edit.png)、[已展开的指标/图表详情](density/density-compare-metrics.png) 和 [三条独立 DAG](density/density-compare-dags.png)。指标详情截图记录滚动后的阅读位置；四页默认截图均从页面顶部截取。16 张新版公开截图及 4 张前态截图保存在独立目录，历史四图验收证据未覆盖。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| Python | **80 passed，4.30s** |
| TypeScript / Vite | 通过；最终 JS `index-Dt7rVERK.js`，CSS `style-DzQpKc-m.css` |
| DAG 变换 | **746** 项拓扑与源映射检查通过：普通、折叠、展开、过滤、重试/依赖及超大索引 |
| Chrome 157.0.8103.52 | **24/24** 场景通过；[完整结果](density/scenarios.json) |
| 精确根 HTML | 新导出的 `trajviz-report.html` 完成四页操作链；**0 HTTP、0 uncaught page errors** |
| 本地/离线视觉 | **16/16** 对 PNG 逐字节一致；[SHA-256 清单](density/capture-manifest.json) |
| 首绘 500 / 2,000 步 | **81.1ms / 89.4ms**；[原始记录](density/first-render.json) |

首绘沿用既有 click → 可见 SVG → 下一动画帧口径，**不含初次 bundle 加载**；为单次本地样本，非分位数。2,000 步仍验证缩放、空过滤与恢复、末步搜索及详情。公开数据为 15 个 synthetic runs；完整 smoke 额外生成 5 个压力/空数据/索引场景。

已实际走通并断言：

- Replay：#50 失败 → #60 补丁 → #70 仍失败 → #100 验证通过；列表、中央证据、Inspector、URL 与播放滑块一致。检查播放、拖动、倍速、快照预览、内容切换、局部长内容滚动和空轨迹。
- Timeline：1m/2m/5m、缩放与 Fit 同时改变刻度、栅格、节点位置与宽度；失败筛选后日志/泳道/快照/Inspector 联动。事件表列头在自动定位后保持可见；窄屏选中点自动进入横向视口。
- Graph：图层、边、折叠、层级、键盘/相机、PNG/SVG、文件定位、详情标签与上下文跳转；文件定位返回 Details；直播暂停/恢复、刷新失败保留旧图。
- Compare：更换同任务 run、首分歧、相同归一化签名联动、补丁三种视图、六行指标与图表、三条独立 DAG、阶段带和 Jaccard。保留源步骤位置和原始动作偏移的定义。
- 1440×900、1586×992 继续由既有四图/workbench 场景覆盖；新密度场景检查 1586×912、1280×800 和 390×844，无文档横向溢出。窄屏详情可关闭、回放可达。

## 复现

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

单独复现本次截图和精确离线文件检查：先运行 `python -m backend.cli serve out --port 8765`，另一个终端运行 `node scripts/verify-density.mjs`。结果在 `test-results/density/`。新测试为 `tests/e2e/density.mjs`，现有浏览器断言已适配新的披露入口。

## 数据边界与仍有影响的限制

v1 未记录的逐调用时长、attempts、逐步 agent、独立消息/推理角色、完整文件版本、成本和测试通过率仍显示未记录。Duration 空列移入 Recording details；缺失时间戳继续使用步序。未改变源顺序 DAG、连续区间折叠或依赖边的既有启发式语义。真实日志和凭证未用于本次公开验收。

Compare 在 1280px 和手机上允许主区纵向滚动；补充分析增加一次明确的标签切换或展开操作。窄屏图表和代码局部滚动。Vite 既有大包警告仍在：JS **2,404.89kB / gzip 745.41kB**，CSS **118.18kB / gzip 22.42kB**。新层级样式集中于 `density.css`，与既有 workbench 样式共同使用。

沿用 Taste 和 Impeccable 的精简、排版及 Operate 指引。Taste gate 的既有状态为 **OFF**，未声明新的 gate 通过或独立评审结论。设计决策见 [density-surface.md](density-surface.md)，共享规范已同步至 DESIGN.md、PRODUCT.md 和 README。
