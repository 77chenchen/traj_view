# TrajViz

TrajViz turns local agent traces into graphs and compares how runs of the same task proceed under different models and conditions. Open the standalone `trajviz-report.html` in a browser for a sample dataset, or build a dataset from your own logs.

## Install and run

Requires Python 3.11+ and Node.js 20.19+ or 22.12+.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
npm --prefix frontend ci
npm --prefix frontend run build

trajviz build fixtures/input -o out
trajviz serve out
```

Open [the local viewer](http://127.0.0.1:8765). Choose a run for graph inspection or select two to four runs of one task for comparison. Use the Langutory field to find phase sequences. For example, `E(?: [^EV])* F$` finds sequences ending in finalize with no validate after the last edit. The phase legend gives each symbol's meaning.

```sh
trajviz export out --html trajviz-report.html --csv metrics.csv
```

The viewer exports PNG and SVG from the current graph. The standalone report works offline and contains the trace details. Build with redaction before sharing a report that contains sensitive logs.

## Build from your own traces

Pass one file or a directory of JSON/JSONL traces. The three adapters cover runner events, Codex CLI JSON events and rollout logs, and OpenAI message exports. See [adapter formats](docs/ADAPTERS.md).

```sh
trajviz build ./traces -o ./local-out --redact \
  --redact-pattern '/Users/[^/]+/private-project' \
  --task-id swe-019 --model x-test-1 --metadata ./labels.json
```

A label file maps paths relative to the input directory to descriptive run fields. It can supply `task_id`, `model`, `agent`, and `condition` for logs that omit them. Example:

```json
{
  "baseline.jsonl": {"condition": "baseline"},
  "with-skill.jsonl": {"condition": "with skill"}
}
```

Common credential assignments, bearer tokens, and matching custom regexes are masked throughout the dataset. Inspect exports before sharing data with custom secrets or identifiers. The adapter keeps the source outcome label when supplied and shows `unknown` otherwise.

Phase rules are in `config/phases.yaml` and can be overridden with `--phases FILE`. To enable an external model for otherwise unclassified steps, pass `--llm-command PATH` and optionally `--llm-cache FILE`. The executable reads one JSON object containing `step` from stdin and prints a configured phase ID. Cache hits and accepted model labels are marked `phase_source: llm`. Without those options classification is rule based.

## Develop

Read the [contract](docs/SCHEMA.md), [architecture](docs/ARCHITECTURE.md), and [adapter guide](docs/ADAPTERS.md). To add an adapter, register its format and detection in `backend/adapters/`, map input to `schema.Trajectory`, preserve source text and references, and add synthetic fixtures and round-trip tests.

```sh
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
```

Browser and benchmark commands are listed in [verification](docs/VERIFICATION.md).
