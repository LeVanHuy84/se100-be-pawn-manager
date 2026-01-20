# 🏦 Comprehensive Backend Audit Report: Vietnamese Pawnshop (Dịch vụ Cầm đồ) Management System

## Executive Summary

This audit evaluates the **se100-be-pawn-manager** codebase against industry standards and Vietnamese legal requirements (Decree 96/2016/ND-CP and Civil Code 2015). While the system possesses a modern tech stack (NestJS, Prisma, PostgreSQL, Clerk, Cloudinary), critical gaps exist in regulatory compliance, auditability, and the completion of the collateral lifecycle.

---

---

## Phase 0: Base Structure & Module Linkage (Customer-Centric Model)

### 🧩 Architectural Finding
The current system revolves around **`Customer`** as the central entity, where each **`Loan`** represents an independent Contract. This view is **CORRECT** and optimal for management: a Customer can have multiple Loans (multiple contracts), and each Loan can have multiple Collaterals.

### 🔍 Solution for "Extension" (Gia hạn)
Instead of creating a complex parent `Contract` entity, we will handle the "Extension" business logic using a **Refinancing** model:
- **Current Issue:** Users try to "edit" the repayment schedule of the old Loan (causing logic errors).
- **Proposed Architecture:**
  1.  **Extension = New Loan:** When a customer wants to extend, the system should:
      *   Create a **New Loan** (StartDate = today).
      *   Use the disbursement amount of the New Loan to **Payoff** the Old Loan.
      *   Close the Old Loan (`Status = CLOSED`).
  2.  **Benefits:**
      *   Maintains the "1 Loan = 1 Contract" principle.
      *   Clear credit history (Loan A closed, Loan B active).
      *   Automatically calculates the latest interest/fees for the extension period.

---

## Phase 1: Feature Inventory - Complete Feature Tree

### 📊 Current Architecture Overview

| Module | Routes | Services | Status |
|--------|--------|----------|--------|
| **Loan** | `/v1/loans` | `LoanOrchestrator`, `LoanService` | ✅ Implemented |
| **Customer** | `/v1/customers` | `CustomerService` | ✅ Implemented |
| **Collateral** | `/v1/collateral-assets`, `/v1/liquidations` | `CollateralService` | ✅ Implemented |
| **Payment** | `/v1/payments` | `PaymentService` | ✅ Implemented |
| **Valuation** | `/v1/valuations` | `ValuationService`, `GeminiService` | ✅ Implemented |
| **Employee** | `/v1/employees` | `EmployeeService` (Clerk-based) | ✅ Implemented |
| **Repayment Schedule** | `/v1/repayment-schedules` | `RepaymentScheduleService`, `MarkOverdueProcessor` | ✅ Implemented |
| **Loan Simulations** | `/v1/loan-simulations` | `LoanSimulationsService` | ✅ Implemented |
| **Configurations** | `/v1/configurations` | `ConfigurationsService` | ✅ Implemented |
| **Contract** | `/v1/contracts` | `ContractService` | ⚠️ Stub Only |

---

### 🌳 Detailed Feature Tree by Category

#### 1. **Loan Management**
- **Loan Creation:** Creates pending loans with collateral association.
- **Loan Approval/Rejection:** Manager-only status transitions with notes.
- **Loan Status Machine:** `PENDING → ACTIVE/REJECTED → OVERDUE → CLOSED`.
- **Loan Listing with Filters:** Filter by status, customerId, pagination.
- **Loan Update (PENDING only):** Can modify terms before approval.
- **Repayment Schedule Generation:** Automatic schedule creation on loan creation.
- **Loan Simulation:** Preview of schedule before commitment.
- **Repayment Methods:** `EQUAL_INSTALLMENT`, `INTEREST_ONLY` supported.
- **Overdue Auto-Detection:** Daily cron job marks overdue & accrues penalty.
- **Penalty Calculation:** Pro-rata daily penalty on overdue principal.

#### 2. **Asset/Collateral Tracking**
- **Collateral CRUD:** Create, Read, Update with images (Cloudinary).
- **Collateral Types:** `MOTORBIKE`, `CAR`, `GOLD`, extensible via `CollateralType` table.
- **Collateral Status Lifecycle:** `PROPOSED → PLEDGED → STORED → RELEASED/LIQUIDATING → SOLD`.
- **Location Tracking:** Storage/Store assignment with location field.
- **Appraisal Values:** `appraisedValue`, `ltvRatio`, `appraisalNotes`.
- **AI Valuation:** Gemini-powered market price estimation.
- **Liquidation Initiation:** Can initiate liquidation for OVERDUE loans.
- **Liquidation Completion:** ❌ Logic Missing (See guidance below).
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **DTO Validation Block:** The logical enum `AssetStatus` (used in DTOs) is currently missing `LIQUIDATING` and `SOLD` values, causing `zod` validation to fail even though the Database supports it.
  > 2. **Missing Side-Effect (Loan Closure):** marking an item as `SOLD` must atomically trigger the associated Loan to move from `OVERDUE` -> `CLOSED` (Settling the debt). Do not rely on valid generic CRUD updates for this.

#### 3. **Customer (KYC)**
- **Customer CRUD:** Full lifecycle with validation.
- **National ID Storage:** ⚠️ Partial (Stored as string, no 12-digit CCCD validation).
- **ID Photo Storage:** ✅ Implemented (`images` JSON field).
- **Age Verification:** ✅ Implemented (Must be 18+).
- **Duplicate Detection:** ✅ Implemented (`nationalId`, `phone` uniqueness).
- **Customer Type:** ✅ Implemented (`REGULAR`, `VIP`).
- **Monthly Income Tracking:** ✅ Implemented (Required with 3M VND minimum).
- **KYC Document Separation:** ❌ Logic Missing (See guidance below).
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Compliance Risk:** Decree 96 inspections require efficient retrieval of Front vs Back ID cards. A "bag of images" (unlabeled array) makes this difficult and error-prone.
  > 2. **JSON Structure:** Change the `images` JSON content from a simple array to a tagged structure or enforce metadata.
  >    *   *Current:* `[{ "url": "..." }, { "url": "..." }]` (Ambiguous)
  >    *   *Required:* `[{ "type": "FRONT_ID", "url": "..." }, { "type": "BACK_ID", "url": "..." }]`

#### 4. **Financial Reporting**
- **Payment Recording:** Full allocation tracking with idempotency.
- **Payment Types:** `PERIODIC`, `EARLY`, `PAYOFF`, `ADJUSTMENT`.
- **Payment Methods:** `CASH`, `BANK_TRANSFER`.
- **Payment Allocation:** Waterfall: Interest → Fee → Penalty → Principal.
- **Loan Balance Tracking:** Real-time remaining balance calculation.
- **Revenue Reports / Analytics:** ❌ Logic Missing (See guidance below).
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Separation of Concerns:** `PaymentAllocation` tracks *operational* debt reduction (Principal/Interest paid). It is NOT suitable for *financial* reporting (Profit/Loss).
  > 2. **Recommended Architecture:** Create a dedicated **`RevenueLedger`** table.
  >    *   *Purpose:* Immutable record of all financial inflows/outflows (Interest received, Fees collected, Liquidation proceeds).
  >    *   *Benefit:* Rapid reporting queries (`SELECT SUM(amount)`) without joining complex loan schedules, and supports non-loan revenue (like Liquidation Sales).

---

## Phase 2: Gap Analysis - Vietnam Regulatory Compliance

### 🔴 Critical Vietnam-Specific Compliance Gaps

- **Gap (Soft Block):** The system lacks a **configurable warning system** for high-interest loans. 
- **Business Requirement:** We should not hard-code the 20% limit (as laws change). Instead, the system must **warn** the user if the combined rate exceeds the configured `LEGAL_INTEREST_CAP` (stored in `SystemParameter`), but allow them to proceed if they explicitly acknowledge the risk.
- **Service Gap (Interest-Only Extension):** The current `RepaymentSchedule` is static. There is no logic to handle **"Gia hạn" (Extension)**, a critical pawnshop feature where a customer pays *only* the interest due to "roll over" the principal for another month.
- **Priority:** **🔴 CRITICAL**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Configuration:** Add `LEGAL_INTEREST_CAP` (default: 20%) to `SystemParameter`.
  > 2. **Warning Flow:** If `totalRate > LEGAL_INTEREST_CAP`, the API should return a warning (e.g., 400 with `requiresConfirmation: true`). The frontend must then resend the request with `{ confirmUsuryRisk: true }` to bypass the check. This logs the user's conscious decision.
  > 3. **Extension Endpoint:** Implement `POST /loans/:id/extend`. This action should NOT mark the current Principal as paid. Instead, it should:
  >    *   Collect the Interest payment for the current period.
  >    *   **Shift** the Loan's `maturityDate` forward by 1 month.
  >    *   **Insert** a new `RepaymentScheduleDetail` row for the new month (carrying the same Principal).
  >    *   Current logic just marks the item as `PAID`, which incorrectly implies the Principal was settled if it was the last period.

#### 2. Interest Payment & Debt Reminders ("Nhắc nợ & Đóng lãi")
- **Operational Gap:** The system lacks automated reminders (SMS/Email) for upcoming interest payments (e.g., "3 days before due"), increasing the rate of accidental delinquency.
- **Service Gap:** No workflow for staff to view a "Call List" of approaching deadlines or record the outcome of a reminder call (e.g., "Customer promised to pay on Monday").
- **Priority:** **🔴 HIGH**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Integrated System:** Extend the `NotificationLog` table (proposed below) to support `INTEREST_REMINDER` type.
  > 2. **Schedule:**
  >    *   **Pre-Due:** Auto-SMS at -3 Days and Due Date.
  >    *   **Post-Due (Soft Dunning):** Human Call List at +3 Days Overdue.
  > 3. **Result Logging:** Staff must be able to log the "Promise to Pay" date, which temporarily snoozes the reminder ensuring "Good Faith" operation.

#### 3. Collateral Liquidation Lifecycle ("Thanh lý tài sản")**
- **Legal Gap (7-Day Notice):** Decree 96/2016 and Civil Code 2015 require a notification and waiting period (typically 7 days) before asset disposal. The current system moves instantly from Overdue to Liquidation without this workflow.
- **Service Gap (Communication Log):** There is no system to track mandatory "Pre-Liquidation Reminders" to the customer. We need to legally prove we tried to contact them.
- **Logic Gap:** `Collateral` table has `sellPrice` and `SOLD` status, but no Service method updates them.
- **Zombie Loan Risk:** The nightly cron job (`mark-overdue.processor.ts`) updates *installments* to OVERDUE but **fails to update the parent `Loan` status**. The Loan remains `ACTIVE` even if the debt is defaulted, blinding the shop manager.
- **Missing Schema:** No `LiquidationTransaction` table exists to store P/L (Profit/Loss) data separate from the loan ledger.
- **Priority:** **🔴 HIGH**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Schema:** Add a `NotificationLog` table (channels: SMS, CALL, EMAIL; status: SENT, FAILED, ANSWERED, NO_ANSWER).
  > 2. **Workflow:** 
  >    *   **Day 1 Overdue:** Cron job sends Auto-SMS + Logic triggers "Call List" for staff.
  >    *   **Staff Action:** Staff makes call -> logs result in system (e.g., "Cust promised to pay tomorrow" or "No pick up").
  >    *   **Day 7 Overdue:** If no payment + no contact -> System enables "Initiate Liquidation" button (Compliance Check).
  > 3. **Zombie Loan Fix:** Ensure the `Loan` status updates to `CLOSED` (or `LIQUIDATED`) once the asset is sold, preventing the "Active but Sold" state.

#### 4. Police Reporting (Decree 96/2016/ND-CP)**
- **Legal Gap (Suspicious Activity):** Decree 96/2016 mandates pawnshops to *detect and report* suspicious assets (e.g., stolen goods, fake plates) to the police.
- **System Gap:** The system accepts any item without checking against a "Blacklist" or "Watchlist" of stolen serial numbers/IMEIs.
- **Priority:** **🔴 HIGH**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Suspicious Flagging:** Add a `isSuspicious` boolean and `suspicionReason` text to the Collateral table.
  > 2. **Watchlist Logic:**
  >    *   **Input:** When staff enters a Serial Number / VIN / IMEI.
  >    *   **Check:** Query a local `Blacklist` table (mocking a Police Database).
  >    *   **Alert:** If match found, UI must show "🔴 POTENTIAL STOLEN PROPERTY" and force the staff to acknowledge before proceeding.
  > 3. **Report Generation:** Create a simple endpoint `GET /reports/police/suspicious-activity?date=...` to dump the day's flagged items.

#### 5. KYC & Vietnamese Identity (CCCD)**
- **Gap:** Schema allows 6-30 chars for `nationalId` but does not enforce the **12-digit CCCD** format or checksum.
- **Structure Gap:** Schema uses flexible `Json` for images, but application logic does not enforce separate **Front and Back ID** uploads.
- **Gap:** Missing ID issue date and expiry date fields (required for KYC).
- **Priority:** **🔴 HIGH**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **Compliance Risk:** Decree 96 inspections require efficient retrieval of Front vs Back ID cards. A "bag of images" (unlabeled array) makes this difficult and error-prone.
  > 2. **JSON Structure:** Change the `images` JSON content from a simple array to a tagged structure or enforce metadata.
  >    *   *Current:* `[{ "url": "..." }, { "url": "..." }]` (Ambiguous)
  >    *   *Required:* `[{ "type": "FRONT_ID", "url": "..." }, { "type": "BACK_ID", "url": "..." }]`

#### 6. Contract Generation ("Hợp đồng cầm đồ")**
- **Gap:** The `Contract` module is empty (commented out). There is no template engine to generate legally binding Vietnamese pawn contracts.
- **Data Gap:** The current `LoanMapper` returns nested JSON collateral objects. It lacks a **Flattening Logic** to convert technical data (Brand, Model, Serial) into the human-readable string format required for printed contracts (e.g., *"Xe máy Honda Vision, Biển số 59X-123.45"*).
- **Priority:** **🔴 HIGH**
  > **👨‍💻 Technical Guidance for Verification:**
  > 1. **The Problem:** Print templates (HTML/PDF) need simple variables like `{{COLLATERAL_DESCRIPTION}}`, but your API returns a deep JSON tree: `collaterals[0].collateralInfo.attributes.brand`.
  > 2. **Solution:** Implement a `ContractDataFacade` service.
  >    *   **Input:** Full Loan Entity (with deep nested relations).
  >    *   **Process:** "Flatten" the data. Detect the asset type (Motorbike vs Phone). Combine fields: `Brand + " " + Model + ", SN: " + Serial`.
  >    *   **Output:** A simple Key-Value dictionary: `{ "CUSTOMER_NAME": "Nguyen Van A", "ASSET_LINE": "iPhone 15 Pro Max, 256GB, Gold" }`.

---
 
## Phase 3: Physical & Manual Compliance Features (Decree 96 Support)

Since direct API integration with Police is not required, the system must support the **mandatory manual workflows**.

### 📋 1. The "Police Book" (Sổ Quản Lý) Support
- **Gap:** Staff currently have to manually copy data from the screen to the stamped Police Book.
- **Requirement:** A **"Daily Log View"** optimized for transcription.
  > **👨‍💻 Technical Guidance:**
  > Create a view `GET /admin/daily-log?date=YYYY-MM-DD` that displays strictly the columns required for the Police Book (Customer Name, CCCD, Address, Asset Desc/Serial, Date) in a dense, printable list format.

### 🏷️ 2. Asset Warehousing & Tagging
- **Gap:** Items in the warehouse must be tagged with the Contract Number for surprise inspections.
- **Requirement:** **"Asset Tag Print"** feature.
  > **👨‍💻 Technical Guidance:**
  > Add a button "Print Warehouse Tag" on the Collateral screen. Generates a small PDF/Label containing: `Contract #`, `Customer Name`, `Received Date`.

### 📄 3. Quarterly Reporting (Mẫu ĐK13)
- **Gap:** No automated generation of the quarterly summary report.
- **Requirement:** **"Export Mẫu ĐK13"**.
  > **👨‍💻 Technical Guidance:**
  > Implement an endpoint that aggregates loan volume, total value, and liquidation counts into the specific layout of Form ĐK13 for the manager to print and deliver to the ward police.

---

---

## 🛠️ Appendix: Detailed Implementation Guide (Technical Spec)

To address the "Developer doesn't know what to do" issue, here is the code-level guide for the **Overdue Tracking & Audit** feature.

### 1. Database Schema (`prisma/schema.prisma`)
Add an `AuditLog` table to store tracking history (System Penalties, Staff Updates).

```prisma
// Add to schema.prisma
model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  action       String   // e.g., "SYSTEM_PENALTY", "UPDATE_LOAN", "LIQUIDATION"
  entityId     String   // ID of affected entity (LoanID, RepaymentID)
  entityType   String   // "LOAN", "REPAYMENT_SCHEDULE"
  actorId      String?  // NULL if SYSTEM (Cronjob), UserID if Staff
  oldValue     Json?    // Data before change
  newValue     Json?    // Data after change
  description  String?  // "Applied penalty: 50,000 VND for 2 days overdue"
  createdAt    DateTime @default(now())
}
```

### 2. New API Endpoints (`repayment-schedule.controller.ts`)
Currently, this module lacks an endpoint to query overdue items for the staff "Call List".

| Endpoint | Method | Input | Output | Description |
|----------|--------|-------|--------|-------|
| `/v1/repayment-schedules/overdue` | `GET` | `?daysOverdue=3` | `List<RepaymentSchedule>` | Get list of items overdue > N days for Calls. |
| `/v1/audit-logs/penalties` | `GET` | `?loanId=...` | `List<AuditLog>` | View penalty history for a specific loan. |

### 3. Cron Job Logic (`mark-overdue.processor.ts`)
Modify the processor to **Log** instead of running silently.

*Required Logic Change:*
```typescript
// Inside loop: for (const item of candidates)
// ... after calculating penalty ...

await tx.repaymentScheduleDetail.update({ ... }); // Old code

// --> ADD THIS:
await tx.auditLog.create({
  data: {
    action: 'SYSTEM_PENALTY',
    entityId: item.id,
    entityType: 'REPAYMENT_SCHEDULE',
    actorId: 'SYSTEM',
    description: `Auto-applied penalty: ${penalty} VND (Overdue ${overdueDays} days)`,
    oldValue: { penaltyAmount: item.penaltyAmount },
    newValue: { penaltyAmount: item.penaltyAmount + penalty }
  }
});
```

---

---

---

## 🗺️ Roadmap: 3-Phase Action Plan

### **Phase 1: Critical Compliance & Core Logic**
- **Action:** Implement `POST /loans/:id/refinance` to handle "Extensions" correctly (New Contract -> Payoff Old Contract).
- **Action:** Add `LEGAL_INTEREST_CAP` entry to `SystemParameter` and block/warn on loan creation if exceeded.
- **Action:** Enforce strict KYC: separate `FRONT_ID` and `BACK_ID` uploads in the API DTO.
- **Action:** Patch security: Apply RBAC (`Role.MANAGER`) to Configuration and Payment endpoints.

### **Phase 2: Legal Operations & Physical Workflow**
- **Action:** Build **Liquidation Engine**: Logic to check 7-Day Notice -> Enable "Sell" button -> Close Loan upon Sale.
- **Action:** specific **Communication Log**: Create `NotificationLog` table and "Call List" API.
- **Action:** Develop **Police Book View**: standardized `GET /admin/daily-log` for manual transcription.
- **Action:** Implement **"Asset Tag Print"** button on the Collateral details screen.

### **Phase 3: Maturity & Reporting**
- **Action:** Implement `ContractDataFacade` and HTML template for "Hợp đồng cầm đồ" printing.
- **Action:** Build **Quarterly Report (ĐK13)** export endpoint.
- **Action:** Create **Revenue Dashboard** backed by a dedicated `RevenueLedger` table.

---
*Audit Version: 1.0 | Date: 2026-01-08*
