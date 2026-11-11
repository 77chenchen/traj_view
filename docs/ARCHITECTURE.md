# Architecture

```text
Input logs → adapters → canonical trajectory → phase rules
                          ↓                    ↓
                  raw source + inspector     graph + metrics → index and run files
                                                                   ↓
                                                    Vite / React viewer and offline HTML
```

`trajviz build` is a local batch command. The viewer loads summaries immediately, graphs when selected, and step contents and text search data on demand. Outcome labels belong to the source. The build can apply redaction to both canonical and derived data. The static server binds to localhost by default.

## Decisions

- Use Python 3.11+, Pydantic 2, Typer and PyYAML. The package registry was inaccessible in the default shell. An approved install made project-local dependencies available.
- Vite, React and TypeScript serve the viewer. Cytoscape runs the graph layouts. ELK handles small graphs and Dagre handles larger graphs. Keep a deterministic time-order position fallback for long chains and layout failures. D3 Sankey uses time layers so repeated transitions and reverse phase transitions remain visible without introducing a cycle in the Sankey input.
- Step details and full text are outside the run index. A standalone report embeds the files and frontend assets without making network requests.
- Expanded temporal edges form a forward chain. Dependencies and retries are also forward edges. Aggregate edges preserve their types and frequencies. Structural edges are reserved for optional hierarchy overlays.
