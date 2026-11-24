export type DrinkSource = "manual" | "camera" | "simulated";

export interface Drink {
  id: string;
  /** Local date YYYY-MM-DD */
  date: string;
  timestamp: number;
  amountMl: number;
  source: DrinkSource;
}

export interface Settings {
  wakeTime: string; // "05:30"
  sleepTime: string; // "22:30"
  dailyGoalMl: number; // 2500
  sipMl: number; // 200 — amount logged per auto-detected drink
  bottleCapacityMl: number; // 1000
  remindersEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  /** Minutes between repeat escalated pings while behind. */
  repeatMinutes: number; // 10
}

export const DEFAULT_SETTINGS: Settings = {
  wakeTime: "05:30",
  sleepTime: "22:30",
  dailyGoalMl: 2500,
  sipMl: 200,
  bottleCapacityMl: 1000,
  remindersEnabled: true,
  soundEnabled: true,
  notificationsEnabled: true,
  repeatMinutes: 10,
};

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}
