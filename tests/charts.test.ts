import { describe, expect, it } from 'vitest';
import {
  escapeXml,
  niceTicks,
  renderLineChartSvg,
  type LineChartOptions,
} from '../src/charts/line-chart.js';
import { svgToPng } from '../src/charts/render.js';
import {
  getLinksBannerPng,
  getWelcomeBannerPng,
  logoMarkup,
  renderBannerSvg,
} from '../src/charts/welcome-banner.js';

const DAY = 86_400_000;
const OPTIONS: LineChartOptions = {
  title: 'XNT / USD · 7D',
  value: '$0.6541',
  change: { text: '+122.62% 7D', direction: 'up' },
  points: Array.from({ length: 50 }, (_, index) => ({
    timeMs: Date.UTC(2026, 9, 5) + (index * 7 * DAY) / 49,
    value: 0.3 + index * 0.007,
  })),
  formatAxisValue: (value) => `$${value.toFixed(2)}`,
  accent: '#34d399',
  footerLeft: 'Source: CoinGecko',
  footerRight: 'Levia · Neptune Privacy',
};

describe('line chart', () => {
  it('produces a complete SVG with title, value, badge, axis and day labels', () => {
    const svg = renderLineChartSvg(OPTIONS);

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('XNT / USD · 7D');
    expect(svg).toContain('$0.6541');
    expect(svg).toContain('▲ +122.62% 7D');
    expect(svg).toContain('Oct 7');
    expect(svg).not.toContain('NaN');
  });

  it('escapes text content', () => {
    expect(escapeXml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
    expect(renderLineChartSvg({ ...OPTIONS, title: 'A <b> & C' })).toContain('A &lt;b&gt; &amp; C');
  });

  it('handles a flat series without dividing by zero', () => {
    const svg = renderLineChartSvg({
      ...OPTIONS,
      points: OPTIONS.points.map((point) => ({ ...point, value: 1 })),
    });
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('Infinity');
  });

  it('needs at least two points', () => {
    expect(() => renderLineChartSvg({ ...OPTIONS, points: OPTIONS.points.slice(0, 1) })).toThrow(
      RangeError,
    );
  });

  it('chooses round gridline values', () => {
    expect(niceTicks(0.21, 0.72)).toEqual([0.3, 0.4, 0.5, 0.6, 0.7]);
    expect(niceTicks(5, 5)).not.toHaveLength(0);
  });

  it('renders a PNG with the bundled font', () => {
    const png = svgToPng(renderLineChartSvg(OPTIONS));
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(20_000);
  });
});

describe('welcome banner', () => {
  it('embeds the logo markup and command chips', () => {
    const svg = renderBannerSvg('<svg viewBox="0 0 1 1"><rect id="logo"/></svg>', {
      eyebrow: 'EYEBROW',
      title: 'Levia',
      subtitle: 'Sub & title',
      chips: ['/stats'],
    });
    expect(svg).toContain('Sub &amp; title');
    expect(svg).toContain('<rect id="logo"/>');
    expect(svg).toContain('Levia');
    expect(svg).toContain('/stats');
  });

  it('rejects an invalid logo file', () => {
    expect(() => logoMarkup('not svg')).toThrow('Logo SVG is not valid');
  });

  it('renders the bundled logo to a PNG once and caches it', () => {
    const png = getWelcomeBannerPng();
    expect([...png.slice(0, 4)]).toEqual([137, 80, 78, 71]);
    expect(getWelcomeBannerPng()).toBe(png);
    expect(getLinksBannerPng()).not.toBe(png);
  });
});
