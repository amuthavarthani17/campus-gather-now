import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  eventsQuery,
  formatEventDate,
  seatsLeft,
  type EventRecord,
} from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin/events")({
  head: () => ({
    meta: [
      { title: "Manage Events — CampusConnect Admin" },
      { name: "description", content: "Create, edit and delete college events." },
      { property: "og:title", content: "Manage Events — CampusConnect Admin" },
      { property: "og:description", content: "Full event management for administrators." },
    ],
  }),
  component: AdminEvents,
});

interface EventForm {
  title: string;
  description: string;
  rules: string;
  category_id: string;
  poster_url: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  organizer: string;
  total_seats: number;
}

const emptyForm: EventForm = {
  title: "",
  description: "",
  rules: "",
  category_id: "",
  poster_url: "",
  event_date: "",
  start_time: "09:00",
  end_time: "12:00",
  venue: "",
  organizer: "",
  total_seats: 100,
};

function AdminEvents() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery);
  const categories = useQuery(categoriesQuery);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: categories.data?.[0]?.id ?? "" });
    setOpen(true);
  };

  const openEdit = (e: EventRecord) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description,
      rules: e.rules,
      category_id: e.category_id ?? "",
      poster_url: e.poster_url ?? "",
      event_date: e.event_date,
      start_time: e.start_time.slice(0, 5),
      end_time: e.end_time ? e.end_time.slice(0, 5) : "",
      venue: e.venue,
      organizer: e.organizer,
      total_seats: e.total_seats,
    });
    setOpen(true);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["all-registrations"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        poster_url: form.poster_url || null,
        end_time: form.end_time || null,
        total_seats: Number(form.total_seats),
      };
      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Event updated" : "Event created");
      setOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not save event", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not delete", { description: error.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Events ({events.data?.length ?? 0})</h2>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden /> New event
        </Button>
      </div>

      {events.isLoading ? (
        <LoadingBlock />
      ) : events.isError ? (
        <ErrorState onRetry={() => void events.refetch()} />
      ) : (events.data ?? []).length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create your first event so students can register."
          action={<Button onClick={openCreate}>Create event</Button>}
        />
      ) : (
        <div className="card-surface divide-y overflow-hidden">
          {(events.data ?? []).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-48 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{e.title}</p>
                  {e.categories ? <Badge variant="outline">{e.categories.name}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatEventDate(e.event_date)} · {e.venue}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {e.seats_taken}/{e.total_seats} booked · {seatsLeft(e)} left
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                  <Pencil className="size-4" aria-hidden /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${e.title}" and all its registrations?`)) remove.mutate(e.id);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "Create event"}</DialogTitle>
            <DialogDescription>
              Students see these details on the event page immediately.
            </DialogDescription>
          </DialogHeader>

          <form
            id="event-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizer">Organiser</Label>
                <Input
                  id="organizer"
                  value={form.organizer}
                  onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Start time</Label>
                <Input
                  id="start"
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End time</Label>
                <Input
                  id="end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seats">Total seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min={1}
                  value={form.total_seats}
                  onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poster">Poster image URL</Label>
              <Input
                id="poster"
                placeholder="/posters/technical.jpg"
                value={form.poster_url}
                onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules">Rules</Label>
              <Textarea
                id="rules"
                rows={3}
                value={form.rules}
                onChange={(e) => setForm({ ...form, rules: e.target.value })}
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" form="event-form" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
