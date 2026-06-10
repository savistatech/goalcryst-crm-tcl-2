-- Drop existing policies if they exist to prevent migration conflicts
DROP POLICY IF EXISTS contracts_import_update ON public.contracts;
DROP POLICY IF EXISTS contacts_import_update ON public.contract_contacts;
DROP POLICY IF EXISTS assets_import_update ON public.contract_assets;
DROP POLICY IF EXISTS financials_import_update ON public.contract_financials;
DROP POLICY IF EXISTS legal_import_update ON public.contract_legal;

-- Add UPDATE policies for import/upsert capability
CREATE POLICY contracts_import_update ON public.contracts FOR UPDATE TO authenticated USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY contacts_import_update ON public.contract_contacts FOR UPDATE TO authenticated USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY assets_import_update ON public.contract_assets FOR UPDATE TO authenticated USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY financials_import_update ON public.contract_financials FOR UPDATE TO authenticated USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
CREATE POLICY legal_import_update ON public.contract_legal FOR UPDATE TO authenticated USING (public.has_app_permission('can_upload_excel')) WITH CHECK (public.has_app_permission('can_upload_excel'));
