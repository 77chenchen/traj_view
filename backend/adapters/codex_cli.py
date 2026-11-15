"""Adapters for Codex exec JSONL and persisted session rollouts."""

from collections import Counter
from datetime import datetime
import json
import re

from schema import Tokens, Trajectory, Usage

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
WALL_TIME = re.compile(r"^Wall time:? (\d{1,10}(?:\.\d{1,6})?) seconds\s*$", re.MULTILINE)


def _wrapped_action(name: str, code: object):
    """Decode only complete, known literal wrappers; never execute JavaScript.

    A single outer call remains a single step. Conditional, computed, multiple
    or unknown invocations retain their original exec input unchanged.
    """
    if name not in {"exec", "functions.exec"} or not isinstance(code, str):
        return None
    direct = re.match(r"\s*const (\w+) = await tools\.(exec_command|write_stdin)\(\s*", code)
    patch = re.match(r"\s*const (\w+) =\s*", code) if direct is None else None
    match = direct or patch
    if match is None:
        return None
    try:
        value, end = json.JSONDecoder().raw_decode(code[match.end():])
        json.dumps(value, allow_nan=False)
    except (ValueError, RecursionError):
        return None
    tail = code[match.end() + end:]
    binding = re.escape(match[1])
    if direct:
        if not isinstance(value, dict) or not re.fullmatch(
            rf"\s*\);\s*text\(\s*{binding}(?:\.output)?\s*\);?\s*", tail
        ):
            return None
        # Keep the exact submitted wrapper alongside its literal inner args.
        if "recorded_wrapper" in value:
            return None
        return action(match[2], {**value, "recorded_wrapper": {"tool": name, "input": code}})
    if not isinstance(value, str) or not value.startswith("*** Begin Patch\n") or not re.fullmatch(
        rf"\s*;\s*text\(\s*await tools\.apply_patch\(\s*{binding}\s*\)\s*\);?\s*", tail
    ):
        return None
    return action("apply_patch", {"input": value, "recorded_wrapper": {"tool": name, "input": code}},
                  targets=PATCH_PATH.findall(value))


def _elapsed(start: str | None, end: str | None) -> float | None:
    if not start or not end:
        return None
    try:
        a = datetime.fromisoformat(start.replace("Z", "+00:00"))
        b = datetime.fromisoformat(end.replace("Z", "+00:00"))
        value = (b - a).total_seconds() if a.tzinfo and b.tzinfo else -1
    except (ValueError, OverflowError, TypeError):
        return None
    return value if value >= 0 else None


def _source(run: Run, line: int) -> dict:
    return {"file": str(run.source.path), "line": line}


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
            current_meta = {**as_record(record.get("metadata")), **as_record(record.get("meta"))}
            run.final(record.get("final_message", current_meta.get("final_message")), line, ts)

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
            tool_action = _wrapped_action(name, tool_input) or action(name, {"input": tool_input}, targets=targets)
        else:
            tool_action = action(name, arguments(item.get("arguments")))
        step = run.step(line, ts, action=tool_action)
        run.meta["rollout"]["steps"][str(step.idx)] = {
            "source_type": kind, "call_id": key, "timestamp": ts,
            "role": "assistant", "channel": "tool_call",
            "source_ref": _source(run, line),
            "wrapper_tool": name if "recorded_wrapper" in tool_action.args else None,
        }
        if key is not None:
            run.pending[key].append(step)
    elif kind in OUTPUT_TYPES:
        output = item.get("output")
        result = observation(output, item)
        pending = run.pending.get(key)
        unmatched = not pending
        tool = pending[0].action.tool if pending and pending[0].action else None
        if pending:
            step = pending[0]
            details = run.meta["rollout"]["steps"][str(step.idx)]
            details.update(output_timestamp=ts, output_ref=_source(run, line),
                           call_interval_s=_elapsed(step.ts, ts))
            header = result.text.split("\nOutput:", 1)[0].split("\nFinal output:", 1)[0]
            wall = WALL_TIME.search(header) if header.startswith(("Script completed", "Script running", "Script error", "Chunk ID:")) else None
            if wall:
                details["reported_wall_s"] = float(wall[1])
                details["wall_scope"] = "wrapper" if details["wrapper_tool"] else "tool"
        if tool in {"exec_command", "write_stdin"} and result.exit_code is None:
            # The shell tool sometimes serializes its exit code in a text header.
            header = result.text.split("\nOutput:", 1)[0].split("\nFinal output:", 1)[0]
            if header.startswith(("Chunk ID:", "Process exited with code ")):
                match = PROCESS_EXIT.search(header)
                if match:
                    result.exit_code = int(match[1])
                    result.error |= result.exit_code != 0
        run.output(key, result, line, ts)
        if unmatched:
            # Preserve standalone outputs too; no missing call or duration is invented.
            run.meta["rollout"]["steps"][str(run.steps[-1].idx)] = {
                "source_type": kind, "channel": "tool_output", "call_id": key,
                "source_ref": _source(run, line), "output_timestamp": ts,
                "output_ref": _source(run, line), "unmatched_output": True,
            }
    elif kind == "message":
        role = item.get("role")
        text = content_text(item.get("content"))
        run.meta["rollout"]["messages"].append({
            "role": role, "channel": item.get("phase", item.get("channel")),
            "text": text, "timestamp": ts, "source_ref": _source(run, line),
        })
        if role == "user":
            run.final_step = None
        if role == "assistant":
            if text:
                step = run.step(line, ts, thought=text)
                run.meta["rollout"]["steps"][str(step.idx)] = {
                    "source_type": kind, "role": role,
                    "channel": item.get("phase", item.get("channel")), "source_ref": _source(run, line),
                }
                run.final_step = step if item.get("phase") in (None, "final_answer") else None
    elif kind == "reasoning":
        thought = content_text(item.get("summary")) or content_text(item.get("content"))
        if thought:
            run.final_step = None
            step = run.step(line, ts, thought=thought)
            run.meta["rollout"]["steps"][str(step.idx)] = {
                "source_type": kind, "role": "assistant", "channel": "reasoning",
                "source_ref": _source(run, line),
            }


def _rollout(source: Source, lines: list[Line]) -> Trajectory:
    run = Run(source, "codex_cli")
    recording = {
        "session": {}, "steps": {}, "messages": [], "usage_records": [],
        "events": [], "event_counts": dict(Counter(string(record.get("type")) or "unknown" for _, record in lines)),
        "raw_records": len(lines),
    }
    run.meta["rollout"] = recording
    cumulative_usage = None
    previous_total = None
    for line, record in lines:
        kind = string(record.get("type"))
        payload = as_record(record.get("payload"))
        ts = timestamp(record) or timestamp(payload)
        if kind == "session_meta":
            run.update(payload)
            recording["session"] = {key: payload[key] for key in (
                "id", "timestamp", "originator", "cli_version", "model_provider", "cwd",
            ) if key in payload}
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
                detailed_total = as_record(info.get("total_token_usage"))
                recording["token_totals"] = detailed_total or recording.get("token_totals", {})
                last_fields = as_record(info.get("last_token_usage"))
                total_key = json.dumps(detailed_total, sort_keys=True) if detailed_total else str(line)
                if last is not None and run.steps and total_key != previous_total:
                    step = run.steps[-1]
                    detail = recording["steps"].get(str(step.idx))
                    if detail is not None:
                        step.tokens = Tokens(**{"in": last.input_tokens, "out": last.output_tokens})
                        detail.update(token_scope="Model response ending at this step; shared reasoning/messages are not counted twice",
                                      token_ref=_source(run, line), token_usage=last_fields)
                previous_total = total_key
            elif event in {"task_started", "turn_started", "task_complete", "turn_complete"}:
                recording["events"].append({"type": event, "timestamp": ts, "source_ref": _source(run, line)})
                if event in {"task_started", "turn_started"}:
                    run.final_step = None
                run.update(payload)
                before = len(run.steps)
                run.final(payload.get("final_message", payload.get("last_agent_message")), line, ts)
                if len(run.steps) > before:
                    recording["steps"][str(run.steps[-1].idx)] = {
                        "source_type": "event_msg", "channel": event,
                        "source_ref": _source(run, line),
                    }
        elif kind == "token_usage_record":
            # Preserve cache/reasoning counters and response IDs without adding
            # them a second time to token_count's cumulative run totals.
            recording["usage_records"].append({"timestamp": ts, "source_ref": _source(run, line), **payload})

    events = recording["events"]
    starts = [event for event in events if event["type"] in {"task_started", "turn_started"}]
    ends = [event for event in events if event["type"] in {"task_complete", "turn_complete"}]
    if starts and ends and events[-1] in ends:
        elapsed = _elapsed(starts[0]["timestamp"], ends[-1]["timestamp"])
        if elapsed is not None:
            recording["timing"] = {"start": starts[0], "end": ends[-1], "elapsed_s": elapsed,
                                   "scope": "Session span between recorded start/completion events; includes waits"}
            if run.usage is None:
                run.usage = Usage(wall_s=elapsed)
            elif run.usage.wall_s is None:
                run.usage.wall_s = elapsed

    agent = string(run.fields.get("originator")) or "codex-cli"
    return run.build(agent=agent)


def parse(source: Source, lines: list[Line]) -> list[Trajectory]:
    if any(string(record.get("type")) in ROLLOUT_TYPES for _, record in lines):
        return [_rollout(source, lines)]
    return [_exec(source, lines)]
