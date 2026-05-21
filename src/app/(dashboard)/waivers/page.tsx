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
      const decoded = decodeURIComponent(sessionCookie).toLowerCase();
      if (decoded.includes("admin")) role = "Admin";
      else if (decoded.includes("bm@")) role = "Branch Manager";
      else if (decoded.includes("am@")) role = "Assistant Manager";
      else if (decoded.includes("tl@")) role = "Team Leader";
      else role = "Agent";
    }
  }

  const canApprove = ["Admin", "Branch Manager", "Assistant Manager", "Team Leader"].includes(role);
  const canRaise = true; // All 5 roles can raise waivers

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
