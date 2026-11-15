# Content groups and reading rows · 2026-11-15

The long-run Graph now uses the canvas width: read each row left to right, then continue downward. Content groups still expand in the same canvas, retain their siblings and summarize actual recorded operations. Rows express source reading order, not concurrency. The small-run Steps and legacy Hierarchy layouts keep their existing top-to-bottom behavior.

## Direction contract

**THESIS:** Make a long trace readable across the available width while keeping meaningful content intervals and precise evidence navigation. The primary path is group → call → command/output/patch.

**OWN-WORLD:** Preserve the existing white canvas, quiet supporting panes, blue selection, category silhouettes and semantic failure colors. No new background pattern or navigation chrome.

**STORY:** Scan operations and file subjects, expand a group in place, then inspect its exact source. Source indices, retries and dependencies remain distinct from screen placement.

**FIRST VIEWPORT:** A full-width overview leads. Long-run Inspector starts closed, opens on selection and can be hidden again. Sequence arrows lead; cross-row endpoint pairs and selected-source relationships prevent a wall of crossing lines. Expanded intervals occupy their own bands; calls and summaries share rows sized to the available canvas.

**FORM:** Extend the approved workspace, seed: none (pinned). The user accepted “逻辑分段纵览，段内调用横排”, inline expansion and an on-demand Inspector.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

This is a scoped extension of the incumbent system. DESIGN.md tokens, fonts, colors and existing surfaces are preserved; PRODUCT.md and this report record the changed Graph behavior.

## Geometry and interactions

- `executionGeometry.ts` packs 1–5 columns according to the actual SVG width, node dimensions and enclosure margins. Every row proceeds left to right. An expanded interval begins a separate band; nested content stays contained. Group headers retain the operation summary and file/command subject.
- `edgeRouting.ts` uses short right/left sequence arrows within a row. Across rows, one original temporal edge is drawn as two short stubs with matching numbered endpoints: no return line crosses the canvas. Click or press Enter on an endpoint to locate its exact source partner. Numbers identify links, not groups, phases or inferred tasks. Dependency/retry channels remain available, but default visibility follows only the exact selected source. Expanding a section alone does not reveal every relationship of its members. Layers → All relationships restores the full frontier connection set. Faint ancestor enclosures retain containment without competing with evidence. Source order, edge endpoints/types/counts and topological sorting do not change. Filtering never reconnects missing edges.
- Endpoint controls keep their full text/ring contrast when unrelated strokes dim. Forward jumps enter the target interval's first exact source; reverse jumps return to the source interval's last exact member. Scoped dependency/retry counts are filtered from original incident edges before mapping and aggregation, so collapsed summaries never include unrelated members' contributions.
- `GraphView.tsx` caches layouts by graph and usable row width. Fit, Locate, search, keyboard focus and viewport changes use the actual SVG. A layout change rechecks the selected node even when source ID and viewport dimensions did not change; this covers hiding/reopening Inspector and fullscreen transitions.
- `RunGraph.tsx` retains Layers, Legend, current-state PNG/SVG, Collapse last, Collapse all, source navigation, Playback and Agent activity. Closing Inspector preserves the exact source and evidence tab. Escape returns focus to its toolbar toggle.

## Time and Code Diff: evidence boundaries

The retained private real run contains **87 source steps and zero step timestamps**. Its original exec JSONL has no timestamp keys, and no matching persisted rollout was available locally. The capture supervisor records run-level elapsed metadata separately; it cannot supply a timestamp or duration for each action. This revision keeps ordinal playback and explicitly labels the missing timestamps. It does not distribute a total duration across steps or use filesystem modification times.

Native saved patch arguments continue to render with file headers, line numbers, syntax colors, +/- markers, copy and fullscreen. The real run has **zero native patches and zero safe derived comparisons**. Its shell commands are not equivalent to recorded before/after file versions. Five steps contain strictly parseable literal file writes; their submitted content can be opened under Code Diff, without presenting it as an observed filesystem snapshot.

`recordedEdits.ts` additionally compares two consecutive action records only when both exit 0 and both contain a complete, statically decoded, quoted-heredoc overwrite of the same literal path. This is labeled **Submitted write comparison**, with both exact source IDs and the qualification that filesystem versions were not recorded. It never runs commands. Intervening actions, failed writes, dynamic paths, shell expansion, append operations or ambiguous shell syntax invalidate the comparison. First writes have no invented empty before-version. Large comparisons use a valid whole-file replacement instead of an unbounded edit matrix. Compare's final-patch semantics are unchanged.

The public `fixtures/input/shell-writes.events.jsonl` demonstrates valid comparison, missing initial version, an intervening failure, exact large indices and missing timestamps. Public fixtures are explicitly synthetic; the local demo still contains only the previously selected real run.

## Reproduce

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

The capture verifier accepts any already authorized dataset. Public captures use synthetic `out` and a separate local server; real captures are confined to ignored storage:

```sh
python -m backend.cli serve out --port 8767
# In another terminal:
node scripts/verify-reading-graph.mjs --url http://127.0.0.1:8767/ \
  --dataset out --html trajviz-report.html --output docs/research/reading-graph

python -m backend.cli export .workers/local/nl2repo-completed-out \
  --html .workers/local/nl2repo-reading-graph.html
node scripts/verify-reading-graph.mjs --private \
  --url http://127.0.0.1:8765/ --dataset .workers/local/nl2repo-completed-out \
  --html .workers/local/nl2repo-reading-graph.html
```

## Acceptance map

| Feature | Verification and capture |
| --- | --- |
| Horizontal reading and compact start | `overview-1586.png`, `overview-1280.png`; closed Inspector, source order → then ↓ |
| Logical inline expansion | `content-groups-1586.png`, `content-groups-1280.png`; summary, containment and preserved siblings |
| Native code evidence | Public `code-evidence-*.png`; source-bound patch and enabled View Full Diff |
| Missing real patch | Private `code-evidence-*.png`; disabled full-diff action and submitted-file preview |
| Fullscreen and selected-source framing | `fullscreen-*.png`; exact source inside SVG, same evidence |
| Failure evidence | `failure-*.png`; recorded output, red status and exact source |
| Clear sequence routing | Matching endpoint pairs replace row return strokes; keyboard jump retains exact source; default/All relationships coverage |
| Before/after connection comparison | `lines-before-content-groups-*.png` and `lines-before-code-evidence-*.png` preserve the prior routing; current counterparts use the same fixtures and desktop sizes |
| Close/reopen Inspector | Source ID, Code Diff tab and complete selected-node visibility asserted |
| Collapse all | Exact source/evidence preserved, root frontier restored |
| Derived comparison | `submitted-write-comparison.png` in smoke artifacts; two source IDs, deletion/addition, explicit provenance |
| Pinned replay | `submitted-file-content.png`; Diff persists through missing/failed steps, submitted content labeled |
| Offline HTML | `offline-code-evidence.png`, `offline-fullscreen.png`; HTTP blocked, zero requests/errors |

Public images are independent full-page Chrome screenshots of synthetic fixtures, captured at document top. Private real-run screenshots and generated HTML remain ignored under `.workers/local/reading-graph-qa/`. No source logs, credentials or generated private repository files enter public artifacts.

## Results

The final run passed **81 Python tests (4.15s)**, TypeScript, production build (**7.73s**) and **48 / 48 Chrome scenarios**. Pure checks passed **948 DAG sorts**, **1,908 scopes / 3,161 exact paths / 5,189 mixed routes**, **61 inline states / 15,615 routes / 3,919 paired continuations**, and **126 Timeline layouts**. Source-bound native patch, submitted comparison/content, pinned playback, PNG/SVG/CSV, filtering, zero-step data and offline regressions pass.

First graph paint is **97.3ms / 130.9ms for 500 / 2,000 source steps**. Each single sample draws three Overview nodes after app load, measured click → visible SVG → following animation frame; initial bundle loading and all-source rendering are excluded. The 2,000-step scenario still exercises zoom, empty-filter recovery and the final source's Inspector. The production JavaScript is **2,470.88kB / 766.23kB gzip**; the pre-existing large-chunk warning remains.

The public synthetic and retained authorized real-run verifier each passed both desktop sizes, exact-source and bidirectional multi-member continuation jumps, full-contrast controls, scoped/all relationships, Inspector close/reopen, collapse, fullscreen and twelve current captures. Their exact standalone HTML checks made **zero HTTP requests and zero page errors**. Four independent prior-routing captures and four submitted-write/content captures bring the public evidence to **20 PNGs**. Every file was opened and its origin embedded in metadata; dimensions and SHA-256 are in `capture-manifest.json`. The connection helper runs after evidence capture, preserving the intended expanded frontier for comparison. Real screenshots stay local and ignored.

The initial independent review requested three targeted corrections: endpoint contrast, pre-aggregation exact-source relationship counts and reverse summary-boundary jumps. Those were fixed in one batch and recaptured. The same reviewer's verdict pass scored all three **resolved**, with disposition **ship** for that correction batch; see `reading-graph/finish-review.md` for its scope and retained findings. Before/after captures share the expanded frontier, while responsive geometry and camera framing can differ; they are not a pixel-identical composition claim. The incumbent DESIGN.md and design tokens remain unchanged; pre-existing sidecar drift was not repaired. Reading rows reduce vertical distance but do not remove long-trace navigation: explicit Fit can shrink a long expanded graph, while Locate restores a readable selected-source view. Enabling every relationship can still require panning and zooming.
