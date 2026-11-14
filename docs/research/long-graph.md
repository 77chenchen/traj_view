# Long execution graphs · 2026-11-14

The long-run Graph now uses a bounded execution map: **source-range overview → smaller ranges → original calls**. The view preserves the current pale/purple workbench and the frozen v1 dataset. It changes the amount of source evidence drawn at once rather than trying to make hundreds of nodes fit into one readable screen.

## Direction contract

**THESIS.** Let a reader find a failure in a long recorded trace, inspect its call and output, then follow an actual relationship. A whole-run fit is an orientation aid, not the evidence-reading surface.

**OWN-WORLD.** Preserve TrajViz's existing light canvas, thin blue-gray boundaries, native typography, purple selection and written red/green outcomes. No shared visual-system replacement.

**STORY.** Start with four continuous source ranges and a failure navigator. Open a range, reveal a call, read Inspector evidence, or follow Context to an exact related source. Groups are display ranges, never inferred agents or tasks.

**FIRST VIEWPORT.** The canvas dominates below compact stages and one toolbar. Four root nodes fit the desktop canvas. The source strip and breadcrumb retain whole-run orientation. Inspector starts empty; dependency detail is disclosed through selection or Layers.

**FORM.** Operate; code-led extension of the pinned “浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中” and “首屏优先展示宽大的执行画布” direction. `seed: none (pinned)`. Signature interaction: source-range drill-down replaces a parent with its children; navigation/search exposes the exact saved call. Camera feedback is immediate, without animated evidence transitions.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Diagnosis and research

The existing local 50-record NL2Repo dataset contains 1,071 canonical steps. Its three longest records have 324/379, 172/193 and 87/188 steps/edges. These are observed trace sizes, not successful-task counts. The original graph put hundreds of source nodes on a large horizontal canvas; a whole-run fit made labels unreadable. Dependency arcs and retry links competed with the main sequence. Most of the longest trace has phase `other`, so phase grouping alone cannot provide useful containment.

Primary sources consulted:

- [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html): layered direction, crossing minimization and routed edges. Merely changing node coordinates does not solve long-trace reading; the previous renderer also discarded ELK edge routing.
- [yWorks hierarchical nesting](https://live.yworks.com/demos/layout/hierarchical-nesting/): bounded folding and drill-down support reading a small relevant part of a larger graph.
- [Perfetto trace UI](https://perfetto.dev/docs/visualization/perfetto-ui): whole-trace navigation, local inspection and evidence-oriented exploration.
- [ELK merge edges](https://eclipse.dev/elk/reference/options/org-eclipse-elk-layered-mergeEdges.html): shared routing ports are a drawing choice, not permission to merge unrelated recorded actions.

No source code or assets were copied from these projects.

## Drawing and evidence semantics

| Concern | Implemented rule | Evidence boundary |
| --- | --- | --- |
| Default level | At least 60 source steps opens Overview; root has at most four ranges, nested levels at most four nodes | Smaller runs keep the previous step DAG; Layers also offers Steps and Hierarchy |
| Grouping | Each section covers one contiguous ordinal interval; parent is replaced by children | Nonadjacent equal signatures are never combined; `Steps 1–81` means display ordinals, not raw source IDs |
| Source identity | Every section preserves all exact member indices; original leaf nodes retain IDs | Nonconsecutive decimal indices beyond 2^53 remain strings; selection is still run + exact source idx |
| Navigation | Breadcrumb, bounded source strip, Next failure, global node search and Inspector relation jumps | Search spans the full source DAG, including calls outside the open range; locating clears incompatible filters |
| Edges | Roll up existing edges by visible endpoints and type; retain counts; omit internal edges from the level | Canonical edges are unchanged. No filtering reconnects nodes. Cross-range counts explain omitted external links; Context exposes the original relationships |
| Dependency focus | Long runs initially show only selected-node dependency links | Layers → All dependency connections restores the level's dependencies. Sequence/retry links keep their separate switches |
| Routing | Stable left-to-right source x; orthogonal adjacent sequence edges; interval-colored outer channels for longer links | Dependency channels above nodes; retry channels below. No backward x segment or traversal through another node's interior |
| Vertical placement | Original leaf calls use category spacing | This is not agent concurrency or measured time. The caption states that explicitly |
| Filtering | Preserve the section if any original member matches, then remove edges with absent endpoints | Member counts/error totals describe the full source interval; empty filters have a reset action |
| Export | The same drawing produces SVG and PNG; standalone HTML embeds the same viewer | Exports describe the current displayed scope, selection and filters, not a reconstructed full trace |

The existing consecutive-signature folding, loop hierarchy, signature summary, playback, file targets and comparison DAGs remain available. The new source-range projection is in-memory only; schema/CLI formats are unchanged.

## Reproduction and evidence

Public synthetic reproduction:

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
python -m backend.cli serve out --port 8765
```

Open `http://127.0.0.1:8765/#view=graph&run=execution-long-synthetic`. The explicitly synthetic 96-step fixture contains repeated reads, nonadjacent repeats, failures, saved patches and successful reruns; it has no timestamps and uses nonconsecutive source indices starting at `10000000000000001`.

The real evidence remains private in ignored `.workers/local/long-graph-qa/`. With the existing local dataset served on port 8766 and its private HTML regenerated, run:

```sh
python -m backend.cli export .workers/local/nl2repo-50-out --html .workers/local/nl2repo-long-graph.html
node scripts/verify-execution-map.mjs
```

The verifier uses the three longest actual records. It captures whole-run overview, section drill-down, failed-call output, Context, last-source search, all connections and offline states at 1586×912. The longest record is also checked at 1280×800 for overview, section, failure, complete leaf bounds, repeated search after panning and keyboard focus. `before-0-default.png` / `after-0-overview.png` show that record before/after. Baseline fit captures are retained as history, not presented as readable evidence. Private screenshots, source text and run IDs are excluded from the public repository.

### Screenshot map

All 32 final real-data captures were opened and checked. These paths are relative to the ignored local directory above; `N` is 0, 1 or 2 in descending source-step count.

| State / operation | Actual local captures | Result |
| --- | --- | --- |
| Whole-run orientation | `after-N-overview.png`, `after-0-overview-1280.png` | At most four contiguous sections; empty Inspector, operative camera |
| Range drill-down | `after-N-section.png`, `after-0-section-1280.png` | Parent replaced by at most four children; breadcrumb retained |
| Failure navigation and recorded output | `after-N-failure.png`, `after-0-failure-1280.png` | Exact failed source selected; output visible in Inspector |
| Context and cross-range navigation | `after-N-context.png`, `after-N-dependency-context.png`, `after-N-dependency-jump.png` | Original relationships retained; upstream jump locates its exact source in another range |
| Full-source search | `after-N-last-source.png` | Final original call found outside the current range |
| Complete leaf, repeated locate, keyboard | `after-0-last-leaf-member-1280.png`, `after-0-relocated-1280.png`, `after-0-navigator-focus-1280.png` | Complete last-member bounds visible; repeated Enter restores selection after 22 pan inputs; one roving Tab stop with arrows/Home/End and Tab exit |
| All relationships disclosed | `after-N-all-connections.png` | Actual visible dependency counts 1 / 4 / 5; retry counts 0 / 1 / 1 |
| Exact regenerated private HTML | `offline-overview.png`, `offline-failure.png` | Overview, failure output and selection work with HTTP blocked |

Public, reproducible screenshots use only the labeled synthetic fixture: [overview](long-graph/execution-synthetic-overview.png), [failed call](long-graph/execution-synthetic-failure.png), [saved patch](long-graph/execution-synthetic-patch.png). [Provenance](long-graph/provenance.md) records their browser, source and capture procedure. They are direct browser screenshots, not composites or reference artwork.

## Validation

| Check | Final result |
| --- | --- |
| Python | **81 passed in 4.73s**, including the new public long-fixture round-trip |
| TypeScript / production build | Passed; existing bundle warning remains (2,421.39 kB JS / 750.63 kB gzip) |
| Existing graph projections | **855** topology/mapping checks passed |
| Execution-map projection and routes | **2,089** scopes, **3,161** exact source paths and **4,529** forward, obstacle-free routes checked |
| Chrome 157.0.8103.52 | **28 scenarios passed**, including the new online/offline execution-map chain and the existing Graph/Compare/Replay/Timeline/export workflows |
| Real NL2Repo dataset | 50 records / 1,071 canonical steps; longest three **324 / 172 / 87** steps and **379 / 193 / 188** edges; 32 final private captures, no page errors |
| Real standalone HTML | **0 HTTP requests**, **0 page errors** with overview and failure Inspector exercised |
| First graph paint | **95.9 ms / 113.5 ms** for 500 / 2,000 source steps, respectively; each initially displays four overview nodes |

The first-paint definition is the existing click → visible SVG node → next animation frame. These are individual local samples after the application has loaded, not percentiles or initial bundle-load times. The new samples measure the default bounded overview, **not simultaneous rendering of 500/2,000 original nodes**, so they are not an equivalent full-graph comparison with historical timings. The 2,000-source-step test also zooms, filters empty/restores, searches the last source and opens its Inspector. Raw public results are [first-render.json](long-graph/first-render.json) and [scenarios.json](long-graph/scenarios.json); a [sanitized real-data verification summary](long-graph/verification.json) omits private IDs and evidence text.

The independent finish review returned **ship — verdict-pass scope**: all three listed fixes (camera/source location, clipped levels, keyboard stops) were scored resolved. It inspected 18 targeted final captures and corresponding source changes, including actual dependency and retry evidence. It did not operate the browser or rerun tests; the full 28-scenario smoke finished successfully after that review packet. This is approval of the listed fixes, not a fresh whole-surface audit. See [the review record](long-graph/review.md).

This is an ordinary extension of the existing Operate interface. The final captures were checked against `DESIGN.md`, `.impeccable/design.json` and `PRODUCT.md`: pale continuous canvas, blue-gray boundaries, purple focus and selection, written red/green outcomes, existing type scale, shell and exact-source evidence behavior are preserved. No visual-system files were rewritten. The one task-scoped Impeccable detector result was `[]`; it was not rerun after the bounded review fix batch. Existing setup drift was reported rather than repaired. The older Taste gate remains `GATE: OPEN` from 2026-11-12; it is a historical catalog/marketing-rule run, not a passing Graph-specific gate for this revision.

## Remaining data limits

Real logs lack usable complete timestamps for these inspected records; the map therefore reads source order. v1 does not supply per-call duration, authoritative subagent parentage, complete file versions, cost or attempt counts. Generic phase labels remain generic. Dependencies retain the existing file/observation heuristic and retries retain the project's signature rule; neither establishes a proven causal graph. Outcomes remain `unknown` when the source does not record a final outcome. These captured records include interrupted/provider-limited attempts and must not be presented as 50 completed benchmarks.

## Parent-navigation follow-up · 2026-11-14

User feedback identified that drill-down did not provide a discoverable way back. The prior small range buttons were the only return entry. Selecting a visible leaf also recomputed its search path, which could replace the range actually opened with a different overlapping leaf range.

The navigation now begins with a persistent **Back one level** button; it is disabled at the root. **Alt+↑** works when focus is in the graph or its navigation and leaves text-input/select behavior alone. A named, separator-delimited breadcrumb provides direct ancestor jumps. Selecting an already visible original call retains the visited path. Returning restores exactly the previous source interval and visible nodes, keeps the inspected source/deep link and details, and moves focus to the return button or root breadcrumb. Scope changes retain the existing camera framing behavior.

Reproduce private real-data navigation after rebuilding and exporting the HTML:

```sh
node scripts/verify-execution-map.mjs --navigation-only
```

The command writes only to ignored `.workers/local/execution-return-qa/`. It checks the three longest real records (324 / 172 / 87 steps), their actual four / three / three visited levels, the 324-step record at 1280×800, and the exact offline HTML with HTTP blocked. Its 15 full-page captures are named `run-N-return-leaf.png`, `run-N-return-parent.png`, `run-N-return-overview.png`, the three `run-0-…-1280.png` counterparts and the three `offline-return-….png` states. All 15 were opened and checked; source text and run IDs stay private.

`checkExecutionReturn` in `tests/e2e/execution-map.mjs` independently compares every prior visible node set and breadcrumb, selects a leaf without changing the path, tests both button and shortcut, checks exact source/Inspector/deep-link retention, keyboard focus, disabled-root state and direct ancestor navigation. It runs on 500-source-step and exact-index public fixtures online/offline, and is reused by the private verifier. One initial harness locator rebound to the next section; it was corrected to wait on the clicked node's stable ID before the final full run.

Final follow-up checks: **81 Python tests passed in 7.19s**, TypeScript/build passed, **28 Chrome scenarios passed** including both navigation chains and the exact delivered HTML offline. Existing pure checks remain **855 DAG checks, 2,089 scopes, 3,161 exact paths and 4,529 routes**. The real navigation verifier recorded zero page errors; its offline chain made **0 HTTP requests**. The existing large-bundle warning remains. Latest overview first-paint single samples are **95.5 / 137.8 ms** for 500 / 2,000 source steps, with the same four-node, app-already-loaded definition above.

Public screenshots: [selected leaf](long-graph/execution-return-leaf.png), [returned parent](long-graph/execution-return-parent.png), [returned overview](long-graph/execution-return-overview.png). [Raw smoke results](long-graph/navigation-scenarios.json), [first-paint samples](long-graph/navigation-first-render.json) and [sanitized real navigation assertions](long-graph/navigation-verification.json) accompany them. These are direct browser captures using the labeled synthetic fixture; origin metadata is embedded and pixels are unchanged.

The follow-up preserves `DESIGN.md`, `.impeccable/design.json`, the existing type/control styles and evidence contract. Its one task-scoped detector run returned `[]`. The fresh independent reviewer returned **ship** for this parent-navigation correction after opening all 15 private and three public captures and reviewing the source. At 1280px the deepest path wraps the source count onto a second line, retaining readable, nonoverlapping controls. The reviewer did not operate the browser; shortcut/focus/restoration rely on the supplied passing assertions. No whole-app, mobile or dark-theme approval is implied. See [the scoped review record](long-graph/navigation-review.md).
