import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { type DrawingOptions, GraphDrawing, palettes } from './graphDrawing';
import { download } from './ui';

export async function exportGraph(format: 'svg' | 'png', name: string, options: DrawingOptions) {
  const { x, y, width, height } = options.drawing.bounds;
  const scale = Math.min(2, 4096 / Math.max(width, height), Math.sqrt(12_000_000 / (width * height)));
  const svgWidth = format === 'png' ? Math.max(1, Math.round(width * scale)) : Math.ceil(width);
  const svgHeight = format === 'png' ? Math.max(1, Math.round(height * scale)) : Math.ceil(height);
  const holder = document.createElement('div');
  const root = createRoot(holder);
  let serialized: string;
  try {
    flushSync(() => root.render(<svg xmlns="http://www.w3.org/2000/svg" width={svgWidth} height={svgHeight}
      viewBox={`${x} ${y} ${width} ${height}`}>
      <title>{name}</title>
      <rect x={x} y={y} width={width} height={height} fill={palettes[options.theme].surface} />
      <GraphDrawing {...options} prefix="trajectory-export" />
    </svg>));
    if (!holder.firstElementChild) throw new Error('The graph could not be rendered.');
    serialized = new XMLSerializer().serializeToString(holder.firstElementChild)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, '\uFFFD');
  } finally {
    root.unmount();
  }

  const filename = `trajviz-${name.replace(/[^a-z0-9_.-]+/gi, '-').slice(0, 110)}.${format}`;
  const svg = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  if (format === 'svg') {
    download(svg, filename);
    return;
  }

  const url = URL.createObjectURL(svg);
  try {
    const picture = new Image();
    picture.src = url;
    await picture.decode();
    const canvas = document.createElement('canvas');
    canvas.width = svgWidth;
    canvas.height = svgHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable in this browser.');
    context.drawImage(picture, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('The graph could not be converted to PNG.');
    download(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
