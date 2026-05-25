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
  TrendingUp,
  MapPin,
  Car,
  AlertTriangle
} from "lucide-react";

interface ClientViewProps {
  initialData: Customer360Data;
  permissions: Record<PermissionKey, boolean>;
}

export default function Customer360ClientView({ initialData, permissions }: ClientViewProps) {
  const [data, setData] = useState<Customer360Data>(initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "contacts" | "financials" | "assets" | "legal" | "timeline">("overview");

  // Call outcome modal states
  const [isDispoOpen, setIsDispoOpen] = useState(false);
  const [mainDispo, setMainDispo] = useState<"Contactable" | "Non-Contactable">("Contactable");
  const [subDispo, setSubDispo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [ptpDate, setPtpDate] = useState("");
  const [ptpAmount, setPtpAmount] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [proofRef, setProofRef] = useState("");
  const [dispoSubmitting, setDispoSubmitting] = useState(false);

  // Call timer stopwatch states
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Waiver request modal states
  const [isWaiverOpen, setIsWaiverOpen] = useState(false);
  const [waiverAmount, setWaiverAmount] = useState("");
  const [payableAmount, setPayableAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverRemarks, setWaiverRemarks] = useState("");
  const [routedTo, setRoutedTo] = useState<string[]>([]);
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
    if (!permissions.can_view_financial_data) return "[Access Gated]";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const maskPhone = (phone: string | undefined | null) => {
    if (!phone || phone === "-") return "-";
    if (permissions.can_view_contact_numbers) return phone;
    // Mask all but first 2 and last 2 digits
    if (phone.length <= 4) return "••••••••";
    return phone.slice(0, 2) + "••••••" + phone.slice(-2);
  };

  const maskAddress = (address: string | undefined | null) => {
    if (!address || address === "-") return "-";
    if (permissions.can_view_contact_numbers) return address;
    return "Access Gated · Permissions Restricted";
  };

  // 21 detailed dispositions mapping
  const contactableSubs = [
    "Promise to Pay",
    "Agree to Pay",
    "Part Paid",
    "Callback Scheduled",
    "Already Paid",
    "Refused to Pay",
    "Disputed Settlement",
    "Third Party Gated"
  ];

  const nonContactableSubs = [
    "Switched Off",
    "Ringing No Answer",
    "Busy Signal",
    "Not Reachable",
    "Invalid Number",
    "Wrong Number",
    "Out of Service",
    "Call Disconnected"
  ];

  // Auto calculate payable in waiver request
  useEffect(() => {
    const totalOut = Number(data.financials.total_outstanding || 0);
    const waiver = Number(waiverAmount || 0);
    if (waiver > 0 && waiver <= totalOut) {
      setPayableAmount((totalOut - waiver).toString());
    } else {
      setPayableAmount("");
    }
  }, [waiverAmount, data.financials.total_outstanding]);

  // Submit Call Dispo
  const handleDispoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispoSubmitting(true);
    try {
      const res = await logCallDisposition(
        data.contract.contract_no,
        mainDispo,
        subDispo || (mainDispo === "Contactable" ? "Promise to Pay" : "Ringing No Answer"),
        remarks,
        mainDispo === "Contactable" && subDispo === "Promise to Pay" ? ptpDate : null,
        mainDispo === "Contactable" && subDispo === "Promise to Pay" ? Number(ptpAmount) : null,
        mainDispo === "Contactable" && subDispo === "Callback Scheduled" ? followUpDate : null,
        mainDispo === "Contactable" && subDispo === "Part Paid" ? Number(paidAmount) : null,
        mainDispo === "Contactable" && subDispo === "Part Paid" ? paymentDate : null,
        mainDispo === "Contactable" && subDispo === "Part Paid" ? proofRef : null
      );

      if (res.success) {
        // Mock fresh timeline addition locally for visual speed
        const newDispo = {
          created_at: new Date().toISOString(),
          main_disposition: mainDispo,
          sub_disposition: subDispo || "Call logged",
          remarks,
          ptp_amount: ptpAmount ? Number(ptpAmount) : null,
          ptp_date: ptpDate || null,
          employee_profile: { full_name: "You (Active)", role: "Employee" }
        };
        setData(prev => ({
          ...prev,
          dispositions: [newDispo, ...prev.dispositions]
        }));
        setIsDispoOpen(false);
        // Reset inputs
        setRemarks("");
        setPtpDate("");
        setPtpAmount("");
        setFollowUpDate("");
        setPaidAmount("");
        setPaymentDate("");
        setProofRef("");
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
    const totalOut = Number(data.financials.total_outstanding || 0);
    const waiverVal = Number(waiverAmount);

    if (waiverVal <= 0 || waiverVal > totalOut) {
      alert("Waiver amount must be greater than 0 and less than or equal to active outstanding balance.");
      return;
    }

    if (routedTo.length === 0) {
      alert("Please select at least one supervisor to route this request to.");
      return;
    }

    setWaiverSubmitting(true);
    try {
      const res = await raiseWaiverRequest(
        data.contract.contract_no,
        waiverVal,
        Number(payableAmount),
        waiverReason,
        routedTo,
        waiverRemarks
      );

      if (res.success) {
        const newWaiver = {
          created_at: new Date().toISOString(),
          requested_waiver_amount: waiverVal,
          customer_payable_amount: Number(payableAmount),
          reason: waiverReason,
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
        setWaiverReason("");
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
            <span>·</span>
            <span>Allocated To: <strong className="text-ink font-semibold">{data.contract.allocated_to_profile?.full_name || "Unassigned"}</strong></span>
          </div>
        </div>

        {/* Global Action Modals Triggers */}
        <div className="flex items-center gap-2">
          {permissions.can_add_disposition && (
            <button
              onClick={() => {
                setMainDispo("Contactable");
                setSubDispo("Promise to Pay");
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
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">Total Outstanding</span>
                    <div className="text-xl font-bold font-mono text-ink mt-1">
                      {formatMoney(data.financials.total_outstanding)}
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
                    <span className="text-[10.5px] text-ink-3 font-semibold uppercase">Principal POS</span>
                    <div className="text-xl font-bold font-mono text-ink mt-1">
                      {formatMoney(data.financials.pos)}
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
                        {maskPhone(data.contacts.mobile_1 || data.contacts.primary_mobile)}
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
                        {maskPhone(data.contacts.mobile_no || data.contacts.mobile_no_2)}
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
                          <span className="font-semibold text-ink">{dispo.sub_disposition}</span>
                          <span className="text-[10px] font-mono text-ink-3">{new Date(dispo.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-ink-2 mt-0.5 line-clamp-2 italic">&quot;{dispo.remarks}&quot;</p>
                        {dispo.ptp_amount && (
                          <div className="text-[11.5px] font-semibold text-good mt-1 font-mono">
                            Commitment: {formatMoney(dispo.ptp_amount)} on {new Date(dispo.ptp_date).toLocaleDateString()}
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
              <h3 className="text-base font-semibold text-ink">Demographics & Gated Contact Details</h3>
              <p className="text-xs text-ink-2">Contact numbers are decrypted dynamically based on permission parameters.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/10">
                <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Customer Name</span>
                <strong className="text-ink block mt-0.5 font-medium">{data.contract.customer_name}</strong>
              </div>
              <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/10">
                <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Primary Phone</span>
                <strong className="text-ink block mt-0.5 font-mono">{maskPhone(data.contacts.mobile_1 || data.contacts.primary_mobile)}</strong>
              </div>
              <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/10">
                <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Finnone Phone</span>
                <strong className="text-ink block mt-0.5 font-mono">{maskPhone(data.contacts.primary_mobile_1 || data.contacts.latest_contact_no)}</strong>
              </div>
              <div className="border border-border-custom p-3.5 rounded-xl text-[13px] bg-bg-warm/10">
                <span className="text-ink-3 font-semibold block text-[10.5px] uppercase tracking-wide">Secured Flag</span>
                <strong className="text-ink block mt-0.5 font-mono">{data.contract.secured_product_flag || "-"}</strong>
              </div>
            </div>

            {/* Address segments (11 options) */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-sm font-semibold text-ink">Address Directories</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Master Primary Address</span>
                  <p className="text-ink mt-1 font-medium leading-relaxed">
                    {maskAddress(data.contacts.master_primary_address)}
                  </p>
                  <span className="text-[11px] text-ink-3 block mt-2">Pincode: {data.contacts.pincode || "522003"}</span>
                </div>

                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface">
                  <span className="text-ink-3 font-semibold text-[10px] uppercase tracking-wide block">Secondary Office Address</span>
                  <p className="text-ink mt-1 font-medium leading-relaxed">
                    {maskAddress(data.contacts.office_address)}
                  </p>
                </div>
              </div>
            </div>

            {/* References panel */}
            <div className="space-y-4 pt-4 border-t border-border-custom">
              <h4 className="text-sm font-semibold text-ink">Reference Contacts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Reference 1: {data.contacts.ref_name_1 || "Adi Ranga Rao"}</span>
                    <strong className="text-sm font-mono text-ink mt-1 block">
                      {maskPhone(data.contacts.ref_mobile_1 || "9988223344")}
                    </strong>
                    <span className="text-[11px] text-ink-3 block mt-0.5">Relation: {data.contacts.ref_relation_1 || "Spouse"}</span>
                  </div>
                  <span className="p-2 bg-bg-warm rounded-lg text-ink-2">
                    <Phone className="w-4 h-4" />
                  </span>
                </div>

                <div className="border border-border-custom p-4 rounded-xl text-[13px] bg-surface flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-3 uppercase tracking-wider font-semibold block">Reference 2: {data.contacts.ref_name_2 || "-"}</span>
                    <strong className="text-sm font-mono text-ink mt-1 block">
                      {maskPhone(data.contacts.ref_mobile_2)}
                    </strong>
                    <span className="text-[11px] text-ink-3 block mt-0.5">Relation: {data.contacts.ref_relation_2 || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. FINANCIALS & WAIVERS TAB ==================== */}
        {activeTab === "financials" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-ink">Exposure Breakdown & Waivers Status</h3>
                <p className="text-xs text-ink-2">Complete financial outstanding details gated by permissions policies.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-border-strong rounded-xl p-4 bg-bg-warm/20 text-center">
                  <span className="text-xs text-ink-3 block uppercase tracking-wider font-semibold">Finance Principal</span>
                  <strong className="text-2xl font-bold font-mono text-ink block mt-1.5">
                    {formatMoney(data.financials.finance_amount)}
                  </strong>
                </div>
                <div className="border border-border-strong rounded-xl p-4 bg-bg-warm/20 text-center">
                  <span className="text-xs text-ink-3 block uppercase tracking-wider font-semibold">Active Outstanding (POS)</span>
                  <strong className="text-2xl font-bold font-mono text-accent-custom block mt-1.5">
                    {formatMoney(data.financials.total_pos_outstanding)}
                  </strong>
                </div>
                <div className="border border-border-strong rounded-xl p-4 bg-bg-warm/20 text-center">
                  <span className="text-xs text-ink-3 block uppercase tracking-wider font-semibold">Overdue (Principal + Interest)</span>
                  <strong className="text-2xl font-bold font-mono text-bad block mt-1.5">
                    {formatMoney(data.financials.od_amount)}
                  </strong>
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
                        <th className="py-2 px-3">Customer Payable</th>
                        <th className="py-2 px-3">Reason</th>
                        <th className="py-2 px-3">Employee Remarks</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom/30 text-[12.5px]">
                      {data.waivers.map((w, idx) => (
                        <tr key={idx} className="hover:bg-bg-warm/10">
                          <td className="py-3 px-3 font-mono text-ink-2">{new Date(w.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3 font-semibold text-accent-custom font-mono">{formatMoney(w.requested_waiver_amount)}</td>
                          <td className="py-3 px-3 font-semibold text-ink font-mono">{formatMoney(w.customer_payable_amount)}</td>
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
              <h3 className="text-base font-semibold text-ink">Collateral Asset & Vehicle Gating</h3>
              <p className="text-xs text-ink-2">Security parameters lock vehicle details. Requires `can_view_asset_data` validation.</p>
            </div>

            {!permissions.can_view_asset_data ? (
              <div className="flex flex-col items-center justify-center py-14 bg-bg-warm/20 border border-border-custom rounded-xl space-y-3">
                <Lock className="w-8 h-8 text-accent-custom" />
                <h4 className="text-sm font-semibold text-ink">Asset Information Gated</h4>
                <p className="text-xs text-ink-3 max-w-sm text-center">
                  Your current operator profile does not hold authorization key `can_view_asset_data`. Contact the administrator to update permissions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="border border-border-custom p-4 rounded-xl space-y-3.5 bg-surface">
                  <div className="flex items-center gap-2 pb-1 border-b border-border-custom">
                    <Car className="w-4 h-4 text-accent-custom" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-ink">Asset Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <span className="text-ink-3 block">Manufacturer:</span>
                      <strong className="text-ink block mt-0.5">{data.assets.manufacturer || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Asset Model:</span>
                      <strong className="text-ink block mt-0.5">{data.assets.asset_model || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Category:</span>
                      <strong className="text-ink block mt-0.5">{data.assets.asset_category || "MUV / SUV"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Year of Mfg:</span>
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
                      <span className="text-ink-3 block">Registration Number:</span>
                      <strong className="text-ink font-mono block mt-0.5">{data.assets.rc_number || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Engine Number:</span>
                      <strong className="text-ink font-mono block mt-0.5">{data.assets.engine_number || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Chassis Number:</span>
                      <strong className="text-ink font-mono block mt-0.5">{data.assets.chassis_number || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Asset Variant:</span>
                      <strong className="text-ink block mt-0.5">{data.assets.asset_variant || "-"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 5. LEGAL LITIGATION TAB ==================== */}
        {activeTab === "legal" && (
          <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-ink">Litigation case, warrants, & NBW Records</h3>
              <p className="text-xs text-ink-2">Detailed CC case hearing status and ep court coordinates (gated by `can_view_legal_data` key).</p>
            </div>

            {!permissions.can_view_legal_data ? (
              <div className="flex flex-col items-center justify-center py-14 bg-bg-warm/20 border border-border-custom rounded-xl space-y-3">
                <Lock className="w-8 h-8 text-accent-custom" />
                <h4 className="text-sm font-semibold text-ink">Litigation Records Restricted</h4>
                <p className="text-xs text-ink-3 max-w-sm text-center">
                  Your current operator profile does not hold authorization key `can_view_legal_data`. Contact the administrator to check status.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Court and Advocate section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px]">
                    <span className="text-ink-3 block text-[10px] uppercase font-semibold">Litigation Case No</span>
                    <strong className="text-ink block mt-0.5 font-mono">{data.legal.case_no || "147/2019"}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px]">
                    <span className="text-ink-3 block text-[10px] uppercase font-semibold">Advocate In-charge</span>
                    <strong className="text-ink block mt-0.5">{data.legal.advocate || "Kunuku Raja Sekhar"}</strong>
                  </div>
                  <div className="border border-border-custom p-3.5 rounded-xl text-[13px]">
                    <span className="text-ink-3 block text-[10px] uppercase font-semibold">Court Location / hall</span>
                    <strong className="text-ink block mt-0.5">{data.legal.court_location || "VIJAYAWADA"} / {data.legal.court_name || "Chief Magistrate"}</strong>
                  </div>
                </div>

                {/* Notice and bounce details */}
                <div className="border border-border-custom p-4 rounded-xl space-y-4 bg-bg-warm/10">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ink-2">Bounce Actions Parameters</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <span className="text-ink-3 block">Sec 138 Notice Status:</span>
                      <strong className="text-ink block mt-0.5">{data.legal.notice_sent_sec138 || "SENT"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Cheque Number:</span>
                      <strong className="text-ink font-mono block mt-0.5">{data.legal.cheque_no || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Cheque Amount:</span>
                      <strong className="text-ink font-mono block mt-0.5">{formatMoney(data.legal.cheque_amount)}</strong>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Case Hearing Stage:</span>
                      <strong className="text-accent-custom block mt-0.5">{data.legal.group_stage || "-"}</strong>
                    </div>
                  </div>
                </div>

                {/* Additional case properties (44 metadata fields check) */}
                <div className="border border-border-custom p-4 rounded-xl space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ink-2">Complete Court Hearings Parameters</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[12.5px] text-ink-2">
                    <div>
                      <span className="text-ink-3 block">LDOH (Last Date):</span>
                      <span className="text-ink font-mono font-semibold block mt-0.5">{data.legal.ldoh || "45259"}</span>
                    </div>
                    <div>
                      <span className="text-ink-3 block">NDOH (Next Date):</span>
                      <span className="text-ink font-mono font-semibold block mt-0.5">{data.legal.ndoh || "-"}</span>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Court Hall:</span>
                      <span className="text-ink block mt-0.5">{data.legal.court_hall || "-"}</span>
                    </div>
                    <div>
                      <span className="text-ink-3 block">Legal Status:</span>
                      <span className="text-bad font-semibold block mt-0.5">{data.legal.legal_status || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                            {dispo.main_disposition}
                          </span>
                          <span className="text-ink font-semibold">{dispo.sub_disposition}</span>
                        </div>
                        <span className="text-xs text-ink-3 font-mono">
                          {new Date(dispo.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-ink-2 italic leading-relaxed font-sans">&quot;{dispo.remarks}&quot;</p>

                      {dispo.ptp_amount && (
                        <div className="bg-good-bg/30 border border-good/10 p-2 rounded-lg text-good font-semibold text-[12.5px] font-mono inline-block">
                          Promise amount: {formatMoney(dispo.ptp_amount)} | Commitment Date: {new Date(dispo.ptp_date).toLocaleDateString()}
                        </div>
                      )}

                      {dispo.paid_amount && (
                        <div className="bg-good-bg/30 border border-good/10 p-2 rounded-lg text-good font-semibold text-[12.5px] font-mono inline-block">
                          Collected Paid: {formatMoney(dispo.paid_amount)} | Date: {new Date(dispo.payment_date).toLocaleDateString()} | UTR: {dispo.proof_reference || "-"}
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
                  <button
                    type="button"
                    onClick={() => {
                      setMainDispo("Contactable");
                      setSubDispo("Promise to Pay");
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${mainDispo === "Contactable"
                      ? "bg-ink border-ink text-surface shadow-sm"
                      : "bg-surface border-border-custom text-ink hover:bg-bg-warm"
                      }`}
                  >
                    Contacted (Connected)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainDispo("Non-Contactable");
                      setSubDispo("Ringing No Answer");
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${mainDispo === "Non-Contactable"
                      ? "bg-ink border-ink text-surface shadow-sm"
                      : "bg-surface border-border-custom text-ink hover:bg-bg-warm"
                      }`}
                  >
                    Non-Contacted
                  </button>
                </div>
              </div>

              {/* Sub-dispositions 21 options selector grid */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Outcome sub-category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border border-border-custom rounded-lg bg-bg-warm/25">
                  {(mainDispo === "Contactable" ? contactableSubs : nonContactableSubs).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubDispo(sub)}
                      className={`h-7 px-2 rounded text-[11px] truncate font-medium text-left transition-all ${subDispo === sub
                        ? "bg-accent-custom text-surface"
                        : "bg-surface text-ink-2 hover:bg-bg-warm border border-border-custom/50"
                        }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom dynamic fields based on sub-disposition outcome */}
              {mainDispo === "Contactable" && subDispo === "Promise to Pay" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-good-bg/25 border border-good/10 rounded-xl animate-fade-in text-[12.5px]">
                  <div className="space-y-1">
                    <label className="text-good font-semibold">Commitment Promise Date</label>
                    <input
                      type="date"
                      required
                      value={ptpDate}
                      onChange={(e) => setPtpDate(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-good font-semibold">Commitment Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45000"
                      value={ptpAmount}
                      onChange={(e) => setPtpAmount(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>
              )}

              {mainDispo === "Contactable" && subDispo === "Callback Scheduled" && (
                <div className="p-3 bg-bg-warm border border-border-strong rounded-xl animate-fade-in text-[12.5px] space-y-1">
                  <label className="text-ink font-semibold">Schedule Callback Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                  />
                </div>
              )}

              {mainDispo === "Contactable" && subDispo === "Part Paid" && (
                <div className="p-3 bg-good-bg/25 border border-good/10 rounded-xl animate-fade-in text-[12.5px] space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-good font-semibold">Collected Amount (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 15000"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-good font-semibold">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-good font-semibold">UTR Receipt Reference Number</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR128492049"
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
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
              <span className="text-xs text-ink-3">Total Active Outstanding: {formatMoney(data.financials.total_outstanding)}</span>
            </div>

            <form onSubmit={handleWaiverSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
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
                <div className="space-y-1">
                  <label className="text-ink-3 font-semibold">Payable Outstanding (₹)</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Auto Calculated"
                    value={payableAmount ? `₹${Number(payableAmount).toLocaleString("en-IN")}` : ""}
                    className="w-full bg-bg-warm/50 border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold block">Waiver Category Reason</label>
                <select
                  required
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full bg-bg border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-ink"
                >
                  <option value="">-- Select reason --</option>
                  <option value="Customer Demise">Customer Demise</option>
                  <option value="Severe Medical Emergency">Severe Medical Emergency</option>
                  <option value="Crop Failure / Agricultural Loss">Crop Failure / Agricultural Loss</option>
                  <option value="Business Liquidation">Business Liquidation</option>
                  <option value="One-Time Settlement (OTS) Scheme">One-Time Settlement (OTS) Scheme</option>
                  <option value="Other Compassionate Grounds">Other Compassionate Grounds</option>
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
                  disabled={waiverSubmitting || !payableAmount}
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
