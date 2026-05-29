import React from "react";
import { getDashboardMetrics, getEmployeeDashboardMetrics } from "@/app/actions/dashboardActions";
import DashboardClientView from "./DashboardClientView";
import EmployeeOverviewClientView from "./EmployeeOverviewClientView";
import { createClient, getActiveUser } from "@/utils/supabase/server";

/**
 * Role-aware Overview page:
 *  - Admin / Branch Mgr / Asst Mgr / Team Leader → Full operational command center (DashboardClientView)
 *  - Employee                 → Personal productivity dashboard (EmployeeOverviewClientView)
 */
export default async function OverviewPage() {
  const supabase = await createClient();
  const user = await getActiveUser();
  let role = "Employee";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role || "Employee";
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
