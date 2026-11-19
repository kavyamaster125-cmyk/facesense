import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, LogOut, MessageSquarePlus, ScanFace, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { studentApi, errorMessage } from "@/lib/api";

export const Route = createFileRoute("/student/$studentId/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Student Dashboard — FaceSense AI" },
      {
        name: "description",
        content: "View your verified profile and select subjects/faculty to submit confidential feedback.",
      },
    ],
  }),
  component: StudentDashboardPage,
  errorComponent: () => {
    useEffect(() => {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 50);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  },
});

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, Percent } from "lucide-react";

function StudentDashboardPage() {
  const { studentId } = Route.useParams();
  const navigate = Route.useNavigate();
  const id = Number(studentId);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-dashboard", id],
    queryFn: () => studentApi.getEligibleFaculty(id),
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 400, 1500),
  });

  const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
  const unsubmittedSubjects = subjects.filter((s) => !s.already_submitted);

  // Attendance check & redirect if <= 75%
  useEffect(() => {
    if (data && data.attendance_percentage != null && data.attendance_percentage <= 75) {
      toast.error("Ineligible for Feedback: Attendance is below 75%", {
        description: `Your attendance is ${data.attendance_percentage}%. Minimum 75% required to submit feedback.`,
        duration: 6000,
      });
      void navigate({
        to: "/student/ineligible-attendance",
        search: {
          studentId: String(data.student_id),
          name: data.full_name,
          enrollment: data.enrollment_no || "N/A",
          attendance: data.attendance_percentage,
          cpi: data.cpi || 0,
        },
      });
    }
  }, [data, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <ScanFace className="size-4 sm:size-5" aria-hidden />
            </span>
            <span className="font-display text-base sm:text-lg font-semibold tracking-tight">FaceSense AI</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm" onClick={() => void navigate({ to: "/" })}>
            <LogOut className="mr-1 sm:mr-1.5 size-3.5 sm:size-4" /> Exit Session
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-3.5 sm:px-5 py-5 sm:py-8">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            <Skeleton className="h-28 sm:h-32 w-full rounded-xl sm:rounded-2xl" />
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 sm:h-40 w-full rounded-xl sm:rounded-2xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <EmptyState
            title="Couldn't load student profile"
            description={errorMessage(error)}
            action={
              <Button variant="outline" onClick={() => void navigate({ to: "/" })}>
                Back to Face Login
              </Button>
            }
          />
        ) : data ? (
          <>
            {/* Student Verified Profile Banner */}
            <section className="rounded-xl sm:rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-6 shadow-md">
              <div className="flex flex-col gap-3.5 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-xs py-1 justify-center sm:justify-start">
                      <ShieldCheck className="size-3 sm:size-3.5 shrink-0" /> Identity Verified ✓
                    </Badge>
                    <Badge variant="secondary" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-xs py-1 justify-center sm:justify-start">
                      <GraduationCap className="size-3 sm:size-3.5 shrink-0" /> Semester {data.semester}
                    </Badge>
                    {/* Attendance % Badge */}
                    <Badge
                      variant="outline"
                      className={`gap-1 sm:gap-1.5 font-semibold text-[11px] sm:text-xs py-1 justify-center sm:justify-start ${
                        (data.attendance_percentage ?? 0) > 75
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      <Percent className="size-3 sm:size-3.5 shrink-0" /> Attendance: {data.attendance_percentage ?? 0}%
                    </Badge>
                    {/* CPI Badge */}
                    <Badge
                      variant="outline"
                      className={`gap-1 sm:gap-1.5 font-semibold text-[11px] sm:text-xs py-1 justify-center sm:justify-start ${
                        (data.cpi ?? 0) > 9.5
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-600 font-bold"
                          : "border-blue-500/40 bg-blue-500/10 text-blue-600"
                      }`}
                    >
                      <Award className="size-3 sm:size-3.5 shrink-0" /> CPI: {data.cpi?.toFixed(2) ?? "0.00"}
                      {(data.cpi ?? 0) > 9.5 && " ⭐"}
                    </Badge>
                  </div>
                  <h1 className="mt-2.5 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{data.full_name}</h1>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0">
                    <span>Enrollment No: <span className="font-mono font-semibold text-foreground mr-3">{data.enrollment_no || "N/A"}</span></span>
                    <span>Active Session: <span className="font-semibold text-foreground">{data.session_name}</span></span>
                  </div>
                </div>
                <div className="rounded-xl border bg-card/90 p-3 sm:p-4 text-xs text-muted-foreground shadow-sm shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-foreground text-xs sm:text-sm">
                    <User className="size-3.5 sm:size-4 text-primary shrink-0" /> Confidential Feedback Mode
                  </div>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs">Faculty will receive only aggregated results. Your identity is 100% hidden.</p>
                </div>
              </div>
            </section>

            {/* Question-Centric Feedback Primary CTA */}
            {unsubmittedSubjects.length > 0 && (
              <div className="mt-4 sm:mt-6 surface-card p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 sm:gap-4">
                <div>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-semibold mb-1 text-[11px] sm:text-xs">
                    Question-Centric Mode Active
                  </Badge>
                  <h2 className="text-base sm:text-xl font-bold text-foreground">Complete Feedback for All Assigned Faculty</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Answer Question 1 to Question 5 once while reviewing all {unsubmittedSubjects.length} remaining courses, then claim your canteen reward coupon!
                  </p>
                </div>

                <Button asChild size="lg" className="w-full sm:w-auto text-sm sm:text-base font-bold py-3.5 sm:py-6 px-5 sm:px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shrink-0">
                  <Link
                    to="/student/$studentId/feedback/$subjectId/$facultyId"
                    params={{
                      studentId: String(id),
                      subjectId: String(unsubmittedSubjects[0]?.subject_id ?? subjects[0]?.subject_id ?? 1),
                      facultyId: String(unsubmittedSubjects[0]?.faculty_id ?? subjects[0]?.faculty_id ?? 1),
                    }}
                    search={{ mode: "batch" }}
                  >
                    <MessageSquarePlus className="mr-2 size-4 sm:size-5" /> Start Complete Session <ArrowRight className="ml-2 size-4 sm:size-5" />
                  </Link>
                </Button>
              </div>
            )}

            <h2 className="mb-3 sm:mb-4 mt-6 sm:mt-8 text-lg sm:text-xl font-semibold flex items-center justify-between">
              <span>Assigned Courses & Faculty Roster</span>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                ({unsubmittedSubjects.length} Remaining)
              </span>
            </h2>


            {subjects.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No faculty assigned for this session"
                description="Once your department assigns faculty to your semester, they will appear here."
              />
            ) : (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {subjects.map((s) => (
                  <article
                    key={`${s.subject_id}-${s.faculty_id}`}
                    className={`surface-card flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                      s.already_submitted ? "bg-muted/40 border-muted opacity-80" : "hover:border-primary/50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-mono font-semibold text-primary">{s.subject_code}</span>
                        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">{s.subject_name}</h3>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-muted-foreground truncate">{s.faculty_name}</p>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">{s.designation}</span>
                      </div>
                      {s.already_submitted && (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1 text-[11px] sm:text-xs shrink-0">
                          <CheckCircle2 className="size-3" /> Submitted
                        </Badge>
                      )}
                    </div>

                    <div className="mt-auto pt-1 sm:pt-2">
                      {s.already_submitted ? (
                        <Button disabled variant="outline" className="w-full text-xs font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5 h-9">
                          <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-500" /> Completed
                        </Button>
                      ) : (
                        <Button asChild className="w-full h-9 sm:h-10 text-xs sm:text-sm font-medium">
                          <Link
                            to="/student/$studentId/feedback/$subjectId/$facultyId"
                            params={{
                              studentId: String(id),
                              subjectId: String(s.subject_id),
                              facultyId: String(s.faculty_id),
                            }}
                            search={{ mode: "single" }}
                          >
                            <MessageSquarePlus className="mr-2 size-3.5 sm:size-4" /> Start Feedback
                          </Link>
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
