# Independent contract review

All requested views are implementable with the frozen schema using step-order playback and client-side exports. Several behaviors need a shared contract so different implementations produce the same results.

- **Run list and search.** Index summaries support multi-filters, and `search.json` supports lazy text and regex search. Specify filter combination rules, indexed fields, regex behavior, and run-ID uniqueness across adapters.
- **Graphs and playback.** Both graph views and edge-type toggles have the required fields. Edge inference rules and expanded node-to-step cardinality are unspecified. Use sorted steps for playback because indices can have gaps and timestamps are nullable source strings.
- **Inspector.** `steps_file` supports lazy inspection. Raw source and normalized final-message text live in canonical `meta`, so displaying them requires a second fetch.
- **Comparison.** `task_id` supports same-task gating. Pairwise Jaccard and first divergence are defined. Two-to-four-run comparison still needs a baseline or all-pairs policy, deterministic tool and target normalization, and alignment rules for repeated signatures. The fixture README documents one shared task, leaving cross-task rejection unverified.
- **Sankey and export.** Transition counts support Sankey rendering with a policy for cycles and self-loops. Portable HTML can embed data and assets for offline use. Define the export scope, including raw-text inclusion, PNG/SVG viewport, and CSV rows and columns.

**Checks.** Reviewed all five files read-only. Synthetic step checks passed for gaps, duplicate and descending index rejection, and nullable fields. All seven phase IDs and 11 regexes validated. The phase rules miss `npm --prefix frontend run check`. Frontend type-check exited because `tsconfig.json` is absent. Pytest was unavailable. The Vite entry point and browser smoke-test README were absent.