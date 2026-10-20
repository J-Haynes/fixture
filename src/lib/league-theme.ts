// One flat colour per league, taken from its own branding and darkened where needed so
// white text and the league's logo read on it (white text is at least 4.5:1 on all of them).
// Used for the league bands in the feed, the menu and the Tables tab.
const LEAGUE_COLOUR: Record<string, string> = {
  'nrl':                  '#0b6b3a',
  'super-rugby-pacific':  '#13406b',
  'fifa-world-cup':       '#7a5c10',
  'formula-1':            '#3a0b0b', // the logo is F1 red, so the band is the dark end of it
  'v8-supercars':         '#9a3412',
  'afl':                  '#0a2f6e',
  'a-league-men':         '#a8113c',
  'champions-league':     '#0d1e57',
  'premier-league':       '#3d195b',
  'nba':                  '#1d428a',
  'nations-championship': '#3f6212',
  'rugby-championship':   '#075985',
  'rugby-world-cup':      '#0f766e',
  'all-blacks-tests':     '#000000',
};

const DEFAULT_COLOUR = '#232d3d'; // stand-2

export function leagueColour(slug: string): string {
  return LEAGUE_COLOUR[slug] ?? DEFAULT_COLOUR;
}
