"use client";

import { formatTime, type Drink } from "@/lib/types";

const SOURCE_LABEL: Record<Drink["source"], string> = {
  manual: "Manual",
  camera: "Camera",
  simulated: "Test",
};

export default function DrinkLog({
  drinks,
  onDelete,
}: {
  drinks: Drink[];
  onDelete: (id: string) => void;
}) {
  if (drinks.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No drinks logged yet today. Drink some water, or tap “I drank” below.
      </p>
    );
  }
  const sorted = [...drinks].sort((a, b) => b.timestamp - a.timestamp);
  return (
    <ul className="divide-y divide-slate-100">
      {sorted.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="text-lg">💧</span>
            <span className="font-semibold text-slate-800">{d.amountMl} ml</span>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
              {SOURCE_LABEL[d.source]}
            </span>
            <span className="text-slate-400">{formatTime(d.timestamp)}</span>
          </span>
          <button
            onClick={() => onDelete(d.id)}
            aria-label={`Delete ${d.amountMl} ml drink at ${formatTime(d.timestamp)}`}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
