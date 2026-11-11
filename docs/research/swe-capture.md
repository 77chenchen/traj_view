# Live SWE capture

The `soclaas` profile's model label was confirmed as `x-test-1`. Three independent `codex exec --json` sessions used a synthetic two-file Python slugification repository. The baseline prompt requested a fix and verification. The guided prompt added a separator-handling hint. The regression prompt requested tests before and after editing.

| Condition | Completed commands | File changes | Independent verifier |
| --- | ---: | ---: | --- |
| Baseline | 4 | 1 | 3 passed |
| Guided | 3 | 1 | 3 passed |
| Regression | 4 | 1 | 3 passed |

All sessions ended with `turn.completed`. The external unit tests are verification of the SWE task. The log events contain no pass/fail classification, so the viewer displays the source outcome as unknown. The task ID, model, and conditions are attached through a label manifest at build time. Live captures are stored locally outside version control.

The real event stream contains a thread ID on `thread.started`, command execution and file change items keyed by `item.id`, a final `agent_message`, and token usage in `turn.completed`. The command item carries command, aggregated output, status and exit code. Original event lines supply step references. Explicit `glm5.3` and `glm-5.3` requests were rejected by the gateway, and the successful runs use the confirmed alias.
