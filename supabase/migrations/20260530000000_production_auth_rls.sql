-- Production auth and RLS hardening for GoalCryst CRM.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.profiles
SET username = lower(split_part(auth.users.email, '@', 1))
FROM auth.users
WHERE public.profiles.id = auth.users.id
  AND public.profiles.username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,40}$')
  NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_username_format;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, is_active)
  VALUES (
    NEW.id,
    lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'System User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'Employee'::public.user_role),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = TIMEZONE('utc', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(input_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE lower(p.username) = lower(trim(input_username))
    AND p.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_username(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_app_permission(permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT id, role
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
    LIMIT 1
  ),
  defaults AS (
    SELECT unnest(
      CASE (SELECT role FROM me)
        WHEN 'Admin'::public.user_role THEN ARRAY[
          'can_upload_excel','can_search_customer','can_view_contact_numbers',
          'can_view_financial_data','can_view_legal_data','can_view_asset_data',
          'can_add_disposition','can_raise_waiver','can_approve_waiver',
          'can_view_reports','can_export_reports','can_manage_users',
          'can_manage_roles','can_view_audit_logs','can_view_all_dispositions'
        ]
        WHEN 'Branch Manager'::public.user_role THEN ARRAY[
          'can_search_customer','can_view_contact_numbers','can_view_financial_data',
          'can_view_legal_data','can_view_asset_data','can_add_disposition',
          'can_raise_waiver','can_approve_waiver','can_view_reports',
          'can_export_reports','can_view_all_dispositions'
        ]
        WHEN 'Assistant Manager'::public.user_role THEN ARRAY[
          'can_search_customer','can_view_contact_numbers','can_view_financial_data',
          'can_view_legal_data','can_view_asset_data','can_add_disposition',
          'can_raise_waiver','can_approve_waiver','can_view_reports',
          'can_export_reports','can_view_all_dispositions'
        ]
        WHEN 'Team Leader'::public.user_role THEN ARRAY[
          'can_search_customer','can_view_contact_numbers','can_view_financial_data',
          'can_view_legal_data','can_add_disposition','can_raise_waiver',
          'can_approve_waiver','can_view_reports','can_view_all_dispositions',
          'can_export_reports'
        ]
        WHEN 'Employee'::public.user_role THEN ARRAY[
          'can_search_customer','can_view_contact_numbers','can_view_financial_data',
          'can_view_legal_data','can_add_disposition','can_raise_waiver',
          'can_export_reports'
        ]
        ELSE ARRAY[]::TEXT[]
      END
    ) AS permission_key
  ),
  overrides AS (
    SELECT permission_key
    FROM public.user_permissions
    WHERE user_id = (SELECT id FROM me)
  )
  SELECT EXISTS (
    SELECT 1 FROM defaults WHERE permission_key = permission
    UNION
    SELECT 1 FROM overrides WHERE permission_key = permission
  );
$$;

CREATE OR REPLACE FUNCTION public.is_in_reporting_chain(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE reports AS (
    SELECT id
    FROM public.profiles
    WHERE reporting_to = auth.uid()
    UNION
    SELECT p.id
    FROM public.profiles p
    JOIN reports r ON p.reporting_to = r.id
  )
  SELECT EXISTS (SELECT 1 FROM reports WHERE id = target_user_id);
$$;

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','user_permissions','main_dispositions','sub_dispositions',
    'waiver_reasons','import_batches','import_errors','contracts',
    'contract_contacts','contract_assets','contract_financials','contract_legal',
    'dispositions','waiver_requests','audit_logs'
  ]
  LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY profiles_select_scoped
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_app_permission('can_manage_users')
    OR public.is_in_reporting_chain(id)
    OR role IN ('Admin','Branch Manager','Assistant Manager','Team Leader')
  );

CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_app_permission('can_manage_users'))
  WITH CHECK (public.has_app_permission('can_manage_users'));

CREATE POLICY user_permissions_admin_all
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_app_permission('can_manage_users'))
  WITH CHECK (public.has_app_permission('can_manage_users'));

CREATE POLICY user_permissions_select_own
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY settings_read_authenticated
  ON public.main_dispositions FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_write_admin_main_dispositions
  ON public.main_dispositions FOR ALL TO authenticated
  USING (public.has_app_permission('can_manage_roles'))
  WITH CHECK (public.has_app_permission('can_manage_roles'));

CREATE POLICY settings_read_sub_dispositions
  ON public.sub_dispositions FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_write_admin_sub_dispositions
  ON public.sub_dispositions FOR ALL TO authenticated
  USING (public.has_app_permission('can_manage_roles'))
  WITH CHECK (public.has_app_permission('can_manage_roles'));

CREATE POLICY settings_read_waiver_reasons
  ON public.waiver_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_write_admin_waiver_reasons
  ON public.waiver_reasons FOR ALL TO authenticated
  USING (public.has_app_permission('can_manage_roles'))
  WITH CHECK (public.has_app_permission('can_manage_roles'));

CREATE POLICY contracts_select_search
  ON public.contracts FOR SELECT TO authenticated
  USING (public.has_app_permission('can_search_customer') OR public.has_app_permission('can_manage_users'));
CREATE POLICY contracts_import_write
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY contracts_admin_update
  ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_manage_users'))
  WITH CHECK (public.has_app_permission('can_manage_users'));

CREATE POLICY contacts_select_allowed
  ON public.contract_contacts FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_contact_numbers'));
CREATE POLICY contacts_import_write
  ON public.contract_contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY assets_select_allowed
  ON public.contract_assets FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_asset_data'));
CREATE POLICY assets_import_write
  ON public.contract_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY financials_select_allowed
  ON public.contract_financials FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_financial_data'));
CREATE POLICY financials_import_write
  ON public.contract_financials FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY legal_select_allowed
  ON public.contract_legal FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_legal_data'));
CREATE POLICY legal_import_write
  ON public.contract_legal FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY import_batches_select_allowed
  ON public.import_batches FOR SELECT TO authenticated
  USING (public.has_app_permission('can_upload_excel') OR uploaded_by = auth.uid());
CREATE POLICY import_batches_insert_allowed
  ON public.import_batches FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel') AND uploaded_by = auth.uid());
CREATE POLICY import_batches_update_allowed
  ON public.import_batches FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel'));

CREATE POLICY import_errors_select_allowed
  ON public.import_errors FOR SELECT TO authenticated
  USING (public.has_app_permission('can_upload_excel'));
CREATE POLICY import_errors_insert_allowed
  ON public.import_errors FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY dispositions_select_scoped
  ON public.dispositions FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR public.has_app_permission('can_view_all_dispositions')
    OR public.has_app_permission('can_view_reports')
  );
CREATE POLICY dispositions_insert_allowed
  ON public.dispositions FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_add_disposition') AND employee_id = auth.uid());

CREATE POLICY waiver_requests_select_scoped
  ON public.waiver_requests FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR reviewed_by = auth.uid()
    OR auth.uid() = ANY(routed_to)
    OR public.has_app_permission('can_approve_waiver')
  );
CREATE POLICY waiver_requests_insert_allowed
  ON public.waiver_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_raise_waiver') AND employee_id = auth.uid());
CREATE POLICY waiver_requests_update_allowed
  ON public.waiver_requests FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_approve_waiver'))
  WITH CHECK (public.has_app_permission('can_approve_waiver'));

CREATE POLICY audit_logs_select_allowed
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_audit_logs'));
CREATE POLICY audit_logs_insert_authenticated
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
