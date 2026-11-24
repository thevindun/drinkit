import Dexie, { type Table } from "dexie";
import type { Drink } from "./types";

interface KvRow {
  key: string;
  value: string;
}

class DrinkItDB extends Dexie {
  drinks!: Table<Drink, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super("DrinkItDB");
    this.version(1).stores({
      drinks: "id, date, timestamp",
      kv: "key",
    });
  }
}

export const db = new DrinkItDB();

export async function getBottleImage(): Promise<string | null> {
  try {
    const row = await db.kv.get("bottleImage");
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setBottleImage(dataUrl: string | null): Promise<void> {
  try {
    if (dataUrl === null) {
      await db.kv.delete("bottleImage");
    } else {
      await db.kv.put({ key: "bottleImage", value: dataUrl });
    }
  } catch {
    // IndexedDB unavailable — bottle photo just won't persist.
  }
}

export async function getBottleName(): Promise<string | null> {
  try {
    const row = await db.kv.get("bottleName");
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setBottleName(name: string): Promise<void> {
  try {
    await db.kv.put({ key: "bottleName", value: name });
  } catch {
    // ignore
  }
}
