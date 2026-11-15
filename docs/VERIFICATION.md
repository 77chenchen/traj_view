# Verification

From the repository root with the existing virtual environment and installed frontend dependencies:

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

Set `CHROME_PATH` if Chrome is installed elsewhere. The smoke command runs pure graph-transform checks, builds the public fixtures plus generated performance traces, launches system Chrome, stops the server, then opens both a fresh single-file export and the delivered report in offline browser contexts. Screenshots, `scenarios.json` and `first-render.json` go to `test-results/e2e/`. See [browser QA](../tests/e2e/README.md) for details and report regeneration commands.

## Six-route colors and direct actions · 2026-11-15

The current pass keeps white continuous evidence while sharing blue terminal, teal read, amber edit, green validation and red failure colors and line icons across six routes. Failure/Edit/Validation jump actions, labeled Graph Fit/Locate, shorter Compare action labels, a separate Auto-follow indicator, shared-scale median marks and exact error-rate bars reduce reading overhead. Recording notes, missing attempts and the Timeline Reading guide remain discoverable disclosures. Recorded text is named consistently in the event log, Inspector, lane and category activity, without inferring a reasoning role.

`node scripts/verify-visual-affordances.mjs` verifies both desktop sizes and the exact delivered HTML with HTTP blocked. The new local/offline scenarios cover keyboard failure→edit→validation, pinned Diff, fullscreen, compact four-tab boundaries, missing attempts, Recorded text activity membership and source navigation, first divergence, themes and semantic contrast. Existing long/empty/narrow, PNG/SVG/CSV, source-DAG, collapse and playback checks remain in the complete **46-scenario** suite. The sampled semantic text/icon contrast minimum is **5.2346:1** (103 samples); standalone requests/page errors are **0 / 0**.

Final checks: **81 Python tests (4.62s)**, TypeScript, build (**7.66s**) and **46 / 46 Chrome scenarios passed**. First graph paint for 500 / 2,000 source steps is **96.9 / 131.1ms**, each drawing three Overview nodes after app load.

See [the six-route report and screenshot mapping](research/visual-affordances.md), [final test summary](research/visual-affordances/test-summary.json), [all Chrome results](research/visual-affordances/scenarios.json), [first-render samples and their scope](research/visual-affordances/first-render.json), [exact local/offline assertions](research/visual-affordances/verification.json) and [PNG manifest](research/visual-affordances/capture-manifest.json). Before screenshots use `2d4ab83`; after screenshots are independent full-page Chrome renders using only public synthetic fixtures. Initial failures, the targeted review correction and subsequent verification are disclosed in the report. The existing bundle-size warning remains; graph timing excludes initial bundle loading and starts with three Overview nodes.

## Analytics and discoverable Graph collapse · 2026-11-15

Analytics now leads with grouped outcome/step/error data and a flat summary. Named sections preserve two-layer phase flows, shared count scale, transition tables, review-signal run records, metric definitions and scoped CSV. Graph's toolbar keeps Collapse all visible in all detail modes and fullscreen; it returns to root Overview while keeping the original source call and pinned evidence visible in Inspector. See [function mapping, 21 independent full-page PNGs and reproduction](research/analytics-workspace.md).

Final checks: **81 Python tests (3.98s)**, TypeScript, build (**7.97s**) and **44 Chrome scenarios passed**. The new online/offline cases cover recomputed summaries, known zero versus unrecorded outcomes, metadata search, grouping/pagination, keyboard, CSV scope, review→run→Graph, zero-step data, both desktop sizes, exact large source `#10000000000000053`, same-SVG collapse and the selected patch. The exact root HTML also passes with **0 HTTP / 0 page errors**. Supplemental captures include empty data, inherited dark appearance and 390px overflow compatibility. The detector returned `[]`. Existing self/reverse Sankey links, graph exports, Timeline/Replay/Compare and playback-preference regressions remain green.

First graph paint for 500 / 2,000 source steps was **97.6 / 130.5ms**, each initially drawing three Overview nodes after the app loads (click → SVG → next frame, excluding initial bundle/all-node rendering). Existing large-bundle warnings remain. [Structured summary](research/analytics-workspace/test-summary.json), [all scenarios](research/analytics-workspace/scenarios.json), [specialist assertions](research/analytics-workspace/verification.json) and [timings](research/analytics-workspace/first-render.json) are preserved.

## Readable typography and coordinated palette · 2026-11-15

Desktop evidence now uses 15px locally bundled JetBrains Mono, 16px prose, 18px selected headings, 14px controls and subordinate 13px directory/source metadata. Graph and Timeline share muted category fills; diff, error and selection remain independent. Native interface fonts stay local. The font and OFL license travel inside the standalone HTML. See [the role scale, references, 14 full-page PNGs and reproduction](research/readable-typography.md).

Final verification: **81 Python tests (3.65s)**, TypeScript, build (**7.72s**) and **40 Chrome scenarios passed**. `node scripts/verify-readable-typography.mjs` checks all four views at 1586×912 / 1280×800, exact typography roles, actually loaded code fonts, no page-level horizontal overflow and **0 offline HTTP / 0 page errors**. Fullscreen keeps seven-node Fit, complete source identity, navigation focus, bounded activity, Inspector tabs, patches and missing-data states. The compact navigation and Timeline lane fixes preserve expansion anchors and complete lane visibility. [Structured results](research/readable-typography/test-summary.json) include the initial failures and final rerun.

First graph paint: **500 steps 96.7ms / 2,000 steps 130.2ms**, each initially drawing 3 Overview nodes after app load; bundle loading and all-source rendering are excluded. Existing pure checks pass (909 DAG sorts, 1,908 execution scopes / 3,161 paths / 5,189 routes, 61 inline states / 1,735 routes, 126 Timeline layouts). The existing 2,443.44kB JavaScript warning remains; inlining the 92KB font brings CSS to 300.31kB / 126.99kB gzip. Prior sections below retain their original revision-specific numbers.

## Graph fullscreen workspace · 2026-11-15

Desktop fullscreen now has a 52px run/current-source header, a white bordered canvas and a 350px/330px Inspector. Primary Graph selection is blue; workspace/evidence tabs are pale blue. Playback stays visible above the compact Agent activity disclosure. Fit measures the actual SVG with safe margins; complete source bounds drive selection visibility. Long traces keep readable scale, exact large indices and in-place expansion; exiting Graph or its Timeline restores current-source focus. Long Inspector content scrolls within the viewport, and missing Code Diff remains accessible with View Full Diff disabled. See [the full comparison, function mapping, reproduction and 14 synthetic PNGs](research/graph-fullscreen.md).

Final results: **81 Python tests (3.89s)**, TypeScript/build (**7.35s**) and **40 Chrome scenarios passed**. Public fixture QA covers 1586×912 and 1280×800, all seven `dag-baseline` nodes after Fit, Final Answer, missing/recorded patches, Layers/Legend/help/search, two sidebar levels, failure/context navigation, activity/Playback, long-source resize, theme contrast, PNG/SVG and exact-source focus. Typography checks include natural SVG label bounds, 13px code, readable metadata and both tab rows; four paired captures and computed values are in [graph-typography.md](research/graph-typography.md). The exact delivered HTML was also opened with HTTP blocked: **0 HTTP requests / 0 page errors**. Full ordinary Graph, Timeline, Compare, Replay, catalog/CSV/Sankey and pinned-view playback regressions pass.

Pure checks retain **909 DAG sorts**, **1,908 execution scopes / 3,161 exact paths / 5,189 routes**, **61 inline states / 1,735 routes** and **126 Timeline layouts**. First graph paint for **500 / 2,000 source steps: 95.2 / 129.9ms**, each drawing three Overview nodes after app load (click → visible SVG → following frame, excluding initial bundle load and full-source rendering). The existing large-bundle warning remains (2,443.09kB JS / 757.71kB gzip). [Structured results](research/graph-fullscreen/test-summary.json), [all scenarios](research/graph-fullscreen/scenarios.json), [raw timings](research/graph-fullscreen/first-render.json), [fullscreen assertions](research/graph-fullscreen/verification.json) and [PNG manifest](research/graph-fullscreen/capture-manifest.json) are preserved. Intermediate 12s wait failures and the successful final rerun are disclosed in the report.

The historical black strip did not reproduce: both before/after fullscreen root and header start at y=0. The page's backdrop/margins are controlled, but the original black strip's source is unconfirmed. Synthetic `dag-baseline` stores content, not a patch; patch captures use separately labeled synthetic sources. No private traces or credentials are used in this acceptance pass.

## Replay single-screen refinement · 2026-11-15

Replay now joins Graph and Timeline in fitting the desktop screen. Source steps, center evidence / Terminal and optional Step details scroll locally above a separate playback row. The evidence tabs stay above content and the current row stays visible after resize. See [the layout report, 10 before/after PNGs, exact geometry and reproduction](research/replay-layout.md).

The Replay revision passed **81 Python tests (4.18s)**, TypeScript/build and **38 Chrome scenarios**, including existing failure → patch → later validation, pinned-view playback, long/empty data and network-disabled standalone reports. New assertions check center-column output, top evidence tabs, desktop single-screen boundaries and both output disclosure states without playback overlap. All published captures are synthetic. Results are preserved in [replay-layout/verification.json](research/replay-layout/verification.json).

## Neutral navigation / single-screen Graph and Timeline · 2026-11-14

The latest user instruction restores Graph and Timeline to one desktop screen while Replay, Compare, Analytics and Datasets retain document scrolling. A 64px single-row icon-and-tabs navigation is in normal flow; it leaves the viewport on document pages when scrolling down. Graph/Timeline keep their canvas, linked Inspector and activity/Event Log within 1586×912 and 1280×800. Long source graphs pan locally; logs and evidence scroll inside their own panes. Fullscreen preserves details; manual Diff/Output/Context choices persist through playback, seek and viewport changes.

Final checks: **81 Python tests (4.82s)**, TypeScript/build and **38 Chrome scenarios passed**. Data checks include **909 DAG sorts**, **1,908 execution scopes / 3,161 exact source paths / 5,189 routes**, **61 inline states / 1,735 routes** and **126 Timeline layouts**. The exact public root HTML and private HTML were opened offline with **0 HTTP requests / 0 page errors**. Node-category silhouettes and the white vertical Drawing are shared by screen/SVG/PNG; CSV, catalog filters and Sankey remain tested.

First graph paint: **500 steps 96.8ms / 2,000 steps 147.6ms**, each initially displaying three overview nodes. This preserves click → visible SVG → next animation frame after app load, excluding initial bundle load; these are individual local samples, not all-node rendering timings. The 2,000-step scenario retains zoom, empty-filter recovery and final-source Inspector. The build retains the existing large-bundle warning (2,439.78kB JS / 756.77kB gzip).

The existing authorized real NL2Repo set was reused, with no new model calls: the longest three traces have **324 / 172 / 87 source steps** and **379 / 193 / 188 edges**. Inline expansion/collapse, zoom/anchor/source/focus, repeated search, wheel, fullscreen details, current SVG, 1280px and offline passed, producing **17 private PNGs** under ignored `.workers/local/neutral-vertical-real-qa/`. None of those three runs records a patch; the missing-patch state is validated. Public fixtures and all 66 published screenshots are synthetic.

See the [current report, commands, screenshot index and limitations](research/neutral-vertical-workspace.md), [77-item functional mapping](research/neutral-vertical-workspace/function-map.md), [55 primary PNGs and hashes](research/neutral-vertical-workspace/capture-manifest.json), [38 scenario results](research/neutral-vertical-workspace/verification.json) and [private aggregate assertions](research/neutral-vertical-workspace/real-verification.json). Eleven supplemental category/theme/fullscreen/playback captures are in [graph-appearance/](research/graph-appearance/). Final independent visual disposition is recorded in the [current review](research/neutral-vertical-workspace/review.md). The historical Taste marketing gate remains OPEN; it is not a current UI pass. The generated logo remains explicitly deferred.

## Historical inline execution Graph · 2026-11-14

Merged sections now expand **inside the same canvas**, retaining siblings and original rolled-up edges. Named containment boundaries support independent/nested expansion, header collapse, Collapse last / Alt+↑ and Collapse all. Toggling preserves zoom and screen position, including when the compact-width hint wraps. Exact source/Inspector/URL survive collapse; search adds only its required path. Enclosures are frontend metadata, not duplicate execution nodes. See [semantics, function mapping, reproduction and screenshots](research/inline-graph.md).

Final checks: **81 Python tests (3.69s)**, TypeScript/build and **28 Chrome scenarios passed**. Pure checks include **855 DAG sorts**, **1,908 scopes / 3,161 exact paths / 5,189 routes** and **61 inline states / 1,735 forward routes**, plus filtering, containment and source/edge-count invariants. Default overview first graph paint was **94.7 / 131.0 ms** for **500 / 2,000 source steps**, respectively, drawing three merged nodes per sample after app load. Bundle loading and full-source rendering are excluded. The 2,000-step chain retained zoom, empty-filter recovery and last-source Inspector access.

The real verifier checked **324 / 172 / 87-step** records and **379 / 193 / 188** source edges, with **33 private screenshots** in ignored `.workers/local/inline-graph-qa/`. It covers normal-zoom expansion, largest/nested/multiple sections, collapse/camera/source/focus, failed/final sources, repeated search, SVG, 1280px and exact offline HTML (**0 HTTP / 0 page errors**). Ten public full-page PNGs use only the synthetic fixture. The single task-scoped detector returned `[]`. Run `node scripts/verify-execution-map.mjs --output .workers/local/inline-graph-qa` against the authorized existing local dataset. Detailed results are in [inline-graph/](research/inline-graph/).

The fresh independent [finish review](research/inline-graph/review.md) opened all 43 PNGs and returned **ship** for this desktop extension, with no material fixes or recapture. It reviewed source and supplied assertions without operating a browser or rerunning tests. The incumbent system files remain unchanged.

## Historical content-grouping snapshot · 2026-11-14

Overview now groups contiguous recorded operations using activity, command families, literal script imports and qualified file subjects. It displays up to three content sections per level, with original calls at a maximum of four. Each merged node shows an operation summary, counts, subject and errors. Section contents exposes the basis and exact source examples. No strong content change produces an explicitly qualified continuation batch, rather than an inferred task. Parent return, exact source selection, filtering and old graph modes remain available. See [rules, entry mapping and current screenshots](research/semantic-graph.md).

Final automated checks: **81 Python tests**, TypeScript/build, **855 existing DAG checks**, **1,908 execution scopes / 3,161 exact paths / 5,189 mixed-size forward routes**, content/subject regressions and **28 Chrome scenarios** passed. The real verifier checked **324 / 172 / 87-step** records from the existing local NL2Repo dataset, writing **38 private PNGs** under ignored `.workers/local/semantic-graph-qa/`. It verifies summary/example linkage, actual dependencies, failed/final sources, search/pan recovery, parent navigation and a 1280×800 chain. The exact private HTML made **0 HTTP requests / 0 page errors**. Public captures and sanitized assertions are in [semantic-graph/](research/semantic-graph/).

Current first graph paint is **128.3 / 197.9 ms** for **500 / 2,000 source steps**, respectively. Each initial view draws **three merged nodes**, measured click → visible SVG → next frame after app load. These individual samples exclude bundle loading and are not full-node rendering timings. The 2,000-source-step chain also zooms, filters and opens its last call. Existing large-bundle warning remains. Reproduce using the standard commands above and `node scripts/verify-execution-map.mjs --output .workers/local/semantic-graph-qa` against the authorized local real dataset.

## Historical numeric-range Graph · 2026-11-14

The parent-navigation follow-up adds a persistent **Back one level** button, **Alt+↑**, explicit ancestor breadcrumbs and visited-path preservation when selecting a leaf. The online/offline execution-map scenarios assert exact prior node sets, source/Inspector/URL retention, focus and disabled-root state. `node scripts/verify-execution-map.mjs --navigation-only` verifies the three longest real records plus 1280px and offline chains, producing 15 private captures. All **81 Python tests**, TypeScript/build and **28 Chrome scenarios** pass after this correction. See [navigation evidence and reproduction](research/long-graph.md#parent-navigation-follow-up--2026-11-14).

The current Graph adds a bounded source-range overview for runs with at least 60 steps. Each level shows at most four sections or original calls; source-order DAG links are rolled up by type, with orthogonal outer routing and selection-focused dependency disclosure. The existing Steps and Hierarchy views remain available. See [research, exact semantics, screenshot map and limitations](research/long-graph.md).

Final checks: **81 Python tests**, TypeScript/build, **855 existing DAG checks**, **2,089 execution scopes / 3,161 exact source paths / 4,529 routes**, and **28 Chrome scenarios** passed. Real local NL2Repo verification uses the three longest records (**324 / 172 / 87 source steps**) from the existing 50-record dataset. It produced **32 private screenshots**, exercised exact cross-range dependencies and Inspector jumps, repeated search after panning, 1280px complete-node visibility, roving keyboard navigation and SVG export. The exact private standalone report made **zero HTTP requests** and had no page errors. Public screenshots use only the labeled synthetic fixture; all real evidence stays under ignored `.workers/local/long-graph-qa/`.

First graph paint is **95.9ms for 500 source steps / 113.5ms for 2,000 source steps**, measured click → visible SVG → following frame after app load. These samples initially display **four overview nodes**, not all source nodes, and are not equivalent full-graph timings against historical revisions. The 2,000-step chain still verifies zoom, empty-filter recovery, final-source search and Inspector. The production bundle warning remains. The independent verdict pass scored all three listed fixes resolved; its scope and evidence are recorded in [review.md](research/long-graph/review.md).

## Historical three-page desktop hierarchy · 2026-11-14

The current revision uses the user's pale Graph, Compare and Replay references. See the [77-item functional mapping, screenshots and reproduction report](research/three-page-hierarchy.md). Default Graph presents its canvas and an empty Inspector, Compare one shared A/B alignment and three flat metrics, and Replay central evidence with Step details closed. Secondary evidence opens through named tabs and disclosures.

`tests/e2e/three-page.mjs` runs online and offline within **26 Chrome scenarios**. It checks 1586×912 and 1280×800, all three operation chains, source identities, stage/Inspector/playback coordination, disclosure close/focus restoration, missing data and PNG/SVG/CSV export. Run `node scripts/verify-three-page.mjs` against the served public dataset to check the exact root HTML with HTTP blocked and produce `test-results/three-page/verification.json` and PNGs. Six base captures and six 1280 counterparts are independent full-page images; supplementary Run DAGs uses a viewport capture of the internally scrolling grid. PNG dimensions are asserted from the actual image header.

Results: **80 Python tests**, TypeScript/build, **746 DAG checks** and **26 Chrome scenarios** passed. First graph paint is **81.7ms / 89.6ms** for 500/2,000 steps after the review fixes, using the existing definition below; it excludes initial bundle loading. The root offline report made zero HTTP requests and had no page errors. The bundle warning remains. Published evidence is under `docs/research/three-page/`.

## Historical information hierarchy refinement · 2026-11-14

The latest density refinement keeps the four-reference identity and replaces the all-at-once composition with one primary workspace per page. See [the design decisions](research/density-surface.md) and [current verification/captures](research/density-verification.md). Existing operation chains now open the appropriate disclosures and comparison modes before reading auxiliary evidence.

`tests/e2e/density.mjs` is integrated online and offline, bringing the smoke suite to **24 scenarios**. It verifies compact stages, primary reading space, disclosure without source changes, file→Inspector navigation, comparison modes, 1586×912 / 1280×800 / 390×844 and the exact offline HTML. Run `node scripts/verify-density.mjs` against the local public server to reproduce the latest captures and `test-results/density/verification.json`.

Latest results: **80 Python tests**, type check/build, **746 DAG checks** and **24 Chrome scenarios** passed. First graph paint is **81.1ms for 500 steps / 89.4ms for 2,000 steps**, using the existing definition below. The exact root HTML made zero HTTP requests; 16 local/offline PNG pairs were byte-identical. The bundle warning remains.

## Historical four-reference revision · 2026-11-13

See [the prior report](research/four-reference-verification.md), [per-image checklist](research/four-reference-checklist.md) and [prior screenshots](research/four-reference/). This revision superseded the earlier pale workbench; the subsequent density refinement preserves its source synchronization, graph semantics and data boundaries.

`tests/e2e/four-reference.mjs` is integrated into the smoke suite online and offline. It exercises all four operation chains, exact deep links, global search/help/share/report download, 1586×912 product-area captures, 1586×992, 1280×800 and 390×844 adaptations, missing timestamps and zero offline HTTP. To verify the exact delivered root report separately, keep the local server running and use:

```sh
node scripts/verify-four-reference.mjs
```

Results are in `test-results/four-reference/verification.json` and `test-results/e2e/scenarios.json`; current checked-in evidence is copied to `docs/research/four-reference/`. The large-bundle warning remains; first graph paint retains the original click-to-SVG metric and excludes initial bundle loading.

Current results: **80 Python tests**, type check/build, **746 DAG topology/mapping checks** and **22 Chrome scenarios** passed. The public dataset has 15 synthetic runs. Source-truth regressions cover neutral completion, successful validation, generic text, non-test tool failure and an edit without a saved patch. First graph paint: **500 steps 81.0ms; 2,000 steps 101.0ms**, single local samples with initial bundle load excluded.

## Historical DAG revision results · 2026-11-12

Baseline: `8e15cb4`; verification performed on the DAG working-tree revision. The public automated suite uses synthetic inputs only. The separate local NL2Repo capture and its limitations are documented in [the capture report](research/nl2repo-capture.md).

| Check | Result |
| --- | --- |
| Python | 75 tests passed, including 11 fixture round-trips, live ingestion and capture recovery, long traces, exact indices, adapters, graphs, metrics, CLI and export escaping |
| Graph transforms | 560 complete Kahn topological sorts passed for ordinary, folded, partially/fully expanded and filtered graphs; checked existing endpoints, strictly forward edges, exact contiguous source mappings and source immutability |
| TypeScript / production build | Both passed; Vite retains the existing large-bundle warning (2,332.48 kB JS, 725.52 kB gzip) |
| Chrome 157.0.8103.52 / Apple M3 | 15 scenarios passed: catalog, graph, historical compare, new DAG interaction, three-run DAG compare, hierarchy, live updates, Sankey, theme, folding, narrow viewport, two render sizes and two offline reports |
| Delivered report | Exact redacted `trajviz-report.html` rechecked after regeneration: 11 fixture runs; DAG, file lookup, folding/filtering, Inspector and comparison; zero external requests and zero uncaught page errors |

First paint uses the existing click-to-visible-SVG-node measurement with a paint opportunity on the following animation frame. Each sample opens a distinct-target synthetic run in a fresh browser context; it excludes initial app navigation/bundle load. These are single samples, not percentile estimates.

| Source steps | First graph paint | Evidence |
| ---: | ---: | --- |
| 500 | 97.4 ms | `test-results/e2e/first-render-500.png` |
| 2,000 | 377.2 ms | `test-results/e2e/first-render-2000.png` |

The 2,000-step run also zoomed, filtered to an empty graph and back, searched its last step and opened details at ordinal 2,000. The repeated 2,000-step trace folded 1,960 steps into 40 continuous blocks and retained member inspection/expansion.

Committed evidence and semantic limitations are in the [DAG report](research/dag-verification.md) and [evidence directory](research/dag/). Local complete screenshots remain under `test-results/e2e/` and the final redacted offline check under `test-results/delivered/`.

See [hierarchy/live semantics, skill review and screenshots](research/hierarchy-live.md) for the extension, and [NL2Repo capture](research/nl2repo-capture.md) for local real-run evidence.

## Dashboard revision · supplied demo references

The subsequent dashboard implementation passed **78 Python tests**, TypeScript/build, **708** complete topological sorts and **18 Chrome scenarios**. It adds Replay, recorded patch/terminal, notes, timestamp-point Timeline and action-offset alignment. The exact delivered HTML additionally passed `node scripts/verify-dashboard.mjs`: zero HTTP requests/page errors, exact large source index, notes/playback and 320/390/768/1024/1440px plus dark theme. Public data now has 14 synthetic runs.

Latest first graph paint: **500 steps 97.0 ms; 2,000 steps 112.4 ms**, with the same click→visible SVG→following animation frame definition above. These are single local samples. Production JS is 2,352.50 kB / 730.20 kB gzip; the existing bundle warning remains. See [dashboard evidence](research/dashboard-verification.md), including the independent design review and the separate Taste gate findings. Earlier numbers above are retained as the prior DAG revision record.

### Earlier baseline work

[Live SWE capture](research/swe-capture.md), [layout evaluation](research/layout-benchmark.md) and [independent review](research/independent-review.md) document earlier work; the real captures were not accessed or rerun for this revision. The optional engine benchmark remains available:

```sh
node scripts/benchmark-layout.mjs --stack-size-kb 6144 --timeout-ms 60000 --repeats 2
```


## Compact workbench revision

This historical top-navigation workbench has been superseded by the four-reference dark topbar and left rail. See [workbench verification](research/workbench-verification.md). `tests/e2e/workbench.mjs` adds 1440×900 and 1280×800 pane/alignment assertions and the source #50 → #60 → #70 → #100 failure/edit/validation path, filter recovery, 390px inspection toggling, long logs/code and a zero-step run. The smoke suite now has 20 scenarios and five generated stress/precision runs in addition to the 14 public fixtures. `scripts/verify-dashboard.mjs` repeats the workbench workflow against the exact delivered standalone file with networking disabled.
