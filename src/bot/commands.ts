import { InputFile, type Context } from 'grammy';
import { createLinksKeyboard, createMiningKeyboard, LINKS_MESSAGE } from './links.js';
import { ABOUT_MESSAGE, HELP_MESSAGE, MINING_MESSAGE, START_MESSAGE } from './messages.js';
import type { BotReply } from './replies.js';

/**
 * /start sends the Levia welcome banner with the welcome text as its caption.
 * After the first upload, Telegram's file_id is reused so the image is not
 * re-uploaded. If the banner cannot be rendered or sent, the text is sent alone.
 */
export function createStartHandler(
  getBanner: () => Uint8Array,
  onBannerError?: (error: unknown) => void,
) {
  let fileId: string | undefined;

  return async (ctx: Context): Promise<void> => {
    try {
      const photo = fileId ?? new InputFile(getBanner(), 'levia-welcome.png');
      const message = await ctx.replyWithPhoto(photo, {
        caption: START_MESSAGE,
        parse_mode: 'HTML',
      });
      fileId ??= message.photo?.at(-1)?.file_id;
      return;
    } catch (error) {
      fileId = undefined;
      onBannerError?.(error);
    }
    await ctx.reply(START_MESSAGE, { parse_mode: 'HTML' });
  };
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(HELP_MESSAGE, { parse_mode: 'HTML' });
}

export async function handleAbout(ctx: Context): Promise<void> {
  await ctx.reply(ABOUT_MESSAGE, { parse_mode: 'HTML' });
}

export async function handleLinks(ctx: Context): Promise<void> {
  await ctx.reply(LINKS_MESSAGE, { parse_mode: 'HTML', reply_markup: createLinksKeyboard() });
}

export async function handleMining(ctx: Context): Promise<void> {
  await ctx.reply(MINING_MESSAGE, {
    parse_mode: 'HTML',
    reply_markup: createMiningKeyboard(),
    link_preview_options: { is_disabled: true },
  });
}

/**
 * Sends a built reply as a chart photo with an HTML caption, or as a text
 * message when no chart is available. On failure the user gets a short retry
 * message and the error is rethrown for structured logging.
 */
export function createReplyHandler(build: () => Promise<BotReply>, failureMessage: string) {
  return async (ctx: Context): Promise<void> => {
    let reply: BotReply;
    try {
      reply = await build();
    } catch (error) {
      await ctx.reply(`${failureMessage} Please try again shortly.`);
      throw error;
    }

    const markup = reply.keyboard === undefined ? {} : { reply_markup: reply.keyboard };
    if (reply.photo !== undefined) {
      await ctx.replyWithPhoto(new InputFile(reply.photo, 'levia-chart.png'), {
        caption: reply.text,
        parse_mode: 'HTML',
        ...markup,
      });
      return;
    }
    await ctx.reply(reply.text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...markup,
    });
  };
}
