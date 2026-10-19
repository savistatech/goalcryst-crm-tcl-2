-- ============================================================================
-- TCL-2 clean baseline schema (125-field import template: "TCL-2 Header.xlsx")
-- Use this for a FRESH install. For an existing TCL-2 database use
-- supabase/upgrade/tcl2-reset-to-clean-125.sql instead.
-- ============================================================================

-- 1. Core tables
-- 1. Create Custom PostgreSQL Enums
CREATE TYPE public.user_role AS ENUM ('Admin', 'Branch Manager', 'Assistant Manager', 'Team Leader', 'Employee');
CREATE TYPE public.waiver_status_enum AS ENUM ('Pending', 'Approved', 'Rejected');

-- 2. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'Employee',
  reporting_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch TEXT,
  department TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT profiles_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,40}$')
);

CREATE UNIQUE INDEX profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 3. User Permissions Table (granular overriding keys)
CREATE TABLE public.user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, permission_key)
);

-- 3a. Main Dispositions Table
CREATE TABLE public.main_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3b. Sub Dispositions Table
CREATE TABLE public.sub_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_disposition_id UUID REFERENCES public.main_dispositions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  form_schema JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(main_disposition_id, name)
);

-- 3c. Waiver Reasons Table
CREATE TABLE public.waiver_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Import Batches Table (allocation sheets metadata)
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_rows INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  duplicates_skipped INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Import Errors Table (transparency on failed rows)
CREATE TABLE public.import_errors (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE NOT NULL,
  row_number INT NOT NULL,
  raw_data JSONB,
  error_reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Contract tables (125 import fields)
-- Contracts (account, loan, DPD/bucket, owner and contact-mode fields from the TCL-2 template)
CREATE TABLE public.contracts (
  contract_no TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  product TEXT NOT NULL,
  branch TEXT NOT NULL,
  state TEXT NOT NULL,
  bom_dpd INT NOT NULL DEFAULT 0,
  mob INT NOT NULL DEFAULT 0,
  organization_employer_name TEXT,
  occupation_type TEXT,
  allocation_dpd_category TEXT,
  writeoff_flg TEXT,
  bkt_tagging TEXT,
  bom_bucket TEXT,
  finone_scheme_name TEXT,
  cif TEXT,
  contact_mode TEXT,
  cm_name TEXT,
  allocated_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- Contract Contacts (mobiles, co-applicants, guarantors, references, addresses, PAN, email flags)
CREATE TABLE public.contract_contacts (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  base_address TEXT,
  landmark TEXT,
  pincode TEXT,
  mobile_1 TEXT,
  primary_mobile TEXT,
  coapplicant_1 TEXT,
  coapplicant_2 TEXT,
  coapplicant_3 TEXT,
  coapplicant_4 TEXT,
  guarantor_1 TEXT,
  guarantor_2 TEXT,
  guarantor_3 TEXT,
  permanent_address TEXT,
  finnone_address TEXT,
  secondary_address TEXT,
  office_address TEXT,
  additional_address TEXT,
  residential_address TEXT,
  primary_mobile_1 TEXT,
  primary_mobile_2 TEXT,
  ref_name_1 TEXT,
  ref_full_address_1 TEXT,
  ref_relation_1 TEXT,
  ref_mobile_1 TEXT,
  ref_name_2 TEXT,
  ref_full_address_2 TEXT,
  ref_relation_2 TEXT,
  ref_mobile_2 TEXT,
  pan_no TEXT,
  is_primary_email_yes TEXT,
  is_primary_email_no TEXT,
  pdpr_address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Contract Assets (vehicle and asset details)
CREATE TABLE public.contract_assets (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  asset_model TEXT,
  manufacturer TEXT,
  year_of_manufacture TEXT,
  rc_number TEXT,
  engine_number TEXT,
  chassis_number TEXT,
  asset_variant TEXT,
  vehicle_available TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Contract Financials (insurance, contract and banking, overdue and outstanding, collection performance)
CREATE TABLE public.contract_financials (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  insurance_type TEXT,
  insurance_policy_end_date TEXT,
  sum_assured_amount NUMERIC(15, 2),
  contract_start_date TEXT,
  contract_end_date TEXT,
  cycle TEXT,
  total_tenure TEXT,
  finance_amount NUMERIC(15, 2),
  bank_account_no TEXT,
  ifsc_code TEXT,
  emi_amount NUMERIC(15, 2),
  od_amount NUMERIC(15, 2),
  principal_overdue NUMERIC(15, 2),
  interest_overdue NUMERIC(15, 2),
  future_pos NUMERIC(15, 2),
  bounce_charges NUMERIC(15, 2),
  current_odc NUMERIC(15, 2),
  total_outstanding NUMERIC(15, 2),
  pos NUMERIC(15, 2),
  pos_in_cr TEXT,
  act_pct_cr TEXT,
  collxn_act_tar TEXT,
  ror TEXT,
  target_pct TEXT,
  last_month_pay_collxn TEXT,
  last_month_pay_status TEXT,
  outside_pay_l3m_vs_emi TEXT,
  death_case_insurance_update TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Contract Legal (Sec 138, court cases, arbitration, execution petitions)
CREATE TABLE public.contract_legal (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  notice_sent_sec138 TEXT,
  cheque_amount NUMERIC(15, 2),
  cnr_number_cc TEXT,
  new_cnr_number_cc TEXT,
  cnr_number_pcr TEXT,
  current_stage TEXT,
  group_stage TEXT,
  case_no TEXT,
  filed_location TEXT,
  court_hall TEXT,
  ldoh TEXT,
  ndoh TEXT,
  advocate TEXT,
  hand_summons TEXT,
  hand_s_nbw_bw_pc_type TEXT,
  hand_s_nbw_bw_pc_oct8 TEXT,
  hand_s_nbw_bw_pc_type2 TEXT,
  arbitrator_type TEXT,
  lrn_date TEXT,
  arb TEXT,
  claim_amount NUMERIC(15, 2),
  arbitration_group_stage TEXT,
  sec17_orders TEXT,
  award_date TEXT,
  arbitration_ndoh TEXT,
  ep_stage TEXT,
  ep_group_stage TEXT,
  court_bench TEXT,
  court_location TEXT,
  ep_pdoh TEXT,
  ep_ndoh TEXT,
  ep_case_no TEXT,
  ep_advocate TEXT,
  legal_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Contract Bureau Scores (credit and CIBIL scores, bureau details)
CREATE TABLE public.contract_bureau_scores (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  credit_score TEXT,
  bureau_details_1 TEXT,
  bureau_details_2 TEXT,
  bureau_details_3 TEXT,
  bureau_details_4 TEXT,
  cibil_score TEXT,
  sourcing_cibil_score TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Call and waiver tables
-- 11. Dispositions Table (dynamic logged call outcomes)
CREATE TABLE public.dispositions (
  id BIGSERIAL PRIMARY KEY,
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  main_disposition_id UUID REFERENCES public.main_dispositions(id) NOT NULL,
  sub_disposition_id UUID REFERENCES public.sub_dispositions(id) NOT NULL,
  remarks TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  ptp_date DATE,
  ptp_amount NUMERIC(15, 2),
  paid_amount NUMERIC(15, 2),
  payment_date DATE,
  proof_reference TEXT,
  dynamic_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 12. Waiver Requests Table (discount approvals)
CREATE TABLE public.waiver_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_outstanding NUMERIC(15, 2) NOT NULL,
  pos NUMERIC(15, 2) NOT NULL DEFAULT 0,
  requested_waiver_amount NUMERIC(15, 2) NOT NULL,
  reason_id UUID REFERENCES public.waiver_reasons(id) NOT NULL,
  employee_remarks TEXT,
  status public.waiver_status_enum NOT NULL DEFAULT 'Pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  routed_to UUID[] DEFAULT '{}'::uuid[],
  manager_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 13. Audit Logs Table (compliance monitoring logs)
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create highly performant indices on commonly searched fields
CREATE INDEX idx_dispositions_contract_no ON public.dispositions(contract_no);
CREATE INDEX idx_dispositions_created_at ON public.dispositions(created_at);
CREATE INDEX idx_waiver_requests_status ON public.waiver_requests(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_contracts_customer_name ON public.contracts(customer_name);
CREATE INDEX idx_contracts_allocated_to ON public.contracts(allocated_to);

-- 4. Auth sync, login lookup and permission functions
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_auth_email_by_username(input_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT au.email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE (lower(p.username) = lower(trim(input_username)) OR lower(au.email) = lower(trim(input_username)))
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
          'can_view_legal_data','can_view_asset_data','can_add_disposition','can_raise_waiver',
          'can_approve_waiver','can_view_reports','can_view_all_dispositions',
          'can_export_reports'
        ]
        WHEN 'Employee'::public.user_role THEN ARRAY[
          'can_search_customer','can_view_contact_numbers','can_view_financial_data',
          'can_view_legal_data','can_view_asset_data','can_add_disposition','can_raise_waiver',
          'can_export_reports','can_view_all_dispositions'
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

-- 5. Row-Level Security

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.main_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_all
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

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

-- Row-Level Security for the contract tables
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_legal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_bureau_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select_search ON public.contracts FOR SELECT TO authenticated
  USING (public.has_app_permission('can_search_customer') OR public.has_app_permission('can_manage_users'));
CREATE POLICY contracts_import_write ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY contracts_import_update ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY contracts_admin_update ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_manage_users')) WITH CHECK (public.has_app_permission('can_manage_users'));
CREATE POLICY contracts_admin_delete ON public.contracts FOR DELETE TO authenticated
  USING (public.has_app_permission('can_manage_users'));

CREATE POLICY contacts_select_allowed ON public.contract_contacts FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_contact_numbers'));
CREATE POLICY contacts_import_insert ON public.contract_contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY contacts_import_update ON public.contract_contacts FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY assets_select_allowed ON public.contract_assets FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_asset_data'));
CREATE POLICY assets_import_insert ON public.contract_assets FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY assets_import_update ON public.contract_assets FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY financials_select_allowed ON public.contract_financials FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_financial_data'));
CREATE POLICY financials_import_insert ON public.contract_financials FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY financials_import_update ON public.contract_financials FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY legal_select_allowed ON public.contract_legal FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_legal_data'));
CREATE POLICY legal_import_insert ON public.contract_legal FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY legal_import_update ON public.contract_legal FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY bureau_scores_select_allowed ON public.contract_bureau_scores FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_financial_data'));
CREATE POLICY bureau_scores_import_insert ON public.contract_bureau_scores FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY bureau_scores_import_update ON public.contract_bureau_scores FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));

-- 6. Dashboard analytics functions
-- 1. Global Dashboard Stats (Bypasses RLS locally to get exact system totals)
CREATE OR REPLACE FUNCTION public.get_global_dashboard_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH
  sys_counts AS (
    SELECT
      (SELECT count(*) FROM contracts) AS total_contracts,
      (SELECT count(*) FROM contracts WHERE is_archived = false) AS active_contracts,
      (SELECT count(*) FROM profiles WHERE is_active = true) AS total_users,
      (SELECT count(*) FROM import_batches) AS total_batches
  ),
  dispo_counts AS (
    SELECT
      count(*) AS total_dispositions,
      count(*) FILTER (WHERE md.name = 'Contactable') AS contactable,
      count(*) FILTER (WHERE md.name = 'Non-Contactable') AS non_contactable,
      count(*) FILTER (WHERE sd.name = 'Promise to Pay') AS ptp,
      count(*) FILTER (WHERE sd.name = 'Agree to Pay') AS agree_to_pay,
      count(*) FILTER (WHERE sd.name = 'Part Paid') AS part_paid,
      count(*) FILTER (WHERE sd.name = 'Broken PTP') AS broken_ptp,
      count(*) FILTER (WHERE sd.name IN ('Call Back', 'Callback Scheduled')) AS callback
    FROM dispositions d
    LEFT JOIN main_dispositions md ON d.main_disposition_id = md.id
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
  ),
  weeks AS (
    SELECT generate_series(0, 3) AS week_offset
  ),
  ptp_analysis_raw AS (
    SELECT 
      w.week_offset,
      COUNT(d.id) FILTER (WHERE sd.name = 'Promise to Pay') AS ptp_count,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) AS ptp_value,
      COUNT(d.id) FILTER (WHERE md.name = 'Contactable') AS contactable_count
    FROM weeks w
    LEFT JOIN dispositions d ON 
      d.created_at >= (current_date - interval '28 days') AND
      FLOOR(EXTRACT(epoch FROM (current_date - d.created_at)) / 86400 / 7) = w.week_offset
    LEFT JOIN main_dispositions md ON d.main_disposition_id = md.id
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    GROUP BY w.week_offset
  ),
  ptp_analysis AS (
    SELECT 
      COALESCE(json_agg(
        json_build_object(
          'week', 'Week ' || (4 - week_offset),
          'ptpCount', ptp_count,
          'ptpValue', ptp_value,
          'contactable', contactable_count
        ) ORDER BY week_offset DESC
      ), '[]'::json) AS ptp_analysis_json
    FROM ptp_analysis_raw
  ),
  leaderboard_raw AS (
    SELECT
      p.id as employee_id,
      p.full_name as name,
      p.role,
      COUNT(d.id) as calls,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) as ptp_value
    FROM profiles p
    LEFT JOIN dispositions d ON d.employee_id = p.id AND d.created_at >= current_date
    LEFT JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    WHERE p.is_active = true
    GROUP BY p.id, p.full_name, p.role
    HAVING COUNT(d.id) > 0 OR COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)) FILTER (WHERE sd.name = 'Promise to Pay'), 0) > 0
    ORDER BY ptp_value DESC, calls DESC
  ),
  leaderboard AS (
    SELECT
      COALESCE(json_agg(
        json_build_object(
          'name', name,
          'team', CASE WHEN role::text = 'Employee' THEN 'South Team Operations' ELSE role::text END,
          'calls', calls,
          'ptpValue', ptp_value
        )
      ), '[]'::json) AS leaderboard_json
    FROM leaderboard_raw
  )
SELECT
  json_build_object(
    'system', (SELECT row_to_json(sys_counts) FROM sys_counts),
    'dispositions', (SELECT row_to_json(dispo_counts) FROM dispo_counts),
    'ptpAnalysis', (SELECT ptp_analysis_json FROM ptp_analysis),
    'leaderboard', (SELECT leaderboard_json FROM leaderboard)
  );
$$;

-- 2. Employee Dashboard Stats
CREATE OR REPLACE FUNCTION public.get_employee_dashboard_stats(emp_id UUID)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH
  my_calls AS (
    SELECT
      count(*) AS total_calls,
      count(*) FILTER (WHERE created_at >= current_date) AS calls_today
    FROM dispositions
    WHERE employee_id = emp_id
  ),
  my_contactable AS (
    SELECT
      count(*) AS contactable_count
    FROM dispositions d
    JOIN main_dispositions md ON d.main_disposition_id = md.id
    WHERE d.employee_id = emp_id AND md.name = 'Contactable'
  ),
  my_ptps AS (
    SELECT
      count(*) AS ptp_count,
      COALESCE(SUM(CAST(d.dynamic_data->>'ptp_amount' AS NUMERIC)), 0) AS ptp_value
    FROM dispositions d
    JOIN sub_dispositions sd ON d.sub_disposition_id = sd.id
    WHERE d.employee_id = emp_id 
      AND sd.name = 'Promise to Pay'
      AND NULLIF(d.dynamic_data->>'ptp_date', '') IS NOT NULL
      AND CAST(NULLIF(d.dynamic_data->>'ptp_date', '') AS DATE) >= current_date
  ),
  my_waivers AS (
    SELECT
      count(*) FILTER (WHERE status = 'Pending') AS pending_count,
      count(*) FILTER (WHERE status = 'Approved') AS approved_count,
      count(*) FILTER (WHERE status = 'Rejected') AS rejected_count
    FROM waiver_requests
    WHERE employee_id = emp_id
  ),
  alloc_count AS (
    SELECT count(*) AS total_active_contracts FROM contracts WHERE is_archived = false
  )
SELECT
  json_build_object(
    'myCallsTotal', (SELECT total_calls FROM my_calls),
    'myCallsToday', (SELECT calls_today FROM my_calls),
    'myContactable', (SELECT contactable_count FROM my_contactable),
    'myPtpCount', (SELECT ptp_count FROM my_ptps),
    'myPtpValue', (SELECT ptp_value FROM my_ptps),
    'myWaiversPending', (SELECT pending_count FROM my_waivers),
    'myWaiversApproved', (SELECT approved_count FROM my_waivers),
    'myWaiversRejected', (SELECT rejected_count FROM my_waivers),
    'myAllocatedCount', (SELECT total_active_contracts FROM alloc_count)
  );
$$;

-- 7. API grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
