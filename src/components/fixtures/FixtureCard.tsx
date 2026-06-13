import type { Fixture } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { getSportEmoji } from '@/lib/sports';
import { formatKickoffTime } from '@/lib/dates';

// Two-tone gradients drawn from each league's actual brand palette.
// from- = primary brand colour (darkened), to- = secondary/background tone.
const LEAGUE_BANNER: Record<string, { strip: string; divider: string; text: string }> = {
  'nrl':                 { strip: 'bg-gradient-to-r from-zinc-950 to-green-900',  divider: 'border-green-800/50',  text: 'text-white/85' },
  'super-rugby-pacific': { strip: 'bg-gradient-to-r from-blue-950 to-teal-900',   divider: 'border-teal-800/50',   text: 'text-white/85' },
  'fifa-world-cup':      { strip: 'bg-gradient-to-r from-zinc-950 to-yellow-500',  divider: 'border-amber-700/50',  text: 'text-white/85' },
  'formula-1':           { strip: 'bg-gradient-to-r from-zinc-950 to-red-900',    divider: 'border-red-800/50',    text: 'text-white/85' },
  'v8-supercars':        { strip: 'bg-gradient-to-r from-zinc-950 to-orange-900', divider: 'border-orange-800/50', text: 'text-white/85' },
};
const DEFAULT_BANNER = { strip: 'bg-zinc-800/60', divider: 'border-zinc-800', text: 'text-zinc-400' };

interface Props {
  fixture: Fixture;
}

export function FixtureCard({ fixture }: Props) {
  const {
    league, homeTeam, awayTeam, scheduledAt,
    status, round, homeScore, awayScore, sportMeta,
  } = fixture;

  const isTeamMatch = homeTeam && awayTeam;
  const banner = LEAGUE_BANNER[league.slug] ?? DEFAULT_BANNER;

  return (
    <article className={`bg-zinc-900 rounded-xl border overflow-hidden ${
      status === 'live' ? 'border-red-500' : 'border-zinc-800'
    }`}>
      {/* League strip */}
      <div className={`flex items-center justify-between px-4 py-2 ${banner.strip} border-b ${banner.divider}`}>
        <span className={`text-xs font-medium flex items-center gap-1.5 ${banner.text}`}>
          {league.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={league.logoUrl} alt={league.name} className="h-4 w-auto shrink-0" />
          ) : (
            <span aria-hidden="true">{getSportEmoji(league.sport?.slug ?? '')}</span>
          )}
          {league.shortName ?? league.name}
          {league.country && (
            <span className="opacity-50">· {league.country}</span>
          )}
        </span>
        {round && (
          <span className={`text-xs truncate max-w-[40%] text-right ${banner.text}`}>{round}</span>
        )}
      </div>

      {/* Fixture body */}
      <div className="px-4 py-4">
        {isTeamMatch ? (
          <TeamMatchLayout
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            scheduledAt={scheduledAt}
            status={status}
            homeScore={homeScore}
            awayScore={awayScore}
          />
        ) : (
          <EventLayout league={league} round={round} scheduledAt={scheduledAt} status={status} sportMeta={sportMeta} />
        )}
      </div>
    </article>
  );
}

// ── Team-vs-team layout ──────────────────────────────────────────────────────

interface TeamMatchProps {
  homeTeam: NonNullable<Fixture['homeTeam']>;
  awayTeam: NonNullable<Fixture['awayTeam']>;
  scheduledAt: string;
  status: Fixture['status'];
  homeScore?: number;
  awayScore?: number;
}

function TeamMatchLayout({ homeTeam, awayTeam, scheduledAt, status, homeScore, awayScore }: TeamMatchProps) {
  const isFinished = status === 'finished' && homeScore != null && awayScore != null;
  const homeIsLoser = isFinished && homeScore! < awayScore!;
  const awayIsLoser = isFinished && awayScore! < homeScore!;

  return (
    <div className="flex items-center gap-2">
      {/* Home team */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <TeamAvatar team={homeTeam} size="lg" />
        <span className={`text-xs font-semibold text-center leading-tight ${homeIsLoser ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {homeTeam.name}
        </span>
      </div>

      {/* Centre: score / time / status */}
      <div className="flex flex-col items-center gap-1.5 w-20 shrink-0">
        <CentreDisplay
          status={status}
          scheduledAt={scheduledAt}
          homeScore={homeScore}
          awayScore={awayScore}
        />
      </div>

      {/* Away team */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <TeamAvatar team={awayTeam} size="lg" />
        <span className={`text-xs font-semibold text-center leading-tight ${awayIsLoser ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {awayTeam.name}
        </span>
      </div>
    </div>
  );
}

interface CentreProps {
  status: Fixture['status'];
  scheduledAt: string;
  homeScore?: number;
  awayScore?: number;
}

function CentreDisplay({ status, scheduledAt, homeScore, awayScore }: CentreProps) {
  switch (status) {
    case 'finished':
      return (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums">{homeScore}</span>
            <span className="text-zinc-600 text-lg">–</span>
            <span className="text-2xl font-bold text-white tabular-nums">{awayScore}</span>
          </div>
          <StatusBadge status="finished" />
        </>
      );
    case 'live':
      return (
        <>
          {homeScore != null && awayScore != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-white tabular-nums">{homeScore}</span>
              <span className="text-zinc-600 text-lg">–</span>
              <span className="text-2xl font-bold text-white tabular-nums">{awayScore}</span>
            </div>
          )}
          <StatusBadge status="live" />
        </>
      );
    case 'postponed':
    case 'cancelled':
      return <StatusBadge status={status} />;
    default:
      // scheduled
      return (
        <span className="text-sm font-semibold text-zinc-300 tabular-nums" suppressHydrationWarning>
          {formatKickoffTime(scheduledAt)}
        </span>
      );
  }
}

// ── Non-team event layout (motorsport, etc.) ────────────────────────────────

interface EventLayoutProps {
  league: { logoUrl?: string | null; name: string };
  round?: string | null;
  scheduledAt: string;
  status: Fixture['status'];
  sportMeta?: Record<string, unknown>;
}

const PODIUM_TEXT = ['text-zinc-400', 'text-zinc-500', 'text-zinc-500'] as const;

function EventLayout({ league, round, scheduledAt, status, sportMeta }: EventLayoutProps) {
  const podium    = Array.isArray(sportMeta?.podium) ? (sportMeta.podium as string[]) : undefined;
  const eventName = typeof sportMeta?.eventName === 'string' ? sportMeta.eventName : undefined;
  // Session type ("Qualifying", "Race") is already shown in the banner strip — body shows race name only
  const title = eventName ?? round;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {league.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={league.logoUrl} alt={league.name} className="h-12 w-auto" />
      )}
      {title && (
        <p className="font-semibold text-zinc-100 leading-snug">{title}</p>
      )}
      {status === 'finished' && podium && podium.length > 0 ? (
        <ol className="w-full space-y-1">
          {podium.map((name, i) => (
            <li key={i} className="flex items-baseline justify-center gap-1.5 text-sm">
              <span className="tabular-nums text-zinc-600 w-4 text-right shrink-0">{i + 1}.</span>
              <span className={PODIUM_TEXT[i]}>{name}</span>
            </li>
          ))}
        </ol>
      ) : status === 'live' ? (
        <StatusBadge status="live" />
      ) : status === 'scheduled' ? (
        <span className="text-sm font-medium text-zinc-500 tabular-nums" suppressHydrationWarning>
          {formatKickoffTime(scheduledAt)}
        </span>
      ) : (status === 'postponed' || status === 'cancelled') ? (
        <StatusBadge status={status} />
      ) : null}
    </div>
  );
}
