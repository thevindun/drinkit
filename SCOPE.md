# DrinkIt — Locked Scope v1

Repo: https://github.com/thevindun/drinkit
Status: Scope locked 2026-11-24, based on Thev's answers. No code yet.

## 1. Problem
Thev works on his laptop for long stretches and forgets to drink water. He wants the app to notice, remind him gently, and not stop until he has actually drunk enough for that period.

## 2. Product in one sentence
A web app that watches (on-device, via laptop webcam) for drinking, auto-logs it, tracks daily benchmarks, and nags gently until you are caught up.

## 3. Core loop
1. User sets wake/sleep times and a daily goal.
2. App creates benchmarks through the day (cumulative target by time).
3. At a benchmark, if behind, app gives a gentle heads-up.
4. If still behind, it escalates slowly: in-app toast -> browser notification -> sound + persistent banner, repeating every 10 min.
5. User drinks. Camera detects bottle-to-mouth, auto-logs a drink, banner/notification stops.
6. Manual "I drank" is always available as fallback.
7. Progress, history, and streaks are visible.

## 4. Decisions from Thev (2026-11-24)

### Camera — Option A, auto-detect
- Camera auto-detects lifting bottle/cup to mouth and auto-checks it off.
- No video leaves the laptop. All detection runs in the browser.
- Manual check-in is fallback only, not the main path.

### Bottle
- User uploads a photo of their bottle.
- That photo is used for:
  - The bottle graphic/card in the app UI (updated to their bottle)
  - Reference matching, to increase confidence the detected bottle is *their* bottle, not any bottle
- Laptop is in front of the bottle / user while working, webcam facing user.

### Schedule / benchmarks
- Benchmarks throughout the day, not just a single daily total.
- Active window derived from:
  - v1: wake/sleep times set by user (defaults below)
  - v2: Google Calendar — earliest and latest block of the day sets the active window, with manual override
- If a benchmark is missed on time, warn and keep pinging until the limit for that time is hit.
- Must not be annoying or disruptive: gentle first, slow escalation, snooze, quiet hours, focus pause.

### Defaults I am setting (editable in Settings)
- Wake: 05:30, Sleep: 22:30 — based on Thev's calendar (earliest block 05:15, latest 20:45)
- Daily goal: 2,500 ml
- Sip / detected drink session: 200 ml (editable, 100-500 ml)
- Bottle capacity: user sets on upload, default 1,000 ml
- Benchmark: hourly cumulative target, e.g. 2,500 ml / 17h ≈ 147 ml/hour
- Reminder escalation: 0 min gentle toast, +5 min browser notification, +10 min sound + persistent banner, repeat every 10 min while behind
- Snooze: 15 min. Focus pause: 1 hour. No reminders in sleep hours.

### Tracking / history
- Yes: today progress, per-drink log, daily history, weekly chart, streak.
- Data storage recommendation:
  - v1: Local-first, IndexedDB (Dexie) + localStorage for settings. Bottle photo stored locally. Works offline, no account needed, private by default.
  - v2: Optional account with Supabase Auth + Postgres, syncs history across devices. This is the path for public launch.
  - Do NOT build a custom backend / custom auth in v1.

### Tech stack — picked for reliability + Vercel
- Next.js (App Router) + TypeScript + Tailwind CSS
- MediaPipe Tasks Vision in-browser: PoseLandmarker + ObjectDetector (COCO "bottle")
- Detection state machine: bottle visible + wrist near mouth + hold 1.5s = drink, 30s cooldown to avoid double-count
- Dexie / IndexedDB for local data
- Vercel for hosting, PWA-capable so it can stay open / installable
- No server-side video processing, no video upload

### Camera-on time
- Yes, camera may stay on all day while the app tab is open.
- Show a clear live preview + on/off indicator, and a big Camera Off toggle. Camera turns off when tab is hidden for a long time? v1: stays on while tab open, user can pause.

### Audience
- v1: Thev only, single user, no login.
- Later: public. Design for multi-user, privacy, and accounts from the start, but do not build them in v1.

### Definition of done for v1
- App auto-tracks water consumption via camera and pings until daily/hourly goals are hit.
- Works for a full day on Thev's laptop, in real lighting, with his bottle.
- Manual fallback, history, and Vercel deployment all working.

## 5. Out of scope for v1
- Phone app / mobile camera detection
- Google Calendar auto-window (v2)
- Accounts, Supabase sync, sharing, social (v2)
- Smart bottle / hardware sensor
- Precise ml measurement from video (we estimate per sip session, user can correct)
- Medical advice, exact hydration needs

## 6. Risks / honest notes
- Drinking detection is not perfect. Lighting, angle, occlusion, eating, phone calls can cause misses / false positives. That is why manual fallback + cooldown + confidence threshold are required.
- Browser notifications/sound only work reliably while the tab is open. Closing the laptop / tab pauses tracking.
- Estimating ml per drink is an estimate, not a measurement.

## 7. Repo structure (planned)
```
drinkit/
  app/
    page.tsx              # Today dashboard, camera, progress
    settings/page.tsx     # Wake/sleep, goal, bottle, reminders
    history/page.tsx      # History, charts, streak
  components/
    CameraPanel.tsx
    BottleCard.tsx
    BenchmarkBar.tsx
    ReminderBanner.tsx
    DrinkLog.tsx
  lib/
    detection.ts          # MediaPipe, bottle matching, drink state machine
    benchmarks.ts         # Active window, hourly targets, behind/ahead
    reminders.ts          # Notification, sound, escalation, snooze
    db.ts                 # Dexie / IndexedDB
    settings.ts
  public/
```

## 8. Build plan
- M1: Scaffold Next.js + Tailwind on Vercel, Today UI, manual logging, benchmarks, local DB
- M2: Bottle upload + camera preview + MediaPipe detection prototype, drink state machine
- M3: Reminder escalation, notifications, sound, snooze, history/charts
- M4: Polish, PWA, Vercel deploy, full-day test with Thev's bottle
- M5 (later): Supabase accounts, Calendar window, public launch prep
