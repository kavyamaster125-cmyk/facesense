import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  GraduationCap,
  Percent,
  ScanFace,
  UserCheck,
  BookOpen,
  Layers,
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  FileText,
  Activity,
  Server
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi, errorMessage } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Super Admin Dashboard — FaceSense AI" },
      {
        name: "description",
        content: "System-wide overview of face-enrolled students, faculty, subjects, active cycles, and responses.",
      },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const [logType, setLogType] = useState<"app" | "error" | "access">("app");

  const stats = useQuery({ queryKey: ["admin-system-analytics"], queryFn: adminApi.getAnalytics });

  const auditLogsQuery = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => adminApi.getAuditLogs({ limit: 12 }),
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const systemLogsQuery = useQuery({
    queryKey: ["admin-system-logs", logType],
    queryFn: () => adminApi.getSystemLogs(logType, 30),
    enabled: false, // load on demand
  });

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  return (
    <>
      <PageHeader
        title="Super Admin System Overview"
        description="Live snapshot of campus face feedback operations, audit trails, and system telemetry."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void stats.refetch();
              void auditLogsQuery.refetch();
            }}
            disabled={auditLogsQuery.isFetching}
          >
            <RotateCw className={`mr-2 size-4 ${auditLogsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : stats.error ? (
          <div className="sm:col-span-2 xl:col-span-4">
            <EmptyState title="Couldn't load analytics" description={errorMessage(stats.error)} />
          </div>
        ) : stats.data ? (
          <>
            <StatCard label="Total Students" value={stats.data.total_students} icon={GraduationCap} />
            <StatCard label="Registered Face Embeddings" value={stats.data.registered_faces} icon={ScanFace} />
            <StatCard label="Faculty Members" value={stats.data.total_faculty} icon={UserCheck} />
            <StatCard label="Feedback Responses Submitted" value={stats.data.total_feedback_submitted} icon={CheckCircle2} />
          </>
        ) : null}
      </div>

      {/* Active Cycle Status Banner */}
      {stats.data && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Active Feedback Session Status</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="p-4 rounded-xl border bg-muted/30">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Active Cycle</span>
              <p className="mt-1 text-base font-bold text-foreground">{stats.data.active_cycle_name}</p>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Assigned Subjects</span>
              <p className="mt-1 text-base font-bold text-foreground">{stats.data.total_subjects} Subjects</p>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Overall Response Rate</span>
              <p className="mt-1 text-base font-bold text-emerald-600">{stats.data.overall_response_rate}% Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Live System Activity & Audit Trail */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live Security & Activity Audit Log</h2>
              <p className="text-xs text-muted-foreground">
                Chronological persistent audit trail of administrative actions, biometric logins, and feedback submissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Auto-sync: 15s
            </Badge>
          </div>
        </div>

        {auditLogsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : auditLogsQuery.error ? (
          <EmptyState title="Couldn't load audit logs" description={errorMessage(auditLogsQuery.error)} />
        ) : (auditLogsQuery.data?.items ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No audit events recorded yet. Perform actions like logging in or submitting feedback to see live entries.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action Event</TableHead>
                  <TableHead>User / Identity</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Client IP</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogsQuery.data?.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium text-xs text-foreground bg-muted/50 px-2 py-1 rounded">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {log.user_email || log.resource || "System / Anonymous"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {log.role || "SYSTEM"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || "127.0.0.1"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="size-3" /> SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <ShieldAlert className="size-3" /> FAILED
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Server File Log Diagnostics */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Server Rotating File Log Diagnostics</h2>
              <p className="text-xs text-muted-foreground">
                Direct view into rotated server log files: <code className="bg-muted px-1 rounded">app.log</code>, <code className="bg-muted px-1 rounded">error.log</code>, and <code className="bg-muted px-1 rounded">access.log</code>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={logType === "app" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLogType("app");
                void systemLogsQuery.refetch();
              }}
            >
              App Log
            </Button>
            <Button
              variant={logType === "error" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLogType("error");
                void systemLogsQuery.refetch();
              }}
            >
              Error Log
            </Button>
            <Button
              variant={logType === "access" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setLogType("access");
                void systemLogsQuery.refetch();
              }}
            >
              Access Log
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void systemLogsQuery.refetch()}
              disabled={systemLogsQuery.isFetching}
            >
              <RotateCw className={`size-4 ${systemLogsQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {systemLogsQuery.data ? (
          <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-72 space-y-1">
            {systemLogsQuery.data.lines.length === 0 ? (
              <p className="text-slate-500 italic">Log file is currently empty.</p>
            ) : (
              systemLogsQuery.data.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed whitespace-pre ${
                    line.includes("ERROR") || line.includes("CRITICAL")
                      ? "text-red-400 font-semibold"
                      : line.includes("WARN")
                      ? "text-amber-400"
                      : line.includes("AUDIT")
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            Click any log category above (App, Error, or Access) to inspect real-time server disk logs.
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card flex items-center gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
