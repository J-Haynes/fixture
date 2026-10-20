// Two-tone gradients drawn from each league's actual brand palette, shared by the
// fixture cards and the league list in the menu. They use neutral-*, not zinc-*, so they
// stay the same in every colour theme (themes re-point zinc; see globals.css).
// from- = primary brand colour (darkened), to- = secondary/background tone.
export interface LeagueBanner {
  strip:   string;
  divider: string;
  text:    string;
}

const LEAGUE_BANNER: Record<string, LeagueBanner> = {
  'nrl':                 { strip: 'bg-gradient-to-r from-neutral-950 to-green-900',   divider: 'border-green-800/50',   text: 'text-white/85' },
  'super-rugby-pacific': { strip: 'bg-gradient-to-r from-blue-950 to-teal-900',    divider: 'border-teal-800/50',    text: 'text-white/85' },
  'fifa-world-cup':      { strip: 'bg-gradient-to-r from-neutral-950 to-yellow-500',  divider: 'border-amber-700/50',   text: 'text-white/85' },
  'formula-1':           { strip: 'bg-gradient-to-r from-neutral-950 to-red-900',     divider: 'border-red-800/50',     text: 'text-white/85' },
  'v8-supercars':        { strip: 'bg-gradient-to-r from-neutral-950 to-orange-900',  divider: 'border-orange-800/50',  text: 'text-white/85' },
  'afl':                 { strip: 'bg-gradient-to-r from-blue-950 to-red-800',     divider: 'border-red-800/50',     text: 'text-white/85' },
  'a-league-men':        { strip: 'bg-gradient-to-r from-neutral-950 to-rose-700',    divider: 'border-rose-800/50',    text: 'text-white/85' },
  'champions-league':    { strip: 'bg-gradient-to-r from-slate-950 to-blue-800',  divider: 'border-blue-800/50',    text: 'text-white/85' },
  'premier-league':      { strip: 'bg-gradient-to-r from-purple-950 to-fuchsia-800', divider: 'border-fuchsia-800/50', text: 'text-white/85' },
  'nba':                 { strip: 'bg-gradient-to-r from-blue-900 to-red-700',     divider: 'border-red-800/50',     text: 'text-white/85' },
  'nations-championship':{ strip: 'bg-gradient-to-r from-neutral-950 to-lime-700',    divider: 'border-lime-800/50',    text: 'text-white/85' },
  'rugby-championship':  { strip: 'bg-gradient-to-r from-neutral-950 to-sky-800',     divider: 'border-sky-800/50',     text: 'text-white/85' },
  'rugby-world-cup':     { strip: 'bg-gradient-to-r from-neutral-950 to-orange-700',  divider: 'border-orange-800/50',  text: 'text-white/85' },
  'all-blacks-tests':    { strip: 'bg-black',                                      divider: 'border-black',          text: 'text-white/85' },
};

const DEFAULT_BANNER: LeagueBanner = { strip: 'bg-zinc-800/60', divider: 'border-zinc-800', text: 'text-zinc-400' };

export function leagueBanner(slug: string): LeagueBanner {
  return LEAGUE_BANNER[slug] ?? DEFAULT_BANNER;
}

// League logos are dark-first: most have white parts, so they sit on dark surfaces (the
// banners above, the Tables tab's chips) in every theme. Where one sits on the card itself
// (motorsport cards), the Light theme swaps in a version made for light backgrounds, if listed here.
const LIGHT_BACKGROUND_LOGO: Record<string, string> = {
  'v8-supercars': '/logos/v8-supercars-light.png', // Wikipedia's (black "CHAMPIONSHIP")
};

export function leagueLogoForLight(slug: string): string | undefined {
  return LIGHT_BACKGROUND_LOGO[slug];
}
