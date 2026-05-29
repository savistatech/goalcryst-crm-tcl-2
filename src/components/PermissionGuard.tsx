"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { getCurrentUserPermissions } from "@/app/actions/userActions";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const perms = await getCurrentUserPermissions();
        
        if (perms.can_manage_roles && perms.can_manage_users) {
          setUserRole("Admin");
          setHasAccess(true);
        } else {
          setUserRole("Current user");
          setHasAccess(!!perms[permission]);
        }
      } catch (err) {
        console.error("Permission check failed:", err);
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(() => {
      checkAccess();
    }, 0);
    return () => clearTimeout(timer);
  }, [permission]);

  if (isChecking) {
    return (
      <div className="py-20 text-center text-ink-2 font-medium text-xs flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent-custom" />
        <span>Validating security clearance keys...</span>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto my-12 bg-surface border border-border-strong rounded-2xl p-8 text-center shadow-md animate-scale-up space-y-4">
        <span className="inline-flex p-3 bg-bad-bg text-bad rounded-2xl mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </span>
        <h2 className="text-lg font-bold text-ink font-serif">Security Clearance Blockade</h2>
        <p className="text-xs text-ink-2 leading-relaxed">
          Your profile (assigned role: <strong className="text-ink font-semibold">{userRole}</strong>) does not hold the active cryptographic override key <code className="px-1.5 py-0.5 bg-bg-warm border border-border-custom rounded text-[10px] font-mono text-ink-3">{permission}</code> required to access this system gate.
        </p>
        <div className="pt-2">
          <p className="text-[11px] text-ink-3">
            Contact your CRM Administrator to request manual override mapping.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
