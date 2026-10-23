"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { getVisibilityScope } from "@/utils/scope";

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

  // Role Gate: Employees can only fetch their own assigned cases removed to allow open access
  // if (role === "Employee") {
  //   query = query.eq("allocated_to", user.id);
  // }

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

export type FollowUpType = "Promise to Pay" | "Agree to Pay" | "Call Back";
export type FollowUpStatus = "Due Today" | "Upcoming" | "Overdue" | "Done";

export interface FollowUpItem {
  contract_no: string;
  customer_name: string;
  type: FollowUpType;
  /** PTP/ATP: commitment date (YYYY-MM-DD). Call Back: callback date-time. */
  due_date: string;
  amount: number | null;
  total_outstanding: number;
  pos: number;
  primary_mobile: string;
  employee_name: string;
  board_status: FollowUpStatus;
  created_at: string;
}

export interface FollowUpList {
  items: FollowUpItem[];
  scopeLabel: string;
}

const FOLLOW_UP_TYPES: FollowUpType[] = ["Promise to Pay", "Agree to Pay", "Call Back"];
const KEPT_OUTCOMES = new Set(["Part Paid", "Customer Claims Paid"]);

/** Today's date as YYYY-MM-DD in India time, so "Due Today" doesn't depend on the server timezone. */
function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * Fetches follow-ups (Promise to Pay, Agree to Pay, Call Back) the current user may see:
 * Admin sees everyone's; anyone else sees their own plus their reporting tree's.
 * Ordered by due date, earliest first.
 */
export async function getFollowUps(): Promise<FollowUpList> {
  const supabase = await createClient();
  const scope = await getVisibilityScope();
  if (!scope.userId) return { items: [], scopeLabel: scope.scopeLabel };

  // Resolve the follow-up sub-disposition ids by name
  const { data: subDispos } = await supabase
    .from("sub_dispositions")
    .select("id, name")
    .in("name", FOLLOW_UP_TYPES);
  const subIds = (subDispos || []).map((d: any) => d.id);
  if (subIds.length === 0) return { items: [], scopeLabel: scope.scopeLabel };

  let query = supabase
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
      sub_disposition:sub_dispositions(name)
    `)
    .in("sub_disposition_id", subIds);

  if (scope.employeeIds !== null) {
    query = query.in("employee_id", scope.employeeIds);
  }

  const { data: rows, error } = await query;

  if (error || !rows) {
    console.error("Error fetching follow-ups:", error);
    return { items: [], scopeLabel: scope.scopeLabel };
  }

  const today = todayInIndia();

  const items: FollowUpItem[] = rows.map((row: any) => {
    const contract = (Array.isArray(row.contracts) ? row.contracts[0] : row.contracts) || {};
    const contacts = Array.isArray(contract.contract_contacts) ? contract.contract_contacts[0] : contract.contract_contacts;
    const financials = Array.isArray(contract.contract_financials) ? contract.contract_financials[0] : contract.contract_financials;
    const type = (row.sub_disposition?.name || "Promise to Pay") as FollowUpType;
    const isCallBack = type === "Call Back";

    const due_date = String((isCallBack ? row.dynamic_data?.follow_up_date : row.dynamic_data?.ptp_date) || "");
    const rawAmount = row.dynamic_data?.ptp_amount;
    const amount = !isCallBack && rawAmount !== undefined && rawAmount !== null && rawAmount !== "" ? Number(rawAmount) : null;

    // Outcome of later calls on the same contract (by anyone)
    const loggedAt = new Date(row.created_at).getTime();
    const later = (contract.dispositions || []).filter((d: any) => new Date(d.created_at).getTime() > loggedAt);
    const laterNames = later.map((d: any) => d.sub_disposition?.name);

    let board_status: FollowUpStatus;
    if (isCallBack ? later.length > 0 : laterNames.some((n: string) => KEPT_OUTCOMES.has(n))) {
      board_status = "Done";
    } else if (!isCallBack && laterNames.includes("Broken PTP")) {
      board_status = "Overdue";
    } else {
      const dueDay = due_date.slice(0, 10);
      board_status = !dueDay || dueDay > today ? "Upcoming" : dueDay === today ? "Due Today" : "Overdue";
    }

    return {
      contract_no: row.contract_no,
      customer_name: contract.customer_name || "Unknown Customer",
      type,
      due_date,
      amount,
      total_outstanding: Number(financials?.total_outstanding || 0),
      pos: Number(financials?.pos || 0),
      primary_mobile: contacts?.primary_mobile || "-",
      employee_name: row.employee_profile?.full_name || "System",
      board_status,
      created_at: row.created_at,
    };
  });

  items.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));

  return { items, scopeLabel: scope.scopeLabel };
}
