"use client";

import React, { useState, useEffect } from "react";
import { getWaiverReasons, createWaiverReason, toggleWaiverReasonStatus, updateWaiverReason } from "@/app/actions/adminSettingsActions";
import { PlusCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function WaiversSetupPage() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<any | null>(null);
  const [editReasonText, setEditReasonText] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getWaiverReasons();
      setReasons(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReason) return;
    setSubmitting(true);
    
    const res = await createWaiverReason(newReason);
    if (res.success) {
      setIsModalOpen(false);
      setNewReason("");
      loadData();
    } else {
      alert(res.error);
    }
    setSubmitting(false);
  };

  const startEdit = (r: any) => {
    setEditingReason(r);
    setEditReasonText(r.reason);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReason || !editReasonText.trim()) return;
    setUpdating(true);
    
    const res = await updateWaiverReason(editingReason.id, editReasonText.trim());
    if (res.success) {
      setIsEditModalOpen(false);
      setEditingReason(null);
      setEditReasonText("");
      loadData();
    } else {
      alert(res.error);
    }
    setUpdating(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleWaiverReasonStatus(id, !currentStatus);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-accent-custom" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink font-serif">Waiver Reasons Settings</h1>
          <p className="text-sm text-ink-3">Manage allowable reasons for requesting settlement waivers.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-custom hover:bg-accent-ink text-surface rounded-lg shadow-sm font-semibold transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reason</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border-custom shadow-sm overflow-hidden max-w-4xl">
        <table className="w-full text-left text-sm text-ink-2">
          <thead className="bg-bg-warm/50 text-ink-3 uppercase text-[10px] tracking-wider border-b border-border-custom">
            <tr>
              <th className="px-4 py-3 font-semibold w-1/2">Waiver Reason</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom">
            {reasons.map((r) => (
              <tr key={r.id} className="hover:bg-bg-warm/20 transition-colors">
                <td className="px-4 py-3 font-medium text-ink">{r.reason}</td>
                <td className="px-4 py-3">
                  {r.is_active ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-good bg-good-bg/30 px-2 py-0.5 rounded-full w-max">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-bad bg-bad-bg/30 px-2 py-0.5 rounded-full w-max">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(r)}
                    className="text-xs font-semibold text-ink-3 hover:text-ink hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggle(r.id, r.is_active)}
                    className="text-xs font-semibold text-accent-custom hover:underline"
                  >
                    {r.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {reasons.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-ink-3 italic">No waiver reasons found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-semibold text-ink border-b border-border-custom pb-3 mb-4">Create Waiver Reason</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Reason Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Hardship"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg p-2 text-sm text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-3 hover:text-ink">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-ink hover:opacity-90 active:scale-[0.99] text-surface text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-semibold text-ink border-b border-border-custom pb-3 mb-4">Edit Waiver Reason</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Reason Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Hardship"
                  value={editReasonText}
                  onChange={(e) => setEditReasonText(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg p-2 text-sm text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border-custom">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-3 hover:text-ink">Cancel</button>
                <button type="submit" disabled={updating} className="px-4 py-2 bg-ink hover:opacity-90 active:scale-[0.99] text-surface text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2">
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
