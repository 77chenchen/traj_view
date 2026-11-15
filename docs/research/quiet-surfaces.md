# Quieter section surfaces · 2026-11-15

The six views now use open section edges and subtle supporting-pane tone in place of repeated enclosing boxes. The change responds to the request that the section/divider lines felt unattractive and tiring. It preserves the current white vertical DAG, semantic action colors, typography, navigation, local scrolling and source-linked interactions.

## Implementation

[`surfaces.css`](../../frontend/src/surfaces.css), imported last by [`main.tsx`](../../frontend/src/main.tsx), owns this narrow refinement. Existing border dimensions remain where needed to avoid shifting the layout; their structural colors become transparent. The light/dark `pane-wash` and `section-rule` tokens are documented in [DESIGN.md](../../DESIGN.md).

| Surface | Change | Retained reading/interaction cues |
| --- | --- | --- |
| Replay | Remove the enclosing workspace frame, search/header/path rules and ordinary row dividers; give the source list a quiet background | Selected source outline, failure wash, Diff +/−, evidence tabs, separate Playback |
| Graph | Remove nested toolbar/sidebar framing; separate Inspector by supporting-pane tone; keep one faint canvas edge | Source-node silhouettes, selected/error outlines, directional edges, Fit/Locate, Collapse all and activity disclosure |
| Timeline | Open the enclosing workspace; lighten lane, grid and table guides | Actual time measurements, category markers, selected event and source-linked Inspector |
| Compare | Remove enclosing alignment/action frames and disclosure rules; use soft row surfaces | A/B identities, first divergence, empty counterpart, selected/matched outlines and failure fill |
| Analytics | Open summaries/disclosures and lighten table row guides; inset the review pane on all sides | Group selection, shared median scales, outcome distributions and review actions |
| Datasets | Open catalog framing, summary and filter regions; lighten row guides | Search/filter controls, selection checkboxes, outcome/error-rate marks and export |

Inputs, buttons, keyboard focus, selected states, error boundaries and code evidence remain independently readable. Inspectors use space between sections. Floating narrow-screen inspection retains an edge against the content underneath. Data, schema, source identity, type sizes and export contracts are unchanged.

## Before / after captures

All captures are independent full-page Chrome renders from document top, using public synthetic fixtures. No crop, compositing or design-image background is used. `*-before.png` files are copied unchanged from baseline **d961982**. New captures use the same route, source selection and desktop sizes. Compare, Analytics and Datasets intentionally extend below the viewport; Graph, Timeline and Replay keep local scrolling within one desktop screen.

| View | Before · 1586×912 | After · 1586×912 | After · 1280×800 |
| --- | --- | --- | --- |
| Replay | [Before](quiet-surfaces/replay-before.png) | [After](quiet-surfaces/replay-1586.png) | [1280](quiet-surfaces/replay-1280.png) |
| Graph | [Before](quiet-surfaces/graph-before.png) | [After](quiet-surfaces/graph-1586.png) | [1280](quiet-surfaces/graph-1280.png) |
| Timeline | [Before](quiet-surfaces/timeline-before.png) | [After](quiet-surfaces/timeline-1586.png) | [1280](quiet-surfaces/timeline-1280.png) |
| Compare | [Before](quiet-surfaces/compare-before.png) | [After](quiet-surfaces/compare-1586.png) | [1280](quiet-surfaces/compare-1280.png) |
| Analytics | [Before](quiet-surfaces/analytics-before.png) | [After](quiet-surfaces/analytics-1586.png) | [1280](quiet-surfaces/analytics-1280.png) |
| Datasets | [Before](quiet-surfaces/datasets-before.png) | [After](quiet-surfaces/datasets-1586.png) | [1280](quiet-surfaces/datasets-1280.png) |

Additional 1280×800 states:

| State | Capture / reproduction |
| --- | --- |
| Failure and keyboard focus | [Replay failure](quiet-surfaces/replay-failure-1280.png): focus Failure and press Enter |
| Diff and optional details | [Replay edit](quiet-surfaces/replay-edit-details-1280.png): pin Diff → Edit → Step details |
| Fullscreen evidence | [Graph fullscreen](quiet-surfaces/graph-fullscreen-1280.png): select source #60 → Code Diff → fullscreen |
| Activity selection | [Graph activity](quiet-surfaces/graph-activity-recorded-text-1280.png): expand Agent activity → By Category → Recorded text #40 |
| Selected divergence | [Compare details](quiet-surfaces/compare-divergence-1280.png): First divergence → B source #30 |
| Floating disclosure | [Timeline Reading guide](quiet-surfaces/timeline-reading-guide-1280.png): focus Reading guide and press Enter |
| Saved dark appearance | [Replay](quiet-surfaces/replay-dark-1280.png) / [Graph](quiet-surfaces/graph-dark-1280.png): Datasets → Local dataset & appearance → Dark theme |

The [46-PNG manifest](quiet-surfaces/capture-manifest.json) includes dimensions, hashes and provenance. Twenty `offline-*` captures repeat the after states in the exact root HTML with networking disabled. Seventeen local/offline pairs are byte-identical; the other three were separately opened and have no material content/framing difference. See [the exact comparison](quiet-surfaces/local-offline-comparison.json). Previous screenshots under `visual-affordances/` remain historical and unchanged.

## Reproduce

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
```

Start `python -m backend.cli serve out --port 8765` in another terminal, then:

```sh
node scripts/verify-visual-affordances.mjs --output docs/research/quiet-surfaces --baseline d961982
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

The capture script now accepts `--output` and `--baseline` to keep each pass independent. It reuses the existing interaction assertions rather than adding tests that mirror CSS declarations.

## Verification and limits

Python: **81 passed (3.93s)**. TypeScript and production build passed; the final build took **9.50s**. The specialist local/offline checks passed at **1586×912 and 1280×800**, including keyboard failure → edit → validation, pinned Diff, fullscreen Inspector, unknown-attempt disclosure, activity source #40, compact evidence tabs, divergence, theme and page-width boundaries. Sampled semantic text/icon contrast is at least **5.2346:1** across 103 samples. The exact offline root report made **0 HTTP requests and 0 page errors**. The single changed-target detector returned `[]`.

Complete smoke results and first-render samples are preserved in [test-summary.json](quiet-surfaces/test-summary.json), [scenarios.json](quiet-surfaces/scenarios.json) and [first-render.json](quiet-surfaces/first-render.json). The independent finish disposition is **ship**, with no material findings in the supplied six-route desktop screenshots and source; its scope and limits are in [finish-review.md](quiet-surfaces/finish-review.md).

The complete smoke run passed **46 / 46 Chrome scenarios**, including existing long/empty/narrow layouts and PNG/SVG/CSV. Pure checks passed 909 DAG sorts, 1,908 execution scopes, 3,161 exact paths, 5,189 mixed routes, 61 inline states / 1,735 forward routes and 126 Timeline layouts. First Overview paint for 500 / 2,000 source steps was **96.7 / 146.0ms**, with three displayed nodes per sample. `git diff --check` passed for both source and generated HTML without an exception.

This is a desktop framing refinement. Existing narrow/long/empty/source-identity/export checks remain in the full regression suite; it does not introduce a new mobile composition or graph layout. The normal Graph captures intentionally center selected source #60; unrelated source nodes outside the camera are reached with existing pan/Fit. All-node rendering and initial bundle loading are excluded from the existing Overview timing definition. Vite retains the prior large-chunk warning (2,462.49kB JS / 762.88kB gzip); final CSS is 326.11kB / 131.69kB gzip. Frozen-v1 field gaps and missing-evidence states remain. No model calls, private logs, credentials or new generated assets were used. Pre-existing Impeccable sidecar drift is not migrated by this refinement.
