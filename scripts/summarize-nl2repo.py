"""Summarize capture evidence without emitting prompts, trace contents or secrets."""
import argparse
from collections import Counter
import json
from pathlib import Path
import runpy

capture = runpy.run_path(str(Path(__file__).with_name('capture-nl2repo.py')))


def summarize(directory):
    manifest = json.loads((directory / 'manifest.json').read_text())
    status_file = directory / 'status.json'
    states = json.loads(status_file.read_text()) if status_file.exists() else {}
    tasks = []
    for task in manifest['tasks']:
        name = task['task']
        log = directory / 'runs' / f'{name}.codex.jsonl'
        events = capture['read_events'](log)
        tools, terminal = capture['event_result'](events)
        state = states.get(name, {})
        archives = list((directory / 'attempts' / name).glob('*/*.codex.jsonl'))
        archived_results = [capture['event_result'](capture['read_events'](path)) for path in archives]
        completed = terminal == 'turn.completed' and tools > 0
        failed = terminal == 'turn.failed' or state.get('status') == 'failed'
        tasks.append({'task': name, 'status': 'completed' if completed else 'failed' if failed else state.get('status', 'pending'),
                      'tool_events': tools, 'events': len(events), 'terminal_event': terminal,
                      'elapsed_s': state.get('elapsed_s'),
                      'attempts': len(archives) + int(bool(events)),
                      'all_tool_events': tools + sum(count for count, _ in archived_results),
                      'ever_completed': completed or any(kind == 'turn.completed' and count > 0 for count, kind in archived_results),
                      'failure_kind': capture['failure_kind'](events, state.get('timeout')) if failed and not completed else None})
    return {'repository': manifest['repository'], 'revision': manifest['revision'], 'seed': manifest['seed'],
            'model_alias': manifest['model_alias'], 'model_identity': manifest['model_identity'],
            'identity_evidence': manifest['identity_evidence'],
            'requested_tasks': manifest['count'], 'attempted': sum(task['events'] > 0 for task in tasks),
            'with_tool_events': sum(task['tool_events'] > 0 for task in tasks),
            'tool_events': sum(task['tool_events'] for task in tasks),
            'total_attempts': sum(task['attempts'] for task in tasks),
            'tasks_with_tool_evidence': sum(task['all_tool_events'] > 0 for task in tasks),
            'all_tool_events': sum(task['all_tool_events'] for task in tasks),
            'tasks_completed_ever': sum(task['ever_completed'] for task in tasks),
            'statuses': dict(Counter(task['status'] for task in tasks)),
            'failures': dict(Counter(task['failure_kind'] for task in tasks if task['failure_kind'])),
            'tasks': tasks}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = summarize(args.directory)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'tasks'}, indent=2))
