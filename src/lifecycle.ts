import type { Logger } from './logger.js';

export type StoppableBot = {
  stop(): Promise<void>;
};

export function createShutdownHandler(
  bot: StoppableBot,
  logger: Logger,
): (signal: string) => Promise<void> {
  let stopping = false;

  return async (signal: string): Promise<void> => {
    if (stopping) {
      return;
    }
    stopping = true;
    logger.info('Stopping bot', { signal });
    await bot.stop();
    logger.info('Bot stopped');
  };
}
