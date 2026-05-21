"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { commitImportBatch, type ImportRow, type ImportSummary } from "@/app/actions/importActions";
import PermissionGuard from "@/components/PermissionGuard";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Loader2,
  Download,
  Settings,
  ShieldCheck,
  Search
} from "lucide-react";

type ImportStep = 1 | 2 | 3 | 4;

interface FieldDefinition {
  key: keyof ImportRow;
  label: string;
  required: boolean;
  type: "string" | "number";
  aliases: string[];
}

// 20 Core database columns target fields
const TARGET_FIELDS: FieldDefinition[] = [
  { key: "contract_no", label: "Contract/Agreement No", required: true, type: "string", aliases: ["contract_no", "contract no", "agreement no", "agreement_no", "lan", "loan account number"] },
  { key: "customer_name", label: "Customer Name", required: true, type: "string", aliases: ["customer_name", "customer name", "client name", "borrower name", "name"] },
  { key: "product", label: "Product Class", required: false, type: "string", aliases: ["product", "product_class", "product type", "secured_product"] },
  { key: "branch", label: "Allocated Branch", required: false, type: "string", aliases: ["branch", "branch name", "location", "branch_name"] },
  { key: "state", label: "Allocated State", required: false, type: "string", aliases: ["state", "state_name", "customer state"] },
  { key: "area", label: "Allocated Area", required: false, type: "string", aliases: ["area", "customer area"] },
  { key: "region", label: "Region", required: false, type: "string", aliases: ["region", "customer region"] },
  { key: "bom_dpd", label: "BOM DPD Days", required: false, type: "number", aliases: ["bom_dpd", "dpd", "overdue days", "dpd days"] },

  // Contacts
  { key: "mobile_1", label: "Primary Phone (Mobile 1)", required: false, type: "string", aliases: ["mobile_1", "mobile 1", "phone", "phone 1", "mobile", "primary_mobile"] },
  { key: "mobile_no", label: "Alternate Phone (Mobile 2)", required: false, type: "string", aliases: ["mobile_no", "mobile 2", "mobile_no", "phone 2", "phone_no"] },
  { key: "base_address", label: "Master Base Address", required: false, type: "string", aliases: ["base_address", "address", "address 1", "primary_address", "master_address"] },
  { key: "pincode", label: "Postal Pincode", required: false, type: "string", aliases: ["pincode", "zip", "zipcode", "postal_code"] },

  // Financials
  { key: "finance_amount", label: "Finance Loan Amount", required: false, type: "number", aliases: ["finance_amount", "loan_amount", "finance amount", "sanctioned_amount"] },
  { key: "pos", label: "Principal POS", required: false, type: "number", aliases: ["pos", "principal_pos", "principal outstanding", "principal_outstanding"] },
  { key: "emi_amount", label: "EMI Amount due", required: false, type: "number", aliases: ["emi", "emi_amount", "emi amount"] },
  { key: "od_amount", label: "Overdue (OD) Amount", required: false, type: "number", aliases: ["od_amount", "overdue", "overdue_amount", "od amount"] },

  // Legal
  { key: "case_no", label: "Legal Court Case No", required: false, type: "string", aliases: ["case_no", "case number", "case_number", "court_case_no"] },
  { key: "legal_status", label: "Legal Litigation Status", required: false, type: "string", aliases: ["legal_status", "litigation_status", "legal status"] }
];

export default function ImportsPage() {
  const [step, setStep] = useState<ImportStep>(1);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  
  // Field mappings state (target_key -> excel_header)
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  // Validation counts
  const [validCount, setValidCount] = useState(0);
  const [innerDuplicates, setInnerDuplicates] = useState<string[]>([]);
  
  // Final execution state
  const [commitLoading, setCommitLoading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle Excel parsing on client side
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse headers and rows
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length === 0) {
          alert("Excel file appears to be completely empty.");
          return;
        }

        const headers = data[0].map(h => String(h || "").trim()).filter(Boolean);
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        setExcelHeaders(headers);
        setExcelRows(rows);

        // Auto Map Columns logic
        const initialMappings: Record<string, string> = {};
        TARGET_FIELDS.forEach(field => {
          // Find standard match or matching alias
          const match = headers.find(h => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return field.aliases.some(alias => {
              const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
              return cleanH === cleanAlias;
            });
          });
          if (match) {
            initialMappings[field.key] = match;
          } else {
            initialMappings[field.key] = "";
          }
        });

        setMappings(initialMappings);
        setStep(2);
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file. Verify file format and try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Step 2: Proceed to Validation
  const handleProceedToValidation = () => {
    // Check that all required fields are mapped
    const missingRequired = TARGET_FIELDS.filter(f => f.required && !mappings[f.key]);
    if (missingRequired.length > 0) {
      alert(`Please map all required fields: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    // Scan for inner duplicates within sheet itself
    const contractNoHeader = mappings["contract_no"];
    const seenContracts = new Set<string>();
    const dupes: string[] = [];
    let valid = 0;

    excelRows.forEach(row => {
      const cNo = String(row[contractNoHeader] || "").trim();
      if (!cNo) return;
      if (seenContracts.has(cNo)) {
        dupes.push(cNo);
      } else {
        seenContracts.add(cNo);
        valid++;
      }
    });

    setInnerDuplicates(dupes);
    setValidCount(valid);
    setStep(3);
  };

  // Step 3: Trigger Transaction Commit
  const handleCommitImport = async () => {
    setCommitLoading(true);
    try {
      // Map raw Excel rows to ImportRows format
      const formattedRows: ImportRow[] = excelRows.map(row => {
        const item: any = {};
        TARGET_FIELDS.forEach(field => {
          const excelHeader = mappings[field.key];
          let val = row[excelHeader];

          if (field.type === "number") {
            item[field.key] = val !== undefined && val !== null ? Number(val) : 0;
          } else {
            item[field.key] = val !== undefined && val !== null ? String(val).trim() : "";
          }
        });
        return item as ImportRow;
      });

      const result = await commitImportBatch(filename, formattedRows);
      setImportSummary(result);
      setStep(4);
    } catch (err: any) {
      alert("Error committing import batch: " + err.message);
    } finally {
      setCommitLoading(false);
    }
  };

  // Download log helper
  const downloadErrorLogs = () => {
    if (!importSummary || importSummary.errors.length === 0) return;
    
    const header = "Row Number,Reason\n";
    const csvContent = importSummary.errors.map(e => `${e.row_number},"${e.error_reason.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `import_logs_${importSummary.batchId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PermissionGuard permission="can_upload_excel">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header title */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>GoalCryst CRM</span>
          <span>·</span>
          <span>Operations Admin Console</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Bulk Allocation Import Wizard
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Perform secure, chunked spreadsheet uploads. Overwriting pre-existing contact records is prohibited.
        </p>
      </div>

      {/* ===== STEP INDICATOR BAR ===== */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: "Upload Sheets" },
          { num: 2, label: "Map Columns" },
          { num: 3, label: "Validate Data" },
          { num: 4, label: "Commit Logs" }
        ].map((item) => {
          const isActive = step === item.num;
          const isDone = step > item.num;
          return (
            <div
              key={item.num}
              className={`pb-2.5 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive
                  ? "border-accent-custom text-accent-custom"
                  : isDone
                  ? "border-ink text-ink"
                  : "border-border-custom text-ink-3"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold ${
                  isActive ? "bg-accent-custom text-surface" : isDone ? "bg-ink text-surface" : "bg-border-custom text-ink-3"
                }`}>
                  {item.num}
                </span>
                <span>{item.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== STEP CONTENT WINDOW ===== */}

      {/* ==================== STEP 1: UPLOAD ==================== */}
      {step === 1 && (
        <div className="space-y-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-strong hover:border-accent-custom hover:bg-bg-warm/30 rounded-2xl p-12 text-center transition-all cursor-pointer space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            {loading ? (
              <div className="space-y-2 select-none">
                <Loader2 className="w-8 h-8 animate-spin text-accent-custom mx-auto" />
                <p className="text-sm font-semibold text-ink">Analyzing workbook parameters...</p>
                <p className="text-xs text-ink-3">Structuring columns sheets data...</p>
              </div>
            ) : (
              <div className="space-y-2 select-none">
                <Upload className="w-10 h-10 text-ink-3 mx-auto" />
                <h3 className="text-base font-semibold text-ink">Select Allocation Sheet</h3>
                <p className="text-xs text-ink-2 max-w-sm mx-auto">
                  Drag and drop your active allocation Excel sheet here, or click to browse. Supports `.xlsx` and `.xls` templates.
                </p>
                <span className="inline-block px-3 py-1 bg-bg-warm border border-border-custom rounded-md text-[10.5px] text-ink-2 font-mono mt-2">
                  114 target fields supported
                </span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 bg-bg-warm/40 border border-border-custom rounded-xl p-4 text-[12.5px] text-ink-2">
            <ShieldCheck className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink font-semibold">Integrity Protocol Enabled:</strong>
              <span className="block mt-0.5">
                The import process operates on transactional isolation rules. Duplicates are auto-flagged and isolated into downloadable logs without touching existing active dispositions history profiles.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: MAP FIELDS ==================== */}
      {step === 2 && (
        <div className="space-y-6 animate-scale-up">
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Map Excel Headers to CRM Parameters</h3>
              <p className="text-xs text-ink-2">Columns with close matching descriptors have been auto-paired.</p>
            </div>

            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3 divide-y divide-border-custom/50">
              {TARGET_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 first:pt-0">
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="font-semibold text-ink">{field.label}</span>
                    {field.required && (
                      <span className="px-1.5 py-0.5 text-[8.5px] bg-bad-bg text-bad font-semibold uppercase rounded">REQUIRED</span>
                    )}
                  </div>

                  <select
                    className="w-full sm:w-64 bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-ink focus:border-accent-custom"
                    value={mappings[field.key] || ""}
                    onChange={(e) => setMappings(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">-- Skip Field --</option>
                    {excelHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Nav Actions buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 h-9 px-4 border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 rounded-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleProceedToValidation}
              className="flex items-center gap-1.5 h-9 px-4 bg-ink hover:bg-black text-surface text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <span>Proceed to Validation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: VALIDATION ==================== */}
      {step === 3 && (
        <div className="space-y-6 animate-scale-up">
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Excel File Validation Results</h3>
              <p className="text-xs text-ink-2">Evaluation stats based on mapped data columns parameters.</p>
            </div>

            {/* Validation indicators grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-border-custom rounded-xl p-4 bg-bg-warm/25 text-center">
                <span className="text-[10px] text-ink-3 uppercase font-semibold block">Total Rows Analyzed</span>
                <strong className="text-2xl font-bold text-ink block mt-1">{excelRows.length}</strong>
              </div>
              <div className="border border-border-custom rounded-xl p-4 bg-good-bg/25 text-center">
                <span className="text-[10px] text-good uppercase font-semibold block">Unique valid items</span>
                <strong className="text-2xl font-bold text-good block mt-1">{validCount}</strong>
              </div>
              <div className="border border-border-custom rounded-xl p-4 bg-warn-bg/25 text-center">
                <span className="text-[10px] text-warn uppercase font-semibold block">Sheet Duplicates</span>
                <strong className="text-2xl font-bold text-warn block mt-1">{innerDuplicates.length}</strong>
              </div>
            </div>

            {/* Warning regarding duplicate contract actions */}
            {innerDuplicates.length > 0 && (
              <div className="flex items-start gap-3 border border-border-custom bg-warn-bg/10 rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-2">
                <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-ink font-semibold">Row Duplication Warning:</strong>
                  <span className="block mt-0.5">
                    We detected <strong className="text-ink">{innerDuplicates.length} contract duplicate(s)</strong> within this file. The engine will automatically skip duplicates to guarantee database isolation integrity.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Commit Actions buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 h-9 px-4 border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 rounded-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleCommitImport}
              disabled={commitLoading}
              className="flex items-center gap-1.5 h-9 px-4 bg-accent-custom hover:bg-accent-ink text-surface text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-75"
            >
              {commitLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing transactional inserts...</span>
                </>
              ) : (
                <>
                  <span>Commit Allocations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 4: COMMIT LOG SUMMARY ==================== */}
      {step === 4 && importSummary && (
        <div className="space-y-6 animate-scale-up">
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div className="text-center space-y-2 select-none">
              <CheckCircle className="w-10 h-10 text-good mx-auto" />
              <h3 className="text-base font-semibold text-ink">Allocation Sheet Imported Successfully</h3>
              <p className="text-xs text-ink-3">Filename logged: {importSummary.filename}</p>
            </div>

            {/* Commit statistics indicators */}
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bg-warm/15">
                <span className="text-[9.5px] uppercase font-semibold text-ink-3 block">Total Sheet Rows</span>
                <strong className="text-xl font-bold font-mono text-ink block mt-1">{importSummary.totalRows}</strong>
              </div>
              <div className="border border-border-custom rounded-xl p-3.5 text-center bg-good-bg/15">
                <span className="text-[9.5px] uppercase font-semibold text-good block">Successfully Imported</span>
                <strong className="text-xl font-bold font-mono text-good block mt-1">{importSummary.imported}</strong>
              </div>
              <div className="border border-border-custom rounded-xl p-3.5 text-center bg-warn-bg/15">
                <span className="text-[9.5px] uppercase font-semibold text-warn block">Skipped Duplicates</span>
                <strong className="text-xl font-bold font-mono text-warn block mt-1">{importSummary.skippedDuplicates}</strong>
              </div>
              <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bad-bg/15">
                <span className="text-[9.5px] uppercase font-semibold text-bad block">Failed / Schema Errors</span>
                <strong className="text-xl font-bold font-mono text-bad block mt-1">{importSummary.failed}</strong>
              </div>
            </div>

            {/* Error detail list */}
            {importSummary.errors.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border-custom">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs uppercase font-semibold text-ink-2">Detailed Skip / Fail Logs ({importSummary.errors.length})</h4>
                  <button
                    onClick={downloadErrorLogs}
                    className="flex items-center gap-1 h-7 px-2.5 rounded bg-bg-warm hover:bg-border-custom border border-border-custom text-[11px] font-semibold text-ink-2 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-accent-custom" />
                    <span>Download Log Report (CSV)</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-border-custom rounded-lg divide-y divide-border-custom/50 bg-bg-warm/5">
                  {importSummary.errors.map((err, idx) => (
                    <div key={idx} className="flex gap-4 p-2.5 text-[12px] hover:bg-bg-warm/10 transition-colors">
                      <span className="font-semibold text-ink-3 block w-16 flex-shrink-0">Row {err.row_number}</span>
                      <p className="text-bad font-medium leading-normal">{err.error_reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Final home navigation buttons */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                setFilename("");
                setExcelRows([]);
                setExcelHeaders([]);
                setMappings({});
                setImportSummary(null);
                setStep(1);
              }}
              className="h-9 px-6 bg-ink hover:bg-black text-surface text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Upload another sheet
            </button>
          </div>
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}
