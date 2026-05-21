import React from "react";
import { cookies } from "next/headers";
import { getDashboardMetrics, getAgentDashboardMetrics } from "@/app/actions/dashboardActions";
import DashboardClientView from "./DashboardClientView";
import AgentOverviewClientView from "./AgentOverviewClientView";

/**
 * Role-aware Overview page:
 *  - Admin / Branch Mgr / Asst Mgr / Team Leader → Full operational command center (DashboardClientView)
 *  - Agent                 → Personal productivity dashboard (AgentOverviewClientView)
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
      if (decoded.includes("admin")) role = "Admin";
      else if (decoded.includes("bm@")) role = "Branch Manager";
      else if (decoded.includes("am@")) role = "Assistant Manager";
      else if (decoded.includes("tl@")) role = "Team Leader";
      else role = "Agent";
    }
  }

  const isSupervisor = role !== "Agent";

  if (isSupervisor) {
    const metrics = await getDashboardMetrics();
    return <DashboardClientView metrics={metrics} />;
  }

  // Agent-specific personal dashboard
  const agentMetrics = await getAgentDashboardMetrics();
  return <AgentOverviewClientView metrics={agentMetrics} />;
}
