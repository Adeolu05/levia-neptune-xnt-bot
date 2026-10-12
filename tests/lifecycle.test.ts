import { describe, expect, it, vi } from 'vitest';
import {
  createShutdownHandler,
  isPollingConflict,
  startPollingWithRetry,
} from '../src/lifecycle.js';
import type { Logger } from '../src/logger.js';

function logger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('createShutdownHandler', () => {
  it('stops the bot once and logs the lifecycle', async () => {
    const bot = { stop: vi.fn().mockResolvedValue(undefined) };
    const log = logger();
    const stop = createShutdownHandler(bot, log);

    await Promise.all([stop('SIGINT'), stop('SIGTERM')]);

    expect(bot.stop).toHaveBeenCalledOnce();
    expect(log.info).toHaveBeenNthCalledWith(1, 'Stopping bot', { signal: 'SIGINT' });
    expect(log.info).toHaveBeenNthCalledWith(2, 'Bot stopped');
  });
});

describe('startPollingWithRetry', () => {
  const conflict = Object.assign(new Error('Conflict'), { error_code: 409 });

  it('retries while another instance holds the update stream', async () => {
    const start = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(undefined);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const log = logger();

    await startPollingWithRetry(start, log, { sleep, delayMs: 1 });

    expect(start).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(log.warn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured number of conflicts', async () => {
    const start = vi.fn().mockRejectedValue(conflict);

    await expect(
      startPollingWithRetry(start, logger(), {
        maxConflictRetries: 2,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toBe(conflict);
    expect(start).toHaveBeenCalledTimes(3);
  });

  it('rethrows other errors immediately', async () => {
    const error = Object.assign(new Error('Unauthorized'), { error_code: 401 });
    const start = vi.fn().mockRejectedValue(error);

    await expect(startPollingWithRetry(start, logger())).rejects.toBe(error);
    expect(start).toHaveBeenCalledOnce();
  });

  it('recognizes only 409 as a polling conflict', () => {
    expect(isPollingConflict(conflict)).toBe(true);
    expect(isPollingConflict(new Error('x'))).toBe(false);
    expect(isPollingConflict(null)).toBe(false);
  });
});
