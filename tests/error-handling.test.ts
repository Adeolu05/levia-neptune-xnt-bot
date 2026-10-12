import { describe, expect, it } from 'vitest';
import { describeError } from '../src/bot/create-bot.js';

describe('describeError', () => {
  it('describes Error instances without exposing unrelated values', () => {
    expect(describeError(new Error('failed'))).toEqual({
      name: 'Error',
      message: 'failed',
    });
  });

  it('normalizes unknown thrown values', () => {
    expect(describeError({ token: 'secret' })).toEqual({
      name: 'UnknownError',
      message: 'An unknown error occurred',
    });
  });
});
