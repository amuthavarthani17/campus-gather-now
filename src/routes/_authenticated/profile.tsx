import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingBlock } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { myProfileQuery } from "@/lib/campus";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — CampusConnect" },
      {
        name: "description",
        content: "Update your student details: name, college ID, department, year and phone number.",
      },
      { property: "og:title", content: "My Profile — CampusConnect" },
      { property: "og:description", content: "Keep your student details up to date." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery(myProfileQuery(user?.id));
  const [form, setForm] = useState({
    full_name: "",
    college_id: "",
    department: "",
    year: "",
    phone: "",
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        full_name: profile.data.full_name ?? "",
        college_id: profile.data.college_id ?? "",
        department: profile.data.department ?? "",
        year: profile.data.year ?? "",
        phone: profile.data.phone ?? "",
      });
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? "", ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error("Could not save", { description: error.message }),
  });

  if (profile.isLoading) return <LoadingBlock label="Loading profile…" />;
  if (profile.isError)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ErrorState onRetry={() => void profile.refetch()} />
      </div>
    );

  const fields: { key: keyof typeof form; label: string; placeholder?: string }[] = [
    { key: "full_name", label: "Full name" },
    { key: "college_id", label: "College ID", placeholder: "21CS1043" },
    { key: "department", label: "Department", placeholder: "Computer Science" },
    { key: "year", label: "Year of study", placeholder: "3rd year" },
    { key: "phone", label: "Phone", placeholder: "+91 98765 43210" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">My profile</h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {user?.email} · {role === "admin" ? "Administrator" : "Student"}
        </p>
      </header>

      <form
        className="card-surface space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
