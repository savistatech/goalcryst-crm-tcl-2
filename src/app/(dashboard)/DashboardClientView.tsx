"use client";

import React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from "recharts";
import {
  PhoneForwarded,
  Upload,
  CalendarDays,
  Coins,
  Database,
  Users,
  Activity,
  Phone
} from "lucide-react";
import { type DashboardMetrics } from "@/app/actions/dashboardActions";

interface DashboardProps {
  metrics: DashboardMetrics;
}

export default function DashboardClientView({ metrics }: DashboardProps) {

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ===== HEADER ACTION BAR ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <span>GoalCryst CRM</span>
            <span>·</span>
            <span>Operations Command Center</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink mt-1 font-serif">
            Portfolio Performance Dashboard
          </h1>
          <p className="text-[13.5px] text-ink-2 mt-1">
            Real-time operations center tracking active portfolios, agent call logs, and collections trends.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/search"
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-surface border border-border-custom text-[13.5px] font-medium text-ink hover:bg-bg-warm transition-all shadow-sm cursor-pointer"
          >
            <PhoneForwarded className="w-3.5 h-3.5 text-accent-custom" />
            <span>Search Workbench</span>
          </Link>
          <Link
            href="/imports"
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-ink text-surface text-[13.5px] font-medium hover:bg-black transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import</span>
          </Link>
        </div>
      </div>

      {/* ===== 12 COMPACT KPI METRICS CARDS (6x2 GRID) ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Row 1 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Total Contracts</span>
            <Database className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.totalContracts}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Active Contracts</span>
            <Database className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.activeContracts}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Total Users</span>
            <Users className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.totalUsers}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Upload Batches</span>
            <Upload className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.totalBatches}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Total Dispositions</span>
            <Activity className="w-3.5 h-3.5 text-accent-custom" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-accent-custom mt-3 font-mono">
            {metrics.totalDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Call Backs</span>
            <PhoneForwarded className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.callbackDispositions}
          </div>
        </div>

        {/* Row 2 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Contactable</span>
            <Phone className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.contactableDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Non-Contactable</span>
            <Phone className="w-3.5 h-3.5 text-ink-3 opacity-50" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink-2 mt-3 font-mono">
            {metrics.nonContactableDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Promise to Pay</span>
            <CalendarDays className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.ptpDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-bad font-semibold">Broken PTP</span>
            <CalendarDays className="w-3.5 h-3.5 text-bad" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-bad mt-3 font-mono">
            {metrics.brokenPtpDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Agree to Pay</span>
            <Coins className="w-3.5 h-3.5 text-good" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-good mt-3 font-mono">
            {metrics.agreeToPayDispositions}
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:bg-bg-warm/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-[9.5px] uppercase tracking-wider text-ink-3 font-semibold">Part Paid</span>
            <Coins className="w-3.5 h-3.5 text-ink-3" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-ink mt-3 font-mono">
            {metrics.partPaidDispositions}
          </div>
        </div>
      </div>

      {/* ===== RECHARTS DYNAMIC CHARTS SEGMENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Disposition Outcomes Doughnut Chart */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Call Outcomes Distribution</span>
            <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5">Disposition Breakdown</h3>
          </div>

          <div className="h-64 w-full select-none flex items-center justify-center">
            {metrics.dispositionOutcomes.length === 0 ? (
              <div className="text-sm text-ink-3 text-center">No dispositions logged yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.dispositionOutcomes}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.dispositionOutcomes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-custom)", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "12px", color: "var(--ink)", fontWeight: 600 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    wrapperStyle={{ fontSize: '11.5px', paddingTop: '15px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PTP Analysis chart */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Collection Momentum</span>
            <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5">PTP Analysis — Last 4 Weeks</h3>
          </div>

          <div className="h-44 w-full my-4 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ptpAnalysis} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D5" vertical={false} />
                <XAxis dataKey="week" stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border-custom)", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px" }}
                />
                <Bar dataKey="ptpCount" name="PTP Commitments" fill="#1C5732" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.85} />
                <Bar dataKey="contactable" name="Connected Calls" fill="#9A9285" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex items-center gap-2 border border-border-custom px-2.5 py-1.5 rounded-lg bg-bg-warm/30">
              <span className="w-2 h-2 rounded-sm bg-[#1C5732]" />
              <span className="text-ink-2">PTP commitments: <strong className="text-ink">{metrics.ptpAnalysis.reduce((a, w) => a + w.ptpCount, 0)}</strong></span>
            </div>
            <div className="flex items-center gap-2 border border-border-custom px-2.5 py-1.5 rounded-lg bg-bg-warm/30">
              <span className="w-2 h-2 rounded-sm bg-[#9A9285]" />
              <span className="text-ink-2">Connected calls: <strong className="text-ink">{metrics.ptpAnalysis.reduce((a, w) => a + w.contactable, 0)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== OPERATOR LEADERBOARDS & CALL LOG TIMELINES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leaderboard panel */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Shift Performance</span>
              <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5">Agent Leaderboard — Today</h3>
            </div>
            <Link
              href="/ptp"
              className="text-xs text-accent-custom hover:underline hover:text-accent-ink font-semibold transition-all cursor-pointer"
            >
              View active PTP list →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom bg-bg-warm/30 text-[10px] uppercase font-semibold text-ink-3">
                  <th className="py-2.5 px-3 w-14">Rank</th>
                  <th className="py-2.5 px-3">Agent Name</th>
                  <th className="py-2.5 px-3 text-center">Calls logged</th>
                  <th className="py-2.5 px-3 text-right">Commitments value</th>
                  <th className="py-2.5 px-3 text-right">Target Achieved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 text-[13px]">
                {metrics.leaderboard.map((a) => (
                  <tr key={a.rank} className="hover:bg-bg-warm/10 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-ink-3">{a.rank}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent-ink text-[10.5px] font-semibold flex items-center justify-center select-none">
                          {a.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{a.name}</div>
                          <span className="text-[10.5px] text-ink-3 leading-none">{a.team}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-ink">{a.calls}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-accent-custom">{a.ptp}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-xs font-semibold text-good bg-good-bg px-2 py-0.5 rounded-md">
                        {a.achieved}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call outcomes feed */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm">
          <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Shift Feeds</span>
          <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5 mb-5">Recent call outcome logs</h3>

          <div className="space-y-4 relative pl-3.5 before:content-[''] before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom max-h-80 overflow-y-auto pr-1">
            {metrics.recentCalls.map((c, i) => (
              <div key={i} className="relative group text-[12.5px]">
                {/* Connection badge */}
                <span className={`absolute -left-[17.5px] top-1.5 w-2 h-2 rounded-full border border-surface shadow-sm ${
                  c.type === "good" ? "bg-good animate-pulse" : "bg-ink-3"
                }`} />

                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-semibold text-ink truncate">
                    {c.customer}
                  </span>
                  <span className="text-[10px] text-ink-3 whitespace-nowrap font-mono">{c.time}</span>
                </div>
                <div className="text-[11.5px] text-ink-2 mt-0.5 flex flex-wrap items-center gap-1">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold bg-bg-warm border border-border-custom text-ink-2`}>
                    {c.dispo} {c.amt ? `(${c.amt})` : ""}
                  </span>
                  <span className="text-ink-3 text-[10.5px]">by</span>
                  <span className="font-medium text-ink-2 text-[10.5px]">{c.agent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
