import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  assignmentsApi,
  errorMessage,
  facultyApi,
  subjectsApi,
  type Assignment,
} from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/assignments")({
  head: () => ({
    meta: [
      { title: "Faculty-Subject Assignments — FaceSense AI Admin" },
      {
        name: "description",
        content:
          "Map faculty to subjects by semester, division and academic year so students see the right feedback cards.",
      },
      { property: "og:title", content: "Faculty-Subject Assignments — FaceSense AI Admin" },
      {
        property: "og:description",
        content: "Assign teaching staff to subjects per division and academic year.",
      },
    ],
  }),
  component: AssignmentsPage,
});

const schema = z.object({
  faculty_id: z.coerce.number().int().min(1, "Select a faculty member"),
  subject_id: z.coerce.number().int().min(1, "Select a subject"),
  semester: z.coerce.number().int().min(1, "Semester must be 1–12").max(12, "Semester must be 1–12"),
  division: z.string().min(1, "Division is required"),
  academic_year: z
    .string()
    .min(4, "Academic year is required")
    .regex(/^\d{4}(-\d{2,4})?$/, "Use a format like 2025-26"),
});
type FormValues = z.infer<typeof schema>;

function AssignmentsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Assignment | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ["assignments"],
    queryFn: assignmentsApi.list,
  });
  const facultyQuery = useQuery({ queryKey: ["faculty"], queryFn: facultyApi.list });
  const subjectsQuery = useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.list });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { semester: 1, division: "", academic_year: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => assignmentsApi.create(values),
    onSuccess: () => {
      toast.success("Assignment created");
      setDialogOpen(false);
      form.reset({ semester: 1, division: "", academic_year: "" });
      void qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assignmentsApi.remove(id),
    onSuccess: () => {
      toast.success("Assignment deleted");
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const facultyName = (id: number) =>
    facultyQuery.data?.find((f) => f.id === id)?.full_name ?? `Faculty #${id}`;
  const subjectName = (id: number) => {
    const s = subjectsQuery.data?.find((x) => x.id === id);
    return s ? `${s.subject_code} · ${s.subject_name}` : `Subject #${id}`;
  };

  const facultyId = form.watch("faculty_id");
  const subjectId = form.watch("subject_id");

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Which faculty teaches which subject, per division."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden /> Add assignment
          </Button>
        }
      />

      <div className="surface-card p-4 md:p-6">
        {assignmentsQuery.isLoading ? (
          <TableSkeleton cols={5} />
        ) : assignmentsQuery.error ? (
          <EmptyState
            title="Couldn't load assignments"
            description={errorMessage(assignmentsQuery.error)}
          />
        ) : (assignmentsQuery.data ?? []).length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No assignments yet"
            description="No assignments yet — link a faculty member to a subject to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Academic year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assignmentsQuery.data ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{facultyName(a.faculty_id)}</TableCell>
                    <TableCell>{subjectName(a.subject_id)}</TableCell>
                    <TableCell>{a.semester}</TableCell>
                    <TableCell>{a.division}</TableCell>
                    <TableCell>{a.academic_year}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(a)}>
                        <Trash2 aria-label="Delete assignment" className="text-destructive" />
                      </Button>
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
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>
              Students see this pairing on their feedback dashboard.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty</Label>
              <Select
                value={facultyId ? String(facultyId) : ""}
                onValueChange={(v) =>
                  form.setValue("faculty_id", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger id="faculty">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {(facultyQuery.data ?? []).map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.full_name} — {f.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.faculty_id && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.faculty_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={subjectId ? String(subjectId) : ""}
                onValueChange={(v) =>
                  form.setValue("subject_id", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {(subjectsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.subject_code} — {s.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.subject_id && (
                <p role="alert" className="text-xs text-destructive">
                  {form.formState.errors.subject_id.message}
                </p>
              )}
            </div>

            <Field
              id="semester"
              label="Semester"
              type="number"
              error={form.formState.errors.semester?.message}
              {...form.register("semester")}
            />
            <Field
              id="division"
              label="Division"
              placeholder="A"
              error={form.formState.errors.division?.message}
              {...form.register("division")}
            />
            <Field
              id="academic_year"
              label="Academic year"
              placeholder="2025-26"
              error={form.formState.errors.academic_year?.message}
              {...form.register("academic_year")}
            />

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
        title="Delete this assignment?"
        description="Students will no longer see this subject-faculty pair."
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </>
  );
}
