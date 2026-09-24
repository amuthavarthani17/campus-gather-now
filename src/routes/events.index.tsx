import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EventCard } from "@/components/event-card";
import { EmptyState, ErrorState, LoadingGrid } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQuery, eventsQuery, isPast } from "@/lib/campus";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Browse Events — CampusConnect" },
      {
        name: "description",
        content:
          "Search and filter every college event by category, date and availability, then register online.",
      },
      { property: "og:title", content: "Browse Events — CampusConnect" },
      {
        property: "og:description",
        content: "Search and filter college events by category and register online.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const events = useQuery(eventsQuery);
  const categories = useQuery(categoriesQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [timing, setTiming] = useState("upcoming");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events.data ?? []).filter((event) => {
      const matchesTerm =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.venue.toLowerCase().includes(term) ||
        event.organizer.toLowerCase().includes(term);
      const matchesCategory = category === "all" || event.categories?.slug === category;
      const past = isPast(event);
      const matchesTiming =
        timing === "all" || (timing === "upcoming" ? !past : past);
      return matchesTerm && matchesCategory && matchesTiming;
    });
  }, [events.data, search, category, timing]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Campus events</h1>
        <p className="mt-2 text-muted-foreground">
          {events.data ? `${events.data.length} events published this season.` : "Loading events…"}
        </p>
      </header>

      <div className="card-surface mb-8 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, venue or organiser"
            aria-label="Search events"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={timing} onValueChange={setTiming}>
          <SelectTrigger aria-label="Filter by timing">
            <SelectValue placeholder="When" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Completed</SelectItem>
            <SelectItem value="all">All dates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {events.isLoading ? (
        <LoadingGrid />
      ) : events.isError ? (
        <ErrorState onRetry={() => void events.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events match your filters"
          description="Try a different category, clear your search, or include completed events."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setTiming("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
