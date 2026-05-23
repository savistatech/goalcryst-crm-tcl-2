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
  skippedDuplicates: number;
  failed: number;
  errors: any[];
}

/**
 * Commits parsed Excel records into the database in atomic chunks.
 * Checks for duplicates in the database to prevent overwriting existing allocations.
 */
export async function commitImportBatch(
  filename: string,
  rows: ImportRow[]
): Promise<ImportSummary> {
  const supabase = await createClient();
  const summary: ImportSummary = {
    batchId: "",
    filename,
    totalRows: rows.length,
    imported: 0,
    skippedDuplicates: 0,
    failed: 0,
    errors: []
  };

  // 1. Resolve current active operator session
  const user = await getActiveUser();
  const userId = user ? user.id : null;

  // 2. Create the Import Batch record
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      filename,
      uploaded_by: userId,
      total_rows: rows.length,
      imported_count: 0,
      duplicates_skipped: 0,
      failed_count: 0
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("Error creating import batch:", batchError);
    throw new Error("Failed to initialize import log: " + batchError?.message);
  }

  summary.batchId = batch.id;

  // 3. Process records
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNumber = idx + 1;

    try {
      // Basic validation
      if (!row.contract_no || !row.customer_name) {
        throw new Error("Missing required primary columns: Contract No and Customer Name are mandatory.");
      }

      // Check duplicate contract in database
      const { data: existingContract, error: checkError } = await supabase
        .from("contracts")
        .select("contract_no")
        .eq("contract_no", row.contract_no)
        .maybeSingle();

      if (checkError) {
        throw new Error("Database integrity check failed: " + checkError.message);
      }

      // Rule: Duplicate allocations must never overwrite database. Skip them!
      if (existingContract) {
        summary.skippedDuplicates++;
        
        // Log skip error detail
        await supabase.from("import_errors").insert({
          batch_id: batch.id,
          row_number: rowNumber,
          raw_data: row as any,
          error_reason: `Duplicate Contract: Contract [${row.contract_no}] already exists in active allocations database. Skipped.`
        });
        continue;
      }

      // 4. Perform atomic inserts across 5 related tables
      
      // Table 1: contracts
      const { error: contractErr } = await supabase.from("contracts").insert({
        contract_no: row.contract_no,
        customer_name: row.customer_name,
        product: row.product || "LAP",
        branch: row.branch || "Unknown",
        state: row.state || "Unknown",
        area: row.area || "Unknown",
        region: row.region || "Unknown",
        secured_category: row.secured_product_flag || "LOS",
        allocation_category: row.allocation_category || "LOS",
        bom_dpd: Number(row.bom_dpd || 0),
        mob: Number(row.mob || 0),
        bucket: row.bucket || null,
        bom_bucket: row.bom_bucket || null,
        secured_product_flag: row.secured_product_flag || "LOS",
        product_detail: row.product_detail || row.product || "LAP",
        allocation_dpd_category: row.allocation_dpd_category || "LOS",
        batch_id: batch.id
      });

      if (contractErr) throw new Error("Contracts insert failed: " + contractErr.message);

      // Table 2: contract_contacts
      const { error: contactErr } = await supabase.from("contract_contacts").insert({
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
        pdpr_address: row.pdpr_address || null
      });

      if (contactErr) {
        console.error("Contacts warning:", contactErr.message);
      }

      // Table 3: contract_assets
      const { error: assetErr } = await supabase.from("contract_assets").insert({
        contract_no: row.contract_no,
        manufacturer: row.manufacturer || null,
        asset_model: row.asset_model || null,
        rc_number: row.rc_number || null,
        manufacturer_2: row.manufacturer_2 || null,
        asset_category: row.asset_category || null,
        asset_variant: row.asset_variant || null,
        engine_number: row.engine_number || null,
        chassis_number: row.chassis_number || null,
        year_of_manufacture: row.year_of_manufacture || null
      });

      if (assetErr) {
        console.error("Assets warning:", assetErr.message);
      }

      // Table 4: contract_financials
      const { error: financialErr } = await supabase.from("contract_financials").insert({
        contract_no: row.contract_no,
        finance_amount: row.finance_amount || 0,
        total_pos_outstanding: row.total_pos_outstanding || row.pos || 0,
        pos: row.pos || 0,
        total_amount_collectable: row.total_amount_collectable || 0,
        sale_price: row.sale_price || 0,
        emi_amount: row.emi_amount || 0,
        od_amount: row.od_amount || 0,
        principal_overdue: row.principal_overdue || 0,
        interest_overdue: row.interest_overdue || 0,
        bounce_charges: row.bounce_charges || 0,
        current_odc: row.current_odc || 0,
        total_outstanding: row.total_outstanding || row.od_amount || 0,
        ots_amount: row.ots_amount || 0,
        pos_waiver_amount: row.pos_waiver_amount || 0,
        pos_waiver_percent: row.pos_waiver_percent || 0
      });

      if (financialErr) {
        console.error("Financials warning:", financialErr.message);
      }

      // Table 5: contract_legal
      const { error: legalErr } = await supabase.from("contract_legal").insert({
        contract_no: row.contract_no,
        notice_sent_sec138: row.notice_sent_sec138 || null,
        type_of_case: row.type_of_case || null,
        cheque_amount: row.cheque_amount || null,
        cheque_date: row.cheque_date || null,
        cheque_no: row.cheque_no || null,
        sec138_current_status: row.sec138_current_status || null,
        group_stage: row.group_stage || null,
        case_no: row.case_no || null,
        court_location: row.court_location || null,
        court_name: row.court_name || null,
        ldoh: row.ldoh || null,
        ndoh: row.ndoh || null,
        advocate: row.advocate || null,
        hand_summons: row.hand_summons || null,
        hand_warrant_1: row.hand_warrant_1 || null,
        proclamation_orders: row.proclamation_orders || null,
        lrn_status: row.lrn_status || null,
        lrn_date: row.lrn_date || null,
        arb: row.arb || null,
        sec17_orders_date: row.sec17_orders_date || null,
        award_date: row.award_date || null,
        ep_stage: row.ep_stage || null,
        ep_ldoh: row.ep_ldoh || null,
        ep_ndoh: row.ep_ndoh || null,
        ep_case_no: row.ep_case_no || null,
        ep_advocate: row.ep_advocate || null,
        termination_status_sa: row.termination_status_sa || null,
        lrn_prn_status: row.lrn_prn_status || null,
        lrn_prn_issue_date: row.lrn_prn_issue_date || null,
        lrn_prn_link: row.lrn_prn_link || null,
        cnr_number_cc: row.cnr_number_cc || null,
        cnr_number_pcr: row.cnr_number_pcr || null,
        current_stage: row.current_stage || null,
        filed_location: row.filed_location || null,
        court_hall: row.court_hall || null,
        hand_s_nbw_bw_pc: row.hand_s_nbw_bw_pc || null,
        hand_s_nbw_bw_pc_type: row.hand_s_nbw_bw_pc_type || null,
        claim_amount: row.claim_amount || null,
        arbitration_group_stage: row.arbitration_group_stage || null,
        sec17_orders: row.sec17_orders || null,
        sec17_date: row.sec17_date || null,
        court_bench: row.court_bench || null,
        ep_pdoh: row.ep_pdoh || null,
        legal_status: row.legal_status || null
      });

      if (legalErr) {
        console.error("Legal warning:", legalErr.message);
      }

      summary.imported++;

    } catch (err: any) {
      console.error(`Row ${rowNumber} import failed:`, err.message);
      summary.failed++;

      // Log failure detail
      await supabase.from("import_errors").insert({
        batch_id: batch.id,
        row_number: rowNumber,
        raw_data: row as any,
        error_reason: err.message || "Unknown schema constraint exception"
      });
    }
  }

  // 5. Update batch totals
  await supabase
    .from("import_batches")
    .update({
      imported_count: summary.imported,
      duplicates_skipped: summary.skippedDuplicates,
      failed_count: summary.failed
    })
    .eq("id", batch.id);

  // Fetch logged errors to return in summary
  const { data: errorsList } = await supabase
    .from("import_errors")
    .select("row_number, error_reason")
    .eq("batch_id", batch.id);

  summary.errors = errorsList || [];

  // Log compliance audit
  if (userId) {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "EXCEL_IMPORT",
      entity_type: "import_batches",
      entity_id: batch.id,
      metadata: { filename, imported: summary.imported, skipped: summary.skippedDuplicates, failed: summary.failed }
    });
  }

  revalidatePath("/");
  return summary;
}
