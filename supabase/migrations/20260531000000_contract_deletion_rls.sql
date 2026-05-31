-- Allow Admin to delete contracts
CREATE POLICY "contracts_admin_delete" 
  ON public.contracts
  FOR DELETE
  TO authenticated
  USING (has_app_permission('can_manage_users'::text));
