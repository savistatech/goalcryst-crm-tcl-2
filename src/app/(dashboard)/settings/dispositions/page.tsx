"use client";

import React, { useState, useEffect } from "react";
import { getMainDispositions, getSubDispositions, createSubDisposition, toggleSubDispositionStatus } from "@/app/actions/adminSettingsActions";
import { PlusCircle, Loader2, Trash2, CheckCircle2, XCircle, FilePlus2 } from "lucide-react";

export default function DispositionsSetupPage() {
  const [mainDispos, setMainDispos] = useState<any[]>([]);
  const [subDispos, setSubDispos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMainId, setNewMainId] = useState("");
  const [newName, setNewName] = useState("");
  const [formFields, setFormFields] = useState<{ id: string; label: string; type: string; required: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mainRes, subRes] = await Promise.all([
        getMainDispositions(),
        getSubDispositions()
      ]);
      setMainDispos(mainRes);
      setSubDispos(subRes);
      if (mainRes.length > 0) setNewMainId(mainRes[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFormFields([...formFields, { id: `field_${Date.now()}`, label: "", type: "text", required: false }]);
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...formFields];
    newFields.splice(index, 1);
    setFormFields(newFields);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...formFields];
    (newFields[index] as any)[key] = value;
    setFormFields(newFields);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainId || !newName) return;
    setSubmitting(true);
    
    // Ensure IDs are valid snake_case for JSON payload mapping
    const cleanFields = formFields.map(f => ({
      ...f,
      id: f.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    }));

    const res = await createSubDisposition(newMainId, newName, cleanFields);
    if (res.success) {
      setIsModalOpen(false);
      setNewName("");
      setFormFields([]);
      loadData();
    } else {
      alert(res.error);
    }
    setSubmitting(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleSubDispositionStatus(id, !currentStatus);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-accent-custom" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-ink font-serif">Disposition Settings</h1>
          <p className="text-sm text-ink-3">Configure call outcomes and map dynamic required fields.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-custom hover:bg-accent-ink text-surface rounded-lg shadow-sm font-semibold transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Sub-Disposition</span>
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border-custom shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-ink-2">
          <thead className="bg-bg-warm/50 text-ink-3 uppercase text-[10px] tracking-wider border-b border-border-custom">
            <tr>
              <th className="px-4 py-3 font-semibold">Main Disposition</th>
              <th className="px-4 py-3 font-semibold">Sub Disposition</th>
              <th className="px-4 py-3 font-semibold">Dynamic Fields Configuration</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom">
            {subDispos.map((sd) => (
              <tr key={sd.id} className="hover:bg-bg-warm/20 transition-colors">
                <td className="px-4 py-3 font-medium text-ink">{sd.main_disposition?.name}</td>
                <td className="px-4 py-3 font-semibold text-ink">{sd.name}</td>
                <td className="px-4 py-3 font-mono text-[11px]">
                  {sd.form_schema && sd.form_schema.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {sd.form_schema.map((f: any, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-bg-warm border border-border-strong text-ink-2">
                          {f.label} ({f.type}){f.required ? "*" : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-3 italic">None (Static)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {sd.is_active ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-good bg-good-bg/30 px-2 py-0.5 rounded-full w-max">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-bad bg-bad-bg/30 px-2 py-0.5 rounded-full w-max">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleToggle(sd.id, sd.is_active)}
                    className="text-xs font-semibold text-accent-custom hover:underline"
                  >
                    {sd.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {subDispos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-3 italic">No sub-dispositions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-2xl p-6 shadow-xl relative animate-scale-up">
            <h3 className="text-lg font-semibold text-ink border-b border-border-custom pb-3 mb-4">Create Sub-Disposition</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Main Disposition Parent</label>
                  <select
                    required
                    value={newMainId}
                    onChange={(e) => setNewMainId(e.target.value)}
                    className="w-full bg-bg border border-border-custom rounded-lg p-2 text-sm text-ink"
                  >
                    {mainDispos.map(md => (
                      <option key={md.id} value={md.id}>{md.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Sub-Disposition Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Promise to Pay"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-bg border border-border-custom rounded-lg p-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="border border-border-custom rounded-xl p-4 bg-bg-warm/30 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">Dynamic Form Fields (Optional)</label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="flex items-center gap-1 text-[11px] font-semibold text-accent-custom hover:bg-accent-soft px-2 py-1 rounded"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
                {formFields.length === 0 ? (
                  <p className="text-xs text-ink-3 italic">No extra fields required for this disposition.</p>
                ) : (
                  <div className="space-y-2">
                    {formFields.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-2 p-2 bg-surface border border-border-custom rounded-lg">
                        <input
                          type="text"
                          required
                          placeholder="Field Label (e.g. Amount)"
                          value={field.label}
                          onChange={(e) => updateField(idx, "label", e.target.value)}
                          className="flex-1 bg-transparent text-xs border-b border-border-custom px-1 outline-none focus:border-accent-custom"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateField(idx, "type", e.target.value)}
                          className="bg-bg-warm border border-border-custom rounded text-xs p-1"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="datetime-local">Date Time</option>
                        </select>
                        <label className="flex items-center gap-1 text-[10px] uppercase font-semibold text-ink-3">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(idx, "required", e.target.checked)}
                          /> Req.
                        </label>
                        <button type="button" onClick={() => handleRemoveField(idx)} className="p-1 text-bad hover:bg-bad-bg rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ink-3 hover:text-ink">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-ink hover:bg-black text-surface text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
