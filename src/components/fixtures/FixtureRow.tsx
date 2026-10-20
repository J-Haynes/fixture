'use client';

import { useState } from 'react';
import type { Fixture, Team } from '@/lib/types';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import { formatKickoffParts } from '@/lib/dates';
import { usePreferences } from '@/lib/preferences';
import { MatchDetailsPanel } from './MatchDetailsPanel';

interface Props {
  fixture: Fixture;
  /** Show the round on the row (when the games under one league band are in different rounds) */
  showRound: boolean;
}

/**
 * One game in a league's block: kickoff time or status on the left, the two teams stacked
 * (or the event name, for motorsport), and the score on the right.
 */
export function FixtureRow({ fixture, showRound }: Props) {
  const {
    league, homeTeam, awayTeam, scheduledAt,
    status, round, homeScore, awayScore, sportMeta,
  } = fixture;
  const isTeamMatch = homeTeam && awayTeam;

  return (
    <li>
      <div className="grid grid-cols-[3.75rem_1fr] gap-x-2 py-3 pl-3.5 pr-4">
        <StatusCell status={status} scheduledAt={scheduledAt} />
        <div className="min-w-0">
          {isTeamMatch ? (
            <TeamLines homeTeam={homeTeam} awayTeam={awayTeam} status={status} homeScore={homeScore} awayScore={awayScore} />
          ) : (
            <EventLines round={round} showRound={showRound} status={status} sportMeta={sportMeta} />
          )}
          {showRound && round && isTeamMatch && (
            <p className="mt-1.5 truncate text-[13px] text-dim">{round}</p>
          )}
        </div>
      </div>

      {status === 'finished' && (
        <ResultActions fixtureId={fixture.id} video={sportMeta?.video} hasDetails={!!isTeamMatch && league.sport?.slug === 'football'} />
      )}
    </li>
  );
}

// ── Left column: kickoff time, or what's happening instead ──────────────────

const STATUS_TEXT: Partial<Record<Fixture['status'], { label: string; className: string }>> = {
  finished:  { label: 'FT',        className: 'text-dim' },
  postponed: { label: 'Postponed', className: 'text-flood' },
  cancelled: { label: 'Cancelled', className: 'text-dim line-through' },
};

function StatusCell({ status, scheduledAt }: { status: Fixture['status']; scheduledAt: string }) {
  if (status === 'live') {
    return (
      <span className="scoreboard flex items-center gap-1.5 self-center text-[17px] font-bold text-live">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
        </span>
        Live
      </span>
    );
  }
  const text = STATUS_TEXT[status];
  if (text) {
    return <span className={`scoreboard self-center text-[17px] font-semibold ${text.className}`}>{text.label}</span>;
  }
  const { time, period } = formatKickoffParts(scheduledAt);
  return (
    <time dateTime={scheduledAt} className="flex flex-col self-center">
      <span className="scoreboard text-[24px] font-bold text-chalk">{time}</span>
      {period && <span className="mt-0.5 text-xs text-mist">{period}</span>}
    </time>
  );
}

// ── Team v team ──────────────────────────────────────────────────────────────

interface TeamLinesProps {
  homeTeam:   Team;
  awayTeam:   Team;
  status:     Fixture['status'];
  homeScore?: number;
  awayScore?: number;
}

function TeamLines({ homeTeam, awayTeam, status, homeScore, awayScore }: TeamLinesProps) {
  const { followedTeams } = usePreferences();
  const hasScore = (status === 'finished' || status === 'live') && homeScore != null && awayScore != null;
  // In results the loser is greyed so the winner stands out; a draw (and a live game) keeps both bright
  const finished = status === 'finished' && hasScore;
  const homeLost = finished && homeScore! < awayScore!;
  const awayLost = finished && awayScore! < homeScore!;

  return (
    <div className="space-y-2">
      <TeamLine team={homeTeam} score={hasScore ? homeScore : undefined} dim={homeLost} isFollowed={followedTeams.includes(homeTeam.slug)} />
      <TeamLine team={awayTeam} score={hasScore ? awayScore : undefined} dim={awayLost} isFollowed={followedTeams.includes(awayTeam.slug)} />
    </div>
  );
}

function TeamLine({ team, score, dim, isFollowed }: { team: Team; score?: number; dim: boolean; isFollowed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* A followed team gets a gold star on its logo's corner */}
      <span className="relative shrink-0">
        <TeamAvatar team={team} size="row" />
        {isFollowed && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-flood ring-2 ring-stand">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-night" fill="currentColor">
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
            </svg>
          </span>
        )}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[15px] ${dim ? 'text-dim' : 'font-medium text-chalk'}`}>
        {team.name}
        {isFollowed && <span className="sr-only"> (followed)</span>}
      </span>
      {score != null && (
        <span className={`scoreboard w-9 text-right text-[26px] font-extrabold ${dim ? 'text-dim' : 'text-chalk'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

// ── Events without teams (motorsport) ────────────────────────────────────────

function EventLines({ round, showRound, status, sportMeta }: {
  round?:     string;
  showRound:  boolean;
  status:     Fixture['status'];
  sportMeta?: Record<string, unknown>;
}) {
  const podium    = Array.isArray(sportMeta?.podium) ? (sportMeta.podium as string[]) : undefined;
  const eventName = typeof sportMeta?.eventName === 'string' ? sportMeta.eventName : undefined;

  return (
    <div className="pt-0.5">
      <p className="text-[15px] font-medium leading-snug text-chalk">{eventName ?? round}</p>
      {/* The session ("Race", "Qualifying"), unless the band or the title already shows it */}
      {eventName && round && showRound && <p className="text-[13px] text-mist">{round}</p>}
      {status === 'finished' && podium && podium.length > 0 && (
        <ol className="mt-2 space-y-1" aria-label="Podium">
          {podium.map((name, i) => (
            <li key={i} className="flex items-baseline gap-2.5 text-sm">
              <span className={`scoreboard w-4 text-[17px] font-extrabold ${i === 0 ? 'text-chalk' : 'text-dim'}`}>{i + 1}</span>
              <span className={i === 0 ? 'text-chalk' : 'text-mist'}>{name}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Finished games: highlights link and (football) match details ─────────────

function ResultActions({ fixtureId, video, hasDetails }: { fixtureId: number; video: unknown; hasDetails: boolean }) {
  const [open, setOpen] = useState(false);
  // Stored by the sync only if it's a YouTube link
  const highlights = typeof video === 'string' && video.startsWith('https://') ? video : undefined;
  if (!highlights && !hasDetails) return null;

  const panelId = `match-details-${fixtureId}`;
  const action = 'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-mist hover:bg-stand-2 hover:text-chalk';
  return (
    <div className="-mt-1.5 pb-2">
      {/* Lined up under the team names (the time column, its gap and the row's padding, less the buttons' own padding) */}
      <div className="flex gap-1 pl-[4.625rem] pr-4">
        {highlights && (
          <a href={highlights} target="_blank" rel="noopener noreferrer" className={action}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
            Highlights
          </a>
        )}
        {hasDetails && (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId} className={action}>
            Match details
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div id={panelId} className="mx-4 mt-1 border-t border-line">
          <MatchDetailsPanel fixtureId={fixtureId} />
        </div>
      )}
    </div>
  );
}
