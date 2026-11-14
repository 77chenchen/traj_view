# Four-reference acceptance checklist

References were opened at original 1586 × 992, then top, left, centre, right and bottom crops were opened for all four. Browser chrome is excluded. This handoff explicitly replaces the earlier light workbench direction.

Legend: [ ] pending; [x] browser-verified; [~] documented adaptation. Source indices remain exact strings where required. “Unrecorded / 未记录” retains absent modules rather than inventing data.

## Shared shell — all four images
- [x] S01 Top navy product bar: layered purple/blue icon, Agent Trajectory Viewer name, divider, Runs / ID / view breadcrumbs; local navigation links.
- [x] S02 Right search icon/input/⌘K, notifications, help, round avatar; working local search, status/help and theme actions.
- [x] S03 Left rail, Replay → Timeline → Graph → Compare → Analytics → Datasets; stroked icons, purple active rectangle, hover/focus.
- [x] S04 Rail bottom Current Dataset selector and context: run outcome/duration/steps/result or A/B selected runs with green/purple identity.
- [x] S05 Purple circular view icon, title/subtitle; metadata band with terminal, ID, source status, task, agent/model, recorded date/duration, Share and more/export.
- [x] S06 Near-black navy ground, raised navy panels, blue-gray 1px borders, modest 8px corners, compact sans typography, tabular monospace measurements, consistent colors.
- [x] S07 Selection shared via stable run ID + exact source idx; URL hash deep links preserve view/run/source/comparison.
- [~] S08 Keyboard tooltips/focus, source-backed missing states, local scroll; 1586 product region, 1280 and 390 responsive evidence.

## 01 Compare — product region y≈60; rail≈170; content≈1400
- [x] C01 Arrow circle/title/subtitle; task/dataset band; green A and purple B dropdowns, run ID/status/chevron; same-task 2–4 selection.
- [x] C02 Seven cards in order: Overall, Duration, Tool Calls, Retries, Tokens, USD Cost, Test Pass Rate. Icon/title/summary; common-scale A/B bars with exact values, zero and missing values.
- [~] C03 Four columns in order A (≈22%), alignment+patch (≈33%), B (≈22%), findings+charts (≈23%); matching header/border alignment.
- [x] C04 A/B identity, outcome, model, steps/retries/duration. Vertical trajectory line, ordinal/title/summary/time/result; click selects exact source and matches signature.
- [~] C05 Stage Snapshots sections with terminal window dots, numbered names, tags and code/error/pass previews; source-backed five/six positions or explicit unavailable slot.
- [~] C06 Alignment title, Aligned/Diverged/Rejoined legend, A/B capsules, paired event cards, directed solid/dashed connectors, divergence/rejoin notes.
- [x] C07 Matching criteria exposed: equal normalized action signatures in source order, bounded LCS for insertions, exact first-divergence offset unchanged; outcome/observation differences remain distinct.
- [~] C08 Final Patch: Unified Diff / Agent A (Final) / Agent B (Final), file/path/line gutters/+/−/syntax/copy; complete versions unrecorded when absent.
- [x] C09 Summary & Key Findings outer title, inner findings, purple bullets, computed efficiency/outcome/divergence findings only.
- [x] C10 Six mini charts in 2×3: duration seconds/tools/retries/tokens K/USD/pass rate; axes/ticks/A-B/value labels/green-purple shared scales; missing cost/pass-rate marked.
- [x] C11 Independent DAGs, exact two-sided first divergence, signature linking, phase bands/Jaccard/full metrics/CSV remain accessible.
- [x] C12 Chain: change A/B → divergence → paired selection → patch tabs; 1280/390 and missing data.

## 02 Graph — product region y≈66; rail≈185; inspector≈345
- [~] G01 Run metadata + Function-Call Phases label/count and six previews: Planning, Investigation, Failed Test, Code Patch, Re-run, Passed Tests; number/time/content/source selection.
- [x] G02 Main execution panel and lower activity panel share left bounds; Node Inspector spans both at right.
- [~] G03 Graph/Timeline control; Layers selector; independent Agents/Reasoning/Tool Calls/Results checks; Legend button and existing edge/filter/hierarchy controls.
- [x] G04 Dotted canvas, left vertical zoom/fit/fullscreen/hierarchy controls, search and PNG/SVG. Source DAG uses arrows, compact type/icon/status cards and retry dashes.
- [~] G05 User Task/Reasoning/Tool/Failure/Retry/Merge/Completion legend and semantics; absent subagent/merge nodes explained, never fabricated.
- [~] G06 Activity title/info/total note, By Agent/By Category selector and expand; row labels, Total Active unrecorded, shared ruler/grid, clickable point marks, failure stripes.
- [~] G07 Inspector title/icon/prev/next; Node/Type/Status/Time/Attempts; Details/Code Diff/Error Output/Context tabs.
- [~] G08 Description, Related Code Diff with View Full Diff, prior error output and Context collapsibles; actual patch line numbers and error text.
- [x] G09 Relevant files/upstream/downstream/messages counts and Show jumps; original member/internal-edge expansion and raw refs retained.
- [x] G10 Chain: layers → zoom → node → context → source jump; filtered/folded/expanded topology and exports remain correct.

## 03 Timeline — product region y≈80; rail≈215; inspector≈350
- [~] T01 Stage strip: previous/next arrows, heading/info/explanation, five source-backed Plan/Failure/Edit/Retry/Success positions, number/time/monospace and purple current outline. Specific roles use neutral source labels when the record is broader; missing roles stay disabled.
- [x] T02 Main title/run ID; Fit/1m/2m/5m/zoom/Stages/Events/fullscreen. Ruler/grid/phase boundaries share one scale.
- [~] T03 Arrow-ended phase bands, red failure/green pass; six lanes ordered User Task, Reasoning, Tool Calls, File Changes, Sub-agents, Final Answer with icons.
- [~] T04 Event point labels/path/diff counts/status, selectable stages and event marks, internal horizontal scroll; width and position scale together, ordinal fallback.
- [x] T05 Event Log count/search/category/status; #/Timestamp/Category/Event/Status/Duration, alternating rows, monospace time, explicit failure, purple selected outline.
- [~] T06 Right Event Inspector header/prev/next; error icon/title/description and Timestamp/Duration/Category/Status/Tool.
- [~] T07 Arguments numbered JSON/highlight/copy; Output/Stderr with error/test summary/copy; Analysis recorded quote or evidence-bounded diagnosis.
- [x] T08 Chain: scale → failed filter → row → snapshot/lane/Inspector synchronization; empty lanes/data remain visible.

## 04 Replay — product region y≈80; rail≈215; body ≈350/620/340
- [~] R01 Six snapshot positions Plan/Tool Call/Test Failed/Code Edit/Re-run/Success, numbered capsules, actual terminal/patch previews, red/green and purple selection; role wording is limited to saved evidence.
- [x] R02 Three aligned panels: Trajectory, widest selected Step evidence, Step Details; pane-local scroll.
- [x] R03 Trajectory count, ordinal/vertical connector/category icon/title/summary/time/status, full-row purple current selection; source identity discoverable.
- [~] R04 Selected step header ordinal/tool/type badge/time/delta and description; file icon/path/−/+; code line gutters/syntax/context/red/green.
- [x] R05 Evidence tabs Diff/count, Updated File, File Context; Copy/expand; terminal/tests/text for corresponding current record. Never fabricate a filesystem version.
- [~] R06 Step Details ID/type/time/status/description/edit counts/files/recorded reasoning quote, source references/arguments/notes available in collapsibles.
- [x] R07 Full-width bottom dock, previous/purple round play/next/elapsed-total/progress/source reading/speed/panels/fullscreen; seek/step/play-to-end all real.
- [x] R08 Chain: failure → patch → failed rerun → passing validation; all panes/source URL/playback agree.
- [x] R09 Desktop first viewport includes all panels and dock; long evidence, no steps, mobile inspection/dock and offline zero HTTP requests.


## Recorded adaptations and source mapping

All items above have been exercised or visually checked in the current revision. `[~]` means the region and operation exist, with a deliberate source-data or responsive adaptation below; it is not an unimplemented placeholder.

| Items | Actual behavior / evidence boundary | Implementation / input |
| --- | --- | --- |
| S01–S07 | Shared product bar, left rail, local search/status/help, dataset context, metadata, exact hash navigation. | `main.tsx`, `Evidence.tsx`, index/search/steps payloads |
| S08, C03 | Desktop keeps the reference column order. At <=1000px inspection is optional; Compare stacks for narrow screens and its long content scrolls inside main. Extra mobile captures show trajectories, alignment, charts and inspection. | `workbench.css`; four-reference browser geometry and operation chains |
| C01–C04, C09–C12 | Same-task 2–4 runs, metric cards/charts, source trajectories, actual findings, independent DAGs, Jaccard and original first divergence. Retries are graph-edge frequencies; cost/pass rate have no v1 field. | `Compare.tsx`; run summaries, expanded graphs, recorded observations |
| C05–C06 | Five/six evidence-role positions; unavailable roles stay visible. Generic text is Recorded Text, non-test failures are Tool/Recorded Failure, edits without patch arguments are File Edit, and a first validation is not labeled a retry. Genuine test failures and patches retain their labels. Primary alignment uses normalized action signatures, deterministic bounded LCS with disclosed ordinal fallback. Rejoined means signature alignment after an insertion/deletion, not semantic or causal convergence. | `Evidence.tsx`, `Compare.tsx`; explicit step content and original signature sequence |
| C08 | “Final Patch” is labeled Recorded Patch. Unified mode compares saved patch arguments; A/B Final states explicitly report missing complete content. No repository checkout is synthesized. | `patchText`, `fileContent`, `RecordedCode`; `action.args`, `action.command`, read observation |
| G01 | Six evidence positions preserve the reference composition. Planning requires a plan-category action; broader text uses Recorded Text. Test names require normalized test calls; saved patch arguments justify Code Patch. Other edits use File Edit, and Re-run requires an earlier failed matching validation signature. A zero-exit validation supplies the successful slot; absent evidence stays disabled. Previews show point timestamps, not start/end intervals. | `stagesFor`, normalized nodes and recorded step fields; `role-boundaries` regression |
| G02–G04, G09–G10 | DAG plus activity at left and source Inspector at right. Layers, camera controls, files, upstream/downstream jumps, messages, original members and internal edges are functional. Camera controls occupy a separate gutter so mobile nodes remain clickable. | `RunGraph.tsx`, `GraphView.tsx`, `Inspector.tsx`, `graphData.ts` |
| G03, G05–G08 | Per-step agent IDs/parents, call durations and attempts are unrecorded. Agents toggle is disabled with a reason; no Planner/Coder topology is invented. Activity shows points for the actual run-level agent/category and marks failure. Dependencies are existing file/observation heuristics; structural links mean containment. Prior failure is identified as an earlier source, not proven same-call ancestry. | Frozen v1; existing expanded edge types; explicit unavailable status |
| T01–T05, T08 | Five snapshots, six lane labels, shared scale presets/zoom/grid/markers, phase bands and filtered Event Log coordinate exact source selection. Reasoning is visibly qualified as recorded text. Final-message phase is neutral Completion; green Validation Passed requires a saved zero-exit validation with no error. Marker width scales with divisions at 1×/2×/8× and 1m/2m/5m. | `Timeline.tsx`, `Replay.tsx`; complete monotonic `ts` or ordinal fallback; exact-index and role-boundary regressions |
| T03–T04 | Sub-agents lane remains empty with a reason. Event points replace duration bars; phase bands bridge event positions without asserting concurrency. | v1 lacks per-step agent/duration; lane overlap means multiple evidence types |
| T06–T07 | Arguments and output/stderr preserve source text/exit flags with copy and highlighting. Duration stays unrecorded; Analysis is recorded text because message/reasoning roles are not separate. | `Inspector.tsx`; `action`, `observation`, `thought`, `raw_ref` |
| R01–R09 | Snapshots, trajectory, central evidence, terminal/tests, step details, source links/notes and dock synchronize. Failure→edit→failed rerun→pass, direct failure deep link, playback/seek/speed and evidence tabs run online/offline. Long evidence and zero steps retain usable regions. | `Replay.tsx`, `Inspector.tsx`, workbench/four-reference browser suites |
| R04, R06 | Timestamp delta is the gap to the previous recorded event, not duration. Patch gutters use explicit hunk coordinates or excerpt indices. Files Changed means explicit saved patch targets; other records say File Targets. Agent Reasoning is visibly qualified as recorded text. | Existing step fields; no file snapshot or distinct reasoning channel added |

Captures: `four-reference/{compare,graph,timeline,replay}-1586x912.png` (product area), corresponding `-1586x992.png`, `-1280x800.png`, `-390x844.png`, and mobile evidence/detail variants. Tests and exact results: [verification](four-reference-verification.md).
