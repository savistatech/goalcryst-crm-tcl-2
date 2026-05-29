"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createSupabaseClient(
    process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface OperatorRecord {
  id: string;
  full_name: string;
  role: "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";
  reporting_to: string | null;
  branch: string | null;
  department: string | null;
  phone: string | null;
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
  reporting_to: string | null;
  branch: string | null;
  department: string | null;
  phone: string | null;
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
      reporting_to,
      branch,
      department,
      phone,
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
    const defaultCanApprove = ["Admin", "Branch Manager", "Assistant Manager", "Team Leader"].includes(row.role);
    const defaultCanImport = row.role === "Admin";
    const defaultCanViewAudit = row.role === "Admin";

    return {
      id: row.id,
      full_name: row.full_name,
      role: row.role as "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee",
      reporting_to: row.reporting_to,
      branch: row.branch,
      department: row.department,
      phone: row.phone,
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
  username: string;
  role: "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";
  password?: string;
  reporting_to?: string | null;
  canApprove: boolean;
  canImport: boolean;
  canViewAudit: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Resolve current active operator session
  const activeUser = await getActiveUser();
  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated user session." };
  }

  let userId = "";

  try {
    // 2. Attempt registration via pure Admin API to bypass cookie permission downgrades
    const adminSupabase = getAdminClient();
    const fakeEmail = `${data.username.trim().toLowerCase()}@goalcryst.com`;

    const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
      email: fakeEmail,
      password: data.password || "password123", // Use provided or fallback
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
        is_active: true,
        reporting_to: data.reporting_to || null
      });

      if (profileErr) {
        return { success: false, error: "User profile registry failed: " + profileErr.message };
      }
    } else {
      userId = authData.user.id;
      // Sync or update role on profile just in case trigger latency occurred
      await supabase
        .from("profiles")
        .update({ role: data.role, reporting_to: data.reporting_to || null })
        .eq("id", userId);
    }
  } catch {
    console.error("Exception during registration, triggering direct registry fallback");
    userId = "c0eebc99-9c0b-4ef8-bb6d-" + Math.random().toString(16).substring(2, 14);
    
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name: data.name,
      role: data.role,
      is_active: true,
      reporting_to: data.reporting_to || null
    });

    if (profileErr) {
      return { success: false, error: "User profile registry failed: " + profileErr.message };
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
      operator_username: data.username,
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
    return { success: false, error: "Access Denied: Unauthenticated user session." };
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
 * Updates editable profile details for a CRM user.
 */
export async function updateUserProfile(
  userId: string,
  data: {
    full_name: string;
    role: "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";
    reporting_to?: string | null;
    branch?: string | null;
    department?: string | null;
    phone?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const activeUser = await getActiveUser();

  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated user session." };
  }

  const { data: activeProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", activeUser.id)
    .single();

  if (activeProfile?.role !== "Admin") {
    return { success: false, error: "Access Denied: Only Admins can edit users." };
  }

  const trimmedName = data.full_name.trim();
  if (!trimmedName) {
    return { success: false, error: "Full name is required." };
  }

  const managerId = data.reporting_to || null;
  if (managerId === userId) {
    return { success: false, error: "A user cannot report to themselves." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: trimmedName,
      role: data.role,
      reporting_to: managerId,
      branch: data.branch?.trim() || null,
      department: data.department?.trim() || null,
      phone: data.phone?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (error) {
    return { success: false, error: "Failed to update user profile: " + error.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: activeUser.id,
    action: "USER_PROFILE_UPDATE",
    entity_type: "profiles",
    entity_id: userId,
    metadata: {
      target_user_id: userId,
      full_name: trimmedName,
      role: data.role,
      reporting_to: managerId,
      branch: data.branch?.trim() || null,
      department: data.department?.trim() || null,
      phone: data.phone?.trim() || null
    }
  });

  revalidatePath("/users");
  revalidatePath("/org");
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

/**
 * Fetches all active users who can approve waivers to populate the routing multi-select.
 */
export async function getSupervisorsForRouting(): Promise<{ id: string; full_name: string; role: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["Branch Manager", "Assistant Manager", "Team Leader"])
    .eq("is_active", true)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("Error fetching supervisors:", error);
    return [];
  }
  return data;
}

/**
 * Toggles the 'is_active' status of a user (Suspension / Activation).
 */
export async function toggleOperatorStatus(targetUserId: string, newStatus: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const activeUser = await getActiveUser();

  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated." };
  }

  // Ensure current user is Admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", activeUser.id).single();
  if (profile?.role !== "Admin") {
    return { success: false, error: "Access Denied: Only Admins can suspend or activate users." };
  }

  if (targetUserId === activeUser.id) {
    return { success: false, error: "You cannot suspend your own account." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: newStatus })
    .eq("id", targetUserId);

  if (error) {
    console.error("Failed to toggle operator status:", error);
    return { success: false, error: "Failed to update user status." };
  }

  revalidatePath("/users");
  return { success: true };
}

/**
 * Permanently deletes a user from auth.users (cascades to profiles).
 * Will catch foreign key constraint errors (e.g. user has call logs) and return a friendly error.
 */
export async function deleteOperator(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const activeUser = await getActiveUser();

  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated." };
  }

  // Ensure current user is Admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", activeUser.id).single();
  if (profile?.role !== "Admin") {
    return { success: false, error: "Access Denied: Only Admins can delete users." };
  }

  if (targetUserId === activeUser.id) {
    return { success: false, error: "You cannot delete your own account." };
  }

  // Use a pure Admin Client (without cookies) to prevent the user session from downgrading privileges
  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase.auth.admin.deleteUser(targetUserId);

  if (error) {
    console.error("Failed to delete operator via Auth Admin API:", error);
    
    // Fallback: If the user was a dummy profile (inserted during the fallback or seed without auth.identities)
    // deleteUser throws a 500. Try directly deleting from public.profiles.
    const { error: profileErr } = await adminSupabase.from("profiles").delete().eq("id", targetUserId);
    
    if (!profileErr) {
      revalidatePath("/users");
      return { success: true }; // Success via fallback
    }

    console.error("Fallback profile deletion failed:", profileErr);
    return { success: false, error: `Auth API Error: ${error.message} | Profile Deletion Error: ${profileErr.message}` };
  }

  revalidatePath("/users");
  return { success: true };
}

/**
 * Updates the authenticated user's password.
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const activeUser = await getActiveUser();

  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resets a specific user's password using the Admin API.
 */
export async function adminResetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const activeUser = await getActiveUser();

  if (!activeUser) {
    return { success: false, error: "Access Denied: Unauthenticated." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", activeUser.id).single();
  if (profile?.role !== "Admin") {
    return { success: false, error: "Access Denied: Only Admins can reset passwords." };
  }

  const adminSupabase = getAdminClient();
  const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
