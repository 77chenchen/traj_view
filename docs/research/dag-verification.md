# DAG revision: implementation and verification

Implemented in the current worktree from verified baseline `8e15cb4`, using React/Vite, the existing CLI, layout adapters, renderer and frozen v1 data fields. The public [Agentic Traces demo](https://agent-trace-vis.netlify.app/#/agentic-traces) and [README](https://github.com/PAIR-code/agent-trace-vis#agentic-traces) informed the text/tool/file activity organization, search, linked highlighting and compression. No upstream source code or assets were copied; no additional upstream licensing payload is needed. The reference screenshot stays local at `test-results/reference-agentic-traces.png`.

## Display semantics

- Main graphs are Expanded DAGs: one node per canonical step, ordered by its source position, including actionless steps. Temporal, dependency, retry and reserved structural edge encodings and toggles are preserved. ELK/Dagre output is accepted only when every successive x coordinate increases; the large/failure fallback is a horizontal source-order rail, never a serpentine grid. Zoom, pan, keyboard, search and clipping use the existing renderer.
- Folding contracts only consecutive equal signatures. A block's `step_indices` is exactly one contiguous source interval (indices themselves may have gaps or exceed the safe JavaScript range). Cross-block edges merge by ordered endpoints/type and remain forward. Internal edges are absent from the display DAG but remain in the original Expanded graph and appear in block member details. Inspect any member, expand its block or expand all; source mapping is unchanged.
- Filtering happens after interval contraction. A block remains when one original member satisfies all phase/category/error filters; its full interval is shown as context. Only edges with both endpoints retained survive. Hidden steps are not reconnected, and nonconsecutive repeated actions are never joined. No display mode uses the cyclic Aggregated graph.
- Aggregated data remains unchanged and supplies signature frequencies, repeated-action and cyclic-group summaries. Selecting a summary frequency locates its first source occurrence. CSV and Sankey keep their existing metric definitions.
- Clicking a node or a file/member location seeks playback by ordinal, opens Inspector and focuses the graph. Details and recorded activity share the lazy step-payload cache. File locations clear step filters so the target is visible. Searching a folded member index finds its block; choose the exact member in Inspector.
- Comparison preserves 2–4 runs of the same task, metrics, phase timelines, Jaccard and every unordered pair. The first selected run is the baseline. First divergence still ignores actionless steps and uses the first mismatching action offset plus both exact source indices (null on an ended side). Node markers identify available sides; repeated signatures keep independent nodes and all highlight across runs. Each run has an independent camera and DAG, and comparison selections also open Inspector.
- PNG/SVG use the current graph's nodes, folding, filters, visible edge types, selection and divergence marks. Exports cover the full current graph rather than only the camera viewport. The portable HTML embeds the same viewer and on-demand payloads.

## Evidence and reproduction

Use the commands in [verification](../VERIFICATION.md). `fixtures/input/dag-*.events.jsonl` supplies three public runs with adjacent/nonadjacent repeats, failed validation/retry, writer/read dependency, missing text/timestamps and source-index gaps above `2^53`. `scripts/test-graph-data.mjs` additionally generates 500/2,000-node graphs and checks 560 topological sorts, contiguous mappings, per-block/full expansion, filtering and source immutability.

The full verification passed: 75 Python tests, TypeScript, production build and 15 Chrome 157.0.8103.52 scenarios. Click-to-first-graph-paint was **97.4 ms for 500** and **377.2 ms for 2,000** steps (one fresh-context sample each). The 2,000-step run supported zoom, empty/nonempty filtering and opening its last step. A separate repeated run contracted 2,000 source steps to 40 blocks.

The fresh temporary export and the shipped `trajviz-report.html` both opened by file URL with network disabled and the server stopped. Offline checks exercised DAGs, exact-index file location, members/expansion, edge filters, image exports, Inspector and three-run comparison. The exact delivered file was regenerated with local-path redaction and checked again: 11 runs, zero external requests and no uncaught page errors.

Retained evidence:

- [File location, DAG and Inspector](dag/file-inspector.png)
- [Three-run DAG comparison and repeated-signature highlighting](dag/compare.png)
- [First-render measurements](dag/first-render.json)
- [All Chrome scenario results](dag/scenarios.json)
- [Exact redacted offline report check](dag/delivered.json)

Complete screenshots can be reproduced in `test-results/e2e/`; the final delivered-file screenshots are in `test-results/delivered/`. Run `python -m backend.cli serve out` to explore the 11 sample runs, or open `trajviz-report.html` directly offline. To regenerate the shared sample without local machine paths:

```sh
source .venv/bin/activate
python -m backend.cli build fixtures/input -o out --redact --redact-pattern "$PWD"
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
```

## Remaining data and rendering limits

The v1 schema has no separate `message.role`, message body or reasoning-channel field: adapters can place message/reasoning content in `Step.thought`. The UI groups actionless text and tool-associated text conservatively and labels this ambiguity; a faithful role/channel transcript cannot be reconstructed. Missing thought, observations, timestamps and physical raw line numbers display as unrecorded. No reasoning or timing is invented.

There is no canonical file-access event or per-file success/result field. File lookup uses only explicit `action.targets` and the listed path argument keys, normalizes paths lexically and reports attempted targets. It cannot prove a read/write succeeded or recover command-only/observation-only paths, directory expansion, dynamic targets or filesystem diffs. Dependency edges keep the backend's existing lexical writer/observation heuristic, not a proven causal relation.

Very long DAGs require horizontal pan/search. Fit-all and the existing 4,096-pixel PNG cap make a 2,000-step overview too small for detailed reading; use the interactive view or zoomable SVG for details. Comparison currently preserves every source node without automatic folding. The existing single bundle includes layout engines (~2.33 MB minified) and Vite reports its size warning; the first-paint metric intentionally follows the established post-navigation click measurement. No schema fields, model-generated reconstruction or new package dependencies were introduced.
