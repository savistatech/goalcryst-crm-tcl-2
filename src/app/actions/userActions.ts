"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface OperatorRecord {
  id: string;
  full_name: string;
  role: "Super Admin" | "Manager" | "Agent" | "Auditor";
  is_active: boolean;
  created_at: string;
  permissions: {
    can_approve_waivers: boolean;
    can_import_data: boolean;
    can_view_audit_logs: boolean;
  };
}

interface DbProfileRow {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_permissions: Array<{
    permission_key: string;
  }> | {
    permission_key: string;
  } | null;
}

/**
 * Fetches all operators joined with their specific permission overrides from user_permissions.
 */
export async function getOperatorsWithPermissions(): Promise<OperatorRecord[]> {
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      is_active,
      created_at,
      user_permissions(
        permission_key
      )
    `)
    .order("role", { ascending: true });

  if (error || !list) {
    console.error("Error querying operators with permissions:", error);
    return [];
  }

  return (list as unknown as DbProfileRow[]).map((row: DbProfileRow) => {
    const rawPerms = row.user_permissions || [];
    const perms = Array.isArray(rawPerms) ? rawPerms : [rawPerms];
    const assignedKeys = perms.map((p) => p?.permission_key).filter(Boolean);

    // Inherit standard base privileges from primary role
    const defaultCanApprove = row.role === "Super Admin" || row.role === "Manager";
    const defaultCanImport = row.role === "Super Admin";
    const defaultCanViewAudit = row.role === "Super Admin" || row.role === "Auditor";

    return {
      id: row.id,
      full_name: row.full_name,
      role: row.role as "Super Admin" | "Manager" | "Agent" | "Auditor",
      is_active: row.is_active,
      created_at: row.created_at,
      permissions: {
        can_approve_waivers: assignedKeys.includes("can_approve_waiver") || defaultCanApprove,
        can_import_data: assignedKeys.includes("can_upload_excel") || defaultCanImport,
        can_view_audit_logs: assignedKeys.includes("can_view_audit_logs") || defaultCanViewAudit
      }
    };
  });
}

/**
 * Creates a new operator account.
 * Automatically handles Supabase Auth Admin user registration and falls back to direct profile writing
 * if the administrative container or service role keys are unavailable.
 */
export async function createOperator(data: {
  name: string;
  email: string;
  role: "Super Admin" | "Manager" | "Agent" | "Auditor";
  canApprove: boolean;
  canImport: boolean;
  canViewAudit: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Resolve current active operator session
  const activeUser = await getActiveUser();
  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated operator session." };
  }

  let userId = "";

  try {
    // 2. Attempt registration via Supabase Auth Admin API (automatically confirms email)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: data.email,
      password: "password123", // Default seeded password
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
        role: data.role
      }
    });

    if (authErr || !authData?.user) {
      console.warn("Auth Admin API registration failed, falling back to direct profile insert:", authErr?.message);
      
      // Fallback: Generate UUID and directly write profile
      userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "c0eebc99-9c0b-4ef8-bb6d-" + Math.random().toString(16).substring(2, 14);
      
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: userId,
        full_name: data.name,
        role: data.role,
        is_active: true
      });

      if (profileErr) {
        return { success: false, error: "Operator profile registry failed: " + profileErr.message };
      }
    } else {
      userId = authData.user.id;
      // Sync or update role on profile just in case trigger latency occurred
      await supabase
        .from("profiles")
        .update({ role: data.role })
        .eq("id", userId);
    }
  } catch {
    console.error("Exception during registration, triggering direct registry fallback");
    userId = "c0eebc99-9c0b-4ef8-bb6d-" + Math.random().toString(16).substring(2, 14);
    
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name: data.name,
      role: data.role,
      is_active: true
    });

    if (profileErr) {
      return { success: false, error: "Operator profile registry failed: " + profileErr.message };
    }
  }

  // 3. Insert custom overrides keys into user_permissions
  const inserts = [];
  if (data.canApprove) inserts.push({ user_id: userId, permission_key: "can_approve_waiver" });
  if (data.canImport) inserts.push({ user_id: userId, permission_key: "can_upload_excel" });
  if (data.canViewAudit) inserts.push({ user_id: userId, permission_key: "can_view_audit_logs" });

  if (inserts.length > 0) {
    const { error: permErr } = await supabase.from("user_permissions").insert(inserts);
    if (permErr) {
      console.error("Permissions mapping error:", permErr.message);
    }
  }

  // 4. Log compliance transaction
  await supabase.from("audit_logs").insert({
    user_id: activeUser.id,
    action: "OPERATOR_CREATE",
    entity_type: "profiles",
    entity_id: userId,
    metadata: {
      operator_name: data.name,
      operator_email: data.email,
      operator_role: data.role,
      permissions: {
        can_approve_waivers: data.canApprove,
        can_import_data: data.canImport,
        can_view_audit_logs: data.canViewAudit
      }
    }
  });

  revalidatePath("/users");
  return { success: true };
}

/**
 * Modifies custom permission overrides in user_permissions.
 */
export async function updateOperatorPermissions(
  userId: string,
  permissions: {
    canApprove: boolean;
    canImport: boolean;
    canViewAudit: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Resolve current active operator session
  const activeUser = await getActiveUser();
  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated operator session." };
  }

  // 2. Clear out existing permission override keys
  const { error: delErr } = await supabase
    .from("user_permissions")
    .delete()
    .eq("user_id", userId);

  if (delErr) {
    return { success: false, error: "Permissions clear failed: " + delErr.message };
  }

  // 3. Insert newly checked permission override keys
  const inserts = [];
  if (permissions.canApprove) inserts.push({ user_id: userId, permission_key: "can_approve_waiver" });
  if (permissions.canImport) inserts.push({ user_id: userId, permission_key: "can_upload_excel" });
  if (permissions.canViewAudit) inserts.push({ user_id: userId, permission_key: "can_view_audit_logs" });

  if (inserts.length > 0) {
    const { error: permErr } = await supabase.from("user_permissions").insert(inserts);
    if (permErr) {
      return { success: false, error: "Permissions mutation failed: " + permErr.message };
    }
  }

  // 4. Log compliance audit log
  await supabase.from("audit_logs").insert({
    user_id: activeUser.id,
    action: "OPERATOR_PERMISSIONS_UPDATE",
    entity_type: "profiles",
    entity_id: userId,
    metadata: {
      target_operator_id: userId,
      overrides: permissions
    }
  });

  revalidatePath("/users");
  return { success: true };
}

/**
 * Server action to fetch permissions check map for the currently logged-in operator.
 */
export async function getCurrentUserPermissions(): Promise<Record<string, boolean>> {
  const user = await getActiveUser();
  if (!user) {
    return {} as Record<string, boolean>;
  }
  const { getUserPermissions } = await import("@/utils/permissions");
  return await getUserPermissions(user.id);
}
