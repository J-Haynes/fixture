import Image from 'next/image';
import type { Team } from '@/lib/types';

// Deterministic colour per team based on id — stays consistent until logos arrive.
const COLOURS = [
  'bg-blue-500', 'bg-red-500',    'bg-emerald-500', 'bg-purple-500',
  'bg-amber-500', 'bg-indigo-500', 'bg-pink-500',    'bg-cyan-500',
  'bg-orange-500', 'bg-teal-500',  'bg-violet-500',  'bg-rose-500',
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
  const { px, cls } = SIZE_MAP[size];
  const colour = COLOURS[team.id % COLOURS.length];
  const initials = (team.shortName ?? team.name).slice(0, 3).toUpperCase();

  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={px}
        height={px}
        className={`${cls} rounded-full object-contain`}
      />
    );
  }

  return (
    <div
      className={`${cls} ${colour} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      aria-label={team.name}
    >
      {initials}
    </div>
  );
}
