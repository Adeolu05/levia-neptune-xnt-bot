/**
 * Dependency-free SVG line chart in the Levia visual style. The SVG is turned
 * into a PNG by `render.ts`. All text uses the bundled Inter font.
 */

export type ChartPoint = { timeMs: number; value: number };

export type LineChartOptions = {
  title: string;
  /** Large headline value, e.g. "1.15 GH/s". */
  value: string;
  /** Optional change badge, e.g. { text: "+18.96% 7D", direction: "up" }. */
  change?: { text: string; direction: 'up' | 'down' | 'flat' } | undefined;
  points: ChartPoint[];
  formatAxisValue: (value: number) => string;
  accent: string;
  footerLeft: string;
  footerRight: string;
};

export const CHART_WIDTH = 1200;
export const CHART_HEIGHT = 675;

const PLOT = { left: 72, right: CHART_WIDTH - 150, top: 250, bottom: 575 };
const COLORS = {
  backgroundTop: '#141427',
  backgroundBottom: '#0a0a14',
  text: '#f4f4fb',
  muted: '#9a9ab5',
  grid: '#2a2a44',
  up: '#34d399',
  down: '#f87171',
  flat: '#9a9ab5',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function round(value: number): string {
  return value.toFixed(1);
}

/** Roughly four "nice" gridline values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 6): number[] {
  const span = max - min || Math.abs(max) || 1;
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((factor) => factor * magnitude)
      .find((candidate) => candidate >= rawStep) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 1e-9; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}

export function renderLineChartSvg(options: LineChartOptions): string {
  const points = options.points.filter((point) => Number.isFinite(point.value));
  if (points.length < 2) {
    throw new RangeError('A line chart needs at least two points');
  }

  const firstTime = (points[0] as ChartPoint).timeMs;
  const lastTime = (points.at(-1) as ChartPoint).timeMs;
  const values = points.map((point) => point.value);
  let low = Math.min(...values);
  let high = Math.max(...values);
  const padding = (high - low || Math.abs(high) * 0.05 || 1) * 0.12;
  low = Math.max(0, low - padding);
  high += padding;

  const x = (timeMs: number): number =>
    PLOT.left + ((timeMs - firstTime) / (lastTime - firstTime || 1)) * (PLOT.right - PLOT.left);
  const y = (value: number): number =>
    PLOT.bottom - ((value - low) / (high - low)) * (PLOT.bottom - PLOT.top);

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${round(x(point.timeMs))},${round(y(point.value))}`,
    )
    .join(' ');
  const area = `${line} L${round(x(lastTime))},${PLOT.bottom} L${round(x(firstTime))},${PLOT.bottom} Z`;

  const grid = niceTicks(low, high)
    .filter((tick) => tick >= low && tick <= high)
    .map((tick) => {
      const ty = round(y(tick));
      return (
        `<line x1="${PLOT.left}" y1="${ty}" x2="${PLOT.right}" y2="${ty}" stroke="${COLORS.grid}" stroke-width="1" stroke-dasharray="4 8"/>` +
        `<text x="${PLOT.right + 20}" y="${ty}" dy="7" font-size="20" fill="${COLORS.muted}">${escapeXml(options.formatAxisValue(tick))}</text>`
      );
    })
    .join('');

  const dayLabels: string[] = [];
  const firstMidnight = Math.ceil(firstTime / 86_400_000) * 86_400_000;
  for (let day = firstMidnight; day <= lastTime; day += 86_400_000) {
    const date = new Date(day);
    const dx = x(day);
    if (dx < PLOT.left + 30 || dx > PLOT.right - 30) {
      continue;
    }
    dayLabels.push(
      `<line x1="${round(dx)}" y1="${PLOT.bottom}" x2="${round(dx)}" y2="${PLOT.bottom + 8}" stroke="${COLORS.grid}" stroke-width="2"/>` +
        `<text x="${round(dx)}" y="${PLOT.bottom + 36}" text-anchor="middle" font-size="20" fill="${COLORS.muted}">${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}</text>`,
    );
  }

  const last = points.at(-1) as ChartPoint;
  const lastX = round(x(last.timeMs));
  const lastY = round(y(last.value));

  let badge = '';
  if (options.change !== undefined) {
    const color = COLORS[options.change.direction];
    const arrow =
      options.change.direction === 'up' ? '▲' : options.change.direction === 'down' ? '▼' : '■';
    const text = `${arrow} ${options.change.text}`;
    const width = 34 + text.length * 13;
    badge =
      `<rect x="${CHART_WIDTH - 72 - width}" y="62" width="${width}" height="48" rx="24" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-opacity="0.45"/>` +
      `<text x="${CHART_WIDTH - 72 - width / 2}" y="94" text-anchor="middle" font-size="22" font-weight="600" fill="${color}">${escapeXml(text)}</text>`;
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" font-family="Inter">`,
    '<defs>',
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.backgroundTop}"/><stop offset="1" stop-color="${COLORS.backgroundBottom}"/></linearGradient>`,
    `<radialGradient id="glow" cx="0.85" cy="0.1" r="0.7"><stop offset="0" stop-color="${options.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${options.accent}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${options.accent}" stop-opacity="0.38"/><stop offset="1" stop-color="${options.accent}" stop-opacity="0"/></linearGradient>`,
    '</defs>',
    `<rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="url(#bg)"/>`,
    `<rect width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="url(#glow)"/>`,
    `<text x="72" y="92" font-size="26" font-weight="600" fill="${COLORS.muted}" letter-spacing="0.5">${escapeXml(options.title)}</text>`,
    `<text x="72" y="178" font-size="72" font-weight="700" fill="${COLORS.text}">${escapeXml(options.value)}</text>`,
    badge,
    grid,
    `<path d="${area}" fill="url(#fill)"/>`,
    `<line x1="${PLOT.left}" y1="${PLOT.bottom}" x2="${PLOT.right}" y2="${PLOT.bottom}" stroke="${COLORS.grid}" stroke-width="2"/>`,
    `<path d="${line}" fill="none" stroke="${options.accent}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<circle cx="${lastX}" cy="${lastY}" r="16" fill="${options.accent}" fill-opacity="0.2"/>`,
    `<circle cx="${lastX}" cy="${lastY}" r="7" fill="${options.accent}" stroke="${COLORS.text}" stroke-width="3"/>`,
    dayLabels.join(''),
    `<text x="72" y="${CHART_HEIGHT - 28}" font-size="19" fill="${COLORS.muted}">${escapeXml(options.footerLeft)}</text>`,
    `<text x="${CHART_WIDTH - 72}" y="${CHART_HEIGHT - 28}" text-anchor="end" font-size="19" font-weight="600" fill="${COLORS.muted}">${escapeXml(options.footerRight)}</text>`,
    '</svg>',
  ].join('');
}
