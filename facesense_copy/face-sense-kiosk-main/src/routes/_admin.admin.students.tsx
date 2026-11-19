import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Pencil, Plus, ScanFace, Search, Trash2, Camera, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/admin/Field";
import { BASE_URL, errorMessage, studentsApi, type Student } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/students")({
  head: () => ({
    meta: [
      { title: "Students — FaceSense AI Admin" },
      {
        name: "description",
        content: "Create, edit, and upload face biometric embeddings for student authentication.",
      },
    ],
  }),
  component: StudentsPage,
});

const schema = z.object({
  enrollment_no: z.string().min(1, "Enrollment number is required"),
  full_name: z.string().min(2, "Full name is required"),
  department: z.string().min(1, "Department is required"),
  semester: z.coerce.number().int().min(1, "Semester must be 1–12").max(12, "Semester must be 1–12"),
  attendance_percentage: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
});
type FormValues = z.infer<typeof schema>;

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["students"], queryFn: studentsApi.list });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { enrollment_no: "", full_name: "", department: "", semester: 1, attendance_percentage: 0 },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            enrollment_no: editing.enrollment_no,
            full_name: editing.full_name,
            department: editing.department,
            semester: editing.semester,
            attendance_percentage: editing.attendance_percentage ?? 0,
          }
        : { enrollment_no: "", full_name: "", department: "", semester: 1, attendance_percentage: 0 },
    );
  }, [dialogOpen, editing, form]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["students"] });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      editing ? studentsApi.update(editing.id, values) : studentsApi.create(values),
    onSuccess: () => {
      toast.success(editing ? "Student record updated" : "Student record created");
      setDialogOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentsApi.remove(id),
    onSuccess: () => {
      toast.success(`Student ${toDelete?.full_name ?? ""} deleted successfully`);
      setToDelete(null);
      void invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.enrollment_no.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader
        title="Student Directory & Face Biometrics"
        description="Manage campus students and upload/register face biometrics for passwordless login."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" /> Add Student
          </Button>
        }
      />

      <div className="surface-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
        <div className="relative mb-4 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search by name, enrollment no or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <EmptyState title="Couldn't load students" description={errorMessage(error)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? "No matching students" : "No students in roster"}
            description={
              search
                ? "Try searching for a different student name or enrollment number."
                : "Add your first student to begin face enrollment."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Face Avatar</TableHead>
                  <TableHead>Enrollment No</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Biometric Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    {/* Display Uploaded Face Avatar */}
                    <TableCell>
                      {s.face_image_path ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={`${BASE_URL}${s.face_image_path}`}
                            alt={s.full_name}
                            className="size-10 rounded-full object-cover border-2 border-primary/40 shadow-sm"
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20">
                          {s.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-xs">{s.enrollment_no}</TableCell>
                    <TableCell className="font-medium text-foreground">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.department}</TableCell>
                    <TableCell>{s.semester}</TableCell>
                    <TableCell>
                      <span className={s.attendance_percentage != null && s.attendance_percentage > 75 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                        {s.attendance_percentage ?? 0}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.is_registered ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-medium">
                          Enrolled ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Pending Face
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary" title="Upload Face / Register">
                          <Link to="/register-face/$studentId" params={{ studentId: String(s.id) }}>
                            <Camera className="mr-1 size-4" /> Upload Face
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          title="Edit Student"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          title="Delete Student"
                          onClick={() => setToDelete(s)}
                        >
                          <Trash2 className="size-4 text-destructive" />
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
            <DialogTitle>{editing ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this student's academic profile." : "Enter student details to add to the roster."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <Field
              id="enrollment_no"
              label="Enrollment No"
              error={form.formState.errors.enrollment_no?.message}
              {...form.register("enrollment_no")}
            />
            <Field
              id="full_name"
              label="Full Name"
              error={form.formState.errors.full_name?.message}
              {...form.register("full_name")}
            />
            <Field
              id="department"
              label="Department"
              error={form.formState.errors.department?.message}
              {...form.register("department")}
            />
            <Field
              id="semester"
              label="Semester"
              type="number"
              error={form.formState.errors.semester?.message}
              {...form.register("semester")}
            />
            <Field
              id="attendance_percentage"
              label="Attendance %"
              type="number"
              placeholder="85"
              error={form.formState.errors.attendance_percentage?.message}
              {...form.register("attendance_percentage")}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        loading={deleteMutation.isPending}
        title={`Delete ${toDelete?.full_name ?? "student"}?`}
        description="This student's record, uploaded face image, and biometric embeddings will be permanently removed."
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </>
  );
}
