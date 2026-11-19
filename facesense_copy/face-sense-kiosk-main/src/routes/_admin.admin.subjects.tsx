import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { errorMessage, subjectsApi, type Subject } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — FaceSense AI Admin" },
      {
        name: "description",
        content: "Maintain the subject catalogue with codes and semesters for feedback collection.",
      },
      { property: "og:title", content: "Subjects — FaceSense AI Admin" },
      { property: "og:description", content: "Subject catalogue management in FaceSense AI." },
    ],
  }),
  component: SubjectsPage,
});

const schema = z.object({
  subject_code: z.string().min(1, "Subject code is required"),
  subject_name: z.string().min(2, "Subject name is required"),
  department: z.string().min(1, "Department is required"),
  semester: z.coerce.number().int().min(1, "Semester must be 1–12").max(12, "Semester must be 1–12"),
});
type FormValues = z.infer<typeof schema>;
const EMPTY: FormValues = { subject_code: "", subject_name: "", department: "Computer Engineering", semester: 1 };

function SubjectsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["subjects"], queryFn: subjectsApi.list });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            subject_code: editing.subject_code,
            subject_name: editing.subject_name,
            department: editing.department || "Computer Engineering",
            semester: editing.semester,
          }
        : EMPTY,
    );
  }, [dialogOpen, editing, form]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["subjects"] });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? subjectsApi.update(editing.id, values) : subjectsApi.create(values),
    onSuccess: () => {
      toast.success(editing ? "Subject updated" : "Subject added");
      setDialogOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.remove(id),
    onSuccess: () => {
      toast.success("Subject deleted");
      setToDelete(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <PageHeader
        title="Subjects"
        description="Courses that students give feedback on."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden /> Add subject
          </Button>
        }
      />

      <div className="surface-card p-4 md:p-6">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <EmptyState title="Couldn't load subjects" description={errorMessage(error)} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects yet"
            description="No subjects yet — add one to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject code</TableHead>
                  <TableHead>Subject name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.subject_code}</TableCell>
                    <TableCell>{s.subject_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.department}</TableCell>
                    <TableCell>{s.semester}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil aria-label={`Edit ${s.subject_name}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(s)}>
                          <Trash2
                            aria-label={`Delete ${s.subject_name}`}
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
            <DialogTitle>{editing ? "Edit subject" : "Add subject"}</DialogTitle>
            <DialogDescription>Subjects are grouped by department and semester.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <Field
              id="subject_code"
              label="Subject code"
              placeholder="e.g. CS301"
              error={form.formState.errors.subject_code?.message}
              {...form.register("subject_code")}
            />
            <Field
              id="subject_name"
              label="Subject name"
              placeholder="e.g. Compiler Design"
              error={form.formState.errors.subject_name?.message}
              {...form.register("subject_name")}
            />
            <Field
              id="department"
              label="Department"
              placeholder="e.g. Computer Engineering"
              list="subject-dept-options"
              error={form.formState.errors.department?.message}
              {...form.register("department")}
            />
            <datalist id="subject-dept-options">
              <option value="Computer Engineering" />
              <option value="Information Technology" />
              <option value="Mechanical Engineering" />
              <option value="Civil Engineering" />
              <option value="Electronics & Communication" />
              <option value="Electrical Engineering" />
              <option value="Chemical Engineering" />
              <option value="Artificial Intelligence & Data Science" />
            </datalist>
            <Field
              id="semester"
              label="Semester"
              type="number"
              error={form.formState.errors.semester?.message}
              {...form.register("semester")}
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
        title={`Delete ${toDelete?.subject_name ?? "subject"}?`}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </>
  );
}
