# Screenshot provenance

These three PNGs are direct full-page Playwright screenshots of TrajViz's real React UI, captured by system Google Chrome **157.0.8103.52** at **1586×912** on 2026-11-14. No generative image model, reference-image compositing, cropping or pixel editing was used. Origin metadata is embedded in each distributed PNG.

Data: the public, explicitly synthetic `execution-long-synthetic` run, generated from [execution-long.events.jsonl](../../../fixtures/input/execution-long.events.jsonl). It has 96 steps, saved commands/outputs/patches, no timestamps and exact nonconsecutive string indices beyond JavaScript's safe integer range. All displayed task content is synthetic; it is not a real benchmark result.

Capture implementation: [tests/e2e/execution-map.mjs](../../../tests/e2e/execution-map.mjs), invoked online and offline by [scripts/smoke-e2e.mjs](../../../scripts/smoke-e2e.mjs). Distributed files are copied from the final successful online run under ignored `test-results/e2e/`; metadata embedding preserves their pixel content.

| File | Captured state |
| --- | --- |
| `execution-synthetic-overview.png` | Four continuous root ranges; empty Inspector |
| `execution-synthetic-failure.png` | Next failure selects exact source `10000000000000040`; Error Output tab |
| `execution-synthetic-patch.png` | Global search locates `10000000000000053`; Code Diff displays the saved `value = 2` patch |

`first-render.json` and `scenarios.json` are copied from the same final smoke run; `verification.json` is a sanitized aggregate of private local real-data verification, excluding run IDs, source text and precise source IDs. Real logs, standalone HTML and 32 real screenshots are intentionally not included in the public repository.
