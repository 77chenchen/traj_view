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

## Parent-navigation correction

The additional `execution-return-leaf.png`, `execution-return-parent.png` and `execution-return-overview.png` are direct full-page **1586×912** Chrome **157.0.8103.52** captures of the same labeled synthetic run on 2026-11-14. `checkExecutionReturn` in the same browser module captures a selected original call, the immediately preceding visited range after Back one level, and the root after returning through all ancestors. Source `10000000000000014` stays selected throughout. The search field retains the earlier patch query from the preceding regression chain; selection here comes from clicking the call.

They are copied from the final successful online smoke run; origin metadata is embedded without changing pixels. `navigation-scenarios.json` and `navigation-first-render.json` preserve that follow-up run's reports. `navigation-verification.json` publishes only sanitized assertions from 15 additional private real-data captures at 1586×912 and 1280×800, including the exact offline HTML. The originals remain in ignored `.workers/local/execution-return-qa/`; no real screenshots or source content are distributed.
