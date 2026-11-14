---
name: "TrajViz"
description: "A local workspace for inspecting recorded coding-agent evidence."
colors:
  accent: "#7046d7"
  accent-hover: "#6036c7"
  on-accent: "#ffffff"
  accent-soft: "#f0eaff"
  accent-line: "#a98be9"
  bg: "#f7f8fc"
  surface: "#ffffff"
  surface-2: "#f6f7fb"
  surface-hover: "#f0eefb"
  canvas: "#fcfcfe"
  line: "#e0e4ee"
  line-strong: "#cbd2e1"
  dot: "#d9ddea"
  text: "#20283b"
  muted: "#5b657b"
  subtle: "#687287"
  good: "#247143"
  good-bg: "#e7f5eb"
  bad: "#b53046"
  bad-bg: "#fce9ed"
  agent-a: "#27854e"
  agent-b: "#7950d3"
  rail-active: "#eee7fc"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
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
    fontSize: "13px"
    fontWeight: 580
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
    lineHeight: 1.8
rounded:
  row: "3px"
  control: "4px"
  navigation: "5px"
  workspace: "6px"
  field: "7px"
  panel: "8px"
  pill: "20px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  inset: "14px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "7px 11px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
  navigation-item-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.text}"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "8px 11px"
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
    rounded: "{rounded.navigation}"
    padding: "10px"
  view-tab-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.navigation}"
    padding: "5px 9px"
  graph-node:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    width: "164px"
    height: "48px"
---

# Design System: TrajViz

## Overview

**Creative North Star: "The recorded-evidence workspace"**

TrajViz is a desktop Operate interface for reading saved agent traces. Pale continuous workspaces, near-white panels, blue-gray boundaries and dark text keep the recorded evidence easy to scan. Purple coordinates selection and focus; green and red retain outcome and diff meaning.

The interface gives one working area priority and keeps source context close without exposing every diagnostic at once. Compact navigation, local scrolling and named disclosures support the failure → command/output → recorded patch → later validation workflow. The default appearance is light; a dark appearance remains a saved browser preference.

**Key Characteristics:**

- Continuous work surfaces with thin boundaries and flat depth.
- One dominant workspace with compact stage navigation and on-demand detail.
- Purple source selection; written outcomes with green/red reinforcement.
- Readable recorded code, exact source indices and explicit missing-data states.

The current visual authority is the user's three pale desktop references: [Graph](docs/design-references/three-page-hierarchy/graph.png), [Compare](docs/design-references/three-page-hierarchy/compare.png) and [Replay](docs/design-references/three-page-hierarchy/replay.png). The [direction and verification report](docs/research/three-page-hierarchy.md) records their implemented surfaces and evidence boundaries. Browser window chrome is outside the product.

## Colors

The palette is cool and quiet: dark text on pale workspaces, restrained purple selection, and green/red evidence outcomes. Frontmatter values are normative for the default light appearance.

### Primary

- **Selection purple** (`accent`, `accent-hover`): primary actions, selected source rows, stage state, focus and the light graph selection ring.
- **Pale purple wash and boundary** (`accent-soft`, `accent-line`): selected plates and subordinate action states. Keep most of the work surface neutral.
- **On-accent white** (`on-accent`): text and icons on filled primary actions.

### Secondary

- **Recorded green / recorded red** (`good`, `good-bg`, `bad`, `bad-bg`): written outcomes, errors and recorded diff meaning. These are evidence semantics, not decoration.
- **Agent A green / Agent B purple** (`agent-a`, `agent-b`): comparison identity, dots and metric bars. Their labels distinguish identity from pass/fail.

### Neutral

- **Pale workspace** (`bg`), **near-white panel** (`surface`) and **quiet inset** (`surface-2`): page, evidence panes and subordinate headers.
- **Canvas white** (`canvas`) and **blue-gray dots** (`dot`): the working graph and source-code background.
- **Blue-gray boundary** (`line`, `line-strong`): single-pixel dividers and stronger field/control boundaries.
- **Dark ink / secondary ink / quiet ink** (`text`, `muted`, `subtle`): evidence, operating labels and supporting hints.
- **Quiet hover** (`surface-hover`) and **selected navigation plate** (`rail-active`): interaction state without large saturated fills.

**The Selection and Outcome Rule.** Selection marks the current source; it never replaces the source outcome. Keep failure borders, written status and diff signs visible inside selected content.

Dataset phase colors and the graph's edge/type palette are evidence encodings, resolved by [graphDrawing.tsx](frontend/src/graphDrawing.tsx), rather than a new brand scale. The dark palette remains defined in [workbench.css](frontend/src/workbench.css); light semantic overrides are in [hierarchy.css](frontend/src/hierarchy.css).

## Typography

**Body and control font:** the native system sans stack. **Evidence font:** the system monospace stack. No display face or web font is used.

**Character:** compact, direct and readable. Weight and spacing establish hierarchy; recorded code stays larger than the surrounding support labels.

- **Headline:** page names, using the `headline` role.
- **Title:** selected evidence and comparison headings, using the `title` role. Compact pane headings also use 13px.
- **Body:** the default 13px system text. Inspector and metric content commonly use 12px.
- **Label / navigation / badge:** separate frontmatter roles preserve the observed control and status weights.
- **Support:** 11px context and control labels; 10px is reserved for compact timestamps and graph-node detail.
- **Evidence:** desktop Replay code uses the 13px monospace role with generous line spacing. Inspector code uses 11–12px within its narrower pane; no explanatory prose is hidden in a code font by default.

**The Evidence Reading Rule.** Reduce repeated metadata and close secondary detail before reducing evidence type. Long code and logs scroll within their own region.

## Layout

The shared frame uses a fixed left rail and a sticky product bar (56px). The desktop rail is 180px, narrowing to 168px from 1101–1370px. Main content has 20px horizontal insets, narrowing to 16px in that band, with 12px vertical rhythm. Titles, concise source metadata and a compact stagebar lead into the work area. Duration, model, agent, date, source count and dataset belong in Run details rather than a second full metadata row.

Graph and Replay combine adjacent panes into one bordered work surface, using separators between panes. At desktop widths above 1370px Graph's Inspector is 320px; Replay's source list is 270px and its optional detail pane is 320px. In the 1101–1370px band these become 300px, 240px and 300px. The evidence area consumes the remaining width. Compare's optional Step comparison uses the same 320px/300px widths. Compare's paired alignment rows share one relationship column, at 125px or 105px in the compact desktop band.

**The Primary Workspace Rule.** Give the active investigation most of the available desktop area. Keep supporting diagnostics behind clearly named controls.

This revision's design and screenshot scope is desktop (1586×912 and 1280×800). Existing reachable narrow-screen controls are retained: the rail becomes an icon rail at 1100px, inspection can become a drawer at 1000px, and existing compact/stacked layouts continue at 760px and 520px. These are compatibility behavior, not a new mobile design direction.

The CSS cascade is [styles.css](frontend/src/styles.css) → [workbench.css](frontend/src/workbench.css) → [density.css](frontend/src/density.css) → [hierarchy.css](frontend/src/hierarchy.css). New work must respect the last stylesheet's light tokens, desktop dimensions and pane hierarchy.

## Elevation & Depth

Ordinary panels are flat: no resting shadow, gradients or floating-card stacks. Pale tonal changes and single-pixel boundaries provide separation. Graph nodes are crisp SVG objects on a dotted canvas. Only transient menus, search results, metadata and help popovers use the shared ambient popover shadow. The exact light/dark shadow values and focus treatments live in the sidecar because they do not fit the frontmatter component schema.

Stage borders/backgrounds and navigation background changes use brief feedback (150ms ease-out) only when reduced motion is not requested. Reduced motion disables that transition rule and suppresses loading animation and smooth scrolling. Camera and playback feedback must keep source evidence available immediately.

## Shapes

Small corners carry the interface: alignment rows use 3px corners, compact controls 4px, navigation and selected rows 5px, joined workspaces 6px, fields/base buttons 7px and independent panels or graph nodes 8px. Outcome badges use a pill. The circular brand-adjacent view icon, avatar and Replay play control are distinct small landmarks. Internal pane boundaries remain straight; avoid nesting rounded cards where one divider expresses the relationship.

## Components

### Buttons and fields

Buttons are compact and bordered. Primary actions fill with selection purple; secondary actions use a near-white surface; quiet actions use purple text on a transparent background. Base buttons have a 36px minimum height and 7px corners, with a 30px small variant. Contextual graph controls are 29px tall. Hover uses the purple wash or the primary hover color. Fields use the stronger blue-gray boundary, a near-white fill and the shared focus treatment; an invalid field uses the error boundary. Disabled controls remain labelled and visibly subdued.

### Navigation and shared context

The white left rail retains Replay, Timeline, Graph, Compare, Analytics and Datasets, with a pale purple active plate, purple line icon and written page name. The topbar keeps the existing product mark/name, breadcrumbs, local search, dataset status, help and local appearance preferences. The dataset picker stays in the rail footer; run/comparison context starts closed. Page explanations and Run details open from labelled disclosures. Share preserves the exact source URL.

### Outcomes, selection and evidence panels

Written status is mandatory beside semantic color. A selected event row uses a purple wash/boundary while keeping its source outcome readable. Evidence panes use a compact heading, single-pixel separation and local scrolling. Recorded diffs retain line numbers, context and +/− signs with green/red rows. Code, copy and expand actions always refer to the currently displayed recorded evidence.

**The Stable Source Rule.** Run ID plus exact source idx identifies the selection across views and shared URLs. Display ordinals are presentation and playback positions.

### Graph workspace

The execution canvas dominates beneath a compact stagebar and one-line toolbar. Layers, Legend and Agent activity start closed. The right-side Inspector shows an empty prompt until a source node is selected. Details, Files & activity and Signatures stay available; the selected node separates Details, Code Diff, Error Output and Context. Camera/search/export controls remain directly reachable. Node category shapes, phase/error strokes and an independent selection/focus ring carry different meanings. Hierarchy is containment; graph dependencies retain the existing file/observation heuristics.

### Compare workspace

One shared A/B alignment is the default primary trajectory. Three flat metrics (Duration, Tool Calls, Retries) sit above it. Step comparison starts closed unless the route already carries a selected source; selecting a row opens it without replacing the alignment. Named workspaces expose Patch comparison, All metrics and Run DAGs. Agent A details, Agent B details and Key Findings start closed beneath alignment. Paired metrics use a common scale and explicit numbers; missing values have written unavailable states.

### Replay workspace

A source-ordered list supports the dominant central evidence area. The persistent transport remains in the viewport; Step details starts closed. Stage previews, saved text, arguments, raw references and personal annotations are available on demand. Selection chooses an appropriate recorded patch, saved file/read or command/text view. Terminal/Tests opens when it adds evidence beside file/patch content and can collapse. The transport uses source positions and recorded timestamps; playback speed changes the stepping interval, not the underlying trace.

## Do's and Don'ts

### Do:

- Do use the light palette as the default and preserve the saved dark appearance.
- Do pair semantic color with written status, icons, exit codes or diff signs.
- Do preserve exact source identity, including every occurrence of a repeated signature.
- Do keep missing data visibly distinct from a recorded zero.
- Do keep code and logs locally scrollable and restore focus when closing detail.

### Don't:

- Don't invent agent branches, file versions, durations, cost or test pass rates to fill a reference layout.
- Don't use reference task names, sample metrics or sample code as product evidence.
- Don't conflate a signature match or a rejoined alignment row with semantic equivalence or a successful outcome.
- Don't make the historical dark four-page composition the current default.

Historical material remains available: the [density surface](docs/research/density-surface.md), [density verification](docs/research/density-verification.md), [four-reference checklist](docs/research/four-reference-checklist.md), [four-reference verification](docs/research/four-reference-verification.md), [four-reference surface](docs/research/four-reference-surface.md) and earlier [navy references](docs/design-references/trajectory-viewer/). They document prior composition and are not the current default authority.
