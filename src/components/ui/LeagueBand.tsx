import type { ReactNode } from 'react';
import type { League } from '@/lib/types';
import { leagueColour } from '@/lib/league-theme';
import { getSportEmoji } from '@/lib/sports';

/**
 * A league's name on a flat band of its brand colour: the header of each league's games in
 * the feed, and of its table. The colour is the one loud thing on the page; keep the rest quiet.
 */
export function LeagueBand({ league, aside, as: Heading = 'h3', className = '' }: {
  league:     Pick<League, 'name' | 'shortName' | 'slug' | 'logoUrl' | 'sport'>;
  /** Right-hand detail, e.g. the round */
  aside?:     ReactNode;
  as?:        'h2' | 'h3';
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-11 items-center gap-2.5 px-3.5 py-2 text-white ${className}`}
      style={{ backgroundColor: leagueColour(league.slug) }}
    >
      <span className="flex h-6 w-7 shrink-0 items-center justify-center">
        {league.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={league.logoUrl} alt="" className="max-h-6 max-w-7 object-contain" />
        ) : (
          <span aria-hidden="true">{getSportEmoji(league.sport?.slug ?? '')}</span>
        )}
      </span>
      <Heading className="max-w-full shrink-0 truncate text-[15px] font-semibold">
        {league.shortName ?? league.name}
      </Heading>
      {/* The round gives way before the league name does */}
      <span className="min-w-0 flex-1 truncate text-right text-[13px] text-white/75">{aside}</span>
    </div>
  );
}
