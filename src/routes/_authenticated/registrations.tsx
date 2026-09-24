import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  formatEventDate,
  formatTime,
  isPast,
  myRegistrationsQuery,
  posterFor,
} from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/registrations")({
  head: () => ({
    meta: [
      { title: "My Registrations — CampusConnect" },
      {
        name: "description",
        content: "All your confirmed college event registrations with ticket codes and venues.",
      },
      { property: "og:title", content: "My Registrations — CampusConnect" },
      {
        property: "og:description",
        content: "View and manage your confirmed event registrations.",
      },
    ],
  }),
  component: MyRegistrations,
});

function MyRegistrations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const regs = useQuery(myRegistrationsQuery(user?.id));

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled", { description: "Your seat has been released." });
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => toast.error("Could not cancel", { description: error.message }),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">My registrations</h1>
        <p className="mt-1 text-muted-foreground">
          Show your ticket code at the venue entrance for quick check-in.
        </p>
      </header>

      {regs.isLoading ? (
        <LoadingBlock label="Loading your registrations…" />
      ) : regs.isError ? (
        <ErrorState onRetry={() => void regs.refetch()} />
      ) : (regs.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-6" aria-hidden />}
          title="No registrations yet"
          description="Once you register for an event it will appear here with a unique ticket code."
          action={
            <Button asChild>
              <Link to="/events">Find an event</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {(regs.data ?? []).map((r) => {
            const past = r.events ? isPast(r.events) : false;
            return (
              <article key={r.id} className="card-surface flex flex-col gap-4 p-4 sm:flex-row">
                {r.events ? (
                  <img
                    src={posterFor(r.events)}
                    alt=""
                    loading="lazy"
                    width={1280}
                    height={720}
                    className="h-32 w-full rounded-lg object-cover sm:w-48"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={past ? "secondary" : "default"}>
                      {past ? "Completed" : "Confirmed"}
                    </Badge>
                    {r.events?.categories ? (
                      <Badge variant="outline">{r.events.categories.name}</Badge>
                    ) : null}
                  </div>
                  <h2 className="text-lg font-semibold">{r.events?.title ?? "Event removed"}</h2>
                  {r.events ? (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-primary" aria-hidden />
                        {formatEventDate(r.events.event_date)} · {formatTime(r.events.start_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4 text-primary" aria-hidden />
                        {r.events.venue}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                    <span className="rounded-md bg-primary-soft px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                      {r.ticket_code}
                    </span>
                    {r.events ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/events/$eventId" params={{ eventId: r.event_id }}>
                          Event details
                        </Link>
                      </Button>
                    ) : null}
                    {!past ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(r.id)}
                      >
                        <Trash2 className="size-4" aria-hidden /> Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
