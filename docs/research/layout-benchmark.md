# Layout evaluation

- **官方** 两者均可破环。ELK 可选正交路由，Dagre 2.5 仅回写节点坐标。 [ELK](https://github.com/cytoscape/cytoscape.js-elk#api) · [Dagre](https://github.com/cytoscape/cytoscape.js-dagre/blob/v2.5.0/src/layout.js)
- **实测** 锁定依赖齐全。合成环保留边向，固定 ID 序和 ELK 种子后坐标复现。500/2000 点无头布局中位数（ELK/Dagre）为 175/807、635/17746 ms，直线交叉 45/28、154/5，节点无重叠。增量 gzip 435/32 KiB。
- **偏差与回退** 原定大图用 Dagre，样本中 ELK 更快。建议按需加载 ELK，长链或超预算用时间＋ID 排序的 `preset`（2000 点已验）。缺应用入口，首绘未测。全程只读。 [Cytoscape](https://js.cytoscape.org/#layouts/preset)