'use client';

import type { LeagueTable, TableZone } from '@/lib/types';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { leagueColour } from '@/lib/league-theme';
import { LeagueBand } from '@/components/ui/LeagueBand';
import { showAllLeagues } from '@/lib/preferences';

const ZONE_BAR: Record<TableZone['tone'], string> = {
  good: 'bg-emerald-400',
  mid:  'bg-amber-400',
  bad:  'bg-red-400',
};

/**
 * The Tables tab body: the selected league's table. `tables` is already filtered to the
 * leagues the viewer hasn't switched off; `TableSelector` (in the bottom bar) picks one.
 */
export function LeagueTables({ tables, selected, anyTables }: {
  tables:    LeagueTable[];
  selected?: LeagueTable;
  /** Whether any league has a table at all, to explain an empty tab */
  anyTables: boolean;
}) {
  if (!selected) {
    return (
      <div className="py-20 text-center">
        <p className="scoreboard text-[34px] font-extrabold text-chalk">No tables yet</p>
        {anyTables && tables.length === 0 ? (
          <>
            <p className="mx-auto mt-3 max-w-xs text-[15px] leading-snug text-mist">The leagues with tables are switched off in the menu.</p>
            <button type="button" onClick={showAllLeagues} className="mt-5 rounded-full bg-flood px-4 py-2 text-sm font-semibold text-night hover:bg-flood/90">
              Show all leagues
            </button>
          </>
        ) : (
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-snug text-mist">Tables appear once a football league&apos;s season has results.</p>
        )}
      </div>
    );
  }

  return <Table table={selected} />;
}

/** League picker for the Tables tab, shown in the fixed bottom bar above the tabs */
export function TableSelector({ tables, selected, onSelect }: {
  tables:   LeagueTable[];
  selected: string | undefined;
  onSelect: (slug: string) => void;
}) {
  if (tables.length < 2) return null;
  return (
    <div role="tablist" aria-label="League table" className="flex gap-1.5 overflow-x-auto px-3 pt-2.5 pb-0.5 [scrollbar-width:none]">
      {tables.map(({ league }) => {
        const active = league.slug === selected;
        return (
          <button
            key={league.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(league.slug)}
            aria-label={league.name}
            title={league.name}
            // Logos only; more leagues than fit scroll sideways
            // The chosen league sits on its own colour, like its band above the table
            className={`flex h-11 min-w-16 flex-1 items-center justify-center rounded-lg transition ${
              active ? '' : 'bg-stand-2 opacity-60 grayscale hover:opacity-90 hover:grayscale-0'
            }`}
            style={active ? { backgroundColor: leagueColour(league.slug) } : undefined}
          >
            {league.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={league.logoUrl} alt="" className="max-h-7 max-w-12 object-contain" />
            ) : (
              <span className="text-xs font-medium text-chalk">{league.shortName ?? league.name}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function zoneAt(zones: TableZone[], position: number) {
  return zones.find(z => position >= z.from && position <= z.to);
}

function Table({ table }: { table: LeagueTable }) {
  const { league, rows, zones } = table;

  return (
    <section className="mt-4 overflow-hidden rounded-xl bg-stand">
      <LeagueBand league={league} as="h2" />

      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-dim">
            <th scope="col" className="w-7 py-2 pl-3 text-left font-medium">#</th>
            <th scope="col" className="py-2 text-left font-medium">Team</th>
            <th scope="col" className="w-6 py-2 text-center font-medium" title="Played">P</th>
            <th scope="col" className="w-6 py-2 text-center font-medium" title="Won">W</th>
            <th scope="col" className="w-6 py-2 text-center font-medium" title="Drawn">D</th>
            <th scope="col" className="w-6 py-2 text-center font-medium" title="Lost">L</th>
            <th scope="col" className="w-8 py-2 text-center font-medium" title="Goal difference">GD</th>
            <th scope="col" className="w-9 py-2 pr-3 text-right font-medium" title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const position = i + 1;
            const zone = zoneAt(zones, position);
            // A line between zones, e.g. under 4th in the Premier League
            const zoneEnds = zone && zone.to === position && position < rows.length;
            const gd = row.goalsFor - row.goalsAgainst;
            return (
              <tr
                key={row.team.id}
                className={`border-t ${zoneEnds ? 'border-b border-b-mist/50' : ''} border-line`}
              >
                <td className="relative py-2 pl-3 text-dim">
                  {zone && <span className={`absolute inset-y-1 left-0 w-0.5 rounded-r ${ZONE_BAR[zone.tone]}`} aria-hidden="true" />}
                  {position}
                </td>
                <td className="max-w-0 py-2">
                  <span className="flex items-center gap-1.5">
                    <TeamAvatar team={row.team} size="xs" />
                    <span className="truncate text-chalk">
                      {row.team.name}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-center text-mist">{row.played}</td>
                <td className="py-2 text-center text-mist">{row.won}</td>
                <td className="py-2 text-center text-mist">{row.drawn}</td>
                <td className="py-2 text-center text-mist">{row.lost}</td>
                <td className="py-2 text-center text-mist">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="scoreboard py-2 pr-3 text-right text-[17px] font-extrabold text-chalk">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2.5 text-xs text-mist">
          {zones.map(z => (
            <li key={z.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-0.5 rounded ${ZONE_BAR[z.tone]}`} aria-hidden="true" />
              {z.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
