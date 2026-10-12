import { describe, expect, it, vi } from 'vitest';
import { createLinksHandler } from '../src/bot/commands.js';
import {
  createLinksKeyboard,
  EXCHANGE_LINKS,
  LINKS_MESSAGE,
  OFFICIAL_LINKS,
} from '../src/bot/links.js';

const APPROVED_HOSTS = new Set([
  'neptune.io',
  'neptunescan.io',
  'x.com',
  't.me',
  'discord.com',
  'www.reddit.com',
  'github.com',
  'apps.apple.com',
  'play.google.com',
  'www.mexc.com',
  'safetrade.com',
  'www.coingecko.com',
]);

describe('links command', () => {
  it('sends the resources banner with a grouped caption and two buttons per row', async () => {
    const ctx = {
      reply: vi.fn(),
      replyWithPhoto: vi.fn().mockResolvedValue({ photo: [{ file_id: 'id' }] }),
    };

    await createLinksHandler(() => new Uint8Array([137, 80, 78, 71]))(ctx as never);

    expect(ctx.replyWithPhoto).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expect.objectContaining({ caption: LINKS_MESSAGE, parse_mode: 'HTML' }),
    );
    const keyboard = createLinksKeyboard().inline_keyboard;
    expect(keyboard.map((row) => row.length)).toEqual([2, 2, 2, 2, 2, 1]);
    expect(keyboard.flat()).toHaveLength(Object.keys(OFFICIAL_LINKS).length);
  });

  it('falls back to a text message with the same buttons', async () => {
    const ctx = { reply: vi.fn(), replyWithPhoto: vi.fn().mockRejectedValue(new Error('fail')) };

    await createLinksHandler(() => new Uint8Array())(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith(
      LINKS_MESSAGE,
      expect.objectContaining({ parse_mode: 'HTML', reply_markup: expect.anything() }),
    );
  });

  it('only links to HTTPS URLs on approved official hosts', () => {
    for (const { url } of [...Object.values(OFFICIAL_LINKS), ...Object.values(EXCHANGE_LINKS)]) {
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('https:');
      expect(APPROVED_HOSTS.has(parsed.hostname)).toBe(true);
    }
  });
});
