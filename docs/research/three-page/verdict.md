## verdict

- **F1 — resolved.** `graph-after.png` and `graph-after-1280.png` show the purple selection ring. `graph-legend.png` also confirms that selection remains separate from the red failure stroke. The light renderer uses `#7046d7`; the dark palette and shared graph/export renderer are preserved.
- **F2 — resolved.** “Reasoning / text” is readable purple in `graph-legend.png`. The light-only override uses the `#7046d7` accent, giving 5.92:1 contrast on white; its selector leaves dark styling intact.
- **F3 — resolved.** The stale aria-labels are removed, so the Replay buttons derive the accessible names “Updated File” and “File Context” from their visible text. The final file/context captures retain the correct evidence and unavailable states; the supplied browser chains use those visible names and pass.

The final 98 manifested captures match their recorded viewport/image dimensions, and the documentation copies match byte-for-byte. Local/offline pairs are identical for 48 of 49 states; only the expected service-status text differs. Both contexts report source identity, all three operation chains and PNG/SVG/CSV exports passing, with no page errors and zero offline HTTP requests. Same-viewport Graph, Replay, Compare and saved-dark captures show no regression introduced by this batch. This verdict uses supplied screenshots, bounded source checks and validation records; no browser, server or new detector was run.

## remaining

None from F1–F3. The full material review remains unchanged in `review.md`.

disposition: ship
