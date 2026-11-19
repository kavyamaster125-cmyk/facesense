import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { analyticsApi, errorMessage } from "@/lib/api";

export const Route = createFileRoute("/_admin/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — FaceSense AI Admin" },
      {
        name: "description",
        content:
          "Compare average ratings and response volume across every faculty member and subject in FaceSense AI.",
      },
      { property: "og:title", content: "Analytics — FaceSense AI Admin" },
      {
        property: "og:description",
        content: "Faculty and subject rating analytics from collected student feedback.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const facultyQuery = useQuery({ queryKey: ["analytics-faculty"], queryFn: analyticsApi.faculty });
  const subjectQuery = useQuery({ queryKey: ["analytics-subject"], queryFn: analyticsApi.subject });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Average ratings by faculty and by subject, across all submitted feedback."
      />

      <div className="space-y-6">
        <Panel
          title="Average rating per faculty"
          nameKey="faculty_name"
          nameHeader="Faculty"
          color="var(--color-chart-1)"
          rows={facultyQuery.data?.map((r) => ({
            name: r.faculty_name,
            average_rating: r.average_rating,
            total_feedback: r.total_feedback,
          }))}
          isLoading={facultyQuery.isLoading}
          error={facultyQuery.error}
        />
        <Panel
          title="Average rating per subject"
          nameKey="subject_name"
          nameHeader="Subject"
          color="var(--color-chart-2)"
          rows={subjectQuery.data?.map((r) => ({
            name: r.subject_name,
            average_rating: r.average_rating,
            total_feedback: r.total_feedback,
          }))}
          isLoading={subjectQuery.isLoading}
          error={subjectQuery.error}
        />
      </div>
    </>
  );
}

type Row = { name: string; average_rating: number; total_feedback: number };

function Panel({
  title,
  nameHeader,
  color,
  rows,
  isLoading,
  error,
}: {
  title: string;
  nameKey: string;
  nameHeader: string;
  color: string;
  rows?: Row[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  const data = rows ?? [];
  return (
    <section className="surface-card p-5 md:p-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : error ? (
        <EmptyState title="Couldn't load analytics" description={errorMessage(error)} />
      ) : data.length === 0 ? (
        <EmptyState
          title="No feedback data yet"
          description="Charts appear as soon as students start submitting feedback."
        />
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 0, right: 8, bottom: 24 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 5]} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-foreground)",
                  }}
                  formatter={(v: number) => [Number(v).toFixed(2), "Avg rating"]}
                />
                <Bar dataKey="average_rating" fill={color} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{nameHeader}</TableHead>
                  <TableHead>Average rating</TableHead>
                  <TableHead>Total feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.average_rating.toFixed(2)}</TableCell>
                    <TableCell>{r.total_feedback}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
