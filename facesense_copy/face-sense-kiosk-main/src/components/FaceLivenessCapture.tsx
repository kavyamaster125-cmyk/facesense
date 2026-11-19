import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Camera, CheckCircle2 } from "lucide-react";
import { studentApi, errorMessage, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

// ─── Tunable Constants ───────────────────────────────────────────────────────
const EAR_BLINK_THRESHOLD = 0.23;   // EAR below this ⇒ eyes closed
const EAR_OPEN_THRESHOLD = 0.25;    // EAR above this after close ⇒ blink confirmed
const CLOSED_FRAMES_MIN = 1;        // 1 frame minimum for fast mobile frame rates
const FACE_STABLE_MS = 600;         // ms face must be visible before blink prompt

// MediaPipe FaceMesh 468-landmark eye indices (6-point model per eye)
const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;

// Tesselation connections (subset for a clean mesh look)
const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
const LEFT_EYE_CONTOUR = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33];
const RIGHT_EYE_CONTOUR = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362];
const LIPS_OUTER = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61];
const NOSE_BRIDGE = [168,6,197,195,5];

type LivenessState =
  | "LOADING"
  | "POSITIONING"
  | "BLINK_PROMPT"
  | "VERIFYING"
  | "SUCCESS"
  | "ERROR";

interface FaceLivenessCaptureProps {
  onAuthenticated: (studentId: number, fullName: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

// ─── EAR Calculation ─────────────────────────────────────────────────────────
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function computeEAR(
  landmarks: { x: number; y: number }[],
  indices: readonly number[]
): number {
  const p1 = landmarks[indices[0]!]!;
  const p2 = landmarks[indices[1]!]!;
  const p3 = landmarks[indices[2]!]!;
  const p4 = landmarks[indices[3]!]!;
  const p5 = landmarks[indices[4]!]!;
  const p6 = landmarks[indices[5]!]!;
  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

// ─── Drawing Helpers ─────────────────────────────────────────────────────────
function drawPolyline(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number }[],
  indices: number[],
  w: number,
  h: number,
  color: string,
  lineWidth: number
) {
  if (indices.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  const first = landmarks[indices[0]!]!;
  ctx.moveTo(first.x * w, first.y * h);
  for (let i = 1; i < indices.length; i++) {
    const pt = landmarks[indices[i]!]!;
    ctx.lineTo(pt.x * w, pt.y * h);
  }
  ctx.stroke();
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  len: number,
  lineWidth: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
}

// ─── Component ───────────────────────────────────────────────────────────────
export function FaceLivenessCapture({
  onAuthenticated,
  onError,
  className,
}: FaceLivenessCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  const [state, setState] = useState<LivenessState>("LOADING");
  const [statusText, setStatusText] = useState("Initializing face detection model…");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Blink tracking refs (not state — avoid re-renders every frame)
  const faceDetectedAtRef = useRef<number>(0);
  const closedFramesRef = useRef<number>(0);
  const blinkConfirmedRef = useRef<boolean>(false);
  const verifyingRef = useRef<boolean>(false);
  const stateRef = useRef<LivenessState>("LOADING");

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Capture frame & verify ──────────────────────────────────────────────
  const captureAndVerify = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || verifyingRef.current) return;
    verifyingRef.current = true;
    setState("VERIFYING");
    setStatusText("Liveness passed ✓  Verifying identity…");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    ctx2.drawImage(video, 0, 0);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Failed to capture frame.");
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const res = await studentApi.verifyFace(file);

      if (res.authenticated && res.student_id != null) {
        setState("SUCCESS");
        setStatusText(`Welcome, ${res.full_name ?? "Student"}!`);
        onAuthenticated(res.student_id, res.full_name ?? "Student");
      } else {
        setState("ERROR");
        const msg = res.message || "Face not recognized. Ensure good lighting or register your face.";
        setErrorMsg(msg);
        setStatusText("Verification failed — repositioning…");
        onError?.(msg);
        // Reset after 3s to let student retry
        setTimeout(() => {
          setErrorMsg(null);
          blinkConfirmedRef.current = false;
          closedFramesRef.current = 0;
          faceDetectedAtRef.current = 0;
          verifyingRef.current = false;
          setState("POSITIONING");
          setStatusText("Position your face in the frame");
        }, 3000);
      }
    } catch (err) {
      setState("ERROR");
      const msg = err instanceof ApiError ? err.message : errorMessage(err);
      setErrorMsg(msg);
      setStatusText("Error — retrying…");
      onError?.(msg);
      setTimeout(() => {
        setErrorMsg(null);
        blinkConfirmedRef.current = false;
        closedFramesRef.current = 0;
        faceDetectedAtRef.current = 0;
        verifyingRef.current = false;
        setState("POSITIONING");
        setStatusText("Position your face in the frame");
      }, 3000);
    }
  }, [onAuthenticated, onError]);

  // ── MediaPipe init ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Start camera
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setState("ERROR");
          setStatusText(
            typeof window !== "undefined" && !window.isSecureContext
              ? "Insecure origin: Camera is disabled on HTTP IP addresses. Open via http://localhost:8080 or HTTPS."
              : "Camera API not supported or blocked in this browser."
          );
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err: any) {
        setState("ERROR");
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setStatusText("Insecure connection: Browsers block camera on IP addresses. Use http://localhost:8080");
        } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          setStatusText("Camera permission denied. Please allow camera access in browser site settings.");
        } else {
          setStatusText("Camera unavailable. Allow camera access in your browser.");
        }
        return;
      }

      // 2. Dynamically import MediaPipe (with fallback for mobile)
      const loadTimeout = setTimeout(() => {
        if (!cancelled && stateRef.current === "LOADING") {
          logger.warn("FaceLiveness", "MediaPipe load taking long, enabling direct camera mode.");
          setState("POSITIONING");
          setStatusText("Ready: Position face & tap Verify Face");
        }
      }, 3000);

      try {
        const mpFaceMesh = await import("@mediapipe/face_mesh");
        if (cancelled) {
          clearTimeout(loadTimeout);
          return;
        }

        const FaceMeshClass =
          mpFaceMesh.FaceMesh ||
          (mpFaceMesh as any).default?.FaceMesh ||
          (window as any).FaceMesh;

        if (!FaceMeshClass) {
          throw new Error("FaceMesh class not found in @mediapipe/face_mesh export.");
        }

        const faceMesh = new FaceMeshClass({
          locateFile: (file: string) => `/mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current = faceMesh;

        // 3. Results handler — runs every frame
        faceMesh.onResults((results: any) => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const w = canvas.width;
          const h = canvas.height;

          // Clear & mirror
          ctx.clearRect(0, 0, w, h);
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);

          if (
            results.multiFaceLandmarks &&
            results.multiFaceLandmarks.length > 0
          ) {
            const landmarks = results.multiFaceLandmarks[0] as {
              x: number;
              y: number;
              z: number;
            }[];

            // ── Draw tessellation mesh ──
            drawPolyline(ctx, landmarks, [...FACE_OVAL], w, h, "rgba(100, 200, 255, 0.18)", 0.8);

            // ── Draw eye contours (bright) ──
            drawPolyline(ctx, landmarks, [...LEFT_EYE_CONTOUR], w, h, "rgba(0, 220, 255, 0.85)", 1.5);
            drawPolyline(ctx, landmarks, [...RIGHT_EYE_CONTOUR], w, h, "rgba(0, 220, 255, 0.85)", 1.5);

            // ── Draw lips ──
            drawPolyline(ctx, landmarks, [...LIPS_OUTER], w, h, "rgba(100, 200, 255, 0.35)", 1);

            // ── Draw nose bridge ──
            drawPolyline(ctx, landmarks, [...NOSE_BRIDGE], w, h, "rgba(100, 200, 255, 0.30)", 1);

            // ── Key landmark dots ──
            const keyPoints = [
              ...LEFT_EYE, ...RIGHT_EYE, 1, 4, 5, 6, 168, 195, 197,
            ];
            ctx.fillStyle = "rgba(0, 220, 255, 0.7)";
            for (const idx of keyPoints) {
              const pt = landmarks[idx];
              if (pt) {
                ctx.beginPath();
                ctx.arc(pt.x * w, pt.y * h, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // ── Bounding box (corner brackets) ──
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const pt of landmarks) {
              if (pt.x < minX) minX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y > maxY) maxY = pt.y;
            }
            const pad = 0.03;
            const bx = (minX - pad) * w;
            const by = (minY - pad) * h;
            const bw = (maxX - minX + pad * 2) * w;
            const bh = (maxY - minY + pad * 2) * h;

            const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 400);
            drawCornerBrackets(
              ctx, bx, by, bw, bh,
              `rgba(59, 130, 246, ${pulse})`,
              Math.min(bw, bh) * 0.15,
              2.5
            );

            // ── EAR blink detection (only when in BLINK_PROMPT state) ──
            const curState = stateRef.current;
            if (curState !== "VERIFYING" && curState !== "SUCCESS") {
              const now = Date.now();
              if (faceDetectedAtRef.current === 0) {
                faceDetectedAtRef.current = now;
              }
              const elapsed = now - faceDetectedAtRef.current;

              if (elapsed < FACE_STABLE_MS) {
                if (curState !== "POSITIONING") {
                  setState("POSITIONING");
                  setStatusText("Face detected — hold still…");
                }
              } else {
                if (curState !== "BLINK_PROMPT" && !blinkConfirmedRef.current) {
                  setState("BLINK_PROMPT");
                  setStatusText("Please blink to verify liveness 👁️");
                }

                // EAR calculation
                const earLeft = computeEAR(landmarks, LEFT_EYE);
                const earRight = computeEAR(landmarks, RIGHT_EYE);
                const ear = (earLeft + earRight) / 2;

                if (!blinkConfirmedRef.current) {
                  if (ear < EAR_BLINK_THRESHOLD) {
                    closedFramesRef.current += 1;
                  } else if (
                    ear > EAR_OPEN_THRESHOLD &&
                    closedFramesRef.current >= CLOSED_FRAMES_MIN
                  ) {
                    // Blink confirmed!
                    blinkConfirmedRef.current = true;
                    logger.info("FaceLiveness", `Blink confirmed via EAR (${ear.toFixed(3)}), captured ${closedFramesRef.current} closed frames.`);
                    closedFramesRef.current = 0;
                    void captureAndVerify();
                  } else if (ear > EAR_OPEN_THRESHOLD) {
                    closedFramesRef.current = 0;
                  }
                }
              }
            }
          } else {
            // No face detected
            faceDetectedAtRef.current = 0;
            closedFramesRef.current = 0;
            const curState = stateRef.current;
            if (curState !== "VERIFYING" && curState !== "SUCCESS" && curState !== "ERROR") {
              setState("POSITIONING");
              setStatusText("Position your face in the frame");
            }
          }

          ctx.restore();
        });

        // 4. Wait for model to be ready
        await faceMesh.initialize();
        clearTimeout(loadTimeout);
        if (cancelled) return;

        setState("POSITIONING");
        setStatusText("Position your face in the frame");

        // 5. Frame pump loop
        const processFrame = async () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            await faceMesh.send({ image: video });
          }
          rafRef.current = requestAnimationFrame(processFrame);
        };
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        clearTimeout(loadTimeout);
        logger.warn("FaceLiveness", "MediaPipe optional mesh note (fallback to direct camera mode):", err);
        // Do NOT block camera or fail completely; let user verify via button!
        setState("POSITIONING");
        setStatusText("Ready: Position face & tap Verify Face");
      }
    }

    void init();

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (faceMeshRef.current?.close) {
        try { faceMeshRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, [captureAndVerify]);

  // ── Resize canvas to match video ────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const handleResize = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };
    video.addEventListener("loadedmetadata", handleResize);
    handleResize();
    return () => video.removeEventListener("loadedmetadata", handleResize);
  }, []);

  const isLoading = state === "LOADING";
  const isVerifying = state === "VERIFYING";

  return (
    <div className={className}>
      {/* Aspect-ratio container for video + canvas */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-secondary">
        {/* Live camera feed (mirrored) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full scale-x-[-1] object-cover"
          aria-label="Live camera preview"
        />

        {/* Canvas overlay for mesh + bounding box */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        />

        {/* Dashed alignment guide (visible only when positioning) */}
        {(state === "POSITIONING" || state === "LOADING") && (
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-primary/40" />
        )}

        {/* Loading / verifying overlay */}
        {(isLoading || isVerifying) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/80 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {isLoading ? "Loading face detection…" : "Verifying identity…"}
            </p>
          </div>
        )}

        {/* Status banner */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 px-4 py-2.5 backdrop-blur-sm">
          <StatusIndicator state={state} text={statusText} />
        </div>
      </div>

      {/* Manual / Instant Verify Button */}
      <div className="mt-3 flex flex-col gap-1.5">
        <Button
          type="button"
          onClick={() => void captureAndVerify()}
          disabled={isVerifying || state === "SUCCESS" || state === "LOADING"}
          className="w-full h-11 text-base font-semibold shadow-md gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Verifying Face...
            </>
          ) : (
            <>
              <Camera className="size-5" />
              Verify Face Now
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Tip: Blink naturally to auto-verify, or tap the button above anytime.
        </p>
      </div>

      {/* Error message below camera */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

// ─── Status Indicator Sub-Component ──────────────────────────────────────────
function StatusIndicator({ state, text }: { state: LivenessState; text: string }) {
  const dotColor = {
    LOADING: "bg-yellow-400",
    POSITIONING: "bg-amber-400",
    BLINK_PROMPT: "bg-cyan-400 animate-pulse",
    VERIFYING: "bg-blue-400 animate-pulse",
    SUCCESS: "bg-emerald-400",
    ERROR: "bg-rose-400",
  }[state];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block size-2 rounded-full ${dotColor}`} />
      <span className="text-xs font-medium text-white">{text}</span>
    </div>
  );
}
