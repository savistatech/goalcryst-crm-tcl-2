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
  { key: "contract_no", label: "Contract No", required: true, type: "string", aliases: ["contract_no", "contract no", "agreement no", "agreement_no", "lan", "loan account number"] },
  { key: "customer_name", label: "Customer Name", required: true, type: "string", aliases: ["customer_name", "customer name", "client name", "borrower name", "name"] },
  { key: "product", label: "Product", required: false, type: "string", aliases: ["product", "product_class", "product type"] },
  { key: "branch", label: "Branch", required: false, type: "string", aliases: ["branch", "branch name", "location", "branch_name"] },
  { key: "state", label: "State", required: false, type: "string", aliases: ["state", "state_name", "customer state"] },
  { key: "area", label: "Area", required: false, type: "string", aliases: ["area", "customer area"] },
  { key: "region", label: "Region", required: false, type: "string", aliases: ["region", "customer region"] },
  { key: "secured_category", label: "Secured Category", required: false, type: "string", aliases: ["secured category", "secured_category"] },
  { key: "allocation_category", label: "Allocation Category", required: false, type: "string", aliases: ["allocation category", "allocation_category"] },
  { key: "bom_dpd", label: "BOM DPD", required: false, type: "number", aliases: ["bom dpd", "bom_dpd", "dpd"] },
  { key: "mob", label: "MOB", required: false, type: "number", aliases: ["mob", "months on book"] },
  { key: "bucket", label: "Bucket", required: false, type: "string", aliases: ["bucket"] },
  { key: "bom_bucket", label: "BOM Bucket", required: false, type: "string", aliases: ["bom bucket", "bom_bucket"] },
  { key: "secured_product_flag", label: "Secured Product Flag", required: false, type: "string", aliases: ["secured product flag", "secured_product_flag"] },
  { key: "product_detail", label: "Product Detail", required: false, type: "string", aliases: ["product detail", "product_detail"] },
  { key: "allocation_dpd_category", label: "Allocation DPD Category", required: false, type: "string", aliases: ["allocation dpd category", "allocation_dpd_category"] },

  // Contacts
  { key: "mobile_1", label: "Contact No 1 - Mobile 1", required: false, type: "string", aliases: ["contact no 1 - mobile 1", "mobile 1", "mobile_1", "phone"] },
  { key: "mobile_no", label: "Contact No 2 - Mobile No", required: false, type: "string", aliases: ["contact no 2 - mobile no", "mobile 2", "mobile_no"] },
  { key: "primary_mobile", label: "Contact No 3 - Primary Mobile", required: false, type: "string", aliases: ["contact no 3 - primary mobile", "primary mobile", "primary_mobile"] },
  { key: "ref_name_1", label: "Reference Name 1", required: false, type: "string", aliases: ["reference name 1", "ref name 1", "ref_name_1"] },
  { key: "ref_mobile_1", label: "Contact No 4 - Reference Mobile 1", required: false, type: "string", aliases: ["contact no 4 - reference mobile 1", "contact no 7 - reference mobile 1", "reference mobile 1", "ref_mobile_1"] },
  { key: "ref_name_2", label: "Reference Name 2", required: false, type: "string", aliases: ["reference name 2", "ref name 2", "ref_name_2"] },
  { key: "ref_mobile_2", label: "Contact No 5 - Reference Mobile 2", required: false, type: "string", aliases: ["contact no 5 - reference mobile 2", "reference mobile 2", "ref_mobile_2"] },
  { key: "base_address", label: "Address 1 - Base Address", required: false, type: "string", aliases: ["address 1 - base address", "base address", "base_address"] },
  { key: "landmark", label: "Landmark", required: false, type: "string", aliases: ["landmark"] },
  { key: "pincode", label: "Pincode", required: false, type: "string", aliases: ["pincode", "zip", "postal code"] },
  { key: "permanent_address", label: "Address 2 - Permanent Address", required: false, type: "string", aliases: ["address 2 - permanent address", "permanent address", "permanent_address"] },
  { key: "office_address", label: "Address 3 - Office Address", required: false, type: "string", aliases: ["address 3 - office address", "office address", "office_address"] },
  { key: "finnone_address", label: "Address 4 - Finnone Address", required: false, type: "string", aliases: ["address 4 - finnone address", "finnone address", "finnone_address"] },
  { key: "primary_mobile_1", label: "Contact No 3 - Primary Mobile 1", required: false, type: "string", aliases: ["contact no 3 - primary mobile 1", "primary mobile 1", "primary_mobile_1"] },
  { key: "primary_mobile_2", label: "Contact No 4 - Primary Mobile 2", required: false, type: "string", aliases: ["contact no 4 - primary mobile 2", "primary mobile 2", "primary_mobile_2"] },
  { key: "mobile_no_2", label: "Contact No 5 - Mobile No", required: false, type: "string", aliases: ["contact no 5 - mobile no", "mobile no 2", "mobile_no_2"] },
  { key: "latest_contact_no", label: "Contact No 6 - Latest Contact No", required: false, type: "string", aliases: ["contact no 6 - latest contact no", "latest contact no", "latest_contact_no"] },
  { key: "ref_relation_1", label: "Reference Relationship 1", required: false, type: "string", aliases: ["reference relationship 1", "ref relation 1", "ref_relation_1"] },
  { key: "ref_relation_2", label: "Reference Relationship 2", required: false, type: "string", aliases: ["reference relationship 2", "ref relation 2", "ref_relation_2"] },
  { key: "master_primary_address", label: "Address 2 - Master Primary Address", required: false, type: "string", aliases: ["address 2 - master primary address", "master primary address", "master_primary_address"] },
  { key: "permanent_address_2", label: "Address 3 - Permanent Address", required: false, type: "string", aliases: ["address 3 - permanent address", "permanent_address_2"] },
  { key: "secondary_address", label: "Address 5 - Secondary Address", required: false, type: "string", aliases: ["address 5 - secondary address", "secondary address", "secondary_address"] },
  { key: "office_address_2", label: "Address 6 - Office Address", required: false, type: "string", aliases: ["address 6 - office address", "office_address_2"] },
  { key: "additional_address", label: "Address 7 - Additional Address", required: false, type: "string", aliases: ["address 7 - additional address", "additional address", "additional_address"] },
  { key: "residential_address", label: "Address 8 - Residential Address", required: false, type: "string", aliases: ["address 8 - residential address", "residential address", "residential_address"] },
  { key: "ref_full_address_1", label: "Address 9 - Reference Full Address 1", required: false, type: "string", aliases: ["address 9 - reference full address 1", "ref full address 1", "ref_full_address_1"] },
  { key: "ref_full_address_2", label: "Address 10 - Reference Full Address 2", required: false, type: "string", aliases: ["address 10 - reference full address 2", "ref full address 2", "ref_full_address_2"] },
  { key: "pdpr_address", label: "Address 11 - PDPR Address", required: false, type: "string", aliases: ["address 11 - pdpr address", "pdpr address", "pdpr_address"] },

  // Assets
  { key: "manufacturer", label: "Manufacturer", required: false, type: "string", aliases: ["manufacturer"] },
  { key: "asset_model", label: "Asset Model", required: false, type: "string", aliases: ["asset model", "asset_model"] },
  { key: "rc_number", label: "RC Number", required: false, type: "string", aliases: ["rc number", "rc_number"] },
  { key: "manufacturer_2", label: "Manufacturer 2", required: false, type: "string", aliases: ["manufacturer 2", "manufacturer_2"] },
  { key: "asset_category", label: "Asset Category", required: false, type: "string", aliases: ["asset category", "asset_category"] },
  { key: "asset_variant", label: "Asset Variant", required: false, type: "string", aliases: ["asset variant", "asset_variant"] },
  { key: "engine_number", label: "Engine Number", required: false, type: "string", aliases: ["engine number", "engine_number"] },
  { key: "chassis_number", label: "Chassis Number", required: false, type: "string", aliases: ["chassis number", "chassis_number"] },
  { key: "year_of_manufacture", label: "Year of Manufacture", required: false, type: "string", aliases: ["year of manufacture", "year_of_manufacture"] },

  // Financials
  { key: "finance_amount", label: "Finance Amount", required: false, type: "number", aliases: ["finance amount", "finance_amount"] },
  { key: "total_pos_outstanding", label: "Total POS Outstanding", required: false, type: "number", aliases: ["total pos outstanding", "total_pos_outstanding"] },
  { key: "pos", label: "POS", required: false, type: "number", aliases: ["pos"] },
  { key: "total_amount_collectable", label: "Total Amount Collectable", required: false, type: "number", aliases: ["total amount collectable", "total_amount_collectable"] },
  { key: "sale_price", label: "Sale Price", required: false, type: "number", aliases: ["sale price", "sale_price"] },
  { key: "emi_amount", label: "EMI Amount", required: false, type: "number", aliases: ["emi amount", "emi_amount", "emi"] },
  { key: "od_amount", label: "OD Amount", required: false, type: "number", aliases: ["od amount", "od_amount"] },
  { key: "principal_overdue", label: "Principal Overdue", required: false, type: "number", aliases: ["principal overdue", "principal_overdue"] },
  { key: "interest_overdue", label: "Interest Overdue", required: false, type: "number", aliases: ["interest overdue", "interest_overdue"] },
  { key: "bounce_charges", label: "Bounce Charges", required: false, type: "number", aliases: ["bounce charges", "bounce_charges"] },
  { key: "current_odc", label: "Current ODC", required: false, type: "number", aliases: ["current odc", "current_odc"] },
  { key: "total_outstanding", label: "Total Outstanding", required: false, type: "number", aliases: ["total outstanding", "total_outstanding"] },
  { key: "ots_amount", label: "OTS Amount", required: false, type: "number", aliases: ["ots amount", "ots_amount"] },
  { key: "pos_waiver_amount", label: "POS Waiver Amount", required: false, type: "number", aliases: ["pos waiver amount", "pos_waiver_amount"] },
  { key: "pos_waiver_percent", label: "POS Waiver %", required: false, type: "number", aliases: ["pos waiver %", "pos waiver percent", "pos_waiver_percent"] },

  // Legal
  { key: "notice_sent_sec138", label: "Notice Sent in Sec 138", required: false, type: "string", aliases: ["notice sent in sec 138", "notice sent sec138", "notice_sent_sec138"] },
  { key: "type_of_case", label: "Type of Case", required: false, type: "string", aliases: ["type of case", "type_of_case"] },
  { key: "cheque_amount", label: "Cheque Amount", required: false, type: "number", aliases: ["cheque amount", "cheque_amount"] },
  { key: "cheque_date", label: "Cheque Date", required: false, type: "string", aliases: ["cheque date", "cheque_date"] },
  { key: "cheque_no", label: "Cheque No", required: false, type: "string", aliases: ["cheque no", "cheque_no"] },
  { key: "sec138_current_status", label: "Sec 138 Current Status", required: false, type: "string", aliases: ["sec 138 current status", "sec138_current_status"] },
  { key: "group_stage", label: "Group Stage", required: false, type: "string", aliases: ["group stage", "group_stage"] },
  { key: "case_no", label: "Case No", required: false, type: "string", aliases: ["case no", "case_no"] },
  { key: "court_location", label: "Court Location", required: false, type: "string", aliases: ["court location", "court_location"] },
  { key: "court_name", label: "Court Name", required: false, type: "string", aliases: ["court name", "court_name"] },
  { key: "ldoh", label: "LDOH", required: false, type: "string", aliases: ["ldoh"] },
  { key: "ndoh", label: "NDOH", required: false, type: "string", aliases: ["ndoh"] },
  { key: "advocate", label: "Advocate", required: false, type: "string", aliases: ["advocate"] },
  { key: "hand_summons", label: "Hand Summons", required: false, type: "string", aliases: ["hand summons", "hand_summons"] },
  { key: "hand_warrant_1", label: "Hand Warrant 1", required: false, type: "string", aliases: ["hand warrant 1", "hand_warrant_1"] },
  { key: "proclamation_orders", label: "Proclamation Orders", required: false, type: "string", aliases: ["proclamation orders", "proclamation_orders"] },
  { key: "lrn_status", label: "LRN Status", required: false, type: "string", aliases: ["lrn status", "lrn_status"] },
  { key: "lrn_date", label: "LRN Date", required: false, type: "string", aliases: ["lrn date", "lrn_date"] },
  { key: "arb", label: "ARB", required: false, type: "string", aliases: ["arb"] },
  { key: "sec17_orders_date", label: "Sec 17 Orders Date", required: false, type: "string", aliases: ["sec 17 orders date", "sec17_orders_date"] },
  { key: "award_date", label: "Award Date", required: false, type: "string", aliases: ["award date", "award_date"] },
  { key: "ep_stage", label: "EP Stage", required: false, type: "string", aliases: ["ep stage", "ep_stage"] },
  { key: "ep_ldoh", label: "EP LDOH", required: false, type: "string", aliases: ["ep ldoh", "ep_ldoh"] },
  { key: "ep_ndoh", label: "EP NDOH", required: false, type: "string", aliases: ["ep ndoh", "ep_ndoh"] },
  { key: "ep_case_no", label: "EP Case No", required: false, type: "string", aliases: ["ep case no", "ep_case_no"] },
  { key: "ep_advocate", label: "EP Advocate", required: false, type: "string", aliases: ["ep advocate", "ep_advocate"] },
  { key: "termination_status_sa", label: "Termination Status / SA", required: false, type: "string", aliases: ["termination status / sa", "termination status sa", "termination_status_sa"] },
  { key: "lrn_prn_status", label: "LRN/PRN Status", required: false, type: "string", aliases: ["lrn/prn status", "lrn prn status", "lrn_prn_status"] },
  { key: "lrn_prn_issue_date", label: "LRN/PRN Issue Date", required: false, type: "string", aliases: ["lrn/prn issue date", "lrn prn issue date", "lrn_prn_issue_date"] },
  { key: "lrn_prn_link", label: "LRN/PRN Link", required: false, type: "string", aliases: ["lrn/prn link", "lrn prn link", "lrn_prn_link"] },
  { key: "cnr_number_cc", label: "CNR Number CC", required: false, type: "string", aliases: ["cnr number cc", "cnr_number_cc"] },
  { key: "cnr_number_pcr", label: "CNR Number PCR", required: false, type: "string", aliases: ["cnr number pcr", "cnr_number_pcr"] },
  { key: "current_stage", label: "Current Stage", required: false, type: "string", aliases: ["current stage", "current_stage"] },
  { key: "filed_location", label: "Filed Location", required: false, type: "string", aliases: ["filed location", "filed_location"] },
  { key: "court_hall", label: "Court Hall", required: false, type: "string", aliases: ["court hall", "court_hall"] },
  { key: "hand_s_nbw_bw_pc", label: "Hand S/NBW/BW/PC", required: false, type: "string", aliases: ["hand s/nbw/bw/pc", "hand s nbw bw pc", "hand_s_nbw_bw_pc"] },
  { key: "hand_s_nbw_bw_pc_type", label: "Hand S/NBW/BW/PC Type", required: false, type: "string", aliases: ["hand s/nbw/bw/pc type", "hand s nbw bw pc type", "hand_s_nbw_bw_pc_type"] },
  { key: "claim_amount", label: "Claim Amount", required: false, type: "number", aliases: ["claim amount", "claim_amount"] },
  { key: "arbitration_group_stage", label: "Arbitration Group Stage", required: false, type: "string", aliases: ["arbitration group stage", "arbitration_group_stage"] },
  { key: "sec17_orders", label: "Sec 17 Orders", required: false, type: "string", aliases: ["sec 17 orders", "sec17_orders"] },
  { key: "sec17_date", label: "Sec 17 Date", required: false, type: "string", aliases: ["sec 17 date", "sec17_date"] },
  { key: "court_bench", label: "Court Bench", required: false, type: "string", aliases: ["court bench", "court_bench"] },
  { key: "ep_pdoh", label: "EP PDOH", required: false, type: "string", aliases: ["ep pdoh", "ep_pdoh"] },
  { key: "legal_status", label: "Legal Status", required: false, type: "string", aliases: ["legal status", "legal_status"] }
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
