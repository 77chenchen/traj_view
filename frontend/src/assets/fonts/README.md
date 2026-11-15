# JetBrains Mono

- Upstream: https://github.com/JetBrains/JetBrainsMono/tree/v2.304
- File: unmodified `fonts/webfonts/JetBrainsMono-Regular.woff2`, regular weight 400.
- Download: https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@v2.304/fonts/webfonts/JetBrainsMono-Regular.woff2
- SHA-256: `a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2` (92,164 bytes).
- License: SIL Open Font License 1.1, preserved in `OFL-JetBrainsMono.txt` and the root `THIRD_PARTY_NOTICES.txt` (also embedded in standalone HTML).

The production CSS inlines this file using Vite's `?inline` asset query. The live app and single-file offline report use the same code face without a font network request. Ligatures are disabled for literal operators. Native system sans remains the interface face; unsupported glyphs fall back to local fonts.
