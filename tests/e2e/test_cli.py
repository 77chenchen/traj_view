"""Test build and export through the CLI with synthetic inputs."""

import csv
import json
from pathlib import Path
import re
import subprocess
import sys

import pytest

from .traces import SIZES, write_events


ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "backend" / "cli.py").is_file(),
    reason="backend.cli is not present in this worktree",
)


def cli(*args: str | Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "backend.cli", *map(str, args)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def build(inputs: Path, output: Path) -> dict:
    completed = cli("build", inputs, "-o", output)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    index = read_json(output / "index.json")
    assert index["schema_version"] == 1
    return index


def test_build_and_export_fixtures(tmp_path: Path) -> None:
    output = tmp_path / "build"
    index = build(ROOT / "fixtures" / "input", output)
    expected_ids = {
        "slug-baseline-timeout", "slug-codex-pass", "slug-codex-rollout",
        "slug-codex-verifier", "slug-empty", "slug-messages-pass",
        "slug-messages-provider", "slug-skill-pass",
        "dag-baseline", "dag-variant", "dag-short",
        "dashboard-baseline", "dashboard-variant", "dashboard-short", "execution-long-synthetic",
        "role-boundaries", "node-types-synthetic", "shell-writes-synthetic",
    }
    assert sorted(run["id"] for run in index["runs"]) == sorted(expected_ids)
    assert set(read_json(output / index["search_file"])) == expected_ids
    for run in index["runs"]:
        assert read_json(output / run["file"])["id"] == run["id"]
        assert read_json(output / run["canonical_file"])["id"] == run["id"]
        assert len(read_json(output / run["steps_file"])["steps"]) == run["metrics"]["steps"]

    csv_path = tmp_path / "metrics.csv"
    completed = cli("export", output, "--csv", csv_path)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    with csv_path.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    by_id = {row.get("run_id") or row["id"]: row for row in rows}
    assert len(rows) == len(expected_ids) and set(by_id) == expected_ids
    for run in index["runs"]:
        row = by_id[run["id"]]
        assert int(row["steps"]) == run["metrics"]["steps"]
        assert int(row["cycles"]) == run["metrics"]["cycles"]


def test_build_zero_step_run(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    write_events(inputs, "qa-zero-steps", 0)
    output = tmp_path / "build"
    run, = build(inputs, output)["runs"]
    assert run["metrics"]["steps"] == 0
    assert run["metrics"]["empty_termination"] is True
    assert read_json(output / run["steps_file"]) == {"steps": []}
    graph = read_json(output / run["file"])
    assert graph["expanded"] == graph["aggregated"] == {"nodes": [], "edges": []}


def test_build_rejects_empty_directory(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    completed = cli("build", inputs, "-o", tmp_path / "build")
    message = completed.stdout + completed.stderr
    assert completed.returncode != 0, message
    assert re.search(r"empty|no (supported|trajectory|input|run)", message, re.IGNORECASE), message


@pytest.mark.parametrize("size", SIZES)
def test_build_long_run(tmp_path: Path, size: int) -> None:
    inputs = tmp_path / "inputs"
    long_text = "合成測試 " * 20_000 + "qa-end-of-observation"
    trace = write_events(inputs, f"qa-render-{size}", size, long_text=long_text)
    output = tmp_path / "build"

    run, = build(inputs, output)["runs"]
    assert run["metrics"]["steps"] == size
    assert run["metrics"]["nodes"] == size
    graph = read_json(output / run["file"])["expanded"]
    expected_indices = list(range(1, 2 * size, 2))
    assert [node["step_indices"] for node in graph["nodes"]] == [[i] for i in expected_indices]
    steps = read_json(output / run["steps_file"])["steps"]
    assert [step["idx"] for step in steps] == expected_indices
    assert steps[0]["observation"]["text"] == long_text
    assert steps[0]["raw_ref"]["line"] == 2
    canonical = read_json(output / run["canonical_file"])
    assert canonical["meta"]["raw_text"] == trace.read_text(encoding="utf-8")


def test_build_rejects_non_utf8(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    (inputs / "non-utf8.events.jsonl").write_bytes(
        b'{"type":"run.start","id":"qa-invalid","task_id":"qa"}\n'
        b'{"type":"step","thought":"\xff"}\n'
    )
    completed = cli("build", inputs, "-o", tmp_path / "build")
    message = completed.stdout + completed.stderr
    assert completed.returncode != 0, message
    assert re.search(r"utf.?8|decod", message, re.IGNORECASE), message


def test_build_rejects_malformed_json_document(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    (inputs / "bad.messages.json").write_text('{"messages": [', encoding="utf-8")
    completed = cli("build", inputs, "-o", tmp_path / "build")
    message = completed.stdout + completed.stderr
    assert completed.returncode != 0, message
    assert re.search(r"invalid JSON|malformed|expecting", message, re.IGNORECASE), message


def test_build_recovers_after_malformed_jsonl_line(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    trace = write_events(inputs, "qa-malformed-line", 1)
    lines = trace.read_text(encoding="utf-8").splitlines(keepends=True)
    lines.insert(1, '{"type":"step",\n')
    text = "".join(lines)
    trace.write_text(text, encoding="utf-8")
    output = tmp_path / "build"
    run, = build(inputs, output)["runs"]
    canonical = read_json(output / run["canonical_file"])
    assert canonical["meta"]["raw_text"] == text
    assert [error["line"] for error in canonical["meta"]["parse_errors"]] == [2]
    assert [step["raw_ref"]["line"] for step in canonical["steps"]] == [3]


def test_build_rejects_duplicate_ids_across_adapters(tmp_path: Path) -> None:
    inputs = tmp_path / "inputs"
    write_events(inputs, "qa-duplicate", 1)
    (inputs / "duplicate.messages.json").write_text(
        json.dumps({
            "id": "qa-duplicate",
            "task_id": "different-task",
            "messages": [{"role": "assistant", "content": "Synthetic final message."}],
        }),
        encoding="utf-8",
    )
    completed = cli("build", inputs, "-o", tmp_path / "build")
    message = completed.stdout + completed.stderr
    assert completed.returncode != 0, message
    assert re.search(r"duplicate (run )?id|id .*already exists", message, re.IGNORECASE), message
