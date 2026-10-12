import 'dotenv/config';

import { loadConfig } from './config.js';
import { createShutdownHandler, startPollingWithRetry } from './lifecycle.js';
import { createBot, describeError, TELEGRAM_COMMANDS } from './bot/create-bot.js';
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
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: describeError(reason) });
});

try {
  await bot.api.setMyCommands(TELEGRAM_COMMANDS);
  logger.info('Telegram commands registered');
  await startPollingWithRetry(
    () =>
      bot.start({
        onStart: ({ username }) => logger.info('Bot started with long polling', { username }),
      }),
    logger,
  );
} catch (error) {
  logger.error('Bot stopped because of an error', { error: describeError(error) });
  process.exit(1);
}
