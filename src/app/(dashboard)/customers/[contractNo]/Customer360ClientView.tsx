"use client";

import React, { useState, useEffect, useRef } from "react";
import { type Customer360Data, logCallDisposition, raiseWaiverRequest } from "@/app/actions/customerActions";
import { getSupervisorsForRouting } from "@/app/actions/userActions";
import { type PermissionKey } from "@/utils/permissions";
import {
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Scale,
  History,
  FileText,
  Lock,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  HelpCircle,
  MapPin,
  Car,
  AlertTriangle,
  AlertCircle,
  Shield
} from "lucide-react";

interface ClientViewProps {
  initialData: Customer360Data;
  permissions: Record<PermissionKey, boolean>;
  mainDispositions: any[];
  subDispositions: any[];
  waiverReasons: any[];
}

export default function Customer360ClientView({ initialData, permissions, mainDispositions, subDispositions, waiverReasons }: ClientViewProps) {
  const [data, setData] = useState<Customer360Data>(initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "contacts" | "financials" | "assets" | "legal" | "timeline">("overview");

  // Call outcome modal states
  const [isDispoOpen, setIsDispoOpen] = useState(false);
  const [mainDispoId, setMainDispoId] = useState("");
  const [subDispoId, setSubDispoId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [dispoSubmitting, setDispoSubmitting] = useState(false);

  const currentSubDispositions = subDispositions.filter((sd: any) => sd.main_disposition_id === mainDispoId && sd.is_active);
  const currentFormSchema = currentSubDispositions.find((sd: any) => sd.id === subDispoId)?.form_schema || [];


  // Call timer stopwatch states
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Waiver request modal states
  const [isWaiverOpen, setIsWaiverOpen] = useState(false);
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReasonId, setWaiverReasonId] = useState("");
  const [waiverRemarks, setWaiverRemarks] = useState("");
  const [routedTo, setRoutedTo] = useState<string[]>([]);
  const activeWaiverReasons = waiverReasons.filter((w: any) => w.is_active);
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [waiverSubmitting, setWaiverSubmitting] = useState(false);

  // Fetch supervisors when modal opens
  useEffect(() => {
    if (isWaiverOpen && supervisors.length === 0) {
      getSupervisorsForRouting().then(res => setSupervisors(res));
    }
  }, [isWaiverOpen]);

  // Start stopwatch on dispo modal open
  useEffect(() => {
    if (isDispoOpen) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDispoOpen]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Formatter helpers
  const formatMoney = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const formatDate = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return "-";
    const str = String(val).trim();
    if (!str || str === "-") return "-";

    // Check if it's an Excel serial date number
    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (num > 0 && num < 100000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
        if (!isNaN(date.getTime())) {
          const dd = String(date.getUTCDate()).padStart(2, "0");
          const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
          const yyyy = date.getUTCFullYear();
          return `${dd}/${mm}/${yyyy}`;
        }
      }
    }

    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatDateTime = (val: string | undefined | null) => {
    if (!val || val === "-") return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // 21 detailed dispositions mapping handled dynamically now
  // Auto calculate payable in waiver request
  // Removed payableAmount effect as requested

  // Submit Call Dispo
  const handleDispoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainDispoId || !subDispoId) {
       alert("Please select a valid disposition.");
       return;
    }
    
    // Validate required dynamic fields
    for (const field of currentFormSchema) {
      if (field.required && !dynamicData[field.id]) {
        alert(`Please fill out required field: ${field.label}`);
        return;
      }
    }

    setDispoSubmitting(true);
    try {
      const res = await logCallDisposition(
        data.contract.contract_no,
        mainDispoId,
        subDispoId,
        remarks,
        dynamicData
      );

      if (res.success) {
        const selectedMain = mainDispositions.find(m => m.id === mainDispoId)?.name || "Logged";
        const selectedSub = subDispositions.find(s => s.id === subDispoId)?.name || "Outcome";

        // Mock fresh timeline addition locally for visual speed
        const newDispo = {
          created_at: new Date().toISOString(),
          main_disposition: { name: selectedMain },
          sub_disposition: { name: selectedSub },
          remarks,
          dynamic_data: dynamicData,
          employee_profile: { full_name: "You (Active)", role: "Employee" }
        };
        setData(prev => ({
          ...prev,
          dispositions: [newDispo, ...prev.dispositions]
        }));
        setIsDispoOpen(false);
        // Reset inputs
        setRemarks("");
        setDynamicData({});
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDispoSubmitting(false);
    }
  };

  // Submit Waiver Request
  const handleWaiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const posAmount = Number(data.financials.pos || 0);
    const waiverVal = Number(waiverAmount);

    if (routedTo.length === 0) {
      alert("Please select at least one supervisor to route this request to.");
      return;
    }

    setWaiverSubmitting(true);
    try {
      const res = await raiseWaiverRequest(
        data.contract.contract_no,
        waiverVal,
        waiverReasonId,
        routedTo,
        waiverRemarks
      );

      if (res.success) {
        const reasonName = activeWaiverReasons.find((r: any) => r.id === waiverReasonId)?.reason || "Unknown";
        const newWaiver = {
          created_at: new Date().toISOString(),
          requested_waiver_amount: waiverVal,
          waiver_reason: { reason: reasonName },
          employee_remarks: waiverRemarks,
          status: "Pending",
          employee_profile: { full_name: "You (Active)" }
        };
        setData(prev => ({
          ...prev,
          waivers: [newWaiver, ...prev.waivers]
        }));
        setIsWaiverOpen(false);
        setWaiverAmount("");
        setWaiverReasonId("");
        setWaiverRemarks("");
        setRoutedTo([]);
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWaiverSubmitting(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: History },
    { id: "contacts", label: "Profile & Contacts", icon: Phone },
    { id: "financials", label: "Exposures & Waivers", icon: DollarSign },
    { id: "assets", label: "Asset & Collateral", icon: Car },
    { id: "legal", label: "Legal litigation", icon: Scale },
    { id: "timeline", label: "timeline & feeds", icon: FileText }
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* ===== CUSTOMER HEADER CARD ===== */}
      <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-accent-soft text-accent-ink`}>
              CONTRACT NO: {data.contract.contract_no}
            </span>
            <span className="text-xs text-ink-3">·</span>
            <span className="text-xs text-ink-3">{data.contract.branch} Branch ({data.contract.region})</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
            {data.contract.customer_name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2 mt-1">
            <span>Product: <strong className="text-ink font-semibold">{data.contract.product}</strong></span>
            <span>·</span>
            <span>BOM DPD: <strong className="text-ink font-mono font-semibold">{data.contract.bom_dpd} days</strong></span>
          </div>
        </div>

        {/* Global Action Modals Triggers */}
        <div className="flex items-center gap-2">
          {permissions.can_add_disposition && (
            <button
              onClick={() => {
                if (mainDispositions.length > 0) setMainDispoId(mainDispositions[0].id);
                setIsDispoOpen(true);
              }}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent-custom hover:bg-accent-ink text-surface text-[13px] font-semibold transition-all shadow-sm cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Disposition</span>
            </button>
          )}

          {permissions.can_raise_waiver && (
            <button
              onClick={() => setIsWaiverOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-surface border border-border-custom hover:bg-bg-warm text-[13px] font-semibold text-ink transition-all shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-accent-custom" />
              <span>Waiver Raise</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== TABS NAV BAR ===== */}
      <div className="border-b border-border-custom flex overflow-x-auto scrollbar-none gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3.5 text-[13px] font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${isActive
                ? "border-accent-custom text-accent-custom"
                : "border-transparent text-ink-3 hover:text-ink"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== TAB CONTENT WINDOW ===== */}
      <div className="min-h-[380px]">
        {/* ==================== 1. OVERVIEW TAB ==================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left columns: Financial Exposures Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Liabilities Summary</span>
                <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5 mb-4">Total Financial Exposure</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-bg-warm/40 border border-border-custom">
                  <div>
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">Principal POS</span>
                    <div className="text-xl font-bold font-mono text-ink mt-1">
                      {formatMoney(data.financials.pos)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">EMI Amount</span>
                    <div className="text-xl font-bold font-mono text-ink mt-1">
                      {formatMoney(data.financials.emi_amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">Overdue (OD)</span>
                    <div className="text-xl font-bold font-mono text-accent-custom mt-1">
                      {formatMoney(data.financials.od_amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">Total Outstanding</span>
                    <div className="text-xl font-bold font-mono text-ink-2 mt-1">
                      {formatMoney(data.financials.total_outstanding)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="border border-border-custom rounded-xl p-3.5 bg-surface text-[12.5px]">
                    <span className="text-ink-3 block">Bounce Charges:</span>
                    <strong className="text-ink font-mono font-semibold block mt-0.5">{formatMoney(data.financials.bounce_charges)}</strong>
                  </div>
                  <div className="border border-border-custom rounded-xl p-3.5 bg-surface text-[12.5px]">
                    <span className="text-ink-3 block">Current ODC Rate:</span>
                    <strong className="text-ink font-mono font-semibold block mt-0.5">{formatMoney(data.financials.current_odc)}</strong>
                  </div>
                  <div className="border border-border-custom rounded-xl p-3.5 bg-surface text-[12.5px]">
                    <span className="text-ink-3 block">Total Collectable:</span>
                    <strong className="text-bad font-mono font-semibold block mt-0.5">{formatMoney(data.financials.total_amount_collectable)}</strong>
                  </div>
                </div>
              </div>

              {/* Gated Quick Contacts panel */}
              <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold tracking-tight text-ink mb-3.5">Active Contact Slots</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-border-custom rounded-xl p-4 bg-surface flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Primary Mobile 1</span>
                      <strong className="text-[15px] font-mono text-ink mt-1 block">
                        {data.contacts.mobile_1 || data.contacts.primary_mobile}
                      </strong>
                    </div>
                    <span className="p-2 bg-good-bg rounded-lg text-good">
                      <Phone className="w-4 h-4" />
                    </span>
                  </div>

                  <div className="border border-border-custom rounded-xl p-4 bg-surface flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Alternate Mobile</span>
                      <strong className="text-[15px] font-mono text-ink mt-1 block">
                        {data.contacts.mobile_no || data.contacts.mobile_no_2}
                      </strong>
                    </div>
                    <span className="p-2 bg-bg-warm rounded-lg text-ink-2">
                      <Phone className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Activity timeline preview */}
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">Latest Actions</span>
                <h3 className="text-lg font-semibold tracking-tight text-ink mt-0.5 mb-4">Calling History Timeline</h3>

                {data.dispositions.length === 0 ? (
                  <p className="text-xs text-ink-3 py-12 text-center">No calls logged yet for this allocation.</p>
                ) : (
                  <div className="space-y-4 relative pl-3.5 before:content-[''] before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom max-h-72 overflow-y-auto pr-1">
                    {data.dispositions.slice(0, 3).map((dispo, i) => (
                      <div key={i} className="text-[12px] relative group">
                        <span className="absolute -left-[17.5px] top-1.5 w-2 h-2 rounded-full border border-surface bg-accent-custom shadow-sm" />
                        <div className="flex justify-between items-baseline">
                          <span className="font-semibold text-ink">{dispo.sub_disposition?.name || "Unknown"}</span>
                          <span className="text-[10px] font-mono text-ink-3">{new Date(dispo.created_at).toLocaleDateString("en-GB")}</span>
                        </div>
                        <p className="text-ink-2 mt-0.5 line-clamp-2 italic">&quot;{dispo.remarks}&quot;</p>
                        {dispo.dynamic_data?.ptp_amount && (
                          <div className="text-[11.5px] font-semibold text-good mt-1 font-mono">
                            Commitment: {formatMoney(dispo.dynamic_data.ptp_amount)} on {new Date(dispo.dynamic_data.ptp_date).toLocaleDateString("en-GB")}
                          </div>
                        )}
                        <span className="text-[10.5px] text-ink-3 block mt-1">Logged by: {dispo.employee_profile?.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setActiveTab("timeline")}
                className="w-full mt-4 h-9 border border-border-custom hover:bg-bg-warm rounded-lg text-xs font-semibold text-ink-2 hover:text-ink transition-all shadow-sm cursor-pointer"
              >
                View full chronological timeline →
              </button>
            </div>
          </div>
        )}

        {/* ==================== 2. PROFILE & CONTACTS TAB ==================== */}
        {activeTab === "contacts" && (
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-ink font-serif">Customer Demographics & Contact Profiles</h3>
              <p className="text-xs text-ink-2">Complete dashboard of all demographics, phone numbers, references, and address databases.</p>
            </div>

            {/* Sub-section 1: Demographics & Allocation Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider">Demographics & Allocation Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Customer Name</span>
                  <strong className="text-ink block mt-0.5 font-medium">{data.contract.customer_name || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Contract No</span>
                  <strong className="text-ink block mt-0.5 font-mono">{data.contract.contract_no || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Product</span>
                  <strong className="text-ink block mt-0.5">{data.contract.product || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Product Detail</span>
                  <strong className="text-ink block mt-0.5">{data.contract.product_detail || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Branch</span>
                  <strong className="text-ink block mt-0.5">{data.contract.branch || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Area</span>
                  <strong className="text-ink block mt-0.5">{data.contract.area || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">State</span>
                  <strong className="text-ink block mt-0.5">{data.contract.state || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Region</span>
                  <strong className="text-ink block mt-0.5">{data.contract.region || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Secured Category</span>
                  <strong className="text-ink block mt-0.5">{data.contract.secured_category || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Secured Product Flag</span>
                  <strong className="text-ink block mt-0.5 font-mono">{data.contract.secured_product_flag || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Allocation Category</span>
                  <strong className="text-ink block mt-0.5">{data.contract.allocation_category || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Allocation DPD Category</span>
                  <strong className="text-ink block mt-0.5">{data.contract.allocation_dpd_category || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">BOM DPD</span>
                  <strong className="text-ink block mt-0.5 font-mono">{data.contract.bom_dpd !== undefined ? data.contract.bom_dpd : "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">MOB</span>
                  <strong className="text-ink block mt-0.5 font-mono">{data.contract.mob !== undefined ? data.contract.mob : "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Bucket</span>
                  <strong className="text-ink block mt-0.5">{data.contract.bucket || "-"}</strong>
                </div>
                <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                  <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">BOM Bucket</span>
                  <strong className="text-ink block mt-0.5">{data.contract.bom_bucket || "-"}</strong>
                </div>
              </div>
            </div>

            {/* Sub-section 2: Contact Numbers */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider">Contact Numbers (Phones)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 1 - Mobile 1</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.mobile_1}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 2 - Mobile No</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.mobile_no}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 3 - Primary Mobile</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.primary_mobile}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 3 - Primary Mobile 1</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.primary_mobile_1}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 4 - Primary Mobile 2</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.primary_mobile_2}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 5 - Mobile No</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.mobile_no_2}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
                <div className="border border-border-custom p-3 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase font-semibold block">Contact 6 - Latest Contact No</span>
                    <strong className="text-sm font-mono text-ink mt-0.5 block">{data.contacts.latest_contact_no}</strong>
                  </div>
                  <Phone className="w-4 h-4 text-accent-custom" />
                </div>
              </div>
            </div>

            {/* Sub-section 3: Reference Contacts */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider">Reference Contacts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] text-ink-3 uppercase tracking-wider font-semibold block">Reference 1: {data.contacts.ref_name_1 || "-"}</span>
                    <strong className="text-sm font-mono text-ink mt-1 block">
                      {data.contacts.ref_mobile_1}
                    </strong>
                    <span className="text-[11px] text-ink-3 block mt-1">Relation: {data.contacts.ref_relation_1 || "-"}</span>
                  </div>
                  <Phone className="w-4 h-4 text-ink-3" />
                </div>

                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] text-ink-3 uppercase tracking-wider font-semibold block">Reference 2: {data.contacts.ref_name_2 || "-"}</span>
                    <strong className="text-sm font-mono text-ink mt-1 block">
                      {data.contacts.ref_mobile_2}
                    </strong>
                    <span className="text-[11px] text-ink-3 block mt-1">Relation: {data.contacts.ref_relation_2 || "-"}</span>
                  </div>
                  <Phone className="w-4 h-4 text-ink-3" />
                </div>
              </div>
            </div>

            {/* Sub-section 4: Address Directories */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider">Address Directories</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 1 - Base Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.base_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Landmark</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.landmark || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Pincode</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium font-mono">{data.contacts.pincode || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 2 - Permanent Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.permanent_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 2 - Master Primary Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.master_primary_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 3 - Permanent Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.permanent_address_2 || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 3 - Office Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.office_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 4 - Finnone Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.finnone_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 5 - Secondary Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.secondary_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 6 - Office Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.office_address_2 || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 7 - Additional Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.additional_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 8 - Residential Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.residential_address || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 9 - Reference Full Address 1</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.ref_full_address_1 || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 10 - Reference Full Address 2</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.ref_full_address_2 || "-"}</p>
                </div>
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Address 11 - PDPR Address</span>
                  <p className="text-ink mt-1 leading-relaxed font-medium">{data.contacts.pdpr_address || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. FINANCIALS & WAIVERS TAB ==================== */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-semibold text-ink font-serif">Exposure Breakdown & Liability Database</h3>
                <p className="text-xs text-ink-2">Complete details of account liabilities, dues, and settlement targets.</p>
              </div>

              {/* Exposure Summary Metrics */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider font-sans">Exposure & POS Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Finance Amount</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.finance_amount)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Total POS Outstanding</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.total_pos_outstanding)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Principal POS</span>
                    <strong className="text-accent-custom block mt-0.5 font-mono">{formatMoney(data.financials.pos)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Sale Price</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.sale_price)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Total Amount Collectable</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.total_amount_collectable)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Total Outstanding</span>
                    <strong className="text-bad block mt-0.5 font-mono">{formatMoney(data.financials.total_outstanding)}</strong>
                  </div>
                </div>
              </div>

              {/* Installments & Overdues */}
              <div className="space-y-3 pt-4 border-t border-border-custom">
                <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider font-sans">Installments & Overdues</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">EMI Amount</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.emi_amount)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">OD Amount</span>
                    <strong className="text-bad block mt-0.5 font-mono">{formatMoney(data.financials.od_amount)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Principal Overdue</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.principal_overdue)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Interest Overdue</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.interest_overdue)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Bounce Charges</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.bounce_charges)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Current ODC</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.financials.current_odc)}</strong>
                  </div>
                </div>
              </div>

              {/* Settlement & Waiver Details */}
              <div className="space-y-3 pt-4 border-t border-border-custom">
                <h4 className="text-xs font-semibold text-accent-custom uppercase tracking-wider font-sans">Settlement & Waiver Targets</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">OTS Amount</span>
                    <strong className="text-good block mt-0.5 font-mono">{formatMoney(data.financials.ots_amount)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">POS Waiver Amount</span>
                    <strong className="text-good block mt-0.5 font-mono">{formatMoney(data.financials.pos_waiver_amount)}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/5">
                    <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">POS Waiver Percent</span>
                    <strong className="text-good block mt-0.5 font-mono">
                      {data.financials.pos_waiver_percent !== undefined && data.financials.pos_waiver_percent !== null
                        ? `${data.financials.pos_waiver_percent}%`
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiver requests list */}
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-ink">Requested Settlement Waivers</h3>
                {permissions.can_raise_waiver && (
                  <button
                    onClick={() => setIsWaiverOpen(true)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink hover:bg-black text-surface text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Raise new request</span>
                  </button>
                )}
              </div>

              {data.waivers.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border-custom rounded-xl text-xs text-ink-3">
                  No active discount or waiver request found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-custom text-[10px] uppercase font-semibold text-ink-3 bg-bg-warm/10">
                        <th className="py-2 px-3">Date Raised</th>
                        <th className="py-2 px-3">Waiver Amount</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Employee Remarks</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom/30 text-[12.5px]">
                      {data.waivers.map((w, idx) => (
                        <tr key={idx} className="hover:bg-bg-warm/10">
                          <td className="py-3 px-3 font-mono text-ink-2">{formatDate(w.created_at)}</td>
                          <td className="py-3 px-3 font-semibold text-accent-custom font-mono">{formatMoney(w.requested_waiver_amount)}</td>
                          <td className="py-3 px-3 text-ink-2 max-w-[120px] truncate">{w.reason}</td>
                          <td className="py-3 px-3 text-ink-3 italic">{w.employee_remarks || "-"}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${w.status === "Approved" ? "bg-good-bg text-good" : w.status === "Rejected" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"
                              }`}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 4. ASSET & COLLATERAL TAB ==================== */}
        {activeTab === "assets" && (
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-ink font-serif">Collateral Asset & Vehicle Details</h3>
              <p className="text-xs text-ink-2">Detailed parameters of the collateralized asset vehicle compliance records.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Car className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Asset Specifications</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Manufacturer</span>
                    <strong className="text-ink block mt-0.5 font-medium">{data.assets.manufacturer || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Manufacturer 2</span>
                    <strong className="text-ink block mt-0.5 font-medium">{data.assets.manufacturer_2 || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Asset Model</span>
                    <strong className="text-ink block mt-0.5 font-medium">{data.assets.asset_model || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Asset Variant</span>
                    <strong className="text-ink block mt-0.5 font-medium">{data.assets.asset_variant || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Category</span>
                    <strong className="text-ink block mt-0.5 font-medium">{data.assets.asset_category || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Year of Mfg</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.assets.year_of_manufacture || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Scale className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Compliance Identifiers</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Registration Number (RC)</span>
                    <strong className="text-ink font-mono block mt-0.5">{data.assets.rc_number || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Engine Number</span>
                    <strong className="text-ink font-mono block mt-0.5">{data.assets.engine_number || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] font-semibold uppercase tracking-wide">Chassis Number</span>
                    <strong className="text-ink font-mono block mt-0.5">{data.assets.chassis_number || "-"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. LEGAL LITIGATION TAB ==================== */}
        {activeTab === "legal" && (
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-ink font-serif">Litigation Cases & Warrants Database</h3>
              <p className="text-xs text-ink-2">Detailed registry of case statuses, cheque bounces, warrants, arbitration, execution petitions, and notices.</p>
            </div>

            <div className="space-y-6 animate-fade-in text-[13px]">
              {/* Panel 1: Case & Trial Context */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Scale className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Case & Trial Context</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Legal Status</span>
                    <strong className="text-bad block mt-0.5">{data.legal.legal_status || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Type of Case</span>
                    <strong className="text-ink block mt-0.5">{data.legal.type_of_case || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Case No</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.case_no || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Group Stage</span>
                    <strong className="text-ink block mt-0.5">{data.legal.group_stage || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Current Stage</span>
                    <strong className="text-ink block mt-0.5">{data.legal.current_stage || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">CNR Number CC</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.cnr_number_cc || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">CNR Number PCR</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.cnr_number_pcr || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Advocate</span>
                    <strong className="text-ink block mt-0.5">{data.legal.advocate || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 2: Cheque & Section 138 Dues */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-bg-warm/5">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <AlertCircle className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Cheque & Sec 138 Details</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Notice Sent Sec 138</span>
                    <strong className="text-ink block mt-0.5">{data.legal.notice_sent_sec138 || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Sec 138 Current Status</span>
                    <strong className="text-ink block mt-0.5">{data.legal.sec138_current_status || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Cheque No</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.cheque_no || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Cheque Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.cheque_date)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Cheque Amount</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.legal.cheque_amount)}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 3: Court Coordinates */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <MapPin className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Court Jurisdictions</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Court Name</span>
                    <strong className="text-ink block mt-0.5">{data.legal.court_name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Court Location</span>
                    <strong className="text-ink block mt-0.5">{data.legal.court_location || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Filed Location</span>
                    <strong className="text-ink block mt-0.5">{data.legal.filed_location || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Court Hall</span>
                    <strong className="text-ink block mt-0.5">{data.legal.court_hall || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Court Bench</span>
                    <strong className="text-ink block mt-0.5">{data.legal.court_bench || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 4: Hearings Calendar */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-bg-warm/5">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Calendar className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Hearing Dates</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className="bg-surface border border-border-custom/50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 uppercase font-semibold">Last Date of Hearing (LDOH)</span>
                      <strong className="text-sm font-mono text-ink mt-0.5 block">{formatDate(data.legal.ldoh)}</strong>
                    </div>
                  </div>
                  <div className="bg-surface border border-border-custom/50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-ink-3 uppercase font-semibold">Next Date of Hearing (NDOH)</span>
                      <strong className="text-sm font-mono text-accent-custom mt-0.5 block">{formatDate(data.legal.ndoh)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 5: Summons & Warrants */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <FileText className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Summons & Warrants</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Hand Summons</span>
                    <strong className="text-ink block mt-0.5">{data.legal.hand_summons || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Hand Warrant 1</span>
                    <strong className="text-ink block mt-0.5">{data.legal.hand_warrant_1 || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Proclamation Orders</span>
                    <strong className="text-ink block mt-0.5">{data.legal.proclamation_orders || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Hand S/NBW/BW/PC</span>
                    <strong className="text-ink block mt-0.5">{data.legal.hand_s_nbw_bw_pc || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Hand S/NBW/BW/PC Type</span>
                    <strong className="text-ink block mt-0.5">{data.legal.hand_s_nbw_bw_pc_type || "-"}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 6: Arbitration details */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-bg-warm/5">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Scale className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Arbitration Proceedings</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">ARB Status</span>
                    <strong className="text-ink block mt-0.5">{data.legal.arb || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Arbitration Group Stage</span>
                    <strong className="text-ink block mt-0.5">{data.legal.arbitration_group_stage || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Sec 17 Orders</span>
                    <strong className="text-ink block mt-0.5">{data.legal.sec17_orders || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Sec 17 Orders Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.sec17_orders_date)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Sec 17 Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.sec17_date)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Award Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.award_date)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Claim Amount</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatMoney(data.legal.claim_amount)}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 7: Execution Petition (EP) Details */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <FileText className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Execution Petition (EP)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP Stage</span>
                    <strong className="text-ink block mt-0.5">{data.legal.ep_stage || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP Case No</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.ep_case_no || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP Advocate</span>
                    <strong className="text-ink block mt-0.5">{data.legal.ep_advocate || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP LDOH</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.ep_ldoh)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP NDOH</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.ep_ndoh)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">EP PDOH</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.ep_pdoh)}</strong>
                  </div>
                </div>
              </div>

              {/* Panel 8: Other Legal Statuses */}
              <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-bg-warm/5">
                <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                  <Shield className="w-4 h-4 text-accent-custom" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink">Other Registries</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">Termination Status/SA</span>
                    <strong className="text-ink block mt-0.5">{data.legal.termination_status_sa || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">LRN/PRN Status</span>
                    <strong className="text-ink block mt-0.5">{data.legal.lrn_prn_status || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">LRN/PRN Issue Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.lrn_prn_issue_date)}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">LRN Status</span>
                    <strong className="text-ink block mt-0.5">{data.legal.lrn_status || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">LRN Date</span>
                    <strong className="text-ink block mt-0.5 font-mono">{formatDate(data.legal.lrn_date)}</strong>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-ink-3 block text-[11px] uppercase font-semibold">LRN/PRN Link</span>
                    {data.legal.lrn_prn_link && data.legal.lrn_prn_link !== "-" ? (
                      <a
                        href={data.legal.lrn_prn_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-custom hover:underline block mt-0.5 break-all font-mono text-xs"
                      >
                        {data.legal.lrn_prn_link}
                      </a>
                    ) : (
                      <span className="text-ink-3 block mt-0.5 font-mono">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. TIMELINE & LOGS TAB ==================== */}
        {activeTab === "timeline" && (
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-ink">Chronological Call Timeline Feed</h3>
                <p className="text-xs text-ink-2">Complete log history of recovery attempts, remarks, and supervisor reviews.</p>
              </div>
              {permissions.can_add_disposition && (
                <button
                  onClick={() => setIsDispoOpen(true)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-ink hover:bg-black text-surface text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log new call</span>
                </button>
              )}
            </div>

            {data.dispositions.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-3 border border-dashed border-border-custom rounded-xl">
                No attempt timelines found. Click above to log the first calling outcome.
              </div>
            ) : (
              <div className="space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom/85 pr-1 max-h-[500px] overflow-y-auto">
                {data.dispositions.map((dispo, idx) => (
                  <div key={idx} className="relative group animate-fade-in text-[13px]">
                    <span className="absolute -left-[27.5px] top-1.5 w-3 h-3 rounded-full border-2 border-surface bg-accent-custom shadow-sm" />

                    <div className="bg-bg-warm/10 border border-border-custom rounded-xl p-4 space-y-2 hover:border-border-strong transition-all">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold bg-bg-warm text-ink-2 border border-border-custom`}>
                            {dispo.main_disposition?.name || "Unknown"}
                          </span>
                          <span className="text-ink font-semibold">{dispo.sub_disposition?.name || "Unknown"}</span>
                        </div>
                        <span className="text-xs text-ink-3 font-mono">
                          {new Date(dispo.created_at).toLocaleString("en-GB")}
                        </span>
                      </div>

                      <p className="text-ink-2 italic leading-relaxed font-sans">&quot;{dispo.remarks}&quot;</p>

                      {dispo.dynamic_data?.ptp_amount && (
                        <div className="bg-good-bg/30 border border-good/10 p-2 rounded-lg text-good font-semibold text-[12.5px] font-mono inline-block">
                          Promise amount: {formatMoney(dispo.dynamic_data.ptp_amount)} | Commitment Date: {new Date(dispo.dynamic_data.ptp_date).toLocaleDateString("en-GB")}
                        </div>
                      )}

                      {dispo.dynamic_data?.paid_amount && (
                        <div className="bg-good-bg/30 border border-good/10 p-2 rounded-lg text-good font-semibold text-[12.5px] font-mono inline-block">
                          Collected Paid: {formatMoney(dispo.dynamic_data.paid_amount)} | Date: {new Date(dispo.dynamic_data.payment_date).toLocaleDateString("en-GB")} | UTR: {dispo.dynamic_data.proof_reference || "-"}
                        </div>
                      )}

                      <div className="text-[11px] text-ink-3 flex items-center gap-1.5 pt-1.5 border-t border-border-custom/50">
                        <span>Attempt log by:</span>
                        <strong className="text-ink-2 font-medium">{dispo.employee_profile?.full_name} ({dispo.employee_profile?.role})</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== DIALOG 1: CALL OUTCOME MODAL ==================== */}
      {isDispoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-lg p-6 shadow-xl relative animate-scale-up space-y-4">

            {/* Stopwatch widget in modal */}
            <div className="flex justify-between items-center pb-2 border-b border-border-custom">
              <div>
                <h3 className="text-base font-semibold text-ink">Add Disposition</h3>
                <span className="text-xs text-ink-3">Customer Target: {data.contract.customer_name}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-soft text-accent-ink font-mono font-bold text-xs">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Timer: {formatTimer(callDuration)}</span>
              </div>
            </div>

            <form onSubmit={handleDispoSubmit} className="space-y-4">
              {/* Main dispo choice */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Calling Status Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {mainDispositions.map((md: any) => (
                    <button
                      key={md.id}
                      type="button"
                      onClick={() => {
                        setMainDispoId(md.id);
                        setSubDispoId("");
                        setDynamicData({});
                      }}
                      className={`h-9 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${mainDispoId === md.id
                        ? "bg-ink border-ink text-surface shadow-sm"
                        : "bg-surface border-border-custom text-ink hover:bg-bg-warm"
                        }`}
                    >
                      {md.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-dispositions options selector grid */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Outcome sub-category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-border-custom rounded-lg bg-bg-warm/25">
                  {currentSubDispositions.map((sd: any) => (
                    <button
                      key={sd.id}
                      type="button"
                      onClick={() => {
                         setSubDispoId(sd.id);
                         setDynamicData({});
                      }}
                      className={`h-7 px-2 rounded text-[11px] truncate font-medium text-left transition-all ${subDispoId === sd.id
                        ? "bg-accent-custom text-surface"
                        : "bg-surface text-ink-2 hover:bg-bg-warm border border-border-custom/50"
                        }`}
                    >
                      {sd.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom dynamic fields based on sub-disposition outcome */}
              {currentFormSchema.length > 0 && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-bg-warm/50 border border-border-custom rounded-xl animate-fade-in text-[12.5px]">
                  {currentFormSchema.map((field: any) => (
                    <div key={field.id} className="space-y-1">
                      <label className="text-ink font-semibold">{field.label}</label>
                      <input
                        type={field.type}
                        required={field.required}
                        value={dynamicData[field.id] || ""}
                        onChange={(e) => setDynamicData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* General remarks */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Remarks / Conversation Summary</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter detailed call log notes here..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg p-2.5 text-xs text-ink placeholder-ink-3"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDispoOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispoSubmitting}
                  className="h-9 px-4 bg-ink hover:bg-black text-surface text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {dispoSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Disposition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DIALOG 2: WAIVER REQUEST MODAL ==================== */}
      {isWaiverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-scale-up space-y-4">

            <div className="pb-2 border-b border-border-custom">
              <h3 className="text-base font-semibold text-ink font-serif">Request Settlement Discount Waiver</h3>
              <span className="text-xs text-ink-3">Principal POS: {formatMoney(data.financials.pos)}</span>
            </div>

            <form onSubmit={handleWaiverSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-[12.5px]">
                <div className="space-y-1">
                  <label className="text-ink-3 font-semibold">Requested Waiver (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={waiverAmount}
                    onChange={(e) => setWaiverAmount(e.target.value)}
                    className="w-full bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Waiver Category Reason</label>
                <select
                  required
                  value={waiverReasonId}
                  onChange={(e) => setWaiverReasonId(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-ink"
                >
                  <option value="">-- Select reason --</option>
                  {activeWaiverReasons.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.reason}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Employee Justification Notes</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Provide justifying notes for manager approval..."
                  value={waiverRemarks}
                  onChange={(e) => setWaiverRemarks(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg p-2.5 text-xs text-ink placeholder-ink-3"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Route to Supervisors (Select at least one)</label>
                <div className="border border-border-custom rounded-lg p-3 bg-bg max-h-40 overflow-y-auto space-y-2">
                  {supervisors.length === 0 ? (
                    <div className="text-xs text-ink-3 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching available supervisors...</div>
                  ) : (
                    supervisors.map(sup => (
                      <label key={sup.id} className="flex items-start gap-2.5 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="mt-0.5 rounded border-border-custom text-accent-custom focus:ring-accent-custom bg-bg-warm"
                          checked={routedTo.includes(sup.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoutedTo(prev => [...prev, sup.id]);
                            } else {
                              setRoutedTo(prev => prev.filter(id => id !== sup.id));
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-ink group-hover:text-accent-custom transition-colors">{sup.full_name}</span>
                          <span className="text-[10px] text-ink-3">{sup.role}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWaiverOpen(false)}
                  className="h-9 px-4 rounded-lg border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={waiverSubmitting || !waiverAmount}
                  className="h-9 px-4 bg-ink hover:bg-black text-surface text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
                >
                  {waiverSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
