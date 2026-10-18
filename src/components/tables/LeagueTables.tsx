'use client';

import type { LeagueTable, TableZone } from '@/lib/types';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { leagueBanner } from '@/lib/league-theme';
import { showAllLeagues } from '@/lib/preferences';

const ZONE_BAR: Record<TableZone['tone'], string> = {
  good: 'bg-emerald-500',
  mid:  'bg-amber-500',
  bad:  'bg-red-500',
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
      <div className="text-center py-20 text-zinc-600">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-medium text-zinc-500">No tables to show</p>
        {anyTables && tables.length === 0 && (
          <>
            <p className="mt-2 text-sm text-zinc-600">The leagues with tables are switched off in the menu.</p>
            <button type="button" onClick={showAllLeagues} className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300">
              Show all leagues
            </button>
          </>
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
    <div role="tablist" aria-label="League table" className="flex gap-1.5 overflow-x-auto px-3 pt-2 pb-0.5 [scrollbar-width:none]">
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
            className={`flex h-11 min-w-16 flex-1 items-center justify-center rounded-lg transition ${
              active ? 'bg-zinc-700' : 'bg-zinc-800/60 opacity-60 grayscale hover:opacity-90 hover:grayscale-0'
            }`}
          >
            {league.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={league.logoUrl} alt="" className="max-h-7 max-w-12 object-contain" />
            ) : (
              <span className="text-xs font-medium text-zinc-300">{league.shortName ?? league.name}</span>
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
  const banner = leagueBanner(league.slug);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <h2 className={`flex items-center gap-2 px-4 py-2.5 text-base font-semibold ${banner.strip} border-b ${banner.divider} ${banner.text}`}>
        {league.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={league.logoUrl} alt="" className="h-[1.375rem] w-auto shrink-0" />
        )}
        {league.shortName ?? league.name}
      </h2>

      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-zinc-500">
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
                className={`border-t ${zoneEnds ? 'border-b border-b-zinc-600' : ''} border-zinc-800/70`}
              >
                <td className="relative py-1.5 pl-3 text-zinc-500">
                  {zone && <span className={`absolute inset-y-1 left-0 w-0.5 rounded-r ${ZONE_BAR[zone.tone]}`} aria-hidden="true" />}
                  {position}
                </td>
                <td className="max-w-0 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <TeamAvatar team={row.team} size="xs" />
                    <span className="truncate text-zinc-200">
                      {row.team.name}
                    </span>
                  </span>
                </td>
                <td className="py-1.5 text-center text-zinc-400">{row.played}</td>
                <td className="py-1.5 text-center text-zinc-400">{row.won}</td>
                <td className="py-1.5 text-center text-zinc-400">{row.drawn}</td>
                <td className="py-1.5 text-center text-zinc-400">{row.lost}</td>
                <td className="py-1.5 text-center text-zinc-400">{gd > 0 ? `+${gd}` : gd}</td>
                <td className="py-1.5 pr-3 text-right font-semibold text-zinc-100">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
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
