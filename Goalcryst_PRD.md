# GoalCryst CRM – Simple PRD

## 1. Product Summary

GoalCryst CRM is a finance recovery CRM for calling agencies/BPO teams that manage overdue customer/loan contract portfolios for banks, NBFCs, and financial institutions.

The system will help operations teams import customer allocation Excel files, search customer records, capture call dispositions, raise waiver requests, track follow-ups, manage users/permissions, and generate recovery reports.

This is a single-client internal CRM, not a multi-tenant SaaS product.

---

## 2. Confirmed Scope

### In Scope

* Bulk import customer/contract data from Excel/XLSX
* Duplicate contract detection during import
* Customer search by phone number or contract number
* Customer 360 view (pivoted on Principal POS)
* Dynamic Disposition entry and configuration
* Follow-up / Promise to Pay tracking (Kanban Board)
* Waiver request workflow (Routed by agent)
* User & Organization Hierarchy management (Org Chart)
* Role-based and granular permission management
* Field-level access control
* Role-scoped dashboards and reports (CSV & XLSX exports)
* Audit logs for important actions

### Out of Scope

* Multi-tenant SaaS setup
* Employee-wise contract assignment
* Visible contract list for employees
* In-CRM calling/dialer
* Call recording
* Payment gateway integration
* Razorpay integration
* Direct payment collection inside CRM
* Automatic payment reconciliation

---

## 3. Business Goals

* Centralize recovery customer and contract data
* Make it easy for employees to search customers and update dispositions
* Improve waiver request handling by prioritizing Principal POS recovery
* Give managers visibility into recovery activity strictly scoped by their organizational hierarchy
* Support monthly or one-time Excel allocation imports
* Prevent accidental overwriting of existing contract records
* Enforce role-based and field-level access control
* Maintain audit history for imports, updates, waiver requests, and user actions

---

## 4. User Roles

### Admin (Global Access)

* Manage users and organizational hierarchy (Reporting lines)
* Manage roles and permissions
* Upload Excel files
* Export all reports (CSV/XLSX)
* Configure dynamic dispositions and waiver reasons
* View audit logs

### Branch Manager (Branch Operations)

* Full operations control at the branch level
* View and export regional role-scoped reports (CSV/XLSX)
* Review and approve routed waiver requests
* View all subordinate team activity

### Assistant Manager (Operations)

* Search and view customer records
* View and export operational role-scoped reports (CSV/XLSX)
* Review and approve routed waiver requests
* View subordinate employee activity

### Team Leader (Team Management)

* Search and view customer records
* View and export team role-scoped reports (CSV/XLSX)
* Review and approve routed waiver requests
* Monitor direct report employee activity

### Employee (Dedicated Recovery)

* Search customer by phone number or contract number
* View permitted Customer 360 fields
* Add dynamic disposition
* Add notes
* Track follow-ups on PTP Kanban Board
* Raise and route waiver request
* Export personal role-scoped reports (CSV/XLSX)

---

## 5. Core Modules

## 5.1 Excel Import Module

The system should allow Admin/authorized users to upload XLSX files containing customer and contract data.

### Import Rules

* Import can be one-time or monthly
* Contract number should be treated as the unique identifier
* Existing contracts should not be overwritten
* Duplicate contracts should be skipped or flagged for review
* Import summary should be generated after upload

### Import Summary Should Show

* Total rows uploaded
* Successfully imported records
* Duplicate records skipped
* Failed records
* Error reason for failed rows

---

## 5.2 Customer Search Module

Employees should not see a full contract/customer list.

Employees should only search using:

* Customer phone number
* Contract number

After search, the system should open the Customer 360 view if the user has permission.

---

## 5.3 Customer 360 View

Customer 360 is the main working screen for employees and managers.

It should show all relevant information about the customer/contract in one place.

### Suggested Sections

* Customer details
* Contract/loan details
* Contact numbers
* Address details
* Outstanding/overdue details
* Legal details, if available
* Previous  dispositions
* Follow-up history
* Waiver request history
* Notes/history timeline

Field visibility should depend on user permissions.

---

## 5.4 Disposition Module

Since calls are made outside the CRM, employees only need to manually update the customer disposition after speaking or attempting to speak with the customer.

The disposition module uses a dynamic, admin-configured schema consisting of:

1. Main Disposition
2. Sub Disposition (with dynamic form fields)

### Admin Configuration

Admins can configure new dispositions and attach specific form schemas (e.g., requiring a Date and Amount field when "Promise to Pay" is selected). 

### Disposition Fields (Dynamic)

* Contract number
* Customer name
* Date/time
* Main disposition
* Sub disposition
* Remarks/notes
* *Dynamic Fields* (e.g., PTP Date, PTP Amount, Paid Amount) based on Admin setup
* Created by employee

### Important Business Rules

* Employee must select both Main Disposition and Sub Disposition.
* Required dynamic fields must be filled before submission.
* Every disposition entry should be stored as history.
* Latest disposition should be visible in Customer 360.
* Previous disposition history should not be deleted.
* Reports should be generated based on main and sub dispositions.

---

## 5.5 Waiver Request Module

Employees should be able to raise waiver requests when customers ask for discount/settlement relief. **Waiver percentages and tracking pivot primarily around the Principal POS, rather than Total Outstanding.**

### Waiver Request Fields

* Contract number
* Customer name
* Principal POS (Primary Metric)
* Total outstanding amount
* Requested waiver amount (Calculated against POS)
* Customer payable amount
* Reason for waiver (Admin configured)
* Employee remarks
* Status: Pending / Approved / Rejected
* Routed To (Specific Managers)
* Reviewed by
* Supervisor remarks
* Created/Updated dates

### Waiver Workflow

Employee raises waiver request and selects specific supervisor(s) to route it to → Supervisor reviews → Approve or Reject → Status updated in CRM.

---

## 5.6 Organization Hierarchy & PTP Kanban

### Organization Tree
* Visual hierarchy mapping (Admin → Branch Manager → Asst Manager → Team Leader → Employee).
* Self-referencing structure (`reporting_to`).
* Used to strictly scope data visibility for reporting and management views.

### PTP Kanban Board
* Visual board for tracking Promise to Pay (PTP) statuses.
* Columns: Due Today, Upcoming, Broken, Kept/Part Paid.
* Helps agents prioritize daily collection tasks based on Principal POS values.

---

## 5.7 User & Permission Management

The CRM should support role-based and granular permissions.

### Permission Examples

* Can upload Excel
* Can search customer
* Can view financial fields
* Can view contact numbers
* Can add disposition
* Can raise waiver request
* Can approve waiver request
* Can view reports
* Can export reports (CSV/XLSX)
* Can manage users
* Can view audit logs

---

## 5.8 Reports & Analytics

The system should provide simple operational reports.

### Reports Needed

* All disposition report
* PTP report
* Agree to Pay report
* Broken PTP report
* Part paid report
* Contactable report
* Non contactable report
* Total contracts imported
* Duplicate/failed import report
* Daily disposition report
* Employee-wise disposition count
* Follow-up due report
* Waiver request report
* Approved/rejected waiver report

### Dashboard Metrics (12-Card Grid)

* Total Contracts
* Active Contracts
* Active Users
* Upload Batches
* Total Dispositions
* Contactable
* Non-Contactable
* Promise to Pay (PTP)
* Agree to Pay
* Part Paid
* Broken PTP
* Pending Waiver Requests

---

## 5.9 Audit Logs

The system should maintain audit logs for important actions.

### Audit Events

* User login
* Excel upload
* Customer record viewed
* Disposition added
* Waiver request created
* Waiver approved/rejected
* User created/updated (including hierarchy changes)
* Permission changed
* Report exported

---

## 6. Key Business Rules

* Contract number is the primary unique identifier
* Existing contract data should not be overwritten during import
* Duplicate contracts should be skipped or sent to review
* Employees should not see the full contract list
* Employees can only access records through search
* Employees can only see fields allowed by permissions
* Calls happen outside CRM
* CRM only stores call outcome/disposition
* Payments are tracked manually, not collected through CRM
* Waiver approval should be permission controlled

---

## 7. MVP Scope

### MVP Version 1

* Login
* User management
* Role and permission setup
* Excel import
* Duplicate contract handling
* Customer search by phone/contract number
* Customer 360 view
* Add call disposition
* Add follow-up/PTP details
* Raise waiver request
* Approve/reject waiver request
* Basic dashboard
* Basic reports
* Audit logs

---

## 8. Future Enhancements

* Dialer integration
* WhatsApp integration
* Call recording integration
* Payment tracking automation
* AI call summary
* AI risk scoring
* Advanced analytics
* Mobile app
* Legal workflow automation

---

## 9. Open Questions

* What exact Excel columns are mandatory?
* Should employees see full phone numbers or masked numbers?
* Should Customer 360 show legal details to employees or only managers?
* Should follow-up reminders be shown inside dashboard?
