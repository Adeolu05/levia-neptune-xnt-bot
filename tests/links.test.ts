import { describe, expect, it, vi } from 'vitest';
import { handleLinks } from '../src/bot/commands.js';
import { LINKS_MESSAGE, OFFICIAL_LINKS } from '../src/bot/links.js';

describe('links command', () => {
  it('replies with the resource message and official URL keyboard', async () => {
    const ctx = { reply: vi.fn().mockResolvedValue(undefined) };

    await handleLinks(ctx);

    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(
      LINKS_MESSAGE,
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              { text: 'Website', url: OFFICIAL_LINKS.website.url },
              { text: 'Explorer', url: OFFICIAL_LINKS.explorer.url },
            ],
            [
              { text: 'X', url: OFFICIAL_LINKS.x.url },
              { text: 'Discord', url: OFFICIAL_LINKS.discord.url },
              { text: 'Telegram', url: OFFICIAL_LINKS.telegram.url },
            ],
            [
              { text: 'Reddit', url: OFFICIAL_LINKS.reddit.url },
              { text: 'GitHub', url: OFFICIAL_LINKS.github.url },
              { text: 'Learn', url: OFFICIAL_LINKS.learning.url },
            ],
          ],
        }),
      }),
    );
  });
});
