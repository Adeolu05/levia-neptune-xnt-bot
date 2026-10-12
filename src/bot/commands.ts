import type { Context } from 'grammy';
import { BlockLookupError, type NeptuneDataProvider } from '../neptune/provider.js';
import { createLinksKeyboard, LINKS_MESSAGE } from './links.js';
import { ABOUT_MESSAGE, HELP_MESSAGE, START_MESSAGE } from './messages.js';

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(START_MESSAGE);
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(HELP_MESSAGE);
}

export async function handleAbout(ctx: Context): Promise<void> {
  await ctx.reply(ABOUT_MESSAGE);
}

export async function handleLinks(ctx: Context): Promise<void> {
  await ctx.reply(LINKS_MESSAGE, { reply_markup: createLinksKeyboard() });
}

export function parseBlockHeight(argument: string | undefined): number | undefined {
  if (argument === undefined || !/^(0|[1-9]\d*)$/.test(argument)) {
    return undefined;
  }
  const height = Number(argument);
  return Number.isSafeInteger(height) ? height : undefined;
}

export function createBlockHandler(provider: NeptuneDataProvider) {
  return async (ctx: Context): Promise<void> => {
    const height = parseBlockHeight(ctx.match?.toString().trim());
    if (height === undefined) {
      await ctx.reply('Usage: /block <non-negative integer height>');
      return;
    }

    try {
      const block = await provider.getBlock(height);
      await ctx.reply(
        [
          `Block height: ${block.height}`,
          `Hash: ${block.hash}`,
          `Timestamp: ${block.timestamp}`,
          `Target: ${block.target}`,
          `Canonical: ${block.isCanonical ? 'yes' : 'no'}`,
        ].join('\n'),
      );
    } catch (error) {
      if (error instanceof BlockLookupError) {
        await ctx.reply('I could not retrieve that block right now. Please try again later.');
        throw error;
      }
      await ctx.reply('I could not retrieve that block right now. Please try again later.');
      throw error;
    }
  };
}
