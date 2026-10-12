import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('loads and maps valid configuration', () => {
    expect(loadConfig({ TELEGRAM_BOT_TOKEN: 'secret-token' })).toEqual({
      telegramBotToken: 'secret-token',
      neptuneApiBaseUrl: 'https://api.neptunescan.io',
      logLevel: 'info',
    });
  });

  it('loads and normalizes a configured Neptune API base URL', () => {
    expect(
      loadConfig({
        TELEGRAM_BOT_TOKEN: 'secret-token',
        NEPTUNE_API_BASE_URL: 'https://example.test/',
      }).neptuneApiBaseUrl,
    ).toBe('https://example.test');
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
