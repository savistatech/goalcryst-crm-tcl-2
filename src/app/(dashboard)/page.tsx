import React from "react";
import { cookies } from "next/headers";
import { getDashboardMetrics, getAgentDashboardMetrics } from "@/app/actions/dashboardActions";
import DashboardClientView from "./DashboardClientView";
import AgentOverviewClientView from "./AgentOverviewClientView";

/**
 * Role-aware Overview page:
 *  - Super Admin / Manager → Full operational command center (DashboardClientView)
 *  - Agent                 → Personal productivity dashboard (AgentOverviewClientView)
 *  - Auditor               → Full dashboard (read-only, same as Manager view for now)
 */
export default async function OverviewPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("goalcryst_session")?.value;

  let role = "Agent";
  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      role = parsed.role || "Agent";
    } catch {
      // Fallback: try simple string match from older cookie format
      const decoded = decodeURIComponent(sessionCookie).toLowerCase();
      if (decoded.includes("admin")) role = "Super Admin";
      else if (decoded.includes("manager")) role = "Manager";
      else if (decoded.includes("auditor")) role = "Auditor";
      else role = "Agent";
    }
  }

  const isAdminOrManager = role === "Super Admin" || role === "Manager" || role === "Auditor";

  if (isAdminOrManager) {
    const metrics = await getDashboardMetrics();
    return <DashboardClientView metrics={metrics} />;
  }

  // Agent-specific personal dashboard
  const agentMetrics = await getAgentDashboardMetrics();
  return <AgentOverviewClientView metrics={agentMetrics} />;
}
