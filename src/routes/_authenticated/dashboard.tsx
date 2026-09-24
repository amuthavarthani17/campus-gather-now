import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, CalendarDays, ShieldCheck, Ticket, User } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { EmptyState, ErrorState, LoadingBlock, LoadingGrid } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  eventsQuery,
  isPast,
  myProfileQuery,
  myRegistrationsQuery,
} from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — CampusConnect" },
      {
        name: "description",
        content: "Your CampusConnect dashboard: upcoming registrations, profile and recommended events.",
      },
      { property: "og:title", content: "Student Dashboard — CampusConnect" },
      {
        property: "og:description",
        content: "Track your registrations and discover new campus events.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const profile = useQuery(myProfileQuery(user?.id));
  const regs = useQuery(myRegistrationsQuery(user?.id));
  const events = useQuery(eventsQuery);

  const upcomingRegs = (regs.data ?? []).filter((r) => r.events && !isPast(r.events));
  const registeredIds = new Set((regs.data ?? []).map((r) => r.event_id));
  const recommended = (events.data ?? [])
    .filter((e) => !isPast(e) && !registeredIds.has(e.id))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Hi{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s what&apos;s happening with your campus events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/profile">
              <User className="size-4" aria-hidden /> My profile
            </Link>
          </Button>
          {isAdmin ? (
            <Button asChild>
              <Link to="/admin">
                <ShieldCheck className="size-4" aria-hidden /> Admin panel
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/events">Browse events</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Ticket,
            label: "Total registrations",
            value: regs.data?.length ?? "—",
          },
          {
            icon: CalendarCheck,
            label: "Upcoming events",
            value: regs.data ? upcomingRegs.length : "—",
          },
          {
            icon: CalendarDays,
            label: "Events available",
            value: events.data ? events.data.filter((e) => !isPast(e)).length : "—",
          },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <stat.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 font-display text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">Your next events</h2>
        {regs.isLoading ? (
          <LoadingBlock />
        ) : regs.isError ? (
          <ErrorState onRetry={() => void regs.refetch()} />
        ) : upcomingRegs.length === 0 ? (
          <EmptyState
            title="No upcoming registrations"
            description="Pick an event you like and your seat is booked instantly."
            action={
              <Button asChild>
                <Link to="/events">Browse events</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4">
            {upcomingRegs.map((r) => (
              <div
                key={r.id}
                className="card-surface flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <h3 className="font-semibold">{r.events?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {r.events ? `${r.events.venue} · ${r.events.event_date}` : null}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-primary-soft px-3 py-1 font-mono text-xs font-semibold text-primary">
                    {r.ticket_code}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/events/$eventId" params={{ eventId: r.event_id }}>
                      Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Recommended for you</h2>
        {events.isLoading ? (
          <LoadingGrid count={3} />
        ) : recommended.length === 0 ? (
          <EmptyState title="You're registered for everything coming up!" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
