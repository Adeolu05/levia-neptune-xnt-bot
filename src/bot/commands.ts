import { InputFile, type Context, type InlineKeyboard } from 'grammy';
import { createLinksKeyboard, createMiningKeyboard, LINKS_MESSAGE } from './links.js';
import { ABOUT_MESSAGE, HELP_MESSAGE, MINING_MESSAGE, START_MESSAGE } from './messages.js';
import type { BotReply } from './replies.js';

export type PhotoCard = {
  getImage: () => Uint8Array;
  caption: string;
  filename: string;
  keyboard?: () => InlineKeyboard;
};

/**
 * Sends a static image card with an HTML caption. After the first upload,
 * Telegram's file_id is reused so the image is not re-uploaded. If the image
 * cannot be rendered or sent, the caption is sent as text instead.
 */
export function createPhotoCardHandler(card: PhotoCard, onImageError?: (error: unknown) => void) {
  let fileId: string | undefined;

  return async (ctx: Context): Promise<void> => {
    const markup = card.keyboard === undefined ? {} : { reply_markup: card.keyboard() };
    try {
      const photo = fileId ?? new InputFile(card.getImage(), card.filename);
      const message = await ctx.replyWithPhoto(photo, {
        caption: card.caption,
        parse_mode: 'HTML',
        ...markup,
      });
      fileId ??= message.photo?.at(-1)?.file_id;
      return;
    } catch (error) {
      fileId = undefined;
      onImageError?.(error);
    }
    await ctx.reply(card.caption, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...markup,
    });
  };
}

/** /start: the Levia welcome banner with the welcome text as its caption. */
export function createStartHandler(
  getBanner: () => Uint8Array,
  onBannerError?: (error: unknown) => void,
) {
  return createPhotoCardHandler(
    { getImage: getBanner, caption: START_MESSAGE, filename: 'levia-welcome.png' },
    onBannerError,
  );
}

/** /links: the resources banner, a grouped caption and official link buttons. */
export function createLinksHandler(
  getBanner: () => Uint8Array,
  onBannerError?: (error: unknown) => void,
) {
  return createPhotoCardHandler(
    {
      getImage: getBanner,
      caption: LINKS_MESSAGE,
      filename: 'levia-links.png',
      keyboard: createLinksKeyboard,
    },
    onBannerError,
  );
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(HELP_MESSAGE, { parse_mode: 'HTML' });
}

export async function handleAbout(ctx: Context): Promise<void> {
  await ctx.reply(ABOUT_MESSAGE, { parse_mode: 'HTML' });
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
