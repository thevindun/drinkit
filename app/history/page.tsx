"use client";

import { useMemo } from "react";
import DrinkLog from "@/components/DrinkLog";
import { useDrinkIt } from "@/lib/useDrinkIt";
import { formatDateKey, todayKey } from "@/lib/types";

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

export default function HistoryPage() {
  const { settings, byDate, deleteDrink, loaded } = useDrinkIt();

  const days = useMemo(() => {
    const keys = lastNDays(14);
    const map = new Map(byDate.map((d) => [d.date, d]));
    return keys.map((k) => ({
      date: k,
      totalMl: map.get(k)?.totalMl ?? 0,
      count: map.get(k)?.count ?? 0,
    }));
  }, [byDate]);

  const last7 = days.slice(-7);
  const maxBar = Math.max(settings.dailyGoalMl, ...last7.map((d) => d.totalMl));

  // Streak: consecutive days ending today (or yesterday if today isn't met yet)
  // where the daily goal was reached.
  const streak = useMemo(() => {
    const totals = new Map(days.map((d) => [d.date, d.totalMl]));
    let count = 0;
    const d = new Date();
    if ((totals.get(todayKey(d)) ?? 0) < settings.dailyGoalMl) {
      d.setDate(d.getDate() - 1);
    }
    while ((totals.get(todayKey(d)) ?? 0) >= settings.dailyGoalMl) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [days, settings.dailyGoalMl]);

  const total14 = days.reduce((s, d) => s + d.totalMl, 0);
  const daysLogged = days.filter((d) => d.count > 0).length;
  const avgPerDay = daysLogged > 0 ? Math.round(total14 / 14) : 0;

  if (!loaded) return <p className="text-slate-500">Loading history…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-sky-900">History</h1>
        <p className="text-sm text-slate-500">
          Your water, day by day. Goal: {settings.dailyGoalMl.toLocaleString()} ml/day.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-sky-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-sky-800">🔥 {streak}</p>
          <p className="text-xs text-slate-500">day goal streak</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-sky-800">{total14.toLocaleString()} ml</p>
          <p className="text-xs text-slate-500">last 14 days</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-sky-800">{avgPerDay.toLocaleString()} ml</p>
          <p className="text-xs text-slate-500">avg per day (14d)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-900">Last 7 days</h2>
        <div className="mt-4 flex h-40 items-end gap-2">
          {last7.map((d) => {
            const pct = Math.min(100, Math.round((d.totalMl / maxBar) * 100));
            const met = d.totalMl >= settings.dailyGoalMl;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-slate-600">
                  {d.totalMl > 0 ? `${(d.totalMl / 1000).toFixed(1)}L` : "—"}
                </span>
                <div
                  className={`w-full rounded-t-lg ${met ? "bg-sky-500" : "bg-sky-200"}`}
                  style={{ height: `${Math.max(d.totalMl > 0 ? 6 : 2, pct)}%` }}
                  title={`${formatDateKey(d.date)}: ${d.totalMl} ml`}
                />
                <span className="text-[11px] text-slate-500">
                  {new Date(
                    Number(d.date.slice(0, 4)),
                    Number(d.date.slice(5, 7)) - 1,
                    Number(d.date.slice(8, 10))
                  ).toLocaleDateString([], { weekday: "short" })}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Dark bars = goal met ({settings.dailyGoalMl.toLocaleString()} ml). Light
          bars = under goal.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-900">Daily totals — last 14 days</h2>
        {days.every((d) => d.count === 0) ? (
          <p className="mt-3 text-sm text-slate-500">
            Nothing logged yet. Log a drink on the Today page and it will show
            up here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {[...days].reverse().map((d) => (
              <li key={d.date} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{formatDateKey(d.date)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-400">{d.count} drink{d.count === 1 ? "" : "s"}</span>
                  <span className={`font-semibold ${d.totalMl >= settings.dailyGoalMl ? "text-emerald-600" : "text-slate-800"}`}>
                    {d.totalMl.toLocaleString()} ml
                    {d.totalMl >= settings.dailyGoalMl ? " ✓" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {byDate.map((day) => (
        <div
          key={day.date}
          className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-sky-900">
            {formatDateKey(day.date)} · {day.totalMl.toLocaleString()} ml
          </h2>
          <div className="mt-3">
            <DrinkLog drinks={day.drinks} onDelete={(id) => void deleteDrink(id)} />
          </div>
        </div>
      ))}
    </div>
  );
}
