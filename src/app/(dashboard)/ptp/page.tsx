import React from "react";
import Link from "next/link";
import { getFollowUps } from "@/app/actions/queueActions";
import {
  CalendarRange,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Coins,
  ClipboardList
} from "lucide-react";
import PtpClientView from "./PtpClientView";

export default async function PtpPage() {
  const { items: followUps, scopeLabel } = await getFollowUps();

  // Open = not yet completed; expected collection counts open PTP/ATP commitments only
  const openFollowUps = followUps.filter(row => row.board_status !== "Done");
  const totalPtpAmount = openFollowUps.reduce((acc, row) => acc + (row.amount || 0), 0);

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
          <span className="font-brand">GoalCryst CRM</span>
          <span>·</span>
          <span>Follow-ups Tracker</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Follow-ups
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Promise to Pay, Agree to Pay and Call Back follow-ups. Showing: <strong className="text-ink font-semibold">{scopeLabel}</strong>
        </p>
      </div>

      {/* ===== KPI SUMMARY METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold">Open Follow-ups</span>
            <div className="text-2xl font-bold font-mono text-ink mt-1">
              {openFollowUps.length}
            </div>
            <span className="text-[10px] text-ink-2 mt-1 block">Not yet completed</span>
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
            <span className="text-[10px] text-ink-2 mt-1 block">Open PTP / ATP commitments</span>
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

      {/* ===== CLIENT VIEW CONTROLS (BOARD & LIST) ===== */}
      <PtpClientView followUps={followUps} />
    </div>
  );
}
