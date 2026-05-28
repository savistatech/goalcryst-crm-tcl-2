"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  Activity,
  Plus,
  Key,
  X,
  Loader2,
  GitBranch,
  PowerOff,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  getOperatorsWithPermissions,
  createOperator,
  updateOperatorPermissions,
  toggleOperatorStatus,
  deleteOperator,
  type OperatorRecord
} from "@/app/actions/userActions";
import PermissionGuard from "@/components/PermissionGuard";

export default function UsersPage() {
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [, startTransition] = useTransition();

  // Add Operator Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee">("Employee");
  const [newCanApprove, setNewCanApprove] = useState(false);
  const [newCanImport, setNewCanImport] = useState(false);
  const [newCanViewAudit, setNewCanViewAudit] = useState(false);
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Manage Permissions Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<OperatorRecord | null>(null);
  const [manageCanApprove, setManageCanApprove] = useState(false);
  const [manageCanImport, setManageCanImport] = useState(false);
  const [manageCanViewAudit, setManageCanViewAudit] = useState(false);
  const [manageError, setManageError] = useState("");
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Status/Delete State
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Load operators on mount
  const loadOperators = async () => {
    setIsLoading(true);
    try {
      const data = await getOperatorsWithPermissions();
      setOperators(data);
      setErrorMsg("");
    } catch (err) {
      const error = err as Error;
      console.error("Failed to query operators:", error);
      setErrorMsg("Failed to query operators list. Please check database nodes status.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOperators();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Form Validation and submission for Add Operator
  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newName.trim()) {
      setAddError("Full Name is required.");
      return;
    }
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setAddError("Please provide a valid corporate email address.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await createOperator({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        canApprove: newCanApprove,
        canImport: newCanImport,
        canViewAudit: newCanViewAudit
      });

      if (!res.success) {
        setAddError(res.error || "Failed to register operator.");
      } else {
        setIsAddModalOpen(false);
        setNewName("");
        setNewEmail("");
        setNewRole("Employee");
        setNewCanApprove(false);
        setNewCanImport(false);
        setNewCanViewAudit(false);
        
        startTransition(() => {
          loadOperators();
        });
      }
    } catch (err) {
      const error = err as Error;
      setAddError("An unexpected exception occurred: " + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const openManageModal = (op: OperatorRecord) => {
    setSelectedOperator(op);
    setManageCanApprove(op.permissions.can_approve_waivers);
    setManageCanImport(op.permissions.can_import_data);
    setManageCanViewAudit(op.permissions.can_view_audit_logs);
    setManageError("");
    setIsManageModalOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedOperator) return;
    setManageError("");
    setIsSavingPermissions(true);

    try {
      const res = await updateOperatorPermissions(selectedOperator.id, {
        canApprove: manageCanApprove,
        canImport: manageCanImport,
        canViewAudit: manageCanViewAudit
      });

      if (!res.success) {
        setManageError(res.error || "Failed to update permissions.");
      } else {
        setIsManageModalOpen(false);
        setSelectedOperator(null);

        startTransition(() => {
          loadOperators();
        });
      }
    } catch (err) {
      const error = err as Error;
      setManageError("An unexpected exception occurred: " + error.message);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleToggleStatus = async (op: OperatorRecord) => {
    setIsTogglingStatus(op.id);
    try {
      const res = await toggleOperatorStatus(op.id, !op.is_active);
      if (!res.success) {
        alert(res.error || "Failed to update status.");
      } else {
        setOperators(prev => prev.map(o => o.id === op.id ? { ...o, is_active: !op.is_active } : o));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleDelete = async () => {
    if (!operatorToDelete || deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await deleteOperator(operatorToDelete.id);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete the user.");
      } else {
        setOperators(prev => prev.filter(o => o.id !== operatorToDelete.id));
        setIsDeleteModalOpen(false);
        setOperatorToDelete(null);
        setDeleteConfirmText("");
      }
    } catch (err: any) {
      setDeleteError("Unexpected error occurred: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatEmail = (id: string, name: string) => {
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11") return "admin@goalcryst.com";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12") return "manager@goalcryst.com";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13") return "employee@goalcryst.com";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14") return "auditor@goalcryst.com";
    return `${name.toLowerCase().replace(/\s+/g, ".")}@goalcryst.com`;
  };

  const getScope = (operator: OperatorRecord) => {
    const p = operator.permissions;
    const scopes: string[] = [];
    if (p.can_approve_waivers) scopes.push("Approve Waivers");
    if (p.can_import_data) scopes.push("Excel Imports");
    if (p.can_view_audit_logs) scopes.push("View Audits");

    if (scopes.length === 0) return "No dynamic clearance active";
    return scopes.join(" · ");
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <PermissionGuard permission="can_manage_users">
      <div className="space-y-6 animate-fade-in">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <span>GoalCryst CRM</span>
              <span>·</span>
              <span>Security Management Control</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
              Operator Access Control
            </h1>
            <p className="text-[13px] text-ink-2 mt-1">
              Audit system operators, register new profiles, and configure customizable security overrides.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/org"
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-border-custom hover:bg-bg-warm text-ink-2 hover:text-ink rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Org Chart</span>
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-custom hover:bg-accent-custom/90 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Operator</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border-custom bg-surface rounded-xl text-xs font-semibold text-ink-2 select-none shadow-sm">
              <Activity className="w-3.5 h-3.5 text-good animate-pulse" />
              <span>Database Nodes Active</span>
            </div>
          </div>
        </div>

        {/* Main Datatable */}
        <div className="bg-surface border border-border-custom rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
            <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Active Operators Roll</span>
            <span className="text-[11px] text-ink-2 font-mono">
              {operators.length} accounts loaded
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-ink-2 font-medium text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent-custom" />
              <span>Syncing operators access matrix...</span>
            </div>
          ) : errorMsg ? (
            <div className="py-12 text-center text-bad font-medium text-xs">
              {errorMsg}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10 select-none">
                    <th className="py-3 px-5">Operator profile</th>
                    <th className="py-3 px-4">Contact email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Active Custom Overrides</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 text-[13px]">
                  {operators.map((row) => {
                    const email = formatEmail(row.id, row.full_name);
                    const scope = getScope(row);
                    const initials = getAvatarInitials(row.full_name);

                    return (
                      <tr key={row.id} className={`hover:bg-bg-warm/10 transition-colors ${!row.is_active ? 'opacity-60 bg-bg-warm/30' : ''}`}>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center select-none font-mono ${
                              row.is_active ? 'bg-accent-soft text-accent-ink' : 'bg-border-custom text-ink-3'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-ink leading-tight">{row.full_name}</div>
                              <span className="text-[9.5px] font-mono text-ink-3 uppercase">ID: {row.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-ink-2 text-xs">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-ink-3" />
                            <span>{email}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${row.role === "Admin"
                              ? "bg-bad-bg text-bad border border-bad/10"
                              : row.role === "Branch Manager"
                                ? "bg-accent-soft text-accent-ink border border-accent-custom/10"
                                : row.role === "Assistant Manager"
                                  ? "bg-accent-soft text-accent-ink border border-accent-custom/10 opacity-90"
                                  : row.role === "Team Leader"
                                    ? "bg-bg-warm text-ink border border-border-custom"
                                    : "bg-good-bg text-good border border-good/10"
                            }`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-ink-2 text-[12.5px] truncate max-w-xs font-serif italic text-xs">
                          {scope}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-good">
                              <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warn">
                              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openManageModal(row)}
                              title="Manage Permissions"
                              className="inline-flex items-center justify-center w-8 h-8 text-xs border border-border-custom hover:border-accent-custom/40 bg-surface text-ink-2 hover:text-accent-ink rounded-lg transition-colors cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleStatus(row)}
                              disabled={isTogglingStatus === row.id}
                              title={row.is_active ? "Suspend Operator" : "Activate Operator"}
                              className={`inline-flex items-center justify-center w-8 h-8 text-xs border rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                                row.is_active 
                                ? "border-border-custom hover:border-warn/40 bg-surface text-ink-2 hover:text-warn"
                                : "border-warn/40 bg-warn-bg text-warn hover:bg-warn hover:text-white"
                              }`}
                            >
                              {isTogglingStatus === row.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PowerOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => { setOperatorToDelete(row); setIsDeleteModalOpen(true); }}
                              title="Delete Operator"
                              className="inline-flex items-center justify-center w-8 h-8 text-xs border border-border-custom hover:border-bad/40 bg-surface text-ink-2 hover:text-bad hover:bg-bad-bg rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL 1: ADD OPERATOR */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-xl overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-border-custom flex justify-between items-center bg-bg-warm/25">
                <h3 className="font-semibold text-ink font-serif">Register New Operator</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-bg-warm/50 text-ink-3 hover:text-ink rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddOperator} className="p-5 space-y-4">
                {addError && (
                  <div className="p-3 bg-bad-bg/30 border border-bad/20 text-bad rounded-xl text-xs font-semibold">
                    {addError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Corporate Email</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@goalcryst.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">System Access Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee")}
                    className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                  >
                    <option value="Employee">Employee (Dedicated Recovery)</option>
                    <option value="Team Leader">Team Leader (Team Management)</option>
                    <option value="Assistant Manager">Assistant Manager (Operations)</option>
                    <option value="Branch Manager">Branch Manager (Branch Operations)</option>
                    <option value="Admin">Admin (Global Access)</option>
                  </select>
                </div>

                {/* Checkboxes override */}
                <div className="border border-border-custom bg-bg-warm/15 rounded-xl p-3 space-y-2.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-ink-3 select-none">
                    Custom Security Override Clearance
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-ink-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanApprove}
                      onChange={(e) => setNewCanApprove(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom"
                    />
                    <div>
                      <span className="font-semibold text-ink">Approve Settlement Waivers</span>
                      <p className="text-[10.5px] text-ink-3">Clearance to authorize debt reductions</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-ink-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanImport}
                      onChange={(e) => setNewCanImport(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom"
                    />
                    <div>
                      <span className="font-semibold text-ink">Excel Sheet Bulk Imports</span>
                      <p className="text-[10.5px] text-ink-3">Clearance to upload massive recovery batches</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-ink-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanViewAudit}
                      onChange={(e) => setNewCanViewAudit(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom"
                    />
                    <div>
                      <span className="font-semibold text-ink">View Audit Compliance Logs</span>
                      <p className="text-[10.5px] text-ink-3">Clearance to search historical activity ledgers</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-border-custom hover:bg-bg-warm/40 text-ink-2 hover:text-ink rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent-custom hover:bg-accent-custom/90 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Register Operator</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: MANAGE PERMISSIONS OVERRIDES */}
        {isManageModalOpen && selectedOperator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-xl overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-border-custom flex justify-between items-center bg-bg-warm/25">
                <div>
                  <h3 className="font-semibold text-ink font-serif leading-tight">Manage Permission Overrides</h3>
                  <span className="text-[11px] text-ink-3">{selectedOperator.full_name} ({selectedOperator.role})</span>
                </div>
                <button
                  onClick={() => {
                    setIsManageModalOpen(false);
                    setSelectedOperator(null);
                  }}
                  className="p-1 hover:bg-bg-warm/50 text-ink-3 hover:text-ink rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {manageError && (
                  <div className="p-3 bg-bad-bg/30 border border-bad/20 text-bad rounded-xl text-xs font-semibold">
                    {manageError}
                  </div>
                )}

                <div className="text-xs text-ink-2">
                  Configure specific overrides that will bypass standard role permissions for this specific operator:
                </div>

                <div className="border border-border-custom bg-bg-warm/15 rounded-xl p-4 space-y-4">
                  <label className="flex items-start gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageCanApprove}
                      onChange={(e) => setManageCanApprove(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-ink text-sm">Approve Settlement Waivers</span>
                      <p className="text-[11px] text-ink-3 mt-0.5">Overrides database security policies to allow/block settlement waiver approvals.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageCanImport}
                      onChange={(e) => setManageCanImport(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-ink text-sm">Excel Sheet Bulk Imports</span>
                      <p className="text-[11px] text-ink-3 mt-0.5">Grants override privileges to upload Excel workbook allocation logs.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manageCanViewAudit}
                      onChange={(e) => setManageCanViewAudit(e.target.checked)}
                      className="w-4 h-4 rounded border-border-custom text-accent-custom focus:ring-accent-custom mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-ink text-sm">View Audit Compliance Logs</span>
                      <p className="text-[11px] text-ink-3 mt-0.5">Grants access to search through system operator action trails.</p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManageModalOpen(false);
                      setSelectedOperator(null);
                    }}
                    className="px-4 py-2 border border-border-custom hover:bg-bg-warm/40 text-ink-2 hover:text-ink rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent-custom hover:bg-accent-custom/90 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingPermissions && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Clearances</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE CONFIRMATION */}
        {isDeleteModalOpen && operatorToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-bad">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-lg font-semibold tracking-tight">Delete Operator</h3>
                </div>
                <button 
                  onClick={() => { setIsDeleteModalOpen(false); setOperatorToDelete(null); setDeleteConfirmText(""); setDeleteError(""); }}
                  className="text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {deleteError && (
                <div className="p-3 bg-bad-bg/40 border border-bad/20 text-bad rounded-xl text-xs font-semibold leading-relaxed">
                  {deleteError}
                </div>
              )}

              <div className="text-[13px] text-ink-2 space-y-3 leading-relaxed">
                <p>
                  You are about to <strong className="text-bad">permanently delete</strong> the account for <strong className="text-ink">{operatorToDelete.full_name}</strong>.
                </p>
                <p>
                  Because data integrity rules are set to `SET NULL`, any historical call logs or waivers authored by this user will be kept in the CRM, but their author will be permanently marked as <strong className="text-warn">Unknown</strong>.
                </p>
                <p className="font-semibold text-ink mt-2">
                  Type <span className="bg-bg-warm border border-border-custom px-1.5 py-0.5 rounded font-mono text-bad">DELETE</span> to confirm.
                </p>
              </div>

              <input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
                data-lpignore="true"
                className="w-full bg-surface border-2 border-border-custom rounded-xl px-4 py-3 text-sm text-ink font-mono focus:outline-none focus:border-bad transition-colors"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setOperatorToDelete(null); setDeleteConfirmText(""); setDeleteError(""); }}
                  className="h-10 px-4 rounded-xl border border-border-custom hover:bg-bg-warm text-[13px] font-semibold text-ink-2 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  className="h-10 px-6 rounded-xl bg-bad text-white text-[13px] font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
