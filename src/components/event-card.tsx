import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatEventDate,
  formatTime,
  isPast,
  posterFor,
  seatsLeft,
  type EventRecord,
} from "@/lib/campus";

export function EventCard({ event }: { event: EventRecord }) {
  const left = seatsLeft(event);
  const past = isPast(event);

  return (
    <article className="card-surface group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img
          src={posterFor(event)}
          alt={`${event.title} poster`}
          loading="lazy"
          width={1280}
          height={720}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {event.categories ? (
            <Badge className="bg-background/90 text-foreground hover:bg-background">
              {event.categories.name}
            </Badge>
          ) : null}
          {past ? <Badge variant="secondary">Completed</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{event.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{event.description}</p>

        <dl className="mt-1 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
            <dd>{formatEventDate(event.event_date)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden />
            <dd>{formatTime(event.start_time)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
            <dd className="line-clamp-1">{event.venue}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-primary" aria-hidden />
            <dd>
              {left > 0 ? `${left} of ${event.total_seats} seats left` : "Fully booked"}
            </dd>
          </div>
        </dl>

        <Button asChild className="mt-auto w-full">
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            View details
          </Link>
        </Button>
      </div>
    </article>
  );
}
