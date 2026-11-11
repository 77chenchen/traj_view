"""Adapter for OpenAI-style chat messages and their tool results."""

from schema import Trajectory

from ._common import (
    AdapterError,
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
)


def _assistant(run: Run, message: Record) -> None:
    ts = timestamp(message)
    calls = as_list(message.get("tool_calls"))
    legacy_call = as_record(message.get("function_call"))
    if legacy_call:
        calls = [*calls, {"function": legacy_call}]
    thought = content_text(message.get("reasoning_content", message.get("reasoning")))
    content = content_text(message.get("content"))
    run.final_step = None

    if calls:
        for entry in calls:
            call = as_record(entry)
            custom = as_record(call.get("custom"))
            function = as_record(call.get("function"))
            name = string((custom or function).get("name"))
            if not name:
                continue
            args = {"input": custom.get("input")} if custom else arguments(function.get("arguments"))
            step = run.step(None, ts, thought=thought or content, action=action(name, args))
            key = string(call.get("id"))
            if key is None and function is legacy_call:
                key = f"function:{name}"
            if key:
                run.pending[key].append(step)
    elif content:
        run.final_step = run.step(None, ts, thought=content)
    elif thought:
        run.step(None, ts, thought=thought)

    if "finish_reason" in message:
        run.update({"finish_reason": message["finish_reason"]})


def parse(source: Source) -> list[Trajectory]:
    document = source.json_document()
    wrapper = as_record(document)
    messages = document if isinstance(document, list) else wrapper.get("messages")
    if not isinstance(messages, list):
        raise AdapterError(f"{source.path.name}: expected a messages array")

    run = Run(source, "openai_messages")
    run.update(wrapper)
    for index, entry in enumerate(messages):
        if not isinstance(entry, dict):
            source.parse_errors.append({"message_index": index, "message": "expected an object"})
            continue
        role = string(entry.get("role"))
        if role == "assistant":
            _assistant(run, entry)
        elif role in {"tool", "function"}:
            run.final_step = None
            key = string(entry.get("tool_call_id"))
            if role == "function" and not key:
                name = string(entry.get("name"))
                key = f"function:{name}" if name else None
            run.output(key, observation(entry.get("content"), entry), None, timestamp(entry))
        elif role == "user":
            run.final_step = None

    run.final(wrapper.get("final_message", run.meta.get("final_message")), None, timestamp(wrapper))
    return [run.build(agent="openai-messages")]
