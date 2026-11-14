# Four-reference operating surface

FORM: seed: none (pinned). User pins “深色界面为默认展示”, the topbar + left rail, and the four exact page compositions in docs/TRAJVIZ_FOUR_REFERENCE_DESIGN_PROMPT.md. References: docs/design-references/trajectory-viewer/01-compare.png through 04-replay.png. All full images and 20 regional crops were inspected before implementation.

OWN-WORLD: a navy, purple-accented trace debugging workspace. Product topbar and left navigation provide stable location; the main page provides a run/task context band, stage evidence and one dominant analytical workspace; the right inspector provides exact source evidence and related records. Controls use one stroked SVG icon system. No screenshot is embedded as interface content.

LAYOUT: Compare seven compact metrics over A / alignment+patch / B / findings+charts. Graph six phase previews over DAG+activity and a spanning Inspector. Timeline five stage previews over six lanes+event log and Inspector. Replay six previews over trajectory / selected evidence / details, with a full-width playback footer. At narrow widths panels reflow or become accessible drawers.

TRUTH: only frozen v1 and derived view data. Complete file versions, per-call durations, per-step agents, cost and test pass rates remain unrecorded. Timestamp points must not masquerade as durations; no-time datasets use source ordinal. Graph remains a forward DAG with existing heuristic dependencies and retries. Comparison matches normalized actions and retains exact first divergence and repeated positions. Synthetic fixtures remain explicitly labeled.

QUALITY: verify every item in four-reference-checklist.md against actual React renders. Required 1586 product captures, 1280 and 390; real four-page operation chains, offline zero HTTP, current graph exports, all regression checks. Independent finish review follows valid captures. User-pinned panels/purple/compact system type override optional skill marketing defaults.
