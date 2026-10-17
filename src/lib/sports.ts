const SPORT_EMOJIS: Record<string, string> = {
  rugby:              '🏉',
  'rugby-league':     '🏉',
  'australian-football': '🏉',
  motorsport:         '🏎️',
  football:           '⚽',
  basketball:         '🏀',
  'formula-1':        '🏎️',
  'american-football':'🏈',
  cricket:            '🏏',
  tennis:             '🎾',
  golf:               '⛳',
  baseball:           '⚾',
  hockey:             '🏒',
};

export function getSportEmoji(slug: string): string {
  return SPORT_EMOJIS[slug] ?? '🏟️';
}
