import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
] as const;

export function SiteHeader() {
  const { user, isAdmin, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = [
    ...publicLinks,
    ...(user
      ? ([
          { to: "/dashboard", label: "Dashboard" },
          { to: "/registrations", label: "My Registrations" },
        ] as const)
      : []),
    ...(isAdmin ? ([{ to: "/admin", label: "Admin" }] as const) : []),
  ];

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-hero text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">CampusConnect</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Button
              key={l.to}
              asChild
              variant="ghost"
              size="sm"
              className={isActive(l.to) ? "bg-primary-soft text-primary" : ""}
            >
              <Link to={l.to}>{l.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAdmin ? (
            <span className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3.5" aria-hidden /> Admin
            </span>
          ) : null}
          {loading ? null : user ? (
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Join CampusConnect</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="size-5" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="px-1">CampusConnect</SheetTitle>
            <nav className="mt-6 flex flex-col gap-1">
              {links.map((l) => (
                <Button
                  key={l.to}
                  asChild
                  variant="ghost"
                  className={`justify-start ${isActive(l.to) ? "bg-primary-soft text-primary" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <Link to={l.to}>{l.label}</Link>
                </Button>
              ))}
              <div className="mt-4 border-t pt-4">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="size-4" aria-hidden /> Sign out
                  </Button>
                ) : (
                  <Button asChild className="w-full" onClick={() => setOpen(false)}>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
