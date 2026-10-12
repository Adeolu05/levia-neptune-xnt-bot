export const START_MESSAGE = [
  '👋 <b>Welcome to Levia</b>',
  'Your guide to <b>Neptune Privacy (XNT)</b>: live network stats, price and mining help.',
  '',
  '<b>Get started</b>',
  '📊 /stats · Hashrate, supply and a 7-day chart',
  '💎 /price · Price, market cap and where to buy',
  '⛏️ /mining · How to start mining',
  '🔗 /links · Official resources',
  '',
  'Type /help anytime to see every command.',
].join('\n');

export const HELP_MESSAGE = [
  '📖 <b>Levia Commands</b>',
  '',
  '<b>Network and market</b>',
  '📊 /stats · Hashrate with 24h and 7d change, difficulty, supply and a chart',
  '💎 /price · XNT price, supply, market cap, a chart and exchanges',
  '',
  '<b>Getting started</b>',
  '⛏️ /mining · How to start mining XNT',
  '🔗 /links · Official Neptune Privacy links',
  '',
  '<b>About</b>',
  '🤖 /about · About this bot',
  '📖 /help · Show this message',
].join('\n');

export const ABOUT_MESSAGE = [
  '🤖 <b>About Levia</b>',
  '',
  'An open-source community bot for the <b>Neptune Privacy</b> ecosystem.',
  '',
  '📡 <b>Network data:</b> NeptuneScan explorer',
  '💵 <b>Prices:</b> CoinGecko',
  '⚡ <b>Hashrate:</b> estimated from on-chain proof-of-work',
  '',
  '<i>Information only, not financial advice.</i>',
].join('\n');

export const MINING_MESSAGE = [
  '⛏️ <b>How to mine XNT</b>',
  '',
  'XNT is mined with an NVIDIA GPU using <b>xnt-gpu-miner</b>, a solo miner from the Neptune Privacy GitHub.',
  '',
  '<b>What you need</b>',
  '✅ An NVIDIA GPU with CUDA support',
  '✅ A synced <b>xnt-core</b> node with JSON-RPC enabled',
  '✅ Your XNT wallet address',
  '',
  "📘 Full build and run steps are in the miner's README. Tap below to get started 👇",
].join('\n');
