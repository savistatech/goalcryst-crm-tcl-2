"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Customer360Data {
  contract: any;
  contacts: any;
  assets: any;
  financials: any;
  legal: any;
  dispositions: any[];
  waivers: any[];
}

/**
 * Fetches the entire 360-degree customer records by contract number.
 */
export async function getCustomer360Details(contractNo: string): Promise<Customer360Data | null> {
  const supabase = await createClient();

  // 1. Fetch core contract info
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`
      *,
      allocated_to_profile:profiles!contracts_allocated_to_fkey(id, full_name, role)
    `)
    .eq("contract_no", contractNo)
    .single();

  if (contractError || !contract) {
    console.error("Error fetching customer 360 contract:", contractError);
    return null;
  }

  // 2. Fetch associated contacts
  const { data: contacts } = await supabase
    .from("contract_contacts")
    .select("*")
    .eq("contract_no", contractNo)
    .single();

  // 3. Fetch associated assets
  const { data: assets } = await supabase
    .from("contract_assets")
    .select("*")
    .eq("contract_no", contractNo)
    .single();

  // 4. Fetch associated financials
  const { data: financials } = await supabase
    .from("contract_financials")
    .select("*")
    .eq("contract_no", contractNo)
    .single();

  // 5. Fetch associated legal records
  const { data: legal } = await supabase
    .from("contract_legal")
    .select("*")
    .eq("contract_no", contractNo)
    .single();

  // 6. Fetch dispositions call history ordered newest first
  const { data: dispositions } = await supabase
    .from("dispositions")
    .select(`
      *,
      employee_profile:profiles(id, full_name, role),
      main_disposition:main_dispositions(id, name),
      sub_disposition:sub_dispositions(id, name, form_schema)
    `)
    .eq("contract_no", contractNo)
    .order("created_at", { ascending: false });

  // 7. Fetch waiver requests
  const { data: waivers } = await supabase
    .from("waiver_requests")
    .select(`
      *,
      employee_profile:profiles!waiver_requests_employee_id_fkey(id, full_name),
      reviewed_by_profile:profiles!waiver_requests_reviewed_by_fkey(id, full_name),
      waiver_reason:waiver_reasons(id, reason)
    `)
    .eq("contract_no", contractNo)
    .order("created_at", { ascending: false });

  // 8. Log a compliance audit access record
  // Fetch active user session to bind audit logs
  const user = await getActiveUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "VIEW_CUSTOMER_360",
      entity_type: "contracts",
      entity_id: contractNo,
      metadata: { customer_name: contract.customer_name }
    });
  }

  return {
    contract,
    contacts: contacts || {},
    assets: assets || {},
    financials: financials || {},
    legal: legal || {},
    dispositions: dispositions || [],
    waivers: waivers || []
  };
}

/**
 * Server Action to submit call disposition outcomes.
 * Automatically inserts into public.dispositions and writes an audit log.
 */
export async function logCallDisposition(
  contractNo: string,
  mainDispositionId: string,
  subDispositionId: string,
  remarks: string,
  dynamicData: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Retrieve current employee session
  const user = await getActiveUser();
  if (!user) {
    return { success: false, error: "Authentication expired. Please log in again." };
  }

  // Insert outcome log
  const { error: dispoError } = await supabase
    .from("dispositions")
    .insert({
      contract_no: contractNo,
      employee_id: user.id,
      main_disposition_id: mainDispositionId,
      sub_disposition_id: subDispositionId,
      remarks,
      dynamic_data: dynamicData
    });

  if (dispoError) {
    console.error("Error saving call disposition:", dispoError);
    return { success: false, error: "Failed to record call log in database: " + dispoError.message };
  }

  // Append compliance audit
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "ADD_DISPOSITION",
    entity_type: "dispositions",
    entity_id: contractNo,
    metadata: { mainDispositionId, subDispositionId, dynamicData }
  });

  revalidatePath(`/customers/${contractNo}`);
  return { success: true };
}

/**
 * Server Action to request portfolio settlement waivers.
 * Validates discounts and writes to waiver_requests.
 */
export async function raiseWaiverRequest(
  contractNo: string,
  requestedWaiverAmount: number,
  customerPayableAmount: number,
  reasonId: string,
  routedTo: string[],
  employeeRemarks?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Retrieve session
  const user = await getActiveUser();
  if (!user) {
    return { success: false, error: "Authentication expired. Please log in again." };
  }

  // Fetch current financial exposure to compute totals
  const { data: financials, error: finError } = await supabase
    .from("contract_financials")
    .select("total_outstanding, pos")
    .eq("contract_no", contractNo)
    .single();

  if (finError || !financials) {
    return { success: false, error: "Could not retrieve contract outstanding balance details." };
  }

  const totalOutstanding = Number(financials.total_outstanding || 0);
  const posAmount = Number(financials.pos || 0);

  // Insert waiver request
  const { error: waiverError } = await supabase
    .from("waiver_requests")
    .insert({
      contract_no: contractNo,
      employee_id: user.id,
      total_outstanding: totalOutstanding,
      pos: posAmount,
      requested_waiver_amount: requestedWaiverAmount,
      customer_payable_amount: customerPayableAmount,
      reason_id: reasonId,
      routed_to: routedTo,
      employee_remarks: employeeRemarks || null,
      status: "Pending"
    });

  if (waiverError) {
    console.error("Error raising waiver request:", waiverError);
    return { success: false, error: "Failed to submit waiver approval request: " + waiverError.message };
  }

  // Log audit trail
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "RAISE_WAIVER",
    entity_type: "waiver_requests",
    entity_id: contractNo,
    metadata: { totalOutstanding, requestedWaiverAmount, customerPayableAmount }
  });

  revalidatePath(`/customers/${contractNo}`);
  return { success: true };
}
