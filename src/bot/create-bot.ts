import { Bot, type Context } from 'grammy';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import { NeptuneScanProvider } from '../neptune/provider.js';
import {
  createBlockHandler,
  handleAbout,
  handleHelp,
  handleLinks,
  handleStart,
} from './commands.js';

export const TELEGRAM_COMMANDS = [
  { command: 'start', description: 'Show a welcome message' },
  { command: 'help', description: 'Show available commands' },
  { command: 'about', description: 'Learn about this bot' },
  { command: 'block', description: 'Look up a block by height' },
  { command: 'links', description: 'Show official ecosystem links' },
];

export function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'UnknownError', message: 'An unknown error occurred' };
}

export function createBot(config: AppConfig, logger: Logger): Bot<Context> {
  const bot = new Bot(config.telegramBotToken);

  bot.command('start', handleStart);
  bot.command('help', handleHelp);
  bot.command('about', handleAbout);
  bot.command('block', createBlockHandler(new NeptuneScanProvider(config.neptuneApiBaseUrl)));
  bot.command('links', handleLinks);

  bot.catch((error) => {
    logger.error('Telegram update failed', {
      error: describeError(error.error),
      updateId: error.ctx.update.update_id,
    });
  });

  return bot;
}
