# Hierarchy and live extension · 2026-11-12

This extends the DAG worktree based on `8e15cb4`, preserving React/Vite, existing CLI/layout/rendering and frozen v1 JSON.

## Behavior

**Steps** retains one node per source step and consecutive-signature folding. **Hierarchy** groups contiguous phase spans or adjacent repeated tool-signature sequences (period 1–8). A loop expands to iterations, then original calls. Message-only steps are not tool loops. Nonadjacent repeats stay separate. Source order increases along x; depth increases along y. Structural links represent containment; the existing temporal/dependency/retry edges map to the most specific visible representative. Internal edges remain in member details. Filtering follows contraction; it never reconnects hidden nodes. Source indices remain exact, including gaps and values above 2^53.

Inspector opens recorded text, arguments, observations and raw references, navigates original related steps, and clears filters when locating a relation. Group clearing resets both selection states. Step playback uses source ordinal. Comparison still uses independent step DAGs and exact action-sequence divergence against the first selected baseline. PNG/SVG and offline HTML use the same current graph projection.

Live mode tails completed local Codex JSONL items every two seconds, redacts and atomically republishes v1 data. SSE updates the existing resource cache. Pause/resume, reconnect feedback and refresh retry preserve inspection. Progress-only changes are pushed even when the dataset revision is unchanged. New layouts retain the last ready drawing, preserving the camera during live growth; explicit mode/filter changes rebuild the view. The zoom-continuity regression passed and the reviewer scored this fix resolved. Provider credentials stay in local process memory; no key is placed in the browser or persisted dataset. The watcher also masks an accidental literal echo of the configured soclaas key.

## Verification

- 75 Python tests; TypeScript and production build passed.
- 560 Kahn topological checks, including partial/full hierarchy expansion, filtering, source mappings and edge endpoints. Independent reviewer additionally checked 512 synthetic hierarchy states.
- 15 Chrome 157 scenarios passed, including hierarchy keyboard navigation at 390px, live growth/pause/resume, progress-only updates, failed-refresh recovery, existing compare/Sankey/export and offline checks.
- 500 / 2,000-step first paint: **97.4 / 377.2 ms**. Established click-to-visible-SVG plus next frame, fresh context per sample; excludes initial navigation/bundle loading. One sample each, not percentiles. 2,000 steps also zoomed, filtered and opened the last step.
- Both synthetic standalone reports opened offline with no HTTP requests or page errors.
- Existing bundle warning: 2,332.48 kB JS, 725.52 kB gzip.

Evidence: [desktop hierarchy](hierarchy-live/hierarchy.png), [390px hierarchy](hierarchy-live/hierarchy-mobile.png), [desktop live](hierarchy-live/live-stream.png), [390px live](hierarchy-live/live-mobile.png), [scenarios](hierarchy-live/scenarios.json), [timings](hierarchy-live/first-render.json).

The independent Impeccable reviewer returned **ship**, scoped to the synthetic hierarchy/live extension. All four material fixes were resolved; this is not certification of private runs or the whole application. The screenshot recapture corrected a malformed full-page image before review.

## Requested design skills

Installed outside the repository with skill-installer:

- [taste-skill](https://github.com/Leonxlnx/taste-skill), commit `f6b76575f949707b4e3c37cd86cb44b0b98643e8`.
- [Impeccable](https://github.com/pbakaus/impeccable), commit `b4bff1626c344067788c2679f048a20057c7cc5a`.

Applied Operate-mode density, clear containment/source-order copy, existing control/typography consistency, responsive stacking, and independent rendered review. These skills were not task-category filters and were not applied as NL2Repo task requirements. No skill assets or upstream implementation were copied. Impeccable context launcher initially failed; existing project context was read directly. Its detector reported only the incumbent Inter font warning, retained to preserve the established interface.

Taste gate: **GATE: OPEN 31 (rounds used up)**; no waivers. Its final round scanned the actual synthetic standalone report. The complete [open findings](hierarchy-live/taste-gate.md) include marketing hero/section rules, incumbent catalog treatments and bundled Cytoscape JavaScript misidentified as GLSL. The earlier bundled-viewer layout check timed out; the final gate completed. This gate is not claimed as passed; changing the existing analysis tool into a marketing page is outside this extension.

## Remaining limits

v1 has no distinct message role/reasoning channel, call-parent ID, call duration, proven file-access result or explicit causal-dependency field. Missing content displays as unrecorded. Dependency links retain the existing file/observation heuristic; structural links mean containment. Command-only paths cannot populate the explicit-file overview. In-flight calls appear after `item.completed`. Loop detection covers adjacent periods 1–8, not arbitrary semantic loops. Very long graphs require pan/search; PNG retains its 4,096px cap. Live refresh rebuilds the entire snapshot, so larger datasets may need incremental caching. Local capture outcomes and gateway failures are documented separately in [NL2Repo capture](nl2repo-capture.md).
