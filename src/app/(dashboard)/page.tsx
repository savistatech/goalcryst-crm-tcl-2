import React from "react";
import { cookies } from "next/headers";
import { getDashboardMetrics, getEmployeeDashboardMetrics } from "@/app/actions/dashboardActions";
import DashboardClientView from "./DashboardClientView";
import EmployeeOverviewClientView from "./EmployeeOverviewClientView";

/**
 * Role-aware Overview page:
 *  - Admin / Branch Mgr / Asst Mgr / Team Leader → Full operational command center (DashboardClientView)
 *  - Employee                 → Personal productivity dashboard (EmployeeOverviewClientView)
 */
export default async function OverviewPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("goalcryst_session")?.value;

  let role = "Employee";
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      role = parsed.role || "Employee";
    } catch {
      // Fallback: try simple string match from older cookie format
      const decoded = decodeURIComponent(sessionCookie).toLowerCase();
      if (decoded.includes("admin")) role = "Admin";
      else if (decoded.includes("bm@")) role = "Branch Manager";
      else if (decoded.includes("am@")) role = "Assistant Manager";
      else if (decoded.includes("tl@")) role = "Team Leader";
      else role = "Employee";
    }
  }

  const isSupervisor = role !== "Employee";

  if (isSupervisor) {
    const metrics = await getDashboardMetrics();
    return <DashboardClientView metrics={metrics} />;
  }

  // Employee-specific personal dashboard
  const employeeMetrics = await getEmployeeDashboardMetrics();
  return <EmployeeOverviewClientView metrics={employeeMetrics} />;
}
