"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const usernameTrim = username.trim().toLowerCase();

    let targetEmail = usernameTrim;
    if (!usernameTrim.includes("@")) {
      const { data: lookedUpEmail, error: lookupError } = await supabase.rpc("get_auth_email_by_username", {
        input_username: usernameTrim,
      });

      if (lookupError || !lookedUpEmail) {
        console.error("Username lookup failed:", lookupError);
        setError("Invalid username or password.");
        setLoading(false);
        return;
      }
      targetEmail = lookedUpEmail;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password,
    });

    if (authError) {
      console.error("Authentication failed:", authError);
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }

    // Get user role to determine routing
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user?.id).single();
    
    if (profile?.role === "Employee") {
      router.push("/search");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink relative flex flex-col items-center justify-center p-6 font-sans">
      {/* Noise filter overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.025] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E')]" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center select-none flex flex-col items-center">
          <img src="/logo.png" alt="GoalCryst Logo" className="h-12 w-auto object-contain mb-3" />
          <div className="inline-flex items-baseline gap-1.5 justify-center">
            <span className="text-4xl font-semibold text-ink font-brand">GoalCryst</span>
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
              <label className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold block">Username</label>
              <div className="relative flex items-center bg-bg border border-border-custom rounded-lg px-3 py-2 shadow-inner focus-within:border-ink-2 transition-all">
                <ShieldCheck className="w-4 h-4 text-ink-3 mr-2.5 flex-shrink-0" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
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
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent border-0 outline-none text-sm text-ink placeholder-ink-3 pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-ink-3 hover:text-ink transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-ink hover:opacity-90 active:scale-[0.99] text-surface text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
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


        </div>

        {/* Footer legal note */}
        <div className="flex justify-center items-center gap-1.5 text-[10.5px] text-ink-3">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-custom" />
          <span>Internal recovery system · Authorized users only</span>
        </div>
      </div>
    </div>
  );
}
