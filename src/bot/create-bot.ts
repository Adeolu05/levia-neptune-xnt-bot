import { Bot, type Context } from 'grammy';
import { cached } from '../cache.js';
import { getLinksBannerPng, getWelcomeBannerPng } from '../charts/welcome-banner.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import { CoinGeckoPriceProvider } from '../market/coingecko.js';
import { getNetworkReport, HISTORY_DAYS } from '../neptune/network-stats.js';
import { NeptuneScanProvider } from '../neptune/provider.js';
import {
  createLinksHandler,
  createReplyHandler,
  createStartHandler,
  handleAbout,
  handleHelp,
  handleMining,
} from './commands.js';
import { buildPriceReply, buildStatsReply, renderChartPng, type BotReply } from './replies.js';

export const TELEGRAM_COMMANDS = [
  { command: 'stats', description: 'Hashrate, difficulty and a 7-day chart' },
  { command: 'price', description: 'Price, market cap and where to buy' },
  { command: 'mining', description: 'How to start mining XNT' },
  { command: 'links', description: 'Official ecosystem links' },
  { command: 'help', description: 'Show available commands' },
  { command: 'about', description: 'About this bot' },
  { command: 'start', description: 'Show a welcome message' },
];

/** Complete replies are reused for a few minutes; degraded ones are retried sooner. */
const REPLY_TTL_MS = 3 * 60_000;
const DEGRADED_REPLY_TTL_MS = 20_000;
const replyTtl = (reply: BotReply): number =>
  reply.complete ? REPLY_TTL_MS : DEGRADED_REPLY_TTL_MS;

export function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'UnknownError', message: 'An unknown error occurred' };
}

export function createBot(config: AppConfig, logger: Logger): Bot<Context> {
  const bot = new Bot(config.telegramBotToken);
  const neptune = new NeptuneScanProvider(config.neptuneApiBaseUrl);
  const prices = new CoinGeckoPriceProvider();
  const onRenderError = (chart: string, error: unknown): void =>
    logger.warn('Chart rendering failed', { chart, error: describeError(error) });

  const getStatsReply = cached(
    () => buildStatsReply(() => getNetworkReport(neptune), renderChartPng, onRenderError),
    replyTtl,
  );
  const getPriceReply = cached(
    () =>
      buildPriceReply(
        {
          getPrice: () => prices.getPrice(),
          getOverview: () => neptune.getOverview(),
          getPriceHistory: () => prices.getPriceHistory(HISTORY_DAYS),
        },
        renderChartPng,
        onRenderError,
      ),
    replyTtl,
  );

  const onBannerError = (error: unknown): void =>
    logger.warn('Banner image failed', { error: describeError(error) });

  bot.command('start', createStartHandler(getWelcomeBannerPng, onBannerError));
  bot.command('help', handleHelp);
  bot.command('about', handleAbout);
  bot.command(
    ['stats', 'hashrate'],
    createReplyHandler(getStatsReply, 'I could not load network stats right now.'),
  );
  bot.command(
    ['price', 'marketcap'],
    createReplyHandler(getPriceReply, 'I could not load XNT market data right now.'),
  );
  bot.command('mining', handleMining);
  bot.command('links', createLinksHandler(getLinksBannerPng, onBannerError));

  bot.catch((error) => {
    logger.error('Telegram update failed', {
      error: describeError(error.error),
      updateId: error.ctx.update.update_id,
    });
  });

  return bot;
}
