import { createClient } from "./supabase/server";

export type UserRole = "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";

export const PERMISSION_KEYS = [
  "can_upload_excel",
  "can_search_customer",
  "can_view_contact_numbers",
  "can_view_financial_data",
  "can_view_legal_data",
  "can_view_asset_data",
  "can_add_disposition",
  "can_raise_waiver",
  "can_approve_waiver",
  "can_view_reports",
  "can_export_reports",
  "can_manage_users",
  "can_manage_roles",
  "can_view_audit_logs",
  "can_view_all_dispositions"
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// Default maps matching implementation plan security matrix
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  "Admin": [...PERMISSION_KEYS],
  "Branch Manager": [
    "can_search_customer",
    "can_view_contact_numbers",
    "can_view_financial_data",
    "can_view_legal_data",
    "can_view_asset_data",
    "can_add_disposition",
    "can_raise_waiver",
    "can_approve_waiver",
    "can_view_reports",
    "can_export_reports",
    "can_view_all_dispositions"
  ],
  "Assistant Manager": [
    "can_search_customer",
    "can_view_contact_numbers",
    "can_view_financial_data",
    "can_view_legal_data",
    "can_view_asset_data",
    "can_add_disposition",
    "can_raise_waiver",
    "can_approve_waiver",
    "can_view_reports",
    "can_export_reports",
    "can_view_all_dispositions"
  ],
  "Team Leader": [
    "can_search_customer",
    "can_view_contact_numbers",
    "can_view_financial_data",
    "can_view_legal_data",
    "can_add_disposition",
    "can_raise_waiver",
    "can_approve_waiver",
    "can_view_reports",
    "can_view_all_dispositions"
  ],
  "Employee": [
    "can_search_customer",
    "can_view_contact_numbers",
    "can_view_financial_data",
    "can_view_legal_data",
    "can_add_disposition",
    "can_raise_waiver",
    "can_export_reports"
  ]
};

/**
 * Computes the active permissions for a user by merging their role default permissions
 * with any custom permission overrides stored in the database.
 */
export async function getUserPermissions(userId: string): Promise<Record<PermissionKey, boolean>> {
  const supabase = await createClient();

  // Initialize permission checklist map
  const activePermissions = PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as Record<PermissionKey, boolean>);

  try {
    // 1. Fetch user role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile for permissions check:", profileError);
      return activePermissions;
    }

    const userRole = profile.role as UserRole;

    // 2. Set defaults from role
    const defaults = ROLE_DEFAULT_PERMISSIONS[userRole] || [];
    defaults.forEach((key) => {
      activePermissions[key] = true;
    });

    // 3. Fetch custom permission overrides (if any)
    const { data: overrides, error: overridesError } = await supabase
      .from("user_permissions")
      .select("permission_key")
      .eq("user_id", userId);

    if (!overridesError && overrides) {
      overrides.forEach((row) => {
        const key = row.permission_key as PermissionKey;
        if (PERMISSION_KEYS.includes(key)) {
          activePermissions[key] = true;
        }
      });
    }
  } catch (err) {
    console.error("Critical error inside getUserPermissions:", err);
  }

  return activePermissions;
}

/**
 * Checks if a specific user has a given permission.
 */
export async function hasPermission(userId: string, permission: PermissionKey): Promise<boolean> {
  const active = await getUserPermissions(userId);
  return !!active[permission];
}
