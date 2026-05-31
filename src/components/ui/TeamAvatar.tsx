'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Team } from '@/lib/types';

// Deterministic colour per team — replaced by real logos when available.
const COLOURS = [
  'bg-blue-600',   'bg-red-600',    'bg-emerald-600', 'bg-purple-600',
  'bg-amber-600',  'bg-indigo-600', 'bg-pink-600',    'bg-cyan-600',
  'bg-orange-600', 'bg-teal-600',   'bg-violet-600',  'bg-rose-600',
];

const SIZE_MAP = {
  sm: { px: 32, cls: 'w-8 h-8 text-[10px]' },
  md: { px: 40, cls: 'w-10 h-10 text-xs'   },
} as const;

interface Props {
  team: Team;
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
        className={`${cls} rounded-lg object-contain`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${cls} ${colour} rounded-lg flex items-center justify-center text-white font-bold shrink-0`}
      aria-label={team.name}
    >
      {initials}
    </div>
  );
}
