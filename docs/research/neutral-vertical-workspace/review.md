disposition: ship

The current disposition applies only to the same-reviewer verdict pass appended under `keep`. The full review below is retained as the original pre-correction record, whose disposition was `fix`; its overlap description refers to the earlier capture, and the linked Replay capture paths have since been refreshed.

## persistence

The current `PRODUCT.md` and [surface brief](../neutral-vertical-workspace.md) persist the latest user direction: a 64px, single-row, static topbar with the existing monochrome mark and six icon/text destinations; a white vertical DAG; single-screen desktop Graph and Timeline; natural document scrolling for Replay, Compare, Analytics and Datasets. The brief's direction/quality-bar table is the authority for this code-led Operate surface. There is no approved comp to match. Historical rail, purple selection, horizontal graph and two-row navigation references do not override that contract. Logo generation is explicitly deferred, and the captures retain the existing mark without claiming a generated asset.

This is a new full review of the current composition, replacing the earlier eight-capture review. I opened all 55 PNGs in [captures.json](captures.json) and all 11 supplementary appearance/playback PNGs in `../graph-appearance/` at original resolution. The captures show their named states, contain loaded content and have no capture failure regions. They cover the requested desktop sizes, 1586×912 and 1280×800; mobile is excluded. Full-page document captures legitimately retain the fixed Replay dock at the original viewport boundary. The dock finding below uses the separate scrolled viewport capture, not that full-page capture behavior.

I read the current product/brief, 77-item [function map](function-map.md), craft floor and supplied verification reports, and sampled the current navigation, CSS, graph drawing/layout/routing, Replay, Timeline and timeline-data source. This review performs no browser interaction, detector rerun, model call or UI edit. Visual judgments below are reviewer-observed; interaction, export and offline results are attributed to the supplied assertions. The once-per-task detector result is `[]`. The historical Taste marketing gate remains OPEN and is not represented as a pass. `DESIGN.md` and its sidecar still require the user-authorized merge after the finish verdict; that handoff must document the current system, not restore the superseded UI.

## fidelity

| Element | State | Evidence |
| --- | --- | --- |
| TYPE | match | Restrained sans hierarchy, compact control labels and monospace source/code support investigation. Long node metadata now fits the silhouettes; complete source identity remains in Inspector. |
| MATERIAL | match | Continuous flat work surfaces, fine separators and real SVG geometry suit an analysis tool. Disclosures reduce simultaneous density without hiding the primary work. |
| GROUND | match | The graph stays white in both appearances, without dots or decorative imagery. Near-white chrome and blue-gray selection remain subordinate to recorded evidence and semantic outcomes. |
| Navigation | match in both desktop sizes | One 64px row contains the existing mark and Replay, Timeline, Graph, Compare, Analytics and Datasets. No rail, product name, global search, help, notifications or avatar is restored. Scrolled document captures show the topbar leaving the viewport. |
| Desktop page geometry | match, except Replay end clearance below | Graph and Timeline fit the desktop screen with their Inspectors and local evidence regions. Replay/Compare/Analytics/Datasets show independent document sections and scrolling. Supplied geometric assertions corroborate Graph/Timeline document height equaling viewport height. |
| Vertical source DAG | match | Visible source sequence, fallback, ingress/egress and dependency/retry routes read top to bottom. Layout source specifies `DOWN`; the white field and category silhouettes remain consistent across the captured states. |
| In-place grouping and header clearance | match in captured states | Expanded groups expose members inside the same graph. Headers now paint as opaque foreground after routes; the former title-band crossings are resolved. Anchor, zoom, sibling and exact-source preservation are supported by supplied assertions rather than independently exercised here. |
| Exact source and fullscreen Inspector | match in captured states | Failure, patch and long synthetic source selections retain exact source identity in the Inspector. Fullscreen Graph, Timeline and Compare Run DAG captures keep useful inspection space and exit controls at both sizes. |
| Timeline labels and semantic density | match in captured states | Six lanes remain visible. Opaque sticky labels cover horizontally scrolled content correctly; compact icons and screen-space groups avoid overlapping text. Missing timestamps use source position instead of invented durations. Group membership and exact selection are covered by supplied assertions. |
| Replay evidence and playback | match in captured states, with one layout contradiction | Manual Diff remains selected through the supplied missing-patch and later distinct-patch states; missing evidence is explicit and no stale patch is displayed. Step details starts closed, and Terminal/Tests is a separate section. In the real scrolled viewport, the fixed dock obscures part of its final collapsed controls. Playback persistence itself is asserted by the supplied tests. |
| Compare and supporting pages | match in captured states | Shared alignment leads, three flat metrics support it, and patch/metrics/Run DAG alternatives remain named. Agent details and findings disclose separately. Analytics and Datasets use the same document rhythm; appearance and dataset utilities remain available through the catalog disclosure. |
| Evidence boundaries | match in supplied states/source | Synthetic fixtures are labeled. Unrecorded time, attempts, patch/file versions and role information remain explicit; a recorded zero is distinct from missing data. Patches retain source provenance, and no complete final file or agent hierarchy is invented. |

[verification.json](verification.json), sourced from the final supplied smoke run, reports 81 Python tests, TypeScript and Vite build passing; 38/38 Chrome scenarios; 909 DAG sorts; 1,908 scopes, 3,161 exact-source paths and 5,189 forward routes; 61 inline states with 1,735 routes; and 126 Timeline layouts. It reports the exact delivered root report offline with zero HTTP requests and zero page errors. These are supplied test outcomes, not reviewer reruns.

The sanitized [real-verification.json](real-verification.json) records a 50-run local dataset, sampled traces of 324/172/87 source steps and 379/193/188 edges, and 17 private captures. Inline expansion, wheel behavior, fullscreen inspection, exact-source handling, current-state SVG and private exact-HTML offline assertions pass. Those three traces contain no recorded patches, so their passing fullscreen assertions do not establish real-data patch rendering. I did not open or publish private captures, commands or identifiers. Reported 500/2,000-step overview paints of 97.9/130.4ms initially display three nodes and exclude bundle loading; they are single local samples, not full-graph or percentile measurements. The large production-bundle warning remains a disclosed limit.

## ceiling

The current composition reaches the pinned quiet desktop direction through hierarchy, whitespace, working geometry and evidence clarity. The two earlier Graph finish defects are resolved. Stronger ornament or additional chrome would not improve this Operate surface. One narrow layout defect still prevents the final Replay section from being fully usable at maximum scroll; it needs a clearance correction, not another composition round. Static screenshots and source sampling do not independently certify the supplied behavioral assertions or establish a mobile finish.

## material_fixes

1. **Reserve effective bottom clearance for Replay's fixed transport — `frontend/src/neutral.css:38`, `:120` and `:121`; [replay-scrolled.png](replay-scrolled.png).** In the genuine 1586×912 scrolled viewport, the collapsed Terminal/Tests bar spans approximately y810–864 while the fixed transport begins at y840, covering the lower labels/actions at the document's maximum scroll. The intended `main[data-page="replay"] { padding-bottom:112px; }` loses to the more specific `.reference-shell main.reference-page` shorthand, leaving 48px. Raise the Replay page rule's specificity so the reserved space actually exceeds the dock height with a comfortable gap; retain the persistent dock and current module sizes. Verify at both requested desktop sizes that the final collapsed Terminal/Tests controls and expanded final output can scroll fully above the dock, remain operable, and preserve the selected source and evidence/panel state. Add a geometric assertion for end-of-document clearance, then recapture the affected scrolled states for the same-reviewer verdict pass.

## keep

Keep the single-row static navigation, white vertical graph, category silhouettes, source identity, in-place expansion, opaque section headers, usable fullscreen Inspectors, Timeline's opaque labels and semantic density, manually pinned evidence during playback, explicit missing-evidence states, separate Replay Terminal/Tests, and document scrolling on the four document pages. Apply only the listed material correction in the finish batch, return its same-size evidence for scoring, and complete the authorized design-document merge after the verdict.

### Verdict pass — Replay end clearance, 2026-11-14

disposition: ship

Scope: score only material fix 1 above. This is a correction verdict, not a new whole-surface review. I opened the four required correction PNGs at original resolution: [collapsed 1586×912](replay-scrolled.png), [collapsed 1280×800](replay-scrolled-1280.png), [expanded 1586×912](replay-terminal-expanded-1586.png) and [expanded 1280×800](replay-terminal-expanded-1280.png). All are valid viewport captures of the named states with loaded content and no failed regions. No browser, detector or model call was made, and no other surface was re-audited.

| Material fix | Score | Correction evidence |
| --- | --- | --- |
| 1. Replay fixed-transport end clearance | resolved | Both collapsed Terminal/Tests controls and the complete expanded output module now end approximately 40px above the dock at maximum scroll, at both requested desktop sizes. Tabs, Expand/Collapse and Copy remain unobscured; the dock stays at the viewport bottom. The captures retain the same Step 1 / source #10 and Auto/Output evidence state. |

The source correction at `frontend/src/neutral.css:120` uses `.reference-shell main[data-page="replay"] { padding-bottom:112px; }`. It matches the shared page rule's specificity and wins by later source order, making the intended bottom reservation effective without changing module sizes.

I read the targeted assertions in `tests/e2e/document-workspace.mjs` and the supplied local/offline results. At both sizes, the test scrolls to the document end, checks the complete final module bottom against `dock.top - 16px`, checks the Terminal button with `elementFromPoint`, and actually expands then collapses the output while repeating the clearance checks. `test-results/document-workspace/verification.json` and the published [verification.json](verification.json) both report `replayDockClearance: true` locally and in the exact exported HTML; offline reports zero HTTP requests and no page errors. These are supplied execution results, not reviewer reruns.

The sole listed fix is resolved. Proceed to the authorized DESIGN.md/sidecar merge. The original full-review limits and historical OPEN Taste gate remain unchanged by this scoped verdict.
