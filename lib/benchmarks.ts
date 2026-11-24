import type { Settings } from "./types";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Minutes of the active window, handling a window that crosses midnight. */
export function activeWindowMinutes(s: Settings): number {
  const wake = timeToMinutes(s.wakeTime);
  const sleep = timeToMinutes(s.sleepTime);
  if (sleep > wake) return sleep - wake;
  return 24 * 60 - wake + sleep;
}

export function isSleepHours(s: Settings, now = new Date()): boolean {
  const wake = timeToMinutes(s.wakeTime);
  const sleep = timeToMinutes(s.sleepTime);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (sleep > wake) return cur < wake || cur >= sleep;
  return cur >= sleep && cur < wake;
}

/**
 * Cumulative ml target for right now, ramping linearly from wake to sleep.
 * Before wake: 0. After sleep: full daily goal.
 */
export function targetNowMl(s: Settings, now = new Date()): number {
  const wake = timeToMinutes(s.wakeTime);
  const sleep = timeToMinutes(s.sleepTime);
  const cur = now.getHours() * 60 + now.getMinutes();
  let elapsed: number;
  const total = activeWindowMinutes(s);
  if (sleep > wake) {
    if (cur <= wake) elapsed = 0;
    else if (cur >= sleep) elapsed = total;
    else elapsed = cur - wake;
  } else {
    // Overnight window, e.g. wake 22:00, sleep 06:00.
    if (cur >= wake) elapsed = cur - wake;
    else if (cur < sleep) elapsed = 24 * 60 - wake + cur;
    else elapsed = total;
  }
  return Math.round((s.dailyGoalMl * elapsed) / total);
}

/** Hourly benchmark rows for the day: [{ label: "06:00", targetMl }]. */
export function hourlyBenchmarks(s: Settings): { label: string; targetMl: number }[] {
  const total = activeWindowMinutes(s);
  const wake = timeToMinutes(s.wakeTime);
  const rows: { label: string; targetMl: number }[] = [];
  const hours = Math.max(1, Math.round(total / 60));
  for (let i = 1; i <= hours; i++) {
    const mins = wake + i * 60;
    const h = Math.floor((mins % (24 * 60)) / 60);
    const m = mins % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    rows.push({
      label,
      targetMl: Math.round((s.dailyGoalMl * i) / hours),
    });
  }
  return rows;
}

/** Next benchmark that has not yet been reached (by time), if any. */
export function nextBenchmark(
  s: Settings,
  now = new Date()
): { label: string; targetMl: number } | null {
  const rows = hourlyBenchmarks(s);
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const r of rows) {
    if (timeToMinutes(r.label) > cur) return r;
  }
  return null;
}
