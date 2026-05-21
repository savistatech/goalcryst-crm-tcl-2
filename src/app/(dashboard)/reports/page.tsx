"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { getReportData } from "@/app/actions/reportActions";
import PermissionGuard from "@/components/PermissionGuard";
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  Scale,
  ShieldCheck,
  Timer,
  BookOpen
} from "lucide-react";

interface ReportDef {
  id: string;
  name: string;
  category: "operations" | "compliance" | "legal" | "financial";
  desc: string;
  columns: string[];
  icon: any;
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const reports: ReportDef[] = [
    {
      id: "portfolio_allocation",
      name: "Portfolio Allocation Summary",
      category: "operations",
      desc: "Aggregated outstanding summaries, contract assignments, product codes, and locations.",
      columns: ["Contract No", "Customer Name", "Product", "Branch", "State", "BOM DPD", "Bucket", "Total Outstanding"],
      icon: TrendingUp
    },
    {
      id: "dial_log",
      name: "Action Attempt / Dial Log Report",
      category: "operations",
      desc: "Comprehensive timelines of operator call attempts, dispos main/sub categories, and notes.",
      columns: ["Contract No", "Date Logged", "Agent Name", "Calling Outcome", "Sub Category", "Remarks"],
      icon: Timer
    },
    {
      id: "ptp_conversion",
      name: "PTP Conversion & Commitment Report",
      category: "financial",
      desc: "Future collections promise-to-pay commitment amounts, scheduled dates, and agents.",
      columns: ["Contract No", "Date Scheduled", "Promise Date", "Promise Amount", "Agent Name"],
      icon: Coins
    },
    {
      id: "mtd_collection",
      name: "MTD Collection & Receipting Report",
      category: "financial",
      desc: "Logs of part-paid collected sums, payment date coordinates, and receipt reference verification codes.",
      columns: ["Contract No", "Payment Date", "Collected Amount", "UTR / Receipt Reference", "Agent Name"],
      icon: CheckCircle
    },
    {
      id: "waiver_requests",
      name: "Settlement Discount Waiver Report",
      category: "compliance",
      desc: "Audit logs of settlement discount waiver request logs raised by agents and reviewed by managers.",
      columns: ["Contract No", "Date Raised", "Total Outstanding", "Waiver Requested", "Final Customer Payable", "Waiver Reason", "Status", "Agent Name"],
      icon: ShieldCheck
    },
    {
      id: "legal_sec138",
      name: "Legal Litigation Sec 138 Cases",
      category: "legal",
      desc: "Section 138 cheque bounce lawsuit schedules, court houses, cheque values, and advocates.",
      columns: ["Contract No", "Case Number", "Cheque No", "Cheque Amount", "Court Name", "Court Location", "Advocate In-charge", "Legal Status"],
      icon: Scale
    },
    {
      id: "audit_logs",
      name: "Gated Access Compliance Audit Log",
      category: "compliance",
      desc: "Security tracking timeline auditing operator activities, bulk imports, and authorization changes.",
      columns: ["Timestamp", "Operator", "Action Event", "Entity Reference", "Metadata Details"],
      icon: ShieldCheck
    },
    {
      id: "agent_productivity",
      name: "Agent Calling Productivity Report",
      category: "operations",
      desc: "Calculations of daily logged attempt frequencies, call times, and contact connection rates.",
      columns: ["Agent Name", "Total Allocations", "Calls Logged", "Connected Rate", "PTP Promises"],
      icon: BookOpen
    },
    {
      id: "bucket_aging",
      name: "Bucket DPD Aging Distribution Report",
      category: "operations",
      desc: "Overview comparing contract frequencies and totals outstanding grouped strictly by aging buckets B0 to B5.",
      columns: ["Bucket DPD", "Cases Count", "Total Outstanding", "Average BOM DPD"],
      icon: FileSpreadsheet
    },
    {
      id: "branch_performance",
      name: "Branch Collections Performance",
      category: "financial",
      desc: "Comparisons of collectable outstanding balances and monthly recovery ratios across branches.",
      columns: ["Branch Name", "Outstanding Balance", "MTD Collected Sum", "Collection Ratios"],
      icon: FileSpreadsheet
    },
    {
      id: "regional_outstanding",
      name: "Regional/State Outstanding Summary",
      category: "financial",
      desc: "Outstandings distribution and collections metrics partitioned strictly by state regions.",
      columns: ["State Region", "Total Outstanding", "Active Customer Count"],
      icon: FileSpreadsheet
    },
    {
      id: "asset_collateral",
      name: "Vehicle Asset Collateral Inventory",
      category: "operations",
      desc: "Manufacturer models, engine numbers, chassis coordinates, and RC registration codes.",
      columns: ["Contract No", "Manufacturer", "Asset Model", "RC Registration", "Engine Number"],
      icon: FileSpreadsheet
    },
    {
      id: "skip_logs",
      name: "Skipped Duplicate Allocation Report",
      category: "compliance",
      desc: "Safety skip summaries logging files duplicate contract codes safely skipped during Excel imports.",
      columns: ["Batch Reference", "Row Number", "Duplicate Contract No", "Import Date"],
      icon: ShieldCheck
    },
    {
      id: "litigation_ep",
      name: "Execution Petition (EP) Case Hearings",
      category: "legal",
      desc: "Hearing timelines, next dates (NDOH), advocate names, and ep stages for pending EP lawsuits.",
      columns: ["Contract No", "EP Case Number", "Court Bench", "EP Stage", "NDOH Date"],
      icon: Scale
    }
  ];

  const filteredReports = reports.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async (r: ReportDef) => {
    setExportingId(r.id);
    try {
      // 1. Fetch live database records via our Server Action
      const data = await getReportData(r.id);

      // 2. Generate worksheet using SheetJS
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Exported Data");

      // 3. Trigger styled download instantly in browser
      XLSX.writeFile(wb, `GoalCryst_${r.id}_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error compiling spreadsheet data: " + err);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <PermissionGuard permission="can_view_reports">
      <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>GoalCryst CRM</span>
          <span>·</span>
          <span>Reporting & BI Center</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Standard Recovery Reports
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Export portfolio allocations, call dialers, PTP follow-ups, litigations, and compliance logs in standard Excel spreadsheets.
        </p>
      </div>

      {/* ===== SEARCH CONTROLS BAR ===== */}
      <div className="relative flex items-center bg-surface border border-border-custom rounded-2xl px-3.5 py-2.5 shadow-sm max-w-md focus-within:border-ink-2 transition-all">
        <Search className="w-4 h-4 text-ink-3 mr-2.5" />
        <input
          type="text"
          placeholder="Search among 14 standard reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-xs text-ink placeholder-ink-3"
        />
      </div>

      {/* ===== REPORTS LIST GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((row) => {
          const IconComponent = row.icon;
          return (
            <div
              key={row.id}
              className="bg-surface border border-border-custom hover:border-border-strong rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header info */}
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 bg-bg-warm rounded-xl text-ink-2">
                    <IconComponent className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-ink-3">{row.category}</span>
                    <h3 className="text-sm font-semibold text-ink leading-tight">{row.name}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[12px] text-ink-2 leading-relaxed leading-sans">{row.desc}</p>

                {/* Columns Preview details */}
                <div className="space-y-1">
                  <span className="text-[9.5px] uppercase tracking-wide text-ink-3 font-semibold">Spreadsheet Columns preview</span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {row.columns.slice(0, 4).map((col, idx) => (
                      <span key={idx} className="text-[9.5px] bg-bg-warm/60 border border-border-custom rounded-md px-1.5 py-0.2 text-ink-3 font-medium select-none">
                        {col}
                      </span>
                    ))}
                    {row.columns.length > 4 && (
                      <span className="text-[9.5px] bg-bg-warm/60 border border-border-custom rounded-md px-1.5 py-0.2 text-ink-3 font-medium select-none">
                        +{row.columns.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Export Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleExport(row)}
                  disabled={exportingId === row.id}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-bg-warm border border-border-custom hover:bg-ink hover:text-surface text-[12.5px] font-semibold text-ink transition-all shadow-sm cursor-pointer disabled:opacity-75"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingId === row.id ? "animate-bounce" : ""}`} />
                  <span>{exportingId === row.id ? "Exporting..." : "Export to Excel (XLSX)"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </PermissionGuard>
  );
}
