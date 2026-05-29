"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
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
  AlertTriangle,
  Pencil
} from "lucide-react";
import {
  getOperatorsWithPermissions,
  createOperator,
  updateUserProfile,
  updateOperatorPermissions,
  toggleOperatorStatus,
  deleteOperator,
  adminResetUserPassword,
  type OperatorRecord
} from "@/app/actions/userActions";
import PermissionGuard from "@/components/PermissionGuard";

type UserRole = "Admin" | "Branch Manager" | "Assistant Manager" | "Team Leader" | "Employee";

export default function UsersPage() {
  const [operators, setOperators] = useState<OperatorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [, startTransition] = useTransition();

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Employee");
  const [newPassword, setNewPassword] = useState("");
  const [newReportingTo, setNewReportingTo] = useState("");
  const [newCanApprove, setNewCanApprove] = useState(false);
  const [newCanImport, setNewCanImport] = useState(false);
  const [newCanViewAudit, setNewCanViewAudit] = useState(false);
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<OperatorRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("Employee");
  const [editReportingTo, setEditReportingTo] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Admin Reset Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<OperatorRecord | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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

  // Load users on mount
  const loadOperators = async () => {
    setIsLoading(true);
    try {
      const data = await getOperatorsWithPermissions();
      setOperators(data);
      setErrorMsg("");
    } catch (err) {
      const error = err as Error;
      console.error("Failed to query users:", error);
      setErrorMsg("Failed to query users list. Please check database nodes status.");
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

  // Form Validation and submission for Add User
  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newName.trim()) {
      setAddError("Full Name is required.");
      return;
    }
    if (!newUsername.trim()) {
      setAddError("Please provide a valid username.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await createOperator({
        name: newName.trim(),
        username: newUsername.trim().toLowerCase(),
        role: newRole,
        password: newPassword || undefined,
        reporting_to: newReportingTo || null,
        canApprove: newCanApprove,
        canImport: newCanImport,
        canViewAudit: newCanViewAudit
      });

      if (!res.success) {
        setAddError(res.error || "Failed to register user.");
      } else {
        setIsAddModalOpen(false);
        setNewName("");
        setNewUsername("");
        setNewPassword("");
        setNewReportingTo("");
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

  const openEditModal = (op: OperatorRecord) => {
    setEditTargetUser(op);
    setEditName(op.full_name);
    setEditRole(op.role);
    setEditReportingTo(op.reporting_to || "");
    setEditBranch(op.branch || "");
    setEditDepartment(op.department || "");
    setEditPhone(op.phone || "");
    setEditError("");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditTargetUser(null);
    setEditName("");
    setEditRole("Employee");
    setEditReportingTo("");
    setEditBranch("");
    setEditDepartment("");
    setEditPhone("");
    setEditError("");
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;
    setEditError("");

    if (!editName.trim()) {
      setEditError("Full Name is required.");
      return;
    }

    if (editReportingTo === editTargetUser.id) {
      setEditError("A user cannot report to themselves.");
      return;
    }

    setIsEditing(true);
    try {
      const res = await updateUserProfile(editTargetUser.id, {
        full_name: editName.trim(),
        role: editRole,
        reporting_to: editReportingTo || null,
        branch: editBranch,
        department: editDepartment,
        phone: editPhone
      });

      if (!res.success) {
        setEditError(res.error || "Failed to update user.");
      } else {
        closeEditModal();
        startTransition(() => {
          loadOperators();
        });
      }
    } catch (err) {
      const error = err as Error;
      setEditError("An unexpected exception occurred: " + error.message);
    } finally {
      setIsEditing(false);
    }
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
    } catch (err) {
      const error = err as Error;
      alert("Error: " + error.message);
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
    } catch (err) {
      const error = err as Error;
      setDeleteError("Unexpected error occurred: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    
    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setIsResetting(true);
    setResetError("");

    try {
      const res = await adminResetUserPassword(resetTargetUser.id, resetPassword);
      if (!res.success) {
        setResetError(res.error || "Failed to reset password.");
      } else {
        alert(`Password for ${resetTargetUser.full_name} has been reset successfully.`);
        setIsResetModalOpen(false);
        setResetTargetUser(null);
        setResetPassword("");
      }
    } catch (err) {
      const error = err as Error;
      setResetError("Unexpected error occurred: " + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const formatUsername = (id: string, name: string) => {
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11") return "admin";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12") return "bm";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15") return "am";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16") return "tl";
    if (id === "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13") return "employee";
    return name.toLowerCase().replace(/\s+/g, ".");
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
              <span className="font-brand">GoalCryst CRM</span>
              <span>·</span>
              <span>Security Management Control</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
              User Access Control
            </h1>
            <p className="text-[13px] text-ink-2 mt-1">
              Audit system users, register new profiles, and configure customizable security overrides.
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
              <span>Add User</span>
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
            <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Active Users</span>
            <span className="text-[11px] text-ink-2 font-mono">
              {operators.length} accounts loaded
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-ink-2 font-medium text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent-custom" />
              <span>Syncing users access matrix...</span>
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
                    <th className="py-3 px-5">User profile</th>
                    <th className="py-3 px-4">System Username</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Active Custom Overrides</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 text-[13px]">
                  {operators.map((row) => {
                    const username = formatUsername(row.id, row.full_name);
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
                            <span>{username}</span>
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
                              onClick={() => openEditModal(row)}
                              title="Edit User"
                              className="inline-flex items-center justify-center w-8 h-8 text-xs border border-border-custom hover:border-accent-custom/40 bg-surface text-ink-2 hover:text-accent-ink rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => { setResetTargetUser(row); setIsResetModalOpen(true); }}
                              title="Reset Password"
                              className="inline-flex items-center justify-center w-8 h-8 text-xs border border-border-custom hover:border-accent-custom/40 bg-surface text-ink-2 hover:text-accent-ink rounded-lg transition-colors cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            
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
                              title={row.is_active ? "Suspend User" : "Activate User"}
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
                              title="Delete User"
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

        {/* MODAL 1: ADD USER */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-surface border border-border-strong rounded-2xl shadow-xl overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-border-custom flex justify-between items-center bg-bg-warm/25">
                <h3 className="font-semibold text-ink font-serif">Register New User</h3>
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
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">System Username</label>
                  <input
                    type="text"
                    placeholder="e.g. admin"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
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
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                  >
                    <option value="Employee">Employee (Dedicated Recovery)</option>
                    <option value="Team Leader">Team Leader (Team Management)</option>
                    <option value="Assistant Manager">Assistant Manager (Operations)</option>
                    <option value="Branch Manager">Branch Manager (Branch Operations)</option>
                    <option value="Admin">Admin (Global Access)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Security Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to use 'password123'"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    data-lpignore="true"
                    className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Reports To (Lead)</label>
                  <select
                    value={newReportingTo}
                    onChange={(e) => setNewReportingTo(e.target.value)}
                    className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                  >
                    <option value="">— No Manager (Root) —</option>
                    {operators
                      .filter(o => ["Admin", "Branch Manager", "Assistant Manager", "Team Leader"].includes(o.role) && o.is_active)
                      .map(o => (
                        <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>
                      ))}
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
                    <span>Register User</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT USER */}
        {isEditModalOpen && editTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-surface border border-border-strong rounded-2xl shadow-xl overflow-hidden animate-scale-up">
              <div className="px-5 py-4 border-b border-border-custom flex justify-between items-center bg-bg-warm/25">
                <div>
                  <h3 className="font-semibold text-ink font-serif leading-tight">Edit User</h3>
                  <span className="text-[11px] text-ink-3">{editTargetUser.full_name}</span>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-1 hover:bg-bg-warm/50 text-ink-3 hover:text-ink rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="p-5 space-y-4">
                {editError && (
                  <div className="p-3 bg-bad-bg/30 border border-bad/20 text-bad rounded-xl text-xs font-semibold">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">System Access Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Team Leader">Team Leader</option>
                      <option value="Assistant Manager">Assistant Manager</option>
                      <option value="Branch Manager">Branch Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Reports To</label>
                    <select
                      value={editReportingTo}
                      onChange={(e) => setEditReportingTo(e.target.value)}
                      className="w-full px-3 py-2 border border-border-custom bg-bg/50 focus:border-accent-custom rounded-xl text-sm text-ink outline-none cursor-pointer transition-colors"
                    >
                      <option value="">No Manager</option>
                      {operators
                        .filter(o => o.id !== editTargetUser.id && ["Admin", "Branch Manager", "Assistant Manager", "Team Leader"].includes(o.role) && o.is_active)
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Branch</label>
                    <input
                      type="text"
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Department</label>
                    <input
                      type="text"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 border border-border-custom hover:bg-bg-warm/40 text-ink-2 hover:text-ink rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent-custom hover:bg-accent-custom/90 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isEditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save User</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: MANAGE PERMISSIONS OVERRIDES */}
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
                  Configure specific overrides that will bypass standard role permissions for this specific user:
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
                      <p className="text-[11px] text-ink-3 mt-0.5">Grants access to search through system user action trails.</p>
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

        {/* MODAL 4: DELETE CONFIRMATION */}
        {isDeleteModalOpen && operatorToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-bad">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-lg font-semibold tracking-tight">Delete User</h3>
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

        {/* MODAL 5: ADMIN RESET PASSWORD */}
        {isResetModalOpen && resetTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-up space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink font-serif flex items-center gap-2">
                    <Lock className="w-5 h-5 text-accent-custom" /> Reset Password
                  </h3>
                  <p className="text-xs text-ink-3 mt-1">For {resetTargetUser.full_name}</p>
                </div>
                <button 
                  onClick={() => { setIsResetModalOpen(false); setResetTargetUser(null); setResetPassword(""); setResetError(""); }}
                  className="text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminResetPassword} className="space-y-4">
                {resetError && (
                  <div className="p-3 bg-bad-bg/40 border border-bad/20 text-bad rounded-xl text-xs font-semibold leading-relaxed">
                    {resetError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">New Password</label>
                  <input
                    type="text"
                    placeholder="e.g. TempPass!23"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    className="w-full bg-surface border-2 border-border-custom rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-accent-custom transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsResetModalOpen(false); setResetTargetUser(null); setResetPassword(""); setResetError(""); }}
                    className="h-10 px-4 rounded-xl border border-border-custom hover:bg-bg-warm text-[13px] font-semibold text-ink-2 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="h-10 px-6 rounded-xl bg-ink text-white hover:bg-black text-[13px] font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isResetting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Reset Password</span>
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
