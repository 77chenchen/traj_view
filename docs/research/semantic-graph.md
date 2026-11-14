# Content-based execution Graph · 2026-11-14

The prior overview divided a trace into four equal source ranges. Its headings expressed position rather than execution content. This revision replaces that partition with an ordered change-point tree and puts an evidence summary on every merged node. It preserves the existing light Graph workspace and parent-navigation correction. The earlier [long-graph report](long-graph.md) is historical.

## Direction and reading order

**Mode / thesis:** Operate. Read what a contiguous group did, open its actual calls, inspect evidence, and return through the same path. The primary working area remains the left-to-right canvas.

**Incumbent system:** keep DESIGN.md, PRODUCT.md and `.impeccable/design.json`; pale continuous surfaces, blue-gray boundaries, purple selection, written errors and saved diff colors. This is a node/content extension, not a replacement visual world. No new assets, fonts or upstream UI code.

**First viewport:** at most three operation sections, an empty Inspector and existing source/failure navigation. A section shows an operation label, activity counts, a file or command subject, source count and errors. Titles use a middle dot for a mixture of operations, without asserting a single chronological pass or causal relationship. Less common evidence stays in Section contents and Inspector.

**Form:** Operate; code-led ordinary extension, `seed: none (pinned)`. The user's pinned world is “统一浅色工作区、近白工作面、蓝灰细线、深色正文、紫色选中”; the pinned first-surface experience is “首屏优先展示宽大的执行画布” and “选中后才需要的内容放在联动详情中”. The latest content-direction correction is “合并之后的图……包含的这几步的执行内容的概括”. Preserve that canvas/Inspector relationship while replacing equal numeric partitions with recorded-operation summaries.

**Signature interaction:** open a content section → expand Section contents → choose an activity or recorded example → inspect the exact source → Back one level or Alt+↑. Named ancestors remain available; the inspected source and URL survive returning.

**Finish:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, preserved DESIGN.md and every shipping raster carrying its provenance.

## Grouping rules

1. Map each original source step to its recorded activity. Inspect the first shell invocation, rather than searching its entire arguments for words such as `pytest`. For example, `sed … tests/test_example.py` is an inspection, not a test execution. Existing categories/phases supply fallbacks; final-message tags identify final text.
2. Describe command families and, for saved Python scripts, literal import lines. `Python · example_retry` names a module present in the source; it does not claim the script passed a test. Explicit file targets take priority as subjects. Simple path-like operands in read commands are qualified as `cmd:`; they are not confirmed file touches and never enter the file-target list.
3. Score all adjacent split positions by the change in activity, command-family and subject distributions. The deterministic score is weighted Gini gain (6 / 1.7 / 0.9), multiplied by a balance factor (0.7–1). A boundary inside equal normalized signatures is discounted by 0.6; a recorded adjacent retry link discounts it by 0.75. Source-position ties are stable.
4. Prefer boundaries with score ≥0.12. When content has no strong change, split a continuation batch for navigation and explicitly say so in its basis. A minimum tail guard of `floor(size/16)` prevents pathological chains; it does not make equal third/fourth partitions. At each level, expose up to three tree parts, preferring stronger content boundaries. A range of at most four steps shows the original calls.
5. Preserve contiguous source intervals and exact member IDs throughout. Nonconsecutive repeats cannot become one node. Only existing inter-section edges roll up by endpoints, type and count; internal and cross-range relations remain in the original source Context. Filtering retains matching intervals and removes edges with missing endpoints. Canonical data and v1 schema are unchanged.

There is no LLM summarization or hidden model request. Titles and counts are deterministic descriptions of operations, not recovered sub-task intent, agent identity or proven causation. Same-signature commands can have different bodies. Step counts and errors describe the full section, including when only some members match filters. Retry summaries count recorded retry-edge frequencies, not independently measured attempts.

## Entries and evidence

| User need | Entry / behavior | Source and verification |
| --- | --- | --- |
| Understand merged calls | Node title, activity mix, file/command subject, error/source counts | Derived from saved steps; `data-section-summary` assertions and pure summary/member tests |
| Understand the grouping | Open section → Section contents | Change-point or continuation basis, explicit `cmd:` qualification |
| Locate an operation | Activity count → show first | Exact source index from that activity's members; no reconstructed indices |
| Read original evidence | Recorded examples → source record | Original command/text, parameters, output and raw reference in Inspector |
| Navigate outward | Back one level, Alt+↑, named ancestors | Restore prior node sets, keep Inspector/source/URL, restore focus; root disabled |
| Keep the graph legible | Three sections or up to four original calls, source-order x, outer edge channels | Mixed 220×104 section / 164×48 call geometry checked for forward obstacle-free routes |
| Search / filter / export | Existing node search, Layers and PNG/SVG/CSV; standalone HTML | Full-source search; interval-aware filters; browser operation chains online and offline |
| Read missing evidence | Qualified unrecorded state / generic operation label | No invented intent, duration, filesystem content, result or agent topology |

Section contents has local scrolling and a bounded height. Its open state belongs to the current section: locating another scope does not leave an unrelated expansion open. Source selection remains stable when disclosures or zoom change.

## Reproduction

```sh
source .venv/bin/activate
python -m pytest
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html --csv metrics.csv
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
python -m backend.cli serve out --port 8765
```

Open <http://127.0.0.1:8765/#view=graph&run=execution-long-synthetic>. The public 96-step fixture is clearly labeled synthetic and includes saved edits, failures, retries and nonconsecutive source indices beyond 2^53. Public browser artifacts are in [semantic-graph/](semantic-graph/). PNGs are direct whole-page browser captures, not montages or design images.

With the existing authorized real dataset served locally on 8766:

```sh
python -m backend.cli export .workers/local/nl2repo-50-out --html .workers/local/nl2repo-long-graph.html
node scripts/verify-execution-map.mjs --output .workers/local/semantic-graph-qa
```

This reads existing logs only. It does not run models or load credentials. The private verifier uses actual saved steps for the same tree as the viewer. Screenshots, source summaries, raw IDs and HTML stay in ignored `.workers/local/`.

## Actual real-data results

The existing dataset contains 50 records and 1,071 canonical steps. The three longest have **324 / 172 / 87** steps and **379 / 193 / 188** source edges. These are recorded attempts, including interrupted/provider-limited runs, not 50 completed benchmarks.

Root interval sizes are **35 / 24 / 265**, **33 / 3 / 136** and **14 / 23 / 50**. Their unequal boundaries reflect recorded activity. The 324-step run separates early inspection/checks, an edit/setup mixture, and a long Python-dominated region; opening the last region reveals a named repeated Python-module section. The 172-step run isolates three recorded pytest calls before the long inspection section. The 87-step run preserves mixed edit/command regions rather than inventing tidy sub-task stages.

The verifier passed all three traces, source-example jumps, exact failed/final sources, real cross-range dependency jumps, zoom, SVG, parent navigation and a 1280×800 chain. It produced **38 private full-page captures**, with no page errors. The regenerated private standalone HTML worked with HTTP blocked: **0 HTTP requests / 0 page errors**.

| Private state | Relative path under `.workers/local/semantic-graph-qa/` |
| --- | --- |
| Each whole run | `after-N-overview.png` (`N` = 0, 1, 2 by descending step count) |
| Largest execution section | `after-N-execution-section.png` |
| First section and grouping basis | `after-N-section.png`, `after-N-contents.png` |
| Failure and original relationships | `after-N-failure.png`, `after-N-context.png`, `after-N-dependency-context.png`, `after-N-dependency-jump.png` |
| Exact final source / full links | `after-N-last-source.png`, `after-N-all-connections.png` |
| Smaller desktop | `after-0-overview-1280.png`, `after-0-section-1280.png`, `after-0-failure-1280.png`, `after-0-last-leaf-member-1280.png`, `after-0-relocated-1280.png`, `after-0-navigator-focus-1280.png` |
| Offline report | `offline-overview.png`, `offline-failure.png` |

## Checks and limitations

Python: **81 passed in 7.16s**. TypeScript and production build passed. Pure suites passed **855 existing DAG checks**, **1,908 execution scopes**, **3,161 exact paths**, **5,189 mixed-size forward routes**, and content/subject/summary regressions. The 2,000-step alternating synthetic stream had maximum path depth 11; source search and the navigator can jump directly to a call. The build retains its existing large-bundle warning (2,432.92 kB JS / 754.85 kB gzip).

All **28 Chrome scenarios passed**, including current overview summaries, recorded-example jumps, parent navigation, Graph/Compare/Timeline/Replay, PNG/SVG/CSV and offline reports. Final first graph paint is **128.3 ms / 197.9 ms** for **500 / 2,000 source steps**. First paint retains click → visible SVG → next frame after app load; these single overview samples draw three merged nodes, not all 500/2,000 source calls. It excludes initial bundle loading and is not a full-graph benchmark. The 2,000-step chain also exercises zoom, empty filters/recovery, final-source search and Inspector.

Public final evidence: [overview](semantic-graph/execution-synthetic-overview.png), [contents](semantic-graph/execution-synthetic-contents.png), [failure](semantic-graph/execution-synthetic-failure.png), [patch](semantic-graph/execution-synthetic-patch.png), [returned parent](semantic-graph/execution-return-parent.png). [Scenario results](semantic-graph/scenarios.json), [first paint](semantic-graph/first-render.json), [sanitized real assertions](semantic-graph/verification.json) and [screenshot provenance](semantic-graph/provenance.md) accompany them. Public images use the explicitly synthetic fixture, while all 38 real captures remain local.

The fresh independent finish reviewer returned **ship** for this content-grouping extension after opening all **43** required PNGs (five public, 38 private) and reviewing source/assertions. No material fixes remained; the review did not operate a browser or rerun tests. It covers the shipped light desktop 1586×912 / 1280×800 states, not unchanged surfaces, mobile or a whole-app audit. See [the five-section review](semantic-graph/review.md). The one task-scoped detector returned `[]`; it was not rerun. The finished source/captures preserve the existing PRODUCT.md, DESIGN.md and `.impeccable/design.json` system; no shared-system files changed.

Grouping remains a rule-based description. Compound shell commands and opaque scripts can retain generic command-family subjects; missing explicit targets are not repaired into verified file access. v1 lacks per-call duration, authoritative agent parentage, complete file versions, task-intent annotations, cost and authoritative attempt counts. Existing dependency/retry heuristics remain qualified; no new causal edges are inferred. Small/unclassified or interleaved records may produce mixed-operation summaries. Continuation batches remain necessary when hundreds of calls contain no distinct content boundary.
