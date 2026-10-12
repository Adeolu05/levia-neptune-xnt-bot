import { describe, expect, it, vi } from 'vitest';
import { handleAbout, handleHelp, handleStart } from '../src/bot/commands.js';

function context(): { reply: ReturnType<typeof vi.fn> } {
  return { reply: vi.fn().mockResolvedValue(undefined) };
}

describe('command handlers', () => {
  it.each([
    [
      '/start',
      handleStart,
      'Welcome to the Neptune Privacy community bot. Blockchain statistics are not connected yet.',
    ],
    [
      '/help',
      handleHelp,
      [
        'Available commands:',
        '/start - Show a welcome message',
        '/help - Show this help message',
        '/about - Learn about this bot',
      ].join('\n'),
    ],
    [
      '/about',
      handleAbout,
      [
        'This open-source bot is being built for the Neptune Privacy ecosystem.',
        'Live blockchain data will only be added after its sources and network identity are verified.',
      ].join('\n'),
    ],
  ])('%s replies with its exact message', async (_command, handler, message) => {
    const ctx = context();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(message);
  });
});
