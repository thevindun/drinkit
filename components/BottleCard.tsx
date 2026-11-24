"use client";

import { useRef, useState } from "react";

export default function BottleCard({
  bottleImage,
  bottleName,
  bottleCapacityMl,
  todayMl,
  onSave,
}: {
  bottleImage: string | null;
  bottleName: string | null;
  bottleCapacityMl: number;
  todayMl: number;
  onSave: (dataUrl: string | null, name: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  // How much of one bottle is left, based on today's total.
  const inCurrentBottle = bottleCapacityMl > 0 ? todayMl % bottleCapacityMl : 0;
  const fillPct =
    bottleCapacityMl > 0
      ? Math.min(100, Math.round((inCurrentBottle / bottleCapacityMl) * 100))
      : 0;
  const bottlesDone = bottleCapacityMl > 0 ? Math.floor(todayMl / bottleCapacityMl) : 0;

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("That photo is over 4 MB — please pick a smaller one.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      // Downscale to max 800px so IndexedDB stays small.
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          onSave(dataUrl, file.name);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        onSave(canvas.toDataURL("image/jpeg", 0.85), file.name);
      };
      img.onerror = () => onSave(dataUrl, file.name);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-sky-900">Your bottle</h2>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-36 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-sky-200 bg-sky-50">
          <div
            className="absolute bottom-0 left-0 right-0 bg-sky-400/70 transition-all duration-700"
            style={{ height: `${fillPct}%` }}
          />
          {bottleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bottleImage}
              alt={bottleName ?? "Your bottle"}
              className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              🍼
            </div>
          )}
          <span className="absolute bottom-1 left-0 right-0 text-center text-[11px] font-bold text-sky-900">
            {fillPct}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700">
            {bottleName ?? "No bottle photo yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Capacity: {bottleCapacityMl.toLocaleString()} ml
          </p>
          <p className="text-sm text-slate-500">
            {bottlesDone} bottle{bottlesDone === 1 ? "" : "s"} finished today
            {inCurrentBottle > 0 ? ` · ${inCurrentBottle} ml into this one` : ""}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Your photo is used for this graphic and as a colour reference so
            detection can recognise your bottle.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
            >
              {bottleImage ? "Change photo" : "Upload bottle photo"}
            </button>
            {bottleImage && (
              <button
                onClick={() => onSave(null, null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
