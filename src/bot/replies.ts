import type { InlineKeyboard } from 'grammy';
import { renderLineChartSvg, type LineChartOptions } from '../charts/line-chart.js';
import { svgToPng } from '../charts/render.js';
import type { MarketPrice, PricePoint } from '../market/coingecko.js';
import { HISTORY_DAYS, type NetworkReport } from '../neptune/network-stats.js';
import type { NetworkOverview } from '../neptune/provider.js';
import { formatHashrate, hashrateScale } from '../neptune/units.js';
import { createMarketKeyboard, createStatsKeyboard } from './links.js';
import {
  directionOf,
  formatMarketCaption,
  formatNetworkCaption,
  formatSignedPercent,
  formatUsd,
  hashrateChange,
} from './reports.js';

export type BotReply = {
  /** Telegram HTML. Used as the photo caption when a chart is attached. */
  text: string;
  photo?: Uint8Array | undefined;
  keyboard?: InlineKeyboard | undefined;
  /** False when some data or the chart was unavailable. */
  complete: boolean;
};

export type ChartRenderer = (options: LineChartOptions) => Uint8Array;
export type RenderErrorHandler = (chart: string, error: unknown) => void;

export const renderChartPng: ChartRenderer = (options) => svgToPng(renderLineChartSvg(options));

const HASHRATE_ACCENT = '#8b8cf8';
const UP_ACCENT = '#34d399';
const DOWN_ACCENT = '#f87171';
const FOOTER_RIGHT = 'Levia · Neptune Privacy';

function tryRender(
  render: ChartRenderer,
  options: LineChartOptions,
  chart: string,
  onError?: RenderErrorHandler,
): Uint8Array | undefined {
  try {
    return render(options);
  } catch (error) {
    onError?.(chart, error);
    return undefined;
  }
}

export function hashrateChartOptions(report: NetworkReport): LineChartOptions {
  const change = hashrateChange(report.hashrate, report.hashrate7dAgo);
  const peak = report.history.reduce(
    (max, point) => (point.hashrate > max ? point.hashrate : max),
    report.hashrate,
  );
  const { divisor, unit } = hashrateScale(peak);
  return {
    title: `NEPTUNE NETWORK HASHRATE · ${HISTORY_DAYS}D`,
    value: formatHashrate(report.hashrate),
    change:
      change === undefined ? undefined : { text: `${change} 7D`, direction: directionOf(change) },
    points: report.history.map((point) => ({
      timeMs: point.timeMs,
      value: Number(point.hashrate),
    })),
    formatAxisValue: (value) => `${(value / Number(divisor)).toFixed(2)} ${unit}`,
    accent: HASHRATE_ACCENT,
    footerLeft: 'Source: NeptuneScan · 144-block rolling average',
    footerRight: FOOTER_RIGHT,
  };
}

export function priceChartOptions(
  price: MarketPrice | undefined,
  history: PricePoint[],
): LineChartOptions {
  const first = history[0] as PricePoint;
  const last = history.at(-1) as PricePoint;
  const change = formatSignedPercent(((last.usd - first.usd) / first.usd) * 100);
  const direction = directionOf(change);
  return {
    title: `XNT / USD · ${HISTORY_DAYS}D`,
    value: formatUsd(price?.usd ?? last.usd),
    change: { text: `${change} 7D`, direction },
    points: history.map((point) => ({ timeMs: point.timeMs, value: point.usd })),
    formatAxisValue: (value) => formatUsd(value, value >= 0.1 ? 2 : 4),
    accent: direction === 'down' ? DOWN_ACCENT : UP_ACCENT,
    footerLeft: 'Source: CoinGecko · hourly prices',
    footerRight: FOOTER_RIGHT,
  };
}

export async function buildStatsReply(
  getReport: () => Promise<NetworkReport>,
  render: ChartRenderer = renderChartPng,
  onRenderError?: RenderErrorHandler,
): Promise<BotReply> {
  const report = await getReport();
  const photo =
    report.history.length >= 2
      ? tryRender(render, hashrateChartOptions(report), 'hashrate', onRenderError)
      : undefined;
  return {
    text: formatNetworkCaption(report),
    photo,
    keyboard: createStatsKeyboard(),
    complete:
      photo !== undefined &&
      report.hashrate24hAgo !== undefined &&
      report.hashrate7dAgo !== undefined,
  };
}

export type MarketSources = {
  getPrice: () => Promise<MarketPrice>;
  getOverview: () => Promise<NetworkOverview>;
  getPriceHistory: () => Promise<PricePoint[]>;
};

/**
 * Price, circulating supply and market cap with a 7-day price chart. Each
 * source may fail independently; only a failure of both price and supply is
 * an error.
 */
export async function buildPriceReply(
  sources: MarketSources,
  render: ChartRenderer = renderChartPng,
  onRenderError?: RenderErrorHandler,
): Promise<BotReply> {
  const [price, overview, history] = await Promise.allSettled([
    sources.getPrice(),
    sources.getOverview(),
    sources.getPriceHistory(),
  ]);
  if (price.status === 'rejected' && overview.status === 'rejected') {
    throw price.reason;
  }

  const priceValue = price.status === 'fulfilled' ? price.value : undefined;
  const photo =
    history.status === 'fulfilled' && history.value.length >= 2
      ? tryRender(render, priceChartOptions(priceValue, history.value), 'price', onRenderError)
      : undefined;

  return {
    text: formatMarketCaption(
      priceValue,
      overview.status === 'fulfilled' ? overview.value : undefined,
    ),
    photo,
    keyboard: createMarketKeyboard(),
    complete:
      price.status === 'fulfilled' && overview.status === 'fulfilled' && photo !== undefined,
  };
}
