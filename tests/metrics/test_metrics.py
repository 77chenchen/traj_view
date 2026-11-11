from pathlib import Path

import pytest

from backend.graph import PhaseClassifier, build_graphs
from backend.metrics import compute_metrics
from schema.models import Action, Limits, Observation, RawRef, Step, Trajectory

ROOT = Path(__file__).resolve().parents[2]


def step(idx, target=None, *, phase=None, **fields):
    action = Action(tool="read_file", targets=[target]) if target is not None else None
    return Step(
        idx=idx, raw_ref=RawRef(file="synthetic"), action=action, phase=phase, **fields
    )


def metrics(*steps, **fields):
    trace = Trajectory(id="run", source_format="canonical", task_id="task", steps=steps, **fields)
    return compute_metrics(trace, build_graphs(trace))


def test_empty_metrics():
    assert metrics() == {
        "steps": 0, "nodes": 0, "edges": 0, "aggregate_nodes": 0, "aggregate_edges": 0,
        "cycles": 0, "repeated_actions": 0, "error_rate": 0.0, "first_edit": None,
        "first_validate": None, "validated_after_last_edit": None, "edit_validate_edit": 0,
        "phase_transitions": {}, "max_steps_hit": False, "empty_termination": True,
        "skill_read_steps": [], "skill_read_count": 0,
    }


def test_canonical_metrics():
    trace = Trajectory.model_validate_json((ROOT / "fixtures/canonical/slug.json").read_text())
    PhaseClassifier.from_file(ROOT / "config/phases.yaml").annotate(trace)
    assert compute_metrics(trace, build_graphs(trace)) == {
        "steps": 8, "nodes": 8, "edges": 11, "aggregate_nodes": 6, "aggregate_edges": 10,
        "cycles": 1, "repeated_actions": 2, "error_rate": 0.25, "first_edit": 5,
        "first_validate": 3, "validated_after_last_edit": True, "edit_validate_edit": 0,
        "phase_transitions": {
            "orient": {"skill_read": 1}, "skill_read": {"localize": 1}, "localize": {"validate": 1},
            "validate": {"validate": 1, "edit": 1, "finalize": 1}, "edit": {"validate": 1},
        },
        "max_steps_hit": True, "empty_termination": False, "skill_read_steps": [1],
        "skill_read_count": 1,
    }


def test_phase_offsets_counts_and_error_rate():
    result = metrics(
        step(3, "tests/test_x.py", phase="validate", observation=Observation(text="", exit_code=1)),
        step(8, "SKILL.md", phase="skill_read"),
        step(11, "src/x.py", phase="edit"),
        step(13, "tests/test_x.py", phase="validate"),
        step(20, phase="other"),
        step(24, "src/x.py", phase="edit"),
        step(28, "tests/test_x.py", phase="validate"),
        step(34, "src/x.py", phase="edit"),
        step(38, "AGENTS.md", phase="skill_read"),
        step(42, thought="last thought"),
        limits=Limits(max_steps=11),
    )
    assert result["first_edit"] == 11
    assert result["first_validate"] == 3
    assert result["validated_after_last_edit"] is False
    assert result["edit_validate_edit"] == 2
    assert result["error_rate"] == 0.1
    assert result["repeated_actions"] == 4
    assert result["skill_read_steps"] == [8, 38]
    assert result["skill_read_count"] == 2
    assert result["phase_transitions"] == {
        "validate": {"skill_read": 1, "other": 1, "edit": 1},
        "skill_read": {"edit": 1, "other": 1},
        "edit": {"validate": 2, "skill_read": 1},
        "other": {"edit": 1},
    }
    assert result["max_steps_hit"] is False
    assert result["empty_termination"] is True


@pytest.mark.parametrize(
    ("phases", "validated"),
    [
        ([], None),
        (["validate"], None),
        (["edit"], False),
        (["validate", "edit"], False),
        (["edit", "validate"], True),
        (["edit", "validate", "edit"], False),
    ],
)
def test_validation_requires_an_edit_and_uses_last_edit(phases, validated):
    result = metrics(*(step(idx * 5, "src/x.py", phase=phase) for idx, phase in enumerate(phases)))
    assert result["validated_after_last_edit"] is validated


def test_termination_checks_last_action_and_final_message():
    assert metrics(step(20, "src/x.py"))["empty_termination"] is False
    assert metrics(step(20, thought="incomplete"))["empty_termination"] is True
    assert metrics(step(20, tags=["final_message"]))["empty_termination"] is False
    assert metrics(meta={"final_message": "Done"})["empty_termination"] is False
    assert metrics(limits=Limits(max_steps=0))["max_steps_hit"] is True
    assert metrics(step(25), step(100), limits=Limits(max_steps=1))["max_steps_hit"] is True


def test_cycles_count_components_once_and_include_message_self_loops():
    result = metrics(
        step(2, "a"), step(4, "a"), step(6, "b"), step(8, "a"),
        step(10, "c"), step(12, "c"), step(14), step(16), step(18, "d"),
    )
    assert result["cycles"] == 3
    assert result["repeated_actions"] == 3
    assert result["aggregate_nodes"] == 5


def test_cycle_count_on_large_acyclic_and_cyclic_graphs():
    chain = [step(idx * 2, f"src/file_{idx}.py") for idx in range(2500)]
    acyclic = metrics(*chain)
    assert acyclic["cycles"] == 0
    assert acyclic["edges"] == 2499
    result = metrics(*chain, step(5000, "src/file_0.py"), step(5002, "self"), step(5004, "self"))
    assert result["cycles"] == 2
    assert result["nodes"] == 2503
    assert result["aggregate_nodes"] == 2501
    assert result["repeated_actions"] == 2
