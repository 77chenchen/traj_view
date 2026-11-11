import json
from pathlib import Path

import pytest

from backend.adapters import AdapterError, load
from schema import Trajectory

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "input"
FIXTURE_CASES = {
    "slug-baseline-timeout.events.jsonl": (
        "events_jsonl", 8, "pwd", "pytest tests/test_slug.py -q", "timeout", None, None,
    ),
    "slug-empty.events.jsonl": (
        "events_jsonl", 2, "pwd", "pwd", "empty_termination", None, None,
    ),
    "slug-skill-pass.events.jsonl": (
        "events_jsonl", 7, "pwd", "pytest tests/test_slug.py -q", "pass", True,
        "Trimmed separators and verified all three cases.",
    ),
    "slug-codex-pass.codex.jsonl": (
        "codex_cli", 6, "pwd", "pytest tests/test_slug.py -q", "pass", True,
        "Updated slugify and ran all tests.",
    ),
    "slug-codex-verifier.codex.jsonl": (
        "codex_cli", 6, "pwd", "apply_patch src/slug.py", "verifier_fail", False,
        "The implementation is updated.",
    ),
    "slug-codex-rollout.jsonl": (
        "codex_cli", 2, "cat skills/python/SKILL.md", "cat skills/python/SKILL.md", "unknown", None,
        "Reviewed the project instructions.",
    ),
    "slug-messages-pass.messages.json": (
        "openai_messages", 6, "pwd", "pytest tests/test_slug.py -q", "pass", None,
        "Fixed and tested the slug.",
    ),
    "slug-messages-provider.messages.json": (
        "openai_messages", 3, "pwd", "sed -n '1,120p' src/slug.py", "provider_error", None, None,
    ),
}


def test_fixture_coverage():
    assert set(FIXTURE_CASES) == {path.name for path in FIXTURES.iterdir() if path.is_file()}


@pytest.mark.parametrize("name", FIXTURE_CASES)
def test_fixture(name):
    source_format, count, first, last, label, passed, final = FIXTURE_CASES[name]
    path = FIXTURES / name
    (run,) = load(path)
    assert run.source_format == source_format
    assert run.task_id == "swe-slug-019"
    assert len(run.steps) == count
    actions = [step.action for step in run.steps if step.action is not None]
    assert actions[0].command == first
    assert actions[-1].command == last
    assert actions[0].tool == actions[-1].tool == (
        "exec_command" if name == "slug-codex-rollout.jsonl" else "shell"
    )
    assert run.outcome.label == label
    assert run.outcome.passed is passed
    assert run.meta.get("final_message") == final
    if final is not None:
        assert run.steps[-1].action is None
        assert run.steps[-1].thought == final
        assert run.steps[-1].tags == ["final_message"]
    assert run.meta["raw_text"].encode("utf-8") == path.read_bytes()
    assert Trajectory.model_validate_json(run.model_dump_json(by_alias=True)) == run
    assert load(path, source_format=source_format) == [run]


def write_jsonl(path, records):
    path.write_text("".join(json.dumps(record) + "\n" for record in records), encoding="utf-8")
    return path


def test_runner_recovers_bad_lines_and_matches_parallel_outputs(tmp_path):
    path = tmp_path / "trace.jsonl"
    raw = (
        '\ufeff{"type":"extension","secret":"fixture-only"}\r\n'
        '{"type":"action","call_id":"a","idx":3,"tool":"Shell","command":"pwd"}\r\n'
        '{"type":"action","call_id":"b","idx":5,"tool":"shell","command":"ls"}\r\n'
        '{"malformed":"fixture-only"\r\n'
        '{"type":"observation","call_id":"b","text":"second","exit_code":4}\r\n'
        '{"type":"observation","call_id":"a","text":"first"}\r\n'
        '{"type":"observation","call_id":"missing","text":"orphan café"}\r\n'
        '{"type":"run.end","outcome":"timeout","finish_reason":"time_limit"}'
    )
    path.write_bytes(raw.encode("utf-8"))
    (run,) = load(path)
    first, second, orphan = run.steps
    assert [step.idx for step in run.steps] == [3, 5, 6]
    assert [step.raw_ref.line for step in run.steps] == [2, 3, 7]
    assert first.action.tool == "shell"
    assert first.observation.text == "first"
    assert second.observation.text == "second"
    assert second.observation.exit_code == 4
    assert second.observation.error
    assert orphan.action is None
    assert orphan.observation.text == "orphan café"
    assert run.outcome.label == "timeout"
    assert run.outcome.finish_reason == "time_limit"
    assert run.outcome.passed is None
    assert run.task_id == run.id
    assert run.model == "unknown"
    assert run.id == load(path)[0].id
    assert run.meta["raw_text"] == raw
    (error,) = run.meta["parse_errors"]
    assert error["line"] == 4
    assert "fixture-only" not in str(error)


def test_runner_separate_runs_and_indexed_observations(tmp_path):
    path = write_jsonl(tmp_path / "trace.events.jsonl", [
        {"type": "run.start", "task_id": "shared"},
        {"type": "action", "idx": 2, "tool": "a"},
        {"type": "action", "idx": 6, "tool": "b"},
        {"type": "observation", "step_idx": 6, "observation": {"text": "b result", "truncated": True}},
        {"type": "observation", "step_idx": 2, "text": "a result"},
        {"type": "run.end", "outcome": {"label": "done", "partial_score": 0.3}},
        {"type": "run.start", "task_id": "shared"},
        {"type": "run.end", "outcome": {"label": "empty"}},
    ])
    first, second = load(path)
    assert first.task_id == second.task_id == "shared"
    assert first.id != second.id
    assert first.outcome.partial_score == 0.3
    assert [(step.idx, step.observation.text) for step in first.steps] == [(2, "a result"), (6, "b result")]
    assert first.steps[1].observation.truncated
    assert second.steps == []
    assert first.meta["raw_text"] == second.meta["raw_text"] == path.read_text(encoding="utf-8")


def test_runner_idless_observation_follows_only_pending_action(tmp_path):
    path = write_jsonl(tmp_path / "trace.jsonl", [
        {"type": "action", "idx": 7, "tool": "shell", "command": "pwd"},
        {"type": "observation", "text": "somewhere"},
    ])
    (run,) = load(path)
    (step,) = run.steps
    assert step.idx == 7
    assert step.observation.text == "somewhere"


def test_codex_exec_uses_completed_items_and_explicit_outcomes(tmp_path):
    path = write_jsonl(tmp_path / "exec.jsonl", [
        {"type": "thread.started", "thread_id": "thread-1"},
        {"type": "turn.started"},
        {"type": "item.completed", "item": {"type": "agent_message", "text": "I will inspect this."}},
        {"type": "item.started", "item": {"type": "command_execution", "id": "cmd", "command": "pwd"}},
        {"type": "item.updated", "item": {"type": "command_execution", "id": "cmd", "command": "pwd"}},
        {"type": "item.completed", "item": {
            "type": "command_execution", "id": "cmd", "command": "pwd", "aggregated_output": "somewhere",
            "exit_code": 1, "status": "completed",
        }},
        {"type": "item.completed", "item": {
            "type": "file_change", "changes": [{"path": r"src\.\test.py", "kind": "update"}],
            "status": "completed",
        }},
        {"type": "item.completed", "item": {
            "type": "mcp_tool_call", "tool": "lookup", "server": "fixtures",
            "arguments": {"query": "example"}, "error": {"message": "unavailable"}, "status": "failed",
        }},
        {"type": "item.completed", "item": {
            "type": "web_search", "query": "example", "action": {"type": "search"},
            "results": [{"text": "found"}],
        }},
        {"type": "item.completed", "item": {"type": "new_item", "extension": "unmapped"}},
        {"type": "turn.completed", "usage": {"input_tokens": 5, "output_tokens": 2}},
        {"type": "turn.started"},
        {"type": "item.completed", "item": {"type": "reasoning", "text": "Review the patch."}},
        {"type": "item.completed", "item": {"type": "agent_message", "text": "Done."}},
        {"type": "turn.completed", "usage": {"input_tokens": 3, "output_tokens": 1}},
    ])
    (run,) = load(path)
    assert (run.id, run.task_id, run.model) == ("thread-1", "thread-1", "unknown")
    assert (run.usage.input_tokens, run.usage.output_tokens) == (8, 3)
    assert (run.outcome.label, run.outcome.passed) == ("unknown", None)
    update, command, change, mcp, web, reasoning, final = run.steps
    assert update.tags == []
    assert command.raw_ref.line == 6
    assert command.observation.error
    assert change.action.targets == ["src/test.py"]
    assert mcp.action.args == {"query": "example"}
    assert (mcp.observation.text, mcp.observation.error) == ("unavailable", True)
    assert web.action.args["query"] == "example"
    assert web.observation.text == "found"
    assert reasoning.thought == "Review the patch."
    assert final.tags == ["final_message"]
    assert run.meta["final_message"] == "Done."
    assert "unmapped" in run.meta["raw_text"]


def test_codex_rollout_parallel_custom_and_function_calls(tmp_path):
    def item(kind, **fields):
        return {"timestamp": "2026-01-01T00:00:00Z", "type": "response_item",
                "payload": {"type": kind, **fields}}

    path = write_jsonl(tmp_path / "rollout-example.jsonl", [
        {"type": "session_meta", "payload": {"id": "rollout", "model_provider": "test-provider"}},
        item("custom_tool_call", call_id="patch", name="apply_patch", input="*** Update File: src/main.py"),
        item("function_call", call_id="exec", name="exec_command", arguments='{"cmd":"pytest"}'),
        item("function_call", call_id="lost", name="check", arguments="{unfinished"),
        item(
            "function_call_output", call_id="exec",
            output="Chunk ID: x\nProcess exited with code 7\nOutput:\nfailed",
        ),
        item("custom_tool_call_output", call_id="patch", output={"body": "patched"}),
        item("custom_tool_call_output", call_id="unknown", output="orphan"),
        {"type": "event_msg", "payload": {"type": "token_count", "info": {
            "total_token_usage": {"input_tokens": 11, "output_tokens": 2},
        }}},
        {"type": "event_msg", "payload": {"type": "token_count", "info": None}},
        {"type": "event_msg", "payload": {"type": "turn_complete", "last_agent_message": "Done."}},
    ])
    (run,) = load(path)
    patch, command, unmatched, orphan, final = run.steps
    assert run.model == "unknown"
    assert patch.action.targets == ["src/main.py"]
    assert patch.observation.text == "patched"
    assert patch.ts == "2026-01-01T00:00:00Z"
    assert command.action.command == "pytest"
    assert command.observation.exit_code == 7
    assert command.observation.error
    assert unmatched.action.args == {"arguments": "{unfinished"}
    assert unmatched.observation is None
    assert orphan.action is None
    assert orphan.observation.text == "orphan"
    assert run.usage.input_tokens == 11
    assert final.raw_ref.line == 10
    assert final.tags == ["final_message"]


def test_openai_bare_messages_match_outputs_by_id(tmp_path):
    path = tmp_path / "messages.json"
    messages = [
        {"role": "assistant", "tool_calls": [
            {"id": "a", "function": {"name": "shell", "arguments": {"cmd": "pwd"}}},
            {"id": "b", "function": {"name": "shell", "arguments": '{"cmd":"ls"}'}},
            {"id": "c", "function": {"name": "shell", "arguments": '{"cmd":"cat"}'}},
        ]},
        {"role": "tool", "tool_call_id": "b", "content": [{"type": "text", "text": "b"}], "exit_code": 2},
        {"role": "tool", "tool_call_id": "a", "content": "a"},
        {"role": "tool", "tool_call_id": "z", "content": "orphan"},
        {
            "role": "assistant",
            "content": [{"type": "text", "text": "First."}, {"type": "text", "text": "Second."}],
            "finish_reason": "stop",
        },
    ]
    path.write_text(json.dumps(messages), encoding="utf-8")
    (run,) = load(path)
    first, second, unmatched, orphan, final = run.steps
    assert [step.action.command for step in run.steps if step.action] == ["pwd", "ls", "cat"]
    assert first.observation.text == "a"
    assert second.observation.text == "b"
    assert second.observation.error
    assert unmatched.observation is None
    assert orphan.action is None
    assert orphan.observation.text == "orphan"
    assert final.thought == "First.\nSecond."
    assert run.outcome.finish_reason == "stop"
    assert run.outcome.passed is None
    assert all(step.raw_ref.line is None for step in run.steps)


@pytest.mark.parametrize("source_format", ["events_jsonl", "codex_cli", "openai_messages"])
def test_empty_run(tmp_path, source_format):
    path = tmp_path / "empty.trace"
    path.write_bytes(b"")
    (run,) = load(path, source_format)
    assert run.steps == []
    assert run.meta["raw_text"] == ""
    assert (run.outcome.label, run.outcome.passed) == ("unknown", None)


@pytest.mark.parametrize(("raw", "context"), [
    (b'{"secret":"fixture-only"', "messages.json:1:"),
    (b'["fixture-only", "\xff"]', "messages.json: invalid UTF-8 at byte"),
    (b'{"secret":"fixture-only"}', "messages.json: expected a messages array"),
])
def test_parse_errors_are_contextual_and_redacted(tmp_path, raw, context):
    path = tmp_path / "messages.json"
    path.write_bytes(raw)
    with pytest.raises(AdapterError) as exc:
        load(path)
    assert context in str(exc.value)
    assert "fixture-only" not in str(exc.value)
