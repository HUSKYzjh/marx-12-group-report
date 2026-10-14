import { PRODUCTION_SYMBOLS } from './production-symbols.ts';
import { PRODUCTION_EXTRA_BRANDS, PRODUCTION_EXTRA_TOOLS } from './production-extra-symbols.ts';
import { PRODUCTION_BRAND_REPLACEMENTS } from './production-industry-symbols.ts';

/** Official pages checked on 2026-10-03. No remote asset or tracking request is
 * made by showing a symbol. Only an explicit anchor activation leaves the game. */
export const OFFICIAL_PRODUCTION_LINKS: Readonly<Record<string, string>> = {
  codex: 'https://openai.com/codex/',
  deepseek: 'https://www.deepseek.com/',
  unitree: 'https://www.unitree.com/cn/',
  xiaomi: 'https://www.mi.com/shop',
  tesla: 'https://www.tesla.cn/',
  dji: 'https://www.dji.com/cn',
  ...Object.fromEntries(PRODUCTION_EXTRA_BRANDS.map(symbol => [symbol.id, symbol.href])),
} as const;

const brandReplacements = new Map<string, (typeof PRODUCTION_BRAND_REPLACEMENTS)[number]>(PRODUCTION_BRAND_REPLACEMENTS.map(symbol => [symbol.id, symbol]));

export const PRODUCTION_LINKS = [
  ...PRODUCTION_SYMBOLS.map(symbol => {
    const logo = brandReplacements.get(symbol.id);
    return logo ? { ...logo, logo: true } : { ...symbol, logo: false, href: OFFICIAL_PRODUCTION_LINKS[symbol.id] ?? null };
  }),
  ...PRODUCTION_EXTRA_BRANDS.map(symbol => ({ ...symbol, logo: true })),
  ...PRODUCTION_EXTRA_TOOLS.map(symbol => ({ ...symbol, logo: false, href: null })),
];
