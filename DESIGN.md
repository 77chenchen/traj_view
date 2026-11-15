---
name: "TrajViz"
description: "A local workspace for inspecting recorded coding-agent evidence."
colors:
  accent: "#405a6b"
  accent-hover: "#2f4757"
  on-accent: "#ffffff"
  accent-soft: "#eaf0f3"
  accent-line: "#8a9da9"
  bg: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f6f8fa"
  surface-hover: "#edf0f2"
  line: "#e0e4e7"
  line-strong: "#b6bfc7"
  text: "#28313a"
  muted: "#58636e"
  subtle: "#626c76"
  good: "#247143"
  good-bg: "#e7f5eb"
  bad: "#b53046"
  bad-bg: "#fce9ed"
  agent-a: "#27854e"
  agent-b: "#3377ad"
  graph-ground: "#ffffff"
  graph-header: "#f3f5f6"
  graph-text: "#263039"
  graph-muted: "#59636e"
  graph-selected: "#3d596b"
  graph-error: "#b53c46"
  graph-divergence: "#8b681f"
  edge-temporal: "#85909a"
  edge-dependency: "#52778d"
  edge-retry: "#9a763c"
  edge-structural: "#638375"
  shell-fill: "#f5f7f9"
  shell-stroke: "#627d92"
  read-fill: "#f3f8f6"
  read-stroke: "#597b70"
  edit-fill: "#fbf8f1"
  edit-stroke: "#947a46"
  validate-fill: "#f1f8f3"
  validate-stroke: "#597d63"
  plan-fill: "#f5f6f9"
  plan-stroke: "#68778e"
  message-fill: "#f7f7f8"
  message-stroke: "#77808c"
  tool-fill: "#f6f8f7"
  tool-stroke: "#697e74"
  group-fill: "#f7f8f9"
  group-stroke: "#758591"
  dark-bg: "#101b23"
  dark-surface: "#192a35"
  dark-surface-2: "#213540"
  dark-surface-hover: "#29434e"
  dark-line: "#354c5a"
  dark-line-strong: "#536c7a"
  dark-text: "#eaf1f4"
  dark-muted: "#b6c7d0"
  dark-subtle: "#a9bdc8"
  dark-accent: "#73d1c7"
  dark-accent-hover: "#9ee1da"
  dark-on-accent: "#102b30"
  dark-accent-soft: "#23494c"
  dark-accent-line: "#61aba8"
  dark-good: "#8bd5a3"
  dark-good-bg: "#1f3e32"
  dark-bad: "#ff9aa3"
  dark-bad-bg: "#432c36"
  dark-agent-a: "#39c77a"
  dark-agent-b: "#70b0de"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  workspace-headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 610
    lineHeight: 1.2
  navigation:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 500
  navigation-active:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 650
  support:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "11px"
    fontWeight: 400
  badge:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.15
  evidence:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.85
  graph-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 650
  graph-metadata:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "10px"
    fontWeight: 400
rounded:
  row: "3px"
  control: "4px"
  selection: "5px"
  workspace: "6px"
  field: "7px"
  panel: "8px"
  pill: "20px"
spacing:
  xs: "6px"
  sm: "8px"
  control: "10px"
  md: "12px"
  inset: "14px"
  lg: "16px"
  xl: "20px"
  compact-page: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
    height: "36px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
    height: "35px"
  navigation-item-active:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.navigation-active}"
    rounded: "0px"
    padding: "0 12px"
  outcome-passed:
    backgroundColor: "{colors.good-bg}"
    textColor: "{colors.good}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  event-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.selection}"
    padding: "14px 10px"
    height: "72px"
  view-tab-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.selection}"
    padding: "6px 10px"
    height: "32px"
  graph-node:
    width: "164px"
    height: "48px"
  graph-summary:
    backgroundColor: "{colors.group-fill}"
    width: "220px"
    height: "104px"
---

# Design System: TrajViz

## Overview

**Creative North Star: "The recorded-evidence workspace"**

TrajViz is a desktop Operate interface for reading saved agent traces. White workspaces, near-white headers, fine neutral boundaries and dark text keep recorded evidence easy to scan. Blue-gray selection belongs to the default light appearance; green and red retain outcome and diff meaning.

One working area leads each page. Named disclosures keep secondary detail available, and source identity stays close to the evidence. The default appearance is light; the saved dark appearance remains available, with the graph retaining its white ground and category silhouettes.

**Key Characteristics:**

- Continuous work surfaces with single-pixel boundaries and flat depth.
- One static navigation row with the existing monochrome mark and six icon/text destinations.
- A vertical source DAG with category silhouettes and in-place content expansion.
- Readable recorded code, stable exact source identity and explicit missing-evidence states.

The current authority is [PRODUCT.md](PRODUCT.md), the [neutral vertical workspace direction and quality bar](docs/research/neutral-vertical-workspace.md) and the subsequent [Replay layout refinement](docs/research/replay-layout.md). There is no approved comp. The [prior full review and scoped ship verdict](docs/research/neutral-vertical-workspace/review.md) record the preceding desktop finish. The public [capture index](docs/research/neutral-vertical-workspace/captures.json), [manifest](docs/research/neutral-vertical-workspace/capture-manifest.json) and [appearance/playback supplements](docs/research/graph-appearance/) preserve that revision's synthetic evidence. New Replay captures are separate. This document merges the current system into the prior specification; it does not reinstate earlier compositions.

## Colors

The default palette uses neutral white surfaces, blue-gray interaction and restrained semantic color. Frontmatter owns all color primitives, including the retained dark overrides and fixed graph/category encodings; prose describes their use.

### Primary

- **Selection blue-gray** (`accent`, `accent-hover`): principal actions, selected source state and focus in light appearance.
- **Selection wash and boundary** (`accent-soft`, `accent-line`): selected rows, evidence tabs and subordinate action states.
- **On-accent white** (`on-accent`): text and icons on filled actions.

### Secondary

- **Recorded green / recorded red** (`good`, `good-bg`, `bad`, `bad-bg`): written outcomes, errors and recorded diff meaning.
- **Agent A green / Agent B steel blue** (`agent-a`, `agent-b`): comparison identity, explicitly labeled separately from outcome.

### Neutral

- **White workspace / white evidence surface** (`bg`, `surface`) and **near-white header** (`surface-2`): continuous page, evidence and supporting chrome.
- **Quiet hover** (`surface-hover`), **fine boundary** (`line`) and **field boundary** (`line-strong`): feedback and separation.
- **Dark ink / secondary ink / support ink** (`text`, `muted`, `subtle`): primary evidence, operating labels and hints.

**The Selection and Outcome Rule.** Selection marks the current source; it never replaces the source outcome. Keep failure borders, written status and diff signs visible inside selected content.

The dark appearance uses the `dark-*` frontmatter tokens from [workbench.css](frontend/src/workbench.css); its existing teal interaction accent remains. The graph uses the same fixed white palette in both appearances, defined in [graphDrawing.tsx](frontend/src/graphDrawing.tsx). Category fill/stroke pairs come from [nodeAppearance.ts](frontend/src/nodeAppearance.ts). Phase dots retain validated dataset colors; they are data encodings rather than brand colors. Selection, category, phase, error and divergence remain independent meanings.

## Typography

**Body and control font:** native system sans. **Evidence font:** system monospace. There is no web font or decorative display face.

The compact hierarchy uses weight and whitespace instead of oversized type. The frontmatter `headline` applies to document-page view titles; `workspace-headline` applies to desktop Graph, Timeline and Replay. The `headline-title` role identifies selected evidence headings. Body text uses `body`; buttons, navigation, outcomes and supporting labels retain their own observed roles. Native navigation uses regular labels and a stronger active label.

Recorded Replay code uses the `evidence` role, with desktop line-height 1.7. Its subordinate Terminal/Tests uses 12px monospace with line-height 1.7. Inspector code uses smaller type within its narrower region. SVG node titles and metadata use their specific frontmatter roles, with complete source identities available in accessible titles and Inspector. Type is not an evidence encoding: visual token widths never imply measured call duration.

**The Evidence Reading Rule.** Reduce repeated metadata and close secondary detail before reducing evidence type. Long code and logs scroll within their own region.

## Layout

The single topbar is in normal document flow (64px). It contains the existing monochrome layers mark, then Replay, Timeline, Graph, Compare, Analytics and Datasets in that order. Icons and written labels share one row; the active tab has a dark underline (3px). The bar scrolls away on document pages. Page changes return to the document top; ordinary selection, disclosure, evidence-tab and camera changes do not reset document scroll.

The shared document container has a maximum width (1720px), desktop horizontal insets (32px), top/bottom padding (28px / 48px) and default gap (20px). At compact desktop widths (1101–1370px), horizontal insets become (24px). Supporting document sections use the observed larger separation (32px).

**The Workspace Scroll Rule.** At desktop widths, Graph, Timeline and Replay fit the available screen with their inspection and local evidence regions. Compare, Analytics and Datasets use natural document scrolling.

At widths of at least 1101px, Graph, Timeline and Replay use the screen below the topbar, with main padding (14px top / 16px bottom), gaps (12px), compact metadata and stage navigation. Graph/Timeline Inspector is (340px), or (320px) in the compact desktop band. Graph activity expands inside the work surface with local scrolling. Timeline keeps six lanes, a searchable Event Log and Event Inspector together; its lane/log split and long evidence scroll locally. Fullscreen Graph, Timeline and Compare Run DAGs retain inspection and exit controls.

Desktop Replay gives the remaining height to a joined workbench: source list (264px, compact desktop 248px), dominant evidence and optional Step details (320px / 300px). Evidence tabs sit below the selected-step heading and above the locally scrollable content. Terminal/Tests occupies the center column's second row: 40px collapsed, or 26% with a 112px minimum expanded. The playback bar occupies its own 64px-minimum row, separated from the workbench by 12px and from the viewport end by 16px; it never overlays code or output. Current source rows remain visible after resize. Below the desktop breakpoint, the retained fallback uses a 760px workbench, document scrolling and fixed 72px playback with 112px page-bottom clearance.

Compare leads with one shared A/B alignment and three flat metrics. Rows have a minimum height (76px), with a shared relationship column (140px). Step comparison is optional and does not replace the alignment. Named alternative workspaces and separate supporting disclosures follow the document rhythm. Analytics and Datasets use readable independent sections and natural document scrolling.

The reviewed scope is desktop (1586×912 and 1280×800). Existing narrow-screen access is retained: horizontal top navigation and stacked/drawer evidence behavior continue at the source breakpoints. These compatibility rules do not establish a newly designed or reviewed mobile composition.

The effective stylesheet order in [main.tsx](frontend/src/main.tsx) is [styles.css](frontend/src/styles.css) → [workbench.css](frontend/src/workbench.css) → [density.css](frontend/src/density.css) → [hierarchy.css](frontend/src/hierarchy.css) → [neutral.css](frontend/src/neutral.css). Extract values from the effective selector and media-query cascade, not an earlier declaration alone.

## Elevation & Depth

Ordinary panels and joined workspaces are flat, with no resting shadow. White/near-white tonal changes and single-pixel boundaries separate regions. The graph has a plain white ground without dots, gradients, glow or decorative imagery. Popovers for layers, metadata and exact Timeline members retain the shared light/dark ambient shadow; the sidecar carries those exact values.

Feedback is brief and functional: stage border/background and navigation background transitions use the existing reduced-motion-aware rule (150ms ease-out). Loading animation is separate. Reduced motion suppresses the no-preference transitions and reduces animation duration and smooth scrolling. Camera and playback must keep recorded evidence immediately available.

## Shapes

Small corner steps follow the frontmatter roles: alignment rows, compact controls, selected rows, joined workspaces, fields/base buttons and independent panels. Joined pane boundaries remain straight. Outcome badges use pills; the Replay play control remains circular. Topbar tabs are square-ended with a small rounded underline, without an active background plate.

Whole-node silhouettes identify recorded categories: Terminal is a window; Read file a folded file; Code edit a cut-corner block; Validation a hexagon; Plan a capsule; Recorded text a speech bubble; Other tool a beveled block; merged contiguous steps a folder. The smaller category glyph inside a node is supplementary. Default source-node boxes are (164×48px); summary folders use (220×104px). Shape changes stay inside their layout box and preserve the top/bottom ports, source ordering and routing. Complete source labels remain available when visible metadata is clipped.

## Components

### Buttons and fields

Buttons are compact, bordered and explicit. Base primary, secondary and quiet variants use the frontmatter assignments; the base minimum height is (36px), with a small variant (30px). Contextual Graph controls use their smaller toolbar dimensions. Hover uses the selection wash/boundary or the primary hover color. Keyboard focus is visible (2px outline, 3px offset); disabled controls remain labeled and subdued. Fields use the stronger neutral boundary, white surface, matching corners and visible focus; invalid fields use the error boundary.

### Top navigation and local utilities

Navigation uses the single static row described in Layout, with line icons (16px), written labels and active underline. The existing mark is an icon, not a generated asset; transparent-logo generation remains deferred. Catalog search remains available with ⌘K/Ctrl+K. Appearance and local dataset information live under Datasets → Local dataset & appearance. Live controls appear in a contextual body row only for a live source.

### Outcomes, source rows and evidence panels

Written status accompanies semantic color. A selected Replay event row uses the selection wash and boundary and preserves outcome cues. Desktop rows use a 58px minimum with 10px / 8px padding; the retained narrow-screen row uses the frontmatter 72px role. Evidence panes use compact headings and local scrolling. Recorded diffs retain line numbers, context and +/− signs. Copy and expand apply to the evidence currently displayed. Unselected Inspectors begin with an explicit prompt.

**The Stable Source Rule.** Run ID plus exact source idx identifies selection across views and shared URLs. Display ordinals and playback positions remain distinct from source identity.

### Graph and Timeline

The white source DAG reads top to bottom, including source order, fallback, ingress/egress and dependency/retry routes. Ordinary wheel pans vertically; Shift-wheel pans horizontally; Ctrl/⌘-wheel zooms at the pointer. Drag, arrows, Fit, source search and SVG/PNG exports remain reachable. In scrolling document embeddings, the graph can hand wheel movement to the document at its boundary. Fit is an explicit overview action and may reduce label size.

Content summaries expand their actual contiguous source interval in place, preserving anchor and scale. Opaque group headers paint above routes and collapse their group; Collapse last/all remain available. Layers, Legend and Agent activity start closed. Selection keeps its independent outer ring, error stroke and phase dot. Structural links mean containment; dependency links retain declared file/observation heuristics and do not establish agent hierarchy. On-screen, SVG and PNG use the same Drawing; very tall raster exports remain bounded while SVG retains vector detail.

Timeline uses opaque full-height sticky lane labels, compact icons and exact screen-space groups with a member picker. Event centers and phase boundaries share ruler geometry. Missing timestamps use source position, and point width is not duration. Fullscreen includes the linked Event Inspector.

### Compare

The three flat metrics support shared alignment. Step comparison begins closed unless the route supplies a source. Patch comparison, All metrics and Run DAGs remain named alternatives; Agent A details, Agent B details and Key Findings are separate closed disclosures. Two to four same-task runs remain supported. Compare identity is green for A and steel blue for B; labels remain explicit. Missing metrics stay unavailable, and signature alignment never claims semantic equivalence.

### Replay and persistent evidence

Step details begins closed. Auto follows the current action's available evidence; manual Diff, Updated File, File Context or Output pins that view through playback, stepping and seek. Inspector tabs, Terminal/Tests selection, expansion, details and raw references retain state across playback and resize. A missing patch displays its own missing state rather than the preceding source's patch. Terminal/Tests stays directly beneath the main evidence within the center column. Playback speed changes stepping interval, not recorded data.

Frozen v1 evidence boundaries remain binding: missing per-call duration, attempts, per-step agents/parents, distinct reasoning roles, patches, file versions, Token/cost and test pass rate remain individually unrecorded. Full file content appears only when explicitly recorded; patch and comparison evidence retain source provenance. Personal annotations stay separate from trace evidence.

## Do's and Don'ts

### Do:

- Do use the light appearance as the default and preserve the saved dark appearance.
- Do keep the graph white and read the source DAG from top to bottom in both appearances.
- Do pair semantic color with written status, icons, exit codes or diff signs.
- Do preserve exact source identity and every occurrence of a repeated normalized signature.
- Do keep manually chosen evidence views and open panels stable during playback, seek and resize.
- Do show missing data as Unrecorded / 未记录 or a specific missing-evidence state; a recorded zero stays zero.
- Do retain reachable local scrolling, keyboard focus and fullscreen inspection.

### Don't:

- Don't restore the historical app rail, purple selection, horizontal DAG or two-row navigation.
- Don't add a product name, breadcrumbs, global search, help, notifications or an avatar to the topbar.
- Don't represent the existing layers mark as a newly generated logo; generation remains deferred.
- Don't invent agent hierarchy, call parents, reasoning roles, durations, attempts, file versions, cost or test pass rates to fill a layout.
- Don't treat file targets as proof of modification, timestamp gaps as durations, or alignment matches and later successful tests as causal proof.
- Don't use sample metrics, code or reference task names as product evidence, or publish private traces in public assets.
- Don't claim a new mobile composition or a pass of the historical marketing-page gate from this desktop revision.

Historical references remain available as records of superseded directions: [three-page hierarchy](docs/research/three-page-hierarchy.md), [three pale references](docs/design-references/three-page-hierarchy/), [density surface](docs/research/density-surface.md), [density verification](docs/research/density-verification.md), [four-reference surface](docs/research/four-reference-surface.md), [four-reference checklist](docs/research/four-reference-checklist.md), [four-reference verification](docs/research/four-reference-verification.md) and [earlier navy references](docs/design-references/trajectory-viewer/). The current review does not rerun or close the historical Taste marketing-page gate. Public evidence uses synthetic fixtures; private traces and captures remain local and ignored.
