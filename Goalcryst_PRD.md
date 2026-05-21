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
* Customer 360 view
* disposition entry
* Follow-up / Promise to Pay tracking
* Waiver request workflow
* User management
* Role-based and granular permission management
* Field-level access control
* Basic dashboards and reports
* Audit logs for important actions

### Out of Scope

* Multi-tenant SaaS setup
* Agent-wise contract assignment
* Visible contract list for agents
* In-CRM calling/dialer
* Call recording
* Payment gateway integration
* Razorpay integration
* Direct payment collection inside CRM
* Automatic payment reconciliation

---

## 3. Business Goals

* Centralize recovery customer and contract data
* Make it easy for agents to search customers and update dispositions
* Improve waiver request handling and approval visibility
* Give managers visibility into recovery activity and team performance
* Support monthly or one-time Excel allocation imports
* Prevent accidental overwriting of existing contract records
* Enforce role-based and field-level access control
* Maintain audit history for imports, updates, waiver requests, and user actions

---

## 4. User Roles

### Admin (Global Access)

* Manage users
* Manage roles and permissions
* Upload Excel files
* View all reports
* Configure statuses and dispositions
* View audit logs

### Branch Manager (Branch Operations)

* Full operations control at the branch level
* View regional reports and dashboards
* Review and approve waiver requests
* View all team activity

### Assistant Manager (Operations)

* Search and view customer records
* View operational reports and dashboards
* Review and approve waiver requests
* View agent activity
* Export reports (if permitted)

### Team Leader (Team Management)

* Search and view customer records
* View team reports and dashboards
* Review and approve waiver requests
* Monitor direct report agent activity

### Agent (Dedicated Recovery)

* Search customer by phone number or contract number
* View permitted Customer 360 fields
* Add disposition
* Add notes
* Add follow-up date
* Raise waiver request
* Export reports (if permitted)

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

Agents should not see a full contract/customer list.

Agents should only search using:

* Customer phone number
* Contract number

After search, the system should open the Customer 360 view if the user has permission.

---

## 5.3 Customer 360 View

Customer 360 is the main working screen for agents and managers.

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

Since calls are made outside the CRM, agents only need to manually update the customer disposition after speaking or attempting to speak with the customer.

The disposition module should use two dropdowns:

1. Main Disposition
2. Sub Disposition

### Main Disposition Values

* Contactable
* Non Contactable

### Sub Disposition Values

* Call Back
* Promise to Pay
* Refuse to Pay
* Wrong Number
* Out of Station
* Intentional Issue
* Financial Issue
* Legal Issue
* Dispute
* Call Disconnect
* Customer Expired
* Broken PTP
* Customer Claims Paid
* Part Paid

### Disposition Fields

* Contract number
* Customer name
* Date/time
* Main disposition
* Sub disposition
* Remarks/notes
* Follow-up date, if applicable
* Promise to Pay date, if applicable
* Promise amount, if applicable
* Part paid amount, if applicable
* Created by agent

### Suggested Disposition Logic

Some sub dispositions should trigger additional fields:

| Sub Disposition      | Extra Fields Needed                |
| -------------------- | ---------------------------------- |
| Call Back            | Follow-up date/time                |
| Promise to Pay       | PTP date, PTP amount               |
| Broken PTP           | Previous PTP reference, remarks    |
| Part Paid            | Paid amount, payment date, remarks |
| Customer Claims Paid | Claimed paid amount/date, remarks  |
| Dispute              | Dispute reason, remarks            |
| Legal Issue          | Legal remarks                      |

### Important Business Rules

* Agent must select both Main Disposition and Sub Disposition.
* Every disposition entry should be stored as history.
* Latest disposition should be visible in Customer 360.
* Previous disposition history should not be deleted.
* Reports should be generated based on main and sub dispositions.

---

## 5.5 Waiver Request Module

Agents should be able to raise waiver requests when customers ask for discount/settlement relief.

### Waiver Request Fields

* Contract number
* Customer name
* Total outstanding amount
* Requested waiver amount
* Customer payable amount
* Reason for waiver
* Agent remarks
* Status: Pending / Approved / Rejected
* Requested by
* Approved/rejected by
* Supervisor remarks
* Created date
* Updated date

### Waiver Workflow

Agent raises waiver request → Supervisor (Team Leader, AM, BM, or Admin) reviews → Approve or Reject → Status updated in CRM

---

## 5.6 User & Permission Management

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
* Can export reports
* Can manage users
* Can view audit logs

---

## 5.7 Reports & Analytics

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
* Agent-wise disposition count
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

## 5.8 Audit Logs

The system should maintain audit logs for important actions.

### Audit Events

* User login
* Excel upload
* Customer record viewed
* Disposition added
* Waiver request created
* Waiver approved/rejected
* User created/updated
* Permission changed
* Report exported

---

## 6. Key Business Rules

* Contract number is the primary unique identifier
* Existing contract data should not be overwritten during import
* Duplicate contracts should be skipped or sent to review
* Agents should not see the full contract list
* Agents can only access records through search
* Agents can only see fields allowed by permissions
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

* Is there one-level approval or multi-level approval for waivers?
* What exact Excel columns are mandatory?
* Should agents see full phone numbers or masked numbers?
* Should reports be exportable to Excel/PDF?
* Should Customer 360 show legal details to agents or only managers?
* What are the final call disposition values?
* Should follow-up reminders be shown inside dashboard?
