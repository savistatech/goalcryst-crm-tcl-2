"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";

export interface QueueItem {
  contract_no: string;
  customer_name: string;
  product: string;
  branch: string;
  bom_dpd: number;
  total_outstanding: number;
  pos: number;
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
 * Enforces role access limits: Employees only get their allocated portfolios.
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

  const role = profile ? profile.role : "Employee";

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
      contract_financials(total_outstanding, pos),
      dispositions(created_at, sub_disposition:sub_dispositions(name))
    `)
    .eq("is_archived", false);

  // Role Gate: Employees can only fetch their own assigned cases
  if (role === "Employee") {
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
    const pos = Number(row.contract_financials?.pos || 0);

    // Get latest call outcome by sorting dispositions locally
    const rowDispos = row.dispositions || [];
    let last_call_date: string | null = null;
    let last_call_outcome: string | null = null;

    if (rowDispos.length > 0) {
      // Sort newest first
      rowDispos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      last_call_date = rowDispos[0].created_at;
      last_call_outcome = rowDispos[0].sub_disposition?.name;
    }

    return {
      contract_no: row.contract_no,
      customer_name: row.customer_name,
      product: row.product,
      branch: row.branch,
      bom_dpd: Number(row.bom_dpd || 0),
      total_outstanding,
      pos,
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
  pos: number;
  primary_mobile: string;
  employee_name: string;
  board_status: "Due Today" | "Upcoming" | "Broken" | "Kept";
  created_at: string;
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
      created_at,
      dynamic_data,
      contracts(
        customer_name,
        contract_contacts(primary_mobile),
        contract_financials(total_outstanding, pos),
        dispositions(
          created_at,
          sub_disposition:sub_dispositions(name)
        )
      ),
      employee_profile:profiles(full_name),
      sub_disposition:sub_dispositions!inner(name)
    `)
    .eq("sub_dispositions.name", "Promise to Pay");

  if (error || !ptpList) {
    console.error("Error fetching PTP schedules:", error);
    return [];
  }

  return ptpList.map((row: any) => {
    const contracts = row.contracts || {};
    const primary_mobile = contracts.contract_contacts?.primary_mobile || "-";
    const total_outstanding = Number(contracts.contract_financials?.total_outstanding || 0);
    const pos = Number(contracts.contract_financials?.pos || 0);

    const ptpDate = row.dynamic_data?.ptp_date || "";
    const ptpAmt = row.dynamic_data?.ptp_amount || 0;

    // Calculate Board Status
    const allDispositions = contracts.dispositions || [];
    const ptpCreatedAt = new Date(row.created_at);
    
    let hasKept = false;
    let hasBroken = false;

    for (const d of allDispositions) {
      const dDate = new Date(d.created_at);
      if (dDate > ptpCreatedAt) {
        const subName = d.sub_disposition?.name;
        if (subName === "Part Paid" || subName === "Customer Claims Paid") {
          hasKept = true;
        } else if (subName === "Broken PTP") {
          hasBroken = true;
        }
      }
    }

    let board_status: "Due Today" | "Upcoming" | "Broken" | "Kept" = "Upcoming";

    if (hasKept) {
      board_status = "Kept";
    } else if (hasBroken) {
      board_status = "Broken";
    } else if (ptpDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pDate = new Date(ptpDate);
      pDate.setHours(0, 0, 0, 0);

      if (pDate.getTime() === today.getTime()) {
        board_status = "Due Today";
      } else if (pDate.getTime() < today.getTime()) {
        board_status = "Broken";
      } else {
        board_status = "Upcoming";
      }
    }

    return {
      contract_no: row.contract_no,
      customer_name: contracts.customer_name || "Unknown Customer",
      ptp_date: ptpDate,
      ptp_amount: Number(ptpAmt),
      total_outstanding,
      pos,
      primary_mobile,
      employee_name: row.employee_profile?.full_name || "System",
      board_status,
      created_at: row.created_at
    };
  });
}
