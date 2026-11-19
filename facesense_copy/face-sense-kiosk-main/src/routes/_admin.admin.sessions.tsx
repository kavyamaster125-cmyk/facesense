import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarRange, Pencil, Plus, Trash2, ClipboardList, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Field } from "@/components/admin/Field";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { errorMessage, sessionsApi, type FeedbackSession, adminApi, type SubmissionTrackingEntry } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/sessions")({
  head: () => ({
    meta: [
      { title: "Feedback Sessions — FaceSense AI Admin" },
      {
        name: "description",
        content:
          "Open, schedule and close feedback sessions per semester and academic year in FaceSense AI.",
      },
      { property: "og:title", content: "Feedback Sessions — FaceSense AI Admin" },
      {
        property: "og:description",
        content: "Control when students can submit feedback with scheduled sessions.",
      },
    ],
  }),
  component: SessionsPage,
});

const schema = z
  .object({
    session_name: z.string().min(2, "Session name is required"),
    semester: z.coerce.number().int().min(1, "Semester must be 1–12").max(12, "Semester must be 1–12"),
    academic_year: z
      .string()
      .min(4, "Academic year is required")
      .regex(/^\d{4}(-\d{2,4})?$/, "Use a format like 2025-26"),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
    status: z.string().min(1, "Select a status"),
  })
  .refine((v) => v.end_date >= v.start_date, {
    path: ["end_date"],
    message: "End date must be on or after the start date",
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  session_name: "",
  semester: 1,
  academic_year: "",
  start_date: "",
  end_date: "",
  status: "draft",
};

function statusVariant(status: string): "default" | "secondary" | "outline" {
  const s = status?.toLowerCase();
  if (s === "active") return "default";
  if (s === "closed") return "outline";
  return "secondary";
}

function SessionsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackSession | null>(null);
  const [toDelete, setToDelete] = useState<FeedbackSession | null>(null);
  const [trackingSession, setTrackingSession] = useState<FeedbackSession | null>(null);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{ studentId: number; studentName: string } | null>(null);

  const trackingQuery = useQuery({
    queryKey: ["submission-tracking", trackingSession?.id],
    queryFn: () => trackingSession ? adminApi.getSubmissionTracking(trackingSession.id) : Promise.resolve([]),
    enabled: Boolean(trackingSession),
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: ({ sessionId, studentId }: { sessionId: number; studentId: number }) =>
      adminApi.deleteStudentFeedback(sessionId, studentId),
    onSuccess: () => {
      toast.success(`Deleted feedback records for ${feedbackToDelete?.studentName || "student"}`);
      setFeedbackToDelete(null);
      void qc.invalidateQueries({ queryKey: ["submission-tracking"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback-sessions"],
    queryFn: sessionsApi.list,
  });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            session_name: editing.session_name,
            semester: editing.semester,
            academic_year: editing.academic_year,
            start_date: editing.start_date?.slice(0, 10) ?? "",
            end_date: editing.end_date?.slice(0, 10) ?? "",
            status: editing.status ?? "draft",
          }
        : EMPTY,
    );
  }, [dialogOpen, editing, form]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["feedback-sessions"] });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? sessionsApi.update(editing.id, values) : sessionsApi.create(values),
    onSuccess: () => {
      toast.success(editing ? "Session updated" : "Session created");
      setDialogOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sessionsApi.remove(id),
    onSuccess: () => {
      toast.success("Session deleted");
      setToDelete(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const status = form.watch("status");

  return (
    <>
      <PageHeader
        title="Feedback sessions"
        description="Only an active session accepts student feedback."
        action={
          <Button
            type="button"
            className="relative z-10 flex-shrink-0"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden /> Add session
          </Button>
        }
      />

      <div className="surface-card p-4 md:p-6">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState title="Couldn't load sessions" description={errorMessage(error)} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No sessions yet"
            description="No feedback sessions yet — create one to start collecting responses."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session name</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.session_name}</TableCell>
                    <TableCell>{s.semester}</TableCell>
                    <TableCell>{s.academic_year}</TableCell>
                    <TableCell>{s.start_date?.slice(0, 10)}</TableCell>
                    <TableCell>{s.end_date?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)} className="capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 gap-1 text-xs"
                          title="Track Submissions"
                          onClick={() => setTrackingSession(s)}
                        >
                          <ClipboardList className="size-4" /> Track
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil aria-label={`Edit ${s.session_name}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(s)}>
                          <Trash2
                            aria-label={`Delete ${s.session_name}`}
                            className="text-destructive"
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit session" : "Add session"}</DialogTitle>
            <DialogDescription>Set the window during which feedback is collected.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <Field
              id="session_name"
              label="Session name"
              placeholder="Even Semester 2025-26 Feedback"
              error={form.formState.errors.session_name?.message}
              {...form.register("session_name")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="semester"
                label="Semester"
                type="number"
                error={form.formState.errors.semester?.message}
                {...form.register("semester")}
              />
              <Field
                id="academic_year"
                label="Academic year"
                placeholder="2025-26"
                error={form.formState.errors.academic_year?.message}
                {...form.register("academic_year")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="start_date"
                label="Start date"
                type="date"
                error={form.formState.errors.start_date?.message}
                {...form.register("start_date")}
              />
              <Field
                id="end_date"
                label="End date"
                type="date"
                error={form.formState.errors.end_date?.message}
                {...form.register("end_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => form.setValue("status", v, { shouldValidate: true })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="closed">closed</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.status.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        loading={deleteMutation.isPending}
        title={`Delete ${toDelete?.session_name ?? "session"}?`}
        description="Feedback linked to this session may also be removed by the backend."
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />

      <Dialog open={Boolean(trackingSession)} onOpenChange={(o) => !o && setTrackingSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission Tracking — {trackingSession?.session_name}</DialogTitle>
            <DialogDescription>
              Shows who submitted feedback (anonymous — no ratings or content visible).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {trackingQuery.isLoading ? (
              <TableSkeleton cols={3} />
            ) : (trackingQuery.data ?? []).length === 0 ? (
              <EmptyState title="No students found" description="No students matched this session's semester." />
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
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1">
                              <CheckCircle2 className="size-3.5" /> Submitted
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Delete student feedback for this session"
                              onClick={() => setFeedbackToDelete({ studentId: entry.student_id, studentName: entry.name })}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
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

      <ConfirmDelete
        open={Boolean(feedbackToDelete)}
        onOpenChange={(o) => !o && setFeedbackToDelete(null)}
        loading={deleteFeedbackMutation.isPending}
        title={`Delete feedback for ${feedbackToDelete?.studentName ?? "student"}?`}
        description="Are you sure you want to delete this student's feedback for this session? This action cannot be undone."
        onConfirm={() =>
          trackingSession &&
          feedbackToDelete &&
          deleteFeedbackMutation.mutate({
            sessionId: trackingSession.id,
            studentId: feedbackToDelete.studentId,
          })
        }
      />
    </>
  );
}
