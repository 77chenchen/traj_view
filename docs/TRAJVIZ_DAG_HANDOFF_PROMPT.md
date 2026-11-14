# TrajViz 续作 Prompt · 用 DAG 分析 Agent Trace

接手现有 TrajViz 仓库，在当前工作树实现下一版可视化并完成验证。当前已验证基线为 `8e15cb4`。本机工作目录是 `/Users/wangqichen/Documents/ChatGPT/traj`。先读 `AGENTS.md`、`README.md`、`docs/SCHEMA.md` 和 `docs/VERIFICATION.md`，再检查 `RunGraph.tsx`、`Compare.tsx`、`GraphView.tsx`、`Inspector.tsx`、`layout.ts` 和 `graphData.ts`。沿用项目的 React/Vite、CLI 和冻结的 v1 schema。遇到数据缺口时，在交付说明里写明缺失字段和对体验的影响。

## 参考方向

看参考项目的 **Agentic Traces** 视图。借鉴它把对话、推理、工具活动和文件触达组织在同一分析界面的方式，以及搜索定位、跨 run 突出显示和长轨迹压缩。TrajViz 的单 run 和多 run 主图统一使用从左到右的有向无环图（DAG）。泳道式的信息组织用于图旁的概览、筛选和详情。若复用上游代码，保留其 Apache-2.0 声明并注明来源。[PAIR-code/agent-trace-vis](https://github.com/PAIR-code/agent-trace-vis#agentic-traces)

## 实现目标

1. **单 run DAG**。以现有 `expanded` 图为基础，一步一个节点，按源步骤顺序稳定布局。显示 phase、工具类别和错误状态。区分顺序边、依赖边和重试边，沿用边开关。点击节点联动 Inspector 和回放位置，按需加载已记录的消息、思考、调用参数、观察结果和原始行引用。图旁显示可确认的文件触达，支持按路径定位相关步骤。文件和推理信息以现有记录为准，缺失时显示未记录。
2. **长轨迹压缩**。沿用连续同签名步骤的折叠语义。每个折叠块对应连续区间，显示源步数，可展开并定位任一成员。压缩后的跨块边保持向前，块内边保留在成员明细中。普通、折叠和过滤状态下的显示图均可拓扑排序，边的端点均存在。非连续重复动作分别保留在各自的时序位置。现有 `aggregated` 数据继续提供签名频次和循环指标，并以摘要展示。
3. **同任务对比**。沿用同一 `task_id` 的 2–4 run 选择。将现有并排聚合图改为各 run 的 DAG，统一方向、视觉编码与步序读法。保留指标、阶段带和 Jaccard。标出相对于基准 run 的 first divergence，保留当前按动作序列定义的分歧位置与两侧源索引。选中一个节点时，在其他 run 高亮相同的归一化签名。重复签名保留各自的节点和位置。
4. **交互与导出**。沿用图的缩放、平移、节点搜索、键盘与明暗主题能力。优先沿用现有布局和渲染逻辑。大图回退布局仍应清楚呈现边方向。PNG/SVG 与当前 DAG 状态一致，单文件 HTML 离线可打开新版 DAG 和 Inspector。现有目录筛选、CSV 和 Sankey 继续可用。

## 验收

- 用合成日志覆盖重复签名、重试边和依赖边、缺失时间戳、非连续及超大源索引。对普通、折叠和过滤后的显示图检查拓扑排序，验证展开前后的步骤映射。
- 在 Chrome 验证单 run 的文件定位、Inspector、播放及折叠展开。用同任务三条 run 验证首分歧、签名联动和独立的 DAG。保留可复现截图与测试结果。
- 沿用现有首绘口径测量 500 和 2,000 步，500 步目标低于 3 秒。验证 2,000 步仍能缩放、筛选及打开详情。用离线浏览器打开新生成的 HTML，检查 DAG、详情和网络请求。
- 用 `fixtures/input` 作为可提交的验证数据。真实日志与凭证只在获准的本地验证环境使用。

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

完成后给出实际改动、DAG 语义、运行方式、测试与首绘数字、截图或报告路径，以及仍有影响的限制。同步更新相关文档与浏览器测试。最终回报控制在 300 字以内。
