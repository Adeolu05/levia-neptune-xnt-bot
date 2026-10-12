import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const FONT_FILES = ['Inter_400Regular.ttf', 'Inter_600SemiBold.ttf', 'Inter_700Bold.ttf'].map(
  (file) => fileURLToPath(new URL(`../../assets/fonts/${file}`, import.meta.url)),
);

/** Rasterizes an SVG to PNG using only the bundled Inter font (no system fonts). */
export function svgToPng(svg: string): Uint8Array {
  const resvg = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
    background: '#0a0a14',
  });
  return resvg.render().asPng();
}
