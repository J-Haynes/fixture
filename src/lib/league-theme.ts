// Two-tone gradients drawn from each league's actual brand palette, shared by the
// fixture cards and the league list in the menu.
// from- = primary brand colour (darkened), to- = secondary/background tone.
export interface LeagueBanner {
  strip:   string;
  divider: string;
  text:    string;
}

const LEAGUE_BANNER: Record<string, LeagueBanner> = {
  'nrl':                 { strip: 'bg-gradient-to-r from-zinc-950 to-green-900',   divider: 'border-green-800/50',   text: 'text-white/85' },
  'super-rugby-pacific': { strip: 'bg-gradient-to-r from-blue-950 to-teal-900',    divider: 'border-teal-800/50',    text: 'text-white/85' },
  'fifa-world-cup':      { strip: 'bg-gradient-to-r from-zinc-950 to-yellow-500',  divider: 'border-amber-700/50',   text: 'text-white/85' },
  'formula-1':           { strip: 'bg-gradient-to-r from-zinc-950 to-red-900',     divider: 'border-red-800/50',     text: 'text-white/85' },
  'v8-supercars':        { strip: 'bg-gradient-to-r from-zinc-950 to-orange-900',  divider: 'border-orange-800/50',  text: 'text-white/85' },
  'afl':                 { strip: 'bg-gradient-to-r from-blue-950 to-red-800',     divider: 'border-red-800/50',     text: 'text-white/85' },
  'a-league-men':        { strip: 'bg-gradient-to-r from-zinc-950 to-rose-700',    divider: 'border-rose-800/50',    text: 'text-white/85' },
  'premier-league':      { strip: 'bg-gradient-to-r from-purple-950 to-fuchsia-800', divider: 'border-fuchsia-800/50', text: 'text-white/85' },
};

const DEFAULT_BANNER: LeagueBanner = { strip: 'bg-zinc-800/60', divider: 'border-zinc-800', text: 'text-zinc-400' };

export function leagueBanner(slug: string): LeagueBanner {
  return LEAGUE_BANNER[slug] ?? DEFAULT_BANNER;
}
