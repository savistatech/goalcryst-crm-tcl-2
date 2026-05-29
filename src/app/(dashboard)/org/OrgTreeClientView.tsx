"use client";

import React, { useState, useCallback } from "react";
import {
  GitBranch,
  List,
  Network,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
  Edit2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Building2,
  Shield,
} from "lucide-react";
import { type OrgNode, type OrgProfile, type OrgRole, assignReportingTo } from "@/app/actions/orgActions";

interface OrgTreeClientViewProps {
  tree: OrgNode[];
  allProfiles: OrgProfile[];
  isAdmin: boolean;
}

/* ── Role Config ─────────────────────────────────────────────────────────── */
const ROLE_CONFIG: Record<OrgRole, { color: string; bg: string; border: string; dot: string; abbr: string }> = {
  "Admin": {
    color: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-50/70 dark:bg-indigo-500/10",
    border: "border-indigo-200 dark:border-indigo-500/20",
    dot: "bg-indigo-500 dark:bg-indigo-400",
    abbr: "ADM",
  },
  "Branch Manager": {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50/70 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
    dot: "bg-blue-500 dark:bg-blue-400",
    abbr: "BM",
  },
  "Assistant Manager": {
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50/70 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    abbr: "AM",
  },
  "Team Leader": {
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50/70 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/20",
    dot: "bg-orange-500 dark:bg-orange-400",
    abbr: "TL",
  },
  "Employee": {
    color: "text-ink-2",
    bg: "bg-bg-warm/80",
    border: "border-border-custom",
    dot: "bg-ink-3",
    abbr: "EMP",
  },
};

const ROLE_HIERARCHY: OrgRole[] = [
  "Admin",
  "Branch Manager",
  "Assistant Manager",
  "Team Leader",
  "Employee",
];

/* ── Avatar Component ────────────────────────────────────────────────────── */
function Avatar({ name, role, size = "md" }: { name: string; role: OrgRole; size?: "sm" | "md" | "lg" }) {
  const cfg = ROLE_CONFIG[role];
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-14 h-14 text-base" };
  return (
    <div className={`${sizes[size]} ${cfg.bg} ${cfg.border} border-2 rounded-full flex items-center justify-center font-bold ${cfg.color} flex-shrink-0`}>
      {initials}
    </div>
  );
}

/* ── Role Badge ──────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: OrgRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {role}
    </span>
  );
}

/* ── Assign Manager Modal ────────────────────────────────────────────────── */
function AssignModal({
  target,
  allProfiles,
  onClose,
  onSaved,
}: {
  target: OrgNode;
  allProfiles: OrgProfile[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentIndex = ROLE_HIERARCHY.indexOf(target.role);
  const eligibleManagers = allProfiles.filter(
    (p) => ROLE_HIERARCHY.indexOf(p.role) < currentIndex && p.id !== target.id && p.is_active
  );

  const [selectedManagerId, setSelectedManagerId] = useState<string>(target.reporting_to || "");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    setSubmitting(true);
    setResult(null);
    const res = await assignReportingTo(target.id, selectedManagerId || null);
    setSubmitting(false);
    if (res.success) {
      setResult({ ok: true, msg: "Reporting line updated successfully." });
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } else {
      setResult({ ok: false, msg: res.error || "Unknown error." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink font-serif">Assign Reporting Line</h3>
            <p className="text-xs text-ink-3 mt-0.5">Update who <strong className="text-ink">{target.full_name}</strong> reports to.</p>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-warm/50 border border-border-custom">
          <Avatar name={target.full_name} role={target.role} size="md" />
          <div>
            <p className="text-sm font-semibold text-ink">{target.full_name}</p>
            <RoleBadge role={target.role} />
          </div>
        </div>

        {/* Manager select */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3 block">
            Reports To
          </label>
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent-custom"
          >
            <option value="">— No Manager (Root / Unassigned) —</option>
            {eligibleManagers.map((mgr) => (
              <option key={mgr.id} value={mgr.id}>
                {mgr.full_name} ({mgr.role})
              </option>
            ))}
          </select>
          {eligibleManagers.length === 0 && (
            <p className="text-[11px] text-ink-3">No eligible managers found for this role level.</p>
          )}
        </div>

        {/* Result feedback */}
        {result && (
          <div className={`flex items-center gap-2 text-xs p-2.5 rounded-lg ${result.ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>
            {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{result.msg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="h-9 px-5 rounded-lg bg-ink hover:bg-black text-surface text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── OrgNode Card (recursive) ────────────────────────────────────────────── */
function OrgNodeCard({
  node,
  allProfiles,
  isAdmin,
  onAssign,
  depth,
}: {
  node: OrgNode;
  allProfiles: OrgProfile[];
  isAdmin: boolean;
  onAssign: (node: OrgNode) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const cfg = ROLE_CONFIG[node.role];
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative ${cfg.bg} border-2 ${cfg.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all w-52 group`}
        style={{ minWidth: "13rem" }}
      >
        {/* Active status dot */}
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${node.is_active ? "bg-good" : "bg-ink-3"}`} title={node.is_active ? "Active" : "Inactive"} />

        <div className="flex flex-col items-center text-center gap-2">
          <Avatar name={node.full_name} role={node.role} size="md" />
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">{node.full_name}</p>
            <div className="mt-1">
              <RoleBadge role={node.role} />
            </div>
          </div>

          {(node.branch || node.department) && (
            <div className="text-[10px] text-ink-3 flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5" />
              <span>{node.branch || node.department}</span>
            </div>
          )}

          {node.phone && (
            <div className="text-[10px] text-ink-3 flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" />
              <span>{node.phone}</span>
            </div>
          )}
        </div>

        {/* Reporting count */}
        <div className={`mt-3 pt-2 border-t ${cfg.border} flex items-center justify-between`}>
          <span className="text-[10px] text-ink-3">
            {hasChildren ? `${node.children.length} direct report${node.children.length !== 1 ? "s" : ""}` : "No reports"}
          </span>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => onAssign(node)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-bg-warm transition-all cursor-pointer text-ink-3 hover:text-ink"
                title="Reassign manager"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {hasChildren && (
              <button
                onClick={() => setExpanded((p) => !p)}
                className="p-1 rounded-md hover:bg-bg-warm transition-all cursor-pointer text-ink-3 hover:text-ink"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connector + Children */}
      {hasChildren && expanded && (
        <div className="flex flex-col items-center">
          {/* vertical line down */}
          <div className="w-px h-6 bg-border-custom/80" />
          {/* horizontal bar */}
          <div className="flex items-start gap-6 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 bg-border-custom/80 rounded-full"
                style={{
                  height: "2px",
                  left: "calc(50% - " + ((node.children.length - 1) * (208 + 24) / 2) + "px)",
                  width: ((node.children.length - 1) * (208 + 24)) + "px",
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* short vertical line up to the horizontal bar */}
                <div className="w-px h-6 bg-border-custom/80" />
                <OrgNodeCard
                  node={child}
                  allProfiles={allProfiles}
                  isAdmin={isAdmin}
                  onAssign={onAssign}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── List Table View ─────────────────────────────────────────────────────── */
function OrgListView({
  allProfiles,
  isAdmin,
  onAssign,
}: {
  allProfiles: OrgProfile[];
  isAdmin: boolean;
  onAssign: (node: OrgNode) => void;
}) {
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  return (
    <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
        <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
          All Employees ({allProfiles.length})
        </span>
        <span className="text-xs text-ink-3">Hierarchy — Who reports to whom</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10">
              <th className="py-2.5 px-5">Employee</th>
              <th className="py-2.5 px-4">Role</th>
              <th className="py-2.5 px-4">Reports To</th>
              <th className="py-2.5 px-4">Branch</th>
              <th className="py-2.5 px-4 text-center">Status</th>
              {isAdmin && <th className="py-2.5 px-5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/50 text-[13px]">
            {allProfiles.map((p) => {
              const manager = p.reporting_to ? profileMap.get(p.reporting_to) : null;
              const cfg = ROLE_CONFIG[p.role as OrgRole];
              return (
                <tr key={p.id} className="hover:bg-bg-warm/10 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.full_name} role={p.role as OrgRole} size="sm" />
                      <span className="font-medium text-ink">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <RoleBadge role={p.role as OrgRole} />
                  </td>
                  <td className="py-3 px-4">
                    {manager ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${ROLE_CONFIG[manager.role as OrgRole].dot}`} />
                        <span className="text-ink-2">{manager.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-ink-3 italic text-xs">Root / Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-ink-2">{p.branch || "—"}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.is_active ? "bg-good-bg text-good" : "bg-bg-warm text-ink-3"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? "bg-good" : "bg-ink-3"}`} />
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => onAssign({ ...p, children: [] } as OrgNode)}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-3 hover:text-accent-custom transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Reassign</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main View ───────────────────────────────────────────────────────────── */
export default function OrgTreeClientView({ tree, allProfiles, isAdmin }: OrgTreeClientViewProps) {
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [assignTarget, setAssignTarget] = useState<OrgNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssign = useCallback((node: OrgNode) => {
    setAssignTarget(node);
  }, []);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Full page reload to re-fetch fresh tree from server
    window.location.reload();
  }, []);

  // Summary counts per role
  const roleCounts = allProfiles.reduce((acc, p) => {
    acc[p.role as OrgRole] = (acc[p.role as OrgRole] || 0) + 1;
    return acc;
  }, {} as Record<OrgRole, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="font-brand">GoalCryst CRM</span>
          <span>·</span>
          <span>Organization</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
          Organization Chart
        </h1>
        <p className="text-[13px] text-ink-2 mt-1">
          Visual hierarchy of all users, their roles, and reporting lines.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["Admin", "Branch Manager", "Assistant Manager", "Team Leader", "Employee"] as OrgRole[]).map((role) => {
          const cfg = ROLE_CONFIG[role];
          const count = roleCounts[role] || 0;
          return (
            <div key={role} className={`bg-surface border ${cfg.border} rounded-2xl p-4`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} mb-2`} />
              <p className="text-2xl font-bold text-ink font-mono tabular-nums">{count}</p>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${cfg.color}`}>{role}</p>
            </div>
          );
        })}
      </div>

      {/* Admin note */}
      {isAdmin && (
        <div className="flex items-start gap-3 bg-bg-warm border border-border-custom rounded-xl p-4 text-[12px] text-ink-2 leading-relaxed">
          <Shield className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-ink">Admin view active.</strong> Hover any node in the tree and click the <Edit2 className="w-3 h-3 inline-block mx-0.5" /> edit icon, or use the &quot;Reassign&quot; button in list view, to update reporting lines.
          </span>
        </div>
      )}

      {/* View toggle + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <Users className="w-3.5 h-3.5" />
          <span><strong className="text-ink font-mono">{allProfiles.length}</strong> total users across <strong className="text-ink font-mono">{tree.length}</strong> root node{tree.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex bg-bg-warm rounded-xl p-1 border border-border-custom">
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${viewMode === "tree" ? "bg-surface shadow-sm text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            <Network className="w-3.5 h-3.5" />
            Tree
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${viewMode === "list" ? "bg-surface shadow-sm text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Tree View */}
      {viewMode === "tree" && (
        <div className="bg-surface border border-border-custom rounded-2xl p-6 overflow-auto shadow-sm">
          {tree.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <GitBranch className="w-8 h-8 text-ink-3 mx-auto" />
              <h3 className="text-sm font-semibold text-ink">No hierarchy defined yet</h3>
              <p className="text-xs text-ink-3 max-w-sm mx-auto">
                All employees are unassigned. {isAdmin ? "Use the List view to start assigning reporting lines." : "Ask your Admin to configure the hierarchy."}
              </p>
            </div>
          ) : (
            <div key={refreshKey} className="flex gap-10 justify-start items-start pb-4 min-w-max">
              {tree.map((rootNode) => (
                <OrgNodeCard
                  key={rootNode.id}
                  node={rootNode}
                  allProfiles={allProfiles}
                  isAdmin={isAdmin}
                  onAssign={handleAssign}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <OrgListView
          allProfiles={allProfiles}
          isAdmin={isAdmin}
          onAssign={handleAssign}
        />
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <AssignModal
          target={assignTarget}
          allProfiles={allProfiles}
          onClose={() => setAssignTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
