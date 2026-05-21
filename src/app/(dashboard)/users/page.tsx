"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Mail, 
  Activity,
  Plus,
  Key,
  X,
  Loader2
} from "lucide-react";
import { 
  getOperatorsWithPermissions, 
  createOperator, 
  updateOperatorPermissions,
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
  const [newRole, setNewRole] = useState<"Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Agent">("Agent");
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
        // Reset form and close modal
        setNewName("");
        setNewEmail("");
        setNewRole("Agent");
        setNewCanApprove(false);
        setNewCanImport(false);
        setNewCanViewAudit(false);
        setIsAddModalOpen(false);
        
        // Refresh operator list
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

  // Open Manage Permissions Modal
  const openManageModal = (operator: OperatorRecord) => {
    setSelectedOperator(operator);
    setManageCanApprove(operator.permissions.can_approve_waivers);
    setManageCanImport(operator.permissions.can_import_data);
    setManageCanViewAudit(operator.permissions.can_view_audit_logs);
    setManageError("");
    setIsManageModalOpen(true);
  };

  // Save modified permission overrides
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
        setManageError(res.error || "Failed to commit permissions updates.");
      } else {
        setIsManageModalOpen(false);
        setSelectedOperator(null);
        
        // Refresh list
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

  const formatEmail = (id: string, name: string) => {
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11") return "admin@goalcryst.com";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12") return "manager@goalcryst.com";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13") return "agent@goalcryst.com";
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

      {/* Grid summarizing privileges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <span className="p-2.5 bg-accent-soft text-accent-ink rounded-xl">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Role Gates Enforcement</h4>
            <p className="text-[11.5px] text-ink-2 mt-1">
              Primary role clearances are evaluated automatically during active page renderings and navigations.
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <span className="p-2.5 bg-good-bg text-good rounded-xl">
            <UserCheck className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Shift Overrides Mapping</h4>
            <p className="text-[11.5px] text-ink-2 mt-1">
              Granular clearances (e.g. Bulk Sheet Imports) can be customized directly for specific operators.
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border-custom p-4 rounded-2xl shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
          <span className="p-2.5 bg-bg-warm text-ink-2 rounded-xl">
            <Lock className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider">Audit Log Compliance</h4>
            <p className="text-[11.5px] text-ink-2 mt-1">
              Every registry change, addition, and permissions toggle logs a permanent footprint in the audit logs.
            </p>
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
                  <th className="py-3 px-5 text-right">Clearance Gates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 text-[13px]">
                {operators.map((row) => {
                  const email = formatEmail(row.id, row.full_name);
                  const scope = getScope(row);
                  const initials = getAvatarInitials(row.full_name);

                  return (
                    <tr key={row.id} className="hover:bg-bg-warm/10 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-ink text-xs font-semibold flex items-center justify-center select-none font-mono">
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
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
                          row.role === "Admin"
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-good">
                          <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => openManageModal(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border-custom hover:border-accent-custom/40 bg-surface text-ink-2 hover:text-accent-ink rounded-lg transition-colors cursor-pointer"
                        >
                          <Key className="w-3 h-3 text-ink-3" />
                          <span>Manage Overrides</span>
                        </button>
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
                  className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">System Access Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Agent")}
                  className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                >
                  <option value="Agent">Agent (Dedicated Recovery)</option>
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
      </div>
    </PermissionGuard>
  );
}
