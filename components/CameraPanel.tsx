"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ObjectDetector, PoseLandmarker } from "@mediapipe/tasks-vision";
import { averageColor, colorDistance } from "@/lib/bottleColor";
import type { DrinkSource } from "@/lib/types";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const OBJECT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite";

const HOLD_MS = 1500;
const COOLDOWN_MS = 30_000;

type ModelState = "idle" | "loading" | "ready" | "error";

interface Flags {
  person: boolean;
  bottle: boolean;
  bottleMatched: boolean;
  handNearMouth: boolean;
  drinking: boolean;
}

const EMPTY_FLAGS: Flags = {
  person: false,
  bottle: false,
  bottleMatched: false,
  handNearMouth: false,
  drinking: false,
};

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function CameraPanel({
  sipMl,
  bottleImage,
  onDrink,
}: {
  sipMl: number;
  bottleImage: string | null;
  onDrink: (amountMl: number, source: DrinkSource) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const detectorRef = useRef<ObjectDetector | null>(null);
  const bottleColorRef = useRef<[number, number, number] | null>(null);
  const candidateStartRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const onDrinkRef = useRef(onDrink);
  onDrinkRef.current = onDrink;
  const sipRef = useRef(sipMl);
  sipRef.current = sipMl;

  const [cameraOn, setCameraOn] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("idle");
  const [modelError, setModelError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("Camera off");
  const [flags, setFlags] = useState<Flags>(EMPTY_FLAGS);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Reference colour of the user's bottle, for the "your bottle" match check.
  useEffect(() => {
    let cancelled = false;
    if (!bottleImage) {
      bottleColorRef.current = null;
      return;
    }
    void averageColor(bottleImage).then((c) => {
      if (!cancelled) bottleColorRef.current = c;
    });
    return () => {
      cancelled = true;
    };
  }, [bottleImage]);

  // Cooldown countdown display.
  useEffect(() => {
    const t = window.setInterval(() => {
      setCooldownLeft(
        Math.max(0, Math.ceil((cooldownUntilRef.current - Date.now()) / 1000))
      );
    }, 500);
    return () => window.clearInterval(t);
  }, []);

  const loadModels = useCallback(async () => {
    if (landmarkerRef.current && detectorRef.current) {
      setModelState("ready");
      return;
    }
    setModelState("loading");
    setModelError("");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const [pose, detector] = await Promise.all([
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        }),
        vision.ObjectDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          scoreThreshold: 0.3,
          maxResults: 5,
        }),
      ]);
      landmarkerRef.current = pose;
      detectorRef.current = detector;
      setModelState("ready");
    } catch (e) {
      console.error("MediaPipe failed to load", e);
      setModelState("error");
      setModelError(
        "Detection models could not load (check your connection). The camera preview and manual logging still work — use “Simulate drink” to test the flow."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    candidateStartRef.current = null;
    setCameraOn(false);
    setFlags(EMPTY_FLAGS);
    setStatus("Camera off");
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraOn(true);
      setStatus("Camera on — loading detection…");
      void loadModels();
    } catch (e) {
      console.error("Camera failed", e);
      setCameraError(
        "Camera access was denied or is unavailable. Check the browser permission (camera icon in the address bar) and try again — manual logging still works."
      );
    }
  }, [loadModels]);

  // Detection loop.
  useEffect(() => {
    if (!cameraOn) return;
    runningRef.current = true;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 160;
    sampleCanvas.height = 120;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

    let lastStatus = "";
    let lastFlagsJson = "";

    const tick = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      const pose = landmarkerRef.current;
      const detector = detectorRef.current;
      if (!video || video.readyState < 2 || !pose || !detector) return;
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;
      const nowMs = performance.now();

      try {
        const poseRes = pose.detectForVideo(video, nowMs);
        const objRes = detector.detectForVideo(video, nowMs);
        const lm = poseRes.landmarks?.[0];
        const next: Flags = { ...EMPTY_FLAGS };
        let nextStatus = "No person in frame";

        if (lm && lm.length > 16) {
          next.person = true;
          const mouth = {
            x: (lm[9].x + lm[10].x) / 2,
            y: (lm[9].y + lm[10].y) / 2,
          };
          const wrists = [lm[15], lm[16]];
          const handNear = wrists.some(
            (w) => w.visibility > 0.5 && dist(w, mouth) < 0.22
          );
          next.handNearMouth = handNear;

          const bottles = (objRes.detections ?? []).filter((d) =>
            d.categories?.some(
              (c) =>
                c.categoryName === "bottle" || c.categoryName === "cup"
            )
          );
          let bottleNearMouth = false;
          for (const b of bottles) {
            const box = b.boundingBox;
            if (!box || !video.videoWidth) continue;
            const cx = (box.originX + box.width / 2) / video.videoWidth;
            const cy = (box.originY + box.height / 2) / video.videoHeight;
            if (dist({ x: cx, y: cy }, mouth) < 0.30) {
              bottleNearMouth = true;
              // Colour check against the user's bottle photo, if we have one.
              if (bottleColorRef.current && sampleCtx) {
                sampleCtx.drawImage(video, 0, 0, 160, 120);
                const px = sampleCtx.getImageData(
                  Math.max(0, Math.min(159, Math.round(cx * 160))),
                  Math.max(0, Math.min(119, Math.round(cy * 120))),
                  1,
                  1
                ).data;
                const d = colorDistance(bottleColorRef.current, [px[0], px[1], px[2]]);
                next.bottleMatched = d < 170;
              }
              break;
            }
          }
          next.bottle = bottleNearMouth;

          if (next.person && next.bottle && next.handNearMouth) {
            next.drinking = true;
            if (candidateStartRef.current === null) {
              candidateStartRef.current = nowMs;
            }
            const held = nowMs - candidateStartRef.current;
            if (held >= HOLD_MS) {
              if (Date.now() >= cooldownUntilRef.current) {
                cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
                candidateStartRef.current = null;
                onDrinkRef.current(sipRef.current, "camera");
              }
              nextStatus = "Drink logged! Cooldown active.";
            } else {
              nextStatus = `Drinking… hold still (${Math.ceil(
                (HOLD_MS - held) / 1000
              )}s)`;
            }
          } else {
            candidateStartRef.current = null;
            if (next.bottle && next.handNearMouth) nextStatus = "Bottle + hand near mouth";
            else if (next.bottle) nextStatus = "Bottle seen — bring it to your mouth";
            else if (next.handNearMouth) nextStatus = "Hand near mouth — bottle not seen";
            else nextStatus = "Watching… lift your bottle to your mouth";
          }
        } else {
          candidateStartRef.current = null;
        }

        if (nextStatus !== lastStatus) {
          lastStatus = nextStatus;
          setStatus(nextStatus);
        }
        const fj = JSON.stringify(next);
        if (fj !== lastFlagsJson) {
          lastFlagsJson = fj;
          setFlags(next);
        }
      } catch (e) {
        console.error("Detection tick failed", e);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [cameraOn, modelState]);

  const flag = (ok: boolean, label: string) => (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {ok ? "✓" : "·"}
      </span>
      <span className={ok ? "text-slate-800" : "text-slate-500"}>{label}</span>
    </li>
  );

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sky-900">Camera detection</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            cameraOn
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {cameraOn ? "● Camera ON" : "○ Camera OFF"}
        </span>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-xl bg-slate-900">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full object-cover"
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80 p-4 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-sm text-slate-200">
              Camera is off. Turn it on while you work and DrinkIt will watch
              for drinking — on this device only.
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-700" aria-live="polite">
        {status}
        {cooldownLeft > 0 ? ` · Cooldown ${cooldownLeft}s` : ""}
      </p>
      {modelState === "loading" && (
        <p className="mt-1 text-sm text-slate-500">
          Loading detection models… (first load downloads ~10 MB from Google)
        </p>
      )}
      {modelError && <p className="mt-1 text-sm text-amber-700">{modelError}</p>}
      {cameraError && <p className="mt-1 text-sm text-red-600">{cameraError}</p>}

      <ul className="mt-3 space-y-1">
        {flag(flags.person, "Person in frame")}
        {flag(flags.bottle, "Bottle near mouth")}
        {flag(flags.bottleMatched, "Matches your bottle photo")}
        {flag(flags.handNearMouth, "Hand near mouth")}
        {flag(flags.drinking, "Drinking — hold ~1.5s to log")}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {cameraOn ? (
          <button
            onClick={stopCamera}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Turn camera off
          </button>
        ) : (
          <button
            onClick={() => void startCamera()}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          >
            Turn camera on
          </button>
        )}
        <button
          onClick={() => onDrink(sipMl, "simulated")}
          className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
          title="Logs a drink as if the camera had detected one — for testing when the camera or models are unavailable."
        >
          Test detection / Simulate drink
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Privacy: video is processed in your browser only and never leaves this
        device. Detection looks for a bottle near your mouth plus your hand
        near your mouth, held for about 1.5 seconds. It is an estimate — good
        light and keeping your bottle visible help. If it misses, use the
        manual “I drank” button.
      </p>
    </div>
  );
}
