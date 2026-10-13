"use server";

import { createClient } from "@/utils/supabase/server";

export interface SearchResult {
  contract_no: string;
  customer_name: string;
  product: string;
  branch: string;
  bom_dpd: number;
}

/**
 * Dynamic exact/partial search matching across contracts and contact numbers.
 * Enforces employees search restriction (employees can only find customers by exact/partial search, no bulk listing).
 */
export async function searchContracts(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const cleanQuery = query.trim();

  // 1. Search directly in contracts (Contract No or Customer Name)
  const { data: contractsByDetails, error: detailsError } = await supabase
    .from("contracts")
    .select(`
      contract_no,
      customer_name,
      product,
      branch,
      bom_dpd
    `)
    .or(`contract_no.ilike.%${cleanQuery}%,customer_name.ilike.%${cleanQuery}%,cif.ilike.%${cleanQuery}%`);

  if (detailsError) {
    console.error("Error searching contracts by details:", detailsError);
  }

  // 2. Search in contract_contacts by mobile numbers
  const { data: contactsByPhone, error: phoneError } = await supabase
    .from("contract_contacts")
    .select(`
      contract_no,
      contracts!inner(
        contract_no,
        customer_name,
        product,
        branch,
        bom_dpd
      )
    `)
    .or(`mobile_1.like.%${cleanQuery}%,mobile_no.like.%${cleanQuery}%,primary_mobile.like.%${cleanQuery}%,primary_mobile_1.like.%${cleanQuery}%,primary_mobile_2.like.%${cleanQuery}%,mobile_no_2.like.%${cleanQuery}%,latest_contact_no.like.%${cleanQuery}%,ref_mobile_1.like.%${cleanQuery}%,ref_mobile_2.like.%${cleanQuery}%`);

  if (phoneError) {
    console.error("Error searching contracts by phone:", phoneError);
  }

  // 3. De-duplicate and merge results uniquely by contract_no
  const resultMap = new Map<string, SearchResult>();

  if (contractsByDetails) {
    contractsByDetails.forEach((c: any) => {
      resultMap.set(c.contract_no, c);
    });
  }

  if (contactsByPhone) {
    contactsByPhone.forEach((row: any) => {
      if (row.contracts) {
        resultMap.set(row.contracts.contract_no, row.contracts as SearchResult);
      }
    });
  }

  return Array.from(resultMap.values());
}
