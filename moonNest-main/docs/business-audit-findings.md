# MoonNest Business Audit Findings

Severity scale:
- `critical`: directly breaks business flow or allows incorrect state transition.
- `high`: strong mismatch with UI expectation or access rules.
- `medium`: visible inconsistency or missing guard that can become a defect quickly.
- `low`: cleanup/consistency issue.

## Wave 1 Candidate Findings

### FINDING PROP-001
- Flow: `ADM-PROP-REQ`, `LIFE-PROP-REQ`
- Roles affected: admin, customer
- Expected behavior: admin can approve/reject customer property requests from the admin review flow.
- Current behavior: admin APIs pass `user.getUserId()` into `PropertyRequestService.reject/markApproved`, but the service resolves that id through `StaffRepository`.
- Mismatch point: API + service
- Severity: `critical`
- Evidence:
  - `src/main/java/com/estate/api/v1/admin/AdminPropertyRequestV1API.java`
  - `src/main/java/com/estate/service/impl/PropertyRequestServiceImpl.java`
- Root-cause direction: the processing actor model is inconsistent; route is admin-only, service expects a staff entity.
- Patch type: `backend`
- Regression tests needed:
  - admin approve pending request succeeds
  - admin reject pending request succeeds
  - processedBy/actor is persisted consistently

### FINDING PROP-002
- Flow: `ADM-PROP-REQ`, `LIFE-PROP-REQ`
- Roles affected: admin, customer
- Expected behavior: only pending requests can be approved, and approval must link to the correct downstream document type.
- Current behavior: `markApproved` does not validate current status, does not require exactly one valid downstream link, and does not verify contract-vs-sale-contract matches `requestType`.
- Mismatch point: service
- Severity: `high`
- Evidence:
  - `src/main/java/com/estate/service/impl/PropertyRequestServiceImpl.java`
- Root-cause direction: missing lifecycle invariants in approval path.
- Patch type: `backend`
- Regression tests needed:
  - cannot approve non-pending request
  - RENT request cannot attach sale contract
  - BUY request cannot attach rental contract
  - approve must persist a valid linked document for the chosen request type

### FINDING INV-001
- Flow: `STF-INVOICE`, `LIFE-INVOICE`
- Roles affected: staff, customer, admin
- Expected behavior: staff can mutate invoices only for contracts/customers/buildings assigned to them.
- Current behavior: staff mutation endpoints call `InvoiceService.save/delete` without passing staff context; service methods also do not enforce staff ownership.
- Mismatch point: API + service
- Severity: `critical`
- Evidence:
  - `src/main/java/com/estate/api/v1/staff/StaffInvoiceV1API.java`
  - `src/main/java/com/estate/service/impl/InvoiceServiceImpl.java`
- Root-cause direction: authorization is role-based only, not ownership-based.
- Patch type: `backend`
- Regression tests needed:
  - assigned staff can create/edit/delete invoice in-scope
  - out-of-scope staff cannot mutate another staff/admin invoice
  - customer-visible invoices remain unchanged after rejected out-of-scope attempt

### FINDING PAY-001
- Flow: `CUS-PAYMENT`, `LIFE-INVOICE`
- Roles affected: customer, admin, staff
- Expected behavior: invoice payment status changes only after a verifiable payment success event.
- Current behavior: `GET /api/v1/payment/qr/confirm/{invoiceId}` directly marks invoice as paid and generates a synthetic transaction code without bank/provider verification.
- Mismatch point: API + service interaction
- Severity: `critical`
- Evidence:
  - `src/main/java/com/estate/api/v1/payment/PaymentV1API.java`
- Root-cause direction: browser navigation is being used as a payment confirmation mechanism.
- Patch type: `backend` now, later `UI + backend` when callback/status contract is designed
- Regression tests needed:
  - opening QR page must not change invoice state
  - confirm route must not mark paid without an allowed verification condition
  - paid invoice appears in customer history only after valid confirmation

### FINDING CUS-001
- Flow: `CUS-HOME`, `CUS-INVOICES`, `LIFE-INVOICE`
- Roles affected: customer
- Expected behavior: home dashboard payment summary is consistent with invoice list and unpaid invoice count.
- Current behavior: customer dashboard returns `totalUnpaidInvoices`, but the detailed payload uses only `InvoiceService.getDetailInvoice`, which returns a single first pending invoice.
- Mismatch point: API + service + dashboard UI model
- Severity: `high`
- Evidence:
  - `src/main/java/com/estate/api/v1/customer/CustomerDashboardV1API.java`
  - `src/main/java/com/estate/service/impl/InvoiceServiceImpl.java`
  - `src/main/resources/static/js/customer-home-api.js`
- Root-cause direction: dashboard contract mixes a count of many unpaid invoices with details of one invoice.
- Patch type: `UI + backend`
- Regression tests needed:
  - multiple pending invoices produce consistent dashboard summary
  - home CTA does not misrepresent the payable set

### FINDING CUS-002
- Flow: `CUS-TRANSACTIONS`, `CUS-PAYMENT`
- Roles affected: customer
- Expected behavior: transaction history is for already-paid invoices and must not offer a payment CTA.
- Current behavior: history data comes from `InvoiceService.getInvoices(..., "PAID")`, but the transaction history modal still renders `Xác Nhận Thanh Toán` and calls `payInvoice(invoiceId)`.
- Mismatch point: page/template + UI flow
- Severity: `high`
- Evidence:
  - `src/main/java/com/estate/api/v1/customer/CustomerReadonlyV1API.java`
  - `src/main/resources/templates/customer/transaction-history.html`
- Root-cause direction: history page reuses unpaid-invoice modal actions on paid records.
- Patch type: `UI`
- Regression tests needed:
  - paid transaction history has no payment CTA
  - invoice list retains payment CTA only for unpaid invoices

## Wave 2 Candidate Findings

### FINDING PROP-003
- Flow: `ADM-PROP-REQ`
- Roles affected: admin
- Expected behavior: prefilled contract/sale-contract data is available only when the request is in the correct status and type.
- Current behavior: `/contract-data` and `/sale-contract-data` derive forms directly from the request without validating request status or request type.
- Mismatch point: API + service
- Severity: `medium`
- Evidence:
  - `src/main/java/com/estate/api/v1/admin/AdminPropertyRequestV1API.java`
  - `src/main/java/com/estate/service/impl/PropertyRequestServiceImpl.java`
- Root-cause direction: auto-fill helpers are not bound to lifecycle guardrails.
- Patch type: `backend`
- Regression tests needed:
  - cannot fetch contract-data for BUY request
  - cannot fetch sale-contract-data for RENT request
  - cannot fetch form data for canceled/rejected/completed requests

### FINDING INV-002
- Flow: `ADM-INVOICE`, `STF-INVOICE`, `LIFE-INVOICE`
- Roles affected: admin, staff
- Expected behavior: invoice delete is a single coherent transaction.
- Current behavior: `InvoiceService.delete` calls `invoiceRepository.deleteById(id)` twice and deletes the utility meter after the first delete.
- Mismatch point: service
- Severity: `medium`
- Evidence:
  - `src/main/java/com/estate/service/impl/InvoiceServiceImpl.java`
- Root-cause direction: duplicate delete call and brittle order of side effects.
- Patch type: `backend`
- Regression tests needed:
  - invoice delete removes invoice and linked utility meter once
  - repeated delete is handled cleanly

### FINDING SEC-001
- Flow: `SEC-MIXED`
- Roles affected: admin, staff, customer
- Expected behavior: UI async flows receive deterministic auth failure semantics.
- Current behavior: security classifies all `/api/v1/**` as API, but non-v1 or mixed UI AJAX flows rely on header heuristics; this leaves mixed semantics across page-oriented and JSON-oriented paths.
- Mismatch point: security + route strategy
- Severity: `medium`
- Evidence:
  - `src/main/java/com/estate/config/SecurityConfig.java`
  - `docs/api-first-migration-plan.md`
- Root-cause direction: route policy is only partially normalized around `/api/v1/**`.
- Patch type: `backend + UI` over time
- Regression tests needed:
  - legacy AJAX path auth behavior is explicit
  - UI does not silently break on redirect-vs-JSON mismatch

## Wave 3 Candidate Findings

### FINDING UI-001
- Flow: `AUTH-*`, `CUS-PAYMENT`, `CUS-PROP-REQ`, `CUS-TRANSACTIONS`
- Roles affected: public, customer, admin/staff in shared messages
- Expected behavior: Vietnamese text is readable and consistent across page, popup, and API messages.
- Current behavior: multiple controllers/templates/inline HTML responses still contain mojibake text.
- Mismatch point: page/template + controller message strings
- Severity: `medium`
- Evidence:
  - `src/main/java/com/estate/controller/auth/AuthController.java`
  - `src/main/java/com/estate/config/SecurityConfig.java`
  - `src/main/java/com/estate/api/v1/payment/PaymentV1API.java`
  - `src/main/resources/templates/customer/property-request-list.html`
  - `src/main/resources/templates/customer/transaction-history.html`
- Root-cause direction: file/message encoding corruption across both Java and HTML sources.
- Patch type: `UI + backend`
- Regression tests needed:
  - page render smoke checks for key Vietnamese labels/messages
  - popup/message assertions in customer and auth flows

### FINDING AUTH-001
- Flow: `AUTH-LOGOUT`
- Roles affected: authenticated users
- Expected behavior: logout is an intentional state-changing action from a protected POST flow.
- Current behavior: logout is exposed both as `GET /logout` and `POST /auth/logout`.
- Mismatch point: controller + route semantics
- Severity: `medium`
- Evidence:
  - `src/main/java/com/estate/controller/auth/AuthController.java`
- Root-cause direction: unsafe duplicate route shape for a state-changing action.
- Patch type: `backend + UI`
- Regression tests needed:
  - logout uses POST-only UI flow
  - direct GET logout route is either removed or hardened intentionally

### FINDING MSG-001
- Flow: `ADM-INVOICE`, `STF-INVOICE`, `CUS-PROP-REQ`
- Roles affected: admin, staff, customer
- Expected behavior: API success/error messages are readable and consistent with UI language.
- Current behavior: multiple `ApiMessageResponse` values still return mojibake strings.
- Mismatch point: API response text
- Severity: `low`
- Evidence:
  - `src/main/java/com/estate/api/v1/admin/AdminInvoiceV1API.java`
  - `src/main/java/com/estate/api/v1/staff/StaffInvoiceV1API.java`
  - `src/main/java/com/estate/api/v1/customer/CustomerPropertyRequestV1API.java`
- Root-cause direction: encoded literals in response bodies.
- Patch type: `backend`
- Regression tests needed:
  - exact success message assertions for key write APIs
