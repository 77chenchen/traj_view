# Four-reference TrajViz verification · 2026-11-13

This is the current dark navy/purple redesign, based on all four supplied 1586×992 references. It supersedes the earlier dashboard and pale workbench reports. Existing changes were preserved in the current working tree; no schema replacement, reset or commit was performed. All delivered datasets and screenshots use `fixtures/input` synthetic records. Private trajectories and credentials were not included.

## Run and reproduce

```sh
cd /Users/wangqichen/Documents/ChatGPT/traj
source .venv/bin/activate
python -m backend.cli serve out --port 8765
```

Open [Replay at the recorded patch](http://127.0.0.1:8765/#view=replay&run=dashboard-baseline&step=60), [Timeline failure](http://127.0.0.1:8765/#view=timeline&run=dashboard-baseline&step=50), [Graph](http://127.0.0.1:8765/#view=graph&run=dashboard-baseline&step=60), or [Compare](http://127.0.0.1:8765/#view=compare&run=dashboard-baseline&step=60&compare=dashboard-short&compare=dashboard-baseline). `trajviz-report.html` in the repository root is the regenerated single-file offline entry.

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/verify-four-reference.mjs
```

The standalone verification expects the public server at port 8765 (override `TRAJVIZ_URL` if needed). Smoke creates its own temporary server and synthetic stress inputs. Chrome defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; set `CHROME_PATH` on another machine.

## Implemented surfaces

The shared product bar, breadcrumb, local search/⌘K, status, help, theme/avatar, left navigation and dataset/run context appear across all four views. Exact run/source selection survives view changes and shareable hash links. A view or run change returns the workspace to its header; selecting another source does not reset the user's scroll.

Replay has six evidence snapshots, trajectory rows, recorded Diff/file/text/command evidence above Terminal/Tests, Step Details and a full-width transport. Direct failure links show commands and errors centrally. Seek, play/pause/end, stepping, speed and inspector controls operate on original source order. File Context attributes the earlier recorded read and can jump to it. Files and recorded quotations link back to their evidence; personal annotations stay local.

Timeline has five snapshots, six fixed evidence lanes, stage bands and Event Log filters linked to Event Inspector. Presets and zoom scale ticks, grids, event positions and widths together. Completion is neutral; green Validation Passed requires a saved zero-exit validation without error. Reasoning is visibly qualified as recorded text. Shared snapshots use Recorded Text, Tool Failure and File Edit when specific planning/test/patch roles are not supported. Graph adds phase previews, evidence layers, vertical camera controls with a separate gutter, activity points and a spanning Node Inspector with source relations. Steps/Hierarchy, loop/iteration/member expansion, edge switches and PNG/SVG remain available.

Compare uses same-task A/B selectors, seven metric summaries, A / alignment+patch / B / findings+six charts, plus the existing independent 2–4-run DAGs, phase bands, Jaccard and full metrics. Selecting a normalized signature highlights all repeated occurrences without merging their positions. The primary insertion/deletion alignment is explicitly separate from the original first action divergence.

Detailed visual/interaction/source mapping and per-item adaptations are in [the 47-item checklist](four-reference-checklist.md). No supplied screenshot is embedded as an application component, and no upstream code/assets were copied.

## Validation results

The Python suite passed **80 tests in 3.41s**; TypeScript and production build passed. **22 Chrome scenarios passed** in Chrome 157.0.8103.52. The exact delivered report passed all four operation chains with **zero HTTP requests and zero uncaught page errors**. The narrow Graph inspector received a screenshot-driven height correction and geometry assertion, included in the final passing suite. Vite retains its large-bundle warning (about 2,401.20 kB JS / 744.56 kB gzip and 93.36 kB CSS / 18.57 kB gzip).

| Source steps | First graph paint | Measurement |
| ---: | ---: | --- |
| 500 | **81.0ms** | Fresh context, run click → visible SVG node → next animation frame |
| 2,000 | **101.0ms** | Same metric; zoom, empty filter/recovery and final-step details also checked |

These are single samples on the local Apple M3, not percentiles. Initial app navigation and bundle download are excluded. `first-render.json` and screenshots preserve the raw values; the 500-step target is 3 seconds.

The 746 pure DAG checks cover ordinary, folded, partially/fully expanded, filtered and hierarchical projections: Kahn sorting, endpoint presence, strictly forward cross-block edges, exact interval/member mapping, retries/dependencies, gaps and source indices beyond 2^53. Nonconsecutive repetitions stay in separate temporal positions. Aggregated cycles/frequencies remain summaries.

Four complete browser chains run both online and offline:

1. Replay source #50 failure → #60 patch → #70 failed rerun → #100 passing output; direct-link central evidence, tab switching, seek/speed/play and shared source state.
2. Graph layers → zoom/fit → node search → Context files/messages/upstream jump → previous/next/activity → hierarchy/fullscreen. Mobile loop expansion verifies that controls do not cover the SVG.
3. Timeline 1m/2m/5m and Fit/zoom → failed-event filtering → log row → synchronized snapshot/lane/Inspector, plus missing timestamps and exact index `9007199254740993`.
4. Compare change A/B → first divergence → repeated-signature linkage → patch modes → add a third independent DAG, preserving Jaccard and metrics.

The suite also checks global search/help/share, actual downloadable HTML, mobile inspection, empty filters, long evidence and a generated zero-step run. The `role-boundaries` fixture verifies generic text, non-test failure, edit without patch, and final message without passed validation; the exact-index DAG final message also remains neutral while its real successful validation stays green. These assertions run online and offline. Desktop geometry assertions retain 1440×900 and 1280×800 list/evidence/Inspector/transport visibility. Four-view captures include 1586×912 (992 minus browser chrome), 1586×992, 1280×800 and 390×844. Capture validity is checked after settling motion; main and local scroll positions are explicit.

## Screenshot index

| Page | Product area | 1280 desktop | 390 narrow |
| --- | --- | --- | --- |
| Compare | [1586](four-reference/compare-1586x912.png) | [1280](four-reference/compare-1280x800.png) | [390](four-reference/compare-390x844.png) |
| Graph | [1586](four-reference/graph-1586x912.png) | [1280](four-reference/graph-1280x800.png) | [390](four-reference/graph-390x844.png) |
| Timeline | [1586](four-reference/timeline-1586x912.png) | [1280](four-reference/timeline-1280x800.png) | [390](four-reference/timeline-390x844.png) |
| Replay | [1586](four-reference/replay-1586x912.png) | [1280](four-reference/replay-1280x800.png) | [390](four-reference/replay-390x844.png) |

The same directory contains 1586×992 captures, failure evidence, missing-data capture, mobile trajectories/alignment/charts/inspection and online/offline role-boundary captures. All 37 archived PNGs were reopened after this build to confirm their named view/state; required viewport dimensions were also checked. [The capture manifest](four-reference/capture-manifest.json) records screenshot, current bundle and exact HTML hashes. [Check results](four-reference/checks.json), [browser scenarios](four-reference/scenarios.json), [exact-report verification](four-reference/verification.json) and the independent review preserve the evidence. Raw artifacts remain under `test-results/four-reference/` and `test-results/e2e/`.

## Data and fidelity limits

- v1 has no independent per-step agent identity/parent topology, call duration or attempt count. Graph does not fabricate the reference's Planner/Researcher/Coder/Tester branches. Agents is disabled with a reason; activity shows real event points and active time remains unrecorded. Dependencies retain existing file/observation heuristics; hierarchy edges mean containment, not causation.
- Missing/incomplete/nonmonotonic timestamps use source ordinals. Recorded timestamps are points; phase bands and visual marker width do not imply elapsed call durations. Replay delta is only the gap between adjacent recorded timestamps.
- `thought` does not distinguish message and reasoning roles. Reasoning/Analysis preserves recorded text and states that limitation. No inferred root-cause paragraph replaces missing analysis.
- Complete file versions, cost and test pass rate are absent. Updated/Final File modes retain explicit missing states; saved patch arguments and read excerpts are available. Diff hunk coordinates are used only when present, otherwise gutters are excerpt indices. File targets are attempted touches, not independently verified writes.
- Primary A/B alignment uses exact normalized action-signature LCS up to 250,000 cells, with deterministic B-insertion tie breaking and disclosed ordinal fallback. Rejoined describes signature alignment after an extra action. First divergence still uses the original zero-based action offset and two exact source indices. Equal signatures do not imply equal output or task correctness.
- Six Graph/Replay snapshots preserve source-evidence positions, not six guaranteed phases. Generic text/failure/edit records receive neutral labels; specific test/patch wording requires supporting source evidence. Missing roles preserve their slots. Three/four runs retain independent DAGs below the A/B composition. On narrow screens the same regions stack and scroll; the inspector is an optional accessible panel.

The earlier real NL2Repo capture is a separate local dataset: its 2026-11-12 checkpoint records 50 attempted tasks, 30 with tool evidence and one successful turn, with provider 429s stopping the supervisor. See [the capture report](nl2repo-capture.md). These counts are not 50 completed trajectories or benchmark pass results; the public UI verification uses 15 synthetic runs, including the explicit source-role boundary fixture.

## Design tooling and review

The requested [Taste](https://github.com/Leonxlnx/taste-skill) and [Impeccable](https://github.com/pbakaus/impeccable) skills were applied within the pinned operating-interface brief. Impeccable context loading failed in the inherited session and direct project context was used, as previously disclosed. The current file detector ran once and returned `[]` (no primary findings); its JSON is included. No comp-generation/build-phase fidelity gate ran: this is a code-led Operate surface with user-provided reference images.

Taste returned **`GATE: OFF (no build active)`**; the exact output is in [taste-gate.txt](four-reference/taste-gate.txt). No fresh Taste browser gate ran and this is not a pass. No waivers were added, and historical Taste/workbench verdicts do not certify this redesign.

The independent [full review](four-reference/review.md) validated the original 26 required captures and found two material source-truth corrections: F1 completion versus success, and F2 unsupported role labels. Both were applied in one batch, rebuilt, recaptured over the same files and rechecked online/offline. The same reviewer returned **`disposition: ship`** in [the verdict pass](four-reference/verdict.md), scoring **F1 resolved / F2 resolved**. That verdict scores these two fixes only; the original review remains the record of the wider visual/functional assessment. No second detector or further independent defect hunt ran. The current design tokens and four-page interaction rules are recorded in `DESIGN.md` and `.impeccable/design.json`.
