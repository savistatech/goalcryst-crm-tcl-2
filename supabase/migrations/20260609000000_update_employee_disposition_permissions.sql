-- Migration: Update has_app_permission to grant can_view_all_dispositions to Employees
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
