import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { escapeXml } from './line-chart.js';
import { svgToPng } from './render.js';

/** Official Neptune Privacy logo from https://neptune.io/neptunelogo.svg (viewBox 0 0 1002 1002). */
const LOGO_PATH = fileURLToPath(new URL('../../assets/brand/neptune-logo.svg', import.meta.url));
const LOGO_VIEWBOX = 1002;
const NEPTUNE_BLUE = '#3140A7';
const ACCENT = '#8b8cf8';

export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 630;

/** The logo's inner markup, so it can be placed and scaled inside the banner. */
export function logoMarkup(svg: string): string {
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg);
  if (match?.[1] === undefined) {
    throw new Error('Logo SVG is not valid');
  }
  return match[1].trim();
}

export function renderWelcomeBannerSvg(logoSvg: string, commands: string[]): string {
  const logoSize = 300;
  const logoX = 100;
  const logoY = (BANNER_HEIGHT - logoSize) / 2;
  const textX = 470;

  let chipX = textX;
  const chips = commands
    .map((command) => {
      const width = 36 + command.length * 15;
      const chip =
        `<rect x="${chipX}" y="430" width="${width}" height="52" rx="26" fill="${ACCENT}" fill-opacity="0.12" stroke="${ACCENT}" stroke-opacity="0.5"/>` +
        `<text x="${chipX + width / 2}" y="464" text-anchor="middle" font-size="24" font-weight="600" fill="#d9d9ff">${escapeXml(command)}</text>`;
      chipX += width + 14;
      return chip;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" viewBox="0 0 ${BANNER_WIDTH} ${BANNER_HEIGHT}" font-family="Inter">`,
    '<defs>',
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#151530"/><stop offset="1" stop-color="#08080f"/></linearGradient>',
    `<radialGradient id="logoGlow" cx="0.21" cy="0.5" r="0.42"><stop offset="0" stop-color="${NEPTUNE_BLUE}" stop-opacity="0.55"/><stop offset="1" stop-color="${NEPTUNE_BLUE}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="accentGlow" cx="0.95" cy="0.05" r="0.6"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.18"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`,
    '</defs>',
    `<rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#bg)"/>`,
    `<rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#logoGlow)"/>`,
    `<rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#accentGlow)"/>`,
    `<g transform="translate(${logoX} ${logoY}) scale(${logoSize / LOGO_VIEWBOX})">${logoMarkup(logoSvg)}</g>`,
    `<text x="${textX}" y="212" font-size="22" font-weight="600" fill="#9a9ab5" letter-spacing="4">NEPTUNE PRIVACY · COMMUNITY BOT</text>`,
    `<text x="${textX - 4}" y="330" font-size="120" font-weight="700" fill="#f4f4fb" letter-spacing="-2">Levia</text>`,
    `<text x="${textX}" y="388" font-size="30" fill="#b8b8d0">Network stats, XNT price and mining help</text>`,
    chips,
    '</svg>',
  ].join('');
}

let cachedBanner: Uint8Array | undefined;

/** Renders the welcome banner once per process and reuses it. */
export function getWelcomeBannerPng(): Uint8Array {
  cachedBanner ??= svgToPng(
    renderWelcomeBannerSvg(readFileSync(LOGO_PATH, 'utf8'), [
      '/stats',
      '/price',
      '/mining',
      '/links',
    ]),
  );
  return cachedBanner;
}
