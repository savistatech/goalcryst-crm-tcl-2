"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";

export type ReportScope = {
  role: string;
  scopeLabel: string;
  hasSubordinates: boolean;
  subordinateCount: number;
};

/**
 * Recursively walks the reporting_to tree downward from a given userId
 * and returns all subordinate profile IDs (not including the user themselves).
 */
async function getSubordinateIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  // Fetch ALL profiles with their reporting_to in one query
  const { data: allProfiles, error } = await supabase
    .from("profiles")
    .select("id, reporting_to")
    .eq("is_active", true);

  if (error || !allProfiles) return [];

  // Build adjacency list: parent → children[]
  const childrenMap = new Map<string, string[]>();
  for (const p of allProfiles) {
    if (p.reporting_to) {
      const existing = childrenMap.get(p.reporting_to) || [];
      existing.push(p.id);
      childrenMap.set(p.reporting_to, existing);
    }
  }

  // BFS/DFS to collect all descendants
  const result: string[] = [];
  const queue = [userId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      result.push(childId);
      queue.push(childId);
    }
  }

  return result;
}

/**
 * Resolves the current user's report scope — who they can see data for.
 */
export async function getReportScope(): Promise<ReportScope> {
  const supabase = await createClient();
  const user = await getActiveUser();

  if (!user) {
    return { role: "Unknown", scopeLabel: "Unauthenticated", hasSubordinates: false, subordinateCount: 0 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "Employee";

  if (role === "Admin") {
    return { role, scopeLabel: "All employees — Full portfolio access", hasSubordinates: true, subordinateCount: -1 };
  }

  const subIds = await getSubordinateIds(user.id);

  const scopeLabels: Record<string, string> = {
    "Branch Manager": "Your branch team + subordinates",
    "Assistant Manager": "Your assigned teams + subordinates",
    "Team Leader": "Your direct team members",
    "Employee": "Your own dispositions only",
  };

  return {
    role,
    scopeLabel: scopeLabels[role] || "Your own dispositions only",
    hasSubordinates: subIds.length > 0,
    subordinateCount: subIds.length,
  };
}

/**
 * Fetches scoped report data based on the current user's role and org hierarchy.
 * Enriched with contract financials (POS + Total Outstanding).
 */
export async function getScopedReportData(
  reportType: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ data: any[]; scope: ReportScope }> {
  const supabase = await createClient();
  const user = await getActiveUser();

  if (!user) {
    return { data: [], scope: { role: "Unknown", scopeLabel: "Unauthenticated", hasSubordinates: false, subordinateCount: 0 } };
  }

  // 1. Get user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "Employee";

  // 2. Determine which employee_ids this user can see
  let scopedEmployeeIds: string[] | null = null; // null = no filter (Admin)

  if (role === "Admin") {
    scopedEmployeeIds = null; // See everything
  } else if (role === "Employee") {
    scopedEmployeeIds = [user.id]; // Only self
  } else {
    // TL, AM, BM — self + subordinates
    const subIds = await getSubordinateIds(user.id);
    scopedEmployeeIds = [user.id, ...subIds];
  }

  // 3. Build query
  let query = supabase
    .from("dispositions")
    .select(`
      contract_no,
      employee_id,
      main_disposition:main_dispositions!inner(name),
      sub_disposition:sub_dispositions!inner(name),
      dynamic_data,
      remarks,
      ptp_date,
      ptp_amount,
      paid_amount,
      payment_date,
      created_at,
      contracts!inner(
        customer_name,
        contract_financials(pos, total_outstanding)
      ),
      employee_profile:profiles!dispositions_employee_id_fkey(full_name, role)
    `);

  // 4. Apply report type filter
  switch (reportType) {
    case "all_dispositions":
      break;
    case "ptp":
      query = query.eq("sub_dispositions.name", "Promise to Pay");
      break;
    case "agree_to_pay":
      query = query.eq("sub_dispositions.name", "Agree to Pay");
      break;
    case "broken_ptp":
      query = query.eq("sub_dispositions.name", "Broken PTP");
      break;
    case "part_paid":
      query = query.eq("sub_dispositions.name", "Part Paid");
      break;
    case "contactable":
      query = query.eq("main_dispositions.name", "Contactable");
      break;
    case "non_contactable":
      query = query.eq("main_dispositions.name", "Non-Contactable");
      break;
    default:
      return { data: [], scope: { role, scopeLabel: "Unknown report", hasSubordinates: false, subordinateCount: 0 } };
  }

  // 5. Apply role scope filter
  if (scopedEmployeeIds !== null) {
    query = query.in("employee_id", scopedEmployeeIds);
  }

  // 6. Apply date range filters
  if (dateFrom) {
    query = query.gte("created_at", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    // Include the entire end date by setting to end-of-day
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  // 7. Order by latest first
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching scoped report data:", error);
    throw new Error("Failed to compile report data: " + error.message);
  }

  // 8. Build scope info
  const subIds = role !== "Admin" && role !== "Employee" ? await getSubordinateIds(user.id) : [];
  const scope: ReportScope = {
    role,
    scopeLabel: role === "Admin"
      ? "All employees — Full portfolio access"
      : role === "Employee"
        ? "Your own dispositions only"
        : `Your team (${subIds.length} subordinate${subIds.length !== 1 ? "s" : ""})`,
    hasSubordinates: role === "Admin" || role === "Employee" || subIds.length > 0,
    subordinateCount: role === "Admin" ? -1 : subIds.length,
  };

  // 9. Transform to flat export rows
  const rows = (data || []).map((row: any) => {
    const contract = Array.isArray(row.contracts) ? row.contracts[0] : (row.contracts || {});
    const financials = Array.isArray(contract.contract_financials)
      ? contract.contract_financials[0]
      : (contract.contract_financials || {});
    const employeeRaw = row.employee_profile;
    const employee = Array.isArray(employeeRaw) ? employeeRaw[0] : (employeeRaw || {});

    let amount = "-";
    const ptpAmt = row.ptp_amount || row.dynamic_data?.ptp_amount;
    const paidAmt = row.paid_amount || row.dynamic_data?.paid_amount;
    if (ptpAmt) amount = ptpAmt.toString();
    else if (paidAmt) amount = paidAmt.toString();

    return {
      "Contract No": row.contract_no,
      "Customer Name": contract.customer_name || "-",
      "Employee Name": employee.full_name || "System",
      "Employee Role": employee.role || "-",
      "Date Logged": new Date(row.created_at).toLocaleString("en-IN"),
      "Main Disposition": row.main_disposition?.name || "-",
      "Sub Disposition": row.sub_disposition?.name || "-",
      "PTP Date": row.ptp_date || "-",
      "PTP/Paid Amount": amount,
      "Principal POS": financials.pos != null ? Number(financials.pos).toLocaleString("en-IN") : "-",
      "Total Outstanding": financials.total_outstanding != null ? Number(financials.total_outstanding).toLocaleString("en-IN") : "-",
      "Remarks": row.remarks || "-",
    };
  });

  return { data: rows, scope };
}
