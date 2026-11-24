"use client";

import { useState } from "react";
import { requestNotificationPermission } from "@/lib/sound";
import { useDrinkIt } from "@/lib/useDrinkIt";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none";

export default function SettingsPage() {
  const { settings, updateSettings, clearAllData, drinks, loaded } = useDrinkIt();
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [notifPerm, setNotifPerm] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  function flashSaved() {
    setSavedNote("Saved ✓");
    window.setTimeout(() => setSavedNote(""), 2500);
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ settings, drinks, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drinkit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) return <p className="text-slate-500">Loading settings…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-sky-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Everything is stored on this device only. Changes save automatically.
        </p>
        {savedNote && (
          <p role="status" className="mt-2 text-sm font-medium text-emerald-600">
            {savedNote}
          </p>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-900">Your day</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Wake time" hint="Benchmarks start here.">
            <input
              type="time"
              className={inputCls}
              value={settings.wakeTime}
              onChange={(e) => {
                updateSettings({ wakeTime: e.target.value });
                flashSaved();
              }}
            />
          </Field>
          <Field label="Sleep time" hint="Reminders stop here.">
            <input
              type="time"
              className={inputCls}
              value={settings.sleepTime}
              onChange={(e) => {
                updateSettings({ sleepTime: e.target.value });
                flashSaved();
              }}
            />
          </Field>
          <Field label="Daily goal (ml)" hint="Total water for the day.">
            <input
              type="number"
              min={500}
              max={10000}
              step={100}
              className={inputCls}
              value={settings.dailyGoalMl}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) {
                  updateSettings({ dailyGoalMl: v });
                  flashSaved();
                }
              }}
            />
          </Field>
          <Field label="Amount per detected drink (ml)" hint="Logged each time the camera detects a drink.">
            <input
              type="number"
              min={50}
              max={1000}
              step={50}
              className={inputCls}
              value={settings.sipMl}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) {
                  updateSettings({ sipMl: v });
                  flashSaved();
                }
              }}
            />
          </Field>
          <Field label="Bottle capacity (ml)" hint="Used for the bottle fill graphic.">
            <input
              type="number"
              min={100}
              max={5000}
              step={50}
              className={inputCls}
              value={settings.bottleCapacityMl}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) {
                  updateSettings({ bottleCapacityMl: v });
                  flashSaved();
                }
              }}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-900">Reminders</h2>
        <p className="text-sm text-slate-500">
          Gentle first: an in-app toast, then a browser notification at +5 min,
          then sound + a persistent banner at +10 min, repeating every{" "}
          {settings.repeatMinutes} min while you&apos;re behind. Snooze 15 min
          and focus pause (1 hour) are on the reminder itself.
        </p>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={settings.remindersEnabled}
            onChange={(e) => {
              updateSettings({ remindersEnabled: e.target.checked });
              flashSaved();
            }}
            className="h-5 w-5 accent-sky-500"
          />
          Reminders enabled
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => {
              updateSettings({ soundEnabled: e.target.checked });
              flashSaved();
            }}
            className="h-5 w-5 accent-sky-500"
          />
          Sound (gentle chime)
        </label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => {
              updateSettings({ notificationsEnabled: e.target.checked });
              flashSaved();
            }}
            className="h-5 w-5 accent-sky-500"
          />
          Browser notifications
        </label>
        <div>
          <button
            onClick={async () => {
              const p = await requestNotificationPermission();
              setNotifPerm(p);
            }}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
          >
            {notifPerm === "granted"
              ? "Notifications enabled ✓"
              : "Enable browser notifications"}
          </button>
          {notifPerm === "denied" && (
            <p className="mt-1 text-xs text-slate-400">
              Notifications are blocked — allow them in your browser&apos;s site
              settings to re-enable.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-sky-900">Your data</h2>
        <p className="text-sm text-slate-500">
          {drinks.length} drink{drinks.length === 1 ? "" : "s"} stored locally
          in IndexedDB on this device. No account, no server, nothing uploaded.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportData}
            className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
          >
            Download my data (JSON)
          </button>
          <button
            onClick={() => {
              if (confirmReset) {
                void clearAllData();
                setConfirmReset(false);
                flashSaved();
              } else {
                setConfirmReset(true);
                window.setTimeout(() => setConfirmReset(false), 4000);
              }
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            {confirmReset
              ? "Tap again to erase ALL DrinkIt data"
              : "Erase all data"}
          </button>
        </div>
      </section>
    </div>
  );
}
