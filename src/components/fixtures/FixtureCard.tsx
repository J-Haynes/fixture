import type { Fixture } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { getSportEmoji } from '@/lib/sports';
import { formatKickoffTime } from '@/lib/dates';

interface Props {
  fixture: Fixture;
}

export function FixtureCard({ fixture }: Props) {
  const {
    league, homeTeam, awayTeam, scheduledAt,
    status, round, homeScore, awayScore, sportMeta,
  } = fixture;

  const isTeamMatch = homeTeam && awayTeam;
  const showScore = status === 'finished' || status === 'live';
  const minute = typeof sportMeta?.minute === 'number' ? sportMeta.minute : undefined;
  const sportEmoji = getSportEmoji(league.sport?.slug ?? '');

  return (
    <article className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* League strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
          <span aria-hidden="true">{sportEmoji}</span>
          {league.shortName ?? league.name}
          {league.country && (
            <span className="text-slate-400">· {league.country}</span>
          )}
        </span>
        {round && (
          <span className="text-xs text-slate-400 truncate max-w-[40%] text-right">{round}</span>
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
            showScore={showScore}
            homeScore={homeScore}
            awayScore={awayScore}
            minute={minute}
          />
        ) : (
          <EventLayout
            round={round}
            status={status}
            sportMeta={sportMeta}
          />
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
  showScore: boolean;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
}

function TeamMatchLayout({
  homeTeam, awayTeam, scheduledAt, status,
  showScore, homeScore, awayScore, minute,
}: TeamMatchProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Home team */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <TeamAvatar team={homeTeam} />
        <span className="text-xs font-semibold text-slate-700 text-center leading-tight">
          {homeTeam.shortName ?? homeTeam.name}
        </span>
      </div>

      {/* Centre: score / time / status */}
      <div className="flex flex-col items-center gap-1 w-20 shrink-0">
        {showScore ? (
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{homeScore}</span>
            <span className="text-slate-300 text-lg">–</span>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{awayScore}</span>
          </div>
        ) : status === 'postponed' || status === 'cancelled' ? (
          <StatusBadge status={status} />
        ) : (
          <span className="text-sm font-semibold text-slate-700 tabular-nums">
            {formatKickoffTime(scheduledAt)}
          </span>
        )}

        {status === 'live' && minute !== undefined && (
          <span className="text-xs font-bold text-green-600">{minute}&prime;</span>
        )}

        {(status === 'finished' || status === 'live') && (
          <StatusBadge status={status} />
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <TeamAvatar team={awayTeam} />
        <span className="text-xs font-semibold text-slate-700 text-center leading-tight">
          {awayTeam.shortName ?? awayTeam.name}
        </span>
      </div>
    </div>
  );
}

// ── Non-team event layout (F1, golf, etc.) ───────────────────────────────────

interface EventLayoutProps {
  round?: string;
  status: Fixture['status'];
  sportMeta?: Record<string, unknown>;
}

function EventLayout({ round, status, sportMeta }: EventLayoutProps) {
  const podium = Array.isArray(sportMeta?.podium)
    ? (sportMeta.podium as string[])
    : undefined;

  return (
    <div className="text-center py-1 space-y-2">
      {round && (
        <p className="font-semibold text-slate-800">{round}</p>
      )}
      {status === 'finished' && podium && (
        <ol className="space-y-0.5">
          {podium.slice(0, 3).map((name, i) => (
            <li key={i} className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{i + 1}.</span> {name}
            </li>
          ))}
        </ol>
      )}
      {status !== 'scheduled' && (
        <div className="flex justify-center">
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  );
}
