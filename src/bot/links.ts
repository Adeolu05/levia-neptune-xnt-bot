import { InlineKeyboard } from 'grammy';

export const OFFICIAL_LINKS = {
  website: {
    label: 'Website',
    url: 'https://neptune.io/',
  },
  explorer: {
    label: 'Explorer',
    url: 'https://neptunescan.io/',
  },
  x: {
    label: 'X',
    url: 'https://x.com/NeptunePrivacy',
  },
  discord: {
    label: 'Discord',
    url: 'https://discord.com/invite/neptuneprivacy',
  },
  telegram: {
    label: 'Telegram',
    url: 'https://t.me/neptuneprivacy',
  },
  reddit: {
    label: 'Reddit',
    url: 'https://www.reddit.com/r/neptuneprivacy/',
  },
  github: {
    label: 'GitHub',
    url: 'https://github.com/neptuneprivacy',
  },
  learning: {
    label: 'Learn',
    url: 'https://neptune.io/learn',
  },
} as const;

export const LINKS_MESSAGE = [
  '🔗 <b>Official Neptune Privacy resources</b>',
  '',
  '🛡️ Only trust links from neptune.io or the buttons below. Never share your seed phrase with anyone.',
].join('\n');

export function createLinksKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url(OFFICIAL_LINKS.website.label, OFFICIAL_LINKS.website.url)
    .url(OFFICIAL_LINKS.explorer.label, OFFICIAL_LINKS.explorer.url)
    .row()
    .url(OFFICIAL_LINKS.x.label, OFFICIAL_LINKS.x.url)
    .url(OFFICIAL_LINKS.discord.label, OFFICIAL_LINKS.discord.url)
    .url(OFFICIAL_LINKS.telegram.label, OFFICIAL_LINKS.telegram.url)
    .row()
    .url(OFFICIAL_LINKS.reddit.label, OFFICIAL_LINKS.reddit.url)
    .url(OFFICIAL_LINKS.github.label, OFFICIAL_LINKS.github.url)
    .url(OFFICIAL_LINKS.learning.label, OFFICIAL_LINKS.learning.url);
}

export const MINING_LINKS = {
  miner: {
    label: 'Start mining',
    url: 'https://github.com/neptuneprivacy/xnt-gpu-miner',
  },
  node: {
    label: 'xnt-core node',
    url: 'https://github.com/neptuneprivacy/xnt-core',
  },
} as const;

export function createMiningKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url(MINING_LINKS.miner.label, MINING_LINKS.miner.url)
    .url(MINING_LINKS.node.label, MINING_LINKS.node.url);
}

/**
 * Exchanges listing XNT, from CoinGecko's `neptune-privacy` tickers on
 * 2026-10-12 (both XNT/USDT, neither flagged stale or anomalous).
 */
export const EXCHANGE_LINKS = {
  mexc: {
    label: 'Buy on MEXC',
    url: 'https://www.mexc.com/exchange/XNT_USDT',
  },
  safeTrade: {
    label: 'Buy on SafeTrade',
    url: 'https://safetrade.com/exchange/XNT-USDT',
  },
  coinGecko: {
    label: 'CoinGecko',
    url: 'https://www.coingecko.com/en/coins/neptune-privacy',
  },
} as const;

export function createMarketKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url(EXCHANGE_LINKS.mexc.label, EXCHANGE_LINKS.mexc.url)
    .url(EXCHANGE_LINKS.safeTrade.label, EXCHANGE_LINKS.safeTrade.url)
    .row()
    .url(EXCHANGE_LINKS.coinGecko.label, EXCHANGE_LINKS.coinGecko.url);
}

export function createStatsKeyboard(): InlineKeyboard {
  return new InlineKeyboard().url(OFFICIAL_LINKS.explorer.label, OFFICIAL_LINKS.explorer.url);
}
