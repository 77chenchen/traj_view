# TrajViz dashboard revision · 2026-11-12

This report records the earlier rail layout. The current requested top-navigation debugging workspace and its fresh evidence are documented in [workbench verification](workbench-verification.md).

The four supplied Agent Lab demo images informed the navy navigation, compact run summaries, three-pane replay, recorded code/terminal, Inspector and category Timeline. TrajViz keeps its name and existing left-to-right DAG, CLI, frozen v1 schema and offline exporter. No reference-project code, screenshot assets or copy was imported.

## Working views

- **Trajectory replay:** search recorded event contents/paths, filter errors/categories, select an exact source step, inspect a recorded patch or file excerpt, review the current observation and nearest prior recorded error, and play at 0.5/1/2/4×. Personal annotations are browser-local and export as JSON. They do not alter source evidence.
- **Execution graph:** source-ordered step DAG and nested phase/loop/iteration/call hierarchy. Continuous repeats contract only within their chronological interval. Temporal, dependency, retry and structural links remain distinct. Structural links are containment; dependency links retain existing file/observation heuristics. Internal block links remain in Inspector. Selection transfers to Replay/Timeline by exact index, including integers above 2^53.
- **Execution timeline:** category lanes for recorded text, tool calls, explicit file targets and errors. Timestamp points require complete parseable nondecreasing timestamps; otherwise the axis is step position. Zoom and event/table selection open the same Inspector. The lanes imply neither parallel execution nor subagents.
- **Compare:** independent DAGs for 2–4 same-task runs, baseline first divergence with action offset and both source indices, repeated-signature highlighting, phase bands and Jaccard. New action-offset alignment preserves repeated occurrences and ended sequences; summary bars use recorded steps/duration/tokens. This is ordinal alignment, not a semantic matching algorithm.

## Verification

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/verify-dashboard.mjs
```

Python: **78 passed**. TypeScript/build passed. **708** topological sorts cover ordinary, contracted, expanded and filtered graphs with endpoint/source-mapping invariants. **18 Chrome scenarios passed**, including new Replay/Timeline, three-run alignment, live camera preservation, DAG exports, large traces and offline reports. The exact delivered single file additionally passed all new dashboard interactions with **zero HTTP requests and zero uncaught errors**. Captures cover 320/390/768/1024/1440px and dark theme. Malformed scroll/stitching captures were rejected and replaced using fresh pages, document-top positioning and settled frames.

Chrome 157.0.8103.52, Apple M3; first graph paint, one local sample per size:

| Steps | Paint | Definition |
| ---: | ---: | --- |
| 500 | 97.0 ms | Run click → visible SVG node → next animation frame |
| 2,000 | 112.4 ms | Same; zoom/filter/last-step Inspector also checked |

Initial navigation/bundle load is excluded. These numbers are not percentile estimates. Production JS: **2,352.50 kB / 730.20 kB gzip**; the existing Vite bundle-size warning remains.

## Open locally and evidence

`trajviz serve out` opens http://127.0.0.1:8765. Choose `dashboard-baseline`, then Trajectory replay; compare the three `dashboard-*` runs for the alternative/ended-sequence examples. Open root `trajviz-report.html` directly for the same features offline. The delivered dataset contains **14 synthetic runs**. Real captures remain under ignored `.workers/local/`; the authorized local live service is http://127.0.0.1:8766.

The reproducible source is `fixtures/input/dashboard-*.events.jsonl`; browser interactions are in `tests/e2e/dashboard.mjs`. Local complete evidence is `test-results/e2e/` and `test-results/dashboard-delivery/`. Stable screenshots and machine-readable results are copied to [dashboard/](dashboard/). [Independent review](dashboard/review.md), [detector](dashboard/detector.json) and [Taste gate findings](dashboard/taste-gate.txt) are recorded separately; no marketing-style gate pass is claimed.

| View | Evidence |
| --- | --- |
| Replay / mobile | [Desktop](dashboard/replay.png) · [390px](dashboard/replay-mobile.png) |
| Timeline / comparison | [Timeline](dashboard/timeline.png) · [Three runs](dashboard/compare.png) |
| DAG / hierarchy | [DAG Inspector](dashboard/graph.png) · [Mobile hierarchy](dashboard/hierarchy-mobile.png) |
| Theme / touch | [Dark](dashboard/dark.png) · [Catalog targets](dashboard/catalog-mobile.png) |
| Results | [Scenarios](dashboard/scenarios.json) · [Paint](dashboard/first-render.json) · [Offline](dashboard/offline-verification.json) |

The independent reviewer scored all three requested fixes **resolved**: persistent replay dock and list-local scrolling, documented direction/quality bar, and distinct 44px mobile catalog actions (including successful outer-label clicks). Its scoped disposition is **ship**. The separate Taste gate is **GATE: FAIL 32 (round 2 of 3)**, with no waivers or pass claim. Remaining findings include marketing hero/whole-screen section/decorative-moment prescriptions that conflict with the supplied dashboard layout, visible-label/static-focus assumptions and intentional horizontal catalog scrolling. The full finding list is preserved, rather than hidden or used to replace the requested operating interface.

Replay and theme captures of the delivered file use its 14 public fixture runs. Smoke screenshots additionally include four generated performance/precision fixtures (18 runs); all content is synthetic. The [provenance manifest](dashboard/provenance.json) identifies each capture's local test source. No photographic or generated illustration assets ship.

## Data limits

v1 has no cost, per-call duration, call-parent/subagent topology, separate reasoning role or full filesystem snapshots. Missing fields stay unrecorded. Patch extraction accepts explicit patch-like arguments/commands; unsupported edit shapes retain their complete original arguments in Inspector. Displayed code line numbers refer to the excerpt, not inferred file coordinates. A read observation is an excerpt, not a verified file snapshot. File targets identify attempted explicit targets, not confirmed successful IO. Notes depend on browser storage, can be exported when storage is unavailable, and are not included automatically in HTML dataset exports. Dynamic live steps appear after completed source events. Actual NL2Repo execution counts and gateway limits are in [the capture report](nl2repo-capture.md).
