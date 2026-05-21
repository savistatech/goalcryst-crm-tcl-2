GoalCryst CRM — Implementation Plan
Tech Stack
Layer	Choice
Framework	Next.js 14 (App Router, TypeScript)
Database	Supabase (PostgreSQL)
Auth	Supabase Auth (email + password)
UI	shadcn/ui + Tailwind CSS
Excel parsing	xlsx (SheetJS)
Excel export	exceljs
PDF export	@react-pdf/renderer
File storage	Supabase Storage (uploaded Excel files)
Hosting	Self-hosted VPS (Docker + Nginx)
Database Schema (12 tables)
Core Data Tables


contracts              → Contract No (PK), Customer Name, Product, Branch, State, 
                         Area, Region, DPD, Bucket, MOB, imported_at, batch_id
contract_contacts      → All 8 phone numbers + 11 addresses + 2 reference names
contract_assets        → Manufacturer, Model, RC No, Engine No, Chassis No, etc.
contract_financials    → Finance Amount, POS, OD, EMI, Outstanding, OTS, Waivers
contract_legal         → All 44 legal fields (Sec138, Case No, Court, EP, LRN, etc.)
Operations Tables


import_batches         → Filename, uploaded_by, total/imported/duplicate/failed counts
import_errors          → Row number, raw_data, error_reason per batch
dispositions           → main_disposition, sub_disposition, PTP date/amount, remarks
waiver_requests        → Outstanding, waiver amount, status, agent/manager remarks
System Tables


profiles               → Extends auth.users (full_name, role, is_active)
user_permissions       → permission_key per user (granular, beyond role defaults)
audit_logs             → user_id, action, entity_type, entity_id, metadata (JSONB)
Permission Keys (15 permissions)

can_upload_excel         can_search_customer      can_view_contact_numbers
can_view_financial_data  can_view_legal_data      can_view_asset_data
can_add_disposition      can_raise_waiver         can_approve_waiver
can_view_reports         can_export_reports       can_manage_users
can_manage_roles         can_view_audit_logs      can_view_all_dispositions
Disposition Structure (from your file)
Main	Sub Disposition	Extra Fields
Contactable	Call Back	Follow-up date
Contactable	Promise to Pay	PTP date + amount
Contactable	Agree to Pay	Date + amount
Contactable	Part Paid	Date + amount
Contactable	Broken PTP, Refuse to Pay, Wrong Number, Out of Station, Financial Issue, Legal Issue, Dispute, Call Disconnect, Customer Expired, Customer Claims Paid	Remarks
Non-Contactable	Ringing No Response, Switched Off, Not Reachable, Number Does Not Exist	—
Application Pages & Routes

/login                          → Auth
/dashboard                      → Metrics + today's follow-ups + pending waivers
/search                         → Agent search (phone or contract no)
/customers/[contractId]         → Customer 360 (tabbed: Details / Dispositions / Waivers)
/customers/[contractId]/disposition/new   → Add disposition
/customers/[contractId]/waiver/new        → Raise waiver request
/waiver-requests                → List + filter (pending/approved/rejected)
/waiver-requests/[id]           → Review + approve/reject
/imports                        → Upload + batch history
/imports/[batchId]              → Import summary + error details
/reports                        → All 14 report types + export
/users                          → User management
/users/[id]                     → Edit user + permissions
/audit-logs                     → Audit trail with filters
Excel Import Logic
Admin uploads .xlsx → stored in Supabase Storage
Server parses rows → maps columns to DB fields
For each row: check if contract_no exists → skip if duplicate, log error
Atomic insert per batch with import summary
Summary shows: total / imported / duplicates skipped / failed + error reasons
Customer 360 — Sections & Access Control
Section	Default Role Access
Customer + Allocation	All roles
Contact Numbers	can_view_contact_numbers
Financial Exposure	can_view_financial_data
Vehicle & Asset	can_view_asset_data
Legal & Case Status	All roles (per your answer)
Disposition History	All roles
Waiver History	All roles
Build Phases
Phase 1 — Foundation (Days 1–3)

Next.js project setup + Supabase project
Auth (login, session, middleware route guard)
DB schema migrations
User management + role/permission system
Sidebar layout + navigation
Phase 2 — Import & Search (Days 4–6)

Excel upload + parsing + duplicate detection
Import batch summary page
Customer search (phone + contract no)
Customer 360 view with all 5 sections + permission gates
Phase 3 — Core Operations (Days 7–9)

Disposition form (dynamic fields based on sub-disposition)
Disposition history timeline
Waiver request form + review workflow
Follow-up tracking
Phase 4 — Reports, Dashboard, Audit (Days 10–12)

Dashboard with metrics + follow-up reminders
All 14 report types with filters
Excel + PDF export
Audit log viewer
Key Technical Notes
No full contract list for agents — search endpoint only, no /customers list page
Server Actions for all mutations (no REST API needed)
Supabase RLS as a safety layer; permission checks at application layer for field visibility
Import as background job — large files streamed in chunks, progress shown via polling
Audit logging — middleware-level for page views, action-level for mutations