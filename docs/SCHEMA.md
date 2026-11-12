# Trajectory and graph contract · v1

`schema/trajectory.schema.json` is generated from the Pydantic models and uses JSON Schema 2020-12. Canonical steps have unique, ascending nonnegative `idx` values. Indices can have gaps. Timestamps are original strings when provided. `raw_ref.line` is one-based for JSONL and nullable when no exact physical line is known.

`meta.raw_text` preserves the complete UTF-8 source. Adapters preserve unrecognized input there and may also expose it in structured metadata. `meta.final_message` is a normalized source final message when available. Use the `final_message` tag on its actionless step. Unspecified outcomes have label `unknown`. Preserve source labels and nullable pass status. A nonzero observation exit code indicates a process error even if the source omits the error flag.

## Build output

- `index.json` is `{schema_version: 1, phases, runs, search_file: "search.json"}`. Each phase is `{id, label, symbol, color}`. Each run summary is `{id, source_format, task_id, model, agent, condition, outcome, limits, usage, metrics, langutory, file, steps_file, canonical_file}`. Paths are relative to the index.
- `runs/<key>.json` contains `{id, expanded, aggregated}`. Each graph is `{nodes, edges}`. Expanded nodes are sorted by step order.
- `steps/<key>.json` contains `{steps: Step[]}`, loaded by the inspector on demand. `trajectories/<key>.json` contains the full canonical trajectory.
- `search.json` maps run IDs to searchable text. It is requested when a full-text search starts.
- Each node is `{id, label, signature, tool, category, phase, count, first_idx, step_indices, error, phase_counts}`. `signature` is the compact JSON string representation of `[normalizedTool, normalizedTarget]`. `tool` may be null for an actionless step. `category` is one of `shell, read, edit, validate, plan, tool, message`. `phase_counts` maps phase IDs to counts. Aggregated nodes use the first phase for color and preserve all member phases in `phase_counts`.
- Each edge is `{id, source, target, type, count}`, where `type` is `temporal, dependency, retry, structural`. Expanded edges point forward in source order. Aggregated edges roll up by ordered endpoints and type, including self-loops.
- Run metrics are `{steps, nodes, edges, aggregate_nodes, aggregate_edges, cycles, repeated_actions, error_rate, first_edit, first_validate, validated_after_last_edit, edit_validate_edit, phase_transitions, max_steps_hit, empty_termination, skill_read_steps, skill_read_count}`. `nodes` and `edges` refer to Expanded. `cycles` counts cyclic strongly connected components in Aggregated, including self-loops. Rates use the range 0–1. Missing first steps and validation with no prior edit are null. `phase_transitions` is a nested source-to-target count map. A max step limit is hit when observed step count reaches the supplied limit. Empty termination means the last step is actionless (or absent) and there is no final message.
- `langutory` joins phase symbols with a space in step order. `phase_source` is `rule` for rule-based labels (including `other`) and `llm` for an explicitly enabled model or cached model label.
- First divergence is the zero-based sequence offset of the first signature mismatch. Include both source indices and allow null on the shorter side. For identical sequences all divergence fields are null. Signature Jaccard is intersection size divided by union size, with value 1 for two empty sets. Compare ignores actionless steps for both measures.

Adapters expose `load(path: Path, source_format: str | None = None) -> list[Trajectory]` and `AdapterError` through `backend.adapters`. Graph code exposes `PhaseClassifier.from_file(path, llm_cache=None)`, `classifier.annotate(trajectory)`, `classifier.phases`, `langutory(trajectory, phases)`, `build_graphs(trajectory)` returning the run graph, and `compare(left, right)` through `backend.graph`. `backend.metrics.compute_metrics(trajectory, graphs)` computes the summary.

## Viewer behavior

Filters are OR within a field and AND across fields. Plain search is a case-insensitive substring over the run metadata and step thought, action, and observation text. Regex matches the Langutory string and reports invalid patterns. Run IDs are unique per build, independent of adapter. Duplicate input IDs are errors.

An expanded node represents exactly one canonical step. UI folding combines consecutive equal signatures for large runs and retains member indices. Playback follows position in ascending step order, including when timestamps or indices are missing or nonconsecutive. The Inspector shows the raw file reference as well as canonical step content.

Normalize tool and category names to lowercase. For shell actions, use the effective command category and normalized file target when one is available. Shell validation signatures identify the operation, such as `validate:test` for pytest or unittest. Normalize slash direction and redundant path segments without reading the filesystem. Prefer explicit adapter targets and preserve the first occurrence order. Compare every unordered pair within a selected task. Cross-run selection matches a normalized signature across the aggregated graphs, including signatures that occur multiple times.

Sankey transitions use two time layers so reverse and self transitions can be rendered. A portable HTML report includes the same summaries, searchable content and lazy step payloads. Its embedded manifest points to separately parsed payloads. The viewer preserves source indices outside the safe JavaScript integer range as decimal strings internally. CSV emits one metric row per selected run (all runs from the CLI). Graph images include the visible edge types and nodes of the current view.
