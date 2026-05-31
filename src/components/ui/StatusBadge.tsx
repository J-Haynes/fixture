import type { FixtureStatus } from '@/lib/types';

interface Config {
  label: string;
  className: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Partial<Record<FixtureStatus, Config>> = {
  live:      { label: 'Live',      className: 'bg-emerald-500/20 text-emerald-400 font-bold', pulse: true },
  finished:  { label: 'FT',        className: 'bg-zinc-800 text-zinc-500' },
  postponed: { label: 'PPD',       className: 'bg-amber-500/20 text-amber-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
  // 'scheduled' has no badge — kickoff time acts as the indicator
};

interface Props {
  status: FixtureStatus;
}

export function StatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.className}`}>
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}
