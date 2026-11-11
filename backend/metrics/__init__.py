"""Metrics derived from canonical steps and run graphs."""

from collections.abc import Iterator
from typing import TypedDict

from schema.models import Trajectory

from backend.graph.graphs import Graph, RunGraphs
from backend.graph.normalization import phase_id, step_error


class RunMetrics(TypedDict):
    steps: int
    nodes: int
    edges: int
    aggregate_nodes: int
    aggregate_edges: int
    cycles: int
    repeated_actions: int
    error_rate: float
    first_edit: int | None
    first_validate: int | None
    validated_after_last_edit: bool | None
    edit_validate_edit: int
    phase_transitions: dict[str, dict[str, int]]
    max_steps_hit: bool
    empty_termination: bool
    skill_read_steps: list[int]
    skill_read_count: int


def _cyclic_components(graph: Graph) -> int:
    """Count cyclic SCCs with two iterative depth-first passes, in O(V + E)."""
    outgoing: dict[str, list[str]] = {node["id"]: [] for node in graph["nodes"]}
    incoming: dict[str, list[str]] = {node_id: [] for node_id in outgoing}
    self_loops = set()
    for edge in graph["edges"]:
        source, target = edge["source"], edge["target"]
        outgoing[source].append(target)
        incoming[target].append(source)
        if source == target:
            self_loops.add(source)

    visited: set[str] = set()
    finish_order = []
    for start in outgoing:
        if start in visited:
            continue
        visited.add(start)
        stack: list[tuple[str, Iterator[str]]] = [(start, iter(outgoing[start]))]
        while stack:
            node, neighbors = stack[-1]
            neighbor = next(neighbors, None)
            if neighbor is None:
                finish_order.append(node)
                stack.pop()
            elif neighbor not in visited:
                visited.add(neighbor)
                stack.append((neighbor, iter(outgoing[neighbor])))

    visited.clear()
    cycles = 0
    for start in reversed(finish_order):
        if start in visited:
            continue
        pending = [start]
        visited.add(start)
        size = 0
        while pending:
            node = pending.pop()
            size += 1
            for neighbor in incoming[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    pending.append(neighbor)
        cycles += size > 1 or start in self_loops
    return cycles


def compute_metrics(trajectory: Trajectory, graphs: RunGraphs) -> RunMetrics:
    """Summarize annotated steps and graphs for the run index.

    Error rate uses all steps. Each edit after a validation since the
    previous edit completes one edit–validate–edit sequence.
    """
    expanded, aggregated = graphs["expanded"], graphs["aggregated"]
    transitions: dict[str, dict[str, int]] = {}
    skill_steps: list[int] = []
    first_edit = first_validate = None
    validated = None
    edit_validate_edit = 0
    previous_phase = None
    errors = 0
    final_message = trajectory.meta.get("final_message")
    has_final = isinstance(final_message, str) and bool(final_message.strip())
    for step in trajectory.steps:
        errors += step_error(step)
        has_final |= step.action is None and "final_message" in step.tags
        phase = phase_id(step)
        if previous_phase is not None:
            successors = transitions.setdefault(previous_phase, {})
            successors[phase] = successors.get(phase, 0) + 1
        previous_phase = phase

        if phase == "edit":
            if first_edit is None:
                first_edit = step.idx
            edit_validate_edit += validated is True
            validated = False
        elif phase == "validate":
            if first_validate is None:
                first_validate = step.idx
            if first_edit is not None:
                validated = True
        elif phase == "skill_read":
            skill_steps.append(step.idx)

    step_count = len(trajectory.steps)
    limit = trajectory.limits.max_steps if trajectory.limits is not None else None
    actionless_end = not trajectory.steps or trajectory.steps[-1].action is None
    return {
        "steps": step_count,
        "nodes": len(expanded["nodes"]),
        "edges": len(expanded["edges"]),
        "aggregate_nodes": len(aggregated["nodes"]),
        "aggregate_edges": len(aggregated["edges"]),
        "cycles": _cyclic_components(aggregated),
        "repeated_actions": sum(
            node["count"] - 1 for node in aggregated["nodes"] if node["tool"] is not None
        ),
        "error_rate": errors / step_count if step_count else 0.0,
        "first_edit": first_edit,
        "first_validate": first_validate,
        "validated_after_last_edit": validated,
        "edit_validate_edit": edit_validate_edit,
        "phase_transitions": transitions,
        "max_steps_hit": limit is not None and step_count >= limit,
        "empty_termination": actionless_end and not has_final,
        "skill_read_steps": skill_steps,
        "skill_read_count": len(skill_steps),
    }
