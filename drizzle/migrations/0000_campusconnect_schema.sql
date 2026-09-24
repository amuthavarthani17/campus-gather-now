-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  college_id TEXT,
  department TEXT,
  year TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  poster_url TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME,
  venue TEXT NOT NULL DEFAULT '',
  organizer TEXT NOT NULL DEFAULT '',
  total_seats INTEGER NOT NULL DEFAULT 100,
  seats_taken INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Registrations
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  ticket_code TEXT NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "events public read" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events admin write" ON public.events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "registrations own read" ON public.registrations FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "registrations own insert" ON public.registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registrations own delete" ON public.registrations FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "registrations admin update" ON public.registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- New user -> profile + student role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, college_id, department, year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'college_id',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'year'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seat counter + capacity guard
CREATE OR REPLACE FUNCTION public.registrations_seat_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INTEGER; v_taken INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT total_seats, seats_taken INTO v_total, v_taken FROM public.events WHERE id = NEW.event_id FOR UPDATE;
    IF v_total IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
    IF v_taken >= v_total THEN RAISE EXCEPTION 'This event is full'; END IF;
    UPDATE public.events SET seats_taken = seats_taken + 1 WHERE id = NEW.event_id;
    RETURN NEW;
  ELSE
    UPDATE public.events SET seats_taken = GREATEST(seats_taken - 1, 0) WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
END;
$$;
CREATE TRIGGER registrations_seat_sync_ins AFTER INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.registrations_seat_sync();
CREATE TRIGGER registrations_seat_sync_del AFTER DELETE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.registrations_seat_sync();

-- Sample data
INSERT INTO public.categories (name, slug, description) VALUES
  ('Technical', 'technical', 'Hackathons, coding contests and tech talks'),
  ('Cultural', 'cultural', 'Music, dance, drama and art competitions'),
  ('Sports', 'sports', 'Tournaments, athletics and fitness events'),
  ('Workshop', 'workshop', 'Hands-on sessions and skill bootcamps'),
  ('Seminar', 'seminar', 'Guest lectures and industry panels');

INSERT INTO public.events (title, description, rules, category_id, poster_url, event_date, start_time, end_time, venue, organizer, total_seats)
SELECT v.title, v.description, v.rules, c.id, v.poster_url, v.event_date::date, v.start_time::time, v.end_time::time, v.venue, v.organizer, v.total_seats
FROM (VALUES
  ('CodeStorm 24-Hour Hackathon','Build a working product in 24 hours with mentors from leading tech companies. Themes are revealed at kickoff and judging covers innovation, execution and impact.','Teams of 2-4 members. Bring your own laptop. Code must be written during the event. Final demo limited to 5 minutes.','technical','/posters/technical.jpg','2026-10-10','09:00','09:00','Central Computing Block, Lab 4','Department of Computer Science',120),
  ('AI & Machine Learning Bootcamp','A hands-on two-session bootcamp covering data preparation, model training and deploying a small ML service.','Basic Python knowledge required. Laptops mandatory. Attendance in both sessions needed for the certificate.','workshop','/posters/workshop.jpg','2026-10-18','10:00','16:00','Innovation Lab, Block C','CampusConnect Tech Club',60),
  ('Rhythm Nights - Inter College Cultural Fest','The flagship cultural night with battle-of-bands, classical and western dance showcases and a headline student performance.','Register per team. Backing tracks to be submitted 3 days early. Performance slot is 8 minutes maximum.','cultural','/posters/cultural.jpg','2026-10-24','18:00','22:00','Open Air Auditorium','Students Cultural Council',400),
  ('Annual Inter-Department Football Cup','Knockout football tournament across all departments with a league stage and floodlit finals.','11-a-side. Registered students only. Studded boots and shin guards compulsory. Referee decisions are final.','sports','/posters/sports.jpg','2026-11-02','07:30','13:00','University Sports Ground','Department of Physical Education',180),
  ('Robotics Line-Follower Challenge','Design and race an autonomous line-following robot through an obstacle track against the clock.','Max robot size 25x25cm. No remote control. Two attempts per team. Battery powered only.','technical','/posters/technical.jpg','2026-11-08','09:30','15:00','Mechanical Workshop Hall','Robotics Society',80),
  ('Startup Pitch Night with Alumni Investors','Pitch your venture idea to a panel of alumni founders and investors, with feedback and a cash prize for the top three.','Pitch deck of max 8 slides. 5 minute pitch and 3 minute Q&A. Solo or team entries welcome.','seminar','/posters/seminar.jpg','2026-11-15','17:00','20:00','Seminar Hall A, Admin Block','Entrepreneurship Cell',150),
  ('Photography Walk & Editing Workshop','A guided campus photo walk followed by a practical editing session on composition, light and colour grading.','Any camera or smartphone allowed. Bring a laptop for the editing half. Limited seats.','workshop','/posters/workshop.jpg','2026-11-21','08:00','12:00','Main Gate to Heritage Lawn','Shutterbug Club',40),
  ('Classical Solo Singing Competition','Showcase your voice in a classical solo round judged by visiting music faculty.','Solo entries only. 6 minutes per performer. One accompanist permitted. Original compositions not allowed.','cultural','/posters/cultural.jpg','2026-11-28','15:00','19:00','Music Hall, Fine Arts Block','Department of Fine Arts',90),
  ('Campus Marathon 10K','A scenic 10K run through the campus and lakefront route, with timing chips and finisher medals.','Medical fitness self-declaration required. Report 45 minutes before start. Headphones not allowed on route.','sports','/posters/sports.jpg','2026-12-06','06:00','10:00','Stadium Gate 2','Sports Council',300),
  ('Cyber Security Awareness Seminar','Industry speakers on phishing, secure coding and careers in security, followed by an open Q&A.','Open to all years. Entry closes 10 minutes after start.','seminar','/posters/seminar.jpg','2026-12-12','11:00','13:30','Auditorium 2','Department of Information Technology',250)
) AS v(title, description, rules, cat, poster_url, event_date, start_time, end_time, venue, organizer, total_seats)
JOIN public.categories c ON c.slug = v.cat;