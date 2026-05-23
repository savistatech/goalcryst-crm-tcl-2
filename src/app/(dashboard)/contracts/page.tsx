"use client";

import React, { useState, useEffect } from "react";
import { getAllContracts, toggleArchiveContract, AdminContractRow } from "@/app/actions/contractActions";
import { Search, Archive, ArchiveRestore, RefreshCw } from "lucide-react";

export default function ContractsMasterPage() {
  const [contracts, setContracts] = useState<AdminContractRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  const limit = 20;

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const result = await getAllContracts(page, limit, search);
      setContracts(result.contracts);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      alert("Error loading contracts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [page]); // Re-fetch when page changes

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchContracts();
  };

  const handleToggleArchive = async (contractNo: string, currentStatus: boolean) => {
    setUpdating(contractNo);
    try {
      await toggleArchiveContract(contractNo, !currentStatus);
      // Optimistically update the UI
      setContracts((prev) => 
        prev.map((c) => c.contract_no === contractNo ? { ...c, is_archived: !currentStatus } : c)
      );
    } catch (err: any) {
      alert("Error updating archive status: " + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink font-serif">
            Contract Master
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Global view of all imported contracts. Manage system visibility and archiving.
          </p>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80">
          <div className="relative flex items-center bg-surface border border-border-custom rounded-lg px-3 py-2 shadow-sm focus-within:border-ink-2 transition-colors">
            <Search className="w-4 h-4 text-ink-3 mr-2" />
            <input
              type="text"
              placeholder="Search by ID, Name, or Branch..."
              className="w-full bg-transparent border-0 outline-none text-[13px] text-ink placeholder-ink-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 px-2 py-0.5 bg-bg-warm border border-border-custom rounded text-[10px] font-semibold text-ink-2 hover:text-ink cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface border border-border-custom rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-custom bg-bg-warm/30 text-[10px] uppercase font-semibold text-ink-3 tracking-wider select-none">
                <th className="py-3 px-4">Contract No</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-center">BOM DPD</th>
                <th className="py-3 px-4">Allocated Agent</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/50 text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-3">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading contracts...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-3">
                    No contracts found.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr 
                    key={contract.contract_no} 
                    className={`hover:bg-bg-warm/10 transition-colors ${contract.is_archived ? "opacity-60 bg-bg-warm/50" : ""}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-ink">
                      {contract.contract_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink truncate max-w-[200px]">
                      {contract.customer_name}
                    </td>
                    <td className="py-3 px-4 text-ink-2 truncate max-w-[120px]">
                      {contract.branch}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium">
                      {contract.bom_dpd}
                    </td>
                    <td className="py-3 px-4">
                      {contract.allocated_to ? (
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-accent-soft text-accent-ink text-[8px] font-bold flex items-center justify-center select-none">
                              {contract.agent_name?.split(" ").map(n => n[0]).join("").substring(0,2)}
                           </div>
                           <span className="text-ink-2">{contract.agent_name}</span>
                        </div>
                      ) : (
                        <span className="text-ink-3 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {contract.is_archived ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warn bg-warn-bg px-2 py-0.5 rounded-full uppercase tracking-wider border border-warn/20">
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-good bg-good-bg px-2 py-0.5 rounded-full uppercase tracking-wider border border-good/20">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleArchive(contract.contract_no, contract.is_archived)}
                        disabled={updating === contract.contract_no}
                        className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer border ${
                          contract.is_archived 
                            ? "bg-surface border-border-custom text-ink hover:border-ink" 
                            : "bg-surface border-border-custom text-bad hover:bg-bad-bg hover:border-bad/30"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updating === contract.contract_no ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : contract.is_archived ? (
                          <>
                            <ArchiveRestore className="w-3.5 h-3.5" />
                            <span>Unarchive</span>
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border-custom bg-bg-warm/30 select-none">
            <div className="text-[11.5px] text-ink-3">
              Showing <strong className="text-ink font-medium">{(page - 1) * limit + 1}</strong> to <strong className="text-ink font-medium">{Math.min(page * limit, totalCount)}</strong> of <strong className="text-ink font-medium">{totalCount}</strong> entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-border-custom rounded-lg text-[11px] font-semibold text-ink-2 bg-surface hover:text-ink hover:bg-bg-warm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-border-custom rounded-lg text-[11px] font-semibold text-ink-2 bg-surface hover:text-ink hover:bg-bg-warm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
