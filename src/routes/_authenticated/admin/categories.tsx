import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, eventsQuery } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  head: () => ({
    meta: [
      { title: "Manage Categories — CampusConnect Admin" },
      { name: "description", content: "Add, rename and remove event categories." },
      { property: "og:title", content: "Manage Categories — CampusConnect Admin" },
      { property: "og:description", content: "Organise events into categories." },
    ],
  }),
  component: AdminCategories,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminCategories() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery);
  const events = useQuery(eventsQuery);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("categories")
        .insert({ name, slug: slugify(name), description });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      setDescription("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not add category", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category removed");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not remove", { description: error.message }),
  });

  const countFor = (id: string) =>
    (events.data ?? []).filter((e) => e.category_id === id).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Categories ({categories.data?.length ?? 0})</h2>
        {categories.isLoading ? (
          <LoadingBlock />
        ) : categories.isError ? (
          <ErrorState onRetry={() => void categories.refetch()} />
        ) : (categories.data ?? []).length === 0 ? (
          <EmptyState title="No categories yet" description="Add one to start grouping events." />
        ) : (
          <div className="card-surface divide-y overflow-hidden">
            {(categories.data ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.description || c.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{countFor(c.id)} events</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remove category "${c.name}"?`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        className="card-surface h-fit space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h3 className="font-semibold">Add category</h3>
        <div className="space-y-2">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Literary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-desc">Description</Label>
          <Input
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Debates, quizzes and writing"
          />
        </div>
        <Button type="submit" className="w-full" disabled={create.isPending || !name.trim()}>
          <Plus className="size-4" aria-hidden /> {create.isPending ? "Adding…" : "Add category"}
        </Button>
      </form>
    </div>
  );
}
