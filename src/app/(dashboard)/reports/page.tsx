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
      id: "all_dispositions",
      name: "All Dispositions Report",
      category: "operations",
      desc: "Complete log of all call attempts and dispositions.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: Timer
    },
    {
      id: "ptp",
      name: "PTP Report",
      category: "financial",
      desc: "Log of Promise to Pay commitments.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: Coins
    },
    {
      id: "agree_to_pay",
      name: "Agree To Pay Report",
      category: "financial",
      desc: "Log of Agree to Pay commitments.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: CheckCircle
    },
    {
      id: "broken_ptp",
      name: "Broken PTP Report",
      category: "operations",
      desc: "Log of Broken Promise to Pay dispositions.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: TrendingUp
    },
    {
      id: "part_paid",
      name: "Part Paid Report",
      category: "financial",
      desc: "Log of Part Paid dispositions.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: FileSpreadsheet
    },
    {
      id: "contactable",
      name: "Contactable Report",
      category: "operations",
      desc: "Log of Contactable dispositions.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: Timer
    },
    {
      id: "non_contactable",
      name: "Non-Contactable Report",
      category: "operations",
      desc: "Log of Non-Contactable dispositions.",
      columns: ["Contract No", "Customer Name", "Agent Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks"],
      icon: Timer
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
          <span>Data</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Reports
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Export system data to Excel.
        </p>
      </div>

      {/* ===== SEARCH CONTROLS BAR ===== */}
      <div className="relative flex items-center bg-surface border border-border-custom rounded-2xl px-3.5 py-2.5 shadow-sm max-w-md focus-within:border-ink-2 transition-all">
        <Search className="w-4 h-4 text-ink-3 mr-2.5" />
        <input
          type="text"
          placeholder="Search among 7 standard reports..."
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
                  <span>{exportingId === row.id ? "Exporting..." : "Export"}</span>
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
