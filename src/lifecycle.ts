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

/** Telegram answers 409 when another process is already long polling with the same token. */
export function isPollingConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error_code' in error &&
    (error as { error_code: unknown }).error_code === 409
  );
}

export type PollingRetryOptions = {
  maxConflictRetries?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Starts long polling, waiting and retrying while another instance still holds
 * the update stream. This covers the few seconds during a redeploy when the old
 * and new containers overlap. Any other error, or a conflict that outlasts the
 * retries, is rethrown so the process exits and the host restarts it.
 */
export async function startPollingWithRetry(
  start: () => Promise<void>,
  logger: Logger,
  {
    maxConflictRetries = 12,
    delayMs = 5_000,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: PollingRetryOptions = {},
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await start();
      return;
    } catch (error) {
      if (!isPollingConflict(error) || attempt > maxConflictRetries) {
        throw error;
      }
      logger.warn('Another instance is still polling; retrying', {
        attempt,
        maxConflictRetries,
      });
      await sleep(delayMs);
    }
  }
}
