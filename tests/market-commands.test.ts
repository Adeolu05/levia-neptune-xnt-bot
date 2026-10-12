import { InlineKeyboard } from 'grammy';
import { describe, expect, it, vi } from 'vitest';
import { createReplyHandler, handleMining } from '../src/bot/commands.js';
import { EXCHANGE_LINKS, MINING_LINKS } from '../src/bot/links.js';
import { MINING_MESSAGE } from '../src/bot/messages.js';
import { buildPriceReply, buildStatsReply, type BotReply } from '../src/bot/replies.js';
import { formatMarketCaption, formatNetworkCaption } from '../src/bot/reports.js';
import type { NetworkReport } from '../src/neptune/network-stats.js';
import type { NetworkOverview } from '../src/neptune/provider.js';

const SUPPLY = 2504042784368000000000000000000000000n;
const OVERVIEW: NetworkOverview = {
  height: 92051,
  difficulty: 271865533734n,
  circulatingSupplyBaseUnits: SUPPLY,
  averageBlockTimeSeconds: 315.2028,
};
const REPORT: NetworkReport = {
  height: 92051,
  difficulty: 271865533734n,
  circulatingSupplyBaseUnits: SUPPLY,
  hashrate: 1147871355n,
  hashrate24hAgo: 1330253150n,
  hashrate7dAgo: 964924625n,
  history: [
    { height: 90000, timeMs: 1_000, hashrate: 964924625n },
    { height: 92051, timeMs: 2_000, hashrate: 1147871355n },
  ],
};
const PRICE = { usd: 0.654119, change24hPercent: 50.75279442957521 };
const HISTORY = [
  { timeMs: 1_000, usd: 0.28842 },
  { timeMs: 2_000, usd: 0.64207 },
];
const PNG = new Uint8Array([137, 80, 78, 71]);

function context() {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    replyWithPhoto: vi.fn().mockResolvedValue(undefined),
  };
}

describe('captions', () => {
  it('formats network stats as Telegram HTML', () => {
    expect(formatNetworkCaption(REPORT)).toBe(
      [
        '⛏️ <b>Neptune Network</b>',
        '',
        '⚡ <b>Hashrate:</b> 1.15 GH/s',
        '🔴 <b>24h:</b> -13.71%   🟢 <b>7d:</b> +18.96%',
        '🎯 <b>Difficulty:</b> 271,865,533,734',
        '🧱 <b>Block height:</b> 92,051',
        '🪙 <b>Circulating supply:</b> 2,504,042.78 XNT',
        '',
        '<i>Source: NeptuneScan · hashrate is a 144-block average</i>',
      ].join('\n'),
    );
  });

  it('marks missing comparisons as n/a', () => {
    const caption = formatNetworkCaption({
      ...REPORT,
      hashrate24hAgo: undefined,
      hashrate7dAgo: undefined,
    });
    expect(caption).toContain('⚪ <b>24h:</b> n/a   ⚪ <b>7d:</b> n/a');
  });

  it('formats price, supply and market cap together', () => {
    expect(formatMarketCaption(PRICE, OVERVIEW)).toBe(
      [
        '💎 <b>XNT Market</b>',
        '',
        '💵 <b>Price:</b> $0.6541',
        '🟢 <b>24h:</b> +50.75%',
        '🪙 <b>Circulating supply:</b> 2,504,042.78 XNT',
        '🏦 <b>Market cap:</b> $1,637,942',
        '',
        '🛒 Buy XNT on the exchanges below. Always check the pair is <b>XNT/USDT</b>.',
        '<i>Price: CoinGecko · Supply: NeptuneScan · Not financial advice</i>',
      ].join('\n'),
    );
  });
});

describe('buildStatsReply', () => {
  it('attaches a hashrate chart and an explorer button', async () => {
    const render = vi.fn().mockReturnValue(PNG);
    const reply = await buildStatsReply(() => Promise.resolve(REPORT), render);

    expect(reply.photo).toBe(PNG);
    expect(reply.complete).toBe(true);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '1.15 GH/s',
        change: { text: '+18.96% 7D', direction: 'up' },
      }),
    );
  });

  it('falls back to text when rendering fails', async () => {
    const onError = vi.fn();
    const reply = await buildStatsReply(
      () => Promise.resolve(REPORT),
      () => {
        throw new Error('no font');
      },
      onError,
    );

    expect(reply.photo).toBeUndefined();
    expect(reply.complete).toBe(false);
    expect(onError).toHaveBeenCalledWith('hashrate', expect.any(Error));
  });
});

describe('buildPriceReply', () => {
  const sources = {
    getPrice: () => Promise.resolve(PRICE),
    getOverview: () => Promise.resolve(OVERVIEW),
    getPriceHistory: () => Promise.resolve(HISTORY),
  };

  it('renders a green chart for a rising 7-day price and adds exchange buttons', async () => {
    const render = vi.fn().mockReturnValue(PNG);
    const reply = await buildPriceReply(sources, render);

    expect(reply.photo).toBe(PNG);
    expect(reply.complete).toBe(true);
    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        value: '$0.6541',
        accent: '#34d399',
        change: { text: '+122.62% 7D', direction: 'up' },
      }),
    );
    expect(reply.keyboard?.inline_keyboard).toEqual([
      [
        { text: EXCHANGE_LINKS.mexc.label, url: EXCHANGE_LINKS.mexc.url },
        { text: EXCHANGE_LINKS.safeTrade.label, url: EXCHANGE_LINKS.safeTrade.url },
      ],
      [{ text: EXCHANGE_LINKS.coinGecko.label, url: EXCHANGE_LINKS.coinGecko.url }],
    ]);
  });

  it('still shows supply and the chart when the spot price fails', async () => {
    const reply = await buildPriceReply(
      { ...sources, getPrice: () => Promise.reject(new Error('429')) },
      () => PNG,
    );

    expect(reply.text).toContain('💵 <b>Price:</b> n/a');
    expect(reply.text).toContain('2,504,042.78 XNT');
    expect(reply.text).toContain('🏦 <b>Market cap:</b> n/a');
    expect(reply.complete).toBe(false);
  });

  it('sends text only when the price history fails', async () => {
    const render = vi.fn();
    const reply = await buildPriceReply(
      { ...sources, getPriceHistory: () => Promise.reject(new Error('down')) },
      render,
    );

    expect(reply.photo).toBeUndefined();
    expect(render).not.toHaveBeenCalled();
    expect(reply.text).toContain('$1,637,942');
  });

  it('fails when both price and supply are unavailable', async () => {
    const error = new Error('price down');
    await expect(
      buildPriceReply(
        {
          ...sources,
          getPrice: () => Promise.reject(error),
          getOverview: () => Promise.reject(new Error('explorer down')),
        },
        () => PNG,
      ),
    ).rejects.toBe(error);
  });
});

describe('createReplyHandler', () => {
  const keyboard = new InlineKeyboard().url('Explorer', 'https://neptunescan.io/');

  it('sends a chart as a photo with an HTML caption', async () => {
    const ctx = context();
    const reply: BotReply = { text: '<b>hi</b>', photo: PNG, keyboard, complete: true };

    await createReplyHandler(() => Promise.resolve(reply), 'Failed.')(ctx as never);

    expect(ctx.replyWithPhoto).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      caption: '<b>hi</b>',
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('sends text when there is no chart', async () => {
    const ctx = context();
    await createReplyHandler(
      () => Promise.resolve({ text: '<b>hi</b>', complete: false }),
      'Failed.',
    )(ctx as never);

    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith('<b>hi</b>', {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  });

  it('replies with a retry message and rethrows on failure', async () => {
    const ctx = context();
    const error = new Error('down');

    await expect(
      createReplyHandler(
        () => Promise.reject(error),
        'I could not load network stats right now.',
      )(ctx as never),
    ).rejects.toBe(error);
    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(
      'I could not load network stats right now. Please try again shortly.',
    );
  });
});

describe('/mining', () => {
  it('explains mining and links to the miner and node repositories', async () => {
    const ctx = context();
    await handleMining(ctx as never);

    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(
      MINING_MESSAGE,
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              { text: 'Start mining', url: MINING_LINKS.miner.url },
              { text: 'xnt-core node', url: MINING_LINKS.node.url },
            ],
          ],
        }),
      }),
    );
  });
});
