# Inline execution Graph · 2026-11-14

The latest request replaces navigation into a separate graph scope with expansion inside the current canvas. Content boundaries and evidence summaries still use the [recorded-activity tree](semantic-graph.md). The existing pale desktop Operate workspace, schema, adapters, CLI and other views remain in place.

## Interaction contract

The initial long-run overview contains up to three content sections. Clicking a merged section reveals its children inside a named enclosure, retains every sibling, and rolls the original edges up against the new frontier. Multiple independent and nested sections can remain open. Each enclosure header includes its content title, source count and Collapse action. A click or Enter/Space closes that group and its open descendants. **Collapse last / Alt+↑** closes the most recently opened visible group; **Collapse all** restores and fits the root overview.

Ordinary expand/collapse preserves zoom and the clicked card/header's screen position. The camera compensates for compact-width hint wrapping that changes the SVG viewport. Source search, Next failure, the source strip and Context open only the necessary path, retaining other open branches. The exact selected source, URL and saved Inspector evidence survive collapse. A selected expanded group focuses dependencies incident on its visible members. The Inspector exposes the grouping basis and original examples, and labels its action Expand this section in place / Collapse this section. Before a member is chosen it shows a member prompt rather than reporting a missing step.

**Direction seed: none (pinned).** The behavior instruction is “点击进入下一层之后不要在新的界面展开，而是直接在当前界面展开合并节点”. The inherited world instruction is “统一浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中、绿成功、红失败”.

**Mode and quality bar:** extend the existing Operate system. Source evidence and understandable containment lead; no new decorative language. The first viewport remains a compact stage/navigation area, a dominant canvas and an empty Inspector. The signature interaction is closed section → in-place children → nested / second branch → header collapse, with stable camera, source and evidence. This is a code-led behavior refinement, with no new approved visual comp. The current visual authority remains PRODUCT.md, DESIGN.md, `.impeccable/design.json` and the existing three-page hierarchy references. Desktop scope is 1586×912 and 1280×800.

## DAG semantics

`inlineExecutionGraph` produces a source-ordered frontier of disjoint contiguous intervals and original single steps. Every source step occurs exactly once before filtering. An opened parent is stored in frontend-only `groups`, with its visible member IDs, parent and depth. These enclosures are containment metadata, **not execution nodes**. They do not duplicate source steps or add structural/causal edges.

Each original edge maps to the most specific visible frontier endpoints and retains type/count. Internal edges stay available in Inspector. Filtering removes endpoints and empty enclosures without synthesizing connections. The display DAG remains topologically sortable; nonadjacent repetitions remain separate. Execution positions reserve enclosure padding and nested title space. Sequence edges use adjacent ports; long dependency/retry channels account for enclosing bounds. Browser, PNG and SVG share the same drawing.

| Operation / previous entry | Current entry and default | Evidence / verification |
| --- | --- | --- |
| Enter another graph scope | Click a collapsed section in the existing SVG | Siblings remain; scale unchanged; screen anchor drift <1.5px |
| Back / breadcrumb | Click a group header, Collapse last / Alt+↑, Collapse all | Descendants close; other branches stay open; exact source/URL retained |
| Explain merged contents | Node summary; Inspector → Section contents | Recorded activities/subjects, grouping basis, exact examples; unknowns remain explicit |
| Several investigations | Open a second root or nested section | Independent enclosures remain on one canvas |
| Locate original evidence | Search, failure/source navigation, member or example selection | Add exact source path; keep existing branches; Inspector and URL agree |
| Relationships | Existing edge toggles and All dependency connections | Original rollup only; group focus covers its frontier children |
| Export / offline | Existing PNG/SVG and single-file HTML | Current frontier/enclosures in images; same interactions with HTTP blocked |

## Reproduction and evidence

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
python -m backend.cli serve out --port 8765
```

Open <http://127.0.0.1:8765/#view=graph&run=execution-long-synthetic>. The public 96-step fixture is explicitly synthetic, has no timestamps, and covers saved patches, failure/retry/dependency evidence and nonconsecutive source indices beyond 2^53. Screenshots below are separate direct full-page browser captures at scroll 0, not montages or reference images.

| State | Public PNG at 1586×912 unless named 1280 |
| --- | --- |
| Closed overview | [execution-inline-closed.png](inline-graph/execution-inline-closed.png) |
| One group expanded | [execution-inline-open.png](inline-graph/execution-inline-open.png) |
| Nested child expanded | [execution-inline-nested.png](inline-graph/execution-inline-nested.png) |
| Two independent groups expanded | [execution-inline-multiple.png](inline-graph/execution-inline-multiple.png) |
| Collapsed with source evidence retained | [execution-inline-collapsed.png](inline-graph/execution-inline-collapsed.png) |
| Group basis and original examples | [execution-inline-contents.png](inline-graph/execution-inline-contents.png) |
| Exact failed tool output | [execution-inline-failure.png](inline-graph/execution-inline-failure.png) |
| Exact saved patch | [execution-inline-patch.png](inline-graph/execution-inline-patch.png) |
| Smaller desktop, one / multiple open | [one](inline-graph/execution-inline-open-1280.png), [multiple](inline-graph/execution-inline-multiple-1280.png) |

Use the existing authorized local real dataset without running models or loading credentials:

```sh
python -m backend.cli serve .workers/local/nl2repo-50-out --port 8766
python -m backend.cli export .workers/local/nl2repo-50-out --html .workers/local/nl2repo-long-graph.html
node scripts/verify-execution-map.mjs --output .workers/local/inline-graph-qa
```

The dataset has 50 records / 1,071 canonical steps, including interrupted/provider-limited attempts; it does not establish 50 successful benchmarks. The verifier chooses the three longest records, opens their largest/nested sections, checks multi-branch expansion and local collapse, failed/final-source inspection, repeated search after panning, current-state SVG, a 1280px chain and the exact standalone HTML. Private screenshots, source IDs and HTML stay in ignored `.workers/local/`.

## Actual verification

- Python: **81 passed in 3.69s**. TypeScript and production build passed. The existing large-bundle warning remains (**2,438.40 kB JS / 756.38 kB gzip**).
- Pure suites: **855 existing DAG checks**, **1,908 scopes / 3,161 exact source paths / 5,189 mixed-size routes**, content-summary regressions, and **61 inline states / 1,735 forward routes** with filtering, exact edge rollup, complete source coverage, nested containment, independent collapse and source non-mutation.
- Chrome **157.0.8103.52**: all **28 scenarios passed**, including inline geometry/keyboard/focus/source checks, the other existing views, PNG/SVG/CSV, the fresh single-file export and exact delivered HTML. [Scenario results](inline-graph/scenarios.json).
- The same first-graph metric measured **94.7 ms / 131.0 ms** for **500 / 2,000 source steps**, each initially drawing **three merged nodes**. These single samples measure run click → visible SVG → next animation frame after app load; they exclude bundle loading and are not full-node benchmarks. The 2,000-step case also zoomed, filtered to empty/recovered and inspected its exact last source. [First-paint JSON](inline-graph/first-render.json).
- Real NL2Repo: **324 / 172 / 87 source steps**, **379 / 193 / 188 original edges**. Largest sections had **265 / 136 / 50** members. All same-canvas, sibling/nested/multi-branch, header/keyboard collapse, zoom/anchor, exact source, repeated search and SVG assertions passed. The exact private HTML ran offline with **0 HTTP requests / 0 page errors**. [Sanitized assertions](inline-graph/verification.json).
- Evidence: **10 public synthetic PNGs** and **33 private whole-page PNGs**. Public origin metadata preserves the recorded pixel chunks: [provenance](inline-graph/provenance.md). The task-scoped design detector ran once and returned `[]`: [result](inline-graph/detector.json).

The fresh independent finish reviewer returned **ship** after opening all **43** PNGs and reviewing the current diffs and assertions. It required no material fixes or recapture. Its approval covers this desktop inline Graph extension at the two named sizes; it did not operate a browser, rerun tests or approve unchanged surfaces/mobile. [Five-section review](inline-graph/review.md). Finished code and captures were checked against the incumbent system; PRODUCT.md, DESIGN.md and `.impeccable/design.json` remain unchanged.

| Real state | Local PNG under `.workers/local/inline-graph-qa/` |
| --- | --- |
| Root, largest open, nested | `run-N-closed.png`, `run-N-largest-open.png`, `run-N-largest-nested.png` (`N` = 0/1/2 by descending source length) |
| Readable zoom before / after click | `run-0-readable-before.png`, `run-0-readable-after.png` (same panned camera; expansion preserves it) |
| Other branches, nested, collapsed evidence | `run-N-inline-open.png`, `run-N-inline-nested.png`, `run-N-inline-multiple.png`, `run-N-inline-collapsed.png` |
| Failure / context | `run-N-failure.png`, `run-N-context.png` |
| 1280×800 | `run-0-inline-open-1280.png`, `run-0-inline-multiple-1280.png` |
| Exact offline HTML | `offline-inline-open.png`, `offline-inline-multiple.png` |

Full-frontier captures explicitly use Fit so all retained branches can be checked; the readable before/after pair keeps normal zoom and shows local canvas overflow handled by panning. Neither is a separate view. Private PNGs and unsanitized JSON are not committed.

## Limits

The grouping remains a recorded-operation description, not inferred task intent or new causality. V1 still lacks authoritative call parents, per-step agent identity/duration/attempt count, full file versions, cost and test pass rate. Dependency and retry edges retain their documented heuristics. Missing values remain unrecorded.

Opening many branches necessarily widens the source-ordered canvas. Normal toggles keep readable zoom; pan or Fit deliberately changes the visible area. Fit may make labels small when many groups are open. Collapse last/all and source search remain available above the canvas. Live additions may change content boundaries and recompute an unselected group, while the exact selected source is reopened against the refreshed tree. The existing production bundle-size warning remains; first graph paint excludes bundle loading.
