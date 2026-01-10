interface ReliabilityBadgeProps {
  strikes?: number | null;
  className?: string;
}

export function ReliabilityBadge({ strikes, className }: ReliabilityBadgeProps) {
  const n = typeof strikes === 'number' && Number.isFinite(strikes) ? strikes : 0;

  if (n <= 0) {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        Reliable
      </span>
    );
  }

  if (n === 1) {
    return (
      <span
        className={[
          'inline-flex items-center rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-800 ring-1 ring-yellow-500/30',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        Reliability: 1 strike
      </span>
    );
  }

  // Spec: red warning if strikes == 2. We also treat >=2 as warning.
  return (
    <span
      className={[
        'inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-500/30',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      Reliability warning
    </span>
  );
}

