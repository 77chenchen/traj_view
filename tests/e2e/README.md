# TrajViz end-to-end QA

Run from the repository root after the CLI and viewer are integrated. Use the
installed Python and frontend dependencies.

```sh
python -m pytest tests/e2e
npm --prefix frontend run check
npm --prefix frontend run build
node scripts/smoke-e2e.mjs
node scripts/benchmark-layout.mjs
```

The browser smoke command builds the public fixtures and synthetic 500- and
2,000-step traces in a temporary directory. It starts the CLI server on a
loopback port assigned by the OS and launches system Chrome once. It opens the
portable export by file URL in a fresh offline context after stopping the
server. Browser screenshots, failure screenshots, and first-render timings
go to `test-results/e2e/`. The temporary inputs and build are removed at exit.

- Set `PYTHON` to select a Python executable. The default is `python`.
- Set `PLAYWRIGHT_PATH` to a Playwright package directory, entry file, or
  `node_modules` directory. The default lookup uses the project's
  `frontend/node_modules`, then `~/Documents/ChatGPT/traj/frontend/node_modules`.
- Set `CHROME_PATH` to override the default macOS Chrome executable at
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Set `RENDER_TIMEOUT_MS` to change the 30-second first-render timeout. Each
  sample uses a fresh page context and measures from the run click through the
  animation frame after the first visible SVG graph node appears. The large
  viewer graphs may use the time-order layout fallback.
- Adjust UI locators in `browser.mjs` if accessible labels or data attributes
  change. The graph uses `data-node` for visible drawing elements and a
  source-step number in the accessible node name.

The layout benchmark runs Cytoscape's ELK and Dagre adapters headlessly on a
chain with local forward dependencies and a cyclic graph with those
dependencies, reverse links, and self-loops. Each sample uses a fresh Node
process, a fixed insertion order, and a fixed ELK seed. Runtime covers
layout creation through `layoutstop`. A SHA-256 digest of the ordered node
coordinates checks repeatability. The report includes installed adapter
dependency sizes and incremental minified and gzip sizes over a Cytoscape-only
browser bundle built with esbuild.

```sh
node scripts/benchmark-layout.mjs --repeats 2 --timeout-ms 60000 --stack-size-kb 6144
```

The default is three samples per scenario with a 30-second process deadline
per sample. A timeout ends that scenario, records completed samples, and lets
the benchmark continue. Results with fewer than two completed samples have
unknown repeatability. `--stack-size-kb` applies to the sample processes and
can help diagnose Dagre recursion limits. Benchmark JSON files are written to
`test-results/`. Set `FRONTEND_NODE_MODULES` to use a different installed
dependency directory.
