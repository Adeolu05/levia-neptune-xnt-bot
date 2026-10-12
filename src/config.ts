import { z } from 'zod';

const environmentSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  NEPTUNE_API_BASE_URL: z
    .string()
    .trim()
    .url('NEPTUNE_API_BASE_URL must be a valid URL')
    .default('https://api.neptunescan.io'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = {
  telegramBotToken: string;
  neptuneApiBaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
};

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  if (!env.TELEGRAM_BOT_TOKEN?.trim()) {
    throw new Error(
      'Invalid environment configuration: TELEGRAM_BOT_TOKEN is required. ' +
        'Copy .env.example to .env and set the token.',
    );
  }

  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return {
    telegramBotToken: parsed.data.TELEGRAM_BOT_TOKEN,
    neptuneApiBaseUrl: parsed.data.NEPTUNE_API_BASE_URL.replace(/\/+$/, ''),
    logLevel: parsed.data.LOG_LEVEL,
  };
}
