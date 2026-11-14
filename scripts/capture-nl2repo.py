"""Capture actual Codex JSONL on pinned, randomly sampled NL2Repo requirements.

Raw logs, generated repositories and credentials never belong in fixtures or git.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import random
import re
import signal
import subprocess
import threading
import time
import urllib.request

REPO = 'multimodal-art-projection/NL2RepoBench'
REVISION = '781a1da1ee41fb8edb0bed22f586d69111610edf'
ROOT = Path(__file__).resolve().parents[1]
lock = threading.Lock()


def read_events(path):
    """Ignore the not-yet-flushed last record when attaching to an active run."""
    if not path.exists():
        return []
    events = []
    with path.open() as stream:
        for line in stream:
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if isinstance(event, dict):
                events.append(event)
    return events


def belongs_to_run(pid, workspace):
    """A stale status PID must never cause an unrelated process to be killed."""
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
    command = result.stdout
    location = re.search(r'(?:^|\s)(?:-C|--cd)(?:=|\s+)' + re.escape(str(workspace)) + r'(?:\s|$)', command)
    return result.returncode == 0 and 'codex' in command and bool(location)


def event_result(events):
    types = [event.get('type') for event in events]
    tools = sum(event.get('type') == 'item.completed' and event.get('item', {}).get('type')
                in ('command_execution', 'file_change', 'mcp_tool_call') for event in events)
    terminal = next((kind for kind in reversed(types) if kind in ('turn.completed', 'turn.failed')), None)
    return tools, terminal


def failure_kind(events, timed_out=False):
    if timed_out:
        return 'timeout'
    errors = [event for event in events if event.get('type') in ('error', 'turn.failed')]
    if any('429' in json.dumps(event) or 'rate limit' in json.dumps(event).lower() for event in errors):
        return 'rate_limit'
    return 'provider_or_process' if errors else 'interrupted'


def fetch(url):
    with urllib.request.urlopen(url, timeout=45) as response:
        return response.read()


def sample_tasks(count, seed):
    tree = json.loads(fetch(f'https://api.github.com/repos/{REPO}/git/trees/{REVISION}?recursive=1'))
    paths = sorted(item['path'] for item in tree['tree'] if item['path'].startswith('test_files/') and item['path'].endswith('/start.md'))
    return random.Random(seed).sample(paths, count)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.workers/local/nl2repo-50')
    parser.add_argument('--count', type=int, default=50)
    parser.add_argument('--seed', type=int, default=20261112)
    parser.add_argument('--workers', type=int, default=12)
    parser.add_argument('--timeout', type=int, default=2400, help='Monotonic execution deadline; macOS sleep does not consume it.')
    parser.add_argument('--profile', default='soclaas')
    parser.add_argument('--model', default='x-test-1')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--retry-failed', action='store_true', help='Archive failed attempts before retrying them.')
    parser.add_argument('--task', action='append', help='Run only named tasks from the pinned manifest; repeat to select several.')
    parser.add_argument('--backoff', type=int, default=60, help='Cooldown in seconds after a 429; three consecutive 429s stop the queue.')
    args = parser.parse_args()
    out = args.output.resolve()
    for folder in ['requirements', 'runs', 'workspaces']:
        (out / folder).mkdir(parents=True, exist_ok=True)
    manifest_file = out / 'manifest.json'
    if manifest_file.exists():
        manifest = json.loads(manifest_file.read_text())
        if (manifest['seed'], manifest['count'], manifest['model_alias'], manifest['profile']) != (args.seed, args.count, args.model, args.profile):
            raise SystemExit('Existing manifest differs; choose a new output directory.')
    else:
        tasks = []
        paths = sample_tasks(args.count, args.seed)
        def download(path):
            text = fetch(f'https://raw.githubusercontent.com/{REPO}/{REVISION}/{path}')
            name = path.split('/')[1]
            (out / 'requirements' / f'{name}.md').write_bytes(text)
            return {'task': name, 'source_path': path, 'sha256': hashlib.sha256(text).hexdigest(), 'bytes': len(text)}
        with ThreadPoolExecutor(max_workers=8) as pool:
            by_path = dict(zip(paths, pool.map(download, paths)))
        tasks = [by_path[path] for path in paths]
        confirmed = args.profile == 'soclaas' and args.model == 'x-test-1'
        manifest = {'repository': REPO, 'revision': REVISION, 'seed': args.seed, 'count': args.count,
                    'profile': args.profile, 'model_alias': args.model, 'model_identity': 'GLM-5.3' if confirmed else args.model,
                    'identity_evidence': 'User confirmed x-test-1 maps to GLM-5.3; gateway exposes the alias only.' if confirmed else 'Requested model alias; vendor identity not verified.', 'tasks': tasks}
        manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(manifest["tasks"])} distinct NL2Repo tasks at revision {REVISION}', flush=True)
    labels = {f'{task["task"]}.codex.jsonl': {'task_id': f'nl2repo/{task["task"]}', 'model': f'{manifest["model_identity"]} ({args.model})',
              'condition': 'NL2Repo from scratch', 'agent': 'codex-soclaas'} for task in manifest['tasks']}
    (out / 'labels.json').write_text(json.dumps(labels, indent=2) + '\n')
    if args.prepare_only:
        return
    state_file = out / 'status.json'
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    circuit_open = threading.Event()
    rate_failures = 0
    cooldown_until = 0.0
    def rate_result(kind):
        nonlocal rate_failures, cooldown_until
        with lock:
            if kind == 'rate_limit':
                rate_failures += 1
                cooldown_until = time.monotonic() + args.backoff * rate_failures
                if rate_failures >= 3:
                    circuit_open.set()
            else:
                rate_failures = 0
    def save(name, entry):
        with lock:
            state[name] = entry
            temp = state_file.with_suffix('.tmp')
            temp.write_text(json.dumps(state, indent=2) + '\n')
            temp.replace(state_file)
        print(name, entry['status'], flush=True)
    def run(task):
        name = task['task']
        if state.get(name, {}).get('status') == 'completed':
            return
        existing = state.get(name, {})
        if existing.get('status') == 'failed' and not args.retry_failed:
            return
        if existing.get('status') != 'running':
            while not circuit_open.is_set() and time.monotonic() < cooldown_until:
                time.sleep(max(0, min(1, cooldown_until - time.monotonic())))
            if circuit_open.is_set():
                return
        workspace = out / 'workspaces' / name
        if existing.get('status') == 'running' and existing.get('pid'):
            pid = existing['pid']
            logfile = out / 'runs' / f'{name}.codex.jsonl'
            started = datetime.fromisoformat(existing['started']).timestamp()
            if 'monotonic_started' not in existing:
                existing['monotonic_started'] = time.monotonic()
                existing['deadline_rebased_after_resume'] = True
                save(name, existing)
            while True:
                if not belongs_to_run(pid, workspace):
                    break
                if event_result(read_events(logfile))[1]:
                    break
                if time.monotonic() - existing['monotonic_started'] > args.timeout:
                    try:
                        if os.getpgid(pid) == pid:
                            os.killpg(pid, signal.SIGTERM)
                    except ProcessLookupError:
                        pass
                    existing['timeout'] = True
                    break
                time.sleep(3)
            events = read_events(logfile)
            tools, terminal = event_result(events)
            kind = None if terminal == 'turn.completed' and tools else failure_kind(events, existing.get('timeout'))
            existing.update(status='completed' if terminal == 'turn.completed' and tools else 'failed',
                            elapsed_s=round(time.time() - started, 2), tool_events=tools, resumed=True,
                            terminal_event=terminal, failure_kind=kind)
            save(name, existing)
            if existing['status'] == 'completed' or not args.retry_failed:
                return
            rate_result(kind)
            while not circuit_open.is_set() and time.monotonic() < cooldown_until:
                time.sleep(max(0, min(1, cooldown_until - time.monotonic())))
            if circuit_open.is_set():
                return
        # Raw evidence and generated code survive an explicitly requested retry.
        if existing:
            archive = out / 'attempts' / name / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
            archive.mkdir(parents=True)
            (archive / 'status.json').write_text(json.dumps(existing, indent=2) + '\n')
            for previous in [workspace, out / 'runs' / f'{name}.codex.jsonl', out / 'runs' / f'{name}.stderr']:
                if previous.exists():
                    previous.rename(archive / previous.name)
        workspace.mkdir(exist_ok=True)
        subprocess.run(['git', 'init', '-q', str(workspace)], check=True)
        requirement = (out / 'requirements' / f'{name}.md').read_text()
        (workspace / 'REQUIREMENTS.md').write_text(requirement)
        prompt = ('Implement the complete runnable repository described in REQUIREMENTS.md from scratch. '
                  'Read the full requirements, plan, implement the modules and tests, then validate the result. '
                  'This is a long-horizon repository-generation task, not a summary or stub. '
                  'Work only inside this workspace. Do not fetch the original repository or its implementation. '
                  'Use installed tools and available packages; do not inspect credentials or other workspaces. '
                  'Do not start nested agents. Record actual limitations and test results in your final response. '
                  'Persist all implementation files before finishing.')
        command = ['codex', 'exec', '--profile', args.profile, '--model', args.model, '--json', '--ephemeral',
                   '--sandbox', 'workspace-write', '-c', 'approval_policy="never"', '-C', str(workspace), prompt]
        started = time.time()
        entry = {'status': 'running', 'started': datetime.now(timezone.utc).isoformat(),
                 'monotonic_started': time.monotonic(), 'pid': None}
        logfile = out / 'runs' / f'{name}.codex.jsonl'
        with logfile.open('w') as stdout, (out / 'runs' / f'{name}.stderr').open('w') as stderr:
            process = subprocess.Popen(command, stdout=stdout, stderr=stderr, start_new_session=True)
            entry['pid'] = process.pid
            save(name, entry)
            try:
                code = process.wait(timeout=args.timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    code = process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    code = process.wait()
                entry['timeout'] = True
        events = read_events(logfile)
        tools, terminal = event_result(events)
        kind = None if code == 0 and terminal == 'turn.completed' and tools else failure_kind(events, entry.get('timeout'))
        entry.update(status='completed' if code == 0 and terminal == 'turn.completed' and tools else 'failed',
                     exit_code=code, elapsed_s=round(time.time() - started, 2), tool_events=tools,
                     terminal_event=terminal, failure_kind=kind)
        save(name, entry)
        rate_result(kind)
    selected_tasks = [task for task in manifest['tasks'] if not args.task or task['task'] in args.task]
    # Attach existing children before consuming any slots with new provider calls.
    selected_tasks.sort(key=lambda task: state.get(task['task'], {}).get('status') != 'running')
    if args.task and set(args.task) - {task['task'] for task in selected_tasks}:
        raise SystemExit('Selected task is not in the pinned manifest.')
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for future in as_completed([pool.submit(run, task) for task in selected_tasks]):
            future.result()
    completed = sum(item['status'] == 'completed' for item in state.values())
    print(f'Finished: {completed}/{args.count} completed; details in {state_file}', flush=True)
    if circuit_open.is_set():
        print('Queue stopped after three consecutive rate limits; evidence retained. Resolve the gateway limit before retrying.', flush=True)


if __name__ == '__main__':
    main()
