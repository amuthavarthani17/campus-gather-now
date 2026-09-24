import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import { LoadingBlock } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/events", label: "Events" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/registrations", label: "Registrations" },
] as const;

function AdminLayout() {
  const { isAdmin, loading, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return <LoadingBlock label="Checking your access…" />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="card-surface flex flex-col items-center gap-3 p-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            The account {user?.email} doesn&apos;t have administrator rights. Ask the student
            activity centre to grant you the admin role.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-hero text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Admin console</h1>
            <p className="text-sm text-muted-foreground">Manage events, students and bookings</p>
          </div>
        </div>
      </header>

      <nav className="mb-8 flex gap-1 overflow-x-auto border-b pb-2">
        {tabs.map((t) => {
          const active = t.to === "/admin" ? pathname === "/admin" : pathname.startsWith(t.to);
          return (
            <Button
              key={t.to}
              asChild
              variant="ghost"
              size="sm"
              className={active ? "bg-primary-soft text-primary" : ""}
            >
              <Link to={t.to}>{t.label}</Link>
            </Button>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
