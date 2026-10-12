import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('logger', () => {
  it('redacts sensitive context values', () => {
    const write = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    createLogger('info', write).info('received update', {
      token: 'secret',
      nested: { authorization: 'Bearer secret' },
      safe: 'visible',
    });

    const output = write.info.mock.calls[0]?.[0] as string;
    expect(output).not.toContain('secret');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('visible');
  });

  it('filters messages below the configured level', () => {
    const write = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    createLogger('warn', write).info('ignored');
    createLogger('warn', write).warn('kept');
    expect(write.info).not.toHaveBeenCalled();
    expect(write.warn).toHaveBeenCalledOnce();
  });
});
