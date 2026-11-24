export default function ProgressRing({
  drunkMl,
  goalMl,
}: {
  drunkMl: number;
  goalMl: number;
}) {
  const pct = goalMl > 0 ? Math.min(1, drunkMl / goalMl) : 0;
  const r = 84;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-48 w-48">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#e0f2fe" strokeWidth="16" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-sky-900">
          {drunkMl.toLocaleString()}
          <span className="text-base font-medium text-slate-500"> ml</span>
        </span>
        <span className="text-sm text-slate-500">
          of {goalMl.toLocaleString()} ml goal
        </span>
        <span className="mt-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}
