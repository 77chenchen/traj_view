# Analytics and one-click Graph collapse · 2026-11-15

## Direction and scope

This is an Operate surface inside TrajViz's existing neutral workbench. The same top navigation, white surfaces, blue-gray selection, source identity and typography remain. The main question is which recorded runs need investigation, with a short route back to the source graph. There is no new visual identity or schema change. Public captures use the existing labeled synthetic fixtures in `fixtures/input`.

Analytics previously displayed one large phase-flow chart with unused space alongside it. It now leads with a group comparison table, a four-item flat summary and a selected-group review column. Phase flow and source run records follow in the normal document scroll. Secondary content has named disclosures; no nested metric cards, new app rail or decorative motion was added.

Implementation: [Sankey.tsx](../../frontend/src/Sankey.tsx) derives the analytic surface from saved summaries; [analytics.css](../../frontend/src/analytics.css) owns its composition; [RunGraph.tsx](../../frontend/src/RunGraph.tsx) separates canvas representatives from inspected sources. [Browser cases](../../tests/e2e/analytics.mjs) are integrated into the existing smoke command; [the dedicated verifier](../../scripts/verify-analytics.mjs) reproduces the public report checks and captures.

The user's “one-click collapse” refers to expanded Graph nodes. **Collapse all** is now in the persistent graph tool band, alongside Layers and Legend, in ordinary and fullscreen views. It resets Overview, Hierarchy and repeat-block expansion to the compact Overview without changing filters, exact inspected source, playback position or the chosen evidence tab. Root Overview disables the button with “All sections are already collapsed.” Collapse last / Alt+↑ and individual section headers still work. A collapsed display representative no longer inserts its member list above a selected original call's Inspector, so the pinned patch remains in view.

## Function map

| Function | Entry and initial state | Data / behavior | Verification |
| --- | --- | --- | --- |
| Search and outcome scope | Find runs, Outcome status | Case-insensitive run/task/model/condition/agent metadata; explicit true/false/null pass status | Scoped counts recomputed, empty-filter recovery |
| Summary | Four flat values | Run count, recorded pass rate, median source steps, sum of saved repeated actions | Recomputed against the dataset; unknown and recorded zero differ |
| Group comparison | Primary table; six rows per page | Model / Condition / Outcome, ordered by run count then label | All groupings, pagination and keyboard selection |
| Outcome distribution | Count bar and three values | Passed / not passed / unrecorded in legend order; each bar normalized within its group | Explicit counts and accessible labels; unknowns retained |
| Review signals | Selected-group column and error-count links | Saved error rate > 0, validation-after-edit strictly false, max_steps_hit | Opens matching run records and focuses their summary |
| Run records | Closed until requested | IDs/tasks, original outcome label, steps, repeats, error rate, saved validation flag, recorded wall time | Signal filter, empty signal, exact run → Graph |
| CSV | Export CSV | Existing metric exporter; all runs in the current search/outcome scope | Downloaded row count and IDs checked online/offline |
| Phase flow | Open below the group table | Existing two-layer Sankey and phase palette; group selection shared with the primary table | Existing self/reverse links and shared-scale tests retained |
| Side by side | Phase-flow controls | Two distinct groups, same pixels per transition; count tables scroll locally | Both charts rendered, legacy scale assertions retained |
| Definitions | Closed disclosure | Denominators, repeats, errors, validation, transitions, comparability | Open-state screenshot and source review |
| Collapse all | Graph toolbar in every detail mode | Clears expanded sections/groups/blocks; returns to root Overview | 1586×912 / 1280×800, ordinary/fullscreen, short/long runs |
| Pinned evidence after collapse | Inspector retains current call | Exact source `#10000000000000053`, original patch, Code Diff tab and playback | Same SVG, root IDs restored, no member list displacing the patch |
| Offline / themes / empty data | Same page in exported HTML | Bundled assets; inherited light/dark tokens; explicit no-data state | Network blocked, dark capture, empty synthetic index, 390px overflow compatibility |

## Screenshots

All files are independent, full-page Chrome PNGs from the document top; fullscreen Graph captures use the complete fullscreen surface. No collage, visual overlay or reference-image substitution is used. The group list is a document workspace, so a complete Analytics capture is taller than the viewport. At 390px, wide tables and the flow scroll locally. This is compatibility verification, not a new mobile composition.

| State | 1586×912 | 1280×800 |
| --- | --- | --- |
| Previous Analytics, commit `e67113d` | [Before](analytics-workspace/analytics-before-1586.png) | — |
| New Analytics | [Overview](analytics-workspace/analytics-1586.png) | [Overview](analytics-workspace/analytics-1280.png) |
| Expanded Graph with selected patch | [Before collapse](analytics-workspace/collapse-expanded-1586.png) | [Before collapse](analytics-workspace/collapse-expanded-1280.png) |
| Same selected patch after Collapse all | [After collapse](analytics-workspace/collapse-restored-1586.png) | [After collapse](analytics-workspace/collapse-restored-1280.png) |
| Offline Analytics | [Offline](analytics-workspace/offline-analytics-1586.png) | [Offline](analytics-workspace/offline-analytics-1280.png) |
| Offline collapsed Graph | [Offline](analytics-workspace/offline-collapse-restored-1586.png) | [Offline](analytics-workspace/offline-collapse-restored-1280.png) |

Additional states: [error run records](analytics-workspace/analytics-error-records.png), [two groups](analytics-workspace/analytics-two-groups.png), [definitions](analytics-workspace/analytics-definitions.png), [dark](analytics-workspace/analytics-dark.png), [empty dataset](analytics-workspace/analytics-empty.png), [390px compatibility](analytics-workspace/analytics-390.png). Offline expanded and review states are also in the same directory. [Capture manifest](analytics-workspace/capture-manifest.json) records source, dimensions and hashes.

## Reproduce

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html
# Separate terminal, if not already running:
python -m backend.cli serve out
node scripts/verify-analytics.mjs
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

Open <http://127.0.0.1:8765/#view=sankey>. Select a model, click its error count, then open a run's Graph. To reproduce collapse, open `execution-long-synthetic`, find `#10000000000000053`, select Code Diff, enter fullscreen and click Collapse all. The source and patch remain; the canvas returns to its three root sections. Fit remains available for an all-root view at smaller canvas heights.

## Verification and boundaries

The browser assertions and exact delivered-HTML checks are saved in [verification.json](analytics-workspace/verification.json). The full regression summary is in [test-summary.json](analytics-workspace/test-summary.json), with the full [scenario list](analytics-workspace/scenarios.json).

Final results: **81 Python tests (3.98s)**, TypeScript, build (**7.97s**) and **44 / 44 Chrome scenarios** passed. The pure checks retain 909 DAG sorts, 1,908 execution scopes / 3,161 exact source paths / 5,189 routes, 61 inline states / 1,735 routes and 126 Timeline layouts. The exact offline report made **0 HTTP requests / 0 page errors**. First graph paint at 500 / 2,000 source steps was **97.6 / 130.5ms**, initially three Overview nodes, measured after app load from click to SVG and the next frame; these are not all-source-node or initial-bundle timings. The mechanical detector returned `[]`. Public-server screenshot tests and the smoke suite's generated zero-step case both passed. An initial focus assertion ran before the requested animation frame; it now waits for the real focused destination. A screenshot also exposed the collapsed group member list displacing the patch; source/canvas identity was separated and the final suite rerun after that correction.

The [fresh finish review](analytics-workspace/review.md) returned **Ship**. Its sole minor count-wording observation was resolved, then type check/build and the exact-root local/offline specialist suite were repeated with all captures refreshed. The 44-scenario result precedes only that singular-noun copy adjustment. The existing DESIGN.md and its token definitions are retained because this surface extends the established world.

No absent outcomes become failures. Recorded pass rate excludes unrecorded status and is not a test-case pass rate. Repeats are repeated normalized action signatures, not recorded retry attempts. Validation-after-edit does not imply a successful validation. Medians and distributions can mix tasks and budgets; the page states that limitation and leaves same-task interpretation to Compare. Only saved wall time is shown; absent time stays Unrecorded. Per-call duration, attempt count, cost and test-case pass rate are not added to v1. Analytics uses index summaries only and loads step evidence when opening Graph. Group search is metadata-only; Datasets retains the existing full-text search.

The layout preserves the system's source colors and existing dark appearance. Existing bundle-size warnings remain. A collapsed source can be represented by its parent on the canvas while its original call remains in the Inspector. Collapse all intentionally returns to Overview rather than staying in Steps or Hierarchy; those views remain under Layers. No new key, model capture or private data was used.
