# NL2Repo local capture · 2026-11-12

The user requested 50 randomly chosen long NL2Repo tasks, not frontend-only tasks or repeated runs of ten tasks. UI design skills apply to TrajViz itself. Existing local soclaas credentials were authorized.

## Fixed sample and model

The public [task manifest](nl2repo-50.tasks.json) records 50 distinct requirements selected with seed `20261112` from 104 `test_files/*/start.md` entries in [NL2RepoBench](https://github.com/multimodal-art-projection/NL2RepoBench), revision `781a1da1ee41fb8edb0bed22f586d69111610edf`. Requirement texts total 3,887,603 bytes; SHA-256 and source paths make the selection reproducible. Requirements, generated implementations and raw logs stay local and ignored.

Actual invocation uses `codex exec --profile soclaas --model x-test-1 --json --ephemeral --sandbox workspace-write -c approval_policy="never"`. The user confirmed that **x-test-1 maps to GLM-5.3**. The gateway exposes an alias, so vendor identity was not independently verified. The literal `glm5.3` name was rejected as unconfigured and was not silently substituted before confirmation.

Each task starts in its own Git workspace with the complete public requirements in `REQUIREMENTS.md`. The prompt requests implementation, tests and validation from scratch, prohibits fetching the original implementation or reading credentials/other workspaces, and prohibits nested agents. The initial sweep used a 2,400-second deadline. After the user reported the computer had shut down/slept, retries use a monotonic deadline; macOS sleep does not consume it. Running legacy attempts without a saved monotonic origin receive a fresh deadline when reattached. The profile/key is inherited locally, never passed to the viewer.

## Result and honest completion criteria

First sweep: **50 tasks attempted, 28 with recorded tool events, 340 completed tool events, 0 successful turn completions**. Twenty attempts reached their wall deadline; thirty ended with provider 429 errors, including eight with partial tool activity. These are real execution records, but they do **not** fulfill a claim of 50 successfully completed long trajectories. No official NL2Repo Docker grader was run; there is no benchmark score or claim that generated repositories satisfy their requirements.

The initial six captures were retained while concurrency increased to twelve. A subsequent twenty-worker batch encountered sustained gateway limits; launches were stopped and remaining children were monitored without replacement. Following cooldown, zero-tool failures were retried conservatively and evidence archived. A 20.64-second no-tool gateway probe succeeded. After the user requested retry following machine shutdown/sleep, the failed batch was restarted with four supervised slots; existing children are attached before new launches. A PID-bound caffeinate process prevents automatic sleep only while the batch supervisor is active. Three consecutive 429s open a circuit and stop the retry queue; the final local summary below is authoritative. Retries never overwrite original attempts or generated code. A supervisor checks both process identity and workspace before applying an attach timeout.

Public summaries contain task IDs and counts only. Full local evidence:

- `.workers/local/nl2repo-50/manifest.json`, `status.json`, `summary.json`, `capture.log`.
- `runs/*.codex.jsonl`, `runs/*.stderr`; archived attempts under `attempts/`.
- `workspaces/` for generated code; `requirements/` for the fixed inputs.
- `.workers/local/nl2repo-50-out/` redacted dataset, `.workers/local/nl2repo-50.html` offline report, and `.workers/local/nl2repo-50-metrics.csv`.
- `.workers/local/nl2repo-50-qa/browser-report.json`, `live-hierarchy.png`, `offline-hierarchy.png` (private screenshots; not checked in).

Chrome 157 opened the local 50-record dataset, inspected an actual tool call, expanded hierarchy levels and zoomed. The private offline export opened with network disabled: DAG and Inspector passed, **zero HTTP requests and zero page errors**. A literal configured-key check over derived JSON/HTML found zero matches. Empty/provider-failed records remain visible for transparency and are not counted as tool trajectories.

## Reproduce or resume

```sh
source .venv/bin/activate
# Download/verify only; does not invoke a model.
python scripts/capture-nl2repo.py --prepare-only
# Start or resume with conservative concurrency, using configured local credentials.
python scripts/capture-nl2repo.py --workers 2
# Retry one failed task only after resolving the gateway limit; originals are archived.
python scripts/capture-nl2repo.py --workers 1 --retry-failed --task markupsafe
python scripts/summarize-nl2repo.py .workers/local/nl2repo-50 \
  --output .workers/local/nl2repo-50/summary.json
python -m backend.cli live .workers/local/nl2repo-50/runs \
  --metadata .workers/local/nl2repo-50/labels.json \
  -o .workers/local/nl2repo-50-out --port 8766
```

Open http://127.0.0.1:8766. The viewer only follows local logs; it does not expose key entry or arbitrary shell execution. To export and check the private snapshot:

```sh
python -m backend.cli export .workers/local/nl2repo-50-out \
  --html .workers/local/nl2repo-50.html --csv .workers/local/nl2repo-50-metrics.csv
node scripts/verify-live-capture.mjs --html .workers/local/nl2repo-50.html
```

Missing data: exec JSONL does not provide per-step timestamps or a distinct hidden-reasoning channel; shell-only paths do not become confirmed file accesses. Durations come from local attempt metadata, not invented per-call timings. Most attempts have unknown canonical outcomes. Dependency links retain the file/observation heuristic, not proven causality. All screenshots and logs from these real runs remain ignored; public fixtures and the delivered root HTML remain synthetic.


## Resumed batch and automatic finalization

After the user reported machine shutdown/sleep, failed tasks were requeued; original attempts remain archived. `summary.json` distinguishes current-attempt counts from `total_attempts`, `tasks_with_tool_evidence`, `all_tool_events` and `tasks_completed_ever` across archives. The active batch has not yet produced 50 verified successful task completions; consult these live counts rather than treating queued attempts as finished.

A local `scripts/finalize-nl2repo.py --supervisor PID` process is waiting for the current supervisor. It calls no model. After the batch exits it waits for the live snapshot, regenerates private HTML/CSV, checks literal-key redaction, and runs Chrome live/offline QA. Its ignored `finalization.json` records whether all 50 tasks have tool evidence and how many completed; a viewer verification is not a benchmark success claim. `finalization.log` retains the command results. No real data is copied into the public fixtures or report.

Resumed checkpoint (2026-11-12 11:59 UTC): 30/50 tasks have tool evidence, 591 tool events across 57 attempts, 0 successful turn completions; 6 attempts running. This is an in-progress checkpoint, not final completion. The finalizer also has a PID-bound keep-awake assertion through export/QA.

Dashboard revision checkpoint (2026-11-12T12:51:11.172283+00:00): 50/50 attempted; 30 tasks with tool evidence; 1242 tool events across 63 attempts; 1 successful turn completion(s), 0 running. This is not a benchmark pass count. Aggregate evidence is [capture-status JSON](nl2repo-capture-status.json). The supervisor stopped after three consecutive 429s; finalization completed, with zero literal key matches, zero offline HTTP requests and viewer QA verified. All 50 do not yet have tool evidence; 1 successful turn is not a benchmark score.

Final resumed-batch state: **30/50 tasks have tool evidence across 63 attempts (1,242 tool events); 1 successful turn completion, 49 current failures, no running attempts**. Gateway rate limits stopped the queue; the supervisor/finalizer have exited. The latest private HTML includes the dashboard build and passed the existing live/offline DAG/Inspector QA. `finalization.status=verified` certifies viewer/export checks only, not 50-task completion. Retry requires restored gateway capacity; originals remain archived.
