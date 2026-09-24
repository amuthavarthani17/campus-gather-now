import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FolderTree, Ticket, Users } from "lucide-react";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  allRegistrationsQuery,
  categoriesQuery,
  eventsQuery,
  formatEventDate,
  isPast,
  profilesQuery,
  seatsLeft,
} from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview — CampusConnect" },
      { name: "description", content: "Event, student and registration statistics for administrators." },
      { property: "og:title", content: "Admin Overview — CampusConnect" },
      { property: "og:description", content: "Campus event statistics at a glance." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const events = useQuery(eventsQuery);
  const regs = useQuery(allRegistrationsQuery);
  const students = useQuery(profilesQuery);
  const categories = useQuery(categoriesQuery);

  const loading = events.isLoading || regs.isLoading || students.isLoading;
  const error = events.isError || regs.isError || students.isError;

  if (loading) return <LoadingBlock label="Crunching the numbers…" />;
  if (error)
    return (
      <ErrorState
        onRetry={() => {
          void events.refetch();
          void regs.refetch();
          void students.refetch();
        }}
      />
    );

  const upcoming = (events.data ?? []).filter((e) => !isPast(e));
  const stats = [
    { icon: CalendarDays, label: "Total events", value: events.data?.length ?? 0, sub: `${upcoming.length} upcoming` },
    { icon: Ticket, label: "Registrations", value: regs.data?.length ?? 0, sub: "All time" },
    { icon: Users, label: "Students", value: students.data?.length ?? 0, sub: "Registered profiles" },
    { icon: FolderTree, label: "Categories", value: categories.data?.length ?? 0, sub: "Active" },
  ];

  const topEvents = [...(events.data ?? [])]
    .sort((a, b) => b.seats_taken - a.seats_taken)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-surface p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <s.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Most popular events</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/events">Manage events</Link>
          </Button>
        </div>
        {topEvents.length === 0 ? (
          <EmptyState title="No events yet" description="Create your first event to get started." />
        ) : (
          <div className="card-surface divide-y overflow-hidden">
            {topEvents.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDate(e.event_date)} · {e.venue}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{e.seats_taken} registered</p>
                  <p className="text-muted-foreground">{seatsLeft(e)} seats left</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Latest registrations</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/registrations">View all</Link>
          </Button>
        </div>
        {(regs.data ?? []).length === 0 ? (
          <EmptyState title="No registrations yet" />
        ) : (
          <div className="card-surface divide-y overflow-hidden">
            {(regs.data ?? []).slice(0, 5).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{r.profiles?.full_name || r.profiles?.email || "Student"}</p>
                  <p className="text-sm text-muted-foreground">{r.events?.title}</p>
                </div>
                <span className="rounded-md bg-primary-soft px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                  {r.ticket_code}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
