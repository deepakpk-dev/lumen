interface Point {
  date: string;
  value: number;
}

export function BbtChart({
  points,
  coverline,
  ovulationDate,
  unit,
}: {
  points: Point[];
  coverline?: number;
  ovulationDate?: string;
  unit: 'C' | 'F';
}) {
  if (points.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Log your temperature to see your BBT chart.
      </p>
    );
  }

  const W = 320;
  const H = 160;
  const pad = 24;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, coverline ?? Infinity) - 0.1;
  const hi = Math.max(...values, coverline ?? -Infinity) + 0.1;
  const x = (i: number) =>
    pad + (i * (W - 2 * pad)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);

  const path = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-neutral-600 dark:text-neutral-300" role="img" aria-label={`BBT chart in °${unit}`}>
      {coverline !== undefined && (
        <line
          x1={pad}
          x2={W - pad}
          y1={y(coverline)}
          y2={y(coverline)}
          stroke="#f43f5e"
          strokeDasharray="4 3"
        />
      )}
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.value)}
          r={p.date === ovulationDate ? 5 : 3}
          fill={p.date === ovulationDate ? '#f43f5e' : 'currentColor'}
        />
      ))}
    </svg>
  );
}
