import { getOrgTree, type OrgProfile } from "@/app/actions/orgActions";
import { getCurrentUserPermissions } from "@/app/actions/userActions";
import { createClient, getActiveUser } from "@/utils/supabase/server";
import OrgTreeClientView from "./OrgTreeClientView";

export const metadata = {
  title: "Organization Chart | GoalCryst CRM",
  description: "View the employee hierarchy and reporting structure across your organization.",
};

export default async function OrgPage() {
  // Fetch the nested tree for the tree view
  const tree = await getOrgTree();

  // Fetch flat list of all profiles for the list view + assign modal
  const supabase = await createClient();
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, reporting_to, branch, department, phone, is_active, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  // Check if the current user is an Admin (controls edit permissions)
  const activeUser = await getActiveUser();
  let isAdmin = false;
  if (activeUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", activeUser.id)
      .single();
    isAdmin = profile?.role === "Admin";
  }

  return (
    <OrgTreeClientView
      tree={tree}
      allProfiles={(allProfiles || []) as OrgProfile[]}
      isAdmin={isAdmin}
    />
  );
}
