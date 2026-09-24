import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CampusConnect" },
      {
        name: "description",
        content:
          "Sign in or create your CampusConnect student account to register for college events.",
      },
      { property: "og:title", content: "Sign in — CampusConnect" },
      {
        property: "og:description",
        content: "Create your student account to register for college events.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back!");
    void navigate({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: String(form.get("full_name")),
          college_id: String(form.get("college_id")),
          department: String(form.get("department")),
          year: String(form.get("year")),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      return;
    }
    if (!data.session) {
      setEmailSent(true);
      return;
    }
    toast.success("Account created — welcome to CampusConnect!");
    void navigate({ to: "/dashboard" });
  };

  const googleSignIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed", { description: String(result.error) });
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-center">
      <div className="hidden space-y-5 lg:block">
        <span className="flex size-12 items-center justify-center rounded-xl bg-hero text-primary-foreground">
          <GraduationCap className="size-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-bold">Your campus pass to every event</h1>
        <p className="text-muted-foreground">
          One student account to register for hackathons, fests, workshops and tournaments — with
          live seat availability and instant ticket codes.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Register in one click, no paper forms</li>
          <li>• Duplicate registrations blocked automatically</li>
          <li>• Track every booking in your dashboard</li>
        </ul>
      </div>

      <div className="card-surface p-6 sm:p-8">
        {emailSent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MailCheck className="size-6" aria-hidden />
            </div>
            <h2 className="text-xl font-semibold">Confirm your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to your inbox. Click it to activate your CampusConnect
              account, then come back and sign in.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="in-email">College email</Label>
                  <Input id="in-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="in-password">Password</Label>
                  <Input
                    id="in-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form className="space-y-4" onSubmit={signUp}>
                <div className="space-y-2">
                  <Label htmlFor="up-name">Full name</Label>
                  <Input id="up-name" name="full_name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="up-college">College ID</Label>
                    <Input id="up-college" name="college_id" placeholder="21CS1043" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="up-year">Year</Label>
                    <Input id="up-year" name="year" placeholder="3rd year" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="up-dept">Department</Label>
                  <Input id="up-dept" name="department" placeholder="Computer Science" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="up-email">College email</Label>
                  <Input id="up-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="up-password">Password</Label>
                  <Input
                    id="up-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Create
                  account
                </Button>
              </form>
            </TabsContent>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void googleSignIn()}
                disabled={busy}
              >
                Continue with Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to the campus code of conduct.{" "}
                <Link to="/events" className="text-primary hover:underline">
                  Browse events instead
                </Link>
              </p>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}
