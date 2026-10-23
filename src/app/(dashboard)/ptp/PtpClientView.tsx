"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CalendarRange, ArrowRight, ClipboardList, LayoutGrid, List } from "lucide-react";
import type { FollowUpItem, FollowUpType } from "@/app/actions/queueActions";

interface PtpClientViewProps {
  followUps: FollowUpItem[];
}

const TYPE_FILTERS: { id: "All" | FollowUpType; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Promise to Pay", label: "PTP" },
  { id: "Agree to Pay", label: "ATP" },
  { id: "Call Back", label: "Call Back" },
];

const TYPE_TAG: Record<FollowUpType, { short: string; className: string }> = {
  "Promise to Pay": { short: "PTP", className: "bg-accent-soft text-accent-ink" },
  "Agree to Pay": { short: "ATP", className: "bg-good-bg text-good" },
  "Call Back": { short: "Call Back", className: "bg-blue-500/10 text-blue-600" },
};

/** Date-only values show as dd/mm/yyyy; Call Back date-times also show the time. */
function formatDue(item: FollowUpItem): string {
  if (!item.due_date) return "-";
  const d = new Date(item.due_date);
  if (isNaN(d.getTime())) return item.due_date;
  return item.type === "Call Back" && item.due_date.includes("T")
    ? d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-GB");
}

export default function PtpClientView({ followUps }: PtpClientViewProps) {
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [typeFilter, setTypeFilter] = useState<"All" | FollowUpType>("All");
  const ptpSchedules = typeFilter === "All" ? followUps : followUps.filter(item => item.type === typeFilter);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const columns = [
    { id: "Due Today", title: "Due Today", color: "bg-accent-custom", textColor: "text-surface", border: "border-accent-custom/30", bg: "bg-accent-soft/30" },
    { id: "Upcoming", title: "Upcoming", color: "bg-blue-500", textColor: "text-white", border: "border-blue-500/30", bg: "bg-blue-500/5" },
    { id: "Overdue", title: "Overdue / Broken", color: "bg-bad", textColor: "text-surface", border: "border-bad/30", bg: "bg-bad-bg/30" },
    { id: "Done", title: "Done / Kept", color: "bg-good", textColor: "text-surface", border: "border-good/30", bg: "bg-good-bg/30" }
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center bg-surface border border-border-custom rounded-2xl p-2 shadow-sm">
        <div className="flex items-center gap-1.5 px-1 flex-wrap">
          {TYPE_FILTERS.map(f => {
            const count = f.id === "All" ? followUps.length : followUps.filter(item => item.type === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${typeFilter === f.id ? "bg-ink text-surface" : "text-ink-3 hover:text-ink hover:bg-bg-warm"}`}
              >
                {f.label} <span className="font-mono opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex bg-bg-warm rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "list" ? "bg-surface shadow-sm text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "board" ? "bg-surface shadow-sm text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const items = ptpSchedules.filter(item => item.board_status === col.id);
            return (
              <div key={col.id} className={`rounded-2xl border ${col.border} ${col.bg} overflow-hidden flex flex-col h-[70vh]`}>
                <div className={`px-4 py-3 ${col.color} ${col.textColor} flex justify-between items-center`}>
                  <h3 className="font-semibold text-sm">{col.title}</h3>
                  <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-mono font-bold">
                    {items.length}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                  {items.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-ink" />
                      <p className="text-xs text-ink font-medium">Empty</p>
                    </div>
                  ) : (
                    items.map(item => (
                      <Link
                        href={`/customers/${item.contract_no}`}
                        key={item.contract_no + item.created_at}
                        className="block bg-surface border border-border-custom rounded-xl p-3 shadow-sm hover:shadow-md hover:border-ink/20 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono font-semibold text-ink-3 bg-bg-warm px-1.5 py-0.5 rounded">
                            {item.contract_no}
                          </span>
                          <span className="text-[10px] font-semibold text-ink-2 flex items-center gap-1">
                            {formatDue(item)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${TYPE_TAG[item.type].className}`}>{TYPE_TAG[item.type].short}</span>
                          <h4 className="font-semibold text-ink text-sm truncate">{item.customer_name}</h4>
                        </div>
                        <div className="mt-3 flex justify-between items-end">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold block">{item.amount !== null ? "Commitment" : "Mobile"}</span>
                            {item.amount !== null
                              ? <span className="font-mono text-good font-bold text-sm">{formatMoney(item.amount)}</span>
                              : <span className="font-mono text-ink-2 text-xs">{item.primary_mobile}</span>}
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider text-ink-3 font-semibold block">Agent</span>
                            <span className="text-xs text-ink-2 truncate max-w-[100px] block">{item.employee_name}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
            <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Follow-ups ({ptpSchedules.length})</span>
            <span className="text-xs text-ink-3">Ordered by earliest due date</span>
          </div>

          {ptpSchedules.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CalendarRange className="w-8 h-8 text-ink-3 mx-auto" />
              <h3 className="text-sm font-semibold text-ink">No follow-ups</h3>
              <p className="text-xs text-ink-2 max-w-sm mx-auto">
                Calls logged as &quot;Promise to Pay&quot;, &quot;Agree to Pay&quot; or &quot;Call Back&quot; by you or your team appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10">
                    <th className="py-2.5 px-5">Contract Number</th>
                    <th className="py-2.5 px-4">Customer Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Due</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Mobile</th>
                    <th className="py-2.5 px-4">Principal POS</th>
                    <th className="py-2.5 px-4">Employee Name</th>
                    <th className="py-2.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 text-[13px]">
                  {ptpSchedules.map((row) => (
                    <tr key={row.contract_no + row.created_at} className="hover:bg-bg-warm/10 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-semibold text-ink">{row.contract_no}</td>
                      <td className="py-3.5 px-4 font-medium text-ink">{row.customer_name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${TYPE_TAG[row.type].className}`}>{TYPE_TAG[row.type].short}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.board_status === "Due Today" ? "bg-accent-soft text-accent-ink" :
                          row.board_status === "Upcoming" ? "bg-blue-500/10 text-blue-600" :
                          row.board_status === "Overdue" ? "bg-bad-bg text-bad" :
                          "bg-good-bg text-good"
                        }`}>
                          {row.board_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-ink-2 font-mono">{formatDue(row)}</td>
                      <td className="py-3.5 px-4 font-semibold text-ink font-mono">{row.amount !== null ? formatMoney(row.amount) : "-"}</td>
                      <td className="py-3.5 px-4 font-mono text-ink-2">{row.primary_mobile}</td>
                      <td className="py-3.5 px-4 font-mono text-ink-2">{formatMoney(row.pos)}</td>
                      <td className="py-3.5 px-4 text-ink-2">{row.employee_name}</td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/customers/${row.contract_no}`}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-bg-warm border border-border-custom hover:bg-ink hover:text-surface text-[12.5px] font-semibold text-ink transition-all"
                        >
                          <span>Contract Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
