-- Migration: Relax read access on public.profiles for all authenticated CRM users
-- This allows employees to see each other's names in the dispositions and audit logs

DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;

CREATE POLICY profiles_select_all
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
