# Fixtures

`input/` contains synthetic, scrubbed traces for the supported adapters. No user sessions or credentials are included.

- `slug-*` runs share task `swe-slug-019` and exercise all three adapters and historical comparison behavior.
- `dag-baseline`, `dag-variant`, and `dag-short` share task `dag-analysis`. They cover consecutive and nonconsecutive repeated signatures, dependency and retry edges, missing timestamps/text, source-index gaps and integers above JavaScript's safe range. Baseline and variant diverge at action offset 2 (source indices `9007199254740993` / `8`); short ends at the same offset (right index null). Use them for single-run file location, block expansion, signature linkage and three-run comparisons.
- `dashboard-baseline`, `dashboard-variant`, and `dashboard-short` share `synthetic-session-regression`. These original synthetic traces include timestamped text, reads, a recorded patch, failed validation and retries, observations and usage. They exercise Replay, Timeline, personal annotations and action-offset alignment. Their results describe synthetic records, not actual benchmark performance.
- `role-boundaries` explicitly lacks planning, test, patch and successful-outcome evidence. Its generic text, saved non-test failure, content-only file edit and final message verify that shared snapshots use qualified source labels and Timeline completion stays neutral. Its saved command is synthetic and is never executed.

`scripts/smoke-e2e.mjs` copies these fixtures into a temporary directory and adds generated 500/2,000-step performance traces via `tests/e2e/traces.py`. `scripts/test-graph-data.mjs` also checks 500/2,000-step contractions and filtered graphs. Generated performance logs stay outside the repository.
