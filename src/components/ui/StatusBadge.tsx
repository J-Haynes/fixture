import type { FixtureStatus } from '@/lib/types';

interface Config {
  label: string;
  className: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Partial<Record<FixtureStatus, Config>> = {
  live:       { label: 'Live',      className: 'bg-green-100 text-green-700 font-bold', pulse: true },
  finished:   { label: 'FT',        className: 'bg-slate-100 text-slate-500' },
  postponed:  { label: 'PPD',       className: 'bg-amber-100 text-amber-700' },
  cancelled:  { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  // 'scheduled' intentionally omitted — the kickoff time acts as the indicator
};

interface Props {
  status: FixtureStatus;
}

export function StatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${cfg.className}`}
    >
      {cfg.pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-600" />
        </span>
      )}
      {cfg.label}
    </span>
  );
}
