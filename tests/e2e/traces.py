"""Generate synthetic event logs for CLI QA and first graph render timing."""

import argparse
import json
from pathlib import Path


SIZES = (500, 2000)


def write_recording(directory: Path) -> None:
    def row(kind, second, **payload):
        return {"type": kind, "timestamp": f"2026-01-01T00:00:{second:02}Z", "payload": payload}

    def token(total_in, total_out, last_in, last_out):
        return row("event_msg", 6, type="token_count", info={
            "total_token_usage": {"input_tokens": total_in, "output_tokens": total_out, "cached_input_tokens": 10, "reasoning_output_tokens": 2, "total_tokens": total_in + total_out},
            "last_token_usage": {"input_tokens": last_in, "output_tokens": last_out},
        })

    patch = "*** Begin Patch\n*** Update File: src/example.py\n@@\n-value = 1\n+value = 2\n*** End Patch"
    records = [
        row("session_meta", 0, id="qa-recording", task_id="synthetic-recording", model="synthetic", originator="synthetic", model_provider="synthetic", cli_version="synthetic"),
        row("event_msg", 0, type="task_started"),
        row("response_item", 1, type="message", role="user", content=[{"text": "Synthetic task."}]),
        row("response_item", 1, type="reasoning", summary=[{"text": "Inspect the synthetic failure."}]),
        row("response_item", 1, type="custom_tool_call", call_id="synthetic-test", name="exec", input='const r = await tools.exec_command({"cmd":"pytest -q"});\ntext(r.output);\n'),
        row("response_item", 3, type="custom_tool_call_output", call_id="synthetic-test", output="Script completed\nWall time 0.25 seconds\nOutput:\n1 failed"),
        token(100, 10, 100, 10),
        row("response_item", 4, type="custom_tool_call", call_id="synthetic-patch", name="exec", input=f"const patch = {json.dumps(patch)};\ntext(await tools.apply_patch(patch));\n"),
        row("response_item", 5, type="custom_tool_call_output", call_id="synthetic-patch", output="Script completed\nWall time 0.1 seconds\nOutput:\npatched"),
        token(150, 30, 50, 20),
        row("response_item", 6, type="message", role="assistant", phase="final_answer", content=[{"text": "Synthetic completion."}]),
        token(200, 40, 50, 10),
        row("event_msg", 20, type="task_complete", last_agent_message="Synthetic completion."),
    ]
    (directory / "qa-recording.codex.jsonl").write_text("\n".join(json.dumps(r) for r in records) + "\n")


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
        long_text="\n".join(f"Long synthetic observation {line}: " + "recorded " * 25 for line in range(800)) + "\nqa-end-of-observation",
        repeat_every=50,
    )
    write_events(args.directory, "qa-exact-indices", 2, repeat_every=2, first_index=9007199254740992, stride=1)
    write_events(args.directory, "qa-zero-steps", 0)
    write_recording(args.directory)
