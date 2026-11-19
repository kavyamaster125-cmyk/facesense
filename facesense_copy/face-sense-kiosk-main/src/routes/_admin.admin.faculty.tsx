import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { errorMessage, facultyApi, type Faculty } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty — FaceSense AI Admin" },
      {
        name: "description",
        content: "Add, edit and remove faculty members with their department and designation.",
      },
      { property: "og:title", content: "Faculty — FaceSense AI Admin" },
      { property: "og:description", content: "Faculty directory management in FaceSense AI." },
    ],
  }),
  component: FacultyPage,
});

const schema = z.object({
  faculty_code: z.string().min(1, "Faculty code is required"),
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email address is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
});
type FormValues = z.infer<typeof schema>;
const EMPTY: FormValues = {
  faculty_code: "",
  full_name: "",
  email: "",
  department: "Computer Engineering",
  designation: "Assistant Professor",
};

function FacultyPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [toDelete, setToDelete] = useState<Faculty | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["faculty"], queryFn: facultyApi.list });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            faculty_code: editing.faculty_code ?? "",
            full_name: editing.full_name ?? "",
            email: editing.email ?? "",
            department: editing.department ?? "Computer Engineering",
            designation: editing.designation ?? "Assistant Professor",
          }
        : EMPTY,
    );
  }, [dialogOpen, editing, form]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["faculty"] });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? facultyApi.update(editing.id, values) : facultyApi.create(values),
    onSuccess: () => {
      toast.success(editing ? "Faculty updated" : "Faculty added");
      setDialogOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => facultyApi.remove(id),
    onSuccess: () => {
      toast.success("Faculty deleted");
      setToDelete(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <PageHeader
        title="Faculty"
        description="Teaching staff who receive student feedback."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden /> Add faculty
          </Button>
        }
      />

      <div className="surface-card p-4 md:p-6">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState title="Couldn't load faculty" description={errorMessage(error)} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="No faculty yet"
            description="No faculty yet — add one to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty code</TableHead>
                  <TableHead>Full name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono font-semibold text-xs">{f.faculty_code}</TableCell>
                    <TableCell className="font-medium">{f.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{f.email}</TableCell>
                    <TableCell>{f.department}</TableCell>
                    <TableCell>{f.designation}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(f);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil aria-label={`Edit ${f.full_name}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(f)}>
                          <Trash2 aria-label={`Delete ${f.full_name}`} className="text-destructive" />
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
            <DialogTitle>{editing ? "Edit faculty" : "Add faculty"}</DialogTitle>
            <DialogDescription>Faculty profile, department and academic designation.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <Field
              id="faculty_code"
              label="Faculty code"
              placeholder="e.g. FAC_PK"
              error={form.formState.errors.faculty_code?.message}
              {...form.register("faculty_code")}
            />
            <Field
              id="full_name"
              label="Full name"
              placeholder="e.g. Dr. Pradeep Kumar"
              error={form.formState.errors.full_name?.message}
              {...form.register("full_name")}
            />
            <Field
              id="email"
              label="Email address"
              type="email"
              placeholder="e.g. pradeep.kumar@scet.ac.in"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
            <Field
              id="department"
              label="Department"
              placeholder="e.g. Computer Engineering"
              list="faculty-dept-options"
              error={form.formState.errors.department?.message}
              {...form.register("department")}
            />
            <datalist id="faculty-dept-options">
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
              id="designation"
              label="Designation"
              placeholder="Assistant Professor"
              list="faculty-desig-options"
              error={form.formState.errors.designation?.message}
              {...form.register("designation")}
            />
            <datalist id="faculty-desig-options">
              <option value="Assistant Professor" />
              <option value="Associate Professor" />
              <option value="Professor" />
              <option value="Head of Department" />
              <option value="Adjunct Professor" />
              <option value="Visiting Faculty" />
            </datalist>
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
        title={`Delete ${toDelete?.full_name ?? "faculty"}?`}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </>
  );
}
