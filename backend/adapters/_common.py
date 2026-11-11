"""Shared parsing and canonicalization for the input adapters."""

import hashlib
import json
import math
import posixpath
import shlex
from collections import defaultdict, deque
from pathlib import Path

from pydantic import JsonValue

from schema import Action, Limits, Observation, Outcome, RawRef, Step, Trajectory, Usage

Record = dict[str, JsonValue]
Line = tuple[int, Record]
FORMAT_SUFFIXES = {
    ".events.jsonl": "events_jsonl",
    ".codex.jsonl": "codex_cli",
    ".messages.json": "openai_messages",
}


class AdapterError(ValueError):
    """An input could not be read or parsed."""


def as_record(value: JsonValue) -> Record:
    return value if isinstance(value, dict) else {}


def as_list(value: JsonValue) -> list[JsonValue]:
    return value if isinstance(value, list) else []


def string(value: JsonValue) -> str | None:
    return value if isinstance(value, str) else None


def integer(value: JsonValue) -> int | None:
    return value if type(value) is int else None


def nonnegative_int(value: JsonValue) -> int | None:
    value = integer(value)
    return value if value is not None and value >= 0 else None


def number(value: JsonValue) -> float | None:
    try:
        return float(value) if type(value) in (int, float) and math.isfinite(value) else None
    except OverflowError:
        return None


def nonnegative_number(value: JsonValue) -> float | None:
    value = number(value)
    return value if value is not None and value >= 0 else None


def timestamp(record: Record) -> str | None:
    return string(record.get("ts")) or string(record.get("timestamp"))


def _invalid_constant(_: str) -> None:
    raise ValueError("nonfinite JSON number")


def _finite_float(text: str) -> float:
    value = float(text)
    if not math.isfinite(value):
        _invalid_constant(text)
    return value


def decode_json(text: str) -> JsonValue:
    value = json.loads(text, parse_constant=_invalid_constant, parse_float=_finite_float)
    # Escaped, unpaired surrogates decode in Python but cannot round-trip as UTF-8.
    if "\\u" in text:
        json.dumps(value, ensure_ascii=False).encode("utf-8")
    return value


class Source:
    def __init__(self, path: Path):
        self.path = path
        try:
            self.raw_text = path.read_bytes().decode("utf-8")
        except UnicodeDecodeError as error:
            raise AdapterError(f"{path.name}: invalid UTF-8 at byte {error.start + 1}") from None
        except OSError:
            raise AdapterError(f"{path.name}: could not read input") from None
        self.text = self.raw_text.removeprefix("\ufeff")
        self.parse_errors: list[JsonValue] = []

    def json_lines(self) -> list[Line]:
        records = []
        for line_number, line in enumerate(self.text.split("\n"), 1):
            if not line.strip():
                continue
            try:
                record = decode_json(line)
            except json.JSONDecodeError as error:
                self.parse_errors.append(
                    {"line": line_number, "column": error.colno, "message": "invalid JSON"}
                )
            except (ValueError, RecursionError):
                self.parse_errors.append({"line": line_number, "message": "invalid JSON"})
            else:
                if isinstance(record, dict):
                    records.append((line_number, record))
                else:
                    self.parse_errors.append({"line": line_number, "message": "expected an object"})
        return records

    def json_document(self) -> JsonValue:
        if not self.text.strip():
            return []
        try:
            return decode_json(self.text)
        except json.JSONDecodeError as error:
            raise AdapterError(
                f"{self.path.name}:{error.lineno}:{error.colno}: invalid JSON"
            ) from None
        except (ValueError, RecursionError):
            raise AdapterError(f"{self.path.name}: invalid JSON") from None

    def fallback_id(self, ordinal: int) -> str:
        name = self.path.name
        stem = next(
            (name.removesuffix(suffix) for suffix in FORMAT_SUFFIXES if name.endswith(suffix)),
            self.path.stem,
        )
        digest = hashlib.sha256(self.raw_text.encode("utf-8")).hexdigest()[:12]
        base = f"{stem or 'run'}-{digest}"
        return base if ordinal == 1 else f"{base}-{ordinal}"


def content_text(value: JsonValue) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = [text for part in value if (text := string(as_record(part).get("text"))) is not None]
        return "\n".join(parts) if parts else None
    return None


def render_text(value: JsonValue) -> str:
    text = content_text(value)
    if text is not None:
        return text
    return "" if value is None else json.dumps(value, ensure_ascii=False)


def arguments(value: JsonValue) -> Record:
    if isinstance(value, str):
        try:
            value = decode_json(value)
        except (ValueError, RecursionError):
            pass
    if isinstance(value, dict):
        return value
    return {} if value is None else {"arguments": value}


def action(tool: str, args: Record, *, command: JsonValue = None, targets: JsonValue = None) -> Action:
    if command is None:
        command = args.get("command", args.get("cmd"))
    if isinstance(command, list) and all(isinstance(part, str) for part in command):
        command = shlex.join(command)
    if targets is None:
        targets = args.get("targets", args.get("path", args.get("file_path")))
    paths = [targets] if isinstance(targets, str) else as_list(targets)
    return Action(
        tool=tool.lower(),
        args=args,
        command=string(command),
        targets=list(dict.fromkeys(
            posixpath.normpath(path.replace("\\", "/")) for path in paths
            if isinstance(path, str) and path
        )),
    )


def observation(value: JsonValue, record: Record) -> Observation:
    details = as_record(value)
    fields = {**record, **details}
    exit_code = integer(fields.get("exit_code"))
    status = string(fields.get("status"))
    text = next((details[key] for key in ("text", "output", "content", "body") if key in details), value)
    error = fields.get("error")
    return Observation(
        text=render_text(text),
        exit_code=exit_code,
        truncated=fields.get("truncated") is True,
        error=(
            exit_code not in (0, None)
            or error is True
            or (isinstance(error, (str, dict)) and bool(error))
            or fields.get("isError") is True
            or fields.get("success") is False
            or status in {"failed", "error", "declined"}
        ),
    )


def usage(value: JsonValue) -> Usage | None:
    fields = as_record(value)
    result = Usage(
        input_tokens=nonnegative_int(fields.get("input_tokens", fields.get("prompt_tokens"))),
        output_tokens=nonnegative_int(fields.get("output_tokens", fields.get("completion_tokens"))),
        wall_s=nonnegative_number(fields.get("wall_s")),
    )
    return result if result.model_dump(exclude_none=True) else None


class Run:
    def __init__(self, source: Source, source_format: str, ordinal: int = 1):
        self.source = source
        self.source_format = source_format
        self.ordinal = ordinal
        self.fields: Record = {}
        self.meta: Record = {}
        self.outcome_fields: Record = {}
        self.usage: Usage | None = None
        self.steps: list[Step] = []
        self.final_step: Step | None = None
        self.pending: dict[str | None, deque[Step]] = defaultdict(deque)

    def update(self, record: Record) -> None:
        metadata = {**as_record(record.get("metadata")), **as_record(record.get("meta"))}
        self.meta.update(metadata)
        fields = {**metadata, **record}
        self.fields.update({key: value for key, value in fields.items() if value is not None})
        outcome = as_record(fields.get("outcome"))
        label = string(fields.get("outcome")) or string(fields.get("outcome_label"))
        if label is not None:
            self.outcome_fields["label"] = label
        for key in ("passed", "partial_score", "finish_reason"):
            if key in fields:
                self.outcome_fields[key] = fields[key]
        self.outcome_fields.update(outcome)
        recorded_usage = usage(fields.get("usage"))
        if recorded_usage is not None:
            self.usage = recorded_usage

    def step(
        self,
        line: int | None,
        ts: str | None = None,
        idx: int | None = None,
        **fields,
    ) -> Step:
        next_index = self.steps[-1].idx + 1 if self.steps else 0
        step = Step(
            idx=max(next_index, idx) if idx is not None else next_index,
            ts=ts,
            raw_ref=RawRef(file=str(self.source.path), line=line),
            **fields,
        )
        self.steps.append(step)
        return step

    def output(self, key: str | None, result: Observation, line: int | None, ts: str | None) -> None:
        pending = self.pending.get(key)
        if pending:
            step = pending.popleft()
            step.observation = result
            if not pending:
                del self.pending[key]
        else:
            self.step(line, ts, observation=result)

    def final(self, value: JsonValue, line: int | None, ts: str | None) -> None:
        text = content_text(value)
        if not text:
            return
        if self.final_step is not None and self.final_step.thought == text:
            return
        last = self.steps[-1] if self.steps else None
        if last and last.action is None and last.observation is None and last.thought == text:
            self.final_step = last
        else:
            self.final_step = self.step(line, ts, thought=text)

    def build(self, *, agent: str = "unknown") -> Trajectory:
        fields = self.fields
        outcome = self.outcome_fields
        limits = as_record(fields.get("limits"))
        run_id = (
            string(fields.get("id"))
            or string(fields.get("run_id"))
            or self.source.fallback_id(self.ordinal)
        )
        meta = {**self.meta, "raw_text": self.source.raw_text}
        meta.pop("final_message", None)
        if self.source.parse_errors:
            meta["parse_errors"] = self.source.parse_errors
        if self.final_step is not None:
            meta["final_message"] = self.final_step.thought
            if "final_message" not in self.final_step.tags:
                self.final_step.tags.append("final_message")
        return Trajectory(
            id=run_id,
            source_format=self.source_format,
            task_id=string(fields.get("task_id")) or run_id,
            model=string(fields.get("model")) or "unknown",
            agent=string(fields.get("agent")) or agent,
            condition=string(fields.get("condition")) or "default",
            outcome=Outcome(
                label=string(outcome.get("label")) or "unknown",
                passed=outcome.get("passed") if isinstance(outcome.get("passed"), bool) else None,
                partial_score=number(outcome.get("partial_score")),
                finish_reason=string(outcome.get("finish_reason")),
            ),
            limits=Limits(
                max_steps=nonnegative_int(limits.get("max_steps")),
                wall_clock_s=nonnegative_number(limits.get("wall_clock_s")),
            ) if limits else None,
            usage=self.usage,
            meta=meta,
            steps=self.steps,
        )
