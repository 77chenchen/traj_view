# Trace debug workbench

Mode: Operate. This is a refinement of TrajViz's recorded-evidence workbench, using the same palette, type, SVG graph renderer and v1 interfaces.

## User direction

The primary reference is the supplied `AI Coding Agent Trajectory Replay Dashboard.png`: a dark top navigation, one-line run identity/summary, a continuous three-pane light workspace, Diff above Terminal in the widest pane, and full-width playback at the bottom. The other three supplied images guide the Timeline, Graph and Compare layouts. All example task content and metrics in those images are excluded.

## Responsibilities

- **Navigation:** one shared top bar switches Runs, Replay, Timeline, Graph, Compare and Sankey. There is no second run-view navigation or sidebar consuming code width.
- **Trajectory:** searchable source-ordered rows identify the exact selected step, recorded relative time and explicit failure. Next failure/edit/validation controls navigate evidence, rather than claim causal repairs.
- **Workspace:** independent Diff/file/text and Terminal/Tests regions show only the current step. Excerpt line numbers, +/- marks and lexical syntax highlighting preserve raw text. Long paths truncate with a full title; code and logs scroll inside their own regions.
- **Inspection:** source index, tool/result status, collapsible arguments/text, source references, latest earlier error and local notes. It shares the same `idx` as list, central evidence and playback. Below 1000px it becomes an optional drawer; narrow screens prioritize the central evidence and playback.
- **Playback:** remains in the viewport as a flex footer, with stepping, seek, play/pause and speed. Event-list scrolling never moves the document.

## Other views and truth

Timeline is the primary workspace, with category lanes and optional inspection. Ticks, gridlines, marker centers and widths share the same scale, including integer ordinal fallback. Markers are event points, not fabricated durations.

Graph retains source-ordered left-to-right DAGs and phase/loop/iteration/call hierarchy. Inspector precedes auxiliary overview. v1 cannot establish actual parallel-agent execution; forward dependency/retry/temporal edges and structural containment retain their documented semantics.

Compare opens with a compact recorded-metric table and A/B (or 2–4 run) action-offset alignment. Rows expose failed calls, existing retry edges, additional/ended offsets and differing recorded output. Independent DAGs, first divergence, phase bands, Jaccard and full metrics remain available below. It does not invent semantic alignment or success grades.

## Quality bar

At 1440×900 and 1280×800 the first viewport must contain list, Diff, Terminal, Inspector and playback, with continuous alignment and no document overflow. Drive failure #50 → patch #60 → failed rerun #70 → successful validation #100 on the public session fixture, asserting source identity and evidence at each transition. Verify long logs/code, an empty run, 390px inspection toggle, Timeline scale geometry and offline zero-network behavior. All reproducible browser evidence is synthetic.
