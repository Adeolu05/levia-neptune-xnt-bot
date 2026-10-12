import { InlineKeyboard } from 'grammy';

export const OFFICIAL_LINKS = {
  website: {
    label: 'Website',
    url: 'https://neptune.io/',
  },
  explorer: {
    label: 'Explorer',
    url: 'https://neptunescan.io/',
  },
  x: {
    label: 'X',
    url: 'https://x.com/NeptunePrivacy',
  },
  discord: {
    label: 'Discord',
    url: 'https://discord.com/invite/neptuneprivacy',
  },
  telegram: {
    label: 'Telegram',
    url: 'https://t.me/neptuneprivacy',
  },
  reddit: {
    label: 'Reddit',
    url: 'https://www.reddit.com/r/neptuneprivacy/',
  },
  github: {
    label: 'GitHub',
    url: 'https://github.com/neptuneprivacy',
  },
  learning: {
    label: 'Learn',
    url: 'https://neptune.io/learn',
  },
} as const;

export const LINKS_MESSAGE =
  'Official Neptune Privacy resources. Chart links and contract addresses are not configured.';

export function createLinksKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url(OFFICIAL_LINKS.website.label, OFFICIAL_LINKS.website.url)
    .url(OFFICIAL_LINKS.explorer.label, OFFICIAL_LINKS.explorer.url)
    .row()
    .url(OFFICIAL_LINKS.x.label, OFFICIAL_LINKS.x.url)
    .url(OFFICIAL_LINKS.discord.label, OFFICIAL_LINKS.discord.url)
    .url(OFFICIAL_LINKS.telegram.label, OFFICIAL_LINKS.telegram.url)
    .row()
    .url(OFFICIAL_LINKS.reddit.label, OFFICIAL_LINKS.reddit.url)
    .url(OFFICIAL_LINKS.github.label, OFFICIAL_LINKS.github.url)
    .url(OFFICIAL_LINKS.learning.label, OFFICIAL_LINKS.learning.url);
}
