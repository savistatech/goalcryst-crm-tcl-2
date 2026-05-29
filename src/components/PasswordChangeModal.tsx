import React, { useState } from "react";
import { X, Lock, Loader2 } from "lucide-react";
import { updateUserPassword } from "@/app/actions/userActions";

export default function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await updateUserPassword(newPassword);
      if (!res.success) {
        setError(res.error || "Failed to update password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-border-strong rounded-2xl shadow-xl overflow-hidden animate-scale-up">
        <div className="px-5 py-4 border-b border-border-custom flex justify-between items-center bg-bg-warm/25">
          <h3 className="font-semibold text-ink font-serif flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change Password
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-warm/50 text-ink-3 hover:text-ink rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-bad-bg/30 border border-bad/20 text-bad rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-good-bg/30 border border-good/20 text-good rounded-xl text-xs font-semibold">
              Password updated successfully!
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-ink-3">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-border-custom bg-bg/50 focus:bg-surface focus:border-accent-custom rounded-xl text-sm text-ink outline-none transition-all placeholder:text-ink-3"
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-custom hover:bg-bg-warm/40 text-ink-2 hover:text-ink rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-custom hover:bg-accent-custom/90 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
