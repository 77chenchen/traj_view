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

Single-run and comparison views use top-to-bottom step DAGs. Phase, tool category and error filters keep source order; edge checkboxes distinguish temporal, dependency and retry links. Node selection seeks playback and opens the lazy Inspector. Use **Load recorded activity** for text/tool lanes and explicit file targets; expand a path and choose a source step to locate it.

Long single runs (60+ source steps) start in **Overview** with up to three content-based sections. Boundaries follow changes in recorded operations, command families, literal Python imports and file subjects. Nodes show what the section contains, activity counts, file/command subjects and flagged errors. A `cmd:` path labels a literal command operand; confirmed file access is not inferred. Open a section and expand **Section contents** for the grouping basis and source examples; each example locates its exact call. Homogeneous streams use explicitly named continuation batches, without inventing sub-tasks. Click a section to **expand it in the current canvas**: its children appear inside a named boundary while siblings and recorded connections remain. Multiple branches and nested sections can stay open together; a final section reveals up to four original calls. Click the group header to collapse it, use **Collapse last** / **Alt+↑** while focused in the graph, or **Collapse all** to restore the overview. Expansion/collapse keeps the zoom and anchors the clicked section; source selection, its URL and Inspector evidence stay intact. The source strip, **Next failure** and global node search locate recorded steps. Dependency links focus on the selected node; **Layers → All dependency connections** reveals all links between current frontier nodes. Orthogonal edges stay outside node interiors. **Layers → Steps / Hierarchy** retains the complete step DAG and loop view. See [inline interaction and real-data verification](docs/research/inline-graph.md) and [content-grouping rules](docs/research/semantic-graph.md), or try the explicitly [synthetic long trace](http://127.0.0.1:8765/#view=graph&run=execution-long-synthetic).

In Steps mode, consecutive equal signatures can be folded into continuous blocks (automatic at 2,000 steps). Inspect any member, expand one block or expand all. Internal block edges remain in the Inspector. Nonconsecutive repeats keep separate positions. Signature frequencies and cyclic aggregate groups appear in the summary rather than the main graph. In a 2–4 run comparison, the first selected run is the baseline; markers show first action divergence and selecting a signature highlights every matching occurrence across runs.

The viewer exports PNG and SVG from the current DAG, including folding, step/edge filters and selection. The standalone report works offline and contains the trace details. Build with redaction before sharing a report that contains sensitive logs.

Graph nodes now use distinct whole-node outlines for terminal, file read, edit, validation, plan, text and other tools; merged intervals use folders. Legend explains the shapes, phase dots, errors and selection. Fullscreen includes the source Inspector, and compared Run DAGs retain Step comparison. The shared shell uses a single light top navigation and neutral dividers. The graph stays white in both appearances. Scroll normally to move down the trace; hold Ctrl/⌘ while scrolling to zoom.

Replay's **Auto** view follows the available recorded evidence. Choosing **Diff**, **Updated File**, **File Context** or **Output** keeps that view as actions play, step or seek; missing evidence shows its empty state. Terminal/Tests, output expansion and Inspector tabs also retain their selection. See [behavior, screenshots and verification](docs/research/graph-appearance.md).

## Debugging workspace

The single-row GitHub-style topbar contains only the site mark and **Replay**, **Timeline**, **Graph**, **Compare**, Analytics and Datasets tabs. It scrolls out of view with the document. On desktop, Graph and Timeline fit their workspaces into one screen; the other pages use natural document scrolling with supporting sections below the main evidence. The left app rail, product title, breadcrumbs, global search and avatar are removed. ⌘K/Ctrl+K opens catalog search; **Datasets → Local dataset & appearance** retains dark mode and local information. The same exact source selection survives view changes and hash deep links. Try [the recorded patch](http://127.0.0.1:8765/#view=replay&run=dashboard-baseline&step=60) or [the failed test](http://127.0.0.1:8765/#view=timeline&run=dashboard-baseline&step=50). The public `dashboard-baseline`, `dashboard-variant` and `dashboard-short` traces are explicitly synthetic.

Replay prioritizes recorded patch/file/text evidence, with source steps at left, optional **Step details** at right and a persistent full-width playback dock. Step details starts closed. Stages are compact navigation; **Previews** opens the recorded snippets. Parameters, text, observations and raw references open on demand. Terminal/Tests is expandable in a full-width section below the 760px evidence workspace; the playback dock remains visible while the document scrolls. **Next failure**, **Next edit** and **Next validation** locate real records and clear incompatible filters. Notes are browser-local and export as JSON. File Context can jump to an earlier recorded read; Updated File is unrecorded unless content was saved.

Timeline fits compact stages, all six event lanes, a searchable/filterable Event Log and Event Inspector into the desktop viewport. Long records and evidence scroll inside their panels. Fit, 1m/2m/5m and zoom change ruler ticks, gridlines and event positions together. Tokens adapt to neighboring space up to 96px, switch from names to icons when narrow, and group dense point events into an exact source picker. Sticky lane labels remain opaque during horizontal scroll; fullscreen keeps Event Inspector available. Incomplete timestamps use integer source ordinals. Points never imply duration. Graph gives its canvas most of the remaining screen: **Layers**, **Legend** and **Agent activity** open when needed. Its side panel separates Details, Files & activity and Signatures. Agent activity expands inside the canvas workspace; long diagrams pan locally while inspection stays on screen. Forward step DAGs, hierarchy, folding, camera controls and PNG/SVG remain available in one toolbar and the canvas controls.

Snapshot names follow saved evidence: generic text is Recorded Text, a non-test failure is Tool Failure, and an edit without a patch is File Edit. The Reasoning lane is qualified as recorded text. A final message creates a neutral Completion band; successful styling requires a saved zero-exit validation without an error.

Compare defaults to one shared A/B action **Alignment**, with first divergence above it and three flat metrics: Duration, Tool Calls and Retries. Switch to **Patch comparison**, **All metrics** or **Run DAGs** for focused analysis. **Agent A/B details**, **Key Findings** and selection-driven **Step comparison** reveal complete trajectories, snapshots, findings and source evidence. Six charts and original action-offset lists remain accessible through disclosures. Independent 2–4-run DAGs, phase bands, Jaccard and detailed metrics are retained. Signature LCS alignment is bounded at 250,000 cells and uses an explicitly stated ordinal fallback above that limit. First divergence keeps its original action-offset meaning. Missing cost, test pass rate and complete file versions remain unrecorded.

The current [neutral vertical workspace report](docs/research/neutral-vertical-workspace.md) documents navigation, wheel controls, screenshots and real-data verification. The earlier [three-page hierarchy report](docs/research/three-page-hierarchy.md) contains 77 functional mappings, before/after screenshots, disclosure captures, data limits and reproduction commands. This revision was designed and captured at desktop 1586×912 and 1280×800. Existing narrow-screen behavior remains: inspection is optional below 1000px and plots/tables/code scroll internally. The [density](docs/research/density-verification.md), [four-reference](docs/research/four-reference-verification.md), [workbench](docs/research/workbench-verification.md) and [dashboard](docs/research/dashboard-verification.md) reports are historical. No upstream UI code was copied.

## Hierarchy and live capture

Switch **Layers → Hierarchy** to inspect contiguous phase groups and adjacent repeated tool sequences. A loop expands into iterations, then original calls. Source order runs top to bottom; indentation and structural links represent containment. Temporal, dependency and retry links still come from the source graph. Related steps in Inspector locate their exact source indices and clear step filters.

To follow local Codex execution with the existing soclaas credentials:

```sh
source .venv/bin/activate
python -m backend.cli live .workers/local/nl2repo-50/runs \
  --metadata .workers/local/nl2repo-50/labels.json \
  -o .workers/local/nl2repo-50-out --port 8766
```

Open http://127.0.0.1:8766. Updates use a loopback-only SSE stream. Pause/resume keeps inspection usable; a failed refresh retains the previous graph. The backend reads JSONL written by Codex; the key stays in the local process environment and is never supplied to the browser. Offline exports make no live requests.

The [NL2Repo capture report](docs/research/nl2repo-capture.md) records the fixed 50-task sample, model-alias evidence, actual execution counts and limitations. The two requested design skills were installed and applied to this existing analysis interface; see [hierarchy and live verification](docs/research/hierarchy-live.md).

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

Browser and benchmark commands are listed in [verification](docs/VERIFICATION.md). See the [DAG implementation and evidence](docs/research/dag-verification.md) for source-order semantics, schema limitations and reproducible screenshots.

The analysis organization takes inspiration from [PAIR-code/agent-trace-vis, Agentic Traces](https://github.com/PAIR-code/agent-trace-vis#agentic-traces). This implementation reuses TrajViz's rendering and layout code; no upstream code or assets were copied.
