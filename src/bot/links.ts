import { InlineKeyboard } from 'grammy';

/**
 * Official links, each matching the footer and app links on https://neptune.io/
 * (checked 2026-10-12).
 */
export const OFFICIAL_LINKS = {
  website: { label: '🌐 Website', url: 'https://neptune.io/' },
  explorer: { label: '🔍 Explorer', url: 'https://neptunescan.io/' },
  learning: { label: '📚 Learn', url: 'https://neptune.io/learn' },
  news: { label: '📰 News', url: 'https://neptune.io/news-blogs' },
  iosWallet: {
    label: '📱 iOS Wallet',
    url: 'https://apps.apple.com/bh/app/neptune-wallet-xnt/id6756867288',
  },
  androidWallet: {
    label: '🤖 Android Wallet',
    url: 'https://play.google.com/store/apps/details?id=com.xnt.wallet&hl=en-US',
  },
  x: { label: '𝕏 X', url: 'https://x.com/NeptunePrivacy' },
  telegram: { label: '✈️ Telegram', url: 'https://t.me/neptuneprivacy' },
  discord: { label: '💬 Discord', url: 'https://discord.com/invite/neptuneprivacy' },
  reddit: { label: '👽 Reddit', url: 'https://www.reddit.com/r/neptuneprivacy/' },
  github: { label: '💻 GitHub', url: 'https://github.com/neptuneprivacy' },
} as const;

export const LINKS_MESSAGE = [
  '🔗 <b>Official Neptune Privacy Links</b>',
  '',
  '🌐 <b>Explore</b> · website, explorer, guides and news',
  '📱 <b>Wallet</b> · Neptune Wallet for iOS and Android',
  '💬 <b>Community</b> · X, Telegram, Discord and Reddit',
  '💻 <b>Build</b> · open-source code on GitHub',
  '',
  '🛡️ Only trust links from neptune.io or the buttons below. Never share your seed phrase with anyone.',
].join('\n');

/** Two buttons per row so labels stay readable on phones. */
export function createLinksKeyboard(): InlineKeyboard {
  const rows: (keyof typeof OFFICIAL_LINKS)[][] = [
    ['website', 'explorer'],
    ['learning', 'news'],
    ['iosWallet', 'androidWallet'],
    ['x', 'telegram'],
    ['discord', 'reddit'],
    ['github'],
  ];
  const keyboard = new InlineKeyboard();
  rows.forEach((row, index) => {
    if (index > 0) {
      keyboard.row();
    }
    for (const key of row) {
      keyboard.url(OFFICIAL_LINKS[key].label, OFFICIAL_LINKS[key].url);
    }
  });
  return keyboard;
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
 * Exchanges listing XNT/USDT. Both appear on https://neptune.io/ and in
 * CoinGecko's `neptune-privacy` tickers (checked 2026-10-12).
 */
export const EXCHANGE_LINKS = {
  mexc: {
    label: 'Buy on MEXC',
    url: 'https://www.mexc.com/exchange/XNT_USDT',
  },
  safeTrade: {
    label: 'Buy on SafeTrade',
    url: 'https://safetrade.com/exchange/XNT-USDT?type=basic',
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
