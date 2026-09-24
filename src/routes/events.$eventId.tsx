import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  eventQuery,
  formatEventDate,
  formatTime,
  isPast,
  myRegistrationsQuery,
  posterFor,
  seatsLeft,
} from "@/lib/campus";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details — CampusConnect" },
      {
        name: "description",
        content:
          "Full event details: poster, date, time, venue, rules, seat availability and online registration.",
      },
      { property: "og:title", content: "Event details — CampusConnect" },
      {
        property: "og:description",
        content: "Date, time, venue, rules and seats — register online in one click.",
      },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const event = useQuery(eventQuery(eventId));
  const myRegs = useQuery(myRegistrationsQuery(user?.id));

  const existing = (myRegs.data ?? []).find((r) => r.event_id === eventId);

  const register = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not-signed-in");
      const { data, error } = await supabase
        .from("registrations")
        .insert({ event_id: eventId, user_id: user.id })
        .select("ticket_code")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("duplicate");
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("Registration confirmed", {
        description: `Your ticket code is ${data?.ticket_code}. Find it under My Registrations.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => {
      if (error.message === "duplicate") {
        toast.error("You are already registered for this event");
        void queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
        return;
      }
      toast.error(error.message === "This event is full" ? "This event is full" : "Registration failed", {
        description: error.message,
      });
    },
  });

  if (event.isLoading) return <LoadingBlock label="Loading event…" />;
  if (event.isError)
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState onRetry={() => void event.refetch()} />
      </div>
    );
  if (!event.data)
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <EmptyState
          title="Event not found"
          description="This event may have been removed by the organisers."
          action={
            <Button asChild variant="outline">
              <Link to="/events">Back to events</Link>
            </Button>
          }
        />
      </div>
    );

  const e = event.data;
  const left = seatsLeft(e);
  const past = isPast(e);
  const fillPercent = Math.round((e.seats_taken / Math.max(e.total_seats, 1)) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/events">
          <ArrowLeft className="size-4" aria-hidden /> All events
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="card-surface overflow-hidden">
            <img
              src={posterFor(e)}
              alt={`${e.title} poster`}
              width={1280}
              height={720}
              className="h-64 w-full object-cover sm:h-80"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {e.categories ? <Badge>{e.categories.name}</Badge> : null}
              {past ? <Badge variant="secondary">Completed</Badge> : null}
              {!past && left === 0 ? <Badge variant="destructive">Fully booked</Badge> : null}
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{e.title}</h1>
            <p className="text-muted-foreground">Organised by {e.organizer}</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {e.description}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Rules & eligibility</h2>
            <ul className="space-y-2">
              {e.rules
                .split(/\.\s+|\n/)
                .map((r) => r.trim())
                .filter(Boolean)
                .map((rule, i) => (
                  <li key={i} className="flex gap-2 text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{rule.replace(/\.$/, "")}</span>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-surface space-y-5 p-6">
            <dl className="space-y-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold">Date</dt>
                  <dd className="text-muted-foreground">{formatEventDate(e.event_date)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold">Time</dt>
                  <dd className="text-muted-foreground">
                    {formatTime(e.start_time)}
                    {e.end_time ? ` – ${formatTime(e.end_time)}` : ""}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="font-semibold">Venue</dt>
                  <dd className="text-muted-foreground">{e.venue}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="size-5 shrink-0 text-primary" aria-hidden />
                <div className="w-full">
                  <dt className="font-semibold">Seats</dt>
                  <dd className="text-muted-foreground">
                    {e.seats_taken} registered · {left} left of {e.total_seats}
                  </dd>
                  <Progress value={fillPercent} className="mt-2" />
                </div>
              </div>
            </dl>

            {existing ? (
              <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-success">
                  <CheckCircle2 className="size-4" aria-hidden /> You&apos;re registered
                </p>
                <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <Ticket className="size-4" aria-hidden /> Ticket {existing.ticket_code}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link to="/registrations">View my registrations</Link>
                </Button>
              </div>
            ) : !user ? (
              <div className="space-y-2">
                <Button asChild className="w-full" size="lg">
                  <Link to="/auth">Sign in to register</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Registration is free for enrolled students.
                </p>
              </div>
            ) : past ? (
              <Button className="w-full" size="lg" disabled>
                Event completed
              </Button>
            ) : left === 0 ? (
              <Button className="w-full" size="lg" disabled>
                No seats available
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={() => register.mutate()}
                disabled={register.isPending || myRegs.isLoading}
              >
                {register.isPending ? "Registering…" : "Register now"}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
