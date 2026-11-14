GATE: OPEN 31 (rounds used up)

# Taste gate open findings

Final check: actual synthetic standalone report. No waivers. Gate is not a pass. Earlier bundled-app check reported shader-lint false positives in Cytoscape; the final standalone check retains the findings below. Marketing hero/section rules and incumbent catalog treatments are outside this hierarchy/live extension.

- **hero-fill** — `main#main-content > div > div.stats "Runs 11 Trajectories in dataset Tasks 2 "`: the next section shows on the first screen: it starts at 183px on a 900px screen (the hero ends at 159px)
- **flush** — `main#main-content > div > div.stats > div.stat:nth-of-type(1) "Runs 11 Trajectories in dataset"`: its first line sits 0px under the top edge of div.stats, where the ground changes
- **nav** — `(the first screen)`: no nav bar across the top of the first screen (a header with the brand, the section links and the main action)
- **text-only** — `main#main-content > div > section.panel.run-panel "Run catalog"`: the closing section is only text: no picture, icon, mock or effect in it
- **card-visual** — `main#main-content > div > div.stats "Runs 11 Trajectories in dataset Tasks 2 "`: 4 cards hold only text: no picture, icon, UI fragment or effect in any of them
- **button-styles** — `(one screen)`: 3 button styles on one screen: soft, fill #fffefa, outline #d8d2ce (".* Langutory"); soft, fill #383052, outline #50456e ("Runs"); soft, fill #5441b5, outline #5441b5 ("Compare runs"); the odd one out: "Compare runs"
- **copy-headline** — `div > header.page-heading > div:nth-of-type(1) > h1 "Runs"`: "Runs" does not name what is sold (agent trace analysis, agent, trace, analysis, from flags)
- **heading-scale** — `div > div.stats > div.stat:nth-of-type(1) > strong "11"`: the figure "11" is set at 26px, larger than the section headings (h2 16px); 3 more like it
- **field-label** — `section.panel.run-panel > div.filters:nth-of-type(2) > label.search-field > input`: a input[type=search] without a label you can see: its <label> is hidden
- **field-label** — `tr:nth-of-type(1) > td:nth-of-type(1) > span > input`: a input[type=checkbox] without a label you can see: only an aria-label names it
- **field-label** — `tr:nth-of-type(2) > td:nth-of-type(1) > span > input`: a input[type=checkbox] without a label you can see: only an aria-label names it
- **field-label** — `tr:nth-of-type(3) > td:nth-of-type(1) > span > input`: a input[type=checkbox] without a label you can see: only an aria-label names it
- **field-label** — `tr:nth-of-type(4) > td:nth-of-type(1) > span > input`: a input[type=checkbox] without a label you can see: only an aria-label names it
- **field-label** — `tr:nth-of-type(5) > td:nth-of-type(1) > span > input`: a input[type=checkbox] without a label you can see: only an aria-label names it
- **focus-ring** — `h1:focus, main:focus`: "h1:focus, main:focus" in the page removes the focus outline and sets nothing in its place
- **focus-ring** — `.graph-node:focus`: ".graph-node:focus" in the page removes the focus outline and sets nothing in its place
- **focus-ring** — `.sankey-link:hover, .sankey-link:focus-visible`: ".sankey-link:hover, .sankey-link:focus-visible" in the page removes the focus outline and sets nothing in its place
- **focus-ring** — `.sankey-node:focus-visible`: ".sankey-node:focus-visible" in the page removes the focus outline and sets nothing in its place
- **focus-visible** — `section.panel.run-panel > div.filters:nth-of-type(2) > label.search-field > input "Search runs and steps"`: Tab stop 9, input "Search runs and steps": it shows no change when focused
- **moment-none** — `(the page)`: a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **hero-screen** — `main#main-content > div "RunsFind trajectories, inspect individua"`: the hero ends at 1115px on a 900px screen, 215px below the fold: it ends at the fold, 1px either way (SR-1)
- **section-height** — `main#main-content > div "RunsFind trajectories, inspect individua"`: the section starts at 87px, 87px below the screen grid (0 x 900px): sections start on whole screens (SR-2)
- **one-section** — `main#main-content > div "RunsFind trajectories, inspect individua"`: a <div> sits directly in <main>: every part of <main> is a <section> (SR-4)
- **one-heading** — `h2#run-catalog-title "Run catalog"`: the hero holds an h2 (1): its heading is the h1, and an h2 opens the next section (SR-5)
- **container-edges** — `main#main-content > div "RunsFind trajectories, inspect individua"`: the content of section 1 runs 252px from the left and 44px from the right (read from its outermost blocks: no .wrap): 252 and 44px are not one margin; the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)
- **container-edges** — `div#root "Skip to workspaceTrajVizWorkspaceRunsRun"`: a <div> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** — `div > section.panel.run-panel > div.filters > label.search-field`: 1 text block starts on a left line at x 280, 28px from the container's left: text starts on the container's left, or on one split line (x 739, 836, 933) (SR-6)
- **container-edges** — `h2#run-catalog-title "Run catalog"`: 3 text blocks start on a left line at x 270, 18px from the container's left: text starts on the container's left, or on one split line (x 739, 836, 933) (also "11 of 11 runs", "Select one run for its graph, or") (SR-6)
- **flush** — `main#main-content > div > div.stats > div.stat:nth-of-type(3) "Models 4"`: its last line sits 0px above the lower edge of div.stats, where the ground changes to section.panel.run-panel
- **cut-text** — `table.runs-table > thead > tr > th:nth-of-type(4) "Condition"`: runs past the edge of its box main#main-content > div > section.panel.run-panel (and 10 more like it: "baseline", "variant", "baseline", "baseline", ...)
- **container** — `page`: no .wrap
