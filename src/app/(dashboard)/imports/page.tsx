"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { commitImportBatch, type ImportRow, type ImportSummary } from "@/app/actions/importActions";
import PermissionGuard from "@/components/PermissionGuard";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Loader2,
  Download,
  Settings,
  ShieldCheck,
  Search
} from "lucide-react";

type ImportStep = 1 | 2 | 3;

interface FieldDefinition {
  key: keyof ImportRow;
  label: string;
  required: boolean;
  type: "string" | "number";
  aliases: string[];
}

const TARGET_FIELDS: FieldDefinition[] = [
  // 1. Base Loan & Account Classification
  { key: "contract_no", label: "Contract No", required: true, type: "string", aliases: ["contract_no", "contract no", "agreement no", "agreement_no", "lan", "loan account number"] },
  { key: "customer_name", label: "Customer Name", required: true, type: "string", aliases: ["customer_name", "customer name", "client name", "borrower name", "name"] },
  { key: "product", label: "Product", required: false, type: "string", aliases: ["product", "product_class", "product type"] },
  { key: "branch", label: "Branch", required: false, type: "string", aliases: ["branch", "branch name", "location", "branch_name"] },
  { key: "state", label: "State", required: false, type: "string", aliases: ["state", "state_name", "customer state"] },
  { key: "writeoff_flg", label: "Writeoff Flag", required: false, type: "string", aliases: ["writeoff_flg", "writeoff flag", "writeoff"] },
  { key: "bom_dpd", label: "BOM DPD", required: false, type: "number", aliases: ["bom dpd", "bom_dpd", "dpd"] },
  { key: "bkt_tagging", label: "Bucket Tagging", required: false, type: "string", aliases: ["bkt tagging", "bkt_tagging", "bucket tagging"] },
  { key: "mob", label: "MOB", required: false, type: "number", aliases: ["mob", "months on book"] },
  { key: "bom_bucket", label: "BOM Bucket", required: false, type: "string", aliases: ["bom bucket", "bom_bucket", "bom_bkt"] },
  { key: "finone_scheme_name", label: "Finnone Scheme Name", required: false, type: "string", aliases: ["finone_scheme_name", "finone scheme name", "scheme name"] },
  { key: "cif", label: "CIF Number", required: false, type: "string", aliases: ["cif", "cif number", "cif "] },
  { key: "allocation_dpd_category", label: "Allocation DPD Category", required: false, type: "string", aliases: ["allocation dpd category", "allocation_dpd_category"] },
  { key: "occupation_type", label: "Occupation Type", required: false, type: "string", aliases: ["OccupationType", "occupation type", "occupation_type"] },
  { key: "organization_employer_name", label: "Employer / Organization", required: false, type: "string", aliases: ["organization_employername", "employer name", "organization employer name"] },

  // 2. Contacts & Addresses
  { key: "mobile_1", label: "Mobile 1", required: false, type: "string", aliases: ["mobile 1", "mobile_1", "phone", "contact no 1 - mobile 1"] },
  { key: "primary_mobile_1", label: "Primary Mobile 1", required: false, type: "string", aliases: ["primarymobilenumber1", "primary mobile number 1", "primary mobile 1", "primary_mobile_1"] },
  { key: "primary_mobile_2", label: "Primary Mobile 2", required: false, type: "string", aliases: ["primarymobilenumber2", "primary mobile number 2", "primary mobile 2", "primary_mobile_2"] },
  { key: "coapplicant_1", label: "Co-Applicant 1", required: false, type: "string", aliases: ["coapplicant1", "co-applicant 1", "coapplicant 1"] },
  { key: "coapplicant_2", label: "Co-Applicant 2", required: false, type: "string", aliases: ["coapplicant2", "co-applicant 2", "coapplicant 2"] },
  { key: "coapplicant_3", label: "Co-Applicant 3", required: false, type: "string", aliases: ["coapplicant3", "co-applicant 3", "coapplicant 3"] },
  { key: "coapplicant_4", label: "Co-Applicant 4", required: false, type: "string", aliases: ["coapplicant4", "co-applicant 4", "coapplicant 4"] },
  { key: "guarantor_1", label: "Guarantor 1", required: false, type: "string", aliases: ["guarantor1", "guarantor 1"] },
  { key: "guarantor_2", label: "Guarantor 2", required: false, type: "string", aliases: ["guarantor2", "guarantor 2"] },
  { key: "guarantor_3", label: "Guarantor 3", required: false, type: "string", aliases: ["guarantor3", "guarantor 3"] },
  { key: "pan_no", label: "PAN No", required: false, type: "string", aliases: ["pan no", "pan_no", "pan"] },
  { key: "is_primary_email_yes", label: "Primary Email (Yes)", required: false, type: "string", aliases: ["isprimaryemailyes", "is primary email yes", "email 1"] },
  { key: "is_primary_email_no", label: "Secondary Email (No)", required: false, type: "string", aliases: ["isprimaryemailno", "is primary email no", "email 2"] },
  { key: "ref_name_1", label: "Reference Name 1", required: false, type: "string", aliases: ["referancename1", "reference name 1", "ref name 1", "ref_name_1"] },
  { key: "ref_full_address_1", label: "Reference Address 1", required: false, type: "string", aliases: ["referancefulladdress1", "reference full address 1", "ref full address 1", "ref_full_address_1"] },
  { key: "ref_relation_1", label: "Reference Relation 1", required: false, type: "string", aliases: ["referancerelationship1", "reference relationship 1", "ref relation 1", "ref_relation_1"] },
  { key: "ref_mobile_1", label: "Reference Mobile 1", required: false, type: "string", aliases: ["referancemobileno1", "reference mobile no 1", "ref mobile 1", "ref_mobile_1", "contact no 4 - reference mobile 1"] },
  { key: "ref_name_2", label: "Reference Name 2", required: false, type: "string", aliases: ["referancename2", "reference name 2", "ref name 2", "ref_name_2"] },
  { key: "ref_full_address_2", label: "Reference Address 2", required: false, type: "string", aliases: ["referancefulladdress2", "reference full address 2", "ref full address 2", "ref_full_address_2"] },
  { key: "ref_relation_2", label: "Reference Relation 2", required: false, type: "string", aliases: ["referancerelationship2", "reference relationship 2", "ref relation 2", "ref_relation_2"] },
  { key: "ref_mobile_2", label: "Reference Mobile 2", required: false, type: "string", aliases: ["referancemobileno2", "reference mobile no 2", "ref mobile 2", "ref_mobile_2", "contact no 5 - reference mobile 2"] },
  { key: "base_address", label: "Base Address", required: false, type: "string", aliases: ["address", "base address", "base_address", "address 1 - base address"] },
  { key: "landmark", label: "Landmark", required: false, type: "string", aliases: ["land mark", "landmark"] },
  { key: "pincode", label: "Pincode", required: false, type: "string", aliases: ["pincode", "zip", "postal code"] },
  { key: "permanent_address", label: "Permanent Address", required: false, type: "string", aliases: ["permanentaddress", "permanent address", "permanent_address", "address 2 - permanent address"] },
  { key: "office_address", label: "Office Address", required: false, type: "string", aliases: ["office address", "office_address", "address 3 - office address"] },
  { key: "finnone_address", label: "Finnone Address", required: false, type: "string", aliases: ["finnone address", "finnone_address", "address 4 - finnone address"] },
  { key: "secondary_address", label: "Secondary Address", required: false, type: "string", aliases: ["secondaryaddress", "secondary address", "secondary_address", "address 5 - secondary address"] },
  { key: "additional_address", label: "Additional Address", required: false, type: "string", aliases: ["additionaladdress", "additional address", "additional_address", "address 7 - additional address"] },
  { key: "residential_address", label: "Residential Address", required: false, type: "string", aliases: ["resi address", "residential address", "residential_address", "address 8 - residential address"] },
  { key: "pdpr_address", label: "PDPR Address", required: false, type: "string", aliases: ["pdpr address", "pdpr_address", "address 11 - pdpr address"] },

  // 3. Asset & Vehicle Fields
  { key: "asset_model", label: "Asset Model", required: false, type: "string", aliases: ["assetmodel", "asset model", "asset_model"] },
  { key: "manufacturer", label: "Manufacturer", required: false, type: "string", aliases: ["manufacturer_name", "manufacturer", "make"] },
  { key: "year_of_manufacture", label: "Year of Manufacture", required: false, type: "string", aliases: ["yearofmanufacture", "year of manufacture", "year_of_manufacture"] },
  { key: "rc_number", label: "RC / Reg Number", required: false, type: "string", aliases: ["registrationnumber", "rc number", "rc_number", "reg no"] },
  { key: "engine_number", label: "Engine Number", required: false, type: "string", aliases: ["enginenumber", "engine number", "engine_number"] },
  { key: "chassis_number", label: "Chassis Number", required: false, type: "string", aliases: ["chasisnumber", "chassis number", "chassis_number"] },
  { key: "asset_variant", label: "Asset Variant", required: false, type: "string", aliases: ["assetvariant", "asset variant", "asset_variant"] },
  { key: "vehicle_available", label: "Vehicle Available", required: false, type: "string", aliases: ["vehicle available (yes/no)", "vehicle available", "vehicle_available"] },

  // 4. Financial, Banking & Recovery Fields
  { key: "insurance_type", label: "Insurance Type", required: false, type: "string", aliases: ["insurancetype", "insurance type"] },
  { key: "insurance_policy_end_date", label: "Insurance End Date", required: false, type: "string", aliases: ["insurancepolicyenddate", "insurance policy end date"] },
  { key: "sum_assured_amount", label: "Sum Assured Amount", required: false, type: "number", aliases: ["sumassuredamount", "sum assured amount"] },
  { key: "death_case_insurance_update", label: "Death Case Insurance Update", required: false, type: "string", aliases: ["death case-insurance update", "death case insurance update"] },
  { key: "contract_start_date", label: "Contract Start Date", required: false, type: "string", aliases: ["contract_start_date", "contract start date"] },
  { key: "contract_end_date", label: "Contract End Date", required: false, type: "string", aliases: ["contract_end_date", "contract end date"] },
  { key: "cycle", label: "Cycle", required: false, type: "string", aliases: ["cycle"] },
  { key: "total_tenure", label: "Total Tenure", required: false, type: "string", aliases: ["total tenure", "tenure"] },
  { key: "finance_amount", label: "Finance Amount", required: false, type: "number", aliases: ["finance_amount", "finance amount"] },
  { key: "bank_account_no", label: "Bank Account No", required: false, type: "string", aliases: ["bank accountno", "bank account no", "bank_account_no"] },
  { key: "ifsc_code", label: "IFSC Code", required: false, type: "string", aliases: ["ifsccode", "ifsc code", "ifsc"] },
  { key: "emi_amount", label: "EMI Amount", required: false, type: "number", aliases: ["emi amount", "emi_amount", "emi"] },
  { key: "od_amount", label: "OD Amount", required: false, type: "number", aliases: ["emi/los od amount", "od amount", "od_amount"] },
  { key: "principal_overdue", label: "Principal Overdue", required: false, type: "number", aliases: ["principle_overdue", "principal overdue", "principal_overdue"] },
  { key: "interest_overdue", label: "Interest Overdue", required: false, type: "number", aliases: ["interest over due", "interest overdue", "interest_overdue"] },
  { key: "future_pos", label: "Future POS", required: false, type: "number", aliases: ["future pos", "future_pos"] },
  { key: "bounce_charges", label: "Bounce Charges", required: false, type: "number", aliases: ["bounce charges", "bounce_charges"] },
  { key: "current_odc", label: "Current ODC", required: false, type: "number", aliases: ["current_odc", "current odc"] },
  { key: "total_outstanding", label: "Total Outstanding", required: false, type: "number", aliases: ["total outstanding", "total_outstanding"] },
  { key: "pos", label: "POS", required: false, type: "number", aliases: ["pos"] },
  { key: "pos_in_cr", label: "POS In Cr", required: false, type: "string", aliases: ["pos in cr", "pos_in_cr"] },
  { key: "act_pct_cr", label: "Act % CR", required: false, type: "string", aliases: ["act % cr", "act_pct_cr"] },
  { key: "collxn_act_tar", label: "Collxn - Act Tar", required: false, type: "string", aliases: ["collxn-act tar", "collxn act tar"] },
  { key: "ror", label: "ROR", required: false, type: "string", aliases: ["ror"] },
  { key: "target_pct", label: "Target %", required: false, type: "string", aliases: ["target%", "target percent"] },
  { key: "last_month_pay_collxn", label: "Last Month Pay Collxn", required: false, type: "string", aliases: ["last month pay collxn", "last_month_pay_collxn"] },
  { key: "last_month_pay_status", label: "Last Month Pay Status", required: false, type: "string", aliases: ["last month pay status", "last_month_pay_status"] },
  { key: "outside_pay_l3m_vs_emi", label: "Outside Pay L3M vs EMI", required: false, type: "string", aliases: ["outside_payl3m_vs_emi", "outside pay l3m vs emi"] },

  // 5. Legal & Litigation Fields
  { key: "notice_sent_sec138", label: "Notice Sent in Sec 138", required: false, type: "string", aliases: ["notice sent in sec 138", "notice sent sec138", "notice_sent_sec138"] },
  { key: "cheque_amount", label: "Cheque Amount", required: false, type: "number", aliases: ["chq amt", "cheque amount", "cheque_amount"] },
  { key: "cnr_number_cc", label: "CNR Number (CC)", required: false, type: "string", aliases: ["cnr number(cc)", "cnr number cc", "cnr_number_cc"] },
  { key: "new_cnr_number_cc", label: "New CNR Number (CC)", required: false, type: "string", aliases: ["new cnr number(c.c)", "new cnr number cc", "new_cnr_number_cc"] },
  { key: "cnr_number_pcr", label: "CNR Number (PCR)", required: false, type: "string", aliases: ["cnr number(pcr)", "cnr number pcr", "cnr_number_pcr"] },
  { key: "current_stage", label: "Current Stage (Sec 138)", required: false, type: "string", aliases: ["current stage", "current_stage"] },
  { key: "group_stage", label: "Group Stage (Sec 138)", required: false, type: "string", aliases: ["Group stage", "group_stage"] },
  { key: "case_no", label: "Case No", required: false, type: "string", aliases: ["case no", "case_no"] },
  { key: "filed_location", label: "Filed Location", required: false, type: "string", aliases: ["filed location", "filed_location"] },
  { key: "court_hall", label: "Court Hall", required: false, type: "string", aliases: ["court hall", "court_hall"] },
  { key: "ldoh", label: "LDOH", required: false, type: "string", aliases: ["ldoh"] },
  { key: "ndoh", label: "NDOH (Sec 138)", required: false, type: "string", aliases: ["NDOH", "sec138 ndoh"] },
  { key: "advocate", label: "Advocate", required: false, type: "string", aliases: ["Advocate", "sec138 advocate"] },
  { key: "hand_summons", label: "Hand Summons", required: false, type: "string", aliases: ["hand s/nbw/bw/pc", "hand summons", "hand_summons"] },
  { key: "hand_s_nbw_bw_pc_type", label: "Hand Summons Type", required: false, type: "string", aliases: ["Hand S/NBW/BW/PC_TYPE", "hand summons type"] },
  { key: "hand_s_nbw_bw_pc_oct8", label: "Hand Summons Oct 8", required: false, type: "string", aliases: ["hand s/nbw/bw/pc-8th oct", "hand_s_nbw_bw_pc_oct8"] },
  { key: "hand_s_nbw_bw_pc_type2", label: "Hand Summons Type 2", required: false, type: "string", aliases: ["Hand S/NBW/BW/PC_TYPE_1", "hand summons type 2"] },
  { key: "arbitrator_type", label: "Arbitrator Type", required: false, type: "string", aliases: ["institutional/sole arbitrator", "arbitrator type"] },
  { key: "lrn_date", label: "LRN Date", required: false, type: "string", aliases: ["lrn date", "lrn_date"] },
  { key: "arb", label: "Arbitration Status", required: false, type: "string", aliases: ["arb"] },
  { key: "claim_amount", label: "Claim Amount", required: false, type: "number", aliases: ["claim amount", "claim_amount"] },
  { key: "arbitration_group_stage", label: "Arbitration Group Stage", required: false, type: "string", aliases: ["Group Stage", "arbitration_group_stage"] },
  { key: "sec17_orders", label: "Sec 17 Orders", required: false, type: "string", aliases: ["sec 17 orders", "sec17_orders"] },
  { key: "award_date", label: "Award Date", required: false, type: "string", aliases: ["award date", "award_date"] },
  { key: "arbitration_ndoh", label: "Arbitration NDOH", required: false, type: "string", aliases: ["NDOH_1", "arbitration ndoh", "arbitration_ndoh"] },
  { key: "ep_stage", label: "EP Stage", required: false, type: "string", aliases: ["ep stage", "ep_stage"] },
  { key: "ep_group_stage", label: "EP Group Stage", required: false, type: "string", aliases: ["Group Stage_1", "ep_group_stage"] },
  { key: "court_bench", label: "Court Bench", required: false, type: "string", aliases: ["court bench", "court_bench"] },
  { key: "court_location", label: "Court Location", required: false, type: "string", aliases: ["court location", "court_location"] },
  { key: "ep_pdoh", label: "EP PDOH", required: false, type: "string", aliases: ["ep-pdoh", "ep pdoh"] },
  { key: "ep_ndoh", label: "EP NDOH", required: false, type: "string", aliases: ["ep-ndoh", "ep ndoh"] },
  { key: "ep_case_no", label: "EP Case No", required: false, type: "string", aliases: ["ep-case no", "ep case no"] },
  { key: "ep_advocate", label: "EP Advocate", required: false, type: "string", aliases: ["ADVOCATE", "ep advocate", "ep_advocate"] },
  { key: "legal_status", label: "Legal Status", required: false, type: "string", aliases: ["legal status", "legal_status"] },

  // 6. Agency Hierarchy Fields
  { key: "cm_name", label: "Collection Manager Name", required: false, type: "string", aliases: ["cm name", "cm_name"] },

  // 7. Bureau & Credit Scores
  { key: "credit_score", label: "Credit Score", required: false, type: "string", aliases: ["creditscore", "credit score"] },
  { key: "cibil_score", label: "CIBIL Score", required: false, type: "string", aliases: ["cibil score", "cibil_score"] },
  { key: "sourcing_cibil_score", label: "Sourcing CIBIL Score", required: false, type: "string", aliases: ["sourcing cibil score", "sourcing_cibil_score"] },
  { key: "bureau_details_1", label: "Bureau Details 1", required: false, type: "string", aliases: ["bureau_details_1", "bureau details 1"] },
  { key: "bureau_details_2", label: "Bureau Details 2", required: false, type: "string", aliases: ["bureau_details_2", "bureau details 2"] },
  { key: "bureau_details_3", label: "Bureau Details 3", required: false, type: "string", aliases: ["bureau_details_3", "bureau details 3"] },
  { key: "bureau_details_4", label: "Bureau Details 4", required: false, type: "string", aliases: ["bureau_details_4", "bureau details 4"] },

  // 8. Call Trails & Dispositions
  { key: "contact_mode", label: "Contact Mode", required: false, type: "string", aliases: ["CONTACT_MODE", "contact mode", "contact_mode"] },
];

// Exact layout of TCL-2 Header.xlsx: row 1 = section banner (and field names), row 2 = column headers.
const TEMPLATE_SECTION_ROW: string[] = ["Account and Customer Profile", "BRANCH", "STATE", "CUSTOMER_NAME", "PRODUCT", "CreditScore", "Vehicle and Asset Details", "MANUFACTURER_NAME", "YearOfManufacture", "RegistrationNumber", "EngineNumber", "ChasisNumber", "AssetVariant", "Employment Details", "OccupationType", "Allocation and Portfolio Details", "WRITEOFF_FLG", "BOM_DPD", "BKT Tagging", "MOB", "BOM_BKT", "FINONE_SCHEME_NAME", "CIF ", "CONTACT_MODE", "Customer Contact Details", "LAND MARK", "PINCODE", "Mobile 1", "Co-applicant and Guarantor Details", "COAPPLICANT2", "COAPPLICANT3", "COAPPLICANT4", "GUARANTOR1", "GUARANTOR2", "GUARANTOR3", "Customer Addresses and Additional Contact Numbers", "Finnone Address", "SECONDARYADDRESS", "OFFICE ADDRESS", "ADDITIONALADDRESS", "RESI ADDRESS", "PRIMARYMOBILENUMBER1", "PRIMARYMOBILENUMBER2", "Bureau Details", "BUREAU_DETAILS_2", "BUREAU_DETAILS_3", "BUREAU_DETAILS_4", "Reference Details", "ReferanceFullAddress1", "ReferanceRelationship1", "ReferanceMobileNo1", "ReferanceName2", "ReferanceFullAddress2", "ReferanceRelationship2", "ReferanceMobileNo2", "Insurance Details", "InsurancePolicyEndDate", "SumAssuredAmount", "Customer Identification and Email Details", "IsPrimaryEmailYes", "IsPrimaryEmailNo", "Contract and Banking Details", "Contract_End_Date", "Cycle", "Total Tenure", "Finance_Amount", "BANK AccountNo", "IFSCCode", "EMI Amount", "Overdue and Outstanding Details", "PRINCIPLE_OVERDUE", "INTEREST OVER DUE", "Future POS", "BOUNCE CHARGES", "Current_ODC", "Total Outstanding", "POS", "POS In Cr", "Collection Performance and Account Owner", "Collxn-Act Tar", "ROR", "Target%", "Last Month Pay Collxn", "Last Month Pay Status", "CM NAME", "Legal and Court Proceedings", "Chq Amt", "CNR NUMBER(CC)", "New CNR Number(C.C)", "CNR NUMBER(PCR)", "Current stage", "Group stage", "Case No", "FILED LOCATION", "Court Hall", "LDOH", "NDOH", "Advocate", "Hand S/NBW/BW/PC", "Hand S/NBW/BW/PC_TYPE", "Hand S/NBW/BW/PC-8th OCT", "Hand S/NBW/BW/PC_TYPE", "INSTITUTIONAL/SOLE ARBITRATOR", "LRN DATE", "ARB", "Claim Amount", "Group Stage", "SEC 17 ORDERS", "AWARD DATE", "NDOH", "EP STAGE", "Group Stage", "Court Bench", "Court Location", "EP-PDOH", "EP-NDOH", "EP-CASE NO", "ADVOCATE", "Payment History Analysis", "Recovery Address", "Credit Score Details", "SOURCING CIBIL SCORE", "Legal Status", "Vehicle Availability", "Death Case Insurance Update"];
const TEMPLATE_HEADER_ROW: string[] = ["Contract_No", "BRANCH", "STATE", "CUSTOMER_NAME", "PRODUCT", "CreditScore", "AssetModel", "MANUFACTURER_NAME", "YearOfManufacture", "RegistrationNumber", "EngineNumber", "ChasisNumber", "AssetVariant", "Organization_EmployerName", "OccupationType", "Allocation DPD Category", "WRITEOFF_FLG", "BOM_DPD", "BKT Tagging", "MOB", "BOM_BKT", "FINONE_SCHEME_NAME", "CIF", "CONTACT_MODE", "Address", "LAND MARK", "PINCODE", "Mobile 1", "COAPPLICANT1", "COAPPLICANT2", "COAPPLICANT3", "COAPPLICANT4", "GUARANTOR1", "GUARANTOR2", "GUARANTOR3", "PERMANENTADDRESS", "Finnone Address", "SECONDARYADDRESS", "OFFICE ADDRESS", "ADDITIONALADDRESS", "RESI ADDRESS", "PRIMARYMOBILENUMBER1", "PRIMARYMOBILENUMBER2", "BUREAU_DETAILS_1", "BUREAU_DETAILS_2", "BUREAU_DETAILS_3", "BUREAU_DETAILS_4", "ReferanceName1", "ReferanceFullAddress1", "ReferanceRelationship1", "ReferanceMobileNo1", "ReferanceName2", "ReferanceFullAddress2", "ReferanceRelationship2", "ReferanceMobileNo2", "InsuranceType", "InsurancePolicyEndDate", "SumAssuredAmount", "PAN NO", "IsPrimaryEmailYes", "IsPrimaryEmailNo", "Contract_Start_Date", "Contract_End_Date", "Cycle", "Total Tenure", "Finance_Amount", "BANK AccountNo", "IFSCCode", "EMI Amount", "EMI/LOS OD AMOUNT", "PRINCIPLE_OVERDUE", "INTEREST OVER DUE", "Future POS", "BOUNCE CHARGES", "Current_ODC", "Total Outstanding", "POS", "POS In Cr", "Act % CR", "Collxn-Act Tar", "ROR", "Target%", "Last Month Pay Collxn", "Last Month Pay Status", "CM NAME", "Notice Sent in SEC 138", "Chq Amt", "CNR NUMBER(CC)", "New CNR Number(C.C)", "CNR NUMBER(PCR)", "Current stage", "Group stage", "Case No", "FILED LOCATION", "Court Hall", "LDOH", "NDOH", "Advocate", "Hand S/NBW/BW/PC", "Hand S/NBW/BW/PC_TYPE", "Hand S/NBW/BW/PC-8th OCT", "Hand S/NBW/BW/PC_TYPE", "INSTITUTIONAL/SOLE ARBITRATOR", "LRN DATE", "ARB", "Claim Amount", "Group Stage", "SEC 17 ORDERS", "AWARD DATE", "NDOH", "EP STAGE", "Group Stage", "Court Bench", "Court Location", "EP-PDOH", "EP-NDOH", "EP-CASE NO", "ADVOCATE", "Outside_payL3M_vs_emi", "PDPR Address", "CIBIL SCORE", "SOURCING CIBIL SCORE", "Legal Status", "Vehicle Available (Yes/No)", "Death Case-Insurance Update"];

export default function ImportsPage() {
  const [step, setStep] = useState<ImportStep>(1);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[]>([]);

  // Field mappings state (target_key -> excel_header)
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Validation counts
  const [validCount, setValidCount] = useState(0);
  const [innerDuplicates, setInnerDuplicates] = useState<string[]>([]);

  // Final execution state
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitProgress, setCommitProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunkCount, setTotalChunkCount] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle Excel parsing on client side
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellText: true, raw: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Parse raw data to find the actual header row
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length === 0) {
          alert("Excel file appears to be completely empty.");
          return;
        }

        // Find which row contains the headers. Prefer the row holding the Contract No column
        // (the section banner row above it also repeats names like CUSTOMER_NAME).
        const normalizeCell = (h: any) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const scanRows = Math.min(10, data.length);
        let headerRowIndex = -1;
        for (let i = 0; i < scanRows && headerRowIndex < 0; i++) {
          if (data[i].map(normalizeCell).includes("contractno")) headerRowIndex = i;
        }
        for (let i = 0; i < scanRows && headerRowIndex < 0; i++) {
          if (data[i].map(normalizeCell).includes("customername")) headerRowIndex = i;
        }
        if (headerRowIndex < 0) headerRowIndex = 0;

        const headers = data[headerRowIndex].map(h => String(h || "").trim()).filter(Boolean);
        const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, raw: false }) as any[];

        setExcelHeaders(headers);
        setExcelRows(rows);

        // Get all unique keys (headers + row object keys for duplicate resolution e.g. CONTACT_MODE_1)
        const rowKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
        const allSearchableHeaders = Array.from(new Set([...rowKeys, ...headers]));

        // Auto Map Columns logic (2-Pass: exact case-sensitive trimmed alias match, then case-insensitive normalized match)
        const initialMappings: Record<string, string> = {};
        TARGET_FIELDS.forEach(field => {
          // Pass 1: exact case-sensitive trimmed match
          let match = allSearchableHeaders.find(h =>
            field.aliases.some(alias => h.trim() === alias.trim())
          );
          // Pass 2: normalized case-insensitive alphanumeric match
          if (!match) {
            match = allSearchableHeaders.find(h => {
              const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, "");
              return field.aliases.some(alias => {
                const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
                return cleanH === cleanAlias;
              });
            });
          }
          initialMappings[field.key] = match || "";
        });

        setMappings(initialMappings);

        // Auto validate using initialMappings
        const missingRequired = TARGET_FIELDS.filter(f => f.required && !initialMappings[f.key]);
        if (missingRequired.length > 0) {
          alert(`File is missing required columns: ${missingRequired.map(f => f.label).join(", ")}`);
          return;
        }

        const contractNoHeader = initialMappings["contract_no"];
        const seenContracts = new Set<string>();
        const dupes: string[] = [];
        let valid = 0;

        rows.forEach(row => {
          const cNo = String(row[contractNoHeader] || "").trim();
          if (!cNo) return;
          if (seenContracts.has(cNo)) {
            dupes.push(cNo);
          } else {
            seenContracts.add(cNo);
            valid++;
          }
        });

        setInnerDuplicates(dupes);
        setValidCount(valid);
        setStep(2); // Skip mapping step, go directly to validation summary
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file. Verify file format and try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };



  // Step 3: Trigger Transaction Commit
  const handleCommitImport = async () => {
    setCommitLoading(true);
    try {
      // Map raw Excel rows to ImportRows format
      const formattedRows: ImportRow[] = excelRows.map(row => {
        const item: any = {};
        TARGET_FIELDS.forEach(field => {
          const excelHeader = mappings[field.key];
          let val = row[excelHeader];

          if (field.type === "number") {
            if (typeof val === 'string') {
              const cleanVal = val.replace(/,/g, '').trim();
              if (cleanVal === "" || cleanVal === "-" || cleanVal.toUpperCase() === "N/A") {
                item[field.key] = 0;
              } else {
                const num = Number(cleanVal);
                item[field.key] = isNaN(num) ? 0 : num;
              }
            } else {
              item[field.key] = val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : 0;
            }
          } else {
            item[field.key] = val !== undefined && val !== null ? String(val).trim() : "";
          }
        });
        return item as ImportRow;
      });

      let currentBatchId = "";
      let aggregatedSummary: ImportSummary | null = null;
      const CHUNK_SIZE = 350;
      const totalChunks = Math.ceil(formattedRows.length / CHUNK_SIZE);
      let chunksCompleted = 0;

      setTotalToProcess(formattedRows.length);
      setTotalChunkCount(totalChunks);
      setProcessedCount(0);
      setCurrentChunkIndex(0);

      for (let i = 0; i < formattedRows.length; i += CHUNK_SIZE) {
        const chunk = formattedRows.slice(i, i + CHUNK_SIZE);
        const result = await commitImportBatch(filename, chunk, currentBatchId || undefined, i === 0 ? formattedRows.length : undefined);
        currentBatchId = result.batchId;

        chunksCompleted++;
        setCurrentChunkIndex(chunksCompleted);
        setProcessedCount(Math.min(i + chunk.length, formattedRows.length));
        setCommitProgress(Math.round((chunksCompleted / totalChunks) * 100));

        if (!aggregatedSummary) {
          aggregatedSummary = { ...result, totalRows: formattedRows.length };
        } else {
          aggregatedSummary.imported += result.imported;
          aggregatedSummary.newContracts = (aggregatedSummary.newContracts || 0) + result.newContracts;
          aggregatedSummary.updatedContracts = (aggregatedSummary.updatedContracts || 0) + result.updatedContracts;
          aggregatedSummary.skippedDuplicates += result.skippedDuplicates;
          aggregatedSummary.failed += result.failed;
          aggregatedSummary.errors.push(...result.errors);
        }
      }

      setImportSummary(aggregatedSummary);
      setStep(3);
    } catch (err: any) {
      alert("Error saving data: " + err.message);
    } finally {
      setCommitLoading(false);
      setCommitProgress(0);
    }
  };

  // Download log helper
  const downloadErrorLogs = () => {
    if (!importSummary || importSummary.errors.length === 0) return;

    const header = "Row Number,Reason\n";
    const csvContent = importSummary.errors.map(e => `${e.row_number},"${e.error_reason.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `import_logs_${importSummary.batchId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download XLSX template dynamically based on TARGET_FIELDS
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_SECTION_ROW, TEMPLATE_HEADER_ROW]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Upload_Template");
    XLSX.writeFile(wb, "TCL-2_Import_Template.xlsx");
  };

  return (
    <PermissionGuard permission="can_upload_excel">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header title */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="font-brand">GoalCryst CRM</span>
              <span>·</span>
              <span>Data</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 font-serif">
              Bulk Import
            </h1>
            <p className="text-[13px] text-ink-2 mt-1">
              Upload Excel files to assign accounts.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-surface border border-border-custom text-[13.5px] font-medium text-ink hover:bg-bg-warm transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-custom" />
            <span>Download Template</span>
          </button>
        </div>

        {/* ===== STEP INDICATOR BAR ===== */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: "Upload Sheets" },
            { num: 2, label: "Validate Data" },
            { num: 3, label: "Save Contracts" }
          ].map((item) => {
            const isActive = step === item.num;
            const isDone = step > item.num;
            return (
              <div
                key={item.num}
                className={`pb-2.5 border-b-2 text-xs font-semibold uppercase tracking-wider transition-all ${isActive
                    ? "border-accent-custom text-accent-custom"
                    : isDone
                      ? "border-ink text-ink"
                      : "border-border-custom text-ink-3"
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold ${isActive ? "bg-accent-custom text-surface" : isDone ? "bg-ink text-surface" : "bg-border-custom text-ink-3"
                    }`}>
                    {item.num}
                  </span>
                  <span>{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== STEP CONTENT WINDOW ===== */}

        {/* ==================== STEP 1: UPLOAD ==================== */}
        {step === 1 && (
          <div className="space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-strong hover:border-accent-custom hover:bg-bg-warm/30 rounded-2xl p-12 text-center transition-all cursor-pointer space-y-4"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {loading ? (
                <div className="space-y-2 select-none">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-custom mx-auto" />
                  <p className="text-sm font-semibold text-ink">Analyzing workbook parameters...</p>
                  <p className="text-xs text-ink-3">Structuring columns and auto-mapping headers...</p>
                </div>
              ) : (
                <div className="space-y-2 select-none">
                  <Upload className="w-10 h-10 text-ink-3 mx-auto" />
                  <h3 className="text-base font-semibold text-ink">Select Allocation Sheet</h3>
                  <p className="text-xs text-ink-2 max-w-sm mx-auto">
                    Drag and drop your active allocation sheet here, or click to browse. Supports `.xlsx`, `.xls`, and `.csv` files.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span className="inline-block px-3 py-1 bg-bg-warm border border-border-custom rounded-md text-[10.5px] text-ink-2 font-mono">
                      216 target fields supported (TCL Retail Portfolio)
                    </span>
                    <span className="inline-block px-2.5 py-1 bg-accent-soft border border-accent-ink/20 text-accent-ink rounded-md text-[10.5px] font-medium">
                      Tip: For 15K+ dumps, saving as CSV parses 4x faster
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 bg-bg-warm/40 border border-border-custom rounded-xl p-4 text-[12.5px] text-ink-2">
              <ShieldCheck className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink font-semibold">Smart Upsert Enabled:</strong>
                <span className="block mt-0.5">
                  Re-uploading an existing Excel sheet will automatically update contract data (financials, contacts, legal, assets) while preserving all employee call logs, dispositions, and waiver history.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: VALIDATION ==================== */}
        {step === 2 && (
          <div className="space-y-6 animate-scale-up">
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-ink">Excel File Validation Results</h3>
                <p className="text-xs text-ink-2">Evaluation stats based on mapped data columns parameters.</p>
              </div>

              {/* Validation indicators grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-border-custom rounded-xl p-4 bg-bg-warm/25 text-center">
                  <span className="text-[10px] text-ink-3 uppercase font-semibold block">Total Rows Analyzed</span>
                  <strong className="text-2xl font-bold text-ink block mt-1">{excelRows.length}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-4 bg-good-bg/25 text-center">
                  <span className="text-[10px] text-good uppercase font-semibold block">Unique valid items</span>
                  <strong className="text-2xl font-bold text-good block mt-1">{validCount}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-4 bg-warn-bg/25 text-center">
                  <span className="text-[10px] text-warn uppercase font-semibold block">Sheet Duplicates</span>
                  <strong className="text-2xl font-bold text-warn block mt-1">{innerDuplicates.length}</strong>
                </div>
              </div>

              {/* Info notice about upsert behavior */}
              <div className="flex items-start gap-3 border border-border-custom bg-surface rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-2">
                <HelpCircle className="w-4 h-4 text-accent-custom flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-ink">Existing contracts will be updated,</strong> not duplicated. New contracts will be inserted fresh. Employee call histories and waivers are never touched by this operation.
                </span>
              </div>

              {innerDuplicates.length > 0 && (
                <div className="flex items-start gap-3 border border-border-custom bg-warn-bg/10 rounded-xl p-4 text-[12.5px] leading-relaxed text-ink-2">
                  <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-ink font-semibold">Row Duplication Warning:</strong>
                    <span className="block mt-0.5">
                     We detected <strong className="text-ink">{innerDuplicates.length} contract duplicate(s)</strong> within this file. Only the first occurrence of each contract will be processed — subsequent duplicates within the same sheet will be skipped.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Save Actions buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setExcelRows([]);
                  setExcelHeaders([]);
                  setMappings({});
                  setStep(1);
                }}
                className="flex items-center gap-1.5 h-9 px-4 border border-border-custom hover:bg-bg-warm text-xs font-semibold text-ink-2 rounded-lg transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                onClick={handleCommitImport}
                disabled={commitLoading}
                className="flex items-center gap-1.5 h-9 px-4 bg-accent-custom hover:bg-accent-ink text-surface text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-75"
              >
                {commitLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Preparing data...</span>
                  </>
                ) : (
                  <>
                    <span>Save Data</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: SAVE LOG SUMMARY ==================== */}
        {step === 3 && importSummary && (
          <div className="space-y-6 animate-scale-up">
            <div className="bg-surface border border-border-custom rounded-2xl p-6 shadow-sm space-y-6">
              <div className="text-center space-y-2 select-none">
                <CheckCircle className="w-10 h-10 text-good mx-auto" />
                <h3 className="text-base font-semibold text-ink">Allocation Sheet Imported Successfully</h3>
                <p className="text-xs text-ink-3">Filename logged: {importSummary.filename}</p>
              </div>

              {/* Save statistics indicators */}
              <div className="grid grid-cols-5 gap-3">
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bg-warm/15">
                  <span className="text-[9.5px] uppercase font-semibold text-ink-3 block">Total Rows</span>
                  <strong className="text-xl font-bold font-mono text-ink block mt-1">{importSummary.totalRows}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-good-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-good block">New Contracts</span>
                  <strong className="text-xl font-bold font-mono text-good block mt-1">{importSummary.newContracts ?? 0}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-blue-50">
                  <span className="text-[9.5px] uppercase font-semibold text-blue-600 block">Updated</span>
                  <strong className="text-xl font-bold font-mono text-blue-600 block mt-1">{importSummary.updatedContracts ?? 0}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-warn-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-warn block">Sheet Duplicates</span>
                  <strong className="text-xl font-bold font-mono text-warn block mt-1">{importSummary.skippedDuplicates}</strong>
                </div>
                <div className="border border-border-custom rounded-xl p-3.5 text-center bg-bad-bg/15">
                  <span className="text-[9.5px] uppercase font-semibold text-bad block">Failed</span>
                  <strong className="text-xl font-bold font-mono text-bad block mt-1">{importSummary.failed}</strong>
                </div>
              </div>

              {/* Error detail list */}
              {importSummary.errors.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border-custom">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs uppercase font-semibold text-ink-2">Detailed Skip / Fail Logs ({importSummary.errors.length})</h4>
                    <button
                      onClick={downloadErrorLogs}
                      className="flex items-center gap-1 h-7 px-2.5 rounded bg-bg-warm hover:bg-border-custom border border-border-custom text-[11px] font-semibold text-ink-2 transition-all cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-accent-custom" />
                      <span>Download Log Report (CSV)</span>
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-border-custom rounded-lg divide-y divide-border-custom/50 bg-bg-warm/5">
                    {importSummary.errors.map((err, idx) => (
                      <div key={idx} className="flex gap-4 p-2.5 text-[12px] hover:bg-bg-warm/10 transition-colors">
                        <span className="font-semibold text-ink-3 block w-16 flex-shrink-0">Row {err.row_number}</span>
                        <p className="text-bad font-medium leading-normal">{err.error_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Final home navigation buttons */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setFilename("");
                  setExcelRows([]);
                  setExcelHeaders([]);
                  setMappings({});
                  setImportSummary(null);
                  setStep(1);
                }}
                className="h-9 px-6 bg-ink hover:opacity-90 active:scale-[0.99] text-surface text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Upload another sheet
              </button>
            </div>
          </div>
        )}

        {/* ==================== MODAL: PROGRESS OVERLAY ==================== */}
        {commitLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-accent-custom mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-ink">Saving Portfolio Contracts...</h3>
                <p className="text-xs text-ink-3 mt-1">Please keep this page open. Records are being committed across 8 relational tables in resilient 350-row chunks.</p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-baseline text-[11px] font-semibold text-ink uppercase tracking-wider">
                  <span>
                    {processedCount.toLocaleString()} / {totalToProcess.toLocaleString()}
                  </span>
                  <span className="font-mono text-accent-custom text-sm">{commitProgress}%</span>
                </div>
                <div className="w-full h-2 bg-bg-warm rounded-full overflow-hidden border border-border-custom/50">
                  <div
                    className="h-full bg-accent-custom transition-all duration-300 ease-out"
                    style={{ width: `${commitProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-ink-3 font-mono pt-1 text-right">
                  Batch {currentChunkIndex} of {totalChunkCount}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
}
