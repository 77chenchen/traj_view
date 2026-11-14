# Neutral navigation and a vertical evidence graph

This is the current visual authority. It supersedes the earlier dark Graph canvas, graphite app rail and horizontal DAG. It follows the user's latest requests: a white graph, subtle gray/white surface separation, a single top navigation and lower-density reading areas. The final follow-up restores **Graph and Timeline to single-screen desktop workspaces**; Replay, Compare, Analytics and Datasets retain document scrolling. The GitHub reference and the user’s explicit single-row choice define the shared navigation. The previously requested synthetic graph, Timeline and playback fixes are retained.

## Direction contract

Operate, code-led; the user's pinned direction replaces the prior shared chrome and graph orientation. No decision image is needed for the prescribed geometry. The existing taste and Impeccable workflows are used for restraint, evidence readability and browser verification.

| Axis | Decision / quality bar |
| --- | --- |
| First viewport | One primary investigation area per page. Graph and Timeline size their canvas, details and lower panel to the available desktop viewport. Other pages give modules independent readable heights and supporting sections below the fold. No left app rail. |
| Navigation | One 64px row: existing site mark plus Replay, Timeline, Graph, Compare, Analytics and Datasets. Each tab has a line icon and text; the active tab uses an underline. The bar scrolls out of view with the document, with no sticky return behavior. No product name, breadcrumbs, global search, notification/help buttons or avatar in this bar. |
| Material | White graph, near-white body, very light neutral headers, single-pixel separators. No dotted ground, gradients, glows or technology motifs. |
| Type | Native sans for operations, monospace for recorded code/commands/measurements. Full source identities remain available in Inspector and accessible node titles. |
| Semantics | Node silhouettes identify normalized categories. Muted category strokes and green/red evidence remain meaningful; blue-gray marks selection. |
| Interaction | Read from top to bottom; wheel moves the camera vertically, Shift-wheel horizontally, Ctrl/⌘-wheel zooms at the pointer. Graph/Timeline keep their surrounding workspace in place and scroll long panel content locally. Document pages scroll their static header away. Drag, arrows, Fit, search and exports remain available. |
| Signature behavior | Content summaries open their contiguous recorded interval **in place**, preserve their screen anchor and scale, and collapse from the header or Collapse last/all. |
| Evidence | Inspector remains inside Graph/Timeline fullscreen. Pinned Diff/Output/Context tabs survive playback; missing evidence stays explicitly missing. |
| Finish evidence | Both desktop sizes (1586×912, 1280×800), synthetic and authorized private NL2Repo traces, exact offline HTML and source-preserving exports. |

The generated monochrome transparent mark is deferred at the user's explicit request after the local `OPENAI_API_KEY` was found unset. The current small monochrome layers mark is the existing project icon; it is not represented as generated art. No API call was made and no credential was read or committed.

## Module plan and current visibility

All desktop measurements are from the live component layout, at 1586×912 and 1280×800. The bar uses normal flow, not scroll detection or a fixed overlay. Page changes return to the document top; selection, evidence tabs, disclosures and zoom do not reset because of a page scroll.

| Page | Primary surface | Supporting surface and reading order | Scroll/selection acceptance |
| --- | --- | --- | --- |
| Graph | Remaining viewport height; dominant canvas plus 340px Inspector (320px at compact desktop) | Compact stage navigation before it; Agent activity in a 40px closed row within the work surface; Layers and Legend open on demand | Long diagrams pan locally. Open diagnostics and long Inspector evidence have local scrolling. Fullscreen keeps Inspector and activity. |
| Replay | 760px source list and dominant evidence pane; optional 340/320px Step details | Full-width Terminal/Tests below with bounded log scroll. Stages precede the work area | Source list/patch/output stay synchronized; manual evidence view persists; 72px playback dock remains available. |
| Timeline | Remaining viewport height, split between at least 360px of event lanes and a locally scrolling Event Log; selection-linked Inspector at right | Compact stages and navigation precede the workspace; event log has a 12px separation | All six lanes, log controls and Inspector appear together at both desktop sizes. Lane labels stay opaque during horizontal scroll; all selections share exact source identity. |
| Compare | One shared alignment, 76px minimum rows and explicit first divergence | Full trajectories/snapshots and Key Findings follow below. Patch comparison, All metrics and Run DAGs remain named tabs | Opening Step comparison preserves the main rows and their selection; matches retain every source occurrence. |
| Analytics | Spacious phase-transition chart after its grouping toolbar | Side-by-side remains an available chart mode | Native document scroll; chart hover/focus and grouping remain operational. |
| Datasets | Search/filters then a source-run table with readable 72px-class rows | Selection/CSV actions and local appearance disclosure follow the table | Full catalog scrolls with the document; filter and compare constraints remain unchanged. |

Default/full and scrolled-state images for every page are in the screenshot index below. `graph-before/after`, `compare-before/after` and `replay-before/after` retain the same fixture and viewport across each pair. A recorded patch, not a reference-image mockup, supplies the code evidence.

## DAG and camera semantics

- All displayed DAGs use a vertical source axis: ELK DOWN, Dagre TB, source-ordered fallback, hierarchy and inline execution sections. Source ordinals drive positions; gaps and decimal indices beyond 2^53 remain exact identities.
- Sequence edges use bottom-to-top ports and point down. Dependencies use left outer channels, retries use right channels, with distinct dash styles. Interval coloring reuses non-overlapping channels. Side indentation is category/containment spacing, never proof of concurrency or agent identity.
- Expanded sections surround their actual visible members. Existing v1 source edges are rolled up across blocks without creating causal edges. Internal edges remain in member details. Ordinary, folded and filtered frontiers retain valid endpoints and a topological ordering.
- A tall run starts at a readable zoom at its beginning. Fit is an explicit overview action; it may make labels small when many sections are open. Plain graph scrolling preserves scale and clamps near the beginning/end. The single-screen Graph keeps its Inspector in place; embedded DAGs in scrolling document pages can hand the wheel to their document at a boundary. Search re-frames a precise source, preserving unrelated expanded branches.
- The same Drawing renders on screen, in SVG and in PNG. PNG remains bounded to 4096px / 12MP; very tall full-state raster exports therefore lose label resolution. SVG retains vector detail.
- ⌘K/Ctrl+K now opens the catalog and focuses its existing local search. Saved appearance and local dataset information live under Datasets → Local dataset & appearance. Live capture controls remain a contextual body row only when a live source exists.

## Retained fixes

Replay's Auto chooses evidence from the action. A manual Diff / Updated File / File Context / Output choice pins that view during play, step and seek. Inspector tabs, Terminal/Tests, output expansion, details and raw references retain their state. Responsive CSS changes a requested detail pane into a drawer without resetting visibility on viewport changes or full-page capture. A step with no patch shows `No patch recorded`, never the previous patch. The Graph playback chain is covered as well as Replay.

Timeline labels form an opaque full-height sticky gutter. Event centers and phase boundaries share the ruler geometry. Tokens size to available space (up to 96px), use labels when wide and icons when narrow. Crowded recorded points group by screen space, exposing an exact member picker. A token's visual width is not a measured call duration. Fullscreen opens the linked Inspector and re-frames the selected event.

## Reproduce

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact \
  --redact-pattern '/Users/[^/]+/Documents/ChatGPT/traj'
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
python -m backend.cli serve out --port 8765
# Separate terminal, same activated environment:
node scripts/verify-document-workspace.mjs
node scripts/verify-neutral-vertical.mjs
node scripts/verify-timeline-workspace.mjs
node scripts/verify-node-appearance.mjs
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

Public demo: <http://127.0.0.1:8765/#view=graph&run=execution-long-synthetic>. The fixtures are explicitly synthetic. The offline report is `trajviz-report.html`; browser tests block HTTP and check that it still provides graph, details and playback.

Private real-data reproduction stays local:

```sh
python -m backend.cli export .workers/local/nl2repo-50-out \
  --html .workers/local/nl2repo-long-graph.html
# Serve the existing private dataset on 8766, then:
node scripts/verify-execution-map.mjs --appearance-only \
  --output .workers/local/neutral-vertical-real-qa
```

## Verification and evidence

The final full suite passed: **81 Python tests (4.82s)**, TypeScript, Vite build and **38 Chrome scenarios**. Pure checks cover **909 topological sorts**, **1,908 execution scopes / 3,161 exact source paths / 5,189 forward routes**, **61 inline states / 1,735 routes**, and **126 Timeline layouts**. The exact delivered root HTML and separate private HTML both made **0 HTTP requests / 0 uncaught page errors** in offline contexts.

First graph paint was **96.8ms for 500 source steps** and **147.6ms for 2,000**. Each sample initially draws three overview nodes and measures run click → visible SVG → next animation frame after app load; bundle loading and rendering all original calls are excluded. These are single local samples, not percentiles. The 2,000-step chain also zooms, recovers from an empty filter and opens its exact final source. Production JS is 2,439.78kB / 756.77kB gzip; the existing large-bundle warning remains.

Use the [77-item function map](neutral-vertical-workspace/function-map.md) for every original Graph/Compare/Replay entry, current visibility, data source and reproduction. [verification.json](neutral-vertical-workspace/verification.json) contains the final 38 scenario results and current assertions; [real-verification.json](neutral-vertical-workspace/real-verification.json) contains only private-run aggregate assertions. The historical Taste marketing-page gate remains **OPEN** with 34 findings from 2026-11-12; it was not rerun or represented as a pass for this desktop Operate interface. The single task-scoped Impeccable detector returned `[]`; the [full finish review and scoped correction verdict](neutral-vertical-workspace/review.md) are recorded separately. The final verdict is **ship** for the sole listed Replay end-clearance correction, scored resolved; it is not a fresh whole-surface review.

### Screenshot index

The [capture list](neutral-vertical-workspace/captures.json) and [dimensions / SHA-256 manifest](neutral-vertical-workspace/capture-manifest.json) enumerate **58 independent PNGs**, with embedded browser-capture provenance. Same-page before/after pairs keep their fixture, desktop viewport and document scroll position. They change selection or requested details only. Full-page Replay captures show its genuinely fixed playback dock at the original viewport bottom; this is Chrome's full-page capture behavior, not a stitched image. Viewport scroll-state captures demonstrate that the dock remains reachable and the topbar scrolls away. The final end-of-document assertions verify that both collapsed Terminal/Tests controls and expanded output remain at least 16px above the dock in both desktop sizes, locally and in the exact offline HTML. The 58 main captures plus 11 appearance/playback supplements provide 69 public synthetic screenshots.

| Surface/state | 1586×912 capture | 1280×800 capture |
| --- | --- | --- |
| Graph unselected | [before](neutral-vertical-workspace/graph-before.png) | [before](neutral-vertical-workspace/graph-before-1280.png) |
| Graph patch selected | [after](neutral-vertical-workspace/graph-after.png) | [after](neutral-vertical-workspace/graph-after-1280.png) |
| Long Graph overview / in-place expansion | [overview](neutral-vertical-workspace/vertical-before-1586.png), [expanded](neutral-vertical-workspace/vertical-expanded-1586.png) | [overview](neutral-vertical-workspace/vertical-before-1280.png), [expanded](neutral-vertical-workspace/vertical-expanded-1280.png) |
| Long Graph patch / fullscreen | [patch](neutral-vertical-workspace/vertical-patch-1586.png), [fullscreen](neutral-vertical-workspace/vertical-fullscreen-1586.png) | [patch](neutral-vertical-workspace/vertical-patch-1280.png), [fullscreen](neutral-vertical-workspace/vertical-fullscreen-1280.png) |
| Compare default / selected divergence | [before](neutral-vertical-workspace/compare-before.png), [after](neutral-vertical-workspace/compare-after.png) | [before](neutral-vertical-workspace/compare-before-1280.png), [after](neutral-vertical-workspace/compare-after-1280.png) |
| Replay paused / edit with details | [before](neutral-vertical-workspace/replay-before.png), [after](neutral-vertical-workspace/replay-after.png) | [before](neutral-vertical-workspace/replay-before-1280.png), [after](neutral-vertical-workspace/replay-after-1280.png) |
| Replay document end / Terminal expanded | [closed](neutral-vertical-workspace/replay-scrolled.png), [expanded](neutral-vertical-workspace/replay-terminal-expanded-1586.png) | [closed](neutral-vertical-workspace/replay-scrolled-1280.png), [expanded](neutral-vertical-workspace/replay-terminal-expanded-1280.png) |
| Timeline single-screen | [Timeline](neutral-vertical-workspace/timeline-1586.png) | [Timeline](neutral-vertical-workspace/timeline-1280.png) |
| Timeline fullscreen with Inspector | [fullscreen](neutral-vertical-workspace/timeline-timeline-fullscreen.png) | [fullscreen](neutral-vertical-workspace/timeline-timeline-fullscreen-1280.png) |
| Analytics / Datasets | [Analytics](neutral-vertical-workspace/sankey-1586.png), [Datasets](neutral-vertical-workspace/runs-1586.png) | [Analytics](neutral-vertical-workspace/sankey-1280.png), [Datasets](neutral-vertical-workspace/runs-1280.png) |

Named disclosures each have an open-state PNG: Graph `graph-stages/layers/legend/error/context/activity/files/signatures`; Compare `compare-agent-a/agent-b/snapshots-a/snapshots-b/patch/metrics/charts/findings`; Replay `replay-stages/context/failure/playback`. `missing-patch/time` verifies explicit missing evidence. `playback-diff-updated` and `playback-inspector-diff-updated` capture the second saved patch after stepping through missing evidence. The function map links each state and records its trigger. Additional category/dark-theme/Compare-fullscreen and missing-patch playback captures are under [graph-appearance/](graph-appearance/).

Results and the screenshot inventory are recorded alongside this report in `neutral-vertical-workspace/`. They distinguish default, expanded, failed, patch and fullscreen states at both desktop sizes. Each image is a real independent browser capture, never a stitched mockup. Historical reference captures remain documentation of earlier directions, not the current UI.

The private validation uses the three longest authorized NL2Repo traces (324, 172 and 87 source steps; 379, 193 and 188 edges) from the existing 50-run set. Raw identifiers, commands, outputs and screenshots stay under ignored `.workers/local/`. Only aggregate verification is published. Those three traces contain no recorded patches; their Code Diff view must show that missing state.

No persisted schema fields change. Missing file versions, patches, per-call durations, attempts, per-step agents/parents, distinct reasoning roles, Token/cost or test pass rate remain individually unrecorded. File/observation dependencies and content grouping are declared heuristics. A later successful test does not prove that the selected patch caused it. The existing single-file bundle-size warning remains.
