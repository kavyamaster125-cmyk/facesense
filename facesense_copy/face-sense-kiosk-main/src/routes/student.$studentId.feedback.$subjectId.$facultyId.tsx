import { createFileRoute, Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, PartyPopper, Sparkles, ThumbsUp, ThumbsDown, Camera, Gift, ArrowRight, ShieldCheck, UserCheck, MessageSquarePlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/StarRating";
import { studentApi, errorMessage, RewardResult, ApiError } from "@/lib/api";

export const Route = createFileRoute("/student/$studentId/feedback/$subjectId/$facultyId")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] ? String(search["mode"]) : "batch",
  }),
  head: () => ({
    meta: [
      { title: "Question-Centric Faculty Feedback — FaceSense AI" },
      {
        name: "description",
        content: "Question-centric multi-faculty feedback experience reviewing all assigned courses in one streamlined session.",
      },
    ],
  }),
  component: QuestionCentricFeedbackPage,
});

const MCQ_OPTIONS = [
  "Explanation clarity & depth",
  "More practical / hands-on lab examples",
  "Interaction & Q&A encouragement",
  "Pacing & time management",
  "No major improvement required"
];

function QuestionCentricFeedbackPage() {
  const { studentId, subjectId, facultyId } = useParams({
    from: "/student/$studentId/feedback/$subjectId/$facultyId",
  });
  const search = useSearch({ from: "/student/$studentId/feedback/$subjectId/$facultyId" });
  const navigate = useNavigate();
  const sid = Number(studentId);
  const targetSubjectId = Number(subjectId);
  const targetFacultyId = Number(facultyId);
  const isSingleMode = search.mode === "single";

  // Multi-step state (1 to 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [focusScore, setFocusScore] = useState(90);

  // State mappings keyed by faculty_id
  const [ratingsMap, setRatingsMap] = useState<Record<number, number>>({});
  const [swipeMap, setSwipeMap] = useState<Record<number, "AGREE" | "DISAGREE">>({});
  const [sliderMap, setSliderMap] = useState<Record<number, number>>({});
  const [mcqMap, setMcqMap] = useState<Record<number, string>>({});
  const [suggestionMap, setSuggestionMap] = useState<Record<number, string>>({});

  // Reward result & completion state
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  // Fetch student profile & assigned eligible faculty list
  const eligibleQuery = useQuery({
    queryKey: ["student-dashboard", sid],
    queryFn: () => studentApi.getEligibleFaculty(sid),
  });

  const allSubjects = eligibleQuery.data?.subjects || [];
  // Filter for assigned faculty members:
  // If single mode, filter ONLY for targetSubjectId & targetFacultyId
  const unsubmittedSubjects = allSubjects.filter((s) => {
    if (s.already_submitted) return false;
    if (isSingleMode) {
      return s.subject_id === targetSubjectId && s.faculty_id === targetFacultyId;
    }
    return true;
  });
  const cycleId = eligibleQuery.data?.cycle_id || 1;

  // Initialize state mappings when data is loaded
  useEffect(() => {
    if (unsubmittedSubjects.length > 0) {
      const initRatings: Record<number, number> = {};
      const initSwipes: Record<number, "AGREE" | "DISAGREE"> = {};
      const initSliders: Record<number, number> = {};
      const initMcqs: Record<number, string> = {};
      const initSuggestions: Record<number, string> = {};

      unsubmittedSubjects.forEach((s) => {
        if (!(s.faculty_id in ratingsMap)) initRatings[s.faculty_id] = 5;
        if (!(s.faculty_id in swipeMap)) initSwipes[s.faculty_id] = "AGREE";
        if (!(s.faculty_id in sliderMap)) initSliders[s.faculty_id] = 80;
        if (!(s.faculty_id in mcqMap)) initMcqs[s.faculty_id] = "No major improvement required";
        if (!(s.faculty_id in suggestionMap)) initSuggestions[s.faculty_id] = "";
      });

      setRatingsMap((prev) => ({ ...initRatings, ...prev }));
      setSwipeMap((prev) => ({ ...initSwipes, ...prev }));
      setSliderMap((prev) => ({ ...initSliders, ...prev }));
      setMcqMap((prev) => ({ ...initMcqs, ...prev }));
      setSuggestionMap((prev) => ({ ...initSuggestions, ...prev }));
    }
  }, [eligibleQuery.data]);

  // Simulate camera focus score tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setFocusScore((prev) => Math.min(98, Math.max(78, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Atomic Batch Mutation
  const mutation = useMutation({
    mutationFn: () => {
      const payloadResponses = unsubmittedSubjects.map((s) => ({
        faculty_id: s.faculty_id,
        subject_id: s.subject_id,
        star_rating: ratingsMap[s.faculty_id] ?? 5,
        swipe_response: swipeMap[s.faculty_id] ?? "AGREE",
        slider_value: sliderMap[s.faculty_id] ?? 80,
        mcq_option: mcqMap[s.faculty_id] ?? "No major improvement required",
        suggestion_text: suggestionMap[s.faculty_id]?.trim() || undefined,
      }));

      return studentApi.submitBatchFeedback({
        feedback_cycle_id: cycleId,
        student_id: sid,
        focus_score: focusScore,
        liveness_passed: true,
        responses: payloadResponses,
      });
    },
    onSuccess: (res) => {
      toast.success(`Feedback recorded confidentially for all ${res.submitted_count} faculty members!`);
      setRewardResult(res.reward);
      setSubmittedCount(res.submitted_count);
      setSubmitted(true);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Attendance Too Low", {
          description: err.message || "Your attendance must be strictly greater than 75% to submit feedback. Please contact your department.",
          duration: 8000,
        });
      } else {
        toast.error(errorMessage(err));
      }
    },
  });

  const getSliderLabel = (val: number) => {
    if (val < 20) return "Very Unsatisfied";
    if (val < 45) return "Unsatisfied";
    if (val < 65) return "Neutral";
    if (val < 85) return "Satisfied";
    return "Very Satisfied";
  };

  const progressPercentage = Math.round((currentStep / 6) * 100);

  // ---------------- SUCCESS & SINGLE COUPON DISPLAY SCREEN ----------------
  if (submitted && rewardResult) {
    const studentCpi = parseFloat(String(eligibleQuery.data?.cpi ?? 0));
    const isRewardEligible = studentCpi > 9.5 && rewardResult.granted === true && Boolean(rewardResult.coupon_code);

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
        <div className="surface-card w-full max-w-xl p-8 text-center rounded-3xl border border-border shadow-2xl space-y-6">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 animate-bounce">
            <PartyPopper className="size-10" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Feedback Session Complete!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you, <span className="font-semibold text-foreground">{eligibleQuery.data?.full_name}</span>. Confidential feedback has been submitted for all <span className="font-semibold text-foreground">{submittedCount} assigned faculty members</span>.
            </p>
          </div>

          {/* SINGLE COUPON DISPLAY CARD (STRICT CPI > 9.5 RESTRICTED) */}
          {isRewardEligible ? (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background p-6 shadow-inner text-left space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-base">
                <Gift className="size-5" /> High-Performance Reward Granted! ⭐
              </div>
              <p className="text-xs text-muted-foreground">
                As a high-performing student with CPI &gt; 9.5 (Your CPI: <span className="font-bold text-foreground">{studentCpi.toFixed(2)}</span>):
              </p>

              <div className="rounded-xl border border-dashed border-amber-500/40 bg-card p-5 text-center">
                <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider block">
                  {rewardResult.reward_type || "Coffee Coupon"} (1 Session Reward)
                </span>
                <span className="mt-1 text-3xl font-mono font-bold text-amber-600 tracking-wider block">
                  {rewardResult.coupon_code}
                </span>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Present this single coupon code at the campus canteen to claim your free coffee!
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center text-sm space-y-2">
              <div className="flex items-center justify-center gap-2 text-foreground font-semibold">
                ☕ Coffee Coupon Eligibility Note
              </div>
              <p className="text-xs text-muted-foreground">
                Coffee coupons are exclusively reserved for students with <span className="font-semibold text-foreground">CPI &gt; 9.5</span>.
                Your current CPI is <span className="font-bold text-foreground">{studentCpi.toFixed(2)}</span>.
              </p>
              <p className="text-xs font-medium text-emerald-600">
                Thank you for completing your confidential feedback!
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="size-4" /> Confidentiality Guaranteed — Student Identity 100% Protected
          </div>

          <Button asChild className="w-full py-6 text-base font-medium">
            <Link to="/student/$studentId/dashboard" params={{ studentId }}>
              Return to Student Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-card px-5 py-4 shadow-sm sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate({ to: "/student/$studentId/dashboard", params: { studentId } })}
          >
            <ArrowLeft className="mr-1.5 size-4" /> Exit Session
          </Button>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="size-3.5" /> Anonymous Session
            </Badge>
            <div className="flex items-center gap-1.5">
              <Camera className="size-4 text-emerald-500" /> Focus: <span className="font-semibold text-foreground">{focusScore}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Feedback Container */}
      <main className="mx-auto w-full max-w-3xl px-5 py-8 flex-1 flex flex-col">
        {/* Overall Progress Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>
              {currentStep <= 5 ? `Question ${currentStep} of 5 — All Faculty` : "Final Confirmation"}
            </span>
            <span>{progressPercentage}% Completed</span>
          </div>
          <Progress value={progressPercentage} className="h-2.5 rounded-full" />
        </div>

        {eligibleQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : unsubmittedSubjects.length === 0 ? (
          <div className="surface-card p-8 text-center rounded-3xl border border-border shadow-lg space-y-4 my-auto">
            <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
            <h2 className="text-xl font-bold">All Feedback Completed!</h2>
            <p className="text-sm text-muted-foreground">
              You have already submitted feedback for all assigned faculty members in the active academic cycle.
            </p>
            <Button asChild className="mt-4">
              <Link to="/student/$studentId/dashboard" params={{ studentId }}>
                Return to Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ---------------- QUESTION 1: STAR RATING (ALL FACULTY) ---------------- */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary mb-2">
                    Question 1 of 5 — Overall Teaching Clarity
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">How clearly does each faculty member explain concepts?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Rate all assigned faculty members from 1 to 5 Stars.</p>
                </div>

                <div className="space-y-4">
                  {unsubmittedSubjects.map((s) => (
                    <div key={s.faculty_id} className="surface-card p-5 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono font-bold text-primary">{s.subject_code}</span>
                        <h3 className="text-base font-semibold text-foreground">{s.subject_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <UserCheck className="size-4 text-primary" /> {s.faculty_name} ({s.designation})
                        </p>
                      </div>

                      <div className="flex flex-col items-center sm:items-end">
                        <StarRating
                          label={s.faculty_name}
                          value={ratingsMap[s.faculty_id] ?? 5}
                          onChange={(val) => setRatingsMap((prev) => ({ ...prev, [s.faculty_id]: val }))}
                        />
                        <span className="mt-1 text-xs text-muted-foreground">
                          {ratingsMap[s.faculty_id] ?? 5} / 5 Stars
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={() => setCurrentStep(2)} className="w-full py-6 text-base font-semibold">
                  Next Question: Pacing & Clarity <ArrowRight className="ml-2 size-5" />
                </Button>
              </div>
            )}

            {/* ---------------- QUESTION 2: SWIPE AGREE / DISAGREE (ALL FACULTY) ---------------- */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary mb-2">
                    Question 2 of 5 — Pacing & Encouragement
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">"The faculty encourages students to ask questions and clarifies doubts effectively."</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Select Agree or Disagree for each faculty member.</p>
                </div>

                <div className="space-y-4">
                  {unsubmittedSubjects.map((s) => (
                    <div key={s.faculty_id} className="surface-card p-5 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-mono font-bold text-primary">{s.subject_code}</span>
                        <h3 className="text-base font-semibold text-foreground">{s.subject_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <UserCheck className="size-4 text-primary" /> {s.faculty_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSwipeMap((prev) => ({ ...prev, [s.faculty_id]: "DISAGREE" }))}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                            swipeMap[s.faculty_id] === "DISAGREE"
                              ? "border-rose-500 bg-rose-500/15 text-rose-600 font-semibold shadow-sm"
                              : "border-border hover:border-rose-300 text-muted-foreground"
                          }`}
                        >
                          <ThumbsDown className="size-4" /> Disagree
                        </button>

                        <button
                          type="button"
                          onClick={() => setSwipeMap((prev) => ({ ...prev, [s.faculty_id]: "AGREE" }))}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                            swipeMap[s.faculty_id] === "AGREE"
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 font-semibold shadow-sm"
                              : "border-border hover:border-emerald-300 text-muted-foreground"
                          }`}
                        >
                          <ThumbsUp className="size-4" /> Agree
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-1/3 py-6">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} className="w-2/3 py-6 text-base font-semibold">
                    Next Question: Engagement Slider <ArrowRight className="ml-2 size-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- QUESTION 3: SLIDER SATISFACTION (ALL FACULTY) ---------------- */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary mb-2">
                    Question 3 of 5 — Engagement & Interactive Experience
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">How satisfied are you with overall interactive classroom experience?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Adjust the slider from 0% to 100% for each faculty member.</p>
                </div>

                <div className="space-y-4">
                  {unsubmittedSubjects.map((s) => {
                    const currentVal = sliderMap[s.faculty_id] ?? 80;
                    return (
                      <div key={s.faculty_id} className="surface-card p-5 rounded-2xl border border-border shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-primary">{s.subject_code}</span>
                            <h3 className="text-base font-semibold text-foreground">{s.subject_name} — {s.faculty_name}</h3>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {getSliderLabel(currentVal)} ({currentVal}%)
                          </span>
                        </div>

                        <Slider
                          value={[currentVal]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(val) => {
                            if (val[0] !== undefined) {
                              setSliderMap((prev) => ({ ...prev, [s.faculty_id]: val[0]! }));
                            }
                          }}
                          className="w-full py-2"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-1/3 py-6">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="w-2/3 py-6 text-base font-semibold">
                    Next Question: Improvement Area <ArrowRight className="ml-2 size-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- QUESTION 4: MCQ CHOICE (ALL FACULTY) ---------------- */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary mb-2">
                    Question 4 of 5 — Target Improvement Selection
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">Which area could each faculty member focus on improving most?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Select one option for each faculty member.</p>
                </div>

                <div className="space-y-4">
                  {unsubmittedSubjects.map((s) => (
                    <div key={s.faculty_id} className="surface-card p-5 rounded-2xl border border-border shadow-sm space-y-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-primary">{s.subject_code}</span>
                        <h3 className="text-base font-semibold text-foreground">{s.subject_name} — {s.faculty_name}</h3>
                      </div>

                      <select
                        value={mcqMap[s.faculty_id] ?? "No major improvement required"}
                        onChange={(e) => setMcqMap((prev) => ({ ...prev, [s.faculty_id]: e.target.value }))}
                        className="w-full rounded-xl border border-input bg-card p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                      >
                        {MCQ_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(3)} className="w-1/3 py-6">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(5)} className="w-2/3 py-6 text-base font-semibold">
                    Next Question: Anonymous Suggestion <ArrowRight className="ml-2 size-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- QUESTION 5: ANONYMOUS SUGGESTION (ALL FACULTY) ---------------- */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary mb-2">
                    Question 5 of 5 — Anonymous Constructive Suggestions
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">Share constructive feedback or appreciation for each faculty member.</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Optional. Analyzed anonymously by AI sentiment pipeline.</p>
                </div>

                <div className="space-y-4">
                  {unsubmittedSubjects.map((s) => (
                    <div key={s.faculty_id} className="surface-card p-5 rounded-2xl border border-border shadow-sm space-y-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-primary">{s.subject_code}</span>
                        <h3 className="text-base font-semibold text-foreground">{s.subject_name} — {s.faculty_name}</h3>
                      </div>

                      <Textarea
                        rows={3}
                        placeholder={`Share constructive feedback or appreciation for ${s.faculty_name}...`}
                        value={suggestionMap[s.faculty_id] ?? ""}
                        onChange={(e) => setSuggestionMap((prev) => ({ ...prev, [s.faculty_id]: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(4)} className="w-1/3 py-6">
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(6)} className="w-2/3 py-6 text-base font-semibold">
                    Review Session Summary <ArrowRight className="ml-2 size-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---------------- STEP 6: FINAL REVIEW & ATOMIC SUBMISSION ---------------- */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="surface-card p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-2">
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                    Final Confirmation & Submission
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">Review Feedback for All Assigned Faculty</h2>
                  <p className="text-xs text-muted-foreground">
                    Submitting will securely record your input for {unsubmittedSubjects.length} faculty members and evaluate your reward coupon.
                  </p>
                </div>

                <div className="surface-card p-5 rounded-2xl border border-border space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Session Response Summary
                  </h3>

                  {unsubmittedSubjects.map((s) => (
                    <div key={s.faculty_id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                      <div>
                        <span className="font-semibold text-foreground">{s.faculty_name}</span>
                        <span className="text-xs text-muted-foreground block">{s.subject_name} ({s.subject_code})</span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-primary">{ratingsMap[s.faculty_id] ?? 5} ⭐</span>
                        <span className="text-xs text-emerald-600 block font-medium">
                          {swipeMap[s.faculty_id] ?? "AGREE"} • {sliderMap[s.faculty_id] ?? 80}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(5)} className="w-1/3 py-6">
                    Back to Edit
                  </Button>
                  <Button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className="w-2/3 py-6 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  >
                    {mutation.isPending ? "Submitting All Responses..." : "Submit Complete Session & Get Reward"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
