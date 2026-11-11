"""Adapters for Codex exec JSONL and persisted session rollouts."""

import re

from schema import Trajectory

from ._common import (
    Line,
    Record,
    Run,
    Source,
    action,
    arguments,
    as_list,
    as_record,
    content_text,
    observation,
    string,
    timestamp,
    usage,
)

EXEC_TYPES = {
    "thread.started", "turn.started", "turn.completed", "turn.failed",
    "item.started", "item.updated", "item.completed",
}
ROLLOUT_TYPES = {"session_meta", "turn_context", "response_item", "event_msg"}
CALL_TYPES = {"function_call", "custom_tool_call"}
OUTPUT_TYPES = {"function_call_output", "custom_tool_call_output"}
PATCH_PATH = re.compile(r"^\*\*\* (?:Add File|Update File|Delete File|Move to): ([^\r\n]+)", re.MULTILINE)
PROCESS_EXIT = re.compile(r"^Process exited with code (-?\d{1,10})\b", re.MULTILINE)


def _exec_item(run: Run, item: Record, line: int, ts: str | None) -> None:
    kind = string(item.get("type"))
    if kind in {"reasoning", "agent_message"}:
        text = content_text(item.get("text"))
        if text:
            step = run.step(line, ts, thought=text)
            run.final_step = step if kind == "agent_message" else None
        return

    if kind == "command_execution":
        tool_action = action("shell", {}, command=item.get("command"), targets=item.get("targets"))
        output = item.get("aggregated_output")
    elif kind == "file_change":
        changes = as_list(item.get("changes"))
        targets = [as_record(change).get("path") for change in changes]
        tool_action = action("apply_patch", {"changes": changes}, targets=targets)
        output = item.get("output")
    elif kind == "mcp_tool_call":
        args = arguments(item.get("arguments"))
        tool_action = action(string(item.get("tool")) or "mcp_tool_call", args)
        output = item.get("result")
        if output is None:
            output = as_record(item.get("error")).get("message")
    elif kind == "web_search":
        args = {key: item[key] for key in ("query", "action") if key in item}
        tool_action = action("web_search", args)
        output = item.get("results", item.get("result"))
    else:
        return

    run.final_step = None
    run.step(line, ts, action=tool_action, observation=observation(output, item))


def _exec(source: Source, lines: list[Line]) -> Trajectory:
    run = Run(source, "codex_cli")
    turn_totals: Record = {}
    for line, record in lines:
        kind = string(record.get("type"))
        ts = timestamp(record)
        if kind == "item.completed":
            _exec_item(run, as_record(record.get("item")), line, ts)
        elif kind == "thread.started":
            run.update(record)
            thread_id = string(record.get("thread_id"))
            if thread_id and "id" not in run.fields:
                run.fields["id"] = thread_id
        elif kind in {"turn.started", "turn.completed", "turn.failed", "error"}:
            if kind in {"turn.started", "turn.failed", "error"}:
                run.final_step = None
            run.update(record)
            if kind == "turn.completed":
                turn_usage = usage(record.get("usage"))
                if turn_usage is not None:
                    for key, value in turn_usage.model_dump(exclude_none=True).items():
                        turn_totals[key] = turn_totals.get(key, 0) + value
            run.final(record.get("final_message", run.meta.get("final_message")), line, ts)

    if turn_totals:
        run.usage = usage(turn_totals)
    return run.build(agent="codex-cli")


def _rollout_response(run: Run, item: Record, line: int, ts: str | None) -> None:
    kind = string(item.get("type"))
    key = string(item.get("call_id")) or None
    if kind in CALL_TYPES:
        name = string(item.get("name"))
        if not name:
            return
        run.final_step = None
        if kind == "custom_tool_call":
            tool_input = item.get("input")
            targets = (
                PATCH_PATH.findall(tool_input)
                if name == "apply_patch" and isinstance(tool_input, str)
                else None
            )
            tool_action = action(name, {"input": tool_input}, targets=targets)
        else:
            tool_action = action(name, arguments(item.get("arguments")))
        step = run.step(line, ts, action=tool_action)
        if key is not None:
            run.pending[key].append(step)
    elif kind in OUTPUT_TYPES:
        output = item.get("output")
        result = observation(output, item)
        pending = run.pending.get(key)
        tool = pending[0].action.tool if pending and pending[0].action else None
        if tool in {"exec_command", "write_stdin"} and result.exit_code is None:
            # The shell tool sometimes serializes its exit code in a text header.
            header = result.text.split("\nOutput:", 1)[0].split("\nFinal output:", 1)[0]
            if header.startswith(("Chunk ID:", "Process exited with code ")):
                match = PROCESS_EXIT.search(header)
                if match:
                    result.exit_code = int(match[1])
                    result.error |= result.exit_code != 0
        run.output(key, result, line, ts)
    elif kind == "message":
        role = item.get("role")
        if role == "user":
            run.final_step = None
        if role == "assistant":
            text = content_text(item.get("content"))
            if text:
                step = run.step(line, ts, thought=text)
                run.final_step = step if item.get("phase") in (None, "final_answer") else None
    elif kind == "reasoning":
        thought = content_text(item.get("summary")) or content_text(item.get("content"))
        if thought:
            run.final_step = None
            run.step(line, ts, thought=thought)


def _rollout(source: Source, lines: list[Line]) -> Trajectory:
    run = Run(source, "codex_cli")
    cumulative_usage = None
    for line, record in lines:
        kind = string(record.get("type"))
        payload = as_record(record.get("payload"))
        ts = timestamp(record) or timestamp(payload)
        if kind == "session_meta":
            run.update(payload)
        elif kind == "turn_context":
            run.update(payload)
        elif kind == "response_item":
            _rollout_response(run, payload, line, ts)
        elif kind == "event_msg":
            event = string(payload.get("type"))
            if event == "token_count":
                info = as_record(payload.get("info"))
                total = usage(info.get("total_token_usage"))
                last = usage(info.get("last_token_usage"))
                cumulative_usage = total or cumulative_usage
                run.usage = cumulative_usage or last or run.usage
            elif event in {"task_started", "turn_started", "task_complete", "turn_complete"}:
                if event in {"task_started", "turn_started"}:
                    run.final_step = None
                run.update(payload)
                run.final(payload.get("final_message", payload.get("last_agent_message")), line, ts)

    agent = string(run.fields.get("originator")) or "codex-cli"
    return run.build(agent=agent)


def parse(source: Source, lines: list[Line]) -> list[Trajectory]:
    if any(string(record.get("type")) in ROLLOUT_TYPES for _, record in lines):
        return [_rollout(source, lines)]
    return [_exec(source, lines)]
