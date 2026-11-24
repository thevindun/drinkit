"use client";

import { useState } from "react";
import BottleCard from "@/components/BottleCard";
import CameraPanel from "@/components/CameraPanel";
import DrinkLog from "@/components/DrinkLog";
import ProgressRing from "@/components/ProgressRing";
import ReminderEngine from "@/components/ReminderEngine";
import { hourlyBenchmarks, nextBenchmark, targetNowMl } from "@/lib/benchmarks";
import { useDrinkIt } from "@/lib/useDrinkIt";
import { todayKey, type DrinkSource } from "@/lib/types";

const QUICK_AMOUNTS = [100, 200, 250, 500];

export default function TodayPage() {
  const {
    settings,
    todayDrinks,
    todayMl,
    bottleImage,
    bottleName,
    saveBottle,
    logDrink,
    deleteDrink,
    clearToday,
    loaded,
    now,
  } = useDrinkIt();
  const [justLogged, setJustLogged] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const target = targetNowMl(settings, now);
  const behindMl = Math.max(0, target - todayMl);
  const aheadMl = Math.max(0, todayMl - target);
  const next = nextBenchmark(settings, now);
  const benchmarks = hourlyBenchmarks(settings);
  const progressPct = Math.min(100, Math.round((todayMl / settings.dailyGoalMl) * 100));

  async function log(amountMl: number, source: DrinkSource) {
    await logDrink(amountMl, source);
    setJustLogged(
      source === "camera"
        ? `Camera detected a drink — +${amountMl} ml logged`
        : source === "simulated"
          ? `Test drink logged — +${amountMl} ml`
          : `+${amountMl} ml logged`
    );
    window.setTimeout(() => setJustLogged(""), 4000);
  }

  if (!loaded) {
    return <p className="text-slate-500">Loading your water data…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-sky-900">
          Today · {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </h1>
        <p className="text-sm text-slate-500">
          Active window {settings.wakeTime}–{settings.sleepTime} · Goal{" "}
          {settings.dailyGoalMl.toLocaleString()} ml
        </p>
      </div>

      <ReminderEngine
        settings={settings}
        todayMl={todayMl}
        onLogDrink={(ml) => void log(ml, "manual")}
      />

      {justLogged && (
        <p role="status" className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
          {justLogged}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 text-center shadow-sm">
          <ProgressRing drunkMl={todayMl} goalMl={settings.dailyGoalMl} />
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Benchmark so far:{" "}
            <strong className="text-sky-800">{target.toLocaleString()} ml</strong>
            {" · "}
            {behindMl > 0 ? (
              <span className="font-semibold text-amber-600">
                {behindMl.toLocaleString()} ml behind
              </span>
            ) : (
              <span className="font-semibold text-emerald-600">
                {aheadMl > 0
                  ? `${aheadMl.toLocaleString()} ml ahead — nice work`
                  : "Right on target"}
              </span>
            )}
          </p>
          {next && (
            <p className="mt-1 text-sm text-slate-500">
              Next benchmark: {next.label} — {next.targetMl.toLocaleString()} ml
            </p>
          )}

          <div className="mt-5">
            <button
              onClick={() => void log(settings.sipMl, "manual")}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 text-base font-bold text-white hover:bg-sky-600"
            >
              💧 I drank {settings.sipMl} ml
            </button>
            <div className="mt-2 flex justify-center gap-2">
              {QUICK_AMOUNTS.map((ml) => (
                <button
                  key={ml}
                  onClick={() => void log(ml, "manual")}
                  className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  +{ml} ml
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Tap when you drink — the camera tries to catch it automatically,
              this is the fallback.
            </p>
          </div>
        </div>

        <BottleCard
          bottleImage={bottleImage}
          bottleName={bottleName}
          bottleCapacityMl={settings.bottleCapacityMl}
          todayMl={todayMl}
          onSave={(img, name) => void saveBottle(img, name)}
        />
      </div>

      <CameraPanel
        sipMl={settings.sipMl}
        bottleImage={bottleImage}
        onDrink={(ml, source) => void log(ml, source)}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sky-900">Today&apos;s drinks</h2>
            {todayDrinks.length > 0 && (
              <button
                onClick={() => {
                  if (confirmClear) {
                    void clearToday();
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    window.setTimeout(() => setConfirmClear(false), 4000);
                  }
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                {confirmClear ? "Tap again to clear today" : "Clear today"}
              </button>
            )}
          </div>
          <div className="mt-3">
            <DrinkLog drinks={todayDrinks} onDelete={(id) => void deleteDrink(id)} />
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sky-900">Hourly benchmarks</h2>
          <p className="text-xs text-slate-400">
            Cumulative target by hour, {settings.wakeTime}–{settings.sleepTime}
          </p>
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {benchmarks.map((b) => {
              const reached = todayMl >= b.targetMl;
              const isNext = next?.label === b.label;
              return (
                <li
                  key={b.label}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                    isNext ? "bg-amber-50 font-semibold text-amber-800" : "text-slate-600"
                  }`}
                >
                  <span>
                    {isNext ? "→ " : ""}
                    {b.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {b.targetMl.toLocaleString()} ml
                    <span className={reached ? "text-emerald-600" : "text-slate-300"}>
                      {reached ? "✓" : "○"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Date key for today: {todayKey(now)} — progress resets at midnight,
            history is kept.
          </p>
        </div>
      </div>
    </div>
  );
}
