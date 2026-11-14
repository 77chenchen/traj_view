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

## Long execution Graph · 2026-11-14

The current Graph adds a bounded source-range overview for runs with at least 60 steps. Each level shows at most four sections or original calls; source-order DAG links are rolled up by type, with orthogonal outer routing and selection-focused dependency disclosure. The existing Steps and Hierarchy views remain available. See [research, exact semantics, screenshot map and limitations](research/long-graph.md).

Final checks: **81 Python tests**, TypeScript/build, **855 existing DAG checks**, **2,089 execution scopes / 3,161 exact source paths / 4,529 routes**, and **28 Chrome scenarios** passed. Real local NL2Repo verification uses the three longest records (**324 / 172 / 87 source steps**) from the existing 50-record dataset. It produced **32 private screenshots**, exercised exact cross-range dependencies and Inspector jumps, repeated search after panning, 1280px complete-node visibility, roving keyboard navigation and SVG export. The exact private standalone report made **zero HTTP requests** and had no page errors. Public screenshots use only the labeled synthetic fixture; all real evidence stays under ignored `.workers/local/long-graph-qa/`.

First graph paint is **95.9ms for 500 source steps / 113.5ms for 2,000 source steps**, measured click → visible SVG → following frame after app load. These samples initially display **four overview nodes**, not all source nodes, and are not equivalent full-graph timings against historical revisions. The 2,000-step chain still verifies zoom, empty-filter recovery, final-source search and Inspector. The production bundle warning remains. The independent verdict pass scored all three listed fixes resolved; its scope and evidence are recorded in [review.md](research/long-graph/review.md).

## Three-page desktop hierarchy · 2026-11-14

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
