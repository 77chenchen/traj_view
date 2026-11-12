# Verification

Run the Python and frontend checks, then exercise the browser with Chrome and Playwright. Set `CHROME_PATH` when Chrome is installed elsewhere. Screenshots and timing JSON go to `test-results/`.

```sh
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
node scripts/benchmark-layout.mjs --stack-size-kb 6144 --timeout-ms 60000 --repeats 2
```

[Live SWE capture](research/swe-capture.md) records the three real Codex runs and their independent verifier results. [Layout evaluation](research/layout-benchmark.md) records headless engine tests and bundle sizes.

## Results

| Check | Result |
| --- | --- |
| Python | 68 tests passed, including 8 fixture round-trips, 2,500-step graph tests, invalid UTF-8, duplicate IDs, recoverable malformed records, and export escaping |
| TypeScript and production bundle | Both passed |
| Chrome 157 on Apple M3 | 10 scenarios passed. Covered run filters, full-text and regex search, inspection and playback, graph modes and PNG/SVG/CSV downloads, same-task comparison, shared-scale two-group Sankey, theme, narrow layout, folding, exact large indices and standalone HTML. |
| Delivered report | The exact `trajviz-report.html` opened offline and rendered a graph with zero network requests. |
| Real Codex capture | Three `soclaas` / `x-test-1` traces loaded into the same-task comparison and produced three pairwise rows. |

The browser measured elapsed time from opening a catalog run until a graph node was visible and had a paint opportunity on the next animation frame. Each timing used a fresh browser context and a synthetic run with distinct action targets.

| Source steps | First graph paint | Evidence |
| ---: | ---: | --- |
| 500 | 64.1 ms | `test-results/e2e/first-render-500.png` |
| 2,000 | 64.1 ms | `test-results/e2e/first-render-2000.png` |

A separate 2,000-step trace with repeated signatures folded 1,960 steps into 40 visible nodes. The browser verified expansion, selection of a member step, and expansion of an observation preview. Screenshots and measurements are in `test-results/e2e/`.

[Independent review](research/independent-review.md) records findings and the resulting fixes.
