"""Public synthetic coverage for source-backed Desktop rollout enrichment."""

import json

import pytest

from backend.adapters import load
from backend.graph import PhaseClassifier, build_graphs


def write_rollout(tmp_path, records):
    path = tmp_path / "rollout-synthetic.jsonl"
    path.write_text("\n".join(json.dumps(r) for r in records) + "\n")
    return path


def item(kind, second=1, **payload):
    return {"type": "response_item", "timestamp": f"2026-01-01T00:00:{second:02}Z",
            "payload": {"type": kind, **payload}}


def event(kind, second=0, **payload):
    return {"type": "event_msg", "timestamp": f"2026-01-01T00:00:{second:02}Z",
            "payload": {"type": kind, **payload}}


def counts(total_in, total_out, last_in, last_out):
    return event("token_count", info={
        "total_token_usage": {"input_tokens": total_in, "output_tokens": total_out,
                              "cached_input_tokens": 10, "reasoning_output_tokens": 2},
        "last_token_usage": {"input_tokens": last_in, "output_tokens": last_out},
    })


def test_literal_wrappers_restore_patch_phases_time_and_response_usage(tmp_path):
    patch = "*** Begin Patch\n*** Update File: src/example.py\n@@\n-value = 1\n+value = 2\n*** End Patch"
    shell = 'const r = await tools.exec_command({"cmd":"pytest -q","workdir":"/synthetic"});\ntext(r.output);\n'
    edit = f"const patch = {json.dumps(patch)};\ntext(await tools.apply_patch(patch));\n"
    records = [
        {"type": "session_meta", "payload": {"id": "synthetic-recording", "model_provider": "synthetic"}},
        event("task_started"),
        item("message", role="user", content=[{"text": "Synthetic task."}]),
        item("reasoning", summary=[{"text": "Inspect the recorded failure."}]),
        item("custom_tool_call", call_id="test", name="exec", input=shell),
        {"type": "token_usage_record", "payload": {"response_id": "response-1", "usage": {"input_tokens": 100, "output_tokens": 10}}},
        item("custom_tool_call_output", second=3, call_id="test", output="Script completed\nWall time 0.25 seconds\nOutput:\n1 failed"),
        counts(100, 10, 100, 10), counts(100, 10, 100, 10),
        item("custom_tool_call", second=4, call_id="patch", name="exec", input=edit),
        item("custom_tool_call_output", second=5, call_id="patch", output="patched"),
        counts(150, 30, 50, 20),
        item("message", second=6, role="assistant", phase="final_answer", content=[{"text": "Done."}]),
        counts(200, 40, 50, 10), event("task_complete", second=20, last_agent_message="Done."),
    ]
    path = write_rollout(tmp_path, records)
    run, = load(path)
    PhaseClassifier.from_file("config/phases.yaml").annotate(run)
    reasoning, test, change, final = run.steps
    assert test.action.tool == "exec_command" and test.action.command == "pytest -q"
    assert test.action.args["recorded_wrapper"]["input"] == shell
    assert change.action.tool == "apply_patch" and change.action.args["input"] == patch
    assert change.action.targets == ["src/example.py"]
    assert [s.phase for s in run.steps] == ["other", "validate", "edit", "finalize"]
    assert test.observation.exit_code is None and not test.observation.error  # subprocess exit was not printed
    assert test.tokens.in_ == 100 and test.tokens.out == 10
    assert sum(s.tokens.in_ for s in run.steps if s.tokens) == run.usage.input_tokens == 200
    assert sum(s.tokens.out for s in run.steps if s.tokens) == run.usage.output_tokens == 40
    assert run.usage.wall_s == 20
    details = run.meta["rollout"]
    assert details["raw_records"] == len(records)
    assert details["steps"]["1"]["call_interval_s"] == 2
    assert details["steps"]["1"]["reported_wall_s"] == .25
    assert details["steps"]["1"]["wall_scope"] == "wrapper"
    assert details["steps"]["1"]["output_ref"]["line"] == 7
    assert details["messages"][0]["role"] == "user"
    assert details["steps"]["0"]["channel"] == "reasoning"
    assert details["steps"]["3"]["channel"] == "final_answer"
    assert len(details["usage_records"]) == 1
    assert json.loads(run.meta["raw_text"].splitlines()[4])["payload"]["input"] == shell
    assert len(build_graphs(run)["expanded"]["nodes"]) == 4


@pytest.mark.parametrize("code", [
    'if (false) {const r = await tools.exec_command({"cmd":"pytest"});text(r.output);}',
    'const r = await tools.exec_command(options);text(r.output);',
    'const r = await tools.exec_command({cmd: dynamic});text(r.output);',
    'const r = await tools.exec_command({"cmd":"pytest"});text(r.output);await tools.exec_command({"cmd":"other"});',
    'const patch = "*** Begin Patch\\n";patch += dynamic;text(await tools.apply_patch(patch));',
    'const r = await tools.exec_command({"cmd":"pytest", "timeout":NaN});text(r.output);',
    'const s = "tools.exec_command(ignored)";text(s);',
])
def test_computed_or_conditional_javascript_is_preserved_without_guessing(tmp_path, code):
    run, = load(write_rollout(tmp_path, [item("custom_tool_call", name="exec", call_id="one", input=code)]))
    assert len(run.steps) == 1
    assert run.steps[0].action.tool == "exec"
    assert run.steps[0].action.command is None
    assert run.steps[0].action.args == {"input": code}


@pytest.mark.parametrize("start,end", [("invalid", "invalid"), ("2026-01-01T00:00:20Z", "2026-01-01T00:00:10Z"), ("2026-01-01T00:00:00", "2026-01-01T00:00:10")])
def test_unusable_timestamps_do_not_become_durations(tmp_path, start, end):
    run, = load(write_rollout(tmp_path, [
        {"type": "event_msg", "timestamp": start, "payload": {"type": "task_started"}},
        {"type": "event_msg", "timestamp": end, "payload": {"type": "task_complete"}},
    ]))
    assert run.usage is None
    assert "timing" not in run.meta["rollout"]


def test_unmatched_output_keeps_source_metadata_without_inventing_a_call(tmp_path):
    run, = load(write_rollout(tmp_path, [
        item("function_call_output", second=3, output="Recorded output without a call."),
    ]))
    assert len(run.steps) == 1
    step = run.steps[0]
    assert step.action is None
    assert step.observation.text == "Recorded output without a call."
    detail = run.meta["rollout"]["steps"][str(step.idx)]
    assert detail["unmatched_output"] is True
    assert detail["output_ref"]["line"] == 1
    assert detail["output_timestamp"] == "2026-01-01T00:00:03Z"
    assert "call_interval_s" not in detail and detail["call_id"] is None


def test_completion_only_text_keeps_event_provenance(tmp_path):
    run, = load(write_rollout(tmp_path, [event("task_complete", second=3, last_agent_message="Recorded final.")]))
    step, = run.steps
    assert step.thought == "Recorded final."
    detail = run.meta["rollout"]["steps"][str(step.idx)]
    assert detail["source_type"] == "event_msg" and detail["channel"] == "task_complete"
    assert detail["source_ref"]["line"] == 1
    assert "role" not in detail  # no message role was saved on this event
