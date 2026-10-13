-- Migration: Expand TCL Contracts Schema for all 216 fields from Fields.xlsx
-- Includes Agency Hierarchy, Bureau/CIBIL Scores, Call Trails, Banking, Demographics, and Legal extensions.

-- 1. Extend Core Contracts Table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS prod_flag TEXT,
  ADD COLUMN IF NOT EXISTS prod_d TEXT,
  ADD COLUMN IF NOT EXISTS new_cat TEXT,
  ADD COLUMN IF NOT EXISTS allocation_status_sept TEXT,
  ADD COLUMN IF NOT EXISTS system_flagging TEXT,
  ADD COLUMN IF NOT EXISTS ccod_other TEXT,
  ADD COLUMN IF NOT EXISTS writeoff_flg TEXT,
  ADD COLUMN IF NOT EXISTS bkt_tagging TEXT,
  ADD COLUMN IF NOT EXISTS non_starter TEXT,
  ADD COLUMN IF NOT EXISTS delq_string TEXT,
  ADD COLUMN IF NOT EXISTS finone_scheme_name TEXT,
  ADD COLUMN IF NOT EXISTS cif TEXT,
  ADD COLUMN IF NOT EXISTS customer_profile TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS occupation_type TEXT,
  ADD COLUMN IF NOT EXISTS organization_employer_name TEXT;

-- 2. Extend Contract Contacts Table (Co-applicants, Guarantors, PAN, Emails)
ALTER TABLE public.contract_contacts
  ADD COLUMN IF NOT EXISTS coapplicant_1 TEXT,
  ADD COLUMN IF NOT EXISTS coapplicant_2 TEXT,
  ADD COLUMN IF NOT EXISTS coapplicant_3 TEXT,
  ADD COLUMN IF NOT EXISTS coapplicant_4 TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_1 TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_2 TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_3 TEXT,
  ADD COLUMN IF NOT EXISTS pan_no TEXT,
  ADD COLUMN IF NOT EXISTS is_primary_email_yes TEXT,
  ADD COLUMN IF NOT EXISTS is_primary_email_no TEXT;

-- 3. Extend Contract Assets Table
ALTER TABLE public.contract_assets
  ADD COLUMN IF NOT EXISTS vehicle_available TEXT,
  ADD COLUMN IF NOT EXISTS secured_tagging TEXT;

-- 4. Extend Contract Financials Table (Banking, Insurance, Performance, Settlements & Recovery)
ALTER TABLE public.contract_financials
  ADD COLUMN IF NOT EXISTS insurance_type TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_end_date TEXT,
  ADD COLUMN IF NOT EXISTS sum_assured_amount NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS death_case_insurance_update TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date TEXT,
  ADD COLUMN IF NOT EXISTS contract_end_date TEXT,
  ADD COLUMN IF NOT EXISTS cycle TEXT,
  ADD COLUMN IF NOT EXISTS total_tenure TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS future_pos NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS pos_in_cr TEXT,
  ADD COLUMN IF NOT EXISTS act_pct_cr TEXT,
  ADD COLUMN IF NOT EXISTS collxn_act_tar TEXT,
  ADD COLUMN IF NOT EXISTS ror TEXT,
  ADD COLUMN IF NOT EXISTS target_pct TEXT,
  ADD COLUMN IF NOT EXISTS paid_on_funding_amt NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS paid_pct TEXT,
  ADD COLUMN IF NOT EXISTS sms_camp TEXT,
  ADD COLUMN IF NOT EXISTS ptp TEXT,
  ADD COLUMN IF NOT EXISTS ptp_in_cr TEXT,
  ADD COLUMN IF NOT EXISTS ptp_mobile_no TEXT,
  ADD COLUMN IF NOT EXISTS ptp_date TEXT,
  ADD COLUMN IF NOT EXISTS bptp_date TEXT,
  ADD COLUMN IF NOT EXISTS otc TEXT,
  ADD COLUMN IF NOT EXISTS rec_mis TEXT,
  ADD COLUMN IF NOT EXISTS docs TEXT,
  ADD COLUMN IF NOT EXISTS collxn NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS collection_in_cr TEXT,
  ADD COLUMN IF NOT EXISTS collection_mode TEXT,
  ADD COLUMN IF NOT EXISTS collection_date TEXT,
  ADD COLUMN IF NOT EXISTS receipt TEXT,
  ADD COLUMN IF NOT EXISTS pym_status TEXT,
  ADD COLUMN IF NOT EXISTS last_month_pay_collxn TEXT,
  ADD COLUMN IF NOT EXISTS last_month_pay_status TEXT,
  ADD COLUMN IF NOT EXISTS outside_pay_l3m_vs_emi TEXT,
  ADD COLUMN IF NOT EXISTS paid_outside TEXT,
  ADD COLUMN IF NOT EXISTS ratio_offus_paylm_tcl_emi TEXT,
  ADD COLUMN IF NOT EXISTS ecs_autodebit TEXT,
  ADD COLUMN IF NOT EXISTS settlement_mis TEXT,
  ADD COLUMN IF NOT EXISTS settlement_initiation_date TEXT,
  ADD COLUMN IF NOT EXISTS settlement_end_date TEXT,
  ADD COLUMN IF NOT EXISTS trench TEXT,
  ADD COLUMN IF NOT EXISTS settlement_remark TEXT,
  ADD COLUMN IF NOT EXISTS ots_status TEXT,
  ADD COLUMN IF NOT EXISTS smis TEXT,
  ADD COLUMN IF NOT EXISTS rmis TEXT,
  ADD COLUMN IF NOT EXISTS settlement_status TEXT,
  ADD COLUMN IF NOT EXISTS repo_mis TEXT,
  ADD COLUMN IF NOT EXISTS repo_date TEXT,
  ADD COLUMN IF NOT EXISTS sale_release_date TEXT,
  ADD COLUMN IF NOT EXISTS settlement_serial_46173 TEXT;

-- 5. Extend Contract Legal Table
ALTER TABLE public.contract_legal
  ADD COLUMN IF NOT EXISTS new_cnr_number_cc TEXT,
  ADD COLUMN IF NOT EXISTS hand_s_nbw_bw_pc_oct8 TEXT,
  ADD COLUMN IF NOT EXISTS hand_s_nbw_bw_pc_type2 TEXT,
  ADD COLUMN IF NOT EXISTS arbitrator_type TEXT,
  ADD COLUMN IF NOT EXISTS arbitration_ndoh TEXT,
  ADD COLUMN IF NOT EXISTS ep_group_stage TEXT;

-- 6. Create Contract Agency Hierarchy Table
CREATE TABLE IF NOT EXISTS public.contract_agency_hierarchy (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  sept_allocation_type TEXT,
  sept_agency_code TEXT,
  sept_month_agency TEXT,
  final_allocation_tagging TEXT,
  oct_allocation_type TEXT,
  oct_agency_code TEXT,
  oct_month_agency TEXT,
  changes_ss TEXT,
  agent_name TEXT,
  agent_id TEXT,
  agent_mobile_no TEXT,
  cre_name TEXT,
  cm_code TEXT,
  cm_name TEXT,
  ccm_code TEXT,
  ccm_name TEXT,
  rcm_code TEXT,
  rcm_name TEXT,
  ncm_code TEXT,
  ncm_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. Create Contract Bureau & CIBIL Scores Table
CREATE TABLE IF NOT EXISTS public.contract_bureau_scores (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  credit_score TEXT,
  cibil_score TEXT,
  sourcing_cibil_score TEXT,
  bureau_details_1 TEXT,
  bureau_details_2 TEXT,
  bureau_details_3 TEXT,
  bureau_details_4 TEXT,
  del_vs_new_contact TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Create Contract Call Trails & Dispositions Table
CREATE TABLE IF NOT EXISTS public.contract_trails (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  sept_trails TEXT,
  sept_contact_mode TEXT,
  sept_trail_recorded_by TEXT,
  oct_trails TEXT,
  oct_contact_mode TEXT,
  oct_trail_recorded_by TEXT,
  contactability_status TEXT,
  dispo_status TEXT,
  dispo_code TEXT,
  sub_dispo_code TEXT,
  mode_of_contact TEXT,
  caller_fb TEXT,
  agency_tl_manager_fb TEXT,
  detailed_fb TEXT,
  reason_for_default_1 TEXT,
  reason_for_default_2 TEXT,
  reason_for_default_3 TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Configure Row Level Security (RLS) on New Tables
ALTER TABLE public.contract_agency_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_bureau_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_trails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS agency_hierarchy_select_allowed ON public.contract_agency_hierarchy;
DROP POLICY IF EXISTS agency_hierarchy_import_insert ON public.contract_agency_hierarchy;
DROP POLICY IF EXISTS agency_hierarchy_import_update ON public.contract_agency_hierarchy;

DROP POLICY IF EXISTS bureau_scores_select_allowed ON public.contract_bureau_scores;
DROP POLICY IF EXISTS bureau_scores_import_insert ON public.contract_bureau_scores;
DROP POLICY IF EXISTS bureau_scores_import_update ON public.contract_bureau_scores;

DROP POLICY IF EXISTS trails_select_allowed ON public.contract_trails;
DROP POLICY IF EXISTS trails_import_insert ON public.contract_trails;
DROP POLICY IF EXISTS trails_import_update ON public.contract_trails;

-- SELECT policies
CREATE POLICY agency_hierarchy_select_allowed ON public.contract_agency_hierarchy
  FOR SELECT TO authenticated
  USING (public.has_app_permission('can_search_customer') OR public.has_app_permission('can_manage_users'));

CREATE POLICY bureau_scores_select_allowed ON public.contract_bureau_scores
  FOR SELECT TO authenticated
  USING (public.has_app_permission('can_view_financial_data'));

CREATE POLICY trails_select_allowed ON public.contract_trails
  FOR SELECT TO authenticated
  USING (public.has_app_permission('can_search_customer') OR public.has_app_permission('can_manage_users'));

-- INSERT policies for bulk Excel import
CREATE POLICY agency_hierarchy_import_insert ON public.contract_agency_hierarchy
  FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY bureau_scores_import_insert ON public.contract_bureau_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY trails_import_insert ON public.contract_trails
  FOR INSERT TO authenticated
  WITH CHECK (public.has_app_permission('can_upload_excel'));

-- UPDATE policies for upsert capability
CREATE POLICY agency_hierarchy_import_update ON public.contract_agency_hierarchy
  FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel'))
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY bureau_scores_import_update ON public.contract_bureau_scores
  FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel'))
  WITH CHECK (public.has_app_permission('can_upload_excel'));

CREATE POLICY trails_import_update ON public.contract_trails
  FOR UPDATE TO authenticated
  USING (public.has_app_permission('can_upload_excel'))
  WITH CHECK (public.has_app_permission('can_upload_excel'));

