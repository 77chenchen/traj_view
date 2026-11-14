"""Local, read-only live ingestion of Codex JSONL; credentials stay in Codex's env."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import threading
import time

from .adapters import load
from .graph import PhaseClassifier, build_graphs, langutory
from .metrics import compute_metrics
from .redaction import Redactor
from .storage import publish


class LiveDataset:
    def __init__(self, source: Path, output: Path, phases: Path, metadata: Path | None = None):
        self.source = source.resolve()
        self.output = output.resolve()
        self.classifier = PhaseClassifier.from_file(phases)
        self.metadata = metadata
        self.revision = 0
        self.last_error: str | None = None
        self.run_count = 0
        self.updated: float | None = None
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.fingerprint: tuple = ()
        patterns = [re.escape(str(Path.home())), re.escape(str(self.source))]
        # Mask an accidental bare key echo as well as generic credential assignments.
        # The value stays in memory and is never emitted into the dataset or status.
        if key := os.environ.get('SOCLAAS_API_KEY'):
            patterns.append(re.escape(key))
        self.redactor = Redactor(patterns)

    def status(self):
        progress = {}
        status_file = self.metadata.parent / 'status.json' if self.metadata else None
        if status_file and status_file.is_file():
            try:
                states = json.loads(status_file.read_text()).values()
                progress = {kind: sum(item.get('status') == kind for item in states) for kind in ('running', 'completed', 'failed')}
            except (OSError, ValueError, AttributeError):
                pass
        return {'enabled': True, 'progress': progress, 'revision': self.revision, 'runs': self.run_count,
                'updated': self.updated, 'error': self.last_error, 'mode': 'Local Codex JSONL · credentials remain in soclaas'}

    def refresh(self):
        files = sorted(self.source.glob('*.codex.jsonl'))
        fingerprint = tuple((str(path), path.stat().st_mtime_ns, path.stat().st_size) for path in files)
        if self.metadata and self.metadata.exists():
            fingerprint += ((str(self.metadata), self.metadata.stat().st_mtime_ns),)
        if not files or fingerprint == self.fingerprint:
            return
        labels = json.loads(self.metadata.read_text()) if self.metadata else {}
        trajectories = []
        ids: set[str] = set()
        for path in files:
            # A file can exist before thread.started has been flushed.
            if not path.stat().st_size:
                continue
            for trajectory in load(path, source_format='codex_cli'):
                if trajectory.id in ids:
                    raise ValueError('Duplicate live run ID')
                ids.add(trajectory.id)
                updates = labels.get(path.name, {})
                allowed = {key: value for key, value in updates.items() if key in {'task_id', 'model', 'agent', 'condition'}}
                trajectory = trajectory.model_copy(update=allowed)
                trajectories.append(self.redactor.trajectory(trajectory))
        if not trajectories:
            return
        publish(self.output, trajectories, self.classifier, build_graphs, compute_metrics, langutory)
        self.fingerprint = fingerprint
        self.run_count = len(trajectories)
        self.updated = time.time()
        self.last_error = None
        self.revision += 1

    def start(self):
        self.refresh()
        def watch():
            while not self.stop_event.wait(2):
                try:
                    self.refresh()
                except (OSError, ValueError) as error:
                    # Do not echo source/provider payloads into the browser.
                    self.last_error = type(error).__name__ + ': live data could not be refreshed; retaining the last snapshot.'
        self.thread = threading.Thread(target=watch, name='trajviz-live', daemon=True)
        self.thread.start()

    def close(self):
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=4)
