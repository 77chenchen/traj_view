disposition: fix

## Direction/fidelity

Fresh full review of the current four-reference implementation; no earlier verdict was adopted. The pinned direction is corroborated by the original brief: dark navy default, purple selection, product topbar, left navigation, and four specified operating compositions. `PRODUCT.md`, `DESIGN.md`, and the surface contract describe the built world. This is a code-led implementation of user-provided designs; generated comps and build-phase state are not required evidence.

| Element | Assessment | Evidence |
| --- | --- | --- |
| Shared shell and wayfinding | Match | The four 1586×912 product captures retain the brand/breadcrumb/search bar, correctly ordered left navigation, active purple state, dataset context, title, and metadata band. Browser chrome is correctly excluded. |
| TYPE | Match | Compact system sans, monospace evidence and measurements, distinct title/panel/control hierarchy, and restrained spacing follow the pinned operating interface. The brief expressly authorizes this compact system typography. |
| MATERIAL | Match | The UI is rendered React content: actual selectable diagrams, charts, terminal output, JSON, patch gutters, and syntax-colored code. No reference screenshot or decorative imitation substitutes for product content. |
| GROUND | Match | The built main field samples RGB 12/16/33; sampled reference fields are 14/19/38 and 13/19/38. The slight darkening preserves the reference's near-black navy temperature and panel separation. Purple, green, red, blue, and yellow retain their stated meanings. |
| Compare | Match with required adaptations | Seven metrics; A / alignment+patch / B / findings+six charts; green/purple identity; five/six snapshot positions; and exact source selection are present. Recorded Patch and explicit missing full versions/cost/pass rate are required by the frozen data contract. Bounded signature LCS and the separate original first-divergence offset are disclosed in the UI/source. |
| Graph | Match with required adaptations | Six previews, dotted source DAG, layers/camera/export controls, activity panel, and right inspector retain the requested composition. Source DAG relationships and point activity legitimately replace invented agents, durations, attempts, and concurrent bars. The expanded mobile inspector is visibly present in its named capture. |
| Timeline | Match with required adaptations; one contradiction | Five previews, six lanes, phase bands, event log, and inspector are present. Timestamp points and ordinal fallback are honest adaptations. However, a final-message tag becomes a green “Success” phase without a recorded successful outcome; see F1. |
| Replay | Match | Six previews; trajectory / widest selected evidence / details; selected patch and terminal; synchronized purple selection; and persistent transport are visible. Failure, long evidence, zero steps, and mobile inspection retain usable regions. |
| Responsive composition | Acceptable adaptation | At 1280 the dense compositions retain their reading order and local scrolling; at 390 the rail becomes icons, previews scroll, Compare stacks, and inspection becomes an accessible panel. Replay's dock remains visible. These changes are authorized by the brief's narrow-screen requirement. |
| Source role naming | Contradicted in a limited shared component | The current Planning preview shows a generic recorded task while the same trajectory source is correctly called Recorded text. `stagesFor` also assigns test/patch names from broader failure/edit predicates. The fixed role slots do not authorize asserting an unrecorded role; see F2. |

The reference's finish is carried by aligned evidence regions, compact borders, consistent selection, and working source content. No material asset or composition replacement is needed. Preserve those qualities through the correction batch.

## Functional/craft findings

The supplied browser evidence supports all four operation chains: Replay failure → patch → failed rerun → passing validation with seek/speed/play; Graph layers/zoom/hierarchy/context/activity/fullscreen; Timeline scale/filter/three-way selection; and Compare run selection/divergence/signature linking/patch modes/three DAGs. Search, help, share, download, exact large source indices, and the mobile inspector geometry are exercised in `tests/e2e/four-reference.mjs`.

The saved verification reports zero page errors, zero offline HTTP requests for the exact root report, and no document overflow at all 16 named viewport/view combinations. The current full smoke report contains 22 successful scenarios. The current first-paint samples are 82.7 ms at 500 nodes and 104.3 ms at 2000 nodes, with bundle loading excluded. These functional results do not establish the correctness of the role/outcome labels identified below.

The captures show coherent error, selected, unavailable, empty, and overlong-content states. Source/CSS provide one SVG icon system, explicit focus and hover treatment, palette-based browser surfaces, and reduced-motion handling. The navy panels, purple selection, and compact type are brief requirements, not marketing-style defects. No additional material visual-craft fix was found in the supplied captures.

## Material fixes

1. **F1 — P1: Separate completion from success in Timeline phase bands.** `frontend/src/Timeline.tsx:49` maps every nonfailed `final_message` to `Success`; the phase rendering then gives it `phase-success` styling. A final-message tag establishes a final record, not a successful run or passed test. Use a neutral Final Answer/Completion band for that tag and reserve successful treatment for recorded success evidence. The existing `dag-baseline` final message at exact source `#9007199254741049`, whose outcome is merely synthetic and has no passed flag, is a suitable regression case. Verify that it remains neutral while the recorded successful validation still shows its successful status. Keep exact selection and point positions unchanged.

2. **F2 — P2: Bound shared role labels to the source evidence.** In `frontend/src/Evidence.tsx:85–95`, the first arbitrary nonaction becomes Plan/Planning, any failure becomes Test Failure/Failed Test, and any edit becomes Code Patch. The current Replay/Graph preview visibly demonstrates the first case: a task instruction is labeled Planning while its trajectory calls it Recorded text. Preserve all five/six reference slots, but use an honest neutral source label/qualification when supplying broader evidence, or leave the specific role unrecorded; use test-failure and patch wording only when the record supports it. Also visibly qualify Timeline's Reasoning lane as recorded text, since its predicate is any `thought` and v1 does not distinguish a reasoning role. Verify generic text, a non-test tool failure, an edit without a saved patch, and a final message without passed validation. Existing genuine test/patch previews should retain their specific labels. Update the acceptance mapping for these corrected adaptations.

Apply F1 and F2 as one bounded correction batch. No new imagery, schema fields, inferred agent hierarchy, or replacement layout is needed. Rebuild and recapture the same required viewport/state files, then return the corrected evidence for a verdict on these two findings.

## Evidence/limits

Opened all four original 1586×992 reference images and all **26 named current captures**: the 16 Compare/Graph/Timeline/Replay viewport captures at 1586×912, 1586×992, 1280×800, and 390×844; Replay failure; three Compare mobile detail captures; three mobile inspector captures; missing data; empty Replay; and long evidence. Every named capture is valid for its stated view/state. The 16 viewport dimensions also match their filenames. None requires recapture because of malformed evidence.

Read the original prompt, direction contract, product/design truth, acceptance checklist, craft floor, primary evidence/Timeline/Replay/Inspector/Compare source, the four-reference test and verification runner, and saved verification/scenario/detector/taste-gate results. The detector result is `[]`. The taste gate says **OFF**, which is not a pass. Python's 79 tests and type/build success were reported by the build thread; they were not rerun by this reviewer.

This is a screenshot/source/test-result review. No browser, server, application mutation, second detector, or independent runtime test was run. Focus behavior, screen-reader interaction, every possible imported trace, and exhaustive contrast across all states are outside the evidence checked. No historical workbench/taste verdict is used as approval for this redesign.

## Disposition

**fix** — The current four-page visual direction and supplied responsive evidence hold. F1 and F2 remain material source-truth corrections; this review does not authorize describing the current implementation as fully accepted until they are resolved.
