disposition: fix

## persistence

This is the full material review of the corrected desktop capture packet before the F1–F3 finishing batch. The subsequent verdict belongs in `verdict.md`; this record preserves the findings that required that batch.

Pass. `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` now persist the current pale three-page direction, default light appearance, saved dark preference, continuous panes, exact-source selection and frozen-v1 evidence limits. The sidecar parses as schema v2 and names the current reference/evidence paths. The prior dark four-page direction is clearly historical. `docs/research/three-page-hierarchy.md` persists THESIS, WORLD, STORY, FIRST VIEWPORT and FORM, including the user's pinned visual/first-surface requirements and `seed: none (pinned)`.

The only visual authorities are the supplied [Graph](../../design-references/three-page-hierarchy/graph.png), [Compare](../../design-references/three-page-hierarchy/compare.png) and [Replay](../../design-references/three-page-hierarchy/replay.png) originals. The direction is pinned; no additional concept roll or generated quality card is needed.

Evidence check 0 passes. All 49 local and 49 offline PNG files exist and their actual dimensions match `test-results/three-page/verification.json`. Both required desktop sizes, 1586×912 and 1280×800, are present. The Run DAGs capture has no blank tail. All 49 local states were visually inspected; 48 offline counterparts are byte-identical, and the differing offline status capture was separately inspected. Offline evidence records no page errors and zero HTTP requests. Mobile is outside this revision's review scope.

Supplied validation records show 80 Python tests, TypeScript/build checks, 26 browser scenarios and 746 DAG topology/mapping checks passing. The supplied first-render samples are 81.1ms for 500 nodes and 88.1ms for 2,000 nodes; these are individual local samples. The supplied detector result is `[]`. This reviewer did not open a browser, start a server, rerun tests or run another detector.

## fidelity

| Dimension / requirement | Observed result | Assessment |
| --- | --- | --- |
| TYPE — compact operating UI, readable evidence | Native sans UI, clear weight hierarchy and monospace code/output; evidence retains useful width at both desktop sizes. | Match. |
| MATERIAL — crisp product objects and recorded evidence | Real SVG brand/icons and graph geometry; actual commands, saved patch arguments, file reads and output. No decorative physical effects or reference sample data inserted into the product. | Match. |
| GROUND — pale workspace, near-white surfaces, blue-gray boundaries, dark text | Continuous light work surfaces and thin separators establish the requested reading environment. The saved dark preference remains available. | Match. |
| Selection and semantic color | Purple shell/list/tab selection, green success and red failure are retained, with written status and diff signs. The light SVG selection ring remains blue in this capture packet; one legend label is too pale. | Fix F1–F2. |
| Shared frame and entries | Product mark, breadcrumbs, local search/Cmd-K, status, help, preferences, six navigation entries, dataset/context, Run details, sharing and exports remain reachable. Low-frequency metadata is named rather than removed. | Match to the authorized hierarchy. |
| Graph first viewport and detail | Compact stages and one toolbar lead to a large source canvas. Layers, Legend and Agent activity begin closed; the unselected Inspector is empty. Details, Code Diff, Error Output, Context, Files & activity, Signatures, timeline, camera and export entries remain available. | Match apart from F1–F2. |
| Compare first viewport and complete evidence | Compact task/dataset/A-B selectors, three flat metrics and one shared alignment lead. Step comparison begins closed. Full A/B trajectories, snapshots, all six metrics/charts, findings, selected-patch evidence, final-patch/file tabs and 2–4-run DAG comparison remain named entries. | Match. |
| Replay first viewport and complete evidence | Source list, dominant central evidence and visible transport form one workspace. Step details and previews begin closed. Saved patch/file/context, output, details, reasoning-role qualification and raw references remain available. | Visual match; accessible tab names require F3. |
| Functional and data truth | Run ID plus exact source `idx` coordinates selection, URL, inspection and transport; repeated signatures keep distinct occurrences. Failure → patch → failed rerun → passing validation remains inspectable. Missing timestamps, patches, final files, agent identities, costs and pass rates are explicitly unavailable, distinct from recorded zero. | Match. |

The reorganization is faithful to the user's explicit hierarchy, which authorizes moving secondary reference content behind named controls. The source DAG's long linear shape and spare vertical area reflect the recorded serial topology; reproducing the illustrative parallel-agent branches would corrupt the evidence. Readable initial zoom, panning and Fit preserve that topology without making node labels microscopic.

## ceiling

The composition reaches the supplied quality bar for the pinned desktop Operate direction: each page has one dominant investigation area, consistent outer edges, restrained separators and a clear source-to-evidence path. Compare no longer competes with duplicate primary trajectories, and Replay gives saved evidence enough width while keeping transport visible. The remaining issues are bounded selection, contrast and accessibility defects. They do not require a different concept or structural rebuild.

## material_fixes

1. **F1 — Unify light graph selection:** change `frontend/src/graphDrawing.tsx:14` from blue `#2563eb` to the light selection purple `#7046d7`; preserve independent phase/failure strokes and the shared export renderer. Visible in `graph-after.png` and `graph-after-1280.png`.
2. **F2 — Restore light legend contrast:** override the inherited `frontend/src/workbench.css:210` first legend label `#c8abff` in light mode; “Reasoning / text” is only 1.96:1 on white in `graph-legend.png`, so use a text color meeting 4.5:1, such as `var(--accent)` at 5.92:1, while retaining suitable dark styling.
3. **F3 — Align Replay accessible names:** at `frontend/src/Replay.tsx:166`, remove or correct the stale `Workspace` and `Recorded text` aria-labels so the accessible names contain the visible “Updated File” and “File Context” labels; preserve their current evidence behavior.

## keep

- Keep the large Graph canvas, single shared Compare alignment and wide Replay evidence area, with secondary diagnostics behind their existing named controls.
- Keep exact run/source identity, source-order topology, individual repeated-signature occurrences and source-linked commands, patches, output and later validation.
- Keep honest unavailable states, explicit provenance, synthetic public fixtures and the separation between selection, A/B identity and recorded outcome.
- Keep the two desktop layouts, local evidence scrolling, persistent Replay transport, visible keyboard focus and focus restoration when detail closes.
