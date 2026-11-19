import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockKeyhole, ScanFace } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { errorMessage } from "@/lib/api";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Login — FaceSense AI" },
      {
        name: "description",
        content:
          "Sign in to the FaceSense AI admin panel to manage students, faculty, subjects, sessions and feedback analytics.",
      },
      { property: "og:title", content: "Admin Login — FaceSense AI" },
      {
        property: "og:description",
        content: "Secure admin access to the FaceSense AI campus feedback console.",
      },
    ],
  }),
  component: AdminLoginPage,
});

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

function AdminLoginPage() {
  const { login, isAuthenticated, ready } = useAdminAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && isAuthenticated) void navigate({ to: "/admin/dashboard", replace: true });
  }, [ready, isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      toast.success("Signed in");
      void navigate({ to: "/admin/dashboard", replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  return (
    <div className="campus-gradient flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanFace className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold">FaceSense AI</span>
        </Link>

        <div className="surface-card p-6 md:p-8">
          <h1 className="text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage students, faculty and feedback analytics.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@college.edu"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              <LockKeyhole aria-hidden /> {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Student?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Use face login
          </Link>
        </p>
      </div>
    </div>
  );
}
