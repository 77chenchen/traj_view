"""Load local agent traces into the frozen trajectory schema."""

from pathlib import Path

from pydantic import ValidationError

from schema import Trajectory

from . import codex_cli, events_jsonl, openai_messages
from ._common import FORMAT_SUFFIXES, AdapterError, Source, string

__all__ = ["AdapterError", "load"]


def load(path: Path, source_format: str | None = None) -> list[Trajectory]:
    """Load a trace, inferring the format from its filename or records.

    Malformed JSONL lines are recorded in `meta.parse_errors`. Unreadable
    inputs and invalid OpenAI JSON documents raise AdapterError.
    """
    path = Path(path)
    if source_format not in (None, "events_jsonl", "codex_cli", "openai_messages"):
        raise AdapterError(f"{path.name}: unsupported source format")

    try:
        return _load(Source(path), source_format)
    except ValidationError:
        raise AdapterError(f"{path.name}: invalid canonical trajectory") from None


def _load(source: Source, source_format: str | None) -> list[Trajectory]:
    path = source.path
    if source_format is None:
        source_format = next(
            (format_name for suffix, format_name in FORMAT_SUFFIXES.items() if path.name.endswith(suffix)),
            None,
        )
    if source_format == "openai_messages":
        return openai_messages.parse(source)
    if source_format is None and path.suffix != ".jsonl" and (
        path.suffix == ".json" or source.text.lstrip().startswith("[")
    ):
        return openai_messages.parse(source)

    lines = source.json_lines()
    if source_format is None:
        kinds = {string(record.get("type")) for _, record in lines}
        if kinds & (codex_cli.EXEC_TYPES | codex_cli.ROLLOUT_TYPES) or (
            path.name.startswith("rollout-") and path.suffix == ".jsonl"
        ):
            source_format = "codex_cli"
        elif path.suffix != ".jsonl" and len(lines) == 1 and "messages" in lines[0][1]:
            source.parse_errors.clear()
            return openai_messages.parse(source)

    if source_format == "codex_cli":
        return codex_cli.parse(source, lines)
    return events_jsonl.parse(source, lines)
