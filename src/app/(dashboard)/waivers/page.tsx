import React from "react";
import { getPendingWaiverRequests, getMyWaiverRequests } from "@/app/actions/waiverActions";
import WaiverReviewClientView from "./WaiverReviewClientView";
import EmployeeWaiverTrackerView from "./EmployeeWaiverTrackerView";
import PermissionGuard from "@/components/PermissionGuard";
import { getCurrentUserPermissions } from "@/app/actions/userActions";

/**
 * Smart Waivers page:
 *  - can_approve_waiver  → Full manager approval queue (WaiverReviewClientView)
 *  - can_raise_waiver    → Employee's own submissions tracker (EmployeeWaiverTrackerView)
 *  - Neither             → PermissionGuard access-denied wall
 */
export default async function WaiversPage() {
  const permissions = await getCurrentUserPermissions();
  const canApprove = !!permissions.can_approve_waiver;
  const canRaise = !!permissions.can_raise_waiver;

  if (canApprove) {
    const pendingWaivers = await getPendingWaiverRequests();
    return <WaiverReviewClientView initialWaivers={pendingWaivers} />;
  }

  if (canRaise) {
    const myWaivers = await getMyWaiverRequests();
    return <EmployeeWaiverTrackerView myWaivers={myWaivers} />;
  }

  // Fallback: neither permission — show access denied
  return (
    <PermissionGuard permission="can_approve_waiver">
      {/* This inner content is never rendered; guard shows the 403 wall */}
      <div />
    </PermissionGuard>
  );
}
