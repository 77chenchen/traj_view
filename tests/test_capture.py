"""Capture recovery must tolerate partial JSONL and never target unrelated PIDs."""
from pathlib import Path
import runpy
from types import SimpleNamespace

CAPTURE = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts/capture-nl2repo.py'))


def test_capture_recovers_completed_tools_before_partial_tail(tmp_path):
    log = tmp_path / 'capture.jsonl'
    log.write_text('\n'.join([
        '{"type":"thread.started","thread_id":"fixture"}',
        '{"type":"item.completed","item":{"type":"command_execution"}}',
        '{"type":"turn.completed"}',
        '{"type":"unfinished',
    ]))
    assert CAPTURE['event_result'](CAPTURE['read_events'](log)) == (1, 'turn.completed')
    log.write_text('{"type":"item.completed","item":{"type":"agent_message"}}\n')
    assert CAPTURE['event_result'](CAPTURE['read_events'](log)) == (0, None)


def test_capture_attach_checks_workspace_and_process_identity(monkeypatch, tmp_path):
    response = SimpleNamespace(returncode=0, stdout='python unrelated.py')
    monkeypatch.setattr(CAPTURE['subprocess'], 'run', lambda *args, **kwargs: response)
    assert not CAPTURE['belongs_to_run'](123, tmp_path)
    response.stdout = f'codex exec -C {tmp_path}/other-workspace'
    assert not CAPTURE['belongs_to_run'](123, tmp_path / 'target')
    response.stdout = f'codex exec -C {tmp_path}/target-old'
    assert not CAPTURE['belongs_to_run'](123, tmp_path / 'target')
    response.stdout = f'codex exec -C {tmp_path}/target Implement requirements'
    assert CAPTURE['belongs_to_run'](123, tmp_path / 'target')
