-- 1. Create Custom PostgreSQL Enums
CREATE TYPE public.user_role AS ENUM ('Admin', 'Branch Manager', 'Assistant Manager', 'Team Leader', 'Employee');
CREATE TYPE public.waiver_status_enum AS ENUM ('Pending', 'Approved', 'Rejected');

-- 2. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'Employee',
  reporting_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch TEXT,
  department TEXT,
  phone TEXT,
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

-- 6. Contracts Table (Strictly TMF fields)
CREATE TABLE public.contracts (
  contract_no TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  group_code TEXT,
  company_code TEXT,
  vendor TEXT,
  allocated_in_rsc TEXT,
  allocate_date_bif TEXT,
  updated_vintage TEXT,
  band TEXT,
  loan_agreement_date DATE,
  loan_tenure_from DATE,
  loan_tenure_to DATE,
  product_group TEXT,
  region TEXT,
  state TEXT,
  branch TEXT,
  zone TEXT,
  new_region TEXT,
  allocated_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. Contract Contacts Table (Strictly TMF fields)
CREATE TABLE public.contract_contacts (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  borrower_address TEXT,
  borrower_phone_1 TEXT,
  borrower_phone_2 TEXT,
  borrower_mobile TEXT,
  co_borrower_name TEXT,
  co_borrower_address TEXT,
  co_borrower_phone_1 TEXT,
  co_borrower_phone_2 TEXT,
  co_borrower_mobile TEXT,
  guarantor_name TEXT,
  guarantor_address TEXT,
  guarantor_phone_1 TEXT,
  guarantor_phone_2 TEXT,
  guarantor_mobile TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 8. Contract Assets Table (Strictly TMF fields)
CREATE TABLE public.contract_assets (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  registration_number TEXT,
  material TEXT,
  product_disp TEXT,
  engine_number TEXT,
  chassis_number TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 9. Contract Financials Table (Strictly TMF fields)
CREATE TABLE public.contract_financials (
  contract_no TEXT REFERENCES public.contracts(contract_no) ON DELETE CASCADE PRIMARY KEY,
  loan_amount NUMERIC(15, 2),
  sale_price NUMERIC(15, 2),
  sale_date DATE,
  lsa_val_apr26 NUMERIC(15, 2),
  abnc TEXT,
  abnc_amt NUMERIC(15, 2),
  agging TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

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
CREATE INDEX idx_contracts_customer_name ON public.contracts(customer_name);
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
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'Employee'::public.user_role),
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
ALTER TABLE public.main_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_financials ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Authenticated operators full access on main_dispositions"
  ON public.main_dispositions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on sub_dispositions"
  ON public.sub_dispositions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated operators full access on waiver_reasons"
  ON public.waiver_reasons FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
