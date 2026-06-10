"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface ImportRow {
  // Base fields
  contract_no: string;
  customer_name: string;
  product: string;
  branch: string;
  state: string;
  area: string;
  region: string;
  bom_dpd: number;
  mob?: number;
  bucket?: string;
  bom_bucket?: string;
  secured_category?: string;
  secured_product_flag?: string;
  product_detail?: string;
  allocation_category?: string;
  allocation_dpd_category?: string;

  // Contact fields
  mobile_1?: string;
  mobile_no?: string;
  primary_mobile?: string;
  primary_mobile_1?: string;
  primary_mobile_2?: string;
  mobile_no_2?: string;
  latest_contact_no?: string;
  ref_name_1?: string;
  ref_mobile_1?: string;
  ref_relation_1?: string;
  ref_name_2?: string;
  ref_mobile_2?: string;
  ref_relation_2?: string;
  base_address?: string;
  landmark?: string;
  pincode?: string;
  permanent_address?: string;
  office_address?: string;
  finnone_address?: string;
  master_primary_address?: string;
  permanent_address_2?: string;
  secondary_address?: string;
  office_address_2?: string;
  additional_address?: string;
  residential_address?: string;
  ref_full_address_1?: string;
  ref_full_address_2?: string;
  pdpr_address?: string;

  // Financial fields
  finance_amount?: number;
  total_pos_outstanding?: number;
  pos?: number;
  total_amount_collectable?: number;
  sale_price?: number;
  emi_amount?: number;
  od_amount?: number;
  principal_overdue?: number;
  interest_overdue?: number;
  bounce_charges?: number;
  current_odc?: number;
  total_outstanding?: number;
  ots_amount?: number;
  pos_waiver_amount?: number;
  pos_waiver_percent?: number;

  // Asset fields
  manufacturer?: string;
  asset_model?: string;
  rc_number?: string;
  manufacturer_2?: string;
  asset_category?: string;
  asset_variant?: string;
  engine_number?: string;
  chassis_number?: string;
  year_of_manufacture?: string;

  // Legal fields
  notice_sent_sec138?: string;
  type_of_case?: string;
  cheque_amount?: number;
  cheque_date?: string;
  cheque_no?: string;
  sec138_current_status?: string;
  group_stage?: string;
  case_no?: string;
  court_location?: string;
  court_name?: string;
  ldoh?: string;
  ndoh?: string;
  advocate?: string;
  hand_summons?: string;
  hand_warrant_1?: string;
  proclamation_orders?: string;
  lrn_status?: string;
  lrn_date?: string;
  arb?: string;
  sec17_orders_date?: string;
  award_date?: string;
  ep_stage?: string;
  ep_ldoh?: string;
  ep_ndoh?: string;
  ep_case_no?: string;
  ep_advocate?: string;
  termination_status_sa?: string;
  lrn_prn_status?: string;
  lrn_prn_issue_date?: string;
  lrn_prn_link?: string;
  cnr_number_cc?: string;
  cnr_number_pcr?: string;
  current_stage?: string;
  filed_location?: string;
  court_hall?: string;
  hand_s_nbw_bw_pc?: string;
  hand_s_nbw_bw_pc_type?: string;
  claim_amount?: number;
  arbitration_group_stage?: string;
  sec17_orders?: string;
  sec17_date?: string;
  court_bench?: string;
  ep_pdoh?: string;
  legal_status?: string;
}

export interface ImportSummary {
  batchId: string;
  filename: string;
  totalRows: number;
  imported: number;
  newContracts: number;
  updatedContracts: number;
  skippedDuplicates: number;
  failed: number;
  errors: any[];
}

// ---------------------------------------------------------------------------
// Safe date parser — handles Excel serials, DD/MM/YYYY, YYYY-MM-DD, etc.
// Returns null for any value it cannot confidently parse.
// ---------------------------------------------------------------------------
const parseDate = (val?: any): string | null => {
  if (val === undefined || val === null || val === "-") return null;
  const str = String(val).trim();
  if (!str || str.toUpperCase() === "N/A") return null;

  // Excel serial date number
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num > 0 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    const year = parseInt(dmMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }

  // Standard JS Date parse as last resort
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];

  return null; // Force null — never push unparseable strings to a DATE column
};

// ---------------------------------------------------------------------------
// Safe numeric parsers — strip currency symbols, commas, whitespace
// parseNum  → returns 0 on failure (for NOT NULL columns)
// parseNumOrNull → returns null on failure (for nullable columns)
// ---------------------------------------------------------------------------
const parseNum = (val?: any): number => {
  if (val === undefined || val === null || val === "" || val === "-" || String(val).toUpperCase() === "N/A") return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseNumOrNull = (val?: any): number | null => {
  if (val === undefined || val === null || val === "" || val === "-" || String(val).toUpperCase() === "N/A") return null;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
};

// ---------------------------------------------------------------------------
// commitImportBatch
// Upserts a chunk of rows into the 5 contract tables.
// Client handles chunking (1,000 rows/call). Server does one flat upsert.
// ---------------------------------------------------------------------------
export async function commitImportBatch(
  filename: string,
  rows: ImportRow[],
  existingBatchId?: string,
  grandTotalRows?: number   // Passed only on the first chunk to record real total
): Promise<ImportSummary> {
  const supabase = await createClient();
  const summary: ImportSummary = {
    batchId: existingBatchId || "",
    filename,
    totalRows: rows.length,
    imported: 0,
    newContracts: 0,
    updatedContracts: 0,
    skippedDuplicates: 0,
    failed: 0,
    errors: []
  };

  // 1. Resolve active session
  const user = await getActiveUser();
  const userId = user ? user.id : null;

  // 2. Create or retrieve the import batch record
  let batch: any = null;

  if (existingBatchId) {
    const { data, error } = await supabase
      .from("import_batches")
      .select("*")
      .eq("id", existingBatchId)
      .single();
    if (error || !data) throw new Error("Batch not found: " + error?.message);
    batch = data;
  } else {
    const { data, error } = await supabase
      .from("import_batches")
      .insert({
        filename,
        uploaded_by: userId,
        total_rows: grandTotalRows ?? rows.length, // Use real grand total if provided
        imported_count: 0,
        duplicates_skipped: 0,
        failed_count: 0
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error("Failed to initialize import log: " + error?.message);
    }
    batch = data;
    summary.batchId = batch.id;
  }

  // 3. Validate rows and deduplicate within this chunk
  const validRows: ImportRow[] = [];
  const errorRows: any[] = [];
  const skippedRows: any[] = [];
  const rowNumMap = new Map<string, number>();
  const processedInThisChunk = new Set<string>();

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1;

    if (!row.contract_no || !row.customer_name) {
      errorRows.push({
        batch_id: batch.id,
        row_number: rowNumber,
        raw_data: row as any,
        error_reason: "Missing required fields: Contract No and Customer Name are mandatory."
      });
    } else if (processedInThisChunk.has(row.contract_no)) {
      skippedRows.push({
        batch_id: batch.id,
        row_number: rowNumber,
        raw_data: row as any,
        error_reason: `File Duplicate: Contract [${row.contract_no}] appears multiple times in this sheet. Skipped.`
      });
      summary.skippedDuplicates++;
    } else {
      processedInThisChunk.add(row.contract_no);
      validRows.push(row);
      rowNumMap.set(row.contract_no, rowNumber);
    }
  });

  summary.failed += errorRows.length;

  // 4. Pre-count existing contracts to calculate new vs updated split
  if (validRows.length > 0) {
    const validContractNos = validRows.map(r => r.contract_no);
    let existingCount = 0;

    // Query in sub-chunks to avoid "URI too long" on large batches
    const COUNT_CHUNK = 200;
    for (let j = 0; j < validContractNos.length; j += COUNT_CHUNK) {
      const idSlice = validContractNos.slice(j, j + COUNT_CHUNK);
      const { count } = await supabase
        .from("contracts")
        .select("contract_no", { count: "exact", head: true })
        .in("contract_no", idSlice);
      existingCount += count || 0;
    }

    // 5. Build upsert payloads
    const contracts = validRows.map(row => ({
      contract_no: row.contract_no,
      customer_name: row.customer_name,
      product: row.product || "LAP",
      branch: row.branch || "Unknown",
      state: row.state || "Unknown",
      area: row.area || "Unknown",
      region: row.region || "Unknown",
      secured_category: row.secured_category || row.secured_product_flag || null,
      allocation_category: row.allocation_category || null,
      bom_dpd: parseNum(row.bom_dpd),
      mob: parseNum(row.mob),
      bucket: row.bucket || null,
      bom_bucket: row.bom_bucket || null,
      secured_product_flag: row.secured_product_flag || null,
      product_detail: row.product_detail || row.product || null,
      allocation_dpd_category: row.allocation_dpd_category || null,
      batch_id: batch.id,
      updated_at: new Date().toISOString()
    }));

    const contacts = validRows.map(row => ({
      contract_no: row.contract_no,
      mobile_1: row.mobile_1 || null,
      mobile_no: row.mobile_no || null,
      primary_mobile: row.primary_mobile || row.mobile_1 || null,
      primary_mobile_1: row.primary_mobile_1 || null,
      primary_mobile_2: row.primary_mobile_2 || null,
      mobile_no_2: row.mobile_no_2 || null,
      latest_contact_no: row.latest_contact_no || null,
      ref_name_1: row.ref_name_1 || null,
      ref_mobile_1: row.ref_mobile_1 || null,
      ref_relation_1: row.ref_relation_1 || null,
      ref_name_2: row.ref_name_2 || null,
      ref_mobile_2: row.ref_mobile_2 || null,
      ref_relation_2: row.ref_relation_2 || null,
      base_address: row.base_address || null,
      landmark: row.landmark || null,
      pincode: row.pincode || null,
      permanent_address: row.permanent_address || null,
      office_address: row.office_address || null,
      finnone_address: row.finnone_address || null,
      master_primary_address: row.master_primary_address || row.base_address || null,
      permanent_address_2: row.permanent_address_2 || null,
      secondary_address: row.secondary_address || null,
      office_address_2: row.office_address_2 || null,
      additional_address: row.additional_address || null,
      residential_address: row.residential_address || null,
      ref_full_address_1: row.ref_full_address_1 || null,
      ref_full_address_2: row.ref_full_address_2 || null,
      pdpr_address: row.pdpr_address || null,
      updated_at: new Date().toISOString()
    }));

    const assets = validRows.map(row => ({
      contract_no: row.contract_no,
      manufacturer: row.manufacturer || null,
      asset_model: row.asset_model || null,
      rc_number: row.rc_number || null,
      manufacturer_2: row.manufacturer_2 || null,
      asset_category: row.asset_category || null,
      asset_variant: row.asset_variant || null,
      engine_number: row.engine_number || null,
      chassis_number: row.chassis_number || null,
      year_of_manufacture: row.year_of_manufacture || null,
      updated_at: new Date().toISOString()
    }));

    const financials = validRows.map(row => ({
      contract_no: row.contract_no,
      finance_amount: parseNum(row.finance_amount),
      // Use ?? (nullish coalescing) so that a legitimate 0 is NOT overwritten by the fallback
      total_pos_outstanding: parseNum(row.total_pos_outstanding ?? row.pos),
      pos: parseNum(row.pos),
      total_amount_collectable: parseNum(row.total_amount_collectable),
      sale_price: parseNum(row.sale_price),
      emi_amount: parseNum(row.emi_amount),
      od_amount: parseNum(row.od_amount),
      principal_overdue: parseNum(row.principal_overdue),
      interest_overdue: parseNum(row.interest_overdue),
      bounce_charges: parseNum(row.bounce_charges),
      current_odc: parseNum(row.current_odc),
      total_outstanding: parseNum(row.total_outstanding ?? row.od_amount),
      ots_amount: parseNum(row.ots_amount),
      pos_waiver_amount: parseNum(row.pos_waiver_amount),
      pos_waiver_percent: parseNum(row.pos_waiver_percent),
      updated_at: new Date().toISOString()
    }));

    const legal = validRows.map(row => ({
      contract_no: row.contract_no,
      notice_sent_sec138: row.notice_sent_sec138 || null,
      type_of_case: row.type_of_case || null,
      cheque_amount: parseNumOrNull(row.cheque_amount),
      cheque_date: parseDate(row.cheque_date),
      cheque_no: row.cheque_no || null,
      sec138_current_status: row.sec138_current_status || null,
      group_stage: row.group_stage || null,
      case_no: row.case_no || null,
      court_location: row.court_location || null,
      court_name: row.court_name || null,
      ldoh: parseDate(row.ldoh),
      ndoh: parseDate(row.ndoh),
      advocate: row.advocate || null,
      hand_summons: row.hand_summons || null,
      hand_warrant_1: row.hand_warrant_1 || null,
      proclamation_orders: row.proclamation_orders || null,
      lrn_status: row.lrn_status || null,
      lrn_date: parseDate(row.lrn_date),
      arb: row.arb || null,
      sec17_orders_date: parseDate(row.sec17_orders_date),
      award_date: parseDate(row.award_date),
      ep_stage: row.ep_stage || null,
      ep_ldoh: parseDate(row.ep_ldoh),
      ep_ndoh: parseDate(row.ep_ndoh),
      ep_case_no: row.ep_case_no || null,
      ep_advocate: row.ep_advocate || null,
      termination_status_sa: row.termination_status_sa || null,
      lrn_prn_status: row.lrn_prn_status || null,
      lrn_prn_issue_date: parseDate(row.lrn_prn_issue_date),
      lrn_prn_link: row.lrn_prn_link || null,
      cnr_number_cc: row.cnr_number_cc || null,
      cnr_number_pcr: row.cnr_number_pcr || null,
      current_stage: row.current_stage || null,
      filed_location: row.filed_location || null,
      court_hall: row.court_hall || null,
      hand_s_nbw_bw_pc: row.hand_s_nbw_bw_pc || null,
      hand_s_nbw_bw_pc_type: row.hand_s_nbw_bw_pc_type || null,
      claim_amount: parseNumOrNull(row.claim_amount),
      arbitration_group_stage: row.arbitration_group_stage || null,
      sec17_orders: row.sec17_orders || null,
      sec17_date: parseDate(row.sec17_date),
      court_bench: row.court_bench || null,
      ep_pdoh: parseDate(row.ep_pdoh),
      legal_status: row.legal_status || null,
      updated_at: new Date().toISOString()
    }));

    // 6. Execute all upserts — contracts first (parent), then children in parallel
    try {
      const { error: contractErr } = await supabase
        .from("contracts")
        .upsert(contracts, { onConflict: "contract_no" });
      if (contractErr) throw new Error("Contracts upsert failed: " + contractErr.message);

      const [contactRes, assetRes, finRes, legalRes] = await Promise.all([
        supabase.from("contract_contacts").upsert(contacts, { onConflict: "contract_no" }),
        supabase.from("contract_assets").upsert(assets, { onConflict: "contract_no" }),
        supabase.from("contract_financials").upsert(financials, { onConflict: "contract_no" }),
        supabase.from("contract_legal").upsert(legal, { onConflict: "contract_no" })
      ]);

      if (contactRes.error) throw new Error("Contacts upsert failed: " + contactRes.error.message);
      if (assetRes.error) throw new Error("Assets upsert failed: " + assetRes.error.message);
      if (finRes.error) throw new Error("Financials upsert failed: " + finRes.error.message);
      if (legalRes.error) throw new Error("Legal upsert failed: " + legalRes.error.message);

      summary.imported += validRows.length;
      summary.updatedContracts += existingCount;
      summary.newContracts += validRows.length - existingCount;

    } catch (err: any) {
      console.error("Batch upsert failed:", err.message);
      summary.failed += validRows.length;

      errorRows.push(...validRows.map(row => ({
        batch_id: batch.id,
        row_number: rowNumMap.get(row.contract_no),
        raw_data: row as any,
        error_reason: "Upsert error: " + err.message
      })));
    }
  }

  // 7. Persist error and skip logs
  const allErrors = [...errorRows, ...skippedRows];
  if (allErrors.length > 0) {
    await supabase.from("import_errors").insert(allErrors);
  }

  // 8. Update batch running totals
  await supabase
    .from("import_batches")
    .update({
      imported_count: (batch.imported_count || 0) + summary.imported,
      duplicates_skipped: (batch.duplicates_skipped || 0) + summary.skippedDuplicates,
      failed_count: (batch.failed_count || 0) + summary.failed
    })
    .eq("id", batch.id);

  // 9. Fetch error list for this batch to return to client
  const { data: errorsList } = await supabase
    .from("import_errors")
    .select("row_number, error_reason")
    .eq("batch_id", batch.id)
    .order("row_number", { ascending: true })
    .limit(500); // Cap at 500 for response size

  summary.errors = errorsList || [];

  // 10. Compliance audit log
  if (userId) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "EXCEL_IMPORT",
      entity_type: "import_batches",
      entity_id: batch.id,
      metadata: {
        filename,
        imported: summary.imported,
        newContracts: summary.newContracts,
        updatedContracts: summary.updatedContracts,
        skipped: summary.skippedDuplicates,
        failed: summary.failed
      }
    });
  }

  revalidatePath("/");
  return summary;
}
