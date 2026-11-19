import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ScanFace, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WebcamCapture } from "@/components/WebcamCapture";
import { BASE_URL, errorMessage, adminApi, studentApi } from "@/lib/api";

export const Route = createFileRoute("/register-face/$studentId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Register Student Face — FaceSense AI" },
      {
        name: "description",
        content: "Enroll a student's face embedding in FaceSense AI for passwordless authentication.",
      },
    ],
  }),
  component: RegisterFacePage,
});

function RegisterFacePage() {
  const qc = useQueryClient();
  const { studentId } = useParams({ from: "/register-face/$studentId" });
  const id = Number(studentId);
  const [file, setFile] = useState<File | null>(null);
  const [registeredPath, setRegisteredPath] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const studentQuery = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentApi.getProfile(id),
  });

  const handleRegister = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await adminApi.registerFace(id, file);
      setSuccessMsg(res.message || "Face registered successfully");
      if (res.face_image_path) {
        setRegisteredPath(res.face_image_path);
      }
      toast.success(res.message || "Face registered successfully");
      void qc.invalidateQueries({ queryKey: ["students"] });
      void qc.invalidateQueries({ queryKey: ["student", id] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const student = studentQuery.data;
  const currentFacePath = registeredPath || student?.face_image_path;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/admin/students">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Students Roster
          </Link>
        </Button>

        <header className="surface-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Enroll Student Face Biometric</h1>
            {studentQuery.isLoading ? (
              <Skeleton className="mt-2 h-5 w-52" />
            ) : student ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {student.full_name} · Enrollment: <span className="font-mono font-semibold text-foreground">{student.enrollment_no}</span> · Semester {student.semester}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Student #{studentId}</p>
            )}
          </div>

          {/* Current Registered Face Preview */}
          {currentFacePath ? (
            <div className="flex flex-col items-center gap-1">
              <img
                src={`${BASE_URL}${currentFacePath}`}
                alt="Enrolled Face"
                className="size-14 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Active Face
              </span>
            </div>
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground text-xs font-bold">
              No Face
            </div>
          )}
        </header>

        <section className="surface-card mt-6 p-6 rounded-2xl border border-border shadow-md space-y-4">
          <WebcamCapture
            allowUpload
            captureLabel="Capture / Select Face Image"
            onCapture={(f) => {
              setFile(f);
              setSuccessMsg(null);
            }}
            onClear={() => {
              setFile(null);
              setSuccessMsg(null);
            }}
          />

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <Button
            className="w-full py-6 text-base font-medium"
            disabled={!file || loading}
            onClick={() => void handleRegister()}
          >
            <ScanFace className="mr-2 size-5" /> {loading ? "Saving Image & Vector..." : "Upload & Register Face Data"}
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="size-4 text-emerald-500" /> Image is linked to student profile & ArcFace 512-dim embedding is stored for face login.
          </p>
        </section>
      </main>
    </div>
  );
}
