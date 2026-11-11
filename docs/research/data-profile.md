# Input inventory

The initial read-only workspace scan found no agent logs. The input formats below use synthetic fixtures. The GLM/SWE capture is tracked separately.

| Format | Name | Step boundary | Outcome, usage |
| --- | --- | --- | --- |
| Runner events | `*.events.jsonl` | Explicit `step` record or an action with associated observation | `run.end.outcome`, `run.end.usage` |
| Codex CLI | `*.codex.jsonl`, `rollout-*.jsonl` | Completed command/tool item or matched call/output | Source outcome metadata and turn usage or session token count |
| OpenAI messages | `*.messages.json` | Assistant tool calls and corresponding tool outputs by call ID | Wrapper metadata, finish reason and token usage |

Tool arguments, environment assignments, command output, file paths, prompts, and wrapper metadata may all contain sensitive material. The examples under `fixtures/input` are synthetic and reviewable.

The user specified an isolated SWE capture via the `soclaas` profile after the initial scan. [Live SWE capture](swe-capture.md) documents the observed Codex event records and independent verification. No original runner-events or OpenAI-messages captures were provided.
