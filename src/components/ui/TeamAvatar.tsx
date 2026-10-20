'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Team } from '@/lib/types';

// Deterministic colour per team, for teams without a logo (shown as initials).
// Muted so a logo-less team doesn't outshout the league bands.
const COLOURS = [
  'bg-blue-800',   'bg-red-800',    'bg-emerald-800', 'bg-purple-800',
  'bg-amber-800',  'bg-indigo-800', 'bg-pink-800',    'bg-cyan-800',
  'bg-orange-800', 'bg-teal-800',   'bg-violet-800',  'bg-rose-800',
];

const SIZE_MAP = {
  xs: { px: 24, cls: 'w-6 h-6 text-[8px]'   },
  row: { px: 28, cls: 'w-7 h-7 text-[9px]' },
  sm: { px: 32, cls: 'w-8 h-8 text-[10px]' },
  md: { px: 40, cls: 'w-10 h-10 text-xs'   },
  lg: { px: 48, cls: 'w-[48px] h-[48px] text-xs' },
} as const;

interface Props {
  team: Pick<Team, 'id' | 'name' | 'shortName' | 'logoUrl'>;
  size?: keyof typeof SIZE_MAP;
}

export function TeamAvatar({ team, size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false);

  const { px, cls } = SIZE_MAP[size];
  const colour = COLOURS[team.id % COLOURS.length];
  const initials = (team.shortName ?? team.name).slice(0, 3).toUpperCase();

  if (team.logoUrl && !imgError) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={px}
        height={px}
        className={`${cls} shrink-0 object-contain`}
        // Logos in /public are pre-sized to 144px, so skip the image optimizer
        unoptimized
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${cls} ${colour} rounded-full flex items-center justify-center text-white font-bold tracking-tight shrink-0`}
      aria-label={team.name}
    >
      {initials}
    </div>
  );
}
