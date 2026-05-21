"use client";

import React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  PhoneForwarded,
  Upload,
  UserSquare2,
  CheckCircle,
  CalendarDays,
  FileSpreadsheet,
  Coins
} from "lucide-react";
import { type DashboardMetrics } from "@/app/actions/dashboardActions";

interface DashboardProps {
  metrics: DashboardMetrics;
}

export default function DashboardClientView({ metrics }: DashboardProps) {
  
  // Custom formatters for Indian Currency limits representation
  const formatExposure = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatMoneyShort = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Dynamically map monthly trend chart, putting active MTD values at the last coordinate
  const activeMonthStr = new Date().toLocaleString("default", { month: "short" });
  const RECOVERY_TREND_DATA = [
    { month: "Dec", recovered: 18.2, target: 25.0 },
    { month: "Jan", recovered: 22.4, target: 25.0 },
    { month: "Feb", recovered: 29.8, target: 30.0 },
    { month: "Mar", recovered: 35.1, target: 35.0 },
    { month: "Apr", recovered: 32.7, target: 35.0 },
    { month: activeMonthStr, recovered: Number((metrics.recoveredMtd / 100000).toFixed(1)), target: Number((metrics.recoveredTarget / 100000).toFixed(1)) }
  ];

  const mtdPercent = metrics.recoveredTarget > 0 
    ? Math.round((metrics.recoveredMtd / metrics.recoveredTarget) * 100) 
    : 0;

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

      {/* ===== 4 KPI METRICS METALLIC CARDS GRID ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Active Exposure</span>
            <span className="flex items-center text-xs font-semibold text-good">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>Stable</span>
            </span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-ink mt-2 font-mono">
            {formatExposure(metrics.activeOutstanding)}
          </div>
          <p className="text-[11.5px] text-ink-2 mt-2 truncate">
            across {metrics.contractCount} contracts · {metrics.productCount} products
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Recovered MTD</span>
            <span className="flex items-center text-xs font-semibold text-good">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>{mtdPercent}%</span>
            </span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-accent-custom mt-2 font-mono">
            {formatMoneyShort(metrics.recoveredMtd)}
          </div>
          <p className="text-[11.5px] text-ink-2 mt-2 truncate">
            Target {formatMoneyShort(metrics.recoveredTarget)} · {mtdPercent}% achieved
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">PTP Value Pending</span>
            <span className="flex items-center text-xs font-semibold text-good">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 animate-pulse" />
              <span>Active</span>
            </span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-ink mt-2 font-mono">
            {formatMoneyShort(metrics.ptpPendingValue)}
          </div>
          <p className="text-[11.5px] text-ink-2 mt-2 truncate">
            {metrics.ptpCount} commitment promises active
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Call Contactability</span>
            <span className="flex items-center text-xs font-semibold text-good">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>Ready</span>
            </span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-ink mt-2 font-mono">
            {metrics.contactabilityRate}%
          </div>
          <p className="text-[11.5px] text-ink-2 mt-2 truncate">
            {metrics.connectedCallsLogged} connected / {metrics.totalCallsLogged} logged attempts
          </p>
        </div>
      </div>

      {/* ===== RECHARTS DYNAMIC CHARTS SEGMENT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recovery trend line chart */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Recovery vs Target</span>
              <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5">Last 6 Months Trend</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-ink-2 font-medium select-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-custom" />
                <span>Recovered (Lakhs)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-ink-3" />
                <span>Target</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full select-none">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RECOVERY_TREND_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D5" vertical={false} />
                <XAxis dataKey="month" stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#EAE3D5", borderRadius: "8px" }}
                  labelStyle={{ fontWeight: "bold", color: "#1A1714", fontSize: "12px" }}
                  itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                  formatter={(value: any) => [`₹${value} L`, ""]}
                />
                <Line
                  type="monotone"
                  dataKey="recovered"
                  stroke="#B8431F"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#B8431F" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#9A9285"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bucket aging bar chart */}
        <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Portfolio by Bucket</span>
            <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5">Aging Snapshot</h3>
          </div>

          <div className="h-44 w-full my-4 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.bucketDist} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D5" vertical={false} />
                <XAxis dataKey="name" stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9A9285" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#EAE3D5", borderRadius: "8px" }}
                  itemStyle={{ fontSize: "12px" }}
                  formatter={(value: any, name: any, props: any) => [`₹${value} L (${props.payload.count} cases)`, "Outstanding"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {metrics.bucketDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aging legend details list */}
          <div className="grid grid-cols-3 gap-2 text-[10.5px] select-none">
            {metrics.bucketDist.map((b) => (
              <div key={b.name} className="flex items-center gap-1.5 border border-border-custom px-2 py-1 rounded bg-bg-warm/30">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="font-semibold text-ink">{b.name}</span>
                <span className="text-ink-3">({b.count})</span>
              </div>
            ))}
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
