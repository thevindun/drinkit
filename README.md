# DrinkIt 💧

Camera-assisted water tracking. Your laptop webcam watches for drinking,
auto-logs it, tracks hourly benchmarks through the day, and nags gently
until you hit your goal.

- **Today** — progress ring, benchmark for right now, manual logging,
  bottle card, live camera detection.
- **History** — streak, 14-day totals, 7-day chart, per-drink log.
- **Settings** — wake/sleep times, daily goal, sip amount, bottle capacity,
  reminder toggles, data export / erase.

## Privacy

Video is processed in your browser only (MediaPipe Tasks Vision) and never
leaves the device. All data lives in IndexedDB / localStorage on your
device. No account, no backend, no server.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Deploy to Vercel

No environment variables are required.

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo.
3. Framework preset: **Next.js**. Leave build command (`next build`) and
   output as defaults.
4. Deploy. Camera and notifications need HTTPS — Vercel provides it.

Note: camera access and browser notifications only work while the tab is
open, and the browser will ask for camera / notification permission on
first use.

## Detection — how it works

MediaPipe PoseLandmarker (wrist + mouth landmarks) + ObjectDetector
(COCO `bottle` / `cup`) run in the browser. A drink is logged when a
bottle is near the mouth **and** a wrist is near the mouth, held for
~1.5 seconds, with a 30-second cooldown. If the models can't load or the
camera is denied, manual logging and the **Test detection / Simulate
drink** button still work.

Detection is an estimate: good light, the bottle visible in frame, and
holding the drink for a second or two help. It can miss drinks and can
occasionally false-positive (e.g. eating) — the log lets you delete any
wrong entry.

## Scope

See `SCOPE.md`. v1 is local-only, single user. Accounts / Supabase sync
and Google Calendar auto-windows are v2 and intentionally not built here.
