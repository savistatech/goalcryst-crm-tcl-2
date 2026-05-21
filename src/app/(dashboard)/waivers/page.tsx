import React from "react";
import { cookies } from "next/headers";
import { getPendingWaiverRequests, getMyWaiverRequests } from "@/app/actions/waiverActions";
import WaiverReviewClientView from "./WaiverReviewClientView";
import AgentWaiverTrackerView from "./AgentWaiverTrackerView";
import PermissionGuard from "@/components/PermissionGuard";

/**
 * Smart Waivers page:
 *  - can_approve_waiver  → Full manager approval queue (WaiverReviewClientView)
 *  - can_raise_waiver    → Agent's own submissions tracker (AgentWaiverTrackerView)
 *  - Neither             → PermissionGuard access-denied wall
 */
export default async function WaiversPage() {
  // Resolve session role from cookie (same pattern as layout.tsx)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("goalcryst_session")?.value;

  let role = "Agent";
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      role = parsed.role || "Agent";
    } catch {
      // ignore malformed cookie
    }
  }

  const canApprove = role === "Super Admin" || role === "Manager";
  const canRaise = ["Super Admin", "Manager", "Agent"].includes(role);

  if (canApprove) {
    const pendingWaivers = await getPendingWaiverRequests();
    return <WaiverReviewClientView initialWaivers={pendingWaivers} />;
  }

  if (canRaise) {
    const myWaivers = await getMyWaiverRequests();
    return <AgentWaiverTrackerView myWaivers={myWaivers} />;
  }

  // Fallback: neither permission — show access denied
  return (
    <PermissionGuard permission="can_approve_waiver">
      {/* This inner content is never rendered; guard shows the 403 wall */}
      <div />
    </PermissionGuard>
  );
}
