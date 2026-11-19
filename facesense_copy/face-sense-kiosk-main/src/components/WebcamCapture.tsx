import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (file: File, previewUrl: string) => void;
  onClear?: () => void;
  allowUpload?: boolean;
  captureLabel?: string;
  className?: string;
};

export function WebcamCapture({
  onCapture,
  onClear,
  allowUpload = false,
  captureLabel = "Capture photo",
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError(
          typeof window !== "undefined" && !window.isSecureContext
            ? "Insecure origin: Browsers require HTTPS or http://localhost to access the camera."
            : "Camera API not supported or blocked in this browser."
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err: any) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setError("Insecure connection: Browsers block camera on IP addresses. Use http://localhost:8080");
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in browser site settings.");
      } else {
        setError("Camera unavailable. Allow camera access in your browser, or upload a photo.");
      }
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    void startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      console.warn("[FACE FRONTEND] Camera frame not ready. videoWidth:", video?.videoWidth);
      setError("Camera is not ready yet. Give it a moment and try again.");
      return;
    }

    console.log(`[FACE FRONTEND] Camera active: YES | Resolution: ${video.videoWidth}x${video.videoHeight} | Capturing live frame...`);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        console.log(`[FACE FRONTEND] Frame Captured Successfully | Blob Size: ${blob.size} bytes`);
        setPreview(url);
        stopStream();
        onCapture(file, url);
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture, stopStream]);


  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onClear?.();
    void startStream();
  }, [preview, onClear, startStream]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    stopStream();
    onCapture(file, url);
  };

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-secondary">
        {preview ? (
          <img src={preview} alt="Captured face preview" className="h-full w-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="Live camera preview"
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-primary/45" />
            {(starting || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/95 p-6 text-center">
                {error ? (
                  <>
                    <VideoOff className="size-6 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Starting camera…</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {preview ? (
          <Button type="button" variant="outline" onClick={retake}>
            <RefreshCw aria-hidden /> Retake
          </Button>
        ) : (
          <Button type="button" onClick={capture} disabled={Boolean(error) || starting}>
            <Camera aria-hidden /> {captureLabel}
          </Button>
        )}
        {allowUpload && !preview && (
          <>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload aria-hidden /> Upload photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </>
        )}
        {error && !preview && (
          <Button type="button" variant="ghost" onClick={() => void startStream()}>
            <RefreshCw aria-hidden /> Retry camera
          </Button>
        )}
      </div>
    </div>
  );
}
