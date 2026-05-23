"use client";

import React from "react";
import Link from "next/link";
import {
  PhoneCall,
  CalendarCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  UserSquare2,
  Search,
  Receipt,
} from "lucide-react";
import { type AgentDashboardMetrics } from "@/app/actions/dashboardActions";

interface AgentOverviewProps {
  metrics: AgentDashboardMetrics;
}

const formatMoney = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

const formatRelTime = (iso: string) => {
  const elapsed = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const DISPO_COLORS: Record<string, string> = {
  "Promise to Pay": "text-good",
  "Part Paid": "text-good",
  "Already Paid": "text-good",
  "Refuse to Pay": "text-bad",
  "Broken PTP": "text-bad",
  "Not Reachable": "text-warn",
  "Ringing No Answer": "text-warn",
  "Call Back": "text-ink-2",
  "Wrong Number": "text-ink-3",
};

export default function AgentOverviewClientView({ metrics }: AgentOverviewProps) {
  const initials = metrics.agentName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-3 mb-1">
            <span>GoalCryst CRM</span>
            <span>·</span>
            <span>Overview</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink font-serif">
            Good day, {metrics.agentName.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            {metrics.agentRole} · Here&apos;s your personal performance snapshot for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-accent-custom hover:bg-accent-ink text-surface text-[13px] font-semibold transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Allocated Accounts",
            value: metrics.myAllocatedCount.toString(),
            sub: "In your portfolio",
            icon: UserSquare2,
            accent: false,
          },
          {
            label: "Calls Logged Today",
            value: metrics.myCallsToday.toString(),
            sub: `${metrics.myCallsTotal} total logged`,
            icon: PhoneCall,
            accent: false,
          },
          {
            label: "Contactability Rate",
            value: `${metrics.myContactableRate}%`,
            sub: "Connected vs total calls",
            icon: TrendingUp,
            accent: metrics.myContactableRate >= 60,
          },
          {
            label: "Active PTPs",
            value: metrics.myPtpCount.toString(),
            sub: metrics.myPtpValue > 0 ? formatMoney(metrics.myPtpValue) + " pending" : "No upcoming commitments",
            icon: CalendarCheck,
            accent: metrics.myPtpCount > 0,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-surface border border-border-custom rounded-2xl p-5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3">{kpi.label}</p>
              <kpi.icon className="w-4 h-4 text-ink-3/60" />
            </div>
            <p className={`text-4xl font-bold tabular-nums ${kpi.accent ? "text-accent-custom" : "text-ink"}`}>
              {kpi.value}
            </p>
            <p className="text-[11px] text-ink-3">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Waiver status + Recent calls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* My Waiver Requests Summary */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3">My Waivers</p>
              <h3 className="text-base font-semibold text-ink mt-0.5">Settlement Discount Status</h3>
            </div>
            <Link
              href="/waivers"
              className="text-[12px] font-semibold text-accent-custom hover:text-accent-ink transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-warn-bg border border-warn/20 p-3 text-center">
              <Clock className="w-4 h-4 text-warn mx-auto mb-1" />
              <p className="text-2xl font-bold text-warn tabular-nums">{metrics.myWaiversPending}</p>
              <p className="text-[10px] text-warn/80 font-semibold uppercase tracking-wide mt-0.5">Pending</p>
            </div>
            <div className="rounded-xl bg-good-bg border border-good/20 p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-good mx-auto mb-1" />
              <p className="text-2xl font-bold text-good tabular-nums">{metrics.myWaiversApproved}</p>
              <p className="text-[10px] text-good/80 font-semibold uppercase tracking-wide mt-0.5">Approved</p>
            </div>
            <div className="rounded-xl bg-bad-bg border border-bad/20 p-3 text-center">
              <XCircle className="w-4 h-4 text-bad mx-auto mb-1" />
              <p className="text-2xl font-bold text-bad tabular-nums">{metrics.myWaiversRejected}</p>
              <p className="text-[10px] text-bad/80 font-semibold uppercase tracking-wide mt-0.5">Rejected</p>
            </div>
          </div>

          {metrics.myWaiversPending === 0 && metrics.myWaiversApproved === 0 && metrics.myWaiversRejected === 0 && (
            <div className="py-4 text-center">
              <Receipt className="w-6 h-6 text-ink-3 mx-auto mb-2" />
              <p className="text-xs text-ink-3">No waiver requests raised yet.</p>
              <p className="text-[11px] text-ink-3">Go to a customer profile to raise a discount waiver.</p>
            </div>
          )}
        </div>

        {/* Recent Dispositions */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3">Activity</p>
              <h3 className="text-base font-semibold text-ink mt-0.5">Recent Dispositions</h3>
            </div>
            <Link
              href="/search"
              className="text-[12px] font-semibold text-accent-custom hover:text-accent-ink transition-colors"
            >
              Search accounts →
            </Link>
          </div>

          {metrics.myRecentDispos.length === 0 ? (
            <div className="py-6 text-center">
              <PhoneCall className="w-6 h-6 text-ink-3 mx-auto mb-2" />
              <p className="text-xs text-ink-3">No calls logged yet today.</p>
              <p className="text-[11px] text-ink-3">Open a customer account from Search to start logging.</p>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border-custom/50">
              {metrics.myRecentDispos.map((dispo, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink truncate">{dispo.customer}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11.5px] font-medium ${DISPO_COLORS[dispo.dispo] || "text-ink-2"}`}>
                        {dispo.dispo || "—"}
                      </span>
                      {dispo.ptp_amount && (
                        <span className="text-[10.5px] font-mono text-ink-3">
                          · {formatMoney(dispo.ptp_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10.5px] text-ink-3">{formatRelTime(dispo.created_at)}</span>
                    {dispo.contract_no && (
                      <Link
                        href={`/customers/${dispo.contract_no}`}
                        className="text-[10.5px] font-semibold text-accent-custom hover:text-accent-ink transition-colors"
                      >
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick action cards */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-3 mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Search", icon: Search, href: "/search", desc: "Look up customer accounts" },
            { label: "Follow-ups", icon: CalendarCheck, href: "/ptp", desc: "Review pending commitments" },
            { label: "My Waivers", icon: FileText, href: "/waivers", desc: "Track waiver request statuses" },
            { label: "Log Disposition", icon: PhoneCall, href: "/search", desc: "Search a customer to log a call" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-surface border border-border-custom rounded-xl p-4 space-y-2 hover:border-accent-custom/40 hover:bg-bg-warm/40 transition-all group"
            >
              <action.icon className="w-5 h-5 text-accent-custom/70 group-hover:text-accent-custom transition-colors" />
              <p className="text-[13px] font-semibold text-ink">{action.label}</p>
              <p className="text-[11px] text-ink-3 leading-snug">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
