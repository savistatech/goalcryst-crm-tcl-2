-- ============================================================================
-- TCL-2: move an EXISTING database to the clean 125-field contract schema.
--
-- DESTRUCTIVE. Deletes all imported contract data and everything linked to a
-- contract (call dispositions, waiver requests) plus import history.
-- Kept: users/profiles/permissions, disposition setup, waiver reasons, audit logs.
--
-- Take a pg_dump backup first. Runs in a single transaction (all or nothing).
-- For a FRESH install use supabase/migrations/20261020000000_tcl2_baseline.sql.
-- ============================================================================
BEGIN;

-- 1. Remove old contract detail tables (including the retired agency/trails tables)
DROP TABLE IF EXISTS public.contract_agency_hierarchy CASCADE;
DROP TABLE IF EXISTS public.contract_trails CASCADE;
DROP TABLE IF EXISTS public.contract_bureau_scores CASCADE;
DROP TABLE IF EXISTS public.contract_legal CASCADE;
DROP TABLE IF EXISTS public.contract_financials CASCADE;
DROP TABLE IF EXISTS public.contract_assets CASCADE;
DROP TABLE IF EXISTS public.contract_contacts CASCADE;

-- 2. Wipe contract data and the rows that reference contracts, and import history
TRUNCATE TABLE public.dispositions, public.waiver_requests, public.import_errors,
  public.import_batches, public.contracts CASCADE;

-- 3. Rebuild contracts and the detail tables with only the 125 template fields.
--    Dropping contracts also drops the foreign keys on dispositions/waiver_requests,
--    which are re-created below.
DROP TABLE public.contracts CASCADE;

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

CREATE INDEX idx_contracts_customer_name ON public.contracts(customer_name);
CREATE INDEX idx_contracts_allocated_to ON public.contracts(allocated_to);

-- Re-attach the tables that reference contracts
ALTER TABLE public.dispositions
  ADD CONSTRAINT dispositions_contract_no_fkey
  FOREIGN KEY (contract_no) REFERENCES public.contracts(contract_no) ON DELETE CASCADE;
ALTER TABLE public.waiver_requests
  ADD CONSTRAINT waiver_requests_contract_no_fkey
  FOREIGN KEY (contract_no) REFERENCES public.contracts(contract_no) ON DELETE CASCADE;


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

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;
