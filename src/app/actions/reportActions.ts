"use server";

import { createClient } from "@/utils/supabase/server";
import { getVisibilityScope, type VisibilityScope } from "@/utils/scope";

export type ReportScope = {
  role: string;
  scopeLabel: string;
  hasSubordinates: boolean;
  subordinateCount: number;
};

function toReportScope(scope: VisibilityScope): ReportScope {
  return {
    role: scope.role,
    scopeLabel: scope.scopeLabel,
    hasSubordinates: scope.employeeIds === null || scope.subordinateCount > 0,
    subordinateCount: scope.subordinateCount,
  };
}

/**
 * Resolves the current user's report scope — who they can see data for.
 */
export async function getReportScope(): Promise<ReportScope> {
  return toReportScope(await getVisibilityScope());
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
  const visibility = await getVisibilityScope();
  const scope = toReportScope(visibility);

  if (!visibility.userId) {
    return { data: [], scope };
  }

  // Employee ids this user can see (null = everyone, for Admin)
  const scopedEmployeeIds = visibility.employeeIds;

  // 1. Build query
  let query = supabase
    .from("dispositions")
    .select(`
      contract_no,
      employee_id,
      main_disposition:main_dispositions!inner(name),
      sub_disposition:sub_dispositions!inner(name),
      dynamic_data,
      remarks,
      created_at,
      contracts!inner(
        customer_name,
        contract_financials(pos, total_outstanding),
        contract_contacts(mobile_1, primary_mobile_1, primary_mobile_2, ref_mobile_1, ref_mobile_2)
      ),
      employee_profile:profiles!dispositions_employee_id_fkey(full_name, role)
    `);

  // 2. Apply report type filter
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
      return { data: [], scope: { ...scope, scopeLabel: "Unknown report" } };
  }

  // 3. Apply role scope filter
  if (scopedEmployeeIds !== null) {
    query = query.in("employee_id", scopedEmployeeIds);
  }

  // 4. Apply date range filters
  if (dateFrom) {
    query = query.gte("created_at", new Date(dateFrom).toISOString());
  }
  if (dateTo) {
    // Include the entire end date by setting to end-of-day
    const endOfDay = new Date(dateTo);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  // 5. Order by latest first
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching scoped report data:", error);
    throw new Error("Failed to compile report data: " + error.message);
  }

  // 6. Transform to flat export rows
  const rows = (data || []).map((row: any) => {
    const contract = Array.isArray(row.contracts) ? row.contracts[0] : (row.contracts || {});
    const financials = Array.isArray(contract.contract_financials)
      ? contract.contract_financials[0]
      : (contract.contract_financials || {});
    const contacts = Array.isArray(contract.contract_contacts)
      ? contract.contract_contacts[0] || {}
      : (contract.contract_contacts || {});
    const phone = (v: any) => (v === null || v === undefined || v === "" ? "-" : String(v));
    const employeeRaw = row.employee_profile;
    const employee = Array.isArray(employeeRaw) ? employeeRaw[0] : (employeeRaw || {});

    let amount = "-";
    const ptpAmt = row.dynamic_data?.ptp_amount;
    const paidAmt = row.dynamic_data?.paid_amount;
    if (ptpAmt) amount = ptpAmt.toString();
    else if (paidAmt) amount = paidAmt.toString();

    let dateValue = "-";
    const ptpDate = row.dynamic_data?.ptp_date;
    const paymentDate = row.dynamic_data?.payment_date;
    const rawDate = ptpDate || paymentDate;
    if (rawDate) {
      if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [year, month, day] = rawDate.split("-");
        dateValue = `${day}/${month}/${year}`;
      } else {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          dateValue = d.toLocaleDateString("en-GB");
        } else {
          dateValue = String(rawDate);
        }
      }
    }

    return {
      "Contract No": row.contract_no,
      "Customer Name": contract.customer_name || "-",
      "Mobile 1": phone(contacts.mobile_1),
      "Primary Mobile 1": phone(contacts.primary_mobile_1),
      "Primary Mobile 2": phone(contacts.primary_mobile_2),
      "Reference Mobile 1": phone(contacts.ref_mobile_1),
      "Reference Mobile 2": phone(contacts.ref_mobile_2),
      "Employee Name": employee.full_name || "System",
      "Employee Role": employee.role || "-",
      "Date Logged": row.created_at,
      "Main Disposition": row.main_disposition?.name || "-",
      "Sub Disposition": row.sub_disposition?.name || "-",
      "PTP/Payment Date": dateValue,
      "PTP/Paid Amount": amount,
      "Principal POS": financials.pos != null ? Number(financials.pos).toLocaleString("en-IN") : "-",
      "Total Outstanding": financials.total_outstanding != null ? Number(financials.total_outstanding).toLocaleString("en-IN") : "-",
      "Remarks": row.remarks || "-",
    };
  });

  return { data: rows, scope };
}
