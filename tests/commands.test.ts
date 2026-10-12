import { describe, expect, it, vi } from 'vitest';
import { handleAbout, handleHelp, handleStart } from '../src/bot/commands.js';
import { START_MESSAGE } from '../src/bot/messages.js';

function context(): { reply: ReturnType<typeof vi.fn> } {
  return { reply: vi.fn().mockResolvedValue(undefined) };
}

describe('command handlers', () => {
  it.each([
    ['/start', handleStart, START_MESSAGE],
    [
      '/help',
      handleHelp,
      [
        'Available commands:',
        '/start - Show a welcome message',
        '/help - Show this help message',
        '/about - Learn about this bot',
        '/block <height> - Look up a block',
        '/links - Show official ecosystem links',
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

  it('/start describes current capabilities without the outdated message', async () => {
    const ctx = context();

    await handleStart(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(START_MESSAGE);
    expect(START_MESSAGE).toContain('block lookups');
    expect(START_MESSAGE).toContain('/help');
    expect(START_MESSAGE).toContain('/links');
    expect(START_MESSAGE).not.toContain('Blockchain statistics are not connected yet.');
  });

  it('/help lists /links', async () => {
    const ctx = context();

    await handleHelp(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('/links - Show official ecosystem links'),
    );
  });
});
