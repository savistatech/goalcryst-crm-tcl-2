import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCustomer360Details } from "@/app/actions/customerActions";
import { getUserPermissions } from "@/utils/permissions";
import { getActiveUser } from "@/utils/supabase/server";
import Customer360ClientView from "./Customer360ClientView";

interface PageProps {
  params: Promise<{
    contractNo: string;
  }>;
}

export default async function CustomerPage({ params }: PageProps) {
  const { contractNo } = await params;

  // 1. Resolve active user session
  const user = await getActiveUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch role and granular permissions lookup
  const permissions = await getUserPermissions(user.id);

  // 3. Fetch comprehensive customer 360 records from database
  const customerData = await getCustomer360Details(contractNo);

  if (!customerData) {
    notFound();
  }

  return (
    <Customer360ClientView 
      initialData={customerData} 
      permissions={permissions} 
    />
  );
}
