"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";


export interface PendingWaiver {
  id: string;
  contract_no: string;
  customer_name: string;
  employee_name: string;
  total_outstanding: number;
  pos: number;
  requested_waiver_amount: number;
  customer_payable_amount: number;
  reason: string;
  employee_remarks: string;
  routed_to: string[];
  created_at: string;
}

export interface MyWaiverRequest {
  id: string;
  contract_no: string;
  customer_name: string;
  total_outstanding: number;
  pos: number;
  requested_waiver_amount: number;
  customer_payable_amount: number;
  reason: string;
  employee_remarks: string;
  status: "Pending" | "Approved" | "Rejected";
  manager_remarks: string | null;
  routed_to: string[];
  routed_to_names: string[];
  created_at: string;
  updated_at: string | null;
}

/**
 * Fetches all waiver requests raised by the currently authenticated employee.
 * Used to power the Employee's personal waiver status tracker.
 */
export async function getMyWaiverRequests(): Promise<MyWaiverRequest[]> {
  const supabase = await createClient();
  const user = await getActiveUser();

  if (!user) return [];

  const { data: list, error } = await supabase
    .from("waiver_requests")
    .select(`
      id,
      contract_no,
      total_outstanding,
      pos,
      requested_waiver_amount,
      customer_payable_amount,
      employee_remarks,
      status,
      manager_remarks,
      routed_to,
      created_at,
      updated_at,
      contracts(customer_name),
      waiver_reason:waiver_reasons(reason)
    `)
    .eq("employee_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !list) {
    console.error("Error fetching employee waiver requests:", error);
    return [];
  }

  const { getSupervisorsForRouting } = await import("./userActions");
  const supervisors = await getSupervisorsForRouting();
  const supMap = new Map(supervisors.map(s => [s.id, s.full_name]));

  return list.map((row: any) => {
    const contracts = row.contracts || {};
    const routedIds: string[] = row.routed_to || [];
    const routedNames = routedIds.map(id => supMap.get(id) || "Unknown Manager");

    return {
      id: row.id,
      contract_no: row.contract_no,
      customer_name: contracts.customer_name || "Unknown Customer",
      total_outstanding: Number(row.total_outstanding || 0),
      pos: Number(row.pos || 0),
      requested_waiver_amount: Number(row.requested_waiver_amount || 0),
      customer_payable_amount: Number(row.customer_payable_amount || 0),
      reason: row.waiver_reason?.reason || "Unknown",
      employee_remarks: row.employee_remarks || "",
      status: row.status as "Pending" | "Approved" | "Rejected",
      manager_remarks: row.manager_remarks || null,
      routed_to: routedIds,
      routed_to_names: routedNames,
      created_at: row.created_at,
      updated_at: row.updated_at || null,
    };
  });
}

/**
 * Fetches all Pending waiver discount requests for Supervisor review.
 */
export async function getPendingWaiverRequests(): Promise<PendingWaiver[]> {
  const supabase = await createClient();

  let query = supabase
    .from("waiver_requests")
    .select(`
      id,
      contract_no,
      total_outstanding,
      pos,
      requested_waiver_amount,
      customer_payable_amount,
      employee_remarks,
      routed_to,
      created_at,
      contracts(customer_name),
      waiver_reason:waiver_reasons(reason),
      employee_profile:profiles!waiver_requests_employee_id_fkey(full_name)
    `)
    .eq("status", "Pending");

  const user = await getActiveUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile && profile.role !== "Admin") {
      query = query.contains("routed_to", [user.id]);
    }
  }

  const { data: list, error } = await query.order("created_at", { ascending: true });

  if (error || !list) {
    console.error("Error fetching pending waivers:", error);
    return [];
  }

  return list.map((row: any) => {
    const contracts = row.contracts || {};
    const employee = row.employee_profile || {};
    return {
      id: row.id,
      contract_no: row.contract_no,
      customer_name: contracts.customer_name || "Unknown Customer",
      employee_name: employee.full_name || "System User",
      total_outstanding: Number(row.total_outstanding || 0),
      pos: Number(row.pos || 0),
      requested_waiver_amount: Number(row.requested_waiver_amount || 0),
      customer_payable_amount: Number(row.customer_payable_amount || 0),
      reason: row.waiver_reason?.reason || "Unknown",
      employee_remarks: row.employee_remarks || "",
      routed_to: row.routed_to || [],
      created_at: row.created_at
    };
  });
}

/**
 * Commits a manager's decision (Approve or Reject) for a waiver discount request.
 * Automatically inserts a compliance audit transaction log.
 */
export async function reviewWaiverRequest(
  waiverId: string,
  status: "Approved" | "Rejected",
  managerRemarks: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Resolve current active manager profile session
  const user = await getActiveUser();
  if (!user) {
    return { success: false, error: "Access Denied: Unauthenticated user session." };
  }

  // 2. Fetch target waiver to capture details for audit log before updating
  const { data: targetWaiver, error: fetchErr } = await supabase
    .from("waiver_requests")
    .select("contract_no, requested_waiver_amount, customer_payable_amount")
    .eq("id", waiverId)
    .single();

  if (fetchErr || !targetWaiver) {
    return { success: false, error: "Target waiver record not found: " + fetchErr?.message };
  }

  // 3. Update the waiver status
  const { error: updateErr } = await supabase
    .from("waiver_requests")
    .update({
      status,
      manager_remarks: managerRemarks,
      reviewed_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", waiverId);

  if (updateErr) {
    return { success: false, error: "Status mutation failed: " + updateErr.message };
  }

  // 4. Log compliance transaction to audit logs
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: status === "Approved" ? "WAIVER_APPROVE" : "WAIVER_REJECT",
    entity_type: "waiver_requests",
    entity_id: waiverId,
    metadata: {
      contract_no: targetWaiver.contract_no,
      waiver_amount: targetWaiver.requested_waiver_amount,
      payable_amount: targetWaiver.customer_payable_amount,
      manager_remarks: managerRemarks
    }
  });

  revalidatePath("/");
  return { success: true };
}

export interface AuditRecord {
  id: string;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: any;
  operator_name: string;
  operator_role: string;
}

/**
 * Fetches compliance log feeds from audit_logs table, supporting dynamic filters.
 */
export async function getAuditLogs(
  actionFilter?: string,
  contractFilter?: string
): Promise<AuditRecord[]> {
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(`
      id,
      created_at,
      action,
      entity_type,
      entity_id,
      metadata,
      operator_profile:profiles(full_name, role)
    `);

  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }

  // Filter JSON metadata for matching contract code if search is active
  if (contractFilter) {
    query = query.or(`entity_id.eq.${contractFilter},metadata->>contract_no.eq.${contractFilter}`);
  }

  const { data: logs, error } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !logs) {
    console.error("Error querying audit logs:", error);
    return [];
  }

  return logs.map((row: any) => {
    const profile = row.operator_profile || {};
    return {
      id: String(row.id),
      created_at: row.created_at,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metadata: row.metadata || {},
      operator_name: profile.full_name || "System Automated",
      operator_role: profile.role || "System"
    };
  });
}
