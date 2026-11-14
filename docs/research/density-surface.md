# Four-page information hierarchy

Mode: **Operate**. Scope: reduce visible density in the existing debugging workspace, preserving the dark navy identity, purple selection, source data and all analysis capabilities. This is the user's subsequent refinement of the four-reference composition.

## Three levels

1. **Primary evidence:** one workspace dominates each page. Recorded code/output in Replay; event distribution in Timeline; relationships in Graph; paired actions in Compare.
2. **Supporting navigation:** compact stages, source list, source-aware run summary and a single set of contextual controls. Selection remains coordinated by run ID plus exact source index.
3. **On-demand detail:** parameters, original references, recording metadata, statistics and secondary plots. Native disclosures and workspace buttons remain keyboard accessible.

## Page decisions

| Page | Default reading task | Supporting content | Open on demand |
| --- | --- | --- | --- |
| Replay | What happened at this step? | Source list and playback | Snapshot previews, tool parameters, saved text, observation and raw reference. Terminal opens for file/patch evidence and collapses for duplicate command/text evidence. |
| Timeline | Where did failure or a change occur? | Six lanes, stages and event table | Collapse/expand event table; arguments, analysis and recording details. Current event scrolls into the local table viewport. |
| Graph | How do recorded calls relate? | Search, camera and detail level | Filters/layers/edges, legend, playback/activity. Sidebar separates details, files/activity and signature statistics. |
| Compare | Where do runs diverge? | Same-task run selectors and first divergence | Switch to patch, metrics/findings or independent run DAGs. Full source trajectories, charts and original action-offset lists remain available. |

## Reading and space

- Replace 108px preview windows with 40px stage navigation. Preview expansion changes no source selection.
- Keep primary evidence around 12px, with 11px supporting labels and 13–14px panel headings. Do not simulate lower density by shrinking text.
- Give Replay's center most horizontal space; avoid repeating its description, raw action and full output in the inspector by default.
- Keep Graph's optional panels closed, leaving the canvas as the dominant desktop area.
- Use neutral alignment rows with small A/B identity cues. Metrics share scales and retain exact values, zero and missing states; they no longer compete with alignment on the first screen.
- Narrow inspection overlays the workspace while its toggle and playback remain reachable. Tables, code and plots scroll internally.

## Evidence boundaries

No v1 schema or DAG transformation change. Duration, per-step agent identity, attempts, message/reasoning role, final file versions, cost and test pass rate retain their missing states. Recording details houses less frequently used fields; it does not manufacture them. Public examples and captures remain explicitly synthetic.

Verification and fresh captures: [density-verification.md](density-verification.md). Previous four-reference captures remain historical evidence, not approval of this refinement.
