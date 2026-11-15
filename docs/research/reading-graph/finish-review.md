# Scope

Independent Impeccable finish review of the existing desktop Operate surface, dated 2026-11-15. The supplied direction contract substitutes for a new interview: logical content sections, horizontal calls within each section, inline expansion, exact run/source selection, pinned evidence, white canvas and the existing top navigation are fixed.

Read `PRODUCT.md`, `DESIGN.md`, `docs/research/reading-graph.md`, the Impeccable craft floor, geometry/routing/rendering, Graph camera and selection, evidence/provenance code, and relevant verification source. Viewed all 20 public PNGs and the authorized local current/prior captures at 1586×912 and 1280×800. Private observations are sanitized below. No browser, new capture, test run, product edit or private source-log inspection was performed by this reviewer. The build thread reports 48/48 Chrome scenarios, 81 Python tests, TypeScript/build success and the route/inline checks; those are supplied validation, not an independent rerun.

**Follow-up verdict pass, 2026-11-15:** limited to the three P1 corrections below. Re-read the changed renderer, exact-source relationship projection, source-jump wiring and focused regression definitions. Reopened content-groups, code-evidence and fullscreen at both desktop sizes, plus all four corresponding prior-routing baselines, for both public and authorized local evidence. Read the latest public/local `verification.json` records and `test-results/e2e/scenarios.json`; both sizes record endpoint contrast, forward/reverse keyboard continuation, multi-member boundary and exact-source checks as true, with zero page errors. Offline records show zero HTTP requests/page errors; all 48 smoke scenarios have `status=ok`. The build thread reports 948 topological sorts. This pass did not rerun those checks or open a new aesthetic audit.

# Findings

**Current status after the fix batch**

| Original finding | Status | Closure evidence |
| --- | --- | --- |
| P1-1: continuation contrast | **resolved** | `graphDrawing.tsx` now applies secondary opacity only to the path. Numbered controls have no faded ancestor; their 11px `palette.text` labels and `palette.muted` rings remain distinct in the new ordinary/fullscreen captures at both sizes. Existing hover/focus styling is no longer attenuated by the edge group. The regression checks control/parent opacity and label color. |
| P1-2: exact-source relationship counts after collapse | **resolved** | `graphData.ts::selectedRelationships` selects original dependency/retry edges incident to the exact source before mapping and aggregation; `RunGraph` uses that projection for scoped mode and keeps the full display graph for All relationships. The focused regression puts two distinct source contributions behind the same representative pair and asserts dependency counts 2 versus 3 and retry counts 1 versus 4, plus null selection, hidden endpoints and source immutability. |
| P1-3: reverse temporal boundary | **resolved** | Forward controls use the target's `first_idx`; reverse controls use the source interval's final `step_indices` member. The same exact index drives the accessible label, `data-jump-source`, click and keyboard callbacks through `onSourceJump` to `locate`. The browser regression checks both keyboard directions, exact Inspector/URL identity and a multi-member summary; the QA-500 case requires that boundary, and both latest desktop verification records report it covered. |

**Initial full-review findings — retained history, before the corrections above:**

1. **P1 — continuation controls lose usable contrast when another source or a section is selected.** In `frontend/src/graphDrawing.tsx`, the edge group at line 255 applies opacity `.42` to the numbered controls as well as the route. The 10px endpoint text therefore blends from `#273442` to approximately `#a4aab0` on white, about 2.3:1; its ring is fainter. This is visible in both public content-group and code-evidence captures, especially at 1280. These numbers now carry the cross-row reading path, so they cannot be treated as incidental background. The hover/focus circle styling in `surfaces.css` also remains inside the faded ancestor. Keep the numbered control, its text and focus state at usable contrast; apply secondary dimming to strokes independently. Preserve faint containment.

2. **P1 — collapsed summaries can overstate the exact selected source's relationships.** `RunGraph.tsx` lines 178–189 matches incident original edges to representative endpoint/type keys, then retains the already aggregated edge. `inlineExecutionGraph` in `executionMap.ts` lines 208–213 has already summed all original member contributions into those keys. When Collapse all keeps an exact source selected inside a summary, an incident relationship can therefore retain unrelated members' contributions and counts for the same summary pair. Derive the scoped dependency/retry projection from only the original edges incident to the exact selected source, then aggregate. Keep All relationships as the full projection. The current browser assertion checks representative incidence, so it does not cover this distinction.

3. **P1 — reverse continuation jumps can select the start of a summarized interval instead of the temporal boundary source.** `graphDrawing.tsx` lines 260–265 uses the representative node and its `first_idx` for both endpoint directions; `RunGraph.tsx` line 293 locates that first index. For a collapsed interval containing sources #10–#12 followed by #13 on the next row, the entry control's Return to action selects #10 even though the sequence edge leaves #12. Forward jumps correctly enter the next interval at its first source. Resolve the reverse jump and its accessible description to the source interval's last exact member, or retain the original edge boundary identity through projection. Cover both directions with a multi-member summary.

No additional material redesign requirement emerged. The new routing removes the conspicuous return strokes, isolates same-row sequence arrows, and keeps selected-source dependency/retry channels distinguishable. Content summaries, category silhouettes, failure outlines and supporting Inspector hierarchy remain coherent with the incumbent interface.

# Quality-bar comparison

The table records the initial full review. The verdict pass closes its three P1 qualifications using the evidence above. In the new captures, continuation pairs are legible without competing with the selected source; short sequence strokes and faint containment remain intact. Moving the verification helper after the evidence shots restores matching expanded frontiers for the before/after pairs. Camera framing and geometry can still differ, so these support a same-frontier reading comparison rather than a pixel-identical composition claim.

| Bar | Assessment |
| --- | --- |
| Requested reading flow | The initial full-width overview and inline section bands use horizontal space and preserve context. Paired endpoints are a sound response to the rejected long return routing, subject to finding 1. |
| Exact source and evidence access | Inspector source IDs, source search, Collapse controls, keyboard endpoint activation and on-demand inspection are present. Findings 2–3 must close before the exact-source relationship/continuation claim is reliable in collapsed states. |
| Time and Code Diff | Source truth is respected. The authorized real-run evidence has 87 steps, zero timestamps, zero native patches/safe derived comparisons and five literal-write steps. Missing time is explicit; full diff is disabled when unavailable. Public native-patch captures visibly render signed additions/deletions. Submitted comparisons show both source IDs and state that filesystem versions were not recorded; submitted file content has a separate label. Online and offline captures agree. |
| Incumbent system and craft floor | White workspace, quiet panes, existing type/color roles, semantic status and top-only navigation are preserved. No new decorative system is needed. The endpoint contrast failure is a local craft-floor defect. |
| Before/after evidence | Current captures are qualitatively calmer. Selected-source before/after captures have different expanded frontiers because the verification helper opened an extra branch; they cannot support a strict same-frontier pixel comparison. |

# Decision

**Disposition: ship**

The three reviewed P1 issues are resolved. Ship this narrow correction batch within the existing desktop scope. No partial or unresolved item remains from that batch. This verdict does not extend the original review to additional surfaces, themes, devices or new product behavior.

**Initial disposition: fix — retained history.** The original requested batch was:

Complete one narrow batch: retain full-contrast continuation controls and focus states; project scoped dependency/retry counts from original exact-source edges; resolve reverse continuation jumps to the actual last boundary source. Add focused regressions for collapsed summaries, shared representative pairs, and both continuation directions. Then recapture the affected desktop states with the connection helper running after evidence shots, preserving the same expanded frontier for comparison, and review those results. The composition and evidence-provenance approach do not require replacement.

# Remaining limitations

This review does not independently exercise controls or certify assistive-technology behavior; interaction evidence comes from source and the build thread's supplied verification. No new mobile composition, browser-engine comparison or dark-theme pass is claimed. Explicit Fit can make a long expanded trace too small to read at 1280; Locate/source selection restores a reading scale, and local evidence remains available. All relationships may still be dense by design. Unrecorded timestamps, native patches and filesystem versions remain unavailable rather than inferred. Questions skipped: this is a bounded reviewer subtask under the already supplied user direction.
