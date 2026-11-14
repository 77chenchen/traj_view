# Architecture

```text
Input logs → adapters → canonical trajectory → phase rules
                          ↓                    ↓
                  raw source + inspector     graph + metrics → index and run files
                                                                   ↓
                                                    Vite / React viewer and offline HTML
```

`trajviz build` is a local batch command. The viewer loads summaries immediately, graphs when selected, and step contents and text search data on demand. Outcome labels belong to the source. The build can apply redaction to both canonical and derived data. The static server binds to localhost by default.

## Decisions

- Use Python 3.11+, Pydantic 2, Typer and PyYAML. The package registry was inaccessible in the default shell. An approved install made project-local dependencies available.
- Vite, React and TypeScript serve the viewer. Cytoscape runs the graph layouts. ELK handles small graphs and Dagre handles larger graphs. Accept layout output only if node x coordinates increase in source order. Use a deterministic horizontal time axis for more than 180 nodes, more than 700 edges, invalid/reordered layout results or engine failures; it never wraps into reversed rows. D3 Sankey uses time layers so repeated transitions and reverse phase transitions remain visible without introducing a cycle in the Sankey input.
- Step details and full text are outside the run index. A standalone report embeds the files and frontend assets without making network requests.
- Expanded temporal edges form a forward chain. Dependencies and retries are also forward edges. Aggregate edges preserve their types and frequencies. Structural edges are reserved for optional hierarchy overlays.

- Main graphs always use Expanded (or a contraction of its consecutive signature intervals). `graphData.ts` contracts before filtering, removes internal edges from the display and preserves exact member indices. Inspector obtains internal edges from the unchanged Expanded data. Aggregated is used only for frequency/cycle summaries and metrics. Comparison retains every expanded occurrence and shares the same renderer, encodings and export path.
- Recorded activity loads the existing step payload on demand and shares the data cache with Inspector. File target links clear step filters, seek by source ordinal and focus the relevant node. Playback uses ordinals rather than arithmetic on source indices or timestamps.


## Hierarchy and local live ingestion

`frontend/src/hierarchy.ts` derives ephemeral phase/loop/iteration/call DAGs from Expanded. `RunGraph` owns expansion and exact source selection; `Inspector` navigates original edges. No hierarchy state is persisted into v1 JSON. Containment is separate from the existing file/observation dependency heuristic.

`backend/live.py` watches Codex JSONL, applies labels/redaction, then uses the existing atomic dataset publisher. `backend/server.py` exposes loopback status and SSE. `LiveStatus` invalidates the existing data cache; refresh failures keep ready data mounted. Codex alone calls the configured provider with its inherited credentials. The viewer has no endpoint for entering keys or executing arbitrary commands.

`capture-nl2repo.py` selects fixed public requirements and runs isolated CLI workspaces. Capture progress and provider failures remain private metadata. `summarize-nl2repo.py` emits counts without prompts or trace content. `verify-live-capture.mjs` writes local browser evidence under the ignored private directory.

## Coordinated dashboard views

`main.tsx` owns per-run exact source selection across Replay, DAG and Timeline. `Replay.tsx` explicitly loads the existing graph/step payloads when opened, sharing the cache with Inspector. Code panes render recorded patch arguments or content/read excerpts without filesystem access. Personal annotations are browser-local and have an explicit JSON export. The replay dock stays in the viewport; playback scrolls only the event list, preserving document position.

Timeline projects complete monotonic timestamps as event points, otherwise source ordinals. Lanes categorize recorded evidence and never synthesize duration or concurrency. Compare's primary bounded-LCS alignment, legacy action-offset rows and graph nodes share signature selection; repeated calls remain distinct. These are frontend projections with no persisted contract changes. All views use the same embedded-file reader in offline HTML.


## Four-reference workspace

`Evidence.tsx` supplies source-backed metadata, snapshot roles, syntax-colored recorded excerpts and outcome/time helpers. `Timeline.tsx` owns shared scale geometry for six lanes and the source-aware activity projection. `workbench.css` overrides the earlier shell with the pinned dark navy/purple topbar and left rail. `main.tsx` synchronizes exact source/run selection and hash navigation across all views, including comparison selections.

The server's `/api/report.html` uses the existing exporter in a temporary directory and streams the standalone result as an attachment. It does not write sidecars to the served dataset or expose credentials. The same React UI runs online and from embedded files; no remote font, screenshot UI or generated metric placeholder is required.
