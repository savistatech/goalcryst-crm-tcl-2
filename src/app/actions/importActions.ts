"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface ImportRow {
  // Base fields
  contract_no: string;
  customer_name: string; // Map from "Name of the Borrower"
  group_code?: string;
  company_code?: string;
  vendor?: string;
  allocated_in_rsc?: string;
  allocate_date_bif?: string;
  updated_vintage?: string;
  band?: string;
  loan_agreement_date?: string;
  loan_tenure_from?: string;
  loan_tenure_to?: string;
  product_group?: string;
  region?: string;
  state?: string;
  branch?: string;
  zone?: string;
  new_region?: string;

  // Contact fields
  borrower_address?: string;
  borrower_phone_1?: string;
  borrower_phone_2?: string;
  borrower_mobile?: string;
  co_borrower_name?: string;
  co_borrower_address?: string;
  co_borrower_phone_1?: string;
  co_borrower_phone_2?: string;
  co_borrower_mobile?: string;
  guarantor_name?: string;
  guarantor_address?: string;
  guarantor_phone_1?: string;
  guarantor_phone_2?: string;
  guarantor_mobile?: string;

  // Financial fields
  loan_amount?: number;
  sale_price?: number;
  sale_date?: string;
  lsa_val_apr26?: number;
  abnc?: string;
  abnc_amt?: number;
  agging?: string;

  // Asset fields
  registration_number?: string;
  material?: string;
  product_disp?: string;
  engine_number?: string;
  chassis_number?: string;
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
      group_code: row.group_code || null,
      company_code: row.company_code || null,
      vendor: row.vendor || null,
      allocated_in_rsc: row.allocated_in_rsc || null,
      allocate_date_bif: row.allocate_date_bif || null,
      updated_vintage: row.updated_vintage || null,
      band: row.band || null,
      loan_agreement_date: parseDate(row.loan_agreement_date),
      loan_tenure_from: parseDate(row.loan_tenure_from),
      loan_tenure_to: parseDate(row.loan_tenure_to),
      product_group: row.product_group || null,
      region: row.region || null,
      state: row.state || null,
      branch: row.branch || null,
      zone: row.zone || null,
      new_region: row.new_region || null,
      batch_id: batch.id,
      updated_at: new Date().toISOString()
    }));

    const contacts = validRows.map(row => ({
      contract_no: row.contract_no,
      borrower_address: row.borrower_address || null,
      borrower_phone_1: row.borrower_phone_1 || null,
      borrower_phone_2: row.borrower_phone_2 || null,
      borrower_mobile: row.borrower_mobile || null,
      co_borrower_name: row.co_borrower_name || null,
      co_borrower_address: row.co_borrower_address || null,
      co_borrower_phone_1: row.co_borrower_phone_1 || null,
      co_borrower_phone_2: row.co_borrower_phone_2 || null,
      co_borrower_mobile: row.co_borrower_mobile || null,
      guarantor_name: row.guarantor_name || null,
      guarantor_address: row.guarantor_address || null,
      guarantor_phone_1: row.guarantor_phone_1 || null,
      guarantor_phone_2: row.guarantor_phone_2 || null,
      guarantor_mobile: row.guarantor_mobile || null,
      updated_at: new Date().toISOString()
    }));

    const assets = validRows.map(row => ({
      contract_no: row.contract_no,
      registration_number: row.registration_number || null,
      material: row.material || null,
      product_disp: row.product_disp || null,
      engine_number: row.engine_number || null,
      chassis_number: row.chassis_number || null,
      updated_at: new Date().toISOString()
    }));

    const financials = validRows.map(row => ({
      contract_no: row.contract_no,
      loan_amount: parseNumOrNull(row.loan_amount),
      sale_price: parseNumOrNull(row.sale_price),
      sale_date: parseDate(row.sale_date),
      lsa_val_apr26: parseNumOrNull(row.lsa_val_apr26),
      abnc: row.abnc || null,
      abnc_amt: parseNumOrNull(row.abnc_amt),
      agging: row.agging || null,
      updated_at: new Date().toISOString()
    }));

    // 6. Execute all upserts — contracts first (parent), then children in parallel
    try {
      const { error: contractErr } = await supabase
        .from("contracts")
        .upsert(contracts, { onConflict: "contract_no" });
      if (contractErr) throw new Error("Contracts upsert failed: " + contractErr.message);

      const [contactRes, assetRes, finRes] = await Promise.all([
        supabase.from("contract_contacts").upsert(contacts, { onConflict: "contract_no" }),
        supabase.from("contract_assets").upsert(assets, { onConflict: "contract_no" }),
        supabase.from("contract_financials").upsert(financials, { onConflict: "contract_no" })
      ]);

      if (contactRes.error) throw new Error("Contacts upsert failed: " + contactRes.error.message);
      if (assetRes.error) throw new Error("Assets upsert failed: " + assetRes.error.message);
      if (finRes.error) throw new Error("Financials upsert failed: " + finRes.error.message);

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
