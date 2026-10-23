import { createClient, getActiveUser } from "@/utils/supabase/server";

export interface VisibilityScope {
  userId: string | null;
  role: string;
  /** Employee ids the user may see; null = everyone (Admin). */
  employeeIds: string[] | null;
  /** Number of people below the user in the reporting tree (-1 = everyone). */
  subordinateCount: number;
  scopeLabel: string;
}

/**
 * Resolves whose follow-ups, report rows and dashboard numbers the current user
 * may see: Admin sees everyone; anyone else sees themselves plus everyone below
 * them in the reporting tree (profiles.reporting_to). Backed by the
 * public.visible_employee_ids() database function so the rule lives in one place.
 * Fails closed to "own records only" if the scope cannot be resolved.
 */
export async function getVisibilityScope(): Promise<VisibilityScope> {
  const supabase = await createClient();
  const user = await getActiveUser();

  if (!user) {
    return { userId: null, role: "Unknown", employeeIds: [], subordinateCount: 0, scopeLabel: "Unauthenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role || "Employee";

  const { data: ids, error } = await supabase.rpc("visible_employee_ids");

  if (error) {
    console.error("[Scope] visible_employee_ids failed, falling back to own records:", error);
    return { userId: user.id, role, employeeIds: [user.id], subordinateCount: 0, scopeLabel: "Your own records only" };
  }

  if (ids === null) {
    return { userId: user.id, role, employeeIds: null, subordinateCount: -1, scopeLabel: "All employees" };
  }

  const employeeIds: string[] = Array.from(new Set([user.id, ...((ids as string[]) || [])]));
  const subordinateCount = employeeIds.length - 1;

  return {
    userId: user.id,
    role,
    employeeIds,
    subordinateCount,
    scopeLabel: subordinateCount > 0
      ? `You + your team (${subordinateCount} member${subordinateCount !== 1 ? "s" : ""})`
      : "Your own records only",
  };
}
