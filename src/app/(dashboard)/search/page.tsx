"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { searchContracts, type SearchResult } from "@/app/actions/searchActions";
import PermissionGuard from "@/components/PermissionGuard";
import { Search, Loader2, ArrowRight, ShieldAlert, PhoneOff, UserCheck } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trigger search on submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await searchContracts(query);
      setResults(data);
    } catch (err) {
      console.error("Error executing query search:", err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard focus shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PermissionGuard permission="can_search_customer">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header title */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-ink-3">
            <span>GoalCryst CRM</span>
            <span>·</span>
            <span>Agent Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
            Search Contracts
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Authorized agent access only. Gated security locks active on all customer exposures.
          </p>
        </div>

        {/* Information Privacy Warning Banner */}
        <div className="flex items-start gap-3 bg-bg-warm border border-border-custom rounded-xl p-4 text-[12px] text-ink-2 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-ink font-semibold">Strict Privacy Compliance Notice:</strong>
            <span className="block mt-0.5">
              To prevent customer data leakages, operator accounts are prohibited from browsing the entire portfolio in bulk. You must lookup customer accounts dynamically by querying either a <strong className="text-ink">Contract Number</strong>, <strong className="text-ink">Customer Name</strong>, or <strong className="text-ink">Phone/Mobile Number</strong> below.
            </span>
          </div>
        </div>

        {/* Large Central Search Box */}
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="relative flex items-center bg-surface border border-border-strong rounded-2xl px-5 py-4 shadow-sm transition-all focus-within:border-accent-custom focus-within:ring-2 focus-within:ring-accent-soft">
            <Search className="w-5 h-5 text-ink-3 mr-3.5 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              required
              placeholder="Search by customer name, contract no, or phone numbers..."
              className="w-full bg-transparent border-0 outline-none text-base text-ink placeholder-ink-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[9.5px] font-mono text-ink-3 border border-border-custom rounded px-2 py-1 bg-bg-warm select-none font-semibold">
                PRESS / TO FOCUS
              </span>
              <button
                type="submit"
                disabled={loading || query.trim().length < 2}
                className="h-9 px-4 bg-ink hover:bg-black text-surface text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Lookup Account</span>
                )}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-ink-3 pl-2">
            Tip: Enter a partial name (e.g. &quot;Aruna&quot;) or exact phone number (e.g. &quot;8688980367&quot;) to trigger lookup indexes.
          </p>
        </form>

        {/* Search results rendering area */}
        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-2 select-none">
              <Loader2 className="w-6 h-6 animate-spin text-accent-custom" />
              <p className="text-xs text-ink-3">Searching recovery catalog database...</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="bg-surface border border-border-custom rounded-2xl p-10 text-center space-y-2 shadow-sm">
              <PhoneOff className="w-7 h-7 text-ink-3 mx-auto" />
              <h3 className="text-sm font-semibold text-ink">No Customer Profiles Found</h3>
              <p className="text-xs text-ink-2 max-w-sm mx-auto">
                We couldn&apos;t find any active allocations matching &quot;<strong className="text-ink">{query}</strong>&quot;. Check spelling or try contract code queries.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-bg-warm/30 border-b border-border-custom flex items-center justify-between">
                <span className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">Matched Accounts ({results.length})</span>
                <span className="text-xs text-good font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Profiles loaded successfully</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-custom text-[10px] uppercase tracking-wider font-semibold text-ink-3 bg-bg-warm/10">
                      <th className="py-2.5 px-5">Contract Number</th>
                      <th className="py-2.5 px-4">Customer Name</th>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4">Location</th>
                      <th className="py-2.5 px-4 text-center">BOM DPD</th>
                      <th className="py-2.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {results.map((row) => (
                      <tr key={row.contract_no} className="hover:bg-bg-warm/10 transition-colors text-[13px]">
                        <td className="py-3.5 px-5 font-mono font-semibold text-ink">{row.contract_no}</td>
                        <td className="py-3.5 px-4 font-medium text-ink">{row.customer_name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 text-[10.5px] font-semibold bg-bg-warm border border-border-custom rounded-md text-ink-2">
                            {row.product}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-ink-2">{row.branch}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-ink-2">{row.bom_dpd}</td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            href={`/customers/${row.contract_no}`}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-custom hover:text-accent-ink transition-all hover:translate-x-0.5"
                          >
                            <span>Contract Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
