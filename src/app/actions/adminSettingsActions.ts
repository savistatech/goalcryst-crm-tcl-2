"use server";

import { createClient, getActiveUser } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetches all Main Dispositions
 */
export async function getMainDispositions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("main_dispositions")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching main dispositions:", error);
    return [];
  }
  return data;
}

/**
 * Fetches all Sub Dispositions with their form schemas
 */
export async function getSubDispositions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sub_dispositions")
    .select("*, main_disposition:main_dispositions(id, name)")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching sub dispositions:", error);
    return [];
  }
  return data;
}

/**
 * Creates a new Sub Disposition with a dynamic form schema
 */
export async function createSubDisposition(
  mainDispositionId: string,
  name: string,
  formSchema: any[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("sub_dispositions")
    .insert({
      main_disposition_id: mainDispositionId,
      name,
      form_schema: formSchema,
      is_active: true
    });

  if (error) {
    console.error("Error creating sub disposition:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Toggles a sub disposition active/inactive status
 */
export async function toggleSubDispositionStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("sub_dispositions")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Fetches all Waiver Reasons
 */
export async function getWaiverReasons() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waiver_reasons")
    .select("*")
    .order("reason", { ascending: true });

  if (error) {
    console.error("Error fetching waiver reasons:", error);
    return [];
  }
  return data;
}

/**
 * Creates a new Waiver Reason
 */
export async function createWaiverReason(
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("waiver_reasons")
    .insert({ reason, is_active: true });

  if (error) {
    console.error("Error creating waiver reason:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/waivers");
  return { success: true };
}

/**
 * Toggles a waiver reason active/inactive status
 */
export async function toggleWaiverReasonStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("waiver_reasons")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/waivers");
  return { success: true };
}

/**
 * Creates a new Main Disposition
 */
export async function createMainDisposition(
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("main_dispositions")
    .insert({ name, is_active: true });

  if (error) {
    console.error("Error creating main disposition:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Updates a Main Disposition name
 */
export async function updateMainDisposition(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("main_dispositions")
    .update({ name })
    .eq("id", id);

  if (error) {
    console.error("Error updating main disposition:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Toggles a Main Disposition active/inactive status
 */
export async function toggleMainDispositionStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("main_dispositions")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("Error toggling main disposition status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Updates an existing Sub Disposition
 */
export async function updateSubDisposition(
  id: string,
  mainDispositionId: string,
  name: string,
  formSchema: any[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("sub_dispositions")
    .update({
      main_disposition_id: mainDispositionId,
      name,
      form_schema: formSchema
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating sub disposition:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/dispositions");
  return { success: true };
}

/**
 * Updates a Waiver Reason name
 */
export async function updateWaiverReason(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getActiveUser();
  if (!user) return { success: false, error: "Authentication expired." };

  const { error } = await supabase
    .from("waiver_reasons")
    .update({ reason })
    .eq("id", id);

  if (error) {
    console.error("Error updating waiver reason:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/waivers");
  return { success: true };
}
