import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('loads and maps valid configuration', () => {
    expect(loadConfig({ TELEGRAM_BOT_TOKEN: 'secret-token' })).toEqual({
      telegramBotToken: 'secret-token',
      logLevel: 'info',
    });
  });

  it('rejects a missing token', () => {
    expect(() => loadConfig({})).toThrow('TELEGRAM_BOT_TOKEN is required');
  });

  it('rejects an invalid log level', () => {
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: 'token', LOG_LEVEL: 'verbose' })).toThrow(
      'Invalid environment configuration',
    );
  });
});
