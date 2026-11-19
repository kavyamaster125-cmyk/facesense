import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, setAuthSession, errorMessage } from "@/lib/api";

export const Route = createFileRoute("/faculty/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Faculty Login — FaceSense AI" },
      {
        name: "description",
        content: "Faculty portal login to access confidential aggregated feedback analytics.",
      },
    ],
  }),
  component: FacultyLoginPage,
});

function FacultyLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.facultyLogin(email, password);
      setAuthSession(res.access_token, "FACULTY");
      toast.success(`Welcome Professor ${res.faculty.full_name}!`);
      void navigate({ to: "/faculty/dashboard" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campus-gradient flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-8 rounded-3xl border border-border shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserCheck className="size-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Faculty Portal Login</h1>
          <p className="text-sm text-muted-foreground">Access your anonymous aggregated feedback report</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Faculty Email or Faculty Code</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="text"
                placeholder="prof.xyz@college.edu or FAC001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-6 text-base" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Faculty Dashboard"}
          </Button>
        </form>

        <div className="pt-4 border-t border-border text-center space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="size-4" /> Confidentiality & Anonymity Guaranteed
          </div>
          <p>You will receive strictly aggregated responses. Zero student identity data is exposed.</p>
          <div className="pt-2">
            <Link to="/" className="text-primary hover:underline">← Student Face Verification Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
