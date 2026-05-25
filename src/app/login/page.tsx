"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@goalcryst.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate database lookup and auth session
    setTimeout(() => {
      const emailTrim = email.trim().toLowerCase();
      const validEmails = ["admin@goalcryst.com", "bm@goalcryst.com", "am@goalcryst.com", "tl@goalcryst.com", "employee@goalcryst.com"];

      if (validEmails.includes(emailTrim) && password === "password123") {
        // Write dynamic local session cookie
        document.cookie = `goalcryst_session=${encodeURIComponent(emailTrim)}; path=/; max-age=86400; SameSite=Lax`;
        
        if (emailTrim === "employee@goalcryst.com") {
          router.push("/search");
        } else {
          router.push("/");
        }
      } else {
        setError("Invalid email address or security credentials. Please try again.");
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-bg text-ink relative flex flex-col items-center justify-center p-6 font-sans">
      {/* Noise filter overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.02] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E')]" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center select-none flex flex-col items-center">
          <img src="/logo.png" alt="GoalCryst Logo" className="h-12 w-auto object-contain mb-3" />
          <div className="inline-flex items-baseline gap-1.5 justify-center">
            <span className="text-4xl font-semibold tracking-tight text-ink font-serif">GoalCryst</span>
            <span className="w-2 h-2 rounded-full bg-accent-custom" />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-3 font-semibold mt-1">Recovery CRM</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-border-custom rounded-2xl p-8 shadow-md space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Sign in to workspace</h2>
            <p className="text-xs text-ink-2">Enter credentials below to resume active recovery shift.</p>
          </div>

          {error && (
            <div className="bg-bad-bg text-bad text-xs font-semibold px-3 py-2 rounded-lg border border-bad/10 animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold block">Email address</label>
              <div className="relative flex items-center bg-bg border border-border-custom rounded-lg px-3 py-2 shadow-inner focus-within:border-ink-2 transition-all">
                <Mail className="w-4 h-4 text-ink-3 mr-2.5 flex-shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@goalcryst.com"
                  className="w-full bg-transparent border-0 outline-none text-sm text-ink placeholder-ink-3"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold block">Security Password</label>
                <a
                  onClick={() => alert("Password reset is managed by the Admin in dynamic profile permissions.")}
                  className="text-xs text-ink-3 hover:text-ink cursor-pointer hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <div className="relative flex items-center bg-bg border border-border-custom rounded-lg px-3 py-2 shadow-inner focus-within:border-ink-2 transition-all">
                <Lock className="w-4 h-4 text-ink-3 mr-2.5 flex-shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent border-0 outline-none text-sm text-ink placeholder-ink-3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-ink hover:bg-black text-surface text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing account...</span>
                </>
              ) : (
                <span>Sign in & Start Shift</span>
              )}
            </button>
          </form>

          {/* Quick Mock Credentials Assist */}
          <div className="bg-bg-warm/40 border border-border-custom rounded-lg p-3 text-[11px] text-ink-2 space-y-1.5 select-none">
            <span className="font-semibold text-ink uppercase tracking-wide text-[9.5px] block">Quick Sign-In Credentials (Password: password123)</span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>Admin: <strong className="text-ink font-mono">admin@goalcryst.com</strong></div>
              <div>Branch Mgr: <strong className="text-ink font-mono">bm@goalcryst.com</strong></div>
              <div>Asst Mgr: <strong className="text-ink font-mono">am@goalcryst.com</strong></div>
              <div>Team Leader: <strong className="text-ink font-mono">tl@goalcryst.com</strong></div>
              <div>Employee: <strong className="text-ink font-mono">employee@goalcryst.com</strong></div>
            </div>
          </div>
        </div>

        {/* Footer legal note */}
        <div className="flex justify-center items-center gap-1.5 text-[10.5px] text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-custom" />
          <span>Internal recovery system · Authorized operators only</span>
        </div>
      </div>
    </div>
  );
}
