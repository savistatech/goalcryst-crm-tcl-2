"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";

export interface QueueItem {
  contract_no: string;
  customer_name: string;
  product: string;
  branch: string;
  bom_dpd: number;
  total_outstanding: number;
  primary_mobile: string;
  last_call_date: string | null;
  last_call_outcome: string | null;
}

export interface QueueSummary {
  items: QueueItem[];
  totalAllocated: number;
  contactedToday: number;
  ptpObtained: number;
  pendingCalls: number;
}

/**
 * Resolves and fetches the prioritized calling queue for the logged-in operator.
 * Enforces role access limits: Agents only get their allocated portfolios.
 */
export async function getCallingQueue(): Promise<QueueSummary> {
  const supabase = await createClient();

  // 1. Resolve logged-in operator session
  const user = await getActiveUser();
  if (!user) {
    return { items: [], totalAllocated: 0, contactedToday: 0, ptpObtained: 0, pendingCalls: 0 };
  }

  // 2. Fetch operator role profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile ? profile.role : "Agent";

  // 3. Query contracts
  let query = supabase
    .from("contracts")
    .select(`
      contract_no,
      customer_name,
      product,
      branch,
      bom_dpd,
      allocated_to,
      contract_contacts(primary_mobile, mobile_1),
      contract_financials(total_outstanding),
      dispositions(created_at, sub_disposition)
    `);

  // Role Gate: Agents can only fetch their own assigned cases
  if (role === "Agent") {
    query = query.eq("allocated_to", user.id);
  }

  const { data: contractsList, error: contractsError } = await query;

  if (contractsError || !contractsList) {
    console.error("Error fetching queue contracts list:", contractsError);
    return { items: [], totalAllocated: 0, contactedToday: 0, ptpObtained: 0, pendingCalls: 0 };
  }

  // 4. Formatter and prioritization sorting
  const items: QueueItem[] = contractsList.map((row: any) => {
    // Get contacts
    const primary_mobile = row.contract_contacts?.primary_mobile || row.contract_contacts?.mobile_1 || "-";
    const total_outstanding = Number(row.contract_financials?.total_outstanding || 0);

    // Get latest call outcome by sorting dispositions locally
    const rowDispos = row.dispositions || [];
    let last_call_date: string | null = null;
    let last_call_outcome: string | null = null;

    if (rowDispos.length > 0) {
      // Sort newest first
      rowDispos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      last_call_date = rowDispos[0].created_at;
      last_call_outcome = rowDispos[0].sub_disposition;
    }

    return {
      contract_no: row.contract_no,
      customer_name: row.customer_name,
      product: row.product,
      branch: row.branch,
      bom_dpd: Number(row.bom_dpd || 0),
      total_outstanding,
      primary_mobile,
      last_call_date,
      last_call_outcome
    };
  });

  // Prioritization: Sort by BOM DPD DESC (highest overdue first), then oldest/never contacted
  items.sort((a, b) => {
    if (b.bom_dpd !== a.bom_dpd) return b.bom_dpd - a.bom_dpd;
    
    // Sort never contacted first
    if (!a.last_call_date && b.last_call_date) return -1;
    if (a.last_call_date && !b.last_call_date) return 1;
    if (a.last_call_date && b.last_call_date) {
      return new Date(a.last_call_date).getTime() - new Date(b.last_call_date).getTime();
    }
    return 0;
  });

  // Calculate quick metrics counters
  const totalAllocated = items.length;
  let contactedToday = 0;
  let ptpObtained = 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  items.forEach(item => {
    if (item.last_call_date) {
      const callTime = new Date(item.last_call_date);
      if (callTime >= startOfToday) {
        contactedToday++;
        if (item.last_call_outcome === "Promise to Pay") {
          ptpObtained++;
        }
      }
    }
  });

  const pendingCalls = totalAllocated - contactedToday;

  return {
    items,
    totalAllocated,
    contactedToday,
    ptpObtained,
    pendingCalls
  };
}

export interface PtpItem {
  contract_no: string;
  customer_name: string;
  ptp_date: string;
  ptp_amount: number;
  total_outstanding: number;
  primary_mobile: string;
  agent_name: string;
}

/**
 * Fetches all Promise-To-Pay (PTP) schedules ordered by payment commitment date.
 */
export async function getPtpSchedules(): Promise<PtpItem[]> {
  const supabase = await createClient();

  // Resolve user session
  const user = await getActiveUser();
  if (!user) return [];

  // Query dispositions with PTP details
  const { data: ptpList, error } = await supabase
    .from("dispositions")
    .select(`
      contract_no,
      ptp_date,
      ptp_amount,
      contracts(
        customer_name,
        contract_contacts(primary_mobile),
        contract_financials(total_outstanding)
      ),
      agent_profile:profiles(full_name)
    `)
    .not("ptp_date", "is", null)
    .order("ptp_date", { ascending: true });

  if (error || !ptpList) {
    console.error("Error fetching PTP schedules:", error);
    return [];
  }

  return ptpList.map((row: any) => {
    const contracts = row.contracts || {};
    const primary_mobile = contracts.contract_contacts?.primary_mobile || "-";
    const total_outstanding = Number(contracts.contract_financials?.total_outstanding || 0);

    return {
      contract_no: row.contract_no,
      customer_name: contracts.customer_name || "Unknown Customer",
      ptp_date: row.ptp_date,
      ptp_amount: Number(row.ptp_amount || 0),
      total_outstanding,
      primary_mobile,
      agent_name: row.agent_profile?.full_name || "System"
    };
  });
}
