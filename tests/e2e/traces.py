"""Generate synthetic event logs for CLI QA and first graph render timing."""

import argparse
import json
from pathlib import Path


SIZES = (500, 2000)


def write_events(
    directory: Path, run_id: str, step_count: int, *, long_text: str | None = None,
    repeat_every: int = 1, first_index: int = 1, stride: int = 2,
) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{run_id}.events.jsonl"
    with path.open("w", encoding="utf-8") as stream:
        def emit(event: dict) -> None:
            stream.write(json.dumps(event, ensure_ascii=False) + "\n")

        emit({
            "type": "run.start",
            "id": run_id,
            "task_id": "qa-render",
            "agent": "qa-fixture",
            "model": "qa-model",
            "condition": "synthetic",
        })
        for position in range(step_count):
            target = f"src/module-{position // repeat_every:04}.py"
            emit({
                "type": "step",
                "idx": first_index + stride * position,
                "thought": f"Check synthetic module {position}.",
                "action": {"tool": "shell", "command": f"cat {target}", "targets": [target]},
                "observation": {"text": long_text if position == 0 and long_text else "ok", "exit_code": 0},
            })
        emit({"type": "run.end", "outcome": {"label": "unknown"}})
    return path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    for size in SIZES:
        write_events(args.directory, f"qa-render-{size}", size)
    write_events(
        args.directory, "qa-folded-2000", 2000,
        long_text="Long synthetic observation. " * 80 + "qa-end-of-observation",
        repeat_every=50,
    )
    write_events(args.directory, "qa-exact-indices", 2, repeat_every=2, first_index=9007199254740992, stride=1)
