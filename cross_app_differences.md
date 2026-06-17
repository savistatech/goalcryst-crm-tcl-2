# Goalcryst CRM: Cross-Application Differences Guide (TMF vs. TCL)

This document provides a comparison of the data schemas, import configurations, and Customer 360 view pages between the **TMF** and **TCL** CRM systems.

---

## 1. Domain and Deployment Specifications

| Spec Component | Goalcryst CRM - TMF | Goalcryst CRM - TCL |
| :--- | :--- | :--- |
| **Target Portfolio** | Tata Motor Finance (Vehicle Loans) | Tata Capital Loans (Business/Personal) |
| **Frontend Domain** | `https://tmf.goalcryst.co.in` | `https://crm.goalcryst.co.in` |
| **Backend API URL** | `https://tmf-api.goalcryst.co.in` | `https://api.goalcryst.co.in` |
| **Host Docker Port** | `3001` | `3000` |
| **Docker Network** | `supabase-tmf_default` | `supabase_default` |
| **Internal DNS URL** | `http://supabase-tmf-kong:8000` | `http://supabase-kong:8000` |

---

## 2. Core Functional & UI Differences

### A. TMF: Vehicle Asset Focus
*   **Customer 360 View**: Features an **Asset Information** card displaying registration number, vehicle material type, engine number, chassis number, and product disposition.
*   **Key Contract Metrics**: Pivots around the **DPD Band** (expressed as a string range, e.g., `"0-30"`, `"90+"`) and **Product Group**.

### B. TCL: Legal & Recovery Focus
*   **Customer 360 View**: Features detailed **Legal & Litigation** cards covering:
    *   *Arbitration & Sec 17 Orders* (Advocate details, Award Date, Claim Amount).
    *   *Execution Petitions (EP)* (Case numbers, case stages, next/last date of hearing (NDOH/LDOH)).
    *   *LRN/PRN links* to legal PDF repositories.
*   **Key Contract Metrics**: Pivots around exact **BOM DPD** (expressed as an integer count, e.g., `45` days) and **Product**.

---

## 3. Database Schema & Mapped Fields

### A. Contracts Table Schema
The query fields used in server-side actions (`contractActions.ts` and `searchActions.ts`) differ as follows:

*   **TMF Schema Columns**:
    ```sql
    band TEXT;              -- DPD Band range string
    product_group TEXT;     -- Loan category grouping
    ```
*   **TCL Schema Columns**:
    ```sql
    bom_dpd INT;            -- Bill of Month Days Past Due
    product TEXT;           -- Specific loan product type
    ```

### B. Contacts Table Columns
*   **TMF Contacts**: Uses standard structured contact columns (`borrower_mobile`, `borrower_phone_1`, `borrower_phone_2`, `co_borrower_mobile`, etc.).
*   **TCL Contacts**: Uses a broader, legacy flat phone structure (`mobile_1`, `mobile_no`, `primary_mobile`, `primary_mobile_1`, `primary_mobile_2`, `mobile_no_2`, `latest_contact_no`, `ref_mobile_1`, etc.).

---

## 4. Excel Import Mappings

*   **TMF Imports**: Excel column mappings look for and parse header aliases matching `band` and `product_group` to write to the respective vehicle contract columns.
*   **TCL Imports**: Excel column mappings parse `bom_dpd` (coerced to integers) and `product` to align with loan portfolio definitions.
