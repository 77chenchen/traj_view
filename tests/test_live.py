import json
from pathlib import Path
import threading
from urllib.request import urlopen

from backend.live import LiveDataset
from backend.server import make_server

ROOT = Path(__file__).resolve().parents[1]


def emit(path, events):
    with path.open('a') as stream:
        for event in events:
            stream.write(json.dumps(event) + '\n')


def test_live_snapshots_grow_and_preserve_schema_and_redaction(tmp_path, monkeypatch):
    secret = 'synthetic.key+literal[only]'
    monkeypatch.setenv('SOCLAAS_API_KEY', secret)
    source = tmp_path / 'runs'
    source.mkdir()
    path = source / 'live.codex.jsonl'
    emit(path, [
        {'type': 'thread.started', 'thread_id': 'live-test'},
        {'type': 'item.completed', 'item': {'id': 'a', 'type': 'command_execution', 'command': 'cat src/a.py', 'aggregated_output': secret, 'exit_code': 0}},
    ])
    metadata = tmp_path / 'labels.json'
    metadata.write_text(json.dumps({'live.codex.jsonl': {'task_id': 'test-task', 'model': 'fixture', 'unexpected': 'ignored'}}))
    watcher = LiveDataset(source, tmp_path / 'output', ROOT / 'config/phases.yaml', metadata)
    watcher.refresh()
    assert watcher.revision == 1
    index = json.loads((watcher.output / 'index.json').read_text())
    assert index['schema_version'] == 1
    run, = index['runs']
    assert run['task_id'] == 'test-task'
    assert run['metrics']['steps'] == 1
    steps = (watcher.output / run['steps_file']).read_text()
    assert str(source) not in steps
    assert secret not in steps
    assert '[REDACTED]' in steps
    assert all(secret not in payload.read_text() for payload in watcher.output.rglob('*.json'))
    watcher.refresh()
    assert watcher.revision == 1
    emit(path, [{'type': 'item.completed', 'item': {'id': 'b', 'type': 'command_execution', 'command': 'pytest', 'aggregated_output': 'pass', 'exit_code': 0}}])
    watcher.refresh()
    assert watcher.revision == 2
    index = json.loads((watcher.output / 'index.json').read_text())
    assert index['runs'][0]['metrics']['steps'] == 2


def test_live_status_and_event_stream_contain_no_credentials(tmp_path):
    source = tmp_path / 'runs'; source.mkdir()
    path = source / 'live.codex.jsonl'
    emit(path, [{'type': 'thread.started', 'thread_id': 'live-test'}])
    watcher = LiveDataset(source, tmp_path / 'output', ROOT / 'config/phases.yaml')
    watcher.refresh()
    server = make_server('127.0.0.1', 0, ROOT / 'frontend/dist', watcher.output, live=watcher)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f'http://127.0.0.1:{server.server_port}'
        with urlopen(base + '/api/live/status') as response:
            status = json.load(response)
        assert status['enabled'] is True
        assert set(status) == {'enabled', 'progress', 'revision', 'runs', 'updated', 'error', 'mode'}
        with urlopen(base + '/api/live/events', timeout=3) as response:
            assert response.headers['Content-Type'] == 'text/event-stream'
            event = response.readline().decode()
            assert event.startswith('data: ')
            assert json.loads(event[6:])['revision'] == watcher.revision
    finally:
        watcher.close(); server.shutdown(); server.server_close()


def test_report_download_embeds_current_dataset_without_sidecars(tmp_path):
    source = tmp_path / 'source'
    source.mkdir()
    emit(source / 'qa.codex.jsonl', [
        {'type': 'thread.started', 'thread_id': 'report-fixture'},
        {'type': 'item.completed', 'item': {'id': 'a', 'type': 'command_execution',
            'command': 'pytest -q', 'aggregated_output': 'synthetic failure', 'exit_code': 1}},
    ])
    watcher = LiveDataset(source, tmp_path / 'dataset', ROOT / 'config/phases.yaml')
    watcher.refresh()
    frontend = tmp_path / 'frontend'
    frontend.mkdir()
    (frontend / 'index.html').write_text('<html><link href="style.css" rel="stylesheet"><body><div id="root"></div><script type="module" src="app.js"></script></body></html>')
    (frontend / 'style.css').write_text('body{color:navy}')
    (frontend / 'app.js').write_text('window.syntheticFixture = true;')
    before = sorted(str(p.relative_to(tmp_path)) for p in tmp_path.rglob('*') if p.is_file())
    server = make_server('127.0.0.1', 0, frontend, watcher.output)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with urlopen(f'http://127.0.0.1:{server.server_port}/api/report.html') as response:
            report = response.read().decode()
            assert response.headers['Content-Type'] == 'text/html; charset=utf-8'
            assert response.headers['Content-Disposition'] == 'attachment; filename="trajviz-report.html"'
            assert response.headers['Cache-Control'] == 'no-store'
        assert 'id="trajviz-data"' in report
        assert 'synthetic failure' in report
        assert 'window.syntheticFixture = true;' in report
        assert 'src="app.js"' not in report and 'href="style.css"' not in report
        assert sorted(str(p.relative_to(tmp_path)) for p in tmp_path.rglob('*') if p.is_file()) == before
    finally:
        watcher.close()
        server.shutdown()
        server.server_close()
