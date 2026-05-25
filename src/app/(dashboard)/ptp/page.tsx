import React from "react";
import Link from "next/link";
import { getPtpSchedules } from "@/app/actions/queueActions";
import {
  CalendarRange,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Coins,
  ClipboardList
} from "lucide-react";

export default async function PtpPage() {
  const ptpSchedules = await getPtpSchedules();

  // Financial calculations
  const totalPtpAmount = ptpSchedules.reduce((acc, row) => acc + row.ptp_amount, 0);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span>GoalCryst CRM</span>
          <span>·</span>
          <span>PTP Commitments Tracker</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Promise to Pay (PTP) Follow-ups
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Monitor and track upcoming customer commitment dates and collection schedules.
        </p>
      </div>

      {/* ===== KPI SUMMARY METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">Active Commitments</span>
            <div className="text-2xl font-bold font-mono text-ink mt-1">
              {ptpSchedules.length}
            </div>
            <span className="text-[10px] text-ink-2 mt-1 block">Scheduled promises</span>
          </div>
          <span className="p-3 bg-bg-warm rounded-xl text-ink-2">
            <ClipboardList className="w-5 h-5" />
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">Expected Collection</span>
            <div className="text-2xl font-bold font-mono text-good mt-1">
              {formatMoney(totalPtpAmount)}
            </div>
            <span className="text-[10px] text-ink-2 mt-1 block">PTP expected sum</span>
          </div>
          <span className="p-3 bg-good-bg rounded-xl text-good">
            <Coins className="w-5 h-5" />
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">Conversion Target</span>
            <div className="text-2xl font-bold font-mono text-accent-custom mt-1">
              85%
            </div>
            <span className="text-[10px] text-ink-2 mt-1 block">Standard BPO target</span>
          </div>
          <span className="p-3 bg-accent-soft rounded-xl text-accent-ink">
            <Wallet className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* ===== WARNING ALERTS BOX ===== */}
      <div className="flex items-start gap-3 bg-bg-warm border border-border-custom rounded-xl p-4 text-[12px] text-ink-2 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink font-semibold">Standard Calling Rule Reminder:</strong>
          <span className="block mt-0.5">
            PTP commitments must be contacted exactly on or 24 hours prior to the commitment date to secure payments. Always check that payment receipts are verified in the systems before logging call closures.
          </span>
        </div>
      </div>

      {/* ===== PTP DATATABLE ===== */}
      <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
          <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Commitments Schedules ({ptpSchedules.length})</span>
          <span className="text-xs text-ink-3">Ordered by earliest promise date</span>
        </div>

        {ptpSchedules.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CalendarRange className="w-8 h-8 text-ink-3 mx-auto" />
            <h3 className="text-sm font-semibold text-ink">No active PTP follow-ups</h3>
            <p className="text-xs text-ink-2 max-w-sm mx-auto">
              There are no payment schedules pending. Any calls logged as &quot;Promise to Pay&quot; will automatically populate this dashboard timeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10">
                  <th className="py-2.5 px-5">Contract Number</th>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">Promise Date</th>
                  <th className="py-2.5 px-4">Promise Amount</th>
                  <th className="py-2.5 px-4">Outstanding Balance</th>
                  <th className="py-2.5 px-4">Employee Name</th>
                  <th className="py-2.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 text-[13px]">
                {ptpSchedules.map((row, idx) => (
                  <tr key={idx} className="hover:bg-bg-warm/10 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-semibold text-ink">{row.contract_no}</td>
                    <td className="py-3.5 px-4 font-medium text-ink">{row.customer_name}</td>
                    <td className="py-3.5 px-4 font-semibold text-good font-mono">{new Date(row.ptp_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-semibold text-ink font-mono">{formatMoney(row.ptp_amount)}</td>
                    <td className="py-3.5 px-4 font-mono text-ink-2">{formatMoney(row.total_outstanding)}</td>
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
    </div>
  );
}
