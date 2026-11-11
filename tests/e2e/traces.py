"""Generate synthetic event logs for CLI QA and first graph render timing."""

import argparse
import json
from pathlib import Path


SIZES = (500, 2000)


def write_events(directory: Path, run_id: str, step_count: int, *, long_text: str | None = None) -> Path:
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
            target = f"src/module-{position:04}.py"
            emit({
                "type": "step",
                "idx": 2 * position + 1,
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
