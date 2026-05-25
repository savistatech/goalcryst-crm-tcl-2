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
      main_disposition,
      sub_disposition,
      ptp_amount,
      paid_amount,
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
      query = query.eq("sub_disposition", "Promise to Pay");
      break;

    case "agree_to_pay":
      query = query.eq("sub_disposition", "Agree to Pay");
      break;

    case "broken_ptp":
      query = query.eq("sub_disposition", "Broken PTP");
      break;

    case "part_paid":
      query = query.eq("sub_disposition", "Part Paid");
      break;

    case "contactable":
      query = query.eq("main_disposition", "Contactable");
      break;

    case "non_contactable":
      query = query.eq("main_disposition", "Non-Contactable");
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
    if (row.ptp_amount) amount = row.ptp_amount.toString();
    else if (row.paid_amount) amount = row.paid_amount.toString();

    return {
      "Contract No": row.contract_no,
      "Customer Name": contracts.customer_name || "-",
      "Employee Name": employee.full_name || "System",
      "Date Logged": new Date(row.created_at).toLocaleString(),
      "Main Disposition": row.main_disposition || "-",
      "Sub Disposition": row.sub_disposition || "-",
      "PTP/Paid Amount": amount,
      "Remarks": row.remarks || "-"
    };
  });
}
