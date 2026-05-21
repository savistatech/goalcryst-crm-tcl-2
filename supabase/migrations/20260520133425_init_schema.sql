-- 1. Create Custom PostgreSQL Enums
CREATE TYPE public.user_role AS ENUM ('Super Admin', 'Manager', 'Agent', 'Auditor');
CREATE TYPE public.main_dispo_enum AS ENUM ('Contactable', 'Non-Contactable');
CREATE TYPE public.waiver_status_enum AS ENUM ('Pending', 'Approved', 'Rejected');

-- 2. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'Agent',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. User Permissions Table (granular overriding keys)
CREATE TABLE public.user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, permission_key)
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

-- 6. Contracts Table (16 Account & Allocation Status fields)
CREATE TABLE public.contracts (
  contract_no TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  product TEXT NOT NULL,
  branch TEXT NOT NULL,
  state TEXT NOT NULL,
  area TEXT NOT NULL,
  region TEXT NOT NULL,
  secured_category TEXT,
  allocation_category TEXT,
  bom_dpd INT NOT NULL DEFAULT 0,
  mob INT NOT NULL DEFAULT 0,
  bucket INT NOT NULL DEFAULT 0,
  bom_bucket INT NOT NULL DEFAULT 0,
  secured_product_flag TEXT,
  product_detail TEXT,
  allocation_dpd_category TEXT,
  allocated_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 7. Contract Contacts Table (8 phone numbers, 11 addresses, references)
CREATE TABLE public.contract_contacts (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  mobile_1 TEXT,
  mobile_no TEXT,
  primary_mobile TEXT,
  primary_mobile_1 TEXT,
  primary_mobile_2 TEXT,
  mobile_no_2 TEXT,
  latest_contact_no TEXT,
  ref_name_1 TEXT,
  ref_mobile_1 TEXT,
  ref_relation_1 TEXT,
  ref_name_2 TEXT,
  ref_mobile_2 TEXT,
  ref_relation_2 TEXT,
  base_address TEXT,
  landmark TEXT,
  pincode TEXT,
  permanent_address TEXT,
  office_address TEXT,
  finnone_address TEXT,
  master_primary_address TEXT,
  permanent_address_2 TEXT,
  secondary_address TEXT,
  office_address_2 TEXT,
  additional_address TEXT,
  residential_address TEXT,
  ref_full_address_1 TEXT,
  ref_full_address_2 TEXT,
  pdpr_address TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Contract Assets Table (Manufacturer, engine/chassis, RC)
CREATE TABLE public.contract_assets (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  manufacturer TEXT,
  asset_model TEXT,
  rc_number TEXT,
  manufacturer_2 TEXT,
  asset_category TEXT,
  asset_variant TEXT,
  engine_number TEXT,
  chassis_number TEXT,
  year_of_manufacture TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Contract Financials Table (POS, EMI, outstanding, waivers)
CREATE TABLE public.contract_financials (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  finance_amount NUMERIC(15, 2),
  total_pos_outstanding NUMERIC(15, 2),
  pos NUMERIC(15, 2),
  total_amount_collectable NUMERIC(15, 2),
  sale_price NUMERIC(15, 2),
  emi_amount NUMERIC(15, 2),
  od_amount NUMERIC(15, 2),
  principal_overdue NUMERIC(15, 2),
  interest_overdue NUMERIC(15, 2),
  bounce_charges NUMERIC(15, 2),
  current_odc NUMERIC(15, 2),
  total_outstanding NUMERIC(15, 2),
  ots_amount NUMERIC(15, 2),
  pos_waiver_amount NUMERIC(15, 2),
  pos_waiver_percent NUMERIC(5, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 10. Contract Legal Table (all 44 legal case status fields)
CREATE TABLE public.contract_legal (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  notice_sent_sec138 TEXT,
  type_of_case TEXT,
  cheque_amount NUMERIC(15, 2),
  cheque_date DATE,
  cheque_no TEXT,
  sec138_current_status TEXT,
  group_stage TEXT,
  case_no TEXT,
  court_location TEXT,
  court_name TEXT,
  ldoh TEXT,
  ndoh TEXT,
  advocate TEXT,
  hand_summons TEXT,
  hand_warrant_1 TEXT,
  proclamation_orders TEXT,
  lrn_status TEXT,
  lrn_date TEXT,
  arb TEXT,
  sec17_orders_date TEXT,
  award_date TEXT,
  ep_stage TEXT,
  ep_ldoh TEXT,
  ep_ndoh TEXT,
  ep_case_no TEXT,
  ep_advocate TEXT,
  termination_status_sa TEXT,
  lrn_prn_status TEXT,
  lrn_prn_issue_date TEXT,
  lrn_prn_link TEXT,
  cnr_number_cc TEXT,
  cnr_number_pcr TEXT,
  current_stage TEXT,
  filed_location TEXT,
  court_hall TEXT,
  hand_s_nbw_bw_pc TEXT,
  hand_s_nbw_bw_pc_type TEXT,
  claim_amount NUMERIC(15, 2),
  arbitration_group_stage TEXT,
  sec17_orders TEXT,
  sec17_date TEXT,
  court_bench TEXT,
  ep_pdoh TEXT,
  legal_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 11. Dispositions Table (dynamic logged call outcomes)
CREATE TABLE public.dispositions (
  id BIGSERIAL PRIMARY KEY,
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) NOT NULL,
  main_disposition public.main_dispo_enum NOT NULL,
  sub_disposition TEXT NOT NULL,
  remarks TEXT,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  ptp_date DATE,
  ptp_amount NUMERIC(15, 2),
  paid_amount NUMERIC(15, 2),
  payment_date DATE,
  proof_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 12. Waiver Requests Table (discount approvals)
CREATE TABLE public.waiver_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) NOT NULL,
  total_outstanding NUMERIC(15, 2) NOT NULL,
  requested_waiver_amount NUMERIC(15, 2) NOT NULL,
  customer_payable_amount NUMERIC(15, 2) NOT NULL,
  reason TEXT NOT NULL,
  agent_remarks TEXT,
  status public.waiver_status_enum NOT NULL DEFAULT 'Pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
CREATE INDEX idx_contracts_customer_name ON public.contracts(customer_name);
CREATE INDEX idx_contracts_bucket ON public.contracts(bucket);
CREATE INDEX idx_contracts_allocated_to ON public.contracts(allocated_to);
CREATE INDEX idx_dispositions_contract_no ON public.dispositions(contract_no);
CREATE INDEX idx_dispositions_created_at ON public.dispositions(created_at);
CREATE INDEX idx_waiver_requests_status ON public.waiver_requests(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 14. Set Up Supabase Auth Trigger to Sync Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'System Operator'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'Agent'::public.user_role),
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Enable Row-Level Security (RLS) on all Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_legal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 16. Define Security Policies
-- Profiles policies
CREATE POLICY "Enable read access to profiles for authenticated operators"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);
  
CREATE POLICY "Enable update access to own profile for operators"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Universal SELECT/ALL policies for authenticated operators on operation tables
CREATE POLICY "Authenticated operators full access on contracts"
  ON public.contracts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on contract_contacts"
  ON public.contract_contacts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on contract_assets"
  ON public.contract_assets FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on contract_financials"
  ON public.contract_financials FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on contract_legal"
  ON public.contract_legal FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on dispositions"
  ON public.dispositions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on waiver_requests"
  ON public.waiver_requests FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on audit_logs"
  ON public.audit_logs FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on import_batches"
  ON public.import_batches FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on import_errors"
  ON public.import_errors FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on user_permissions"
  ON public.user_permissions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
