# 桌面截图目录

由 `node scripts/verify-three-page.mjs` 在真实 Chrome 中生成。每行链接本地及离线的同一状态；原始来源、尺寸、全页标志和 SHA-256 见 [capture-manifest.json](capture-manifest.json)。`fullPage=true` 的主区仍采用局部滚动；Run DAGs 补图为 viewport capture。除明确记录的 main scroll 外均从产品顶栏开始。

| 状态（本地 / 离线） | PNG 尺寸 | main scrollTop | 源步骤 idx | 截取 |
| --- | --- | --- | --- | --- |
| [graph-before.png](graph-before.png) / [offline](offline-graph-before.png) | 1586×912 | 0 | 未选中 | full page |
| [graph-after.png](graph-after.png) / [offline](offline-graph-after.png) | 1586×912 | 0 | 60 | full page |
| [compare-before.png](compare-before.png) / [offline](offline-compare-before.png) | 1586×912 | 0 | 未选中 | full page |
| [compare-after.png](compare-after.png) / [offline](offline-compare-after.png) | 1586×912 | 0 | 30 | full page |
| [replay-before.png](replay-before.png) / [offline](offline-replay-before.png) | 1586×912 | 0 | 10 | full page |
| [replay-after.png](replay-after.png) / [offline](offline-replay-after.png) | 1586×912 | 0 | 60 | full page |
| [graph-before-1280.png](graph-before-1280.png) / [offline](offline-graph-before-1280.png) | 1280×800 | 0 | 未选中 | full page |
| [graph-after-1280.png](graph-after-1280.png) / [offline](offline-graph-after-1280.png) | 1280×800 | 0 | 60 | full page |
| [compare-before-1280.png](compare-before-1280.png) / [offline](offline-compare-before-1280.png) | 1280×800 | 0 | 未选中 | full page |
| [compare-after-1280.png](compare-after-1280.png) / [offline](offline-compare-after-1280.png) | 1280×800 | 0 | 30 | full page |
| [replay-before-1280.png](replay-before-1280.png) / [offline](offline-replay-before-1280.png) | 1280×800 | 0 | 10 | full page |
| [replay-after-1280.png](replay-after-1280.png) / [offline](offline-replay-after-1280.png) | 1280×800 | 0 | 60 | full page |
| [graph-stages.png](graph-stages.png) / [offline](offline-graph-stages.png) | 1586×912 | 0 | 未选中 | full page |
| [graph-layers.png](graph-layers.png) / [offline](offline-graph-layers.png) | 1586×912 | 0 | 50 | full page |
| [graph-legend.png](graph-legend.png) / [offline](offline-graph-legend.png) | 1586×912 | 0 | 50 | full page |
| [graph-error.png](graph-error.png) / [offline](offline-graph-error.png) | 1586×912 | 0 | 50 | full page |
| [graph-context.png](graph-context.png) / [offline](offline-graph-context.png) | 1586×912 | 0 | 60 | full page |
| [graph-activity.png](graph-activity.png) / [offline](offline-graph-activity.png) | 1586×912 | 0 | 60 | full page |
| [graph-signatures.png](graph-signatures.png) / [offline](offline-graph-signatures.png) | 1586×912 | 0 | 50 | full page |
| [graph-files.png](graph-files.png) / [offline](offline-graph-files.png) | 1586×912 | 0 | 50 | full page |
| [graph-timeline.png](graph-timeline.png) / [offline](offline-graph-timeline.png) | 1586×912 | 0 | 60 | full page |
| [compare-matches.png](compare-matches.png) / [offline](offline-compare-matches.png) | 1586×912 | 0 | 60 | full page |
| [compare-selected-patch.png](compare-selected-patch.png) / [offline](offline-compare-selected-patch.png) | 1586×912 | 0 | 60 | full page |
| [compare-agent-a.png](compare-agent-a.png) / [offline](offline-compare-agent-a.png) | 1586×912 | 497 | 60 | full page |
| [compare-snapshots-a.png](compare-snapshots-a.png) / [offline](offline-compare-snapshots-a.png) | 1586×912 | 1100 | 60 | full page |
| [compare-agent-b.png](compare-agent-b.png) / [offline](offline-compare-agent-b.png) | 1586×912 | 497 | 60 | full page |
| [compare-snapshots-b.png](compare-snapshots-b.png) / [offline](offline-compare-snapshots-b.png) | 1586×912 | 1218 | 60 | full page |
| [compare-findings.png](compare-findings.png) / [offline](offline-compare-findings.png) | 1586×912 | 263 | 50 | full page |
| [compare-patch.png](compare-patch.png) / [offline](offline-compare-patch.png) | 1586×912 | 0 | 50 | full page |
| [compare-final-a.png](compare-final-a.png) / [offline](offline-compare-final-a.png) | 1586×912 | 0 | 50 | full page |
| [compare-final-b.png](compare-final-b.png) / [offline](offline-compare-final-b.png) | 1586×912 | 0 | 50 | full page |
| [compare-metrics.png](compare-metrics.png) / [offline](offline-compare-metrics.png) | 1586×912 | 0 | 50 | full page |
| [compare-charts.png](compare-charts.png) / [offline](offline-compare-charts.png) | 1586×912 | 222 | 50 | full page |
| [compare-dags.png](compare-dags.png) / [offline](offline-compare-dags.png) | 1586×912 | 0 | 50 | viewport |
| [replay-failure.png](replay-failure.png) / [offline](offline-replay-failure.png) | 1586×912 | 0 | 50 | full page |
| [replay-stages.png](replay-stages.png) / [offline](offline-replay-stages.png) | 1586×912 | 0 | 50 | full page |
| [replay-file.png](replay-file.png) / [offline](offline-replay-file.png) | 1586×912 | 0 | 60 | full page |
| [replay-details.png](replay-details.png) / [offline](offline-replay-details.png) | 1586×912 | 0 | 60 | full page |
| [replay-context.png](replay-context.png) / [offline](offline-replay-context.png) | 1586×912 | 0 | 60 | full page |
| [replay-validation.png](replay-validation.png) / [offline](offline-replay-validation.png) | 1586×912 | 0 | 100 | full page |
| [replay-playback.png](replay-playback.png) / [offline](offline-replay-playback.png) | 1586×912 | 0 | 20 | full page |
| [shared-search.png](shared-search.png) / [offline](offline-shared-search.png) | 1586×912 | 0 | 120 | full page |
| [shared-status.png](shared-status.png) / [offline](offline-shared-status.png) | 1586×912 | 0 | 120 | full page |
| [shared-dark.png](shared-dark.png) / [offline](offline-shared-dark.png) | 1586×912 | 0 | 120 | full page |
| [shared-help.png](shared-help.png) / [offline](offline-shared-help.png) | 1586×912 | 0 | 120 | full page |
| [shared-run-details.png](shared-run-details.png) / [offline](offline-shared-run-details.png) | 1586×912 | 0 | 120 | full page |
| [shared-actions.png](shared-actions.png) / [offline](offline-shared-actions.png) | 1586×912 | 0 | 120 | full page |
| [missing-patch.png](missing-patch.png) / [offline](offline-missing-patch.png) | 1586×912 | 0 | 31 | full page |
| [missing-time.png](missing-time.png) / [offline](offline-missing-time.png) | 1586×912 | 0 | 9007199254740993 | full page |

本地/离线 48/49 对截图逐字节一致；shared-status.png 因本地状态文本差异不同。离线上下文 HTTP 请求 0、pageerror 0。基础图同页前后使用相同数据、视口及 main.scrollTop=0，仅改变源选择与详情。
