"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Fetch raw records for spreadsheet compilation.
 */
export async function getReportData(reportType: string): Promise<any[]> {
  const supabase = await createClient();

  // Base query for all disposition reports
  let query = supabase
    .from("dispositions")
    .select(`
      contract_no,
      main_disposition:main_dispositions!inner(name),
      sub_disposition:sub_dispositions!inner(name),
      dynamic_data,
      remarks,
      created_at,
      contracts(customer_name),
      employee_profile:profiles(full_name)
    `);

  switch (reportType) {
    case "all_dispositions":
      // No filter, fetch everything
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
      return [];
  }

  // Order by latest first
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching report data:", error);
    throw new Error("Failed to compile report data.");
  }

  return (data || []).map((row: any) => {
    const contracts = Array.isArray(row.contracts) ? row.contracts[0] : (row.contracts || {});
    const employeeRaw = row.employee_profile;
    const employee = Array.isArray(employeeRaw) ? employeeRaw[0] : (employeeRaw || {});
    
    // Some reports use ptp_amount, some use paid_amount
    let amount = "-";
    const ptpAmt = row.dynamic_data?.ptp_amount;
    const paidAmt = row.dynamic_data?.paid_amount;
    if (ptpAmt) amount = ptpAmt.toString();
    else if (paidAmt) amount = paidAmt.toString();

    return {
      "Contract No": row.contract_no,
      "Customer Name": contracts.customer_name || "-",
      "Employee Name": employee.full_name || "System",
      "Date Logged": new Date(row.created_at).toLocaleString(),
      "Main Disposition": row.main_disposition?.name || "-",
      "Sub Disposition": row.sub_disposition?.name || "-",
      "PTP/Paid Amount": amount,
      "Remarks": row.remarks || "-"
    };
  });
}
