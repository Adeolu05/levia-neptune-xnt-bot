import type { MarketPrice } from '../market/coingecko.js';
import type { NetworkReport } from '../neptune/network-stats.js';
import type { NetworkOverview } from '../neptune/provider.js';
import {
  baseUnitsToXntNumber,
  formatHashrate,
  formatInteger,
  formatPercentChange,
  formatXnt,
} from '../neptune/units.js';

export type Direction = 'up' | 'down' | 'flat';

const UNAVAILABLE = 'n/a';
const DIRECTION_EMOJI: Record<Direction, string> = { up: '🟢', down: '🔴', flat: '⚪' };

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatUsd(value: number, fractionDigits = value < 1 ? 4 : 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatSignedPercent(value: number): string {
  const rounded = value.toFixed(2);
  if (rounded === '0.00' || rounded === '-0.00') {
    return '0.00%';
  }
  return `${value > 0 ? '+' : ''}${rounded}%`;
}

export function directionOf(text: string): Direction {
  return text.startsWith('+') ? 'up' : text.startsWith('-') ? 'down' : 'flat';
}

export function hashrateChange(current: bigint, previous: bigint | undefined): string | undefined {
  return previous === undefined || previous <= 0n
    ? undefined
    : formatPercentChange(current, previous);
}

function changeLabel(label: string, change: string | undefined): string {
  if (change === undefined) {
    return `${DIRECTION_EMOJI.flat} <b>${label}:</b> ${UNAVAILABLE}`;
  }
  return `${DIRECTION_EMOJI[directionOf(change)]} <b>${label}:</b> ${change}`;
}

export function formatNetworkCaption(report: NetworkReport): string {
  return [
    '⛏️ <b>Neptune Network</b>',
    '',
    `⚡ <b>Hashrate:</b> ${formatHashrate(report.hashrate)}`,
    `${changeLabel('24h', hashrateChange(report.hashrate, report.hashrate24hAgo))}   ${changeLabel('7d', hashrateChange(report.hashrate, report.hashrate7dAgo))}`,
    `🎯 <b>Difficulty:</b> ${formatInteger(report.difficulty)}`,
    `🧱 <b>Block height:</b> ${formatInteger(BigInt(report.height))}`,
    `🪙 <b>Circulating supply:</b> ${formatXnt(report.circulatingSupplyBaseUnits, 2)}`,
    '',
    '<i>Source: NeptuneScan · hashrate is a 144-block average</i>',
  ].join('\n');
}

export function formatMarketCaption(
  price: MarketPrice | undefined,
  overview: NetworkOverview | undefined,
): string {
  const change =
    price?.change24hPercent === undefined ? undefined : formatSignedPercent(price.change24hPercent);
  const marketCap =
    price === undefined || overview === undefined
      ? UNAVAILABLE
      : formatUsd(price.usd * baseUnitsToXntNumber(overview.circulatingSupplyBaseUnits), 0);

  return [
    '💎 <b>XNT Market</b>',
    '',
    `💵 <b>Price:</b> ${price === undefined ? UNAVAILABLE : formatUsd(price.usd)}`,
    changeLabel('24h', change),
    `🪙 <b>Circulating supply:</b> ${overview === undefined ? UNAVAILABLE : formatXnt(overview.circulatingSupplyBaseUnits, 2)}`,
    `🏦 <b>Market cap:</b> ${marketCap}`,
    '',
    '🛒 Buy XNT on the exchanges below. Always check the pair is <b>XNT/USDT</b>.',
    '<i>Price: CoinGecko · Supply: NeptuneScan · Not financial advice</i>',
  ].join('\n');
}
