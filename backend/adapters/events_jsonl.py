"""Adapter for runner event streams."""

from schema import Tokens, Trajectory

from ._common import (
    Line,
    Record,
    Run,
    Source,
    action,
    arguments,
    as_list,
    as_record,
    nonnegative_int,
    observation,
    string,
    timestamp,
)

EVENT_TYPES = {"run.start", "run.end", "step", "action", "observation"}


def _call_key(record: Record) -> str | None:
    key = string(record.get("call_id")) or string(record.get("action_id")) or string(record.get("id"))
    idx = nonnegative_int(record.get("step_idx", record.get("idx")))
    return key or (f"step:{idx}" if idx is not None else None)


def _step(run: Run, line: int, record: Record, *, separate_action: bool) -> None:
    action_fields = as_record(record.get("action"))
    if separate_action and not action_fields:
        action_fields = record
    tool = string(action_fields.get("tool"))
    tool_action = None
    if tool:
        tool_action = action(
            tool,
            arguments(action_fields.get("args")),
            command=action_fields.get("command"),
            targets=action_fields.get("targets"),
        )
    output = record.get("observation")
    token_fields = as_record(record.get("tokens"))
    tokens = None
    if token_fields:
        tokens = Tokens(**{
            "in": nonnegative_int(token_fields.get("in")),
            "out": nonnegative_int(token_fields.get("out")),
        })
    phase_source = record.get("phase_source")
    step = run.step(
        line,
        timestamp(record),
        nonnegative_int(record.get("idx")),
        thought=string(record.get("thought")),
        action=tool_action,
        observation=observation(output, record) if output is not None else None,
        tokens=tokens,
        phase=string(record.get("phase")),
        phase_source=phase_source if phase_source in ("rule", "llm") else None,
        tags=[tag for tag in as_list(record.get("tags")) if isinstance(tag, str)],
    )
    if step.action is None and step.thought and "final_message" in step.tags:
        run.final_step = step
    key = _call_key(action_fields) or _call_key(record)
    if (separate_action or key is not None) and step.action is not None and step.observation is None:
        run.pending[key].append(step)


def parse(source: Source, lines: list[Line]) -> list[Trajectory]:
    runs: list[Run] = []
    run = Run(source, "events_jsonl")
    has_events = False
    for line, record in lines:
        kind = string(record.get("type"))
        if kind == "run.start" and has_events:
            runs.append(run)
            run = Run(source, "events_jsonl", len(runs) + 1)
        has_events |= kind in EVENT_TYPES

        if kind in {"run.start", "run.end"}:
            run.update(record)
            run.final(record.get("final_message", run.meta.get("final_message")), line, timestamp(record))
        elif kind in {"step", "action"}:
            _step(run, line, record, separate_action=kind == "action")
        elif kind == "observation":
            output = next(
                (record[key] for key in ("observation", "text", "output", "content") if key in record),
                None,
            )
            key = _call_key(record)
            if key is None and len(run.pending) == 1:
                only_key, pending = next(iter(run.pending.items()))
                if len(pending) == 1:
                    key = only_key
            run.output(key, observation(output, record), line, timestamp(record))

    return [item.build() for item in [*runs, run]]
