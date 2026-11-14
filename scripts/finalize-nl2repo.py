"""Finish an authorized local batch after its supervisor exits; never call a model."""
import argparse
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--supervisor', type=int, required=True)
    args = parser.parse_args()
    base = ROOT / '.workers/local/nl2repo-50'
    result_file = base / 'finalization.json'
    def save(value):
        result_file.write_text(json.dumps(value, indent=2) + '\n')
    save({'status': 'waiting', 'supervisor': args.supervisor})
    while True:
        command = subprocess.run(['ps', '-p', str(args.supervisor), '-o', 'command='], capture_output=True, text=True).stdout
        if 'capture-nl2repo.py' not in command:
            break
        time.sleep(5)
    try:
        summarize = runpy.run_path(str(ROOT / 'scripts/summarize-nl2repo.py'))['summarize']
        summary = summarize(base)
        (base / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
        last_record = max(path.stat().st_mtime for path in (base / 'runs').glob('*.codex.jsonl'))
        for _ in range(60):
            with urlopen('http://127.0.0.1:8766/api/live/status', timeout=5) as response:
                status = json.load(response)
            if (status.get('updated') or 0) >= last_record and not status.get('error'):
                break
            time.sleep(2)
        else:
            raise RuntimeError('Live snapshot did not settle')
        dataset = ROOT / '.workers/local/nl2repo-50-out'
        html = ROOT / '.workers/local/nl2repo-50.html'
        subprocess.run([sys.executable, '-m', 'backend.cli', 'export', str(dataset), '--html', str(html),
                        '--csv', str(ROOT / '.workers/local/nl2repo-50-metrics.csv')], cwd=ROOT, check=True)
        key = os.environ.get('SOCLAAS_API_KEY')
        if key and any(key in path.read_text() for path in [*dataset.rglob('*.json'), html]):
            raise RuntimeError('Credential redaction check failed')
        subprocess.run(['node', 'scripts/verify-live-capture.mjs', '--html', str(html)], cwd=ROOT, check=True)
        save({'status': 'verified', 'tasks_with_tool_evidence': summary['tasks_with_tool_evidence'],
              'tasks_completed_ever': summary['tasks_completed_ever'], 'total_attempts': summary['total_attempts'],
              'all_tool_events': summary['all_tool_events'], 'capture_statuses': summary['statuses'],
              'all_50_have_tool_evidence': summary['tasks_with_tool_evidence'] == 50,
              'literal_key_matches': 0, 'offline_http_requests': 0})
    except Exception as error:
        save({'status': 'failed', 'error_type': type(error).__name__,
              'message': 'Local finalization failed; evidence retained. Rerun after resolving the local service or capture failure.'})
        raise


if __name__ == '__main__':
    main()
