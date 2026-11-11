# TrajViz

TrajViz converts local LLM agent traces to a common graph and compares runs of the same task across models and conditions. The MVP covers three adapters, process graphs, phase metrics, offline analysis and export.

- The coordinator owns `schema/`, `config/`, `fixtures/`, the CLI, and integration.
- Adapter work stays under `backend/adapters/` and `tests/adapters/`. Graph and metric work stays under `backend/graph/`, `backend/metrics/`, `tests/graph/`, and `tests/metrics/`. Frontend work stays under `frontend/`. QA work stays under `tests/e2e/` and `scripts/`.
- Treat the schema as frozen after the contract commit. Report any missing field instead of modifying the contract.
- Run `python -m pytest`, `npm --prefix frontend run check`, and `npm --prefix frontend run build` once the relevant files exist. Browser smoke tests are documented in the README.
- Use installed dependencies or the lockfile. If the registry is unavailable, report it without repeatedly attempting installation. Never put private run logs, credentials, or user data in fixtures, prompts, or commits.
- A worker returns at most 300 words covering work completed, contract deviations, and checks with results.
