import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { allRegistrationsQuery, profilesQuery } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Manage Students — CampusConnect Admin" },
      { name: "description", content: "Search student profiles and review their event activity." },
      { property: "og:title", content: "Manage Students — CampusConnect Admin" },
      { property: "og:description", content: "Student directory for administrators." },
    ],
  }),
  component: AdminStudents,
});

function AdminStudents() {
  const queryClient = useQueryClient();
  const students = useQuery(profilesQuery);
  const regs = useQuery(allRegistrationsQuery);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students.data ?? [];
    return (students.data ?? []).filter((s) =>
      [s.full_name, s.email, s.college_id, s.department]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [students.data, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student profile removed");
      void queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: Error) => toast.error("Could not remove", { description: error.message }),
  });

  const regCount = (id: string) => (regs.data ?? []).filter((r) => r.user_id === id).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Students ({students.data?.length ?? 0})</h2>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder="Search name, email, department"
            aria-label="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {students.isLoading ? (
        <LoadingBlock />
      ) : students.isError ? (
        <ErrorState onRetry={() => void students.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title="No students found"
          description="Students appear here as soon as they create an account."
        />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">College ID</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Year</th>
                <th className="p-4 font-semibold">Registrations</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="p-4">
                    <p className="font-medium">{s.full_name || "—"}</p>
                    <p className="text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{s.college_id || "—"}</td>
                  <td className="p-4 text-muted-foreground">{s.department || "—"}</td>
                  <td className="p-4 text-muted-foreground">{s.year || "—"}</td>
                  <td className="p-4 font-medium">{regCount(s.id)}</td>
                  <td className="p-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remove ${s.full_name || s.email}'s profile?`)) remove.mutate(s.id);
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
