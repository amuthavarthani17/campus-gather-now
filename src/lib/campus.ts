import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  rules: string;
  category_id: string | null;
  poster_url: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  venue: string;
  organizer: string;
  total_seats: number;
  seats_taken: number;
  created_at: string;
  categories?: { id: string; name: string; slug: string } | null;
}

export interface RegistrationRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  ticket_code: string;
  notes: string | null;
  created_at: string;
  events?: EventRecord | null;
  profiles?: { full_name: string; email: string; department: string | null } | null;
}

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  college_id: string | null;
  department: string | null;
  year: string | null;
  phone: string | null;
  created_at: string;
}

const EVENT_SELECT = "*, categories(id, name, slug)";

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
};

export const eventsQuery = {
  queryKey: ["events"],
  queryFn: async (): Promise<EventRecord[]> => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .order("event_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as EventRecord[];
  },
};

export function eventQuery(id: string) {
  return {
    queryKey: ["event", id],
    queryFn: async (): Promise<EventRecord | null> => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as EventRecord | null;
    },
  };
}

export function myRegistrationsQuery(userId: string | undefined) {
  return {
    queryKey: ["my-registrations", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<RegistrationRecord[]> => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`*, events(${EVENT_SELECT})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RegistrationRecord[];
    },
  };
}

export const allRegistrationsQuery = {
  queryKey: ["all-registrations"],
  queryFn: async (): Promise<RegistrationRecord[]> => {
    const { data, error } = await supabase
      .from("registrations")
      .select(`*, events(${EVENT_SELECT}), profiles(full_name, email, department)`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RegistrationRecord[];
  },
};

export const profilesQuery = {
  queryKey: ["profiles"],
  queryFn: async (): Promise<ProfileRecord[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProfileRecord[];
  },
};

export function myProfileQuery(userId: string | undefined) {
  return {
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<ProfileRecord | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRecord | null;
    },
  };
}

export function seatsLeft(event: Pick<EventRecord, "total_seats" | "seats_taken">) {
  return Math.max(event.total_seats - event.seats_taken, 0);
}

export function isPast(event: Pick<EventRecord, "event_date">) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${event.event_date}T00:00:00`) < today;
}

export function formatEventDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function posterFor(event: Pick<EventRecord, "poster_url" | "categories">) {
  if (event.poster_url) return event.poster_url;
  const slug = event.categories?.slug ?? "technical";
  return `/posters/${slug}.jpg`;
}
