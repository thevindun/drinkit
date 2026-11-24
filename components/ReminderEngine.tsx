"use client";

import { useEffect, useRef, useState } from "react";
import { isSleepHours, targetNowMl } from "@/lib/benchmarks";
import { notifyBrowser, playChime, requestNotificationPermission } from "@/lib/sound";
import type { Settings } from "@/lib/types";

const SNOOZE_KEY = "drinkit.snoozeUntil.v1";
const FOCUS_KEY = "drinkit.focusUntil.v1";

function readTs(key: string): number {
  try {
    return Number(window.localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export default function ReminderEngine({
  settings,
  todayMl,
  onLogDrink,
}: {
  settings: Settings;
  todayMl: number;
  onLogDrink: (amountMl: number) => void;
}) {
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const [focusUntil, setFocusUntil] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const behindSinceRef = useRef<number | null>(null);
  const lastPingRef = useRef(0);
  const lastStageRef = useRef(-1);

  useEffect(() => {
    setSnoozeUntil(readTs(SNOOZE_KEY));
    setFocusUntil(readTs(FOCUS_KEY));
  }, []);

  const now = Date.now();
  const sleeping = isSleepHours(settings);
  const paused = snoozeUntil > now || focusUntil > now;
  const target = targetNowMl(settings);
  const behindMl = Math.max(0, target - todayMl);
  const behind = behindMl > 0 && !sleeping;

  // Escalation engine — runs every 20s and whenever the totals change.
  useEffect(() => {
    if (!settings.remindersEnabled || !behind || paused) {
      if (!behind) {
        behindSinceRef.current = null;
        lastStageRef.current = -1;
        setShowToast(false);
        setShowBanner(false);
      }
      return;
    }
    const check = () => {
      const t = Date.now();
      if (behindSinceRef.current === null) behindSinceRef.current = t;
      const elapsedMin = (t - behindSinceRef.current) / 60000;
      const stage = elapsedMin < 5 ? 0 : elapsedMin < 10 ? 1 : 2;
      if (stage === 0) {
        setShowToast(true);
        setShowBanner(false);
      } else if (stage === 1) {
        setShowToast(true);
        setShowBanner(false);
        if (lastStageRef.current !== 1) {
          notifyBrowser(
            "DrinkIt — time for water",
            `You're ${behindMl} ml behind your benchmark. Have a drink.`
          );
        }
      } else {
        setShowBanner(true);
        setShowToast(false);
        if (
          lastStageRef.current !== 2 ||
          t - lastPingRef.current > settings.repeatMinutes * 60000
        ) {
          if (settings.soundEnabled) playChime();
          if (settings.notificationsEnabled) {
            notifyBrowser(
              "DrinkIt — still behind on water",
              `You're ${behindMl} ml behind. Drink ${settings.sipMl} ml to catch up.`
            );
          }
          lastPingRef.current = t;
        }
      }
      lastStageRef.current = stage;
    };
    check();
    const id = window.setInterval(check, 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    behind,
    paused,
    settings.remindersEnabled,
    settings.notificationsEnabled,
    settings.soundEnabled,
    settings.repeatMinutes,
    settings.sipMl,
    behindMl,
  ]);

  function snooze(minutes: number) {
    const until = Date.now() + minutes * 60000;
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(until));
    } catch {
      // ignore
    }
    setSnoozeUntil(until);
    setShowToast(false);
    setShowBanner(false);
  }

  function focusPause() {
    const until = Date.now() + 60 * 60000;
    try {
      window.localStorage.setItem(FOCUS_KEY, String(until));
    } catch {
      // ignore
    }
    setFocusUntil(until);
    setShowToast(false);
    setShowBanner(false);
  }

  async function enableNotifications() {
    const p = await requestNotificationPermission();
    setNotifPerm(p);
  }

  const pausedLabel =
    focusUntil > now
      ? `Focus pause until ${new Date(focusUntil).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : snoozeUntil > now
        ? `Snoozed until ${new Date(snoozeUntil).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : null;

  return (
    <>
      {showBanner && behind && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm"
        >
          <p className="font-semibold text-amber-900">
            💧 You&apos;re {behindMl} ml behind your water benchmark
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Target so far today is {target.toLocaleString()} ml, you&apos;ve had{" "}
            {todayMl.toLocaleString()} ml. Have a drink — this banner stays
            until you catch up.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onLogDrink(settings.sipMl)}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              I drank {settings.sipMl} ml
            </button>
            <button
              onClick={() => snooze(15)}
              className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Snooze 15 min
            </button>
            <button
              onClick={focusPause}
              className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              Focus pause 1 hour
            </button>
          </div>
        </div>
      )}

      {pausedLabel && (
        <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          Reminders paused — {pausedLabel}. They resume automatically.
        </p>
      )}

      {sleeping && (
        <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          Sleep hours ({settings.wakeTime}–{settings.sleepTime} active window) —
          reminders are off until you wake.
        </p>
      )}

      {!settings.remindersEnabled && (
        <p className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          Reminders are off. Turn them on in Settings to get pinged when
          you&apos;re behind.
        </p>
      )}

      {settings.remindersEnabled && notifPerm === "default" && (
        <button
          onClick={() => void enableNotifications()}
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
        >
          Enable browser notifications
        </button>
      )}

      {showToast && !showBanner && behind && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-sky-900 p-4 text-white shadow-xl">
          <p className="font-semibold">💧 Time for water</p>
          <p className="mt-1 text-sm text-sky-100">
            You&apos;re {behindMl} ml behind your benchmark. Have a drink.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onLogDrink(settings.sipMl)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-sky-900"
            >
              I drank {settings.sipMl} ml
            </button>
            <button
              onClick={() => snooze(15)}
              className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-medium text-sky-100"
            >
              Snooze 15 min
            </button>
            <button
              onClick={() => setShowToast(false)}
              aria-label="Dismiss reminder"
              className="ml-auto rounded-lg px-2 text-sky-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
