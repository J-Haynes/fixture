const SPORT_EMOJIS: Record<string, string> = {
  football: '⚽',
  basketball: '🏀',
  'formula-1': '🏎️',
  'american-football': '🏈',
  rugby: '🏉',
  cricket: '🏏',
  tennis: '🎾',
  golf: '⛳',
  baseball: '⚾',
  hockey: '🏒',
};

export function getSportEmoji(slug: string): string {
  return SPORT_EMOJIS[slug] ?? '🏟️';
}
