"use client";

import React, { useState } from "react";
import Link from "next/link";
import { type MyWaiverRequest } from "@/app/actions/waiverActions";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ArrowRight,
  MessageSquare,
  Filter,
  ReceiptText,
  ShieldAlert,
} from "lucide-react";

interface AgentWaiverTrackerProps {
  myWaivers: MyWaiverRequest[];
}

const STATUS_CONFIG = {
  Pending: {
    label: "Pending Review",
    icon: Clock,
    bg: "bg-warn-bg",
    text: "text-warn",
    border: "border-warn/20",
    dot: "bg-warn",
  },
  Approved: {
    label: "Approved",
    icon: CheckCircle2,
    bg: "bg-good-bg",
    text: "text-good",
    border: "border-good/20",
    dot: "bg-good",
  },
  Rejected: {
    label: "Rejected",
    icon: XCircle,
    bg: "bg-bad-bg",
    text: "text-bad",
    border: "border-bad/20",
    dot: "bg-bad",
  },
} as const;

const formatMoney = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function AgentWaiverTrackerView({ myWaivers }: AgentWaiverTrackerProps) {
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const pending = myWaivers.filter((w) => w.status === "Pending").length;
  const approved = myWaivers.filter((w) => w.status === "Approved").length;
  const rejected = myWaivers.filter((w) => w.status === "Rejected").length;

  const filtered =
    filterStatus === "All" ? myWaivers : myWaivers.filter((w) => w.status === filterStatus);

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3 mb-1">
          <span>GoalCryst CRM</span>
          <span>·</span>
          <span>My Workspace</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink font-serif">
          My Waiver Submissions
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Track all discount waiver requests you&apos;ve raised — and see manager decisions in real time.
        </p>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border-custom rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3 mb-1">Awaiting Decision</p>
          <p className="text-4xl font-bold text-warn font-mono tabular-nums">{pending}</p>
          <p className="text-[11px] text-ink-3 mt-1.5">Pending manager review</p>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3 mb-1">Approved</p>
          <p className="text-4xl font-bold text-good font-mono tabular-nums">{approved}</p>
          <p className="text-[11px] text-ink-3 mt-1.5">Discount cleared by manager</p>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3 mb-1">Rejected</p>
          <p className="text-4xl font-bold text-bad font-mono tabular-nums">{rejected}</p>
          <p className="text-[11px] text-ink-3 mt-1.5">Not cleared — see remarks</p>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 bg-bg-warm border border-border-custom rounded-xl p-4 text-[12px] text-ink-2 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
        <span>
          You can only <strong className="text-ink">view</strong> waiver requests you have raised. To raise a new one, navigate to the customer&apos;s account via{" "}
          <Link href="/search" className="text-accent-custom underline underline-offset-2 hover:text-accent-ink transition-colors">
            Search Contracts
          </Link>{" "}
          and click <strong className="text-ink">Waiver Raise</strong> on the customer profile.
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-ink-3" />
        <span className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mr-2">Filter by status:</span>
        {(["All", "Pending", "Approved", "Rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`h-7 px-3 rounded-full text-[11.5px] font-semibold border transition-all cursor-pointer ${
              filterStatus === s
                ? s === "All"
                  ? "bg-ink text-surface border-ink"
                  : s === "Pending"
                  ? "bg-warn-bg text-warn border-warn/30"
                  : s === "Approved"
                  ? "bg-good-bg text-good border-good/30"
                  : "bg-bad-bg text-bad border-bad/30"
                : "bg-surface text-ink-3 border-border-custom hover:bg-bg-warm"
            }`}
          >
            {s}
            {s !== "All" && (
              <span className="ml-1.5 opacity-70">
                ({s === "Pending" ? pending : s === "Approved" ? approved : rejected})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Waiver List */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border-custom rounded-2xl py-16 text-center">
          <ReceiptText className="w-8 h-8 text-ink-3 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-2">
            {filterStatus === "All"
              ? "You haven't raised any waiver requests yet."
              : `No ${filterStatus.toLowerCase()} waivers found.`}
          </p>
          <p className="text-xs text-ink-3 mt-1">
            Open a customer account and click <strong>Waiver Raise</strong> to start.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((waiver) => {
            const cfg = STATUS_CONFIG[waiver.status];
            const Icon = cfg.icon;
            return (
              <div
                key={waiver.id}
                className={`bg-surface border ${cfg.border} rounded-2xl p-5 space-y-4 transition-all hover:shadow-sm`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11.5px] font-semibold text-ink-2 bg-bg-warm px-2 py-0.5 rounded-md border border-border-custom">
                        {waiver.contract_no}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-ink">{waiver.customer_name}</p>
                    <p className="text-[11px] text-ink-3 mt-0.5">Raised on {formatDate(waiver.created_at)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-0.5">Waiver Amount</p>
                    <p className="text-2xl font-bold text-accent-custom tabular-nums">
                      {formatMoney(waiver.requested_waiver_amount)}
                    </p>
                    <p className="text-[11px] text-ink-3 mt-0.5">
                      Customer pays: {formatMoney(waiver.customer_payable_amount)}
                    </p>
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-custom/50">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Reason</p>
                        <p className="text-[12.5px] text-ink leading-snug">{waiver.reason || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Total Outstanding at Request</p>
                        <p className="text-[12.5px] text-ink font-mono">{formatMoney(waiver.total_outstanding)}</p>
                      </div>
                    </div>
                    {waiver.agent_remarks && (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-ink-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Your Remarks</p>
                          <p className="text-[12.5px] text-ink-2 leading-snug italic">&quot;{waiver.agent_remarks}&quot;</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manager decision panel */}
                  <div className={`rounded-xl p-4 ${cfg.bg} border ${cfg.border}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      <p className={`text-[10px] uppercase tracking-wider font-bold ${cfg.text}`}>
                        Supervisor Decision
                      </p>
                    </div>
                    {waiver.status === "Pending" ? (
                      <p className="text-[12px] text-ink-3 italic">
                        Awaiting review... your manager will see this in their approval queue.
                      </p>
                    ) : (
                      <>
                        <p className={`text-sm font-bold ${cfg.text} mb-1`}>{cfg.label}</p>
                        {waiver.updated_at && (
                          <p className="text-[10.5px] text-ink-3 mb-2">on {formatDate(waiver.updated_at)}</p>
                        )}
                        {waiver.manager_remarks ? (
                          <p className="text-[12px] text-ink leading-snug">
                            &quot;{waiver.manager_remarks}&quot;
                          </p>
                        ) : (
                          <p className="text-[11px] text-ink-3 italic">No additional remarks from manager.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex justify-end pt-2 border-t border-border-custom/30">
                  <Link
                    href={`/customers/${waiver.contract_no}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-custom hover:text-accent-ink transition-all hover:translate-x-0.5"
                  >
                    <span>Open Customer 360</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
