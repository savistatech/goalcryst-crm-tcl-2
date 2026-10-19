"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface AdminContractRow {
  contract_no: string;
  customer_name: string;
  product: string;
  branch: string;
  bom_dpd: number;
  bom_bucket?: string;
  bkt_tagging?: string;
  finone_scheme_name?: string;
  cif?: string;
  is_archived: boolean;
  imported_at: string;
}

/**
 * Fetches all contracts with optional search filtering and pagination.
 * Includes the employee name assigned to the contract (if any).
 */
export async function getAllContracts(
  page: number = 1,
  limit: number = 50,
  searchTerm: string = ""
): Promise<{ contracts: AdminContractRow[]; totalCount: number }> {
  const supabase = await createClient();

  const user = await getActiveUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Ensure Admin or BM role (authorization check)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "Admin" && profile.role !== "Branch Manager" && profile.role !== "Super Admin")) {
    throw new Error("Unauthorized: Insufficient permissions to view contract master list.");
  }

  // Start query
  let query = supabase
    .from("contracts")
    .select(
      `
      contract_no,
      customer_name,
      product,
      branch,
      bom_dpd,
      bom_bucket,
      bkt_tagging,
      finone_scheme_name,
      cif,
      is_archived,
      imported_at
    `,
      { count: "exact" }
    );

  // Apply search filter if provided
  if (searchTerm) {
    query = query.or(
      `contract_no.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,branch.ilike.%${searchTerm}%,cif.ilike.%${searchTerm}%`
    );
  }

  // Pagination and sorting
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("imported_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error || !data) {
    console.error("Error fetching contracts for admin view:", error);
    return { contracts: [], totalCount: 0 };
  }

  const contracts: AdminContractRow[] = data.map((row: any) => {
    return {
      contract_no: row.contract_no,
      customer_name: row.customer_name,
      product: row.product || "-",
      branch: row.branch || "-",
      bom_dpd: Number(row.bom_dpd || 0),
      is_archived: row.is_archived || false,
      imported_at: row.imported_at,
    };
  });

  return { contracts, totalCount: count || 0 };
}

/**
 * Toggles the `is_archived` status of a specific contract.
 */
export async function toggleArchiveContract(contract_no: string, newStatus: boolean): Promise<boolean> {
  const supabase = await createClient();

  const user = await getActiveUser();
  if (!user) throw new Error("Unauthorized");

  // Admin/BM only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "Admin" && profile.role !== "Branch Manager")) {
    throw new Error("Unauthorized: Insufficient permissions to archive contracts.");
  }

  const { error } = await supabase
    .from("contracts")
    .update({ is_archived: newStatus, updated_at: new Date().toISOString() })
    .eq("contract_no", contract_no);

  if (error) {
    console.error("Error toggling archive status:", error);
    throw new Error("Failed to update archive status.");
  }

  // Revalidate relevant pages so queues and lists update automatically
  revalidatePath("/contracts");
  revalidatePath("/");
  
  return true;
}

/**
 * Bulk toggle the `is_archived` status of multiple contracts.
 */
export async function bulkArchiveContracts(contract_nos: string[], newStatus: boolean): Promise<boolean> {
  const supabase = await createClient();

  const user = await getActiveUser();
  if (!user) throw new Error("Unauthorized");

  // Admin/BM only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "Admin" && profile.role !== "Branch Manager")) {
    throw new Error("Unauthorized: Insufficient permissions to archive contracts.");
  }

  if (contract_nos.length === 0) return true;

  const { error } = await supabase
    .from("contracts")
    .update({ is_archived: newStatus, updated_at: new Date().toISOString() })
    .in("contract_no", contract_nos);

  if (error) {
    console.error("Error bulk toggling archive status:", error);
    throw new Error("Failed to update archive status in bulk.");
  }

  revalidatePath("/contracts");
  revalidatePath("/");
  
  return true;
}

/**
 * Bulk delete specific contracts permanently.
 * Only Admins can perform destructive deletions.
 */
export async function bulkDeleteContracts(contract_nos: string[]): Promise<boolean> {
  const supabase = await createClient();

  const user = await getActiveUser();
  if (!user) throw new Error("Unauthorized");

  // Strict Admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Admin") {
    throw new Error("Unauthorized: Only Admins can delete records.");
  }

  if (contract_nos.length === 0) return true;

  // ON DELETE CASCADE will handle all related tables (financials, legal, etc.)
  const { error } = await supabase
    .from("contracts")
    .delete()
    .in("contract_no", contract_nos);

  if (error) {
    console.error("Error bulk deleting contracts:", error);
    throw new Error("Failed to delete contracts.");
  }

  revalidatePath("/contracts");
  revalidatePath("/");
  
  return true;
}

/**
 * Delete ALL contracts in the system permanently.
 * Extremely destructive operation. Admin only.
 */
export async function deleteAllContracts(): Promise<boolean> {
  const supabase = await createClient();

  const user = await getActiveUser();
  if (!user) throw new Error("Unauthorized");

  // Strict Admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "Admin") {
    throw new Error("Unauthorized: Only Admins can perform master deletion.");
  }

  // Supabase delete() requires a filter, using neq to match all
  const { error } = await supabase
    .from("contracts")
    .delete()
    .neq("contract_no", "NULL_DUMMY_NEVER_MATCHES");

  if (error) {
    console.error("Error deleting all contracts:", error);
    throw new Error("Failed to delete all contracts.");
  }

  revalidatePath("/contracts");
  revalidatePath("/");
  
  return true;
}
