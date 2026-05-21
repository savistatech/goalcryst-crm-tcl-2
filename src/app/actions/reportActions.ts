"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Fetch raw records for spreadsheet compilation.
 */
export async function getReportData(reportType: string): Promise<any[]> {
  const supabase = await createClient();

  switch (reportType) {
    case "portfolio_allocation": {
      const { data } = await supabase
        .from("contracts")
        .select(`
          contract_no,
          customer_name,
          product,
          branch,
          state,
          bom_dpd,
          contract_financials(total_outstanding)
        `);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Customer Name": row.customer_name,
        "Product": row.product,
        "Branch": row.branch,
        "State": row.state,
        "BOM DPD": row.bom_dpd,
        "Total Outstanding": Number(row.contract_financials?.total_outstanding || 0)
      }));
    }

    case "dial_log": {
      const { data } = await supabase
        .from("dispositions")
        .select(`
          contract_no,
          main_disposition,
          sub_disposition,
          remarks,
          created_at,
          agent_profile:profiles(full_name)
        `);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Date Logged": new Date(row.created_at).toLocaleString(),
        "Agent Name": row.agent_profile?.full_name || "System Agent",
        "Calling Outcome": row.main_disposition,
        "Sub Category": row.sub_disposition,
        "Remarks": row.remarks || ""
      }));
    }

    case "ptp_conversion": {
      const { data } = await supabase
        .from("dispositions")
        .select(`
          contract_no,
          ptp_date,
          ptp_amount,
          created_at,
          agent_profile:profiles(full_name)
        `)
        .not("ptp_date", "is", null);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Date Scheduled": new Date(row.created_at).toLocaleDateString(),
        "Promise Date": row.ptp_date,
        "Promise Amount": Number(row.ptp_amount || 0),
        "Agent Name": row.agent_profile?.full_name || "System Agent"
      }));
    }

    case "mtd_collection": {
      const { data } = await supabase
        .from("dispositions")
        .select(`
          contract_no,
          paid_amount,
          payment_date,
          proof_reference,
          agent_profile:profiles(full_name)
        `)
        .not("paid_amount", "is", null);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Payment Date": row.payment_date,
        "Collected Amount": Number(row.paid_amount || 0),
        "UTR / Receipt Reference": row.proof_reference || "-",
        "Agent Name": row.agent_profile?.full_name || "System Agent"
      }));
    }

    case "waiver_requests": {
      const { data } = await supabase
        .from("waiver_requests")
        .select(`
          contract_no,
          total_outstanding,
          requested_waiver_amount,
          customer_payable_amount,
          reason,
          status,
          created_at,
          agent_profile:profiles(full_name)
        `);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Date Raised": new Date(row.created_at).toLocaleDateString(),
        "Total Outstanding": Number(row.total_outstanding || 0),
        "Waiver Requested": Number(row.requested_waiver_amount || 0),
        "Final Customer Payable": Number(row.customer_payable_amount || 0),
        "Waiver Reason": row.reason,
        "Status": row.status,
        "Agent Name": row.agent_profile?.full_name || "System Agent"
      }));
    }

    case "legal_sec138": {
      const { data } = await supabase
        .from("contract_legal")
        .select(`
          contract_no,
          case_no,
          cheque_no,
          cheque_amount,
          court_name,
          court_location,
          advocate,
          legal_status
        `)
        .not("case_no", "is", null);
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Case Number": row.case_no,
        "Cheque No": row.cheque_no || "-",
        "Cheque Amount": Number(row.cheque_amount || 0),
        "Court Name": row.court_name || "-",
        "Court Location": row.court_location || "-",
        "Advocate In-charge": row.advocate || "-",
        "Legal Status": row.legal_status || "-"
      }));
    }

    case "audit_logs": {
      const { data } = await supabase
        .from("audit_logs")
        .select(`
          created_at,
          action,
          entity_type,
          entity_id,
          metadata,
          operator_profile:profiles(full_name)
        `);
      return (data || []).map((row: any) => ({
        "Timestamp": new Date(row.created_at).toLocaleString(),
        "Operator": row.operator_profile?.full_name || "System Automated",
        "Action Event": row.action,
        "Entity Reference": `${row.entity_type || ""}:${row.entity_id || ""}`,
        "Metadata Details": JSON.stringify(row.metadata || {})
      }));
    }

    default: {
      // Fallback returning contracts allocation list
      const { data } = await supabase.from("contracts").select("contract_no, customer_name, product, branch");
      return (data || []).map((row: any) => ({
        "Contract No": row.contract_no,
        "Customer Name": row.customer_name,
        "Product": row.product,
        "Branch": row.branch
      }));
    }
  }
}
