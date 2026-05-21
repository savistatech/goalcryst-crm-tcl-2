import React from "react";
import { getAuditLogs } from "@/app/actions/waiverActions";
import PermissionGuard from "@/components/PermissionGuard";
import {
  ShieldAlert,
  Search,
  Calendar,
  Layers,
  FileJson,
  UserSquare2,
  Filter
} from "lucide-react";

interface AuditPageProps {
  searchParams: Promise<{
    action?: string;
    q?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const resolvedParams = await searchParams;
  const actionFilter = resolvedParams.action || "";
  const contractFilter = resolvedParams.q || "";

  const logs = await getAuditLogs(
    actionFilter || undefined,
    contractFilter || undefined
  );

  const actionTypes = [
    { value: "", label: "All logged actions" },
    { value: "LOGIN", label: "LOGIN" },
    { value: "EXCEL_IMPORT", label: "EXCEL_IMPORT" },
    { value: "CALL_LOG", label: "CALL_LOG" },
    { value: "WAIVER_REQUEST", label: "WAIVER_REQUEST" },
    { value: "WAIVER_APPROVE", label: "WAIVER_APPROVE" },
    { value: "WAIVER_REJECT", label: "WAIVER_REJECT" }
  ];

  return (
    <PermissionGuard permission="can_view_audit_logs">
      <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>GoalCryst CRM</span>
          <span>·</span>
          <span>Security & Audit Controls</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Compliance Monitoring Logs
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Historical timeline audit trail capturing operator operations, logins, import batches, and settlement approvals.
        </p>
      </div>

      {/* ===== SEARCH & FILTER CONTROLS BAR ===== */}
      <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Filter by event</label>
            <div className="relative flex items-center bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 focus-within:border-ink-2 transition-all">
              <Filter className="w-3.5 h-3.5 text-ink-3 mr-2" />
              <select
                name="action"
                defaultValue={actionFilter}
                className="w-full bg-transparent border-0 outline-none text-xs text-ink cursor-pointer"
              >
                {actionTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contract code input */}
          <div className="space-y-1">
            <label className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Filter by contract</label>
            <div className="relative flex items-center bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 focus-within:border-ink-2 transition-all">
              <Search className="w-3.5 h-3.5 text-ink-3 mr-2" />
              <input
                type="text"
                name="q"
                defaultValue={contractFilter}
                placeholder="Enter contract reference..."
                className="w-full bg-transparent border-0 outline-none text-xs text-ink placeholder-ink-3"
              />
            </div>
          </div>

          {/* Action submit button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full h-8.5 rounded-lg bg-ink hover:bg-black text-surface text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Filter Logs
            </button>
          </div>
        </form>
      </div>

      {/* ===== TIMELINE AUDIT TABLE ===== */}
      <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
          <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Compliance records timeline ({logs.length})</span>
          <span className="text-[11px] text-ink-3">Enforcing security protocol logs</span>
        </div>

        {logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldAlert className="w-9 h-9 text-ink-3 mx-auto" />
            <h3 className="text-sm font-semibold text-ink">No compliance records matching filters</h3>
            <p className="text-xs text-ink-2 max-w-sm mx-auto">
              Please adjust your search criteria or clear contract filters to view recent operational audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10">
                  <th className="py-2.5 px-5">Timestamp</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Target Entity</th>
                  <th className="py-2.5 px-4">Audit Payload details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 text-[12.5px]">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-warm/10 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-ink-2 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <UserSquare2 className="w-3.5 h-3.5 text-ink-3" />
                        <div>
                          <strong className="text-ink font-semibold block leading-tight">{row.operator_name}</strong>
                          <span className="text-[10px] text-ink-3 font-mono">{row.operator_role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold ${
                        row.action.startsWith("WAIVER_APP")
                          ? "bg-good-bg text-good"
                          : row.action.startsWith("WAIVER_REJ")
                          ? "bg-bad-bg text-bad"
                          : row.action === "EXCEL_IMPORT"
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-bg-warm text-ink-2 border border-border-custom"
                      }`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.entity_type ? (
                        <div>
                          <span className="text-ink font-medium block leading-tight">{row.entity_type}</span>
                          <span className="text-[10.5px] font-mono text-ink-3">{row.entity_id || "-"}</span>
                        </div>
                      ) : (
                        <span className="text-ink-3">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="bg-bg-warm/30 border border-border-custom/50 rounded-lg p-2 font-mono text-[11px] text-ink-2 overflow-x-auto scrollbar-none space-y-1">
                        {row.action === "EXCEL_IMPORT" && (
                          <div>
                            <span>File: <strong>{row.metadata.filename}</strong></span>
                            <span className="block text-[10.5px] text-ink-3">Imported: {row.metadata.imported} | Skipped: {row.metadata.skipped}</span>
                          </div>
                        )}

                        {row.action.startsWith("WAIVER") && (
                          <div>
                            <span>Target Account: <strong>{row.metadata.contract_no}</strong></span>
                            <span className="block text-[10.5px] text-ink-3">Amount: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(row.metadata.waiver_amount || 0)}</span>
                            {row.metadata.manager_remarks && (
                              <span className="block text-[10.5px] italic text-ink-3 mt-1">&quot;{row.metadata.manager_remarks}&quot;</span>
                            )}
                          </div>
                        )}

                        {!row.action.startsWith("WAIVER") && row.action !== "EXCEL_IMPORT" && (
                          <div className="truncate">
                            {JSON.stringify(row.metadata)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </PermissionGuard>
  );
}
