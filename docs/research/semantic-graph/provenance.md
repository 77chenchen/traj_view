# Browser screenshot provenance

These five PNGs are direct full-page screenshots of the actual TrajViz React UI, taken by Playwright with system Chrome **157.0.8103.52**, **1586×912**, on **2026-11-14**. They use only the public, explicitly synthetic 96-step `execution-long-synthetic` fixture from `fixtures/input/execution-long.events.jsonl`. No real benchmark contents, generated illustrations, montage, cropping or pixel editing are present.

| File | State and source |
| --- | --- |
| `execution-synthetic-overview.png` | Content summaries on the three root sections; empty Inspector |
| `execution-synthetic-contents.png` | First content section open; grouping basis, activity counts and original source-example entry |
| `execution-synthetic-failure.png` | Next failure selects exact source `10000000000000040`; Error Output |
| `execution-synthetic-patch.png` | Search selects exact source `10000000000000053`; saved `value = 2` patch |
| `execution-return-parent.png` | Return from the first three-call section to its parent, preserving selected source `10000000000000027` and Inspector |

Captured by `tests/e2e/execution-map.mjs` in the final successful `PYTHON="$PWD/.venv/bin/python" node scripts/smoke-e2e.mjs` run. Files are copied from ignored `test-results/e2e/`. The product's search box retains the earlier patch query in the return screenshot; the selected source comes from clicking its actual node. `scenarios.json` and `first-render.json` belong to that same final run.

Every distributed PNG embeds an Origin record using Impeccable `embed-prompt`; the scan reported **5 rasters / 0 missing**. Metadata embedding preserves pixels. All five images were opened and checked at their captured dimensions.

The 38 actual NL2Repo screenshots and their HTML/source summaries stay under ignored `.workers/local/semantic-graph-qa/`. `verification.json` distributes only sanitized sizes and assertions, without private IDs, text, source indices or screenshots. `detector.json` records the one task-scoped detector result (`[]`); the detector is not a substitute for rendered review.
