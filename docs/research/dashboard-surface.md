# Dashboard surface brief

Mode: Operate. Users inspect a trace, find a failure or file change, replay source steps, and compare same-task action sequences.

Reference pin: the user's four local Agent Lab demo images (Downloads; file names recorded in the conversation). The first viewport combines navigation, run identity and summary, view tabs, event list, recorded workspace/terminal and step inspection. The existing left-to-right DAG remains a distinct graph view. Timeline lanes categorize evidence; they do not imply concurrent agents.

Success: every visible control works on public synthetic traces and in a standalone offline HTML. Desktop and 390px views, keyboard, errors, missing timestamps and source-index fidelity must be verified. Do not borrow the demo's fabricated run statistics or task results. Local annotations must be distinguished from source evidence.

## Direction contract

seed: none (pinned)

**THESIS.** An investigator can follow one recorded event from source sequence into code, output and graph relationships without losing its source index.

**OWN-WORLD.** User pin: “仔细阅读这几张demo示意图 仿照这个demo完成ui改进和功能实现”. The four supplied Agent Lab dashboards pin the navy rail, blue selection, pale workspace and coordinated event/workspace/Inspector composition. Keep TrajViz's identity and source truth.

**STORY.** Open a run; search an event or file; inspect the recorded patch and error; replay adjacent steps; switch to Timeline or DAG with the same selection; select same-task runs and locate baseline divergence.

**FIRST VIEWPORT.** Compact run identity and measured summary above the three-pane replay. Events at left, recorded code/output at center, Inspector at right, with a persistent playback dock. On narrow screens panes stack and the dock stays reachable. The selected event drives all recorded evidence; no fabricated code or durations fill missing fields.

**FORM.** Code-led Operate interface, using React and existing SVG graph rendering. Real data diagrams and text excerpts are the material. Selection, source-order animation, explicit expansion and camera continuity are the authored interactions. Timeline uses points where durations are absent; containment substitutes for unrecorded subagent topology.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Quality bar

The supplied screenshots set composition and density, rather than content or benchmark claims. A polished result keeps the exact event and evidence legible together, preserves a visible play/pause dock at every width, gives mobile catalog actions distinct 44px targets, and performs all advertised interactions offline. A generic metrics-only reskin, synthetic parallel agents or invented cost figures fail this bar.
