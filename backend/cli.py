"""Build, serve and export local TrajViz datasets."""

import json
import os
from pathlib import Path
import re
import subprocess
from typing import Annotated, Optional

from pydantic import ValidationError
import typer
import yaml

from .redaction import Redactor
from .server import make_server
from .storage import dataset_index, export_csv, export_html, is_managed_path, publish, read_json, write_json


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FRONTEND = ROOT / "frontend" / "dist"
DEFAULT_PHASES = ROOT / "config" / "phases.yaml"
INPUT_EXTENSIONS = {".json", ".jsonl", ".ndjson"}
METADATA_FIELDS = {"task_id", "model", "agent", "condition"}
app = typer.Typer(help="Build and inspect local agent trajectory graphs.", no_args_is_help=True, pretty_exceptions_enable=False)


def fail(message: str) -> None:
    typer.echo(f"Error: {message}", err=True)
    raise typer.Exit(1)


def collect_inputs(source: Path, output: Path) -> list[Path]:
    if source.is_file():
        return [source]
    if not source.is_dir():
        raise ValueError(f"input path does not exist: {source}")
    return sorted(
        path
        for path in source.rglob("*")
        if path.suffix.lower() in INPUT_EXTENSIONS
        and path.is_file()
        and not path.is_symlink()
        and not path.resolve().is_relative_to(output)
    )


def command_classifier(command: Path):
    def classify(step):
        payload = {"step": step.model_dump(mode="json", by_alias=True)}
        result = subprocess.run(
            [str(command)],
            input=json.dumps(payload, ensure_ascii=False),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            encoding="utf-8",
            timeout=30,
            check=False,
        )
        if result.returncode:
            raise ValueError(f"phase classifier command exited with code {result.returncode}")
        return result.stdout.strip()

    return classify


def read_metadata(path: Path) -> dict[str, dict[str, str]]:
    data = read_json(path)
    if not isinstance(data, dict):
        raise ValueError("metadata must map input filenames to run labels")
    for file, labels in data.items():
        if not isinstance(labels, dict) or any(
            key not in METADATA_FIELDS or not isinstance(value, str) or not value.strip()
            for key, value in labels.items()
        ):
            raise ValueError(f"invalid run labels for {file}; use task_id, model, agent or condition")
    return data


def unique_label(base: str, assigned: set[str]) -> str:
    label = base
    suffix = 1
    while label in assigned:
        suffix += 1
        label = f"{base}-{suffix}"
    assigned.add(label)
    return label


@app.command()
def build(
    source: Annotated[Path, typer.Argument(help="UTF-8 trace file or directory of traces")],
    output: Annotated[Path, typer.Option("--output", "-o", help="Dataset output directory")] = Path("out"),
    source_format: Annotated[Optional[str], typer.Option("--format", help="Override adapter autodetection")] = None,
    phase_config: Annotated[Path, typer.Option("--phases", help="Phase rules YAML")] = DEFAULT_PHASES,
    redact: Annotated[bool, typer.Option("--redact", help="Mask common credential patterns")] = False,
    redact_pattern: Annotated[Optional[list[str]], typer.Option("--redact-pattern", help="Additional regex to mask; repeatable")] = None,
    task_id: Annotated[Optional[str], typer.Option("--task-id", help="Supply a common task ID for captured runs")] = None,
    model: Annotated[Optional[str], typer.Option("--model", help="Supply a model name for captured runs")] = None,
    condition: Annotated[Optional[str], typer.Option("--condition", help="Supply an experiment condition")] = None,
    metadata: Annotated[Optional[Path], typer.Option("--metadata", help="Override run labels by relative input filename")] = None,
    llm_command: Annotated[Optional[Path], typer.Option("--llm-command", help="Opt-in phase classifier executable")] = None,
    llm_cache: Annotated[Optional[Path], typer.Option("--llm-cache", help="JSON cache for opt-in phase classification")] = None,
) -> None:
    """Normalize trace files, build graphs, and compute process metrics."""
    from .adapters import AdapterError, load
    from .graph import PhaseClassifier, build_graphs, langutory
    from .metrics import compute_metrics

    try:
        source = source.resolve()
        output = output.absolute()
        if source.is_relative_to(output.resolve()):
            raise ValueError("the input path must be outside the output directory")
        if llm_command is not None and llm_cache is None:
            llm_cache = output.parent / f".{output.name}.phase-cache.json"
        if llm_cache is not None and is_managed_path(output, llm_cache):
            raise ValueError("the phase cache overlaps managed dataset files")
        paths = collect_inputs(source, output.resolve())
        per_file = {}
        if metadata is not None:
            per_file = read_metadata(metadata)
        auxiliary = {path.resolve() for path in (metadata, llm_cache) if path is not None}
        paths = [path for path in paths if path.resolve() not in auxiliary]
        if not paths:
            raise ValueError(f"no supported trajectory files found in {source}")
        redactor = Redactor(redact_pattern or []) if redact or redact_pattern else None
        trajectories = []
        ids: set[str] = set()
        export_ids: set[str] = set()
        export_task_ids: set[str] = set()
        task_labels: dict[str, str] = {}
        defaults = {
            key: value
            for key, value in {"task_id": task_id, "model": model, "condition": condition}.items()
            if value is not None
        }
        if any(not value.strip() for value in defaults.values()):
            raise ValueError("run labels must be nonempty")
        base = source if source.is_dir() else source.parent
        found_files = {path.relative_to(base).as_posix() for path in paths}
        unknown_files = per_file.keys() - found_files
        if unknown_files:
            raise ValueError(f"metadata refers to an input file that was not found: {sorted(unknown_files)[0]}")
        for path in paths:
            overrides = {**defaults, **per_file.get(path.relative_to(base).as_posix(), {})}
            warned = False
            for trajectory in load(path, source_format=source_format):
                diagnostics = trajectory.meta.get("parse_errors")
                if not warned and isinstance(diagnostics, list) and diagnostics and isinstance(diagnostics[0], dict):
                    detail = diagnostics[0]
                    location = detail.get("line", detail.get("message_index"))
                    where = f" at record {location}" if type(location) is int else ""
                    typer.echo(f"Warning: {path.name}: {len(diagnostics)} malformed record(s), first{where}", err=True)
                    warned = True
                if trajectory.id in ids:
                    raise ValueError(f"duplicate run id while reading {path.name}")
                ids.add(trajectory.id)
                if overrides:
                    trajectory = trajectory.model_copy(update=overrides)
                if redactor:
                    original_task = trajectory.task_id
                    trajectory = redactor.trajectory(trajectory)
                    trajectory.id = unique_label(trajectory.id, export_ids)
                    if original_task not in task_labels:
                        task_labels[original_task] = unique_label(trajectory.task_id, export_task_ids)
                    trajectory.task_id = task_labels[original_task]
                trajectories.append(trajectory)
        if not trajectories:
            raise ValueError("the input did not contain any runs")
        classifier_options = {}
        if llm_cache is not None:
            cache = read_json(llm_cache) if llm_cache.exists() else {}
            if not isinstance(cache, dict) or not all(isinstance(value, str) for value in cache.values()):
                raise ValueError("phase cache must map string hashes to phase names")
            classifier_options["llm_cache"] = cache
        if llm_command is not None:
            command = llm_command.resolve(strict=True)
            if not command.is_file() or not os.access(command, os.X_OK):
                raise ValueError("phase classifier command must be an executable file")
            classifier_options["llm_classifier"] = command_classifier(command)
        classifier = PhaseClassifier.from_file(phase_config, **classifier_options)
        publish(output, trajectories, classifier, build_graphs, compute_metrics, langutory)
        if llm_cache is not None and llm_command is not None:
            write_json(llm_cache, classifier_options["llm_cache"])
    except ValidationError as exc:
        details = "; ".join(".".join(map(str, item["loc"])) + " " + item["msg"] for item in exc.errors(include_input=False))
        fail(details)
    except (AdapterError, OSError, ValueError, re.error, subprocess.SubprocessError, yaml.YAMLError) as exc:
        fail(str(exc))
    typer.echo(f"Built {len(trajectories)} run(s) in {output}")


@app.command()
def serve(
    output: Annotated[Path, typer.Argument(help="Dataset from trajviz build")] = Path("out"),
    host: Annotated[str, typer.Option(help="Local bind address")] = "127.0.0.1",
    port: Annotated[int, typer.Option(min=0, max=65535)] = 8765,
    frontend: Annotated[Path, typer.Option(help="Built Vite assets")] = DEFAULT_FRONTEND,
) -> None:
    """Serve the built viewer and dataset."""
    try:
        dataset_index(output)
        if not (frontend / "index.html").is_file():
            raise ValueError("build the frontend with npm --prefix frontend run build, or pass --frontend")
        with make_server(host, port, frontend.resolve(), output.resolve()) as server:
            print(f"TrajViz at http://{host}:{server.server_port}", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
    except (OSError, ValueError) as exc:
        fail(str(exc))


@app.command()
def export(
    output: Annotated[Path, typer.Argument(help="Dataset from trajviz build")] = Path("out"),
    html: Annotated[Optional[Path], typer.Option("--html", help="Write a standalone HTML report")] = None,
    csv: Annotated[Optional[Path], typer.Option("--csv", help="Write a run metrics CSV")] = None,
    frontend: Annotated[Path, typer.Option(help="Built Vite assets")] = DEFAULT_FRONTEND,
) -> None:
    """Export metrics or an offline, interactive viewer."""
    if html is None and csv is None:
        fail("pass --html FILE, --csv FILE, or both")
    try:
        index = dataset_index(output)
        if any(path is not None and is_managed_path(output, path) for path in (html, csv)):
            raise ValueError("the export path overlaps managed dataset files")
        if html is not None and csv is not None and html.resolve() == csv.resolve():
            raise ValueError("HTML and CSV need different output paths")
        if html is not None:
            if not (frontend / "index.html").is_file():
                raise ValueError("build the frontend with npm --prefix frontend run build, or pass --frontend")
            export_html(output, index, frontend, html)
            typer.echo(f"Wrote {html}")
        if csv is not None:
            export_csv(index, csv)
            typer.echo(f"Wrote {csv}")
    except (OSError, ValueError, TypeError, KeyError) as exc:
        fail(str(exc))


def main() -> None:
    app()


if __name__ == "__main__":
    main()
