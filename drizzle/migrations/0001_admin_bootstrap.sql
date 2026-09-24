-- Any account created with a designated admin address also gets the admin role.
CREATE TABLE public.admin_emails (
  email TEXT PRIMARY KEY
);
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read admin emails" ON public.admin_emails FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.admin_emails TO authenticated;

INSERT INTO public.admin_emails (email) VALUES ('admin@campusconnect.edu');

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

  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE lower(email) = lower(COALESCE(NEW.email, ''))) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;