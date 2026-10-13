"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface ImportRow {
  // Base fields
  contract_no: string;
  customer_name: string;
  product?: string;
  branch?: string;
  state?: string;
  area?: string;
  region?: string;
  prod_flag?: string;
  prod_d?: string;
  new_cat?: string;
  secured_category?: string;
  allocation_category?: string;
  allocation_status_sept?: string;
  system_flagging?: string;
  ccod_other?: string;
  writeoff_flg?: string;
  bom_dpd?: number;
  bkt_tagging?: string;
  mob?: number;
  bucket?: string;
  bom_bucket?: string;
  non_starter?: string;
  delq_string?: string;
  finone_scheme_name?: string;
  cif?: string;
  secured_product_flag?: string;
  product_detail?: string;
  allocation_dpd_category?: string;
  customer_profile?: string;
  industry?: string;
  occupation_type?: string;
  occupation_type_2?: string;
  organization_employer_name?: string;

  // Contact fields
  mobile_1?: string;
  mobile_no?: string;
  primary_mobile?: string;
  primary_mobile_1?: string;
  primary_mobile_2?: string;
  mobile_no_2?: string;
  latest_contact_no?: string;
  coapplicant_1?: string;
  coapplicant_2?: string;
  coapplicant_3?: string;
  coapplicant_4?: string;
  guarantor_1?: string;
  guarantor_2?: string;
  guarantor_3?: string;
  pan_no?: string;
  is_primary_email_yes?: string;
  is_primary_email_no?: string;
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
  vehicle_available?: string;
  secured_tagging?: string;

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
  insurance_type?: string;
  insurance_policy_end_date?: string;
  sum_assured_amount?: number;
  death_case_insurance_update?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  cycle?: string;
  total_tenure?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  future_pos?: number;
  pos_in_cr?: string;
  act_pct_cr?: string;
  collxn_act_tar?: string;
  ror?: string;
  target_pct?: string;
  paid_on_funding_amt?: number;
  paid_pct?: string;
  sms_camp?: string;
  ptp?: string;
  ptp_in_cr?: string;
  ptp_mobile_no?: string;
  ptp_date?: string;
  bptp_date?: string;
  otc?: string;
  rec_mis?: string;
  docs?: string;
  collxn?: number;
  collection_in_cr?: string;
  collection_mode?: string;
  collection_date?: string;
  receipt?: string;
  pym_status?: string;
  last_month_pay_collxn?: string;
  last_month_pay_status?: string;
  outside_pay_l3m_vs_emi?: string;
  paid_outside?: string;
  ratio_offus_paylm_tcl_emi?: string;
  ecs_autodebit?: string;
  settlement_mis?: string;
  settlement_initiation_date?: string;
  settlement_end_date?: string;
  trench?: string;
  settlement_remark?: string;
  ots_status?: string;
  smis?: string;
  rmis?: string;
  settlement_status?: string;
  repo_mis?: string;
  repo_date?: string;
  sale_release_date?: string;
  settlement_serial_46173?: string;

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
  new_cnr_number_cc?: string;
  hand_s_nbw_bw_pc_oct8?: string;
  hand_s_nbw_bw_pc_type2?: string;
  arbitrator_type?: string;
  arbitration_ndoh?: string;
  ep_group_stage?: string;

  // Agency Hierarchy fields
  sept_allocation_type?: string;
  sept_agency_code?: string;
  sept_month_agency?: string;
  final_allocation_tagging?: string;
  oct_allocation_type?: string;
  oct_agency_code?: string;
  oct_month_agency?: string;
  changes_ss?: string;
  agent_name?: string;
  agent_id?: string;
  agent_mobile_no?: string;
  cre_name?: string;
  cm_code?: string;
  cm_name?: string;
  ccm_code?: string;
  ccm_name?: string;
  rcm_code?: string;
  rcm_name?: string;
  ncm_code?: string;
  ncm_name?: string;

  // Bureau Scores fields
  credit_score?: string;
  cibil_score?: string;
  sourcing_cibil_score?: string;
  bureau_details_1?: string;
  bureau_details_2?: string;
  bureau_details_3?: string;
  bureau_details_4?: string;
  del_vs_new_contact?: string;

  // Call Trails & Disposition fields
  sept_trails?: string;
  sept_contact_mode?: string;
  sept_trail_recorded_by?: string;
  oct_trails?: string;
  oct_contact_mode?: string;
  oct_trail_recorded_by?: string;
  contactability_status?: string;
  dispo_status?: string;
  dispo_code?: string;
  sub_dispo_code?: string;
  mode_of_contact?: string;
  caller_fb?: string;
  agency_tl_manager_fb?: string;
  detailed_fb?: string;
  reason_for_default_1?: string;
  reason_for_default_2?: string;
  reason_for_default_3?: string;
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

  return null;
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

const parseStrOrNull = (val?: any): string | null => {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (!str || str === "-" || str.toUpperCase() === "N/A") return null;
  return str;
};

// ---------------------------------------------------------------------------
// commitImportBatch
// Upserts a chunk of rows into all 8 contract tables.
// ---------------------------------------------------------------------------
export async function commitImportBatch(
  filename: string,
  rows: ImportRow[],
  existingBatchId?: string,
  grandTotalRows?: number
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
        total_rows: grandTotalRows ?? rows.length,
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

    const COUNT_CHUNK = 500;
    for (let j = 0; j < validContractNos.length; j += COUNT_CHUNK) {
      const idSlice = validContractNos.slice(j, j + COUNT_CHUNK);
      const { count } = await supabase
        .from("contracts")
        .select("contract_no", { count: "exact", head: true })
        .in("contract_no", idSlice);
      existingCount += count || 0;
    }

    // 5. Build upsert payloads across 8 tables
    const contracts = validRows.map(row => ({
      contract_no: row.contract_no,
      customer_name: row.customer_name,
      product: row.product || "TW",
      branch: row.branch || "Unknown",
      state: row.state || "Unknown",
      area: row.area || row.branch || "Unknown",
      region: row.region || "Unknown",
      prod_flag: parseStrOrNull(row.prod_flag),
      prod_d: parseStrOrNull(row.prod_d),
      new_cat: parseStrOrNull(row.new_cat),
      secured_category: parseStrOrNull(row.secured_category || row.secured_product_flag || row.new_cat),
      allocation_category: parseStrOrNull(row.allocation_category),
      allocation_status_sept: parseStrOrNull(row.allocation_status_sept),
      system_flagging: parseStrOrNull(row.system_flagging),
      ccod_other: parseStrOrNull(row.ccod_other),
      writeoff_flg: parseStrOrNull(row.writeoff_flg),
      bom_dpd: parseNum(row.bom_dpd),
      bkt_tagging: parseStrOrNull(row.bkt_tagging),
      mob: parseNum(row.mob),
      bucket: parseStrOrNull(row.bucket),
      bom_bucket: parseStrOrNull(row.bom_bucket),
      non_starter: parseStrOrNull(row.non_starter),
      delq_string: parseStrOrNull(row.delq_string),
      finone_scheme_name: parseStrOrNull(row.finone_scheme_name),
      cif: parseStrOrNull(row.cif),
      secured_product_flag: parseStrOrNull(row.secured_product_flag || row.prod_flag),
      product_detail: parseStrOrNull(row.product_detail || row.product),
      allocation_dpd_category: parseStrOrNull(row.allocation_dpd_category),
      customer_profile: parseStrOrNull(row.customer_profile),
      industry: parseStrOrNull(row.industry),
      occupation_type: parseStrOrNull(row.occupation_type || row.occupation_type_2),
      organization_employer_name: parseStrOrNull(row.organization_employer_name),
      batch_id: batch.id,
      updated_at: new Date().toISOString()
    }));

    const contacts = validRows.map(row => ({
      contract_no: row.contract_no,
      mobile_1: parseStrOrNull(row.mobile_1),
      mobile_no: parseStrOrNull(row.mobile_no),
      primary_mobile: parseStrOrNull(row.primary_mobile || row.mobile_1 || row.primary_mobile_1),
      primary_mobile_1: parseStrOrNull(row.primary_mobile_1),
      primary_mobile_2: parseStrOrNull(row.primary_mobile_2),
      mobile_no_2: parseStrOrNull(row.mobile_no_2),
      latest_contact_no: parseStrOrNull(row.latest_contact_no),
      coapplicant_1: parseStrOrNull(row.coapplicant_1),
      coapplicant_2: parseStrOrNull(row.coapplicant_2),
      coapplicant_3: parseStrOrNull(row.coapplicant_3),
      coapplicant_4: parseStrOrNull(row.coapplicant_4),
      guarantor_1: parseStrOrNull(row.guarantor_1),
      guarantor_2: parseStrOrNull(row.guarantor_2),
      guarantor_3: parseStrOrNull(row.guarantor_3),
      pan_no: parseStrOrNull(row.pan_no),
      is_primary_email_yes: parseStrOrNull(row.is_primary_email_yes),
      is_primary_email_no: parseStrOrNull(row.is_primary_email_no),
      ref_name_1: parseStrOrNull(row.ref_name_1),
      ref_mobile_1: parseStrOrNull(row.ref_mobile_1),
      ref_relation_1: parseStrOrNull(row.ref_relation_1),
      ref_name_2: parseStrOrNull(row.ref_name_2),
      ref_mobile_2: parseStrOrNull(row.ref_mobile_2),
      ref_relation_2: parseStrOrNull(row.ref_relation_2),
      base_address: parseStrOrNull(row.base_address),
      landmark: parseStrOrNull(row.landmark),
      pincode: parseStrOrNull(row.pincode),
      permanent_address: parseStrOrNull(row.permanent_address),
      office_address: parseStrOrNull(row.office_address),
      finnone_address: parseStrOrNull(row.finnone_address),
      master_primary_address: parseStrOrNull(row.master_primary_address || row.base_address),
      permanent_address_2: parseStrOrNull(row.permanent_address_2),
      secondary_address: parseStrOrNull(row.secondary_address),
      office_address_2: parseStrOrNull(row.office_address_2),
      additional_address: parseStrOrNull(row.additional_address),
      residential_address: parseStrOrNull(row.residential_address),
      ref_full_address_1: parseStrOrNull(row.ref_full_address_1),
      ref_full_address_2: parseStrOrNull(row.ref_full_address_2),
      pdpr_address: parseStrOrNull(row.pdpr_address),
      updated_at: new Date().toISOString()
    }));

    const assets = validRows.map(row => ({
      contract_no: row.contract_no,
      manufacturer: parseStrOrNull(row.manufacturer),
      asset_model: parseStrOrNull(row.asset_model),
      rc_number: parseStrOrNull(row.rc_number),
      manufacturer_2: parseStrOrNull(row.manufacturer_2),
      asset_category: parseStrOrNull(row.asset_category),
      asset_variant: parseStrOrNull(row.asset_variant),
      engine_number: parseStrOrNull(row.engine_number),
      chassis_number: parseStrOrNull(row.chassis_number),
      year_of_manufacture: parseStrOrNull(row.year_of_manufacture),
      vehicle_available: parseStrOrNull(row.vehicle_available),
      secured_tagging: parseStrOrNull(row.secured_tagging),
      updated_at: new Date().toISOString()
    }));

    const financials = validRows.map(row => ({
      contract_no: row.contract_no,
      finance_amount: parseNum(row.finance_amount),
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
      insurance_type: parseStrOrNull(row.insurance_type),
      insurance_policy_end_date: parseStrOrNull(row.insurance_policy_end_date),
      sum_assured_amount: parseNumOrNull(row.sum_assured_amount),
      death_case_insurance_update: parseStrOrNull(row.death_case_insurance_update),
      contract_start_date: parseStrOrNull(row.contract_start_date),
      contract_end_date: parseStrOrNull(row.contract_end_date),
      cycle: parseStrOrNull(row.cycle),
      total_tenure: parseStrOrNull(row.total_tenure),
      bank_account_no: parseStrOrNull(row.bank_account_no),
      ifsc_code: parseStrOrNull(row.ifsc_code),
      future_pos: parseNumOrNull(row.future_pos),
      pos_in_cr: parseStrOrNull(row.pos_in_cr),
      act_pct_cr: parseStrOrNull(row.act_pct_cr),
      collxn_act_tar: parseStrOrNull(row.collxn_act_tar),
      ror: parseStrOrNull(row.ror),
      target_pct: parseStrOrNull(row.target_pct),
      paid_on_funding_amt: parseNumOrNull(row.paid_on_funding_amt),
      paid_pct: parseStrOrNull(row.paid_pct),
      sms_camp: parseStrOrNull(row.sms_camp),
      ptp: parseStrOrNull(row.ptp),
      ptp_in_cr: parseStrOrNull(row.ptp_in_cr),
      ptp_mobile_no: parseStrOrNull(row.ptp_mobile_no),
      ptp_date: parseStrOrNull(row.ptp_date),
      bptp_date: parseStrOrNull(row.bptp_date),
      otc: parseStrOrNull(row.otc),
      rec_mis: parseStrOrNull(row.rec_mis),
      docs: parseStrOrNull(row.docs),
      collxn: parseNumOrNull(row.collxn),
      collection_in_cr: parseStrOrNull(row.collection_in_cr),
      collection_mode: parseStrOrNull(row.collection_mode),
      collection_date: parseStrOrNull(row.collection_date),
      receipt: parseStrOrNull(row.receipt),
      pym_status: parseStrOrNull(row.pym_status),
      last_month_pay_collxn: parseStrOrNull(row.last_month_pay_collxn),
      last_month_pay_status: parseStrOrNull(row.last_month_pay_status),
      outside_pay_l3m_vs_emi: parseStrOrNull(row.outside_pay_l3m_vs_emi),
      paid_outside: parseStrOrNull(row.paid_outside),
      ratio_offus_paylm_tcl_emi: parseStrOrNull(row.ratio_offus_paylm_tcl_emi),
      ecs_autodebit: parseStrOrNull(row.ecs_autodebit),
      settlement_mis: parseStrOrNull(row.settlement_mis),
      settlement_initiation_date: parseStrOrNull(row.settlement_initiation_date),
      settlement_end_date: parseStrOrNull(row.settlement_end_date),
      trench: parseStrOrNull(row.trench),
      settlement_remark: parseStrOrNull(row.settlement_remark),
      ots_status: parseStrOrNull(row.ots_status),
      smis: parseStrOrNull(row.smis),
      rmis: parseStrOrNull(row.rmis),
      settlement_status: parseStrOrNull(row.settlement_status),
      repo_mis: parseStrOrNull(row.repo_mis),
      repo_date: parseStrOrNull(row.repo_date),
      sale_release_date: parseStrOrNull(row.sale_release_date),
      settlement_serial_46173: parseStrOrNull(row.settlement_serial_46173),
      updated_at: new Date().toISOString()
    }));

    const legal = validRows.map(row => ({
      contract_no: row.contract_no,
      notice_sent_sec138: parseStrOrNull(row.notice_sent_sec138),
      type_of_case: parseStrOrNull(row.type_of_case),
      cheque_amount: parseNumOrNull(row.cheque_amount),
      cheque_date: parseDate(row.cheque_date),
      cheque_no: parseStrOrNull(row.cheque_no),
      sec138_current_status: parseStrOrNull(row.sec138_current_status),
      group_stage: parseStrOrNull(row.group_stage),
      case_no: parseStrOrNull(row.case_no),
      court_location: parseStrOrNull(row.court_location),
      court_name: parseStrOrNull(row.court_name),
      ldoh: parseDate(row.ldoh),
      ndoh: parseDate(row.ndoh),
      advocate: parseStrOrNull(row.advocate),
      hand_summons: parseStrOrNull(row.hand_summons),
      hand_warrant_1: parseStrOrNull(row.hand_warrant_1),
      proclamation_orders: parseStrOrNull(row.proclamation_orders),
      lrn_status: parseStrOrNull(row.lrn_status),
      lrn_date: parseDate(row.lrn_date),
      arb: parseStrOrNull(row.arb),
      sec17_orders_date: parseDate(row.sec17_orders_date),
      award_date: parseDate(row.award_date),
      ep_stage: parseStrOrNull(row.ep_stage),
      ep_ldoh: parseDate(row.ep_ldoh),
      ep_ndoh: parseDate(row.ep_ndoh),
      ep_case_no: parseStrOrNull(row.ep_case_no),
      ep_advocate: parseStrOrNull(row.ep_advocate),
      termination_status_sa: parseStrOrNull(row.termination_status_sa),
      lrn_prn_status: parseStrOrNull(row.lrn_prn_status),
      lrn_prn_issue_date: parseDate(row.lrn_prn_issue_date),
      lrn_prn_link: parseStrOrNull(row.lrn_prn_link),
      cnr_number_cc: parseStrOrNull(row.cnr_number_cc),
      cnr_number_pcr: parseStrOrNull(row.cnr_number_pcr),
      current_stage: parseStrOrNull(row.current_stage),
      filed_location: parseStrOrNull(row.filed_location),
      court_hall: parseStrOrNull(row.court_hall),
      hand_s_nbw_bw_pc: parseStrOrNull(row.hand_s_nbw_bw_pc),
      hand_s_nbw_bw_pc_type: parseStrOrNull(row.hand_s_nbw_bw_pc_type),
      claim_amount: parseNumOrNull(row.claim_amount),
      arbitration_group_stage: parseStrOrNull(row.arbitration_group_stage),
      sec17_orders: parseStrOrNull(row.sec17_orders),
      sec17_date: parseDate(row.sec17_date),
      court_bench: parseStrOrNull(row.court_bench),
      ep_pdoh: parseDate(row.ep_pdoh),
      legal_status: parseStrOrNull(row.legal_status),
      new_cnr_number_cc: parseStrOrNull(row.new_cnr_number_cc),
      hand_s_nbw_bw_pc_oct8: parseStrOrNull(row.hand_s_nbw_bw_pc_oct8),
      hand_s_nbw_bw_pc_type2: parseStrOrNull(row.hand_s_nbw_bw_pc_type2),
      arbitrator_type: parseStrOrNull(row.arbitrator_type),
      arbitration_ndoh: parseDate(row.arbitration_ndoh),
      ep_group_stage: parseStrOrNull(row.ep_group_stage),
      updated_at: new Date().toISOString()
    }));

    const agencyHierarchy = validRows.map(row => ({
      contract_no: row.contract_no,
      sept_allocation_type: parseStrOrNull(row.sept_allocation_type),
      sept_agency_code: parseStrOrNull(row.sept_agency_code),
      sept_month_agency: parseStrOrNull(row.sept_month_agency),
      final_allocation_tagging: parseStrOrNull(row.final_allocation_tagging),
      oct_allocation_type: parseStrOrNull(row.oct_allocation_type),
      oct_agency_code: parseStrOrNull(row.oct_agency_code),
      oct_month_agency: parseStrOrNull(row.oct_month_agency),
      changes_ss: parseStrOrNull(row.changes_ss),
      agent_name: parseStrOrNull(row.agent_name),
      agent_id: parseStrOrNull(row.agent_id),
      agent_mobile_no: parseStrOrNull(row.agent_mobile_no),
      cre_name: parseStrOrNull(row.cre_name),
      cm_code: parseStrOrNull(row.cm_code),
      cm_name: parseStrOrNull(row.cm_name),
      ccm_code: parseStrOrNull(row.ccm_code),
      ccm_name: parseStrOrNull(row.ccm_name),
      rcm_code: parseStrOrNull(row.rcm_code),
      rcm_name: parseStrOrNull(row.rcm_name),
      ncm_code: parseStrOrNull(row.ncm_code),
      ncm_name: parseStrOrNull(row.ncm_name),
      updated_at: new Date().toISOString()
    }));

    const bureauScores = validRows.map(row => ({
      contract_no: row.contract_no,
      credit_score: parseStrOrNull(row.credit_score),
      cibil_score: parseStrOrNull(row.cibil_score),
      sourcing_cibil_score: parseStrOrNull(row.sourcing_cibil_score),
      bureau_details_1: parseStrOrNull(row.bureau_details_1),
      bureau_details_2: parseStrOrNull(row.bureau_details_2),
      bureau_details_3: parseStrOrNull(row.bureau_details_3),
      bureau_details_4: parseStrOrNull(row.bureau_details_4),
      del_vs_new_contact: parseStrOrNull(row.del_vs_new_contact),
      updated_at: new Date().toISOString()
    }));

    const trails = validRows.map(row => ({
      contract_no: row.contract_no,
      sept_trails: parseStrOrNull(row.sept_trails),
      sept_contact_mode: parseStrOrNull(row.sept_contact_mode),
      sept_trail_recorded_by: parseStrOrNull(row.sept_trail_recorded_by),
      oct_trails: parseStrOrNull(row.oct_trails),
      oct_contact_mode: parseStrOrNull(row.oct_contact_mode),
      oct_trail_recorded_by: parseStrOrNull(row.oct_trail_recorded_by),
      contactability_status: parseStrOrNull(row.contactability_status),
      dispo_status: parseStrOrNull(row.dispo_status),
      dispo_code: parseStrOrNull(row.dispo_code),
      sub_dispo_code: parseStrOrNull(row.sub_dispo_code),
      mode_of_contact: parseStrOrNull(row.mode_of_contact),
      caller_fb: parseStrOrNull(row.caller_fb),
      agency_tl_manager_fb: parseStrOrNull(row.agency_tl_manager_fb),
      detailed_fb: parseStrOrNull(row.detailed_fb),
      reason_for_default_1: parseStrOrNull(row.reason_for_default_1),
      reason_for_default_2: parseStrOrNull(row.reason_for_default_2),
      reason_for_default_3: parseStrOrNull(row.reason_for_default_3),
      updated_at: new Date().toISOString()
    }));

    // 6. Execute all upserts — contracts first (parent), then 7 child tables in parallel
    try {
      const { error: contractErr } = await supabase
        .from("contracts")
        .upsert(contracts, { onConflict: "contract_no" });
      if (contractErr) throw new Error("Contracts upsert failed: " + contractErr.message);

      const [contactRes, assetRes, finRes, legalRes, agencyRes, bureauRes, trailRes] = await Promise.all([
        supabase.from("contract_contacts").upsert(contacts, { onConflict: "contract_no" }),
        supabase.from("contract_assets").upsert(assets, { onConflict: "contract_no" }),
        supabase.from("contract_financials").upsert(financials, { onConflict: "contract_no" }),
        supabase.from("contract_legal").upsert(legal, { onConflict: "contract_no" }),
        supabase.from("contract_agency_hierarchy").upsert(agencyHierarchy, { onConflict: "contract_no" }),
        supabase.from("contract_bureau_scores").upsert(bureauScores, { onConflict: "contract_no" }),
        supabase.from("contract_trails").upsert(trails, { onConflict: "contract_no" })
      ]);

      if (contactRes.error) throw new Error("Contacts upsert failed: " + contactRes.error.message);
      if (assetRes.error) throw new Error("Assets upsert failed: " + assetRes.error.message);
      if (finRes.error) throw new Error("Financials upsert failed: " + finRes.error.message);
      if (legalRes.error) throw new Error("Legal upsert failed: " + legalRes.error.message);
      if (agencyRes.error) throw new Error("Agency Hierarchy upsert failed: " + agencyRes.error.message);
      if (bureauRes.error) throw new Error("Bureau Scores upsert failed: " + bureauRes.error.message);
      if (trailRes.error) throw new Error("Trails upsert failed: " + trailRes.error.message);

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
    .limit(500);

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
