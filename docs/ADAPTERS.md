# Adapters

`backend.adapters.load(path, source_format=None)` returns canonical trajectories. The CLI recognizes `.json`, `.jsonl`, and `.ndjson` inputs and can select the adapter explicitly with `--format`.

| Format | Source shapes | Step mapping |
| --- | --- | --- |
| `events_jsonl` | Runner records `run.start`, `step`, `action`, `observation`, `run.end` | An explicit step, or a separate action and observation paired by call or step ID |
| `codex_cli` | `codex exec --json`, persistent `rollout-*.jsonl` | Completed commands, file changes, tool calls and messages. Rollout calls pair with outputs by call ID. |
| `openai_messages` | JSON array or wrapper object with `messages` | One step per assistant tool call, with tool responses paired by `tool_call_id`. Final assistant content becomes an actionless step. |

Keep one experiment run per input when using the per-file metadata manifest. Runner JSONL can also contain consecutive `run.start` records for multiple runs. For formats that omit metadata, assign the same `task_id` to same-task captures with `--task-id` or `--metadata`. Input outcome labels remain source-owned.

## Preservation

The complete source text is in `meta.raw_text`. Structured step data supports graphing, inspection, and metrics. JSONL references identify the filename and physical line. Chat message JSON files can use a null line reference. Both the canonical data and its derived files honor build redaction. Redaction reserializes structured source data and masks malformed JSONL lines while preserving physical line numbering.

The adapter keeps recoverable parse diagnostics in `meta.parse_errors`, and the CLI reports them while building the usable records. Unreadable inputs, invalid UTF-8, and wholly malformed inputs produce an error.

Codex Desktop rollouts preserve additional source metadata under optional `meta.rollout`: source roles/channels and messages, call/output references and intervals, session events and detailed usage counters. Complete known single-literal `exec` wrappers expose submitted commands or native patches while retaining their original wrapper; the parser never executes log text. Other wrappers remain unchanged. Response tokens are attributed once to the ending step of each response. Wrapper completion is not a subprocess-success signal. See [the metadata contract](SCHEMA.md#native-rollout-metadata-optional-v1-unchanged) and [recording verification](research/rollout-recording.md).

## Add an adapter

1. Implement a parser returning one or more `schema.Trajectory` objects and add its detection to `backend/adapters/__init__.py`.
2. Map the source's step boundaries, identity, usage, and outcome. Preserve unknown input in raw source or structured metadata.
3. Add at least two scrubbed fixtures and tests for step count, first and last actions, raw retention, and canonical round-trip.
4. Run `python -m pytest tests/adapters` and the CLI fixture build.
