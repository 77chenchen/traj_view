"""Storage and export for a built TrajViz dataset."""

import csv
from hashlib import sha256
import json
from pathlib import Path
import re
from shutil import copy2, copytree
from tempfile import TemporaryDirectory
from typing import Any
from unicodedata import normalize

from schema import Trajectory


METRIC_COLUMNS = (
    "steps", "nodes", "edges", "aggregate_nodes", "aggregate_edges", "cycles",
    "repeated_actions", "error_rate", "first_edit", "first_validate",
    "validated_after_last_edit", "edit_validate_edit", "phase_transitions",
    "max_steps_hit", "empty_termination", "skill_read_steps", "skill_read_count",
)
DATASET_FILES = {"index.json", "search.json", "runs", "steps", "trajectories"}
NOTICES = Path(__file__).resolve().parents[1] / "THIRD_PARTY_NOTICES.txt"


def is_managed_path(directory: Path, candidate: Path) -> bool:
    try:
        relative = candidate.resolve().relative_to(directory.resolve())
    except ValueError:
        return False
    return not relative.parts or relative.parts[0] in DATASET_FILES


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        handle.write("\n")


def dataset_index(directory: Path) -> dict:
    index = read_json(directory / "index.json")
    if not isinstance(index, dict) or index.get("schema_version") != 1 or not isinstance(index.get("runs"), list):
        raise ValueError(f"{directory} is not a TrajViz v1 build")
    return index


def searchable_text(summary: dict, steps: list[dict]) -> str:
    def strings(value: Any):
        if isinstance(value, str):
            yield value
        elif isinstance(value, list):
            for item in value:
                yield from strings(item)
        elif isinstance(value, dict):
            for key, item in value.items():
                yield key
                yield from strings(item)

    parts = [
        str(summary.get(key, "")) for key in ("id", "task_id", "source_format", "model", "agent", "condition")
    ]
    parts.append(json.dumps(summary["outcome"], ensure_ascii=False))
    for step in steps:
        if step["thought"]:
            parts.append(step["thought"])
        if step["action"]:
            parts.extend(strings(step["action"]))
        if step["observation"]:
            parts.append(step["observation"]["text"])
    return "\n".join(parts)


def publish(
    output: Path,
    trajectories: list[Trajectory],
    classifier: Any,
    build_graphs: Any,
    compute_metrics: Any,
    langutory: Any,
) -> None:
    """Prepare a complete dataset beside the destination before switching it in."""
    output.parent.mkdir(parents=True, exist_ok=True)
    lock = output.parent / f".{output.name}.trajviz-lock"
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError(f"another build holds {lock.name}") from None
    try:
        if output.is_symlink() or (output.exists() and not output.is_dir()):
            raise ValueError(f"expected an output directory at {output}")
        extras: list[Path] = []
        if output.exists() and any(output.iterdir()):
            dataset_index(output)
            extras = [path for path in output.iterdir() if path.name not in DATASET_FILES]
        with TemporaryDirectory(prefix=".trajviz-build-", dir=output.parent) as scratch:
            scratch_path = Path(scratch)
            staged = scratch_path / "dataset"
            staged.mkdir()
            for path in extras:
                destination = staged / path.name
                if path.is_dir() and not path.is_symlink():
                    copytree(path, destination, symlinks=True)
                else:
                    copy2(path, destination, follow_symlinks=False)
            summaries: list[dict] = []
            search: dict[str, str] = {}
            for trajectory in trajectories:
                trajectory = classifier.annotate(trajectory) or trajectory
                canonical = trajectory.model_dump(mode="json", by_alias=True)
                graphs = build_graphs(trajectory)
                metrics = compute_metrics(trajectory, graphs)
                key = sha256(trajectory.id.encode("utf-8")).hexdigest()[:24]
                summary = {
                    field: value
                    for field, value in canonical.items()
                    if field not in {"meta", "steps"}
                }
                summary.update(
                    metrics=metrics,
                    langutory=langutory(trajectory, classifier.phases),
                    file=f"runs/{key}.json",
                    steps_file=f"steps/{key}.json",
                    canonical_file=f"trajectories/{key}.json",
                )
                write_json(staged / summary["file"], graphs)
                write_json(staged / summary["steps_file"], {"steps": canonical["steps"]})
                write_json(staged / summary["canonical_file"], canonical)
                summaries.append(summary)
                search[trajectory.id] = searchable_text(summary, canonical["steps"])
            write_json(staged / "search.json", search)
            write_json(
                staged / "index.json",
                {"schema_version": 1, "phases": classifier.phases, "runs": summaries, "search_file": "search.json"},
            )
            previous = scratch_path / "previous"
            if output.exists():
                output.rename(previous)
            try:
                staged.rename(output)
            except BaseException:
                if previous.exists():
                    previous.rename(output)
                raise
    finally:
        lock.rmdir()


def safe_child(root: Path, relative: str) -> Path:
    result = (root / relative).resolve()
    if not result.is_relative_to(root.resolve()):
        raise ValueError("file path escapes the dataset or frontend directory")
    return result


def csv_cell(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, str) and re.match(r"^[\s\ufeff]*[=+@-]", normalize("NFKC", value)):
        return "'" + value
    return value


def export_csv(index: dict, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fields = ["id", "task_id", "model", "agent", "condition", "source_format", "outcome", "passed", *METRIC_COLUMNS]
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for run in index["runs"]:
            data = {
                **run, **run["metrics"], "outcome": run["outcome"]["label"], "passed": run["outcome"]["passed"]
            }
            writer.writerow({field: csv_cell(data.get(field)) for field in fields})


def export_html(directory: Path, index: dict, frontend: Path, destination: Path) -> None:
    shell = (frontend / "index.html").read_text(encoding="utf-8")
    references = ["index.json", index["search_file"]]
    for run in index["runs"]:
        references.extend(run[field] for field in ("file", "steps_file", "canonical_file"))
    files = {reference: f"trajviz-data-{number}" for number, reference in enumerate(dict.fromkeys(references))}

    def data_tag(tag_id: str, data: str) -> str:
        escaped = data.replace("<", "\\u003c")
        return f'<script id="{tag_id}" type="application/json">{escaped}</script>'

    embedded = [data_tag("trajviz-data", json.dumps({"files": files}, ensure_ascii=False))]
    embedded.extend(
        data_tag(tag_id, safe_child(directory, reference).read_text(encoding="utf-8"))
        for reference, tag_id in files.items()
    )

    def inline_script(match: re.Match) -> str:
        js = safe_child(frontend, match[1].lstrip("./")).read_text(encoding="utf-8")
        js = re.sub(r"</script", lambda found: r"<\/" + found[0][2:], js, flags=re.IGNORECASE)
        return "\n".join(embedded) + f'<script type="module">{js}</script>'

    def inline_style(match: re.Match) -> str:
        css = safe_child(frontend, match[1].lstrip("./")).read_text(encoding="utf-8")
        return f"<style>{css}</style>"

    shell, scripts = re.subn(r'<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*</script>', inline_script, shell)
    shell = re.sub(r'<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>', inline_style, shell)
    if scripts != 1:
        raise ValueError("expected one JavaScript entry in the Vite build")
    if NOTICES.is_file():
        notices = NOTICES.read_text(encoding="utf-8").replace("-->", "-- >")
        shell += f"\n<!--\n{notices}-->\n"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(shell, encoding="utf-8")
