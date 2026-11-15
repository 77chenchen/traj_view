# TrajViz end-to-end QA

The current suite has **38 Chrome scenarios**, **909 DAG sorts** and **126 pure Timeline layouts**, plus the execution/inline route matrices. Design scope is desktop **1586×912 and 1280×800**; retained narrow-screen cases are regressions. Graph, Timeline and Replay use single-screen workspaces; the other three pages scroll the document and its static 64px single-row navigation away. `document-workspace.mjs` verifies those dimensions, six accessible navigation tabs, visible final Timeline lane/Event Log, local graph-wheel clamping and source preservation. Replay assertions check top-mounted evidence tabs, center-column Terminal/Tests, separate playback layout and clearance in both output states. `workbench.mjs` also checks selected-row visibility after resize and the failure → patch → validation chain at 1440×900 / 1280×800. `neutral-vertical.mjs` checks vertical direction, white SVG, wheel/zoom, inline expansion and fullscreen evidence. `timeline-workspace.mjs` covers opaque sticky labels, non-overlapping semantic tokens, exact group-member selection and fullscreen Inspector. All run online and against a single-file report with networking blocked.

The Graph appearance and stable-playback checks are in `node-appearance.mjs` and `playback-preferences.mjs`, each exercised online and offline. They cover seven distinct whole-node paths plus merged folders, shared theme, 1586×912/1280×800 fullscreen Inspector, node clicks, failure/patch/validation, nested full Diff, selection after exit, SVG shape/color parity and in-place groups. Playback covers two different saved patches, a missing-patch interval, all pinned evidence views, Terminal/Tests, collapsed output, raw-reference disclosure, unchanged mounted panes and no trace refetch. Viewport resizing, including full-page browser capture, preserves requested Inspector visibility. See the [current report](../../docs/research/neutral-vertical-workspace.md) and [supplemental appearance report](../../docs/research/graph-appearance.md).

With the public fixture server running, each current standalone verifier opens both the server and exact delivered root HTML:

```sh
node scripts/verify-document-workspace.mjs
node scripts/verify-neutral-vertical.mjs
node scripts/verify-timeline-workspace.mjs
node scripts/verify-node-appearance.mjs
```

Results stay under `test-results/<scenario>/`. The primary public capture inventory contains 55 independent PNGs with dimensions, hashes and provenance; 11 supplemental appearance/playback PNGs are also public. Real NL2Repo verification uses `node scripts/verify-execution-map.mjs --appearance-only --output .workers/local/neutral-vertical-real-qa`; real data and captures remain ignored and local. Subsequent sections document retained historical coverage and scenario totals.

Run from the repository root after the CLI and viewer are integrated. Use the
installed Python and frontend dependencies.

```sh
python -m pytest tests/e2e
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/benchmark-layout.mjs
```

The browser smoke command builds the public fixtures and synthetic 500- and
2,000-step traces in a temporary directory. It starts the CLI server on a
loopback port assigned by the OS and launches system Chrome once. It opens the
portable export by file URL in a fresh offline context after stopping the
server. Browser screenshots, failure screenshots, and first-render timings
go to `test-results/e2e/`, with per-scenario results in `scenarios.json`. The smoke command first runs `scripts/test-graph-data.mjs` and `scripts/test-execution-map.mjs` on public fixtures and 500/2,000-step synthetic graphs. It also opens the exact delivered `trajviz-report.html` with the matching `out/` dataset in an offline context. The temporary inputs and build are removed at exit.

The long-Graph extension adds `execution-map.mjs` online/offline, bringing the suite to **28 scenarios**. The current inline tests open sections inside the same SVG, preserve all siblings, open nested and independent branches, click a header to collapse descendants, use Collapse last / Alt+↑ and Collapse all, and retain Inspector/source URL/focus. Browser geometry checks require unchanged zoom and <1.5px top-left anchor drift during expansion and collapse. Source search adds only its required path. SVG includes every current frontier node and enclosure. A clearly synthetic 96-step fixture covers patch/failure/retry/dependency evidence and indices beyond 2^53; 500/2,000-step cases retain filtering, zoom and exact-source details. The pure suite checks **1,908 scopes / 3,161 exact paths / 5,189 mixed-size routes**, **61 inline states / 1,735 forward routes**, plus filtering, full source coverage, edge-count rollup, containment, independent collapse and non-mutation. `node scripts/verify-execution-map.mjs --output .workers/local/inline-graph-qa` repeats inline navigation/camera/source/export checks on the longest three authorized real traces, 1280px and offline. Real images/JSON stay ignored and local. See [current evidence and reproduction](../../docs/research/inline-graph.md).

The current three-page desktop refinement adds `three-page.mjs` online and offline, for **26 scenarios** and **746 graph-transform checks**. It verifies Graph's unselected/selected canvas, compact stages, Layers/Legend/activity, Compare's shared A/B alignment and independent agent/findings/patch/metrics disclosures, Replay's closed/open Step details, exact source identity, focus restoration, playback/speed/seek, missing states and PNG/SVG/CSV exports. The current design capture sizes are **1586×912 and 1280×800**. Existing four-page and narrow-screen regression cases remain; earlier scenario totals below are historical.

With the public fixture server running, `node scripts/verify-three-page.mjs` checks the exact root HTML offline and writes `test-results/three-page/verification.json` plus independent screenshots. PNG dimensions are read from the file header and checked against the capture viewport. The six base pairs use full-page screenshots at scroll 0; the supplementary Run DAGs state uses a viewport screenshot because the grid scrolls within main. See [the functional mapping and report](../../docs/research/three-page-hierarchy.md) for every disclosure and source step. No private captures are used.

To verify the exact root HTML and served public fixtures separately:

```sh
node scripts/verify-density.mjs
```

This writes `test-results/density/verification.json` and `density-*.png`, including four default pages at each width and selected failure/edit, metrics and DAG states. The offline context blocks all HTTP and checks uncaught page errors. Published evidence is in `docs/research/density/`.

- Set `PYTHON` to select a Python executable. The default is `python`.
- Set `PLAYWRIGHT_PATH` to a Playwright package directory, entry file, or
  `node_modules` directory. The default lookup uses the project's
  `frontend/node_modules`, then `~/Documents/ChatGPT/traj/frontend/node_modules`.
- Set `CHROME_PATH` to override the default macOS Chrome executable at
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Set `RENDER_TIMEOUT_MS` to change the 30-second first-render timeout. Each
  sample uses a fresh page context and measures from the run click through the
  animation frame after the first visible SVG graph node appears. The large
  viewer graphs may use the time-order layout fallback.
- Adjust UI locators in `browser.mjs` if accessible labels or data attributes
  change. The graph uses `data-node` for visible drawing elements and a
  source-step number in the accessible node name.

The layout benchmark runs Cytoscape's ELK and Dagre adapters headlessly on a
chain with local forward dependencies and a cyclic graph with those
dependencies, reverse links, and self-loops. Each sample uses a fresh Node
process, a fixed insertion order, and a fixed ELK seed. Runtime covers
layout creation through `layoutstop`. A SHA-256 digest of the ordered node
coordinates checks repeatability. The report includes installed adapter
dependency sizes and incremental minified and gzip sizes over a Cytoscape-only
browser bundle built with esbuild.

```sh
node scripts/benchmark-layout.mjs --repeats 2 --timeout-ms 60000 --stack-size-kb 6144
```

The default is three samples per scenario with a 30-second process deadline
per sample. A timeout ends that scenario, records completed samples, and lets
the benchmark continue. Results with fewer than two completed samples have
unknown repeatability. `--stack-size-kb` applies to the sample processes and
can help diagnose Dagre recursion limits. Benchmark JSON files are written to
`test-results/`. Set `FRONTEND_NODE_MODULES` to use a different installed
dependency directory.

DAG browser coverage includes: monotonically increasing source-order y coordinates, exact large source indices, file-path lookup and timeline synchronization, per-block and full expansion, internal retry edges, filtered nonconsecutive repetitions, current-state SVG/PNG, keyboard pan, dark theme, three independent same-task DAGs, baseline divergence (including an ended side) and highlighting repeated signatures. The 2,000-step timing scenario additionally zooms, filters to an empty graph and back, searches the last step and opens its details. Both offline scenarios exercise files, DAG filtering/folding, Inspector and comparison with zero external requests.

To refresh the shipped dataset/report before verifying it:

```sh
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

Hierarchy/live scenarios additionally cover three levels, mobile keyboard expansion, clearing group inspection, relation navigation through active filters, progress-only SSE events, pause/resume and failed-refresh recovery. All checked-in evidence is synthetic. For private local captures use `node scripts/verify-live-capture.mjs --html .workers/local/nl2repo-50.html`; its output stays under `.workers/local/`.

Dashboard scenarios in `dashboard.mjs` cover event/path search, error filtering, recorded red/green patch, missing file content, personal notes and JSON export, speed-controlled replay, selection handoff to DAG/Timeline, timestamp points/fallback, three-run action alignment and exact indices beyond 2^53. The fixture set now includes three original synthetic session-regression traces; the graph transform matrix runs 708 sorts. The full smoke suite has 18 scenarios.

`node scripts/verify-dashboard.mjs` checks these new views in the exact delivered root HTML with the network disabled and asserts **zero HTTP requests and page errors**. It also captures dark theme and fresh-page 320/768/1024px views (full-page and viewport), plus corrected mobile hierarchy evidence. Outputs are in `test-results/dashboard-delivery/`. Capture at document top after blur and two animation frames; never treat repeated sticky-surface stitching as valid screenshot evidence.


The compact debug workbench adds `workbench.mjs`, exercised online and offline. It asserts that list, Diff, Terminal, Inspector and full-width playback share the first viewport at **1440×900** and **1280×800**, then follows failed source #50 → patch #60 → failed validation #70 → successful validation #100. It checks incompatible-filter recovery, actual command/patch/output/slider synchronization, lexical highlighting, empty search, optional 390px inspection, an 800-line synthetic log/file excerpt and a generated zero-step run. All code/log scrolling is local to its evidence pane. The complete smoke suite now has **20 scenarios**, with **19 temporary synthetic runs** (14 public + 5 generated); the delivered root dataset remains 14 public runs. Screenshots use `workbench-*.png`; exact standalone captures use `workbench-offline-*.png` in `test-results/dashboard-delivery/`.

Timeline regression checks assert actual browser geometry at 1×, 2× and 8×: marker centers match axis values, widths scale with zoom, every gridline matches its tick, Fit restores width, and mobile scrolling stays inside the view. The fallback integer ordinal tick test uses source index `9007199254740993`. Before treating a capture as final, rebuild and regenerate root HTML so its JavaScript includes the same source revision as the browser assertions.


The current four-reference revision adds `four-reference.mjs` online and offline, bringing the smoke suite to **22 scenarios**, with **20 temporary synthetic runs** (15 public + 5 generated). It covers Replay failure→patch→failed rerun→pass, timeline tick/point width scaling and three-way selection, graph layers/camera/context/hierarchy/activity/fullscreen, Compare run changes/divergence/signature links/patch tabs/three independent DAGs, local search/help/share/report download, all four pages at 1586×912, 1586×992, 1280×800 and 390×844, and exact missing-time indices. The public `role-boundaries` fixture verifies generic text, a non-test tool failure, an edit without a patch, and completion without a passed outcome. Real validation success remains green; final-message completion remains neutral. `scripts/verify-four-reference.mjs` repeats those chains against the served public dataset and exact delivered root HTML. Offline contexts assert zero HTTP requests and uncaught page errors. Existing workbench tests retain long-evidence and zero-step coverage.
