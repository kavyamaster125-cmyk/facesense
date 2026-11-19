import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award, BookOpen, CheckCircle2, LogOut, ShieldCheck, Sparkles, Star, ThumbsUp, TrendingUp, AlertTriangle, MessageSquare, UserCheck, ClipboardList, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { facultyApi, clearAuthSession, errorMessage, type SubmissionTrackingEntry } from "@/lib/api";

export const Route = createFileRoute("/faculty/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Faculty Analytics Dashboard — FaceSense AI" },
      {
        name: "description",
        content: "View anonymous aggregated faculty feedback reports, AI sentiment summaries, and rating distributions.",
      },
    ],
  }),
  component: FacultyDashboardPage,
});

function FacultyDashboardPage() {
  const navigate = useNavigate();

  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [trackingSessionId, setTrackingSessionId] = useState<number | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["faculty-sessions"],
    queryFn: facultyApi.listSessions,
  });

  const trackingQuery = useQuery({
    queryKey: ["faculty-tracking", trackingSessionId],
    queryFn: () => trackingSessionId ? facultyApi.getSubmissionTracking(trackingSessionId) : Promise.resolve([]),
    enabled: Boolean(trackingSessionId),
  });

  const profileQuery = useQuery({
    queryKey: ["faculty-dashboard"],
    queryFn: facultyApi.getDashboard,
  });

  const analyticsQuery = useQuery({
    queryKey: ["faculty-analytics", selectedSessionId],
    queryFn: () => facultyApi.getAnalytics(
      undefined,
      selectedSessionId !== "all" ? Number(selectedSessionId) : undefined
    ),
  });

  const handleLogout = () => {
    clearAuthSession();
    void navigate({ to: "/faculty/login" });
  };

  const loading = profileQuery.isLoading || analyticsQuery.isLoading;
  const profile = profileQuery.data;
  const analytics = analyticsQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserCheck className="size-5" />
            </span>
            <div>
              <span className="font-display text-base font-semibold block">FaceSense AI</span>
              <span className="text-xs text-muted-foreground">Faculty Confidential Portal</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1.5 size-4" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-5 py-8 space-y-8">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : profileQuery.error ? (
          <EmptyState
            title="Faculty Portal Session Expired"
            description={errorMessage(profileQuery.error)}
            action={
              <Button variant="outline" onClick={() => void navigate({ to: "/faculty/login" })}>
                Back to Faculty Login
              </Button>
            }
          />
        ) : profile ? (
          <>
            {/* Profile Banner */}
            <section className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-card p-6 shadow-md">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1.5 font-medium">
                      <ShieldCheck className="size-3.5" /> Confidential Aggregated Mode
                    </Badge>
                    <Badge variant="secondary">{profile.department}</Badge>
                  </div>
                  <h1 className="mt-3 text-3xl font-bold">{profile.full_name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.designation} • Code: <span className="font-mono text-foreground font-semibold">{profile.faculty_code}</span>
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground max-w-sm space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
                    <ShieldCheck className="size-4" /> Privacy & Anonymity Active
                  </div>
                  <p>Student names, enrollment numbers, IDs, photos, and individual scores are strictly hidden.</p>
                </div>
              </div>
            </section>

            {/* Session Selector */}
            {!loading && profile && sessionsQuery.data && sessionsQuery.data.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">View Session:</span>
                </div>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="All Sessions (Aggregated)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions (Aggregated)</SelectItem>
                    {sessionsQuery.data.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.session_name} ({s.academic_year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSessionId !== "all" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setTrackingSessionId(Number(selectedSessionId))}
                  >
                    <ClipboardList className="size-4" /> Track Submissions
                  </Button>
                )}
              </div>
            )}

            {/* SMALL-SAMPLE PRIVACY MASK CHECK */}
            {analytics?.privacy_masked ? (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-300 flex items-start gap-4 shadow-sm">
                <AlertTriangle className="size-6 shrink-0 mt-1 text-amber-600" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Small-Sample Privacy Shield Enabled</h3>
                  <p className="text-sm">{analytics.message}</p>
                  <span className="text-xs font-mono block mt-2 opacity-80">
                    Submissions collected so far: {analytics.total_submissions} / {analytics.min_required} required
                  </span>
                </div>
              </div>
            ) : analytics && analytics.kpi ? (
              <>
                {/* KPI Metrics Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="surface-card p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Submissions</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-foreground">{analytics.total_submissions}</span>
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                  </div>

                  <div className="surface-card p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Star Rating</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-amber-500">{analytics.kpi.average_rating} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span></span>
                      <Star className="size-5 text-amber-500 fill-amber-500" />
                    </div>
                  </div>

                  <div className="surface-card p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Satisfaction</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-emerald-600">{analytics.kpi.overall_satisfaction_pct}%</span>
                      <TrendingUp className="size-5 text-emerald-600" />
                    </div>
                  </div>

                  <div className="surface-card p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teaching Slider Avg</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-primary">{analytics.kpi.slider_satisfaction} <span className="text-sm font-normal text-muted-foreground">/ 100</span></span>
                      <Award className="size-5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown & AI Summary */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Rating Distribution */}
                  <div className="surface-card p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Star className="size-5 text-amber-500 fill-amber-500" /> 5-Star Rating Breakdown
                    </h3>

                    <div className="space-y-3 pt-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const pct = analytics.rating_distribution?.[rating] || 0;
                        return (
                          <div key={rating} className="flex items-center gap-3 text-sm">
                            <span className="w-12 font-medium flex items-center gap-1">{rating} <Star className="size-3 text-amber-500 fill-amber-500" /></span>
                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-12 text-right font-mono font-semibold text-xs">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Swipe Agreement Ratio */}
                  <div className="surface-card p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <ThumbsUp className="size-5 text-primary" /> Student Interactive Q&A Agreement
                    </h3>
                    <p className="text-xs text-muted-foreground">"Faculty encourages students to ask questions and participate in class."</p>

                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-1">
                        <span className="text-2xl font-bold text-emerald-600 block">{analytics.swipe_breakdown?.agree || 0}%</span>
                        <span className="text-xs font-semibold text-emerald-700 uppercase">Agreed</span>
                      </div>

                      <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center space-y-1">
                        <span className="text-2xl font-bold text-rose-600 block">{analytics.swipe_breakdown?.disagree || 0}%</span>
                        <span className="text-xs font-semibold text-rose-700 uppercase">Disagreed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Text Feedback Summarizer */}
                {analytics.ai_summary && (
                  <div className="surface-card p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-primary" />
                      <h3 className="font-semibold text-lg">AI Feedback Summarizer</h3>
                      <Badge variant="outline" className="text-xs">NLP Categorized</Badge>
                    </div>

                    <p className="text-sm bg-muted/40 p-4 rounded-xl border font-medium text-foreground">
                      "{analytics.ai_summary.overall_summary}"
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Positive Highlights */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-emerald-600 flex items-center gap-2">
                          <CheckCircle2 className="size-4" /> Key Positive Highlights
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {analytics.ai_summary.positive_highlights.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                              <span className="text-emerald-500 font-bold">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvement Areas */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-amber-600 flex items-center gap-2">
                          <AlertTriangle className="size-4" /> Recommended Improvement Areas
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {analytics.ai_summary.improvement_areas.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                              <span className="text-amber-500 font-bold">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        ) : null}

        {/* Submission Tracking Dialog */}
        <Dialog open={Boolean(trackingSessionId)} onOpenChange={(o) => !o && setTrackingSessionId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submission Tracking</DialogTitle>
              <DialogDescription>Shows who submitted feedback — no ratings or content visible.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {trackingQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (trackingQuery.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No students found for this session.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Enrollment No</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trackingQuery.data ?? []).map((entry) => (
                      <TableRow key={entry.enrollment_no}>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.enrollment_no}</TableCell>
                        <TableCell className="text-center">
                          {entry.has_submitted ? (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1">
                              <CheckCircle2 className="size-3.5" /> Submitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 gap-1">
                              <XCircle className="size-3.5" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
