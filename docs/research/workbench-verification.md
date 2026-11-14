# Compact debug workbench · 2026-11-12

GATE: OPEN 34 (rounds used up). This is the separate Taste marketing-page gate, not the browser-test result. Its complete findings and warnings are preserved in [taste-gate.txt](workbench/taste-gate.txt); no waiver or gate pass is claimed. The user's pinned IDE layout takes precedence over hero, whole-screen marketing section, decorative-moment and `.wrap` prescriptions. Other findings include compact-control/touch sizes, static label/focus assumptions, source data text, pane dividers and intentional table overflow. The independent operating-interface review has disposition **ship** with no material fixes for this revision; [full five-section review](workbench/review.md).

## Implemented

- **One shell:** navy top navigation replaces the vertical rail and duplicate run-view navigation. Actual task/run facts, source outcome, duration, steps and tokens stay in one summary row. Missing cost stays unrecorded. Catalog metrics use a flat strip.
- **Replay:** continuous source-event, central-evidence and inspection panes share divider lines. The central Diff/file/text region sits above Terminal/Tests; code has excerpt line numbers, +/- diff signs and text-only lexical highlighting. Paths truncate with their full value in the title. Code and logs scroll locally. Current-step arguments/text collapse; output/error provenance and browser-local annotations remain available.
- **Failure investigation:** source #50 failed → #60 recorded patch → #70 failed rerun → #100 successful recorded validation. Next failure/edit/validation navigation clears incompatible list filters. Selection, command, patch, output, Inspector and slider use the same exact source index. These transitions show evidence, not inferred causal repair.
- **Playback:** full-width footer stays in the viewport. Play/pause, stepping, speed and seeking remain synchronized; playback scrolls only the event list. Below 1000px inspection is optional, and at 390px a short event list leaves the central evidence and transport usable.
- **Timeline:** category lanes are the primary workspace. Tick divisions use 1/2/5/10 intervals. Tick/grid positions, marker centers and marker widths scale together at 1×/2×/8×; Fit restores scale. Timestamp fallback uses true integer ordinals, including nonconsecutive indices beyond 2^53. Marker width is visual scaling, not call duration.
- **Graph and Compare:** existing forward DAG/hierarchy, filtering, expansion, lazy details, current-state PNG/SVG, theme, keyboard and file lookup remain. Graph inspection precedes auxiliary overview. Compare leads with compact actual metrics and 2–4 action-offset columns that mark failure, retry, different output and additional/ended actions; independent DAGs, first divergence, phase bands, Jaccard and full metrics follow.

[Surface responsibilities and quality bar](workbench-surface.md). Original palette/type roles remain in DESIGN.md and its synchronized sidecar. No upstream/reference code, screenshot assets, authentication example content or example statistics were imported.

## Reproduce and results

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/verify-dashboard.mjs
```

- Python **78 passed** (5.45 s). TypeScript and production build passed. Existing Vite bundle warning remains: **2,357.11 kB JS / 731.68 kB gzip**.
- **708** complete DAG topological checks; exact source mappings and existing endpoints retained.
- **20/20 Chrome scenarios passed**. Workbench tests assert pane bounds/alignment and evidence synchronization at **1440×900** and **1280×800**, filtered recovery navigation, 390px inspection, empty search, an **800-line** log/file excerpt, and a **zero-step** trace. Compare, Timeline geometry, live update, exports, theme, catalog, 2,000-step interaction and offline scenarios passed.
- Exact root `trajviz-report.html` independently passed the same workbench flow and new dashboard interactions in an offline Chrome context: **0 HTTP requests, 0 uncaught page errors**. Additional delivered-file views cover 320/768/1024px and dark theme.
- Chrome **157.0.8103.52**, Apple M3, one first-graph-paint sample each: **500 steps 102.0 ms; 2,000 steps 112.7 ms**. Existing definition: run click → visible SVG node → next animation frame; initial navigation/bundle load excluded. These are single samples, not percentile estimates. The 2,000-step graph also zoomed, filtered and opened the final source step.

Browser regressions are in `tests/e2e/workbench.mjs` and `dashboard.mjs`. An initial empty-state assertion incorrectly treated `slug-empty` as zero-step; that trace actually has two recorded steps. The check now uses a generated true zero-step trace. Rebuild/export is required before exact-file testing; final tests use the current BA_IdSvD bundle.

## Open and inspect

`trajviz serve out` serves http://127.0.0.1:8765. Open `dashboard-baseline`, choose Replay in the top bar, then Next failure → Next edit → Next validation. Open `trajviz-report.html` directly for the same offline workbench. Root output contains **14 public synthetic runs**; smoke tests add five temporary synthetic stress/precision runs (19 total). No real NL2Repo captures or credentials are included in this evidence.

| Evidence | Files |
| --- | --- |
| Replay first viewport | [1440×900](workbench/replay-1440.png) · [1280×800](workbench/replay-1280.png) |
| Failed/current command | [1440×900](workbench/failure-1440.png) · [1280×800](workbench/failure-1280.png) |
| Subsequent validation | [Successful result](workbench/validation-1280.png) |
| Edge cases | [390px](workbench/narrow.png) · [Long evidence](workbench/long-evidence.png) · [Zero steps](workbench/empty.png) |
| Other views | [Timeline](workbench/timeline.png) · [1×](workbench/timeline-1x.png) · [2×](workbench/timeline-2x.png) · [Compare](workbench/compare.png) · [Graph](workbench/graph.png) |
| Exact offline delivery | [1280px](workbench/offline-replay-1280.png) · [Results](workbench/offline-verification.json) |
| Automated records | [20 scenarios](workbench/scenarios.json) · [First paint](workbench/first-render.json) · [Detector](workbench/detector.json) · [Provenance](workbench/provenance.json) |

The Graph capture records the keyboard-pan test state; its first node crosses the canvas edge intentionally. Full local artifacts remain in `test-results/e2e/` and `test-results/dashboard-delivery/`.

## Limits

The frozen v1 schema has no cost, per-call duration, parent/subagent topology, distinct reasoning channel or filesystem snapshot. It cannot establish actual parallel execution. Graph dependencies retain the existing recorded-file/observation heuristics; structural edges mean containment. Explicit file targets indicate attempts, not confirmed IO. Diff numbers refer to the recorded excerpt. Syntax highlighting is lexical rather than a full language parser. Action-offset comparison is not semantic/edit-distance alignment. Missing evidence stays unrecorded. Local notes require browser storage or an explicit JSON export. The inherited production bundle warning and separate open Taste findings remain.
