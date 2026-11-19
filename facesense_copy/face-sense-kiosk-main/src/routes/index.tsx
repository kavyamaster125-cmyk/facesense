import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanFace, ShieldCheck, Sparkles, UserCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FaceLivenessCapture } from "@/components/FaceLivenessCapture";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Face Login — FaceSense AI Student Portal" },
      {
        name: "description",
        content:
          "Scan your face to authenticate and submit confidential faculty feedback with AI liveness detection.",
      },
    ],
  }),
  component: FaceLoginPage,
});

function FaceLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="campus-gradient min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-5 py-3.5 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <ScanFace className="size-4 sm:size-5" aria-hidden />
          </span>
          <span className="font-display text-base sm:text-lg font-semibold tracking-tight">FaceSense AI</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Button asChild variant="outline" size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm">
            <Link to="/faculty/login">
              <UserCheck className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
              <span className="hidden sm:inline">Faculty Portal</span>
              <span className="sm:hidden">Faculty</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
            <Link to="/admin/login">
              <Lock className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" />
              <span className="hidden sm:inline">Admin Portal</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl items-center gap-6 sm:gap-8 lg:gap-10 px-4 sm:px-5 pb-10 sm:pb-16 lg:grid-cols-2">
        <section className="space-y-3 sm:space-y-4">
          <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-primary-soft px-2.5 sm:px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden /> AI-Based Confidential Feedback
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Biometric Face Login. 100% Confidential Feedback.
          </h1>
          <p className="max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
            No passwords or enrollment numbers to memorize. Align your face with the camera and blink to authenticate via ArcFace AI liveness detection.
          </p>
          <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground pt-1">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" aria-hidden /> Real-time facial mesh &amp; active blink-based liveness detection
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" aria-hidden /> Anti-spoofing verification prevents photos and screen spoofs
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" aria-hidden /> Complete student anonymity — Faculty NEVER see student names or IDs
            </li>
          </ul>
        </section>

        <section className="surface-card p-4 sm:p-5 md:p-6 shadow-xl rounded-2xl border border-border">
          <h2 className="text-base sm:text-lg font-semibold">Student Verification</h2>
          <p className="mb-3 sm:mb-4 mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
            Look at the camera. Once the mesh appears, blink naturally to verify liveness.
          </p>

          <FaceLivenessCapture
            onAuthenticated={(studentId, fullName) => {
              toast.success(`Identity Verified: Welcome, ${fullName}!`);
              window.location.assign(`/student/${studentId}/dashboard`);
            }}
            onError={(msg) => setError(msg)}
          />

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            First time logging in? Ask your department admin to enroll your face image.
          </p>
        </section>
      </main>
    </div>
  );
}
