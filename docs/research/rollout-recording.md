# Native rollout recording coverage

This extension makes saved Codex Desktop rollout evidence available throughout the existing viewer. It preserves the frozen v1 schema and the incumbent white workspace, typography, navigation and on-demand Inspector. No model calls or benchmark reruns are involved.

## Recorded data and where to find it

| Data | Source / derivation | Viewer entry | Missing-data behavior |
| --- | --- | --- | --- |
| Exact step timestamp | Original JSONL record timestamp | Replay/Timeline time; Recording details → Recorded timestamp | Unrecorded; Timeline uses source ordinals when the full timestamp sequence is unusable |
| Session elapsed time | First recorded start to final completion event, with valid timezone-aware times | Run details → Duration / Source coverage → Start, Completion, Time basis | No duration inferred from adjacent steps |
| Call interval | Call and matching output timestamp, paired by call ID | Recording details → Call interval and Output timestamp | Missing/invalid/reversed time stays unknown; includes waits, not active process time |
| Reported wall time | Explicit source tool/wrapper output header | Recording details → Reported wall time, with scope | Kept separate from call interval |
| Phase and classification source | Existing configured phase rules, or explicitly enabled classifier | Existing phase bands; Recording details → Phase; Run details → Phases, Phase sources | Unclassified records remain `other`; no invented plan or execution span |
| Commands and native patches | Complete known single-literal `exec` wrapper | Existing node/step, arguments, Code Diff, Replay Diff and export | Dynamic/conditional/multi-call wrappers remain their original outer call |
| Explicit patch targets | Literal Add/Update/Delete/Move headers | Files & activity, Inspector file targets | Attempted targets do not establish a successful filesystem write |
| Source roles and channels | Recorded message/reasoning/call type and channel | Recording details → Source type, role/channel; Source messages | No inferred role from prose alone |
| Call and output identity | Exact call ID, physical source/output line | Recording details → Call ID, Output reference; Raw reference | Unmatched outputs keep their own step and are explicitly labeled; no call invented |
| Response input/output tokens | `token_count.last_token_usage`, once per model response | Recording details → Tokens in/out, Token attribution, Token reference | Shared reasoning/messages are not counted again |
| Run and detailed token counters | Source cumulative totals plus preserved detailed usage records | Run details → Input/output; Source coverage → input/output/cache/reasoning totals | Cache/reasoning are subsets, not additions; unknown differs from zero |
| Session identity and environment | Source session metadata | Run details → Source coverage | Only supplied fields appear; redaction applies |
| Messages and instructions | Saved source message content with role, timestamp and reference | Run details → Source messages, nested message disclosure and Copy | Empty content says Text unrecorded |
| All other source records | Complete `meta.raw_text` and retained source events/usage metadata | Run details → Raw event categories; Download recorded source | No raw record discarded; the download is the redacted JSONL |
| Observations, errors and final answer | Original source observations/text | Existing Output, Error Output, Replay and Context | Outer Script completed does not establish subprocess exit success |

The canonical `meta.rollout.steps` map uses exact decimal source indices. Original source ordering, `idx`, timestamps, messages, observations and raw references remain stable; command/patch recognition enriches the existing action rather than adding nested execution steps. Original wrappers remain in `action.args.recorded_wrapper`. See [the optional metadata contract](../SCHEMA.md#native-rollout-metadata-optional-v1-unchanged).

## Safe parsing and evidence boundaries

The adapter accepts only a complete known wrapper containing one static JSON argument and its exact output expression. It never executes JavaScript or a saved shell command. Conditional code, computed variables, multiple invocations, non-JSON objects and nonfinite literals are preserved without guessing. Native saved patches stay distinct from submitted-file comparisons.

Session elapsed time includes waits. Call/output intervals are not subprocess runtimes, and Timeline still displays event points. A wrapper that prints only `r.output` can lose the subprocess exit field; that field remains unknown. Cost, complete filesystem versions, per-step agent identity, active duration, exact attempts and test pass rate remain unavailable unless separately recorded. Phase counts are import classifications, not source-declared stages; snapshot slots retain their existing evidence-selection rules and do not exhaust every phase occurrence. All original records remain accessible from the source download.

## Verification and screenshots

The public browser fixture is explicitly synthetic and generated in the temporary smoke dataset. Its four source steps cover a reasoning record, a wrapped validation command, a native patch and a final answer. Two messages, exact timestamps, matched outputs, phase labels and deduplicated response tokens are checked at **1586×912** and **1280×800**. A source download, Replay's pinned Diff and exact source navigation to Timeline are tested online and in a single-file report with HTTP blocked. Computed styles verify 13px metadata/caveats and 15px JetBrains Mono messages; long source references wrap within the metadata pane.

| State | 1586×912 | 1280×800 |
| --- | --- | --- |
| Step timestamp, role and call metadata | [Online](rollout-recording/recording-step-1586.png) · [Offline](rollout-recording/offline-recording-step-1586.png) | [Online](rollout-recording/recording-step-1280.png) · [Offline](rollout-recording/offline-recording-step-1280.png) |
| Recorded native patch | [Online](rollout-recording/recording-patch-1586.png) · [Offline](rollout-recording/offline-recording-patch-1586.png) | [Online](rollout-recording/recording-patch-1280.png) · [Offline](rollout-recording/offline-recording-patch-1280.png) |
| Run metadata and source coverage | [Online](rollout-recording/recording-session-1586.png) · [Offline](rollout-recording/offline-recording-session-1586.png) | [Online](rollout-recording/recording-session-1280.png) · [Offline](rollout-recording/offline-recording-session-1280.png) |
| Expanded recorded source message | [Online](rollout-recording/recording-messages-1586.png) · [Offline](rollout-recording/offline-recording-messages-1586.png) | [Online](rollout-recording/recording-messages-1280.png) · [Offline](rollout-recording/offline-recording-messages-1280.png) |

Each PNG is an independent full-page Chrome render from scroll position 0; no compositing, cropping or generated UI is used. The message state scrolls only inside the metadata disclosure to reach its source content. Provenance, dimensions and hashes are in the [capture manifest](rollout-recording/capture-manifest.json). Structured checks and first-paint samples are in [test-summary.json](rollout-recording/test-summary.json), [scenarios.json](rollout-recording/scenarios.json) and [first-render.json](rollout-recording/first-render.json). The existing bundle-size warning remains; performance samples exclude initial bundle load and display three Overview nodes, not all source nodes.

Final checks: **94 Python tests passed (3.75s)**; TypeScript and production build passed (**12.74s**); **50/50 Chrome scenarios** and the isolated recording check passed. First graph paint was **79.6ms / 130.4ms for 500 / 2,000 source steps**, respectively, with the three-node Overview and measurement limits stated above. Pure regressions passed **948 DAG sorts**, **1,908 execution scopes / 3,161 exact paths / 5,189 routes**, **61 inline states / 15,615 routes / 3,919 paired continuations** and **126 Timeline layouts**.

Adapter tests also verify unmatched-output and completion-event provenance, invalid/reversed/naive timestamps, duplicate usage events and rejected executable/computed wrappers. The exact active private dataset received an additional two-size Graph/Diff, source-recording, Replay/pinned-Diff, Timeline and offline check. Identifying logs, source checks, full screenshots and the report remain ignored under `.workers/local/import-ftfy-qa/`; none are included in the public repository. Other existing local runs and benchmark overlays were preserved.

## Reproduction

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli build fixtures/input -o out --redact \
  --redact-pattern '/Users/wangqichen/Documents/ChatGPT/traj'
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

For an isolated synthetic recording check, run `PYTHON="$(command -v python)" node scripts/verify-recording.mjs`; this creates its own temporary one-run dataset and online/offline report, then writes 16 full-page captures and `verification.json` to `test-results/recording/`.

The smoke command writes screenshots and results to `test-results/e2e/` and removes its temporary synthetic dataset. It does not read private logs, invoke a model, execute recorded commands or modify the active local dataset. To import another authorized rollout, use the existing `trajviz build`/metadata/redaction workflow; do not replace an active mixed dataset with a one-file build.

The incumbent DESIGN.md and tokens remain unchanged. The independent reviewer scored the listed TYPE and source-reference wrapping corrections resolved with disposition `ship`; this fix verdict does not establish a new whole-interface audit. Scope and evidence are recorded in [the finish review](rollout-recording/finish-review.md).
