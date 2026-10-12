import 'dotenv/config';

import { loadConfig } from './config.js';
import { createShutdownHandler } from './lifecycle.js';
import { createBot, TELEGRAM_COMMANDS } from './bot/create-bot.js';
import { createLogger } from './logger.js';

const config = loadConfig(process.env);
const logger = createLogger(config.logLevel);
const bot = createBot(config, logger);

const stop = createShutdownHandler(bot, logger);

process.once('SIGINT', () => {
  void stop('SIGINT');
});
process.once('SIGTERM', () => {
  void stop('SIGTERM');
});

await bot.api.setMyCommands(TELEGRAM_COMMANDS);
logger.info('Telegram commands registered');
bot.start({
  onStart: ({ username }) => logger.info('Bot started with long polling', { username }),
});
