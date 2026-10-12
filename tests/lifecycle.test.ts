import { describe, expect, it, vi } from 'vitest';
import { createShutdownHandler } from '../src/lifecycle.js';
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
