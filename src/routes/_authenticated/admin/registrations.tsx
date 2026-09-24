import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Ticket, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { allRegistrationsQuery, eventsQuery, formatEventDate } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  head: () => ({
    meta: [
      { title: "Manage Registrations — CampusConnect Admin" },
      { name: "description", content: "Review, filter and cancel student event registrations." },
      { property: "og:title", content: "Manage Registrations — CampusConnect Admin" },
      { property: "og:description", content: "All event registrations in one table." },
    ],
  }),
  component: AdminRegistrations,
});

function AdminRegistrations() {
  const queryClient = useQueryClient();
  const regs = useQuery(allRegistrationsQuery);
  const events = useQuery(eventsQuery);
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (regs.data ?? []).filter((r) => {
      const matchesEvent = eventId === "all" || r.event_id === eventId;
      const matchesTerm =
        !term ||
        [r.profiles?.full_name, r.profiles?.email, r.events?.title, r.ticket_code]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      return matchesEvent && matchesTerm;
    });
  }, [regs.data, search, eventId]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration cancelled");
      void queryClient.invalidateQueries({ queryKey: ["all-registrations"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => toast.error("Could not cancel", { description: error.message }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Registrations ({regs.data?.length ?? 0})</h2>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <div className="relative min-w-52 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search student, event or ticket"
              aria-label="Search registrations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="min-w-44" aria-label="Filter by event">
              <SelectValue placeholder="Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {(events.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {regs.isLoading ? (
        <LoadingBlock />
      ) : regs.isError ? (
        <ErrorState onRetry={() => void regs.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-6" aria-hidden />}
          title="No registrations found"
          description="Try clearing the filters, or wait for students to register."
        />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Event</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Ticket</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="p-4">
                    <p className="font-medium">{r.profiles?.full_name || "—"}</p>
                    <p className="text-muted-foreground">{r.profiles?.email}</p>
                  </td>
                  <td className="p-4">{r.events?.title ?? "—"}</td>
                  <td className="p-4 text-muted-foreground">
                    {r.events ? formatEventDate(r.events.event_date) : "—"}
                  </td>
                  <td className="p-4 font-mono text-xs font-semibold">{r.ticket_code}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm("Cancel this registration?")) remove.mutate(r.id);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
