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
