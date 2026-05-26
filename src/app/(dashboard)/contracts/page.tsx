"use client";

import React, { useState, useEffect } from "react";
import { 
  getAllContracts, 
  toggleArchiveContract, 
  bulkArchiveContracts,
  bulkDeleteContracts,
  deleteAllContracts,
  AdminContractRow 
} from "@/app/actions/contractActions";
import { Search, Archive, ArchiveRestore, RefreshCw, Trash2, AlertTriangle, X } from "lucide-react";

export default function ContractsMasterPage() {
  const [contracts, setContracts] = useState<AdminContractRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Bulk operation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"selected" | "all" | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const limit = 20;

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const result = await getAllContracts(page, limit, search);
      setContracts(result.contracts);
      setTotalCount(result.totalCount);
      // Clear selections when page changes
      setSelectedIds(new Set());
    } catch (err: any) {
      alert("Error loading contracts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [page]); 

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContracts();
  };

  const handleToggleArchive = async (contractNo: string, currentStatus: boolean) => {
    setUpdating(contractNo);
    try {
      await toggleArchiveContract(contractNo, !currentStatus);
      setContracts((prev) =>
        prev.map((c) => c.contract_no === contractNo ? { ...c, is_archived: !currentStatus } : c)
      );
    } catch (err: any) {
      alert("Error updating archive status: " + err.message);
    } finally {
      setUpdating(null);
    }
  };

  // --- Bulk Operations Logic ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = contracts.map(c => c.contract_no);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (contractNo: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(contractNo);
    else newSet.delete(contractNo);
    setSelectedIds(newSet);
  };

  const handleBulkArchive = async (archiveStatus: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkLoading(true);
    try {
      await bulkArchiveContracts(Array.from(selectedIds), archiveStatus);
      setContracts(prev => prev.map(c => 
        selectedIds.has(c.contract_no) ? { ...c, is_archived: archiveStatus } : c
      ));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert("Bulk archive failed: " + err.message);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsBulkLoading(true);
    setDeleteModalOpen(false);

    try {
      if (deleteType === "selected") {
        await bulkDeleteContracts(Array.from(selectedIds));
        setSelectedIds(new Set());
        fetchContracts(); // Reload page
      } else if (deleteType === "all") {
        await deleteAllContracts();
        setSelectedIds(new Set());
        setPage(1);
        fetchContracts();
      }
    } catch (err: any) {
      alert("Deletion failed: " + err.message);
    } finally {
      setIsBulkLoading(false);
      setDeleteType(null);
      setDeleteConfirmText("");
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const isAllSelected = contracts.length > 0 && selectedIds.size === contracts.length;
  const isSomeSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink font-serif">
            All Contracts
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Manage all contracts and archiving.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setDeleteType("all"); setDeleteModalOpen(true); }}
            className="flex items-center gap-1.5 h-9 px-3 bg-bad-bg border border-bad/30 text-bad hover:bg-bad hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete All Contracts
          </button>
          
          <form onSubmit={handleSearchSubmit} className="w-full md:w-72">
            <div className="relative flex items-center bg-surface border border-border-custom rounded-lg px-3 py-2 shadow-sm focus-within:border-ink-2 transition-colors">
              <Search className="w-4 h-4 text-ink-3 mr-2" />
              <input
                type="text"
                placeholder="Search by ID, Name..."
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
      </div>

      {/* Bulk Action Toolbar */}
      {isSomeSelected && (
        <div className="flex items-center justify-between bg-accent-soft border border-accent-custom/30 rounded-xl p-3 px-4 shadow-sm animate-fade-in">
          <div className="text-xs font-semibold text-accent-ink flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent-custom text-white flex items-center justify-center">{selectedIds.size}</span>
            contracts selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkArchive(true)}
              disabled={isBulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border-custom rounded-lg text-xs font-semibold text-ink-2 hover:text-ink disabled:opacity-50 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              onClick={() => handleBulkArchive(false)}
              disabled={isBulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border-custom rounded-lg text-xs font-semibold text-ink-2 hover:text-ink disabled:opacity-50 cursor-pointer"
            >
              <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
            </button>
            <button
              onClick={() => { setDeleteType("selected"); setDeleteModalOpen(true); }}
              disabled={isBulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bad-bg border border-bad/30 rounded-lg text-xs font-semibold text-bad hover:bg-bad hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-surface border border-border-custom rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-custom bg-bg-warm/30 text-[10px] uppercase font-semibold text-ink-3 tracking-wider select-none">
                <th className="py-3 px-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-border-custom text-accent-custom focus:ring-accent-custom cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Contract No</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-center">DPD</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4 text-center">Status</th>
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
                    className={`transition-colors ${
                      selectedIds.has(contract.contract_no) ? "bg-accent-soft/30" : "hover:bg-bg-warm/10"
                    } ${contract.is_archived ? "opacity-60 bg-bg-warm/50" : ""}`}
                  >
                    <td className="py-3 px-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(contract.contract_no)}
                        onChange={(e) => handleSelect(contract.contract_no, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-border-custom text-accent-custom focus:ring-accent-custom cursor-pointer"
                      />
                    </td>
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
                            {contract.employee_name?.split(" ").map(n => n[0]).join("").substring(0, 2)}
                          </div>
                          <span className="text-ink-2">{contract.employee_name}</span>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-bad">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-semibold tracking-tight">Confirm Deletion</h3>
              </div>
              <button 
                onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}
                className="text-ink-3 hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[13px] text-ink-2 space-y-3 leading-relaxed">
              <p>
                You are about to <strong className="text-bad">permanently delete</strong> {deleteType === "all" ? "ALL contracts in the system" : `${selectedIds.size} selected contracts`}.
              </p>
              <p>
                This action is irreversible and will also destroy all associated records including financials, legal status, dispositions, and waiver history for these contracts.
              </p>
              <p className="font-semibold text-ink mt-2">
                Type <span className="bg-bg-warm border border-border-custom px-1.5 py-0.5 rounded font-mono text-bad">DELETE</span> to confirm.
              </p>
            </div>

            <input
              type="text"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full bg-surface border-2 border-border-custom rounded-xl px-4 py-3 text-sm text-ink font-mono focus:outline-none focus:border-bad transition-colors"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteConfirmText(""); }}
                className="h-10 px-4 rounded-xl border border-border-custom hover:bg-bg-warm text-[13px] font-semibold text-ink-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== "DELETE" || isBulkLoading}
                className="h-10 px-6 rounded-xl bg-bad text-white text-[13px] font-semibold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isBulkLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
