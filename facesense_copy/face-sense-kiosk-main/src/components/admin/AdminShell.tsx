import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CalendarRange,
  GraduationCap,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  ScanFace,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: GraduationCap },
  { to: "/admin/faculty", label: "Faculty", icon: Users },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/assignments", label: "Assignments", icon: Link2 },
  { to: "/admin/sessions", label: "Sessions", icon: CalendarRange },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { email, logout } = useAdminAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    void navigate({ to: "/admin/login", replace: true });
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Admin sections">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar lg:flex">
        <SidebarBrand />
        {nav}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogOut className="size-4" aria-hidden /> Logout
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
            <div className="flex items-center justify-between">
              <SidebarBrand />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="mr-2 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X aria-hidden />
              </Button>
            </div>
            {nav}
            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
              >
                <LogOut className="size-4" aria-hidden /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu aria-hidden />
          </Button>
          <p className="hidden text-sm text-muted-foreground sm:block">Admin panel</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{email ?? "Signed in"}</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {(email ?? "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link to="/admin/dashboard" className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
        <ScanFace className="size-5" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">
        FaceSense AI
      </span>
    </Link>
  );
}
