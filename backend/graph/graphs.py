"""Build expanded and aggregated run graphs and compare action sequences."""

from itertools import zip_longest
from typing import Literal, TypedDict

from schema.models import Trajectory

from .normalization import normalize_action, observation_paths, phase_id, step_error

EdgeType = Literal["temporal", "dependency", "retry", "structural"]


class Node(TypedDict):
    id: str
    label: str
    signature: str
    tool: str | None
    category: str
    phase: str
    count: int
    first_idx: int
    step_indices: list[int]
    error: bool
    phase_counts: dict[str, int]


class Edge(TypedDict):
    id: str
    source: str
    target: str
    type: EdgeType
    count: int


class Graph(TypedDict):
    nodes: list[Node]
    edges: list[Edge]


class RunGraphs(TypedDict):
    id: str
    expanded: Graph
    aggregated: Graph


class Comparison(TypedDict):
    jaccard: float
    first_divergence: int | None
    left_idx: int | None
    right_idx: int | None


def build_graphs(trajectory: Trajectory) -> RunGraphs:
    """Build forward edges in source order and roll them up by signature.

    A dependency uses the most recent successful writer of a referenced path
    and the most recent observation mentioning a path targeted by the action.
    A retry links a failed action to the next occurrence of its signature.
    """
    expanded: Graph = {"nodes": [], "edges": []}
    aggregate_nodes: dict[str, Node] = {}
    aggregate_edges: dict[tuple[str, str, EdgeType], Edge] = {}
    aggregates_by_step: dict[str, str] = {}
    last_writer: dict[str, str] = {}
    last_observation: dict[str, str] = {}
    failed_actions: dict[str, str] = {}
    previous = None

    def add_edge(source: str, target: str, edge_type: EdgeType) -> None:
        expanded["edges"].append({
            "id": f"edge-{len(expanded['edges'])}",
            "source": source,
            "target": target,
            "type": edge_type,
            "count": 1,
        })
        key = (aggregates_by_step[source], aggregates_by_step[target], edge_type)
        if key not in aggregate_edges:
            aggregate_edges[key] = {
                "id": f"aggregate-edge-{len(aggregate_edges)}",
                "source": key[0],
                "target": key[1],
                "type": edge_type,
                "count": 0,
            }
        aggregate_edges[key]["count"] += 1

    for step in trajectory.steps:
        action = normalize_action(step.action)
        signature = action.signature
        phase = phase_id(step)
        error = step_error(step)
        node_id = f"step-{step.idx}"
        node: Node = {
            "id": node_id,
            "label": action.label,
            "signature": signature,
            "tool": action.tool,
            "category": action.category,
            "phase": phase,
            "count": 1,
            "first_idx": step.idx,
            "step_indices": [step.idx],
            "error": error,
            "phase_counts": {phase: 1},
        }
        expanded["nodes"].append(node)
        aggregate = aggregate_nodes.get(signature)
        if aggregate is None:
            aggregate = {
                **node, "id": f"aggregate-{step.idx}", "count": 0,
                "step_indices": [], "phase_counts": {},
            }
            aggregate_nodes[signature] = aggregate
        aggregate["count"] += 1
        aggregate["step_indices"].append(step.idx)
        aggregate["error"] |= error
        aggregate["phase_counts"][phase] = aggregate["phase_counts"].get(phase, 0) + 1
        aggregates_by_step[node_id] = aggregate["id"]

        if previous is not None:
            add_edge(previous, node_id, "temporal")
        previous = node_id

        observed = observation_paths(step.observation.text) if step.observation is not None else ()
        sources = dict.fromkeys(
            last_writer[path] for path in (*action.targets, *action.writes, *observed)
            if path in last_writer
        )
        for path in (*action.targets, *action.writes):
            if path in last_observation:
                sources[last_observation[path]] = None
        for source in sources:
            add_edge(source, node_id, "dependency")

        if step.action is not None:
            failed = failed_actions.pop(signature, None)
            if failed is not None:
                add_edge(failed, node_id, "retry")
            if error:
                failed_actions[signature] = node_id
            else:
                for path in action.writes:
                    last_writer[path] = node_id
        for path in observed:
            last_observation[path] = node_id

    return {
        "id": trajectory.id,
        "expanded": expanded,
        "aggregated": {
            "nodes": list(aggregate_nodes.values()),
            "edges": list(aggregate_edges.values()),
        },
    }


def compare(left: Trajectory, right: Trajectory) -> Comparison:
    """Return signature Jaccard and the first differing action offset and indices."""
    left_actions = [
        (step.idx, normalize_action(step.action).signature)
        for step in left.steps if step.action is not None
    ]
    right_actions = [
        (step.idx, normalize_action(step.action).signature)
        for step in right.steps if step.action is not None
    ]
    left_signatures = {signature for _, signature in left_actions}
    right_signatures = {signature for _, signature in right_actions}
    union = left_signatures | right_signatures
    result: Comparison = {
        "jaccard": len(left_signatures & right_signatures) / len(union) if union else 1.0,
        "first_divergence": None,
        "left_idx": None,
        "right_idx": None,
    }
    for offset, (a, b) in enumerate(zip_longest(left_actions, right_actions)):
        if a is None or b is None or a[1] != b[1]:
            result["first_divergence"] = offset
            result["left_idx"] = a[0] if a is not None else None
            result["right_idx"] = b[0] if b is not None else None
            break
    return result
