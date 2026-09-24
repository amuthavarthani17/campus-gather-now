ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;