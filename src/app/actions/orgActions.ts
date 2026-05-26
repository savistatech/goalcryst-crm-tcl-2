"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type OrgRole = "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";

export interface OrgProfile {
  id: string;
  full_name: string;
  role: OrgRole;
  reporting_to: string | null;
  branch: string | null;
  department: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrgNode extends OrgProfile {
  children: OrgNode[];
}

/**
 * Fetches all profiles and builds a nested OrgNode tree.
 * Nodes with reporting_to = NULL are roots (typically Admins).
 */
export async function getOrgTree(): Promise<OrgNode[]> {
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, reporting_to, branch, department, phone, is_active, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error || !list) {
    console.error("Error fetching org profiles:", error);
    return [];
  }

  return buildTree(list as OrgProfile[]);
}

/**
 * Builds a nested tree from a flat list using reporting_to as the parent pointer.
 */
function buildTree(profiles: OrgProfile[]): OrgNode[] {
  const map = new Map<string, OrgNode>();

  // First pass: create all nodes
  for (const p of profiles) {
    map.set(p.id, { ...p, children: [] });
  }

  const roots: OrgNode[] = [];

  // Second pass: assign children
  for (const node of map.values()) {
    if (node.reporting_to && map.has(node.reporting_to)) {
      map.get(node.reporting_to)!.children.push(node);
    } else {
      // No valid parent → root
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Returns all direct reports (children) for a given user.
 */
export async function getDirectReports(userId: string): Promise<OrgProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, reporting_to, branch, department, phone, is_active, created_at")
    .eq("reporting_to", userId)
    .order("full_name", { ascending: true });

  if (error || !data) {
    console.error("Error fetching direct reports:", error);
    return [];
  }

  return data as OrgProfile[];
}

/**
 * Updates the reporting_to field for a given user. Admin only.
 */
export async function assignReportingTo(
  targetUserId: string,
  managerUserId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const activeUser = await getActiveUser();
  if (!activeUser) {
    return { success: false, error: "Unauthenticated session." };
  }

  // Only Admin can change hierarchy
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", activeUser.id)
    .single();

  if (!profile || profile.role !== "Admin") {
    return { success: false, error: "Access denied. Only Admin can modify reporting lines." };
  }

  // Prevent self-assignment
  if (targetUserId === managerUserId) {
    return { success: false, error: "A user cannot report to themselves." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ reporting_to: managerUserId, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) {
    return { success: false, error: "Failed to update reporting line: " + error.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: activeUser.id,
    action: "ORG_HIERARCHY_UPDATE",
    entity_type: "profiles",
    entity_id: targetUserId,
    metadata: { new_manager_id: managerUserId }
  });

  revalidatePath("/org");
  revalidatePath("/users");
  return { success: true };
}

/**
 * Returns all users eligible to be a manager (above a given role level).
 */
export async function getEligibleManagers(forRole: OrgRole): Promise<OrgProfile[]> {
  const supabase = await createClient();

  const roleHierarchy: OrgRole[] = [
    "Admin",
    "Branch Manager",
    "Assistant Manager",
    "Team Leader",
    "Employee"
  ];

  const currentIndex = roleHierarchy.indexOf(forRole);
  // Eligible managers are all roles strictly ABOVE the current one
  const eligibleRoles = currentIndex > 0 ? roleHierarchy.slice(0, currentIndex) : [];

  if (eligibleRoles.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, reporting_to, branch, department, phone, is_active, created_at")
    .in("role", eligibleRoles)
    .eq("is_active", true)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (error || !data) return [];
  return data as OrgProfile[];
}
