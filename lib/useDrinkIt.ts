"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { db, getBottleImage, getBottleName, setBottleImage, setBottleName } from "./db";
import { loadSettings, saveSettings } from "./settings";
import {
  DEFAULT_SETTINGS,
  todayKey,
  uid,
  type Drink,
  type DrinkSource,
  type Settings,
} from "./types";

export function useDrinkIt() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [bottleImage, setBottleImageState] = useState<string | null>(null);
  const [bottleName, setBottleNameState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Clock tick so benchmarks / "behind" update live.
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSettingsState(loadSettings());
      try {
        const all = await db.drinks.orderBy("timestamp").toArray();
        if (!cancelled) setDrinks(all);
      } catch {
        setDrinks([]);
      }
      const [img, name] = await Promise.all([getBottleImage(), getBottleName()]);
      if (!cancelled) {
        setBottleImageState(img);
        setBottleNameState(name);
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const logDrink = useCallback(
    async (amountMl: number, source: DrinkSource): Promise<Drink> => {
      const drink: Drink = {
        id: uid(),
        date: todayKey(),
        timestamp: Date.now(),
        amountMl,
        source,
      };
      setDrinks((prev) => [...prev, drink].sort((a, b) => a.timestamp - b.timestamp));
      try {
        await db.drinks.add(drink);
      } catch {
        // IndexedDB unavailable — the in-memory log still shows for this session.
      }
      return drink;
    },
    []
  );

  const deleteDrink = useCallback(async (id: string) => {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
    try {
      await db.drinks.delete(id);
    } catch {
      // ignore
    }
  }, []);

  const clearToday = useCallback(async () => {
    const key = todayKey();
    setDrinks((prev) => prev.filter((d) => d.date !== key));
    try {
      await db.drinks.where("date").equals(key).delete();
    } catch {
      // ignore
    }
  }, []);

  const clearAllData = useCallback(async () => {
    setDrinks([]);
    setBottleImageState(null);
    setBottleNameState(null);
    try {
      await db.drinks.clear();
      await db.kv.clear();
    } catch {
      // ignore
    }
  }, []);

  const saveBottle = useCallback(async (dataUrl: string | null, name: string | null) => {
    setBottleImageState(dataUrl);
    setBottleNameState(name);
    await setBottleImage(dataUrl);
    if (name !== null) await setBottleName(name);
  }, []);

  const todayDrinks = useMemo(
    () => drinks.filter((d) => d.date === todayKey(now)),
    [drinks, now]
  );
  const todayMl = useMemo(
    () => todayDrinks.reduce((sum, d) => sum + d.amountMl, 0),
    [todayDrinks]
  );

  /** All drinks grouped by date, newest first — for History. */
  const byDate = useMemo(() => {
    const map = new Map<string, Drink[]>();
    for (const d of drinks) {
      const arr = map.get(d.date) ?? [];
      arr.push(d);
      map.set(d.date, arr);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => ({
        date,
        totalMl: list.reduce((s, x) => s + x.amountMl, 0),
        count: list.length,
        drinks: [...list].sort((a, b) => b.timestamp - a.timestamp),
      }));
  }, [drinks]);

  return {
    settings,
    updateSettings,
    drinks,
    todayDrinks,
    todayMl,
    byDate,
    bottleImage,
    bottleName,
    saveBottle,
    logDrink,
    deleteDrink,
    clearToday,
    clearAllData,
    loaded,
    now,
  };
}

export type DrinkIt = ReturnType<typeof useDrinkIt>;
