"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getScopedReportData, ReportScope, getReportScope } from "@/app/actions/reportActions";
import { convertToCSV, downloadFile, getExportFilename } from "@/utils/exportHelpers";
import PermissionGuard from "@/components/PermissionGuard";
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  TrendingUp,
  Coins,
  Timer,
  AlertTriangle,
  Calendar,
  ChevronDown
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
  
  // Scope and Date Filters
  const [scope, setScope] = useState<ReportScope | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  // Format picker dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch scope on mount
    getReportScope().then(setScope).catch(console.error);
  }, []);

  const reports: ReportDef[] = [
    {
      id: "all_dispositions",
      name: "All Dispositions Report",
      category: "operations",
      desc: "Complete log of all call attempts and dispositions.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: Timer
    },
    {
      id: "ptp",
      name: "PTP Report",
      category: "financial",
      desc: "Log of Promise to Pay commitments.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: Coins
    },
    {
      id: "agree_to_pay",
      name: "Agree To Pay Report",
      category: "financial",
      desc: "Log of Agree to Pay commitments.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: CheckCircle
    },
    {
      id: "broken_ptp",
      name: "Broken PTP Report",
      category: "operations",
      desc: "Log of Broken Promise to Pay dispositions.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: TrendingUp
    },
    {
      id: "part_paid",
      name: "Part Paid Report",
      category: "financial",
      desc: "Log of Part Paid dispositions.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: FileSpreadsheet
    },
    {
      id: "contactable",
      name: "Contactable Report",
      category: "operations",
      desc: "Log of Contactable dispositions.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: Timer
    },
    {
      id: "non_contactable",
      name: "Non-Contactable Report",
      category: "operations",
      desc: "Log of Non-Contactable dispositions.",
      columns: ["Contract No", "Customer Name", "Employee Name", "Date Logged", "Main Disposition", "Sub Disposition", "PTP/Paid Amount", "Remarks", "Principal POS"],
      icon: Timer
    }
  ];

  const filteredReports = reports.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async (r: ReportDef, format: "csv" | "xlsx") => {
    setExportingId(r.id);
    setOpenDropdownId(null);
    try {
      // 1. Fetch live database records via our scoped Server Action
      const { data } = await getScopedReportData(r.id, dateFrom, dateTo);

      if (!data || data.length === 0) {
        alert("No data found for this report with the current filters.");
        setExportingId(null);
        return;
      }

      // 2. Generate and download based on format
      const filename = getExportFilename(r.id, format);

      if (format === "csv") {
        const csvContent = convertToCSV(data);
        downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exported Data");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(excelBuffer, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error compiling spreadsheet data: " + err.message);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <PermissionGuard permission="can_export_reports">
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
            Export scoped system data to CSV or Excel.
          </p>
        </div>

        {/* Scope Banner & Warnings */}
        {scope && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <span>Export Scope: {scope.role}</span>
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  {scope.scopeLabel}
                </p>
              </div>
            </div>

            {/* Warning if manager has no subordinates */}
            {!scope.hasSubordinates && scope.role !== "Admin" && scope.role !== "Employee" && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">No Subordinates Assigned</h3>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    You do not currently have any active subordinates assigned to you in the organizational hierarchy. 
                    Your reports will only contain your own personal dispositions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== FILTERS BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface border border-border-custom rounded-2xl p-4 shadow-sm">
          
          <div className="relative flex items-center w-full sm:max-w-md bg-bg-warm border border-border-custom rounded-xl px-3 py-2 focus-within:border-ink-2 transition-all">
            <Search className="w-4 h-4 text-ink-3 mr-2" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-sm text-ink placeholder-ink-3"
            />
          </div>

          <div className="hidden sm:block w-px h-8 bg-border-custom mx-2"></div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-3" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-bg-warm border border-border-custom rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-ink-2"
                title="From Date"
              />
            </div>
            <span className="text-ink-3 text-sm">to</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-bg-warm border border-border-custom rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-ink-2"
                title="To Date"
              />
            </div>
          </div>
          
        </div>

        {/* ===== REPORTS LIST GRID ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredReports.map((row) => {
            const IconComponent = row.icon;
            const isDropdownOpen = openDropdownId === row.id;

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
                  <p className="text-[12px] text-ink-2 leading-relaxed font-sans">{row.desc}</p>

                  {/* Columns Preview details */}
                  <div className="space-y-1">
                    <span className="text-[9.5px] uppercase tracking-wide text-ink-3 font-semibold">Includes</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {row.columns.slice(0, 4).map((col, idx) => (
                        <span key={idx} className="text-[9.5px] bg-bg-warm/60 border border-border-custom rounded-md px-1.5 py-0.5 text-ink-3 font-medium select-none">
                          {col}
                        </span>
                      ))}
                      {row.columns.length > 4 && (
                        <span className="text-[9.5px] bg-bg-warm/60 border border-border-custom rounded-md px-1.5 py-0.5 text-ink-3 font-medium select-none">
                          +{row.columns.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Export Button w/ Dropdown */}
                <div className="pt-2 relative">
                  {exportingId === row.id ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-bg-warm border border-border-custom text-[12.5px] font-semibold text-ink-2 shadow-sm cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5 animate-bounce" />
                      <span>Exporting...</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setOpenDropdownId(isDropdownOpen ? null : row.id)}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-bg-warm border border-border-custom hover:bg-ink hover:text-surface text-[12.5px] font-semibold text-ink transition-all shadow-sm cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Data</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute top-full mt-1 w-full z-10 bg-surface border border-border-custom rounded-lg shadow-xl overflow-hidden py-1 animate-fade-in">
                          <button
                            onClick={() => handleExport(row, "xlsx")}
                            className="w-full text-left px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-bg-warm transition-colors"
                          >
                            Export as Excel (.xlsx)
                          </button>
                          <button
                            onClick={() => handleExport(row, "csv")}
                            className="w-full text-left px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-bg-warm transition-colors"
                          >
                            Export as CSV (.csv)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PermissionGuard>
  );
}
