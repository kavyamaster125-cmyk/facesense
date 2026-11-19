import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, LogOut, ShieldAlert, UserX, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/student/ineligible-attendance")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    studentId: search["studentId"] ? String(search["studentId"]) : "",
    name: search["name"] ? String(search["name"]) : "Student",
    enrollment: search["enrollment"] ? String(search["enrollment"]) : "N/A",
    attendance: search["attendance"] !== undefined ? Number(search["attendance"]) : 0,
    cpi: search["cpi"] !== undefined ? Number(search["cpi"]) : 0,
  }),
  head: () => ({
    meta: [
      { title: "Ineligible for Feedback — FaceSense AI" },
      {
        name: "description",
        content: "Attendance threshold criteria not met for feedback participation.",
      },
    ],
  }),
  component: IneligibleAttendancePage,
});

function IneligibleAttendancePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/student/ineligible-attendance" });

  const attendance = search.attendance;
  const threshold = 75;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanFace className="size-5" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold">FaceSense AI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/" })}>
            <LogOut className="mr-1.5 size-4" /> Exit Session
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 flex flex-col justify-center">
        <div className="surface-card p-6 md:p-10 rounded-3xl border border-destructive/30 shadow-2xl bg-card">
          
          {/* Warning Header Banner */}
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-destructive">
            <ShieldAlert className="size-8 shrink-0 text-destructive" />
            <div>
              <h2 className="text-lg font-bold">Ineligible for Feedback</h2>
              <p className="text-xs text-destructive/90">
                You are not eligible to participate in feedback for this session due to low attendance.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
              <UserX className="size-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">{search.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Enrollment No: <span className="font-semibold text-foreground">{search.enrollment}</span>
            </p>
          </div>

          {/* Attendance Breakdown Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
              <span className="text-xs font-medium text-muted-foreground">Your Current Attendance</span>
              <div className="mt-2 text-3xl font-extrabold text-destructive">
                {attendance}%
              </div>
              <Badge variant="outline" className="mt-2 border-destructive/40 bg-destructive/10 text-destructive text-xs">
                Below Minimum Criteria
              </Badge>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
              <span className="text-xs font-medium text-muted-foreground">Required Minimum Criteria</span>
              <div className="mt-2 text-3xl font-extrabold text-foreground">
                &gt; {threshold}%
              </div>
              <Badge variant="outline" className="mt-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs">
                Mandatory Threshold
              </Badge>
            </div>
          </div>

          {/* Progress bar visual comparison */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Attendance Status</span>
              <span className="text-destructive font-bold">{attendance}% / 100%</span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
              {/* Threshold indicator line at 75% */}
              <div
                className="absolute bottom-0 top-0 z-10 w-1 bg-amber-500 shadow"
                style={{ left: `${threshold}%` }}
                title="Required 75% Threshold"
              />
              <div
                className="h-full bg-destructive transition-all"
                style={{ width: `${Math.min(100, Math.max(0, attendance))}%` }}
              />
            </div>
            <p className="text-right text-[11px] text-muted-foreground">
              ⚡ Amber marker indicates mandatory 75% requirement.
            </p>
          </div>

          {/* Policy Information Box */}
          <div className="mt-8 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Institutional Attendance Policy:</span>
              <p className="mt-0.5 leading-relaxed">
                As per college regulations, students maintaining less than 75% aggregate attendance are disqualified from participating in semester feedback sessions. If you believe your attendance record is incorrect, please contact your academic advisor or department HOD.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="default"
              className="w-full sm:w-auto font-medium px-8"
              onClick={() => void navigate({ to: "/" })}
            >
              <LogOut className="mr-2 size-4" /> Return to Face Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto font-medium"
              onClick={() => void navigate({ to: "/" })}
            >
              <ArrowLeft className="mr-2 size-4" /> Back to Home
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
