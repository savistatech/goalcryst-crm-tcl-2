"use client";

import React, { useState } from "react";
import { reviewWaiverRequest, type PendingWaiver } from "@/app/actions/waiverActions";
import PermissionGuard from "@/components/PermissionGuard";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  DollarSign,
  UserSquare2,
  Calendar,
  Loader2,
  Lock
} from "lucide-react";

interface ClientViewProps {
  initialWaivers: PendingWaiver[];
}

export default function WaiverReviewClientView({ initialWaivers }: ClientViewProps) {
  const [waivers, setWaivers] = useState<PendingWaiver[]>(initialWaivers);
  const [activeReview, setActiveReview] = useState<PendingWaiver | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"Approved" | "Rejected">("Approved");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleOpenReview = (w: PendingWaiver, status: "Approved" | "Rejected") => {
    setActiveReview(w);
    setReviewStatus(status);
    setRemarks("");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;

    setSubmitting(true);
    try {
      const res = await reviewWaiverRequest(activeReview.id, reviewStatus, remarks);
      if (res.success) {
        // Filter out completed request from queue view
        setWaivers(prev => prev.filter(w => w.id !== activeReview.id));
        setActiveReview(null);
        setRemarks("");
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error logging manager approval.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard permission="can_approve_waiver">
      <div className="space-y-6 animate-fade-in relative">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="font-brand">GoalCryst CRM</span>
          <span>·</span>
          <span>Approval Controls Panel</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Settlement Waiver Approvals
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Review and approve settlement discount requests raised by operations collection field employees.
        </p>
      </div>

      {/* ===== WAIVERS COUNT KPI BAR ===== */}
      <div className="bg-surface border border-border-custom p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink">Active Waiver Worklist</h3>
          <p className="text-xs text-ink-2">Approval actions update contract exposures and register events dynamically in auditing.</p>
        </div>
        <div className="px-4 py-2 border border-border-custom rounded-xl bg-bg-warm/30 text-xs font-semibold text-ink-2 select-none">
          Pending review count: <strong className="text-accent-custom font-mono">{waivers.length}</strong>
        </div>
      </div>

      {/* ===== WAIVERS LIST GRID ===== */}
      {waivers.length === 0 ? (
        <div className="py-16 text-center space-y-2 border border-dashed border-border-custom rounded-2xl bg-surface">
          <ShieldCheck className="w-9 h-9 text-good mx-auto" />
          <h3 className="text-sm font-semibold text-ink">All Waiver Requests Reviewed</h3>
          <p className="text-xs text-ink-3 max-w-sm mx-auto">
            Excellent! The portfolio waivers approval dashboard is completely clean. No pending requests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {waivers.map((row) => {
            const waiverPercent = ((row.requested_waiver_amount / row.pos) * 100).toFixed(1);
            return (
              <div
                key={row.id}
                className="bg-surface border border-border-custom hover:border-border-strong rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Account Header */}
                  <div className="flex justify-between items-start border-b border-border-custom pb-2">
                    <div>
                      <span className="text-[9.5px] font-mono bg-bg-warm text-ink-2 border border-border-custom px-1.5 py-0.5 rounded font-semibold">
                        {row.contract_no}
                      </span>
                      <h4 className="text-base font-semibold text-ink mt-1">{row.customer_name}</h4>
                    </div>
                    <span className="text-[10px] text-ink-3 font-mono">{new Date(row.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Financial Metrics Indicators */}
                  <div className="grid grid-cols-3 gap-2 bg-bg-warm/15 border border-border-custom p-3 rounded-xl">
                    <div className="text-[11px]">
                      <span className="text-ink-3 block">Principal POS</span>
                      <strong className="text-ink font-mono font-bold block mt-0.5">{formatMoney(row.pos)}</strong>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-bad block">Discount ({waiverPercent}%)</span>
                      <strong className="text-bad font-mono font-bold block mt-0.5">{formatMoney(row.requested_waiver_amount)}</strong>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-good block">Final Payable</span>
                      <strong className="text-good font-mono font-bold block mt-0.5">{formatMoney(row.customer_payable_amount)}</strong>
                    </div>
                  </div>

                  {/* Reason parameters */}
                  <div className="space-y-1 text-[12.5px]">
                    <span className="text-ink-3 uppercase font-semibold text-[9.5px] tracking-wide block">Reason category</span>
                    <strong className="text-ink font-medium">{row.reason}</strong>
                  </div>

                  {/* Employee remarks */}
                  <div className="space-y-1 text-[12.5px]">
                    <span className="text-ink-3 uppercase font-semibold text-[9.5px] tracking-wide block">Employee remarks / justification</span>
                    <p className="text-ink-2 italic bg-bg-warm/30 p-2.5 rounded-lg border border-border-custom/50 leading-relaxed font-sans">&quot;{row.employee_remarks}&quot;</p>
                  </div>

                  <div className="text-[11px] text-ink-3 pt-1 border-t border-border-custom/50 flex items-center gap-1.5">
                    <UserSquare2 className="w-3.5 h-3.5" />
                    <span>Raised by:</span>
                    <strong className="text-ink-2 font-medium">{row.employee_name}</strong>
                  </div>
                </div>

                {/* Actions Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleOpenReview(row, "Rejected")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8.5 rounded-lg border border-bad/20 hover:border-bad hover:bg-bad-bg/25 text-[12.5px] font-semibold text-bad transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleOpenReview(row, "Approved")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8.5 rounded-lg bg-ink hover:bg-black text-[12.5px] font-semibold text-surface transition-all shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-good" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== REVIEW ACTIONS MODAL ===== */}
      {activeReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-scale-up space-y-4">
            
            <div className="pb-2 border-b border-border-custom">
              <h3 className="text-base font-semibold text-ink font-serif">
                Confirm Waiver Decision: {reviewStatus}
              </h3>
              <span className="text-xs text-ink-3">Contract: {activeReview.contract_no} · {activeReview.customer_name}</span>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3.5 bg-bg-warm/30 border border-border-custom rounded-xl space-y-2 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-ink-3">Discount Requested:</span>
                  <strong className="text-bad font-mono font-bold">{formatMoney(activeReview.requested_waiver_amount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Final Customer Payable:</span>
                  <strong className="text-good font-mono font-bold">{formatMoney(activeReview.customer_payable_amount)}</strong>
                </div>
              </div>

              {/* Justification remarks */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Supervisor notes / approval remarks</label>
                <textarea
                  required
                  rows={3}
                  placeholder={`Provide justifications details for this ${reviewStatus.toLowerCase()} action...`}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg p-2.5 text-xs text-ink placeholder-ink-3"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReview(null)}
                  className="h-9 px-4 rounded-lg border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`h-9 px-5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-75 ${
                    reviewStatus === "Approved"
                      ? "bg-ink hover:bg-black text-surface"
                      : "bg-bad hover:bg-bad-bg/85 text-surface"
                  }`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm {reviewStatus}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </PermissionGuard>
  );
}
