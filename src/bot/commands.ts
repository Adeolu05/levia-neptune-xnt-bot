import type { Context } from 'grammy';
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
