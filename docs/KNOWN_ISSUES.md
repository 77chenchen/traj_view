# Known issues and coverage

- Live input verification covers Codex CLI JSON events from three runs of a small, isolated SWE task. Runner JSONL, OpenAI message JSON, and persisted Codex rollouts use scrubbed synthetic fixtures. SWE-agent `.traj`, OpenHands JSONL, and Inspect evaluation logs are second-batch adapter formats.
- The viewer uses ELK for small graphs, Dagre for intermediate graphs, and a deterministic time-order layout for larger graphs. In the benchmark Dagre exceeded the default Node stack at 2,000 nodes.
- Vite warns about the size of the single JavaScript bundle. Inlining the layout engines keeps the HTML portable. The measured browser timings met the 500-step target.
