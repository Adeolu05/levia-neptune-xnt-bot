import { describe, expect, it, vi } from 'vitest';
import { createStartHandler, handleAbout, handleHelp } from '../src/bot/commands.js';
import { ABOUT_MESSAGE, HELP_MESSAGE, START_MESSAGE } from '../src/bot/messages.js';
import { TELEGRAM_COMMANDS } from '../src/bot/create-bot.js';
import { LINKS_MESSAGE } from '../src/bot/links.js';
import { MINING_MESSAGE } from '../src/bot/messages.js';
import { formatMarketCaption, formatNetworkCaption } from '../src/bot/reports.js';

function context(): { reply: ReturnType<typeof vi.fn> } {
  return { reply: vi.fn().mockResolvedValue(undefined) };
}

describe('static command handlers', () => {
  it.each([
    ['/help', handleHelp, HELP_MESSAGE],
    ['/about', handleAbout, ABOUT_MESSAGE],
  ])('%s replies with HTML formatting', async (_command, handler, message) => {
    const ctx = context();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(message, { parse_mode: 'HTML' });
  });

  it('/help lists every public command and no longer lists /block', () => {
    for (const command of ['/hashrate', '/price', '/mining', '/links', '/about', '/help']) {
      expect(HELP_MESSAGE).toContain(command);
    }
    expect(HELP_MESSAGE).not.toContain('/block');
    expect(START_MESSAGE).not.toContain('/block');
  });

  it('registers the Telegram menu without /block', () => {
    const commands = TELEGRAM_COMMANDS.map((entry) => entry.command);
    expect(commands).toEqual(['hashrate', 'price', 'mining', 'links', 'help', 'about', 'start']);
  });

  it('keeps static HTML messages free of unescaped angle brackets outside tags', () => {
    for (const message of [START_MESSAGE, HELP_MESSAGE, ABOUT_MESSAGE]) {
      expect(message.replace(/<\/?[bi]>/g, '')).not.toMatch(/[<>]/);
    }
  });

  it('/start sends the welcome banner with the welcome caption, then reuses file_id', async () => {
    const banner = new Uint8Array([137, 80, 78, 71]);
    const getBanner = vi.fn().mockReturnValue(banner);
    const ctx = {
      reply: vi.fn(),
      replyWithPhoto: vi
        .fn()
        .mockResolvedValue({ photo: [{ file_id: 'small' }, { file_id: 'large' }] }),
    };
    const handler = createStartHandler(getBanner);

    await handler(ctx as never);
    await handler(ctx as never);

    expect(ctx.replyWithPhoto).toHaveBeenNthCalledWith(1, expect.anything(), {
      caption: START_MESSAGE,
      parse_mode: 'HTML',
    });
    expect(ctx.replyWithPhoto).toHaveBeenNthCalledWith(2, 'large', expect.anything());
    expect(getBanner).toHaveBeenCalledOnce();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('/start falls back to text when the banner fails', async () => {
    const onError = vi.fn();
    const ctx = { reply: vi.fn(), replyWithPhoto: vi.fn() };
    const handler = createStartHandler(() => {
      throw new Error('render failed');
    }, onError);

    await handler(ctx as never);

    expect(ctx.reply).toHaveBeenCalledExactlyOnceWith(START_MESSAGE, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('uses no em or en dashes in any user-facing message', () => {
    const captions = [
      formatMarketCaption(undefined, undefined),
      formatMarketCaption({ usd: 1, change24hPercent: 1 }, undefined, '+1.00%'),
      formatNetworkCaption({
        height: 1,
        difficulty: 1n,
        hashrate: 1n,
        history: [],
      }),
    ];
    for (const message of [
      START_MESSAGE,
      HELP_MESSAGE,
      ABOUT_MESSAGE,
      MINING_MESSAGE,
      LINKS_MESSAGE,
      ...captions,
    ]) {
      expect(message).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('/about no longer carries a financial-advice disclaimer', () => {
    expect(ABOUT_MESSAGE).not.toMatch(/financial advice/i);
  });

  it('/hashrate does not repeat circulating supply (it is shown by /price)', () => {
    const caption = formatNetworkCaption({ height: 1, difficulty: 1n, hashrate: 1n, history: [] });
    expect(caption).not.toMatch(/supply/i);
    expect(HELP_MESSAGE).toContain('/price · XNT price, supply');
  });

  it('shows /hashrate, not /stats, in user-facing command lists', () => {
    for (const message of [START_MESSAGE, HELP_MESSAGE]) {
      expect(message).toContain('/hashrate');
      expect(message).not.toContain('/stats');
    }
  });
});
