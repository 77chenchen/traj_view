import hashlib
import json
from pathlib import Path

from backend.graph import PhaseClassifier, langutory
from schema.models import Action, Observation, RawRef, Step, Trajectory

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "config" / "phases.yaml"


def trajectory(*steps):
    return Trajectory(id="run", source_format="canonical", task_id="task", steps=steps)


def step(idx, action=None, **fields):
    return Step(idx=idx, raw_ref=RawRef(file="synthetic", line=idx + 1), action=action, **fields)


def test_canonical_phases_and_langutory():
    trace = Trajectory.model_validate_json((ROOT / "fixtures/canonical/slug.json").read_text())
    classifier = PhaseClassifier.from_file(CONFIG)
    assert all(item.phase is None and item.phase_source is None for item in trace.steps)
    assert langutory(trace, classifier.phases) == "X X X X X X X X"
    assert classifier.annotate(trace) is trace
    assert langutory(trace, classifier.phases) == "O S L V V E V F"
    assert {item.phase_source for item in trace.steps} == {"rule"}
    assert trace.steps[-1].tags == ["final_message"]
    assert langutory(trajectory(), classifier.phases) == ""


def test_rules_match_tags_tools_paths_and_effective_shell_commands_in_order():
    trace = trajectory(
        step(2, Action(tool="validate", targets=[r".\skills\AGENTS.md"])),
        step(4, Action(tool="SHELL", command="bash -lc 'cd repo && npm --prefix web run check'")),
        step(8, Action(tool="shell", command="echo hello>src/out.txt")),
        step(12, Action(tool="other"), tags=["edit", "validate", "custom"]),
        step(16, Action(tool="Functions.READ_FILE")),
        step(18, Action(tool="shell", command="rg SKILL.md"), tags=["final_message"]),
        step(21, thought="A note"),
    )
    classifier = PhaseClassifier.from_file(CONFIG)
    classifier.annotate(trace)
    assert [item.phase for item in trace.steps] == [
        "skill_read", "validate", "edit", "validate", "localize", "finalize", "other",
    ]
    assert trace.steps[3].tags == ["edit", "validate", "custom"]
    assert all(item.phase_source == "rule" for item in trace.steps)


def test_cache_key_is_reproducible_and_only_unknown_steps_use_it():
    unknown = step(
        3, Action(tool="custom", args={"β": 1, "a": True}), thought="réfléchir",
        observation=Observation(text="details"), tags=["context"],
    )
    duplicate = step(
        8, Action(tool="custom", args={"a": True, "β": 1}), thought="réfléchir",
        observation=Observation(text="details"), tags=["context"], ts="some source timestamp",
    )
    rule_match = step(13, Action(tool="plan"))
    actionless = step(20, thought="unknown")
    payload = {
        "action": {"tool": "custom", "args": {"β": 1, "a": True}, "command": None, "targets": []},
        "observation": {"text": "details", "truncated": False, "error": False, "exit_code": None},
        "thought": "réfléchir",
        "tags": ["context"],
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    expected = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    assert PhaseClassifier.cache_key(unknown) == PhaseClassifier.cache_key(duplicate) == expected

    cache = {PhaseClassifier.cache_key(rule_match): "validate"}
    calls = []

    def classify(item):
        calls.append(item.idx)
        return "localize" if item.action is not None else "invalid-phase"

    classifier = PhaseClassifier.from_file(CONFIG, llm_cache=cache, llm_classifier=classify)
    trace = trajectory(unknown, duplicate, rule_match, actionless)
    classifier.annotate(trace)
    assert calls == [3, 20]
    assert [(item.phase, item.phase_source) for item in trace.steps] == [
        ("localize", "llm"), ("localize", "llm"), ("orient", "rule"), ("other", "rule"),
    ]
    assert cache[expected] == "localize"
    assert PhaseClassifier.cache_key(actionless) not in cache
    assert PhaseClassifier.cache_key(unknown) == expected

    PhaseClassifier.from_file(CONFIG, llm_cache=cache).annotate(trace)
    assert (unknown.phase, unknown.phase_source) == ("localize", "llm")


def test_injected_classifier_can_run_without_a_cache():
    trace = trajectory(step(0, Action(tool="unknown")), step(4, Action(tool="final")))
    PhaseClassifier.from_file(CONFIG, llm_classifier=lambda item: "edit").annotate(trace)
    assert [(item.phase, item.phase_source) for item in trace.steps] == [
        ("edit", "llm"), ("finalize", "rule"),
    ]
