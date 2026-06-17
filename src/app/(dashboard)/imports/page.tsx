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

type ImportStep = 1 | 2 | 3;

interface FieldDefinition {
  key: keyof ImportRow;
  label: string;
  required: boolean;
  type: "string" | "number";
  aliases: string[];
}

const TARGET_FIELDS: FieldDefinition[] = [
  // Base
  { key: "contract_no", label: "Contract No.", required: true, type: "string", aliases: ["contract no.", "contract no"] },
  { key: "customer_name", label: "Name of the Borrower", required: true, type: "string", aliases: ["name of the borrower"] },
  { key: "group_code", label: "Group Code", required: false, type: "string", aliases: ["group code"] },
  { key: "company_code", label: "COMPANY_CODE", required: false, type: "string", aliases: ["company_code", "company code"] },
  { key: "vendor", label: "Vendor", required: false, type: "string", aliases: ["vendor"] },
  { key: "allocated_in_rsc", label: "Allocated in RSC", required: false, type: "string", aliases: ["allocated in rsc", "allocated_in_rsc"] },
  { key: "allocate_date_bif", label: "Allocate Date Bif", required: false, type: "string", aliases: ["allocate date bif", "allocate_date_bif"] },
  { key: "updated_vintage", label: "Updated Vintage", required: false, type: "string", aliases: ["updated vintage", "updated_vintage"] },
  { key: "band", label: "Band", required: false, type: "string", aliases: ["band"] },
  { key: "loan_agreement_date", label: "Loan Agreement Date", required: false, type: "string", aliases: ["loan agreement date", "loan_agreement_date"] },
  { key: "loan_tenure_from", label: "Loan Tenure from date", required: false, type: "string", aliases: ["loan tenure from date", "loan_tenure_from"] },
  { key: "loan_tenure_to", label: "Loan Tenure to date", required: false, type: "string", aliases: ["loan tenure to date", "loan_tenure_to"] },
  { key: "product_group", label: "Product Group", required: false, type: "string", aliases: ["product group", "product_group"] },
  { key: "region", label: "REGION", required: false, type: "string", aliases: ["region"] },
  { key: "state", label: "State", required: false, type: "string", aliases: ["state"] },
  { key: "branch", label: "BRANCH", required: false, type: "string", aliases: ["branch"] },
  { key: "zone", label: "Zone", required: false, type: "string", aliases: ["zone"] },
  { key: "new_region", label: "New Region", required: false, type: "string", aliases: ["new region", "new_region"] },

  // Contact fields
  { key: "borrower_address", label: "Address of the Borrower", required: false, type: "string", aliases: ["address of the borrower"] },
  { key: "borrower_phone_1", label: "Borrower Phone Number 1", required: false, type: "string", aliases: ["borrower phone number 1"] },
  { key: "borrower_phone_2", label: "Borrower Phone Number 2", required: false, type: "string", aliases: ["borrower phone number 2"] },
  { key: "borrower_mobile", label: "Borrower Mobile Number", required: false, type: "string", aliases: ["borrower mobile number"] },
  { key: "co_borrower_name", label: "Name of the Co-Borrower", required: false, type: "string", aliases: ["name of the co-borrower", "name of the coborrower"] },
  { key: "co_borrower_address", label: "Address of the Co-Borrower", required: false, type: "string", aliases: ["address of the co-borrower", "address of the coborrower"] },
  { key: "co_borrower_phone_1", label: "Co-Borrower Phone Number 1", required: false, type: "string", aliases: ["co-borrower phone number 1", "coborrower phone number 1"] },
  { key: "co_borrower_phone_2", label: "Co-Borrower Phone Number 2", required: false, type: "string", aliases: ["co-borrower phone number 2", "coborrower phone number 2"] },
  { key: "co_borrower_mobile", label: "Co-Borrower Mobile Number", required: false, type: "string", aliases: ["co-borrower mobile number", "coborrower mobile number"] },
  { key: "guarantor_name", label: "Name of the Guarantor", required: false, type: "string", aliases: ["name of the guarantor"] },
  { key: "guarantor_address", label: "Address of the Guarantor", required: false, type: "string", aliases: ["address of the guarantor"] },
  { key: "guarantor_phone_1", label: "Guarantor Phone Number 1", required: false, type: "string", aliases: ["guarantor phone number 1"] },
  { key: "guarantor_phone_2", label: "Guarantor Phone Number 2", required: false, type: "string", aliases: ["guarantor phone number 2"] },
  { key: "guarantor_mobile", label: "Guarantor Mobile Number", required: false, type: "string", aliases: ["guarantor mobile number"] },

  // Financial fields
  { key: "loan_amount", label: "Loan Amount", required: false, type: "number", aliases: ["loan amount", "loan_amount"] },
  { key: "sale_price", label: "Sale Price", required: false, type: "number", aliases: ["sale price", "sale_price"] },
  { key: "sale_date", label: "Sale Date", required: false, type: "string", aliases: ["sale date", "sale_date"] },
  { key: "lsa_val_apr26", label: "LSA Val Apr'26", required: false, type: "number", aliases: ["lsa val apr26", "lsa val apr 26"] },
  { key: "abnc", label: "ABNC", required: false, type: "string", aliases: ["abnc"] },
  { key: "abnc_amt", label: "ABNC Amt", required: false, type: "number", aliases: ["abnc amt", "abnc_amt"] },
  { key: "agging", label: "Agging", required: false, type: "string", aliases: ["agging"] },

  // Asset fields
  { key: "registration_number", label: "Ragistration Number", required: false, type: "string", aliases: ["ragistration number", "registration number"] },
  { key: "material", label: "material", required: false, type: "string", aliases: ["material"] },
  { key: "product_disp", label: "Product Disp", required: false, type: "string", aliases: ["product disp", "product_disp"] },
  { key: "engine_number", label: "Engine no.", required: false, type: "string", aliases: ["engine no.", "engine no"] },
  { key: "chassis_number", label: "Chassis no.", required: false, type: "string", aliases: ["chassis no.", "chassis no"] },
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
  const [commitProgress, setCommitProgress] = useState(0);
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
        const wb = XLSX.read(bstr, { type: "binary", cellText: true, raw: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Parse raw data to find the actual header row
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length === 0) {
          alert("Excel file appears to be completely empty.");
          return;
        }

        // Find which row contains the headers (look for 'Contract No' or 'Customer Name' in first 10 rows)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const rowValues = data[i].map(h => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
          if (rowValues.includes("contractno") || rowValues.includes("customername")) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = data[headerRowIndex].map(h => String(h || "").trim()).filter(Boolean);
        const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, raw: false }) as any[];

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

        // Auto validate using initialMappings
        const missingRequired = TARGET_FIELDS.filter(f => f.required && !initialMappings[f.key]);
        if (missingRequired.length > 0) {
          alert(`File is missing required columns: ${missingRequired.map(f => f.label).join(", ")}`);
          return;
        }

        const contractNoHeader = initialMappings["contract_no"];
        const seenContracts = new Set<string>();
        const dupes: string[] = [];
        let valid = 0;

        rows.forEach(row => {
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
        setStep(2); // Skip mapping step, go directly to validation summary
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file. Verify file format and try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
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
            if (typeof val === 'string') {
              const cleanVal = val.replace(/,/g, '');
              item[field.key] = cleanVal ? Number(cleanVal) : 0;
            } else {
              item[field.key] = val !== undefined && val !== null ? Number(val) : 0;
            }
          } else {
            item[field.key] = val !== undefined && val !== null ? String(val).trim() : "";
          }
        });
        return item as ImportRow;
      });

      let currentBatchId = "";
      let aggregatedSummary: ImportSummary | null = null;
      const CHUNK_SIZE = 1000;
      const totalChunks = Math.ceil(formattedRows.length / CHUNK_SIZE);
      let chunksCompleted = 0;

      for (let i = 0; i < formattedRows.length; i += CHUNK_SIZE) {
        const chunk = formattedRows.slice(i, i + CHUNK_SIZE);
        const result = await commitImportBatch(filename, chunk, currentBatchId || undefined, i === 0 ? formattedRows.length : undefined);
        currentBatchId = result.batchId;

        chunksCompleted++;
        setCommitProgress(Math.round((chunksCompleted / totalChunks) * 100));

        if (!aggregatedSummary) {
          aggregatedSummary = { ...result, totalRows: formattedRows.length };
        } else {
          aggregatedSummary.imported += result.imported;
          aggregatedSummary.newContracts = (aggregatedSummary.newContracts || 0) + result.newContracts;
          aggregatedSummary.updatedContracts = (aggregatedSummary.updatedContracts || 0) + result.updatedContracts;
          aggregatedSummary.skippedDuplicates += result.skippedDuplicates;
          aggregatedSummary.failed += result.failed;
          aggregatedSummary.errors.push(...result.errors);
        }
      }

      setImportSummary(aggregatedSummary);
      setStep(3);
    } catch (err: any) {
      alert("Error saving data: " + err.message);
    } finally {
      setCommitLoading(false);
      setCommitProgress(0);
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

  // Download XLSX template dynamically based on TARGET_FIELDS
  const downloadTemplate = () => {
    const headers = TARGET_FIELDS.map(f => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upload_Template");
    XLSX.writeFile(wb, "GoalCryst_Import_Template.xlsx");
  };

  return (
    <PermissionGuard permission="can_upload_excel">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header title */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="font-brand">GoalCryst CRM</span>
              <span>·</span>
              <span>Data</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
              Bulk Import
            </h1>
            <p className="text-[13px] text-ink-2 mt-1">
              Upload Excel files to assign accounts.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-surface border border-border-custom text-[13.5px] font-medium text-ink hover:bg-bg-warm transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-custom" />
            <span>Download Template</span>
          </button>
        </div>

        {/* ===== STEP INDICATOR BAR ===== */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: "Upload Sheets" },
            { num: 2, label: "Validate Data" },
            { num: 3, label: "Save Contracts" }
          ].map((item) => {
            const isActive = step === item.num;
            const isDone = step > item.num;
            return (
              <div
                key={item.num}
                className={`pb-2.5 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all ${isActive
                    ? "border-accent-custom text-accent-custom"
                    : isDone
                      ? "border-ink text-ink"
                      : "border-border-custom text-ink-3"
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold ${isActive ? "bg-accent-custom text-surface" : isDone ? "bg-ink text-surface" : "bg-border-custom text-ink-3"
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
                <strong className="text-ink font-semibold">Smart Upsert Enabled:</strong>
                <span className="block mt-0.5">
                  Re-uploading an existing Excel sheet will automatically update contract data (financials, contacts, legal, assets) while preserving all employee call logs, dispositions, and waiver history.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: VALIDATION ==================== */}
        {step === 2 && (
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

              {/* Info notice about upsert behavior */}
              <div className="flex items-start gap-3 border border-border-custom bg-surface rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-2">
                <HelpCircle className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-ink">Existing contracts will be updated,</strong> not duplicated. New contracts will be inserted fresh. Employee call histories and waivers are never touched by this operation.
                </span>
              </div>

              {innerDuplicates.length > 0 && (
                <div className="flex items-start gap-3 border border-border-custom bg-warn-bg/10 rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-2">
                  <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-ink font-semibold">Row Duplication Warning:</strong>
                    <span className="block mt-0.5">
                     We detected <strong className="text-ink">{innerDuplicates.length} contract duplicate(s)</strong> within this file. Only the first occurrence of each contract will be processed — subsequent duplicates within the same sheet will be skipped.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Save Actions buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setExcelRows([]);
                  setExcelHeaders([]);
                  setMappings({});
                  setStep(1);
                }}
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
                    <span>Preparing data...</span>
                  </>
                ) : (
                  <>
                    <span>Save Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: SAVE LOG SUMMARY ==================== */}
        {step === 3 && importSummary && (
          <div className="space-y-6 animate-scale-up">
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
              <div className="text-center space-y-2 select-none">
                <CheckCircle className="w-10 h-10 text-good mx-auto" />
                <h3 className="text-base font-semibold text-ink">Allocation Sheet Imported Successfully</h3>
                <p className="text-xs text-ink-3">Filename logged: {importSummary.filename}</p>
              </div>

              {/* Save statistics indicators */}
              <div className="grid grid-cols-5 gap-3">
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bg-warm/15">
                  <span className="text-[9.5px] uppercase font-semibold text-ink-3 block">Total Rows</span>
                  <strong className="text-xl font-bold font-mono text-ink block mt-1">{importSummary.totalRows}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-good-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-good block">New Contracts</span>
                  <strong className="text-xl font-bold font-mono text-good block mt-1">{importSummary.newContracts ?? 0}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-blue-50">
                  <span className="text-[9.5px] uppercase font-semibold text-blue-600 block">Updated</span>
                  <strong className="text-xl font-bold font-mono text-blue-600 block mt-1">{importSummary.updatedContracts ?? 0}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-warn-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-warn block">Sheet Duplicates</span>
                  <strong className="text-xl font-bold font-mono text-warn block mt-1">{importSummary.skippedDuplicates}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bad-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-bad block">Failed</span>
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

        {/* ==================== MODAL: PROGRESS OVERLAY ==================== */}
        {commitLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-accent-custom mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-ink">Saving Data...</h3>
                <p className="text-xs text-ink-3 mt-1">Please do not close or refresh this page. Your records are being securely inserted into the database.</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-semibold text-ink uppercase tracking-wider">
                  <span>Progress</span>
                  <span className="font-mono text-accent-custom text-sm">{commitProgress}%</span>
                </div>
                <div className="w-full h-2 bg-bg-warm rounded-full overflow-hidden border border-border-custom/50">
                  <div
                    className="h-full bg-accent-custom transition-all duration-300 ease-out"
                    style={{ width: `${commitProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
}
