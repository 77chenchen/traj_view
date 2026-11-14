# 三页桌面验收证据

[77 项功能对照、复现命令与数据限制](../three-page-hierarchy.md) · [截图目录](screenshots.md) · [机器结果](verification.json) · [捕获与源文件哈希](capture-manifest.json)

| 页面 | 1586×912 初始态 | 1586×912 选中／详情态 | 1280×800 初始态／详情态 |
| --- | --- | --- | --- |
| Graph | [before](graph-before.png) | [after](graph-after.png) | [before](graph-before-1280.png) / [after](graph-after-1280.png) |
| Compare | [before](compare-before.png) | [after](compare-after.png) | [before](compare-before-1280.png) / [after](compare-after-1280.png) |
| Replay | [before](replay-before.png) | [after](replay-after.png) | [before](replay-before-1280.png) / [after](replay-after-1280.png) |

截图来自真实 Chrome 与明确标注的合成 fixture。基础图均为独立全页 PNG，同页前后采用相同数据、视口和 main 滚动位置。按需披露状态及离线版本共 98 张；Run DAGs 补图采用视口捕获。每张截图的选择、尺寸、滚动位置、捕获类型及 SHA-256 均可回查。

审查记录：[首次取证重截](review-recapture.md)、[完整设计复核与三项修正](review.md)、[修正后结论](verdict.md)。

验证结果：[26 个浏览器场景](scenarios.json)、[500／2,000 步首绘](first-render.json)、[一次机械检查](impeccable-detect.json)、[发布前文件检查](publication-checks.json)。
