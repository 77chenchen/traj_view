import csv
import json
from pathlib import Path

from typer.testing import CliRunner

from backend.cli import app
from backend.redaction import Redactor
from backend.storage import csv_cell, searchable_text


runner = CliRunner()


def event_trace(path: Path, *, secret: str = "safe", suffix: str = "") -> None:
    rows = [
        {"type": "run.start", "id": "trace", "task_id": "example", "agent": "fixture"},
        {
            "type": "step", "idx": 0, "thought": suffix,
            "action": {"tool": "shell", "command": f"OPENAI_API_KEY={secret} cat src/example.py", "args": {"api_key": secret}},
            "observation": {"text": f'password="{secret}"'},
        },
        {"type": "run.end", "outcome": {"label": "verifier_fail", "passed": False}},
    ]
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def test_cli_build_redacts_all_exported_payloads(tmp_path):
    source = tmp_path / "input.events.jsonl"
    output = tmp_path / "out"
    event_trace(source, secret="disposable-secret-value", suffix="a private path /private/task123")
    result = runner.invoke(
        app, ["build", str(source), "-o", str(output), "--redact", "--redact-pattern", "/private/task123"]
    )
    assert result.exit_code == 0, result.output
    for file in output.rglob("*.json"):
        data = file.read_text(encoding="utf-8")
        assert "disposable-secret-value" not in data
        assert "/private/task123" not in data
    index = json.loads((output / "index.json").read_text())
    assert index["runs"][0]["outcome"]["label"] == "verifier_fail"
    assert index["runs"][0]["outcome"]["passed"] is False
    assert "[REDACTED]" in (output / "search.json").read_text()


def test_export_embeds_data_and_assets_without_ending_script_early(tmp_path):
    source = tmp_path / "input.events.jsonl"
    output = tmp_path / "out"
    event_trace(source, suffix="</SCRIPT><script>window.intrusion = true</script>")
    assert runner.invoke(app, ["build", str(source), "-o", str(output)]).exit_code == 0
    frontend = tmp_path / "frontend"
    assets = frontend / "assets"
    assets.mkdir(parents=True)
    (frontend / "index.html").write_text(
        '<link rel="stylesheet" href="/assets/style.css">'
        '<script type="module" src="/assets/app.js"></script><div id="root"></div>'
    )
    (assets / "app.js").write_text("window.viewerLoaded = true;")
    (assets / "style.css").write_text("html { color: black }")
    html = tmp_path / "report.html"
    table = tmp_path / "metrics.csv"
    result = runner.invoke(
        app, ["export", str(output), "--frontend", str(frontend), "--html", str(html), "--csv", str(table)]
    )
    assert result.exit_code == 0, result.output
    content = html.read_text()
    assert '<script id="trajviz-data" type="application/json">' in content
    assert "<style>html { color: black }</style>" in content
    assert "<script>window.intrusion" not in content
    assert "window.viewerLoaded = true" in content
    assert "src=" not in content
    with table.open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["outcome"] == "verifier_fail"
    assert rows[0]["steps"] == "1"


def test_failed_rebuild_preserves_dataset_and_success_preserves_user_exports(tmp_path):
    source = tmp_path / "input.events.jsonl"
    output = tmp_path / "out"
    event_trace(source)
    assert runner.invoke(app, ["build", str(source), "-o", str(output)]).exit_code == 0
    index_before = (output / "index.json").read_bytes()
    note = output / "note.txt"
    note.write_text("Retain user output.")
    source.write_bytes(b"\xff")
    result = runner.invoke(app, ["build", str(source), "-o", str(output)])
    assert result.exit_code != 0
    assert (output / "index.json").read_bytes() == index_before
    event_trace(source)
    assert runner.invoke(app, ["build", str(source), "-o", str(output)]).exit_code == 0
    assert note.read_text() == "Retain user output."


def test_redaction_covers_shell_and_serialized_tool_arguments():
    redactor = Redactor()
    examples = (
        "OPENAI_API_KEY=example tail",
        '{"api_key": "example"}',
        r'{"arguments":"{\"password\":\"example\"}"}',
        "password='example with spaces'",
        "Authorization: Bearer example",
    )
    for example in examples:
        assert "example" not in redactor.text(example)


def test_redaction_covers_escaped_keys_and_nested_credentials_in_raw_input(tmp_path):
    source = tmp_path / "input.events.jsonl"
    source.write_text(
        r'{"type":"run.start","id":"redact","meta":{"pass\u0077ord":"synthetic-a","credentials":{"nested":"synthetic-b"}}}'
        "\n" + r'{"type":"step","action":{"tool":"shell","args":{"data":"{\"pass\\u0077ord\":\"synthetic-c\"}"}}}'
        "\n",
        encoding="utf-8",
    )
    output = tmp_path / "out"
    result = runner.invoke(app, ["build", str(source), "-o", str(output), "--redact"])
    assert result.exit_code == 0, result.output
    for file in output.rglob("*.json"):
        assert "synthetic-" not in file.read_text()


def test_redacted_identity_collisions_keep_tasks_distinct(tmp_path):
    source = tmp_path / "input.events.jsonl"
    source.write_text(
        '{"type":"run.start","id":"private-1","task_id":"private-3"}\n'
        '{"type":"run.start","id":"private-2","task_id":"private-4"}\n'
        '{"type":"run.start","id":"private-5","task_id":"private-4"}\n',
        encoding="utf-8",
    )
    output = tmp_path / "out"
    result = runner.invoke(app, ["build", str(source), "-o", str(output), "--redact-pattern", r"private-\d"])
    assert result.exit_code == 0, result.output
    first, second, third = json.loads((output / "index.json").read_text())["runs"]
    assert len({first["id"], second["id"], third["id"]}) == 3
    assert first["task_id"] != second["task_id"] == third["task_id"]


def test_literal_action_paths_are_searchable():
    target = r"C:\repo\file.txt"
    summary = {"outcome": {}}
    steps = [{"thought": None, "action": {"args": {"path": target}}, "observation": None}]
    assert target in searchable_text(summary, steps)


def test_csv_guards_normalized_spreadsheet_formula_prefixes():
    assert csv_cell("\ufeff ＝1+1") == "'\ufeff ＝1+1"
    assert csv_cell(-1) == -1


def test_label_manifest_keeps_original_source(tmp_path):
    source = tmp_path / "input.events.jsonl"
    output = tmp_path / "out"
    event_trace(source)
    labels = tmp_path / "labels.json"
    labels.write_text(json.dumps({source.name: {"condition": "with skill", "model": "x-test-1"}}))
    result = runner.invoke(app, ["build", str(tmp_path), "-o", str(output), "--metadata", str(labels)])
    assert result.exit_code == 0, result.output
    index = json.loads((output / "index.json").read_text())
    run, = index["runs"]
    assert (run["condition"], run["model"]) == ("with skill", "x-test-1")
    canonical = json.loads((output / run["canonical_file"]).read_text())
    assert canonical["meta"]["raw_text"] == source.read_text()


def test_opt_in_classifier_caches_only_unclassified_steps(tmp_path):
    source = tmp_path / "input.events.jsonl"
    output = tmp_path / "out"
    source.write_text(
        '{"type":"run.start","id":"unclassified"}\n'
        '{"type":"step","thought":"unspecified tool","action":{"tool":"custom"}}\n'
    )
    command = tmp_path / "classify"
    command.write_text("#!/bin/sh\ncat >/dev/null\nprintf 'localize\\n'\n")
    command.chmod(0o700)
    cache = tmp_path / "cache.json"
    result = runner.invoke(app, [
        "build", str(source), "-o", str(output), "--llm-command", str(command), "--llm-cache", str(cache)
    ])
    assert result.exit_code == 0, result.output
    assert list(json.loads(cache.read_text()).values()) == ["localize"]
    result = runner.invoke(app, ["build", str(source), "-o", str(output), "--llm-cache", str(cache)])
    assert result.exit_code == 0, result.output
    index = json.loads((output / "index.json").read_text())
    steps = json.loads((output / index["runs"][0]["steps_file"]).read_text())["steps"]
    assert (steps[0]["phase"], steps[0]["phase_source"]) == ("localize", "llm")
