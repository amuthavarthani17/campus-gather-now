import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Sparkles, Ticket, Users } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoriesQuery, eventsQuery, isPast } from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusConnect — Every college event in one place" },
      {
        name: "description",
        content:
          "Browse upcoming fests, hackathons, workshops and tournaments, then register online in seconds with CampusConnect.",
      },
      { property: "og:title", content: "CampusConnect — Every college event in one place" },
      {
        property: "og:description",
        content: "Browse upcoming college events and register online in seconds.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const events = useQuery(eventsQuery);
  const categories = useQuery(categoriesQuery);

  const upcoming = (events.data ?? []).filter((e) => !isPast(e)).slice(0, 6);
  const totalSeats = (events.data ?? []).reduce((sum, e) => sum + e.total_seats, 0);

  return (
    <>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div className="space-y-6">
            <Badge className="border-0 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              <Sparkles className="size-3.5" aria-hidden /> 2026 campus season is live
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Every campus event. One simple place to register.
            </h1>
            <p className="max-w-xl text-lg text-primary-foreground/85">
              CampusConnect brings fests, hackathons, workshops, seminars and tournaments together
              — with live seat counts, instant confirmation and your own registration history.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/events">
                  Browse events <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Create student account</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: CalendarCheck, label: "Live events", value: events.data?.length ?? "—" },
              { icon: Users, label: "Total seats", value: totalSeats || "—" },
              { icon: Ticket, label: "Instant tickets", value: "24/7" },
              { icon: Sparkles, label: "Categories", value: categories.data?.length ?? "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur"
              >
                <stat.icon className="size-5" aria-hidden />
                <p className="mt-3 font-display text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-primary-foreground/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Upcoming events</h2>
            <p className="mt-1 text-muted-foreground">
              Hand-picked highlights from across every department.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/events">
              See all events <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        {events.isLoading ? (
          <LoadingGrid />
        ) : events.isError ? (
          <ErrorState onRetry={() => void events.refetch()} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming events yet"
            description="New events are published by the student activity centre every week. Check back soon."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card-surface bg-panel p-8">
          <h2 className="text-2xl font-bold">How registration works</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create your student profile",
                body: "Sign up with your college email, add your department and year.",
              },
              {
                step: "02",
                title: "Pick an event",
                body: "Filter by category, check the rules, venue, timing and seats left.",
              },
              {
                step: "03",
                title: "Register and get your ticket",
                body: "One click books your seat and a unique ticket code appears instantly.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <span className="font-display text-sm font-bold text-primary">{item.step}</span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
