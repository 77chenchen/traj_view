# Node silhouettes, fullscreen evidence and stable playback

The current [neutral vertical workspace report](neutral-vertical-workspace.md) is the design authority. The dark-canvas/graphite-navigation experiment was superseded by the user's white-canvas/top-navigation request before delivery.

Whole-node paths distinguish terminal windows, folded file reads, cut-corner edits, validation hexagons, plan capsules, recorded-text bubbles and beveled tool blocks. Merged source intervals use folders. Selection follows the silhouette, while failures keep an independent red outline and phase dots keep dataset meaning. Calls fit 164×48 boxes and collapsed sections 220×104 boxes; bottom/top ports match the vertical layout. The renderer is shared by live view, SVG and PNG.

Graph fullscreen includes source Inspector and related evidence. Compared Run DAGs keep Step comparison available in fullscreen. Full Diff can open an evidence surface inside fullscreen. Source identity survives entry, exit and branch collapse.

Replay starts in Auto. Choosing Diff, Updated File, File Context or Output pins that evidence type as actions play, step or seek. Inspector tabs, Terminal/Tests, output expansion and raw-reference disclosure remain stable too. Missing evidence shows its own empty state; it never carries a prior patch forward. Preferences live in the mounted run, without schema fields or promises to survive a page reload.

`fixtures/input/node-types.events.jsonl` is explicitly synthetic: seven categories, missing timestamps, a failure, two distinct recorded patches and later validation. `tests/e2e/node-appearance.mjs` verifies shape bounds, fullscreen failure → patch → validation, nested Full Diff, theme behavior and current-state export. `playback-preferences.mjs` actually plays source 60→70→80→90 in Replay and Graph, checks the missing interval and second patch, and asserts no step remount or refetch. Both tests also open the exact standalone HTML with networking disabled.

Current synthetic captures are in [graph-appearance/](graph-appearance/). Real captures stay in ignored `.workers/local/neutral-vertical-real-qa/`; the public report contains aggregate verification only. Reproduce with `node scripts/verify-node-appearance.mjs` after the standard build/export commands in the current report.
