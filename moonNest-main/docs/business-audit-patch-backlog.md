# MoonNest Patch Backlog

## Wave 1: Business Blockers

### W1-01 Property request actor model
- Expected behavior: admin review actions approve/reject requests successfully.
- Root cause: admin property-request API passes admin user id into service methods that require a staff entity.
- Fix direction:
  - define who the processing actor should be for admin review
  - update `PropertyRequestService.reject/markApproved` and caller contract accordingly
  - persist a role-safe actor reference or separate admin/staff processor fields
- Areas to change:
  - `api/v1/admin/AdminPropertyRequestV1API`
  - `service/impl/PropertyRequestServiceImpl`
  - possibly request entity/DTO if actor semantics need to be explicit
- Tests to add:
  - admin approve/reject happy path
  - processedBy display on admin and customer views

### W1-02 Property request approval invariants
- Expected behavior: approval only from `PENDING`, and the approved downstream document matches request type.
- Root cause: approval path lacks state/type validation.
- Fix direction:
  - reject non-pending approvals
  - require exactly one linked document id
  - enforce RENT -> contract, BUY -> sale contract
- Areas to change:
  - `service/impl/PropertyRequestServiceImpl`
  - admin property-request DTO validation if needed
- Tests to add:
  - invalid status/type combinations
  - approve with wrong downstream ids fails cleanly

### W1-03 Staff invoice ownership enforcement
- Expected behavior: staff can mutate only invoices in their assignment scope.
- Root cause: staff invoice write endpoints are role-protected but not ownership-scoped.
- Fix direction:
  - pass authenticated staff id into write operations
  - validate invoice/contract/customer scope in service layer
  - reuse the same scope rules as staff readonly search
- Areas to change:
  - `api/v1/staff/StaffInvoiceV1API`
  - `service/InvoiceService` and `service/impl/InvoiceServiceImpl`
- Tests to add:
  - in-scope mutation succeeds
  - out-of-scope mutation returns forbidden/business failure

### W1-04 Payment confirmation semantics
- Expected behavior: payment state is not changed by a bare browser GET without verification.
- Root cause: QR confirm route is a state-changing GET and uses demo-only local confirmation.
- Fix direction:
  - separate demo mode from real mode explicitly
  - stop using plain GET navigation as final business confirmation
  - require a bounded confirmation rule before `markPaid`
- Areas to change:
  - `api/v1/payment/PaymentV1API`
  - invoice status transition rules in `InvoiceService`
- Tests to add:
  - opening QR page does not mutate status
  - invalid confirmation does not mark paid
  - valid confirmation updates customer history

### W1-05 Customer history payment CTA removal
- Expected behavior: transaction history is read-only for already-paid invoices.
- Root cause: transaction-history modal still exposes payment action on `PAID` records.
- Fix direction:
  - remove payment CTA from paid history
  - if a detail action is needed, replace with close/view-only action
- Areas to change:
  - `templates/customer/transaction-history.html`
- Tests to add:
  - paid history page has no pay action
  - invoice list still has pay action for pending invoices only

## Wave 2: Data Lifecycle and Cross-Role Consistency

### W2-01 Customer home unpaid invoice model
- Expected behavior: home dashboard reflects the same unpaid set as invoice list.
- Root cause: dashboard combines `totalUnpaidInvoices` with a single `detailInvoice`.
- Fix direction:
  - either make UI explicitly “next unpaid invoice”
  - or change API to provide a list/summary aligned with the count
- Areas to change:
  - `api/v1/customer/CustomerDashboardV1API`
  - `service/impl/InvoiceServiceImpl`
  - `static/js/customer-home-api.js`
- Tests to add:
  - multiple unpaid invoices on dashboard
  - consistency between home and invoice list

### W2-02 Property request form-data guards
- Expected behavior: prefill endpoints only serve valid follow-up actions.
- Root cause: `toContractForm` and `toSaleContractForm` ignore request status/type.
- Fix direction:
  - gate auto-fill helpers by request type and status
  - fail explicitly when follow-up action is invalid
- Areas to change:
  - `service/impl/PropertyRequestServiceImpl`
  - `api/v1/admin/AdminPropertyRequestV1API`
- Tests to add:
  - invalid form-data fetch cases

### W2-03 Invoice delete transaction cleanup
- Expected behavior: invoice deletion is single-pass and predictable.
- Root cause: duplicated delete call in service.
- Fix direction:
  - remove second delete
  - keep linked cleanup order explicit
- Areas to change:
  - `service/impl/InvoiceServiceImpl`
- Tests to add:
  - invoice + utility meter delete integrity

## Wave 3: UI and Consistency Cleanup

### W3-01 Encoding cleanup
- Expected behavior: all user-facing Vietnamese strings are readable.
- Root cause: mojibake exists across Java literals, templates, and inline HTML responses.
- Fix direction:
  - normalize file encoding to UTF-8
  - replace corrupted literals in auth, customer, payment, and key API messages
- Areas to change:
  - auth controller/security messages
  - customer templates and popups
  - payment HTML response
  - API success/failure messages
- Tests to add:
  - exact string assertions on critical pages and APIs

### W3-02 Logout route hardening
- Expected behavior: logout uses one intentional flow.
- Root cause: GET and POST variants coexist for the same side effect.
- Fix direction:
  - keep one canonical logout route
  - ensure UI submits only that route
- Areas to change:
  - `controller/auth/AuthController`
  - shared header/layout logout UI if needed
- Tests to add:
  - logout route semantics

### W3-03 Mixed route semantics alignment
- Expected behavior: page and API failures are predictable and consistent.
- Root cause: partial normalization around `/api/v1/**`, with remaining mixed route semantics.
- Fix direction:
  - make new business writes/read AJAX use `/api/v1/**` only
  - document or deprecate mixed non-v1 AJAX paths
- Areas to change:
  - security contract docs
  - any remaining mixed UI AJAX paths
- Tests to add:
  - auth failure behavior on mixed routes
