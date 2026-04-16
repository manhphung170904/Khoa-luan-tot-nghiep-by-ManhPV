# MoonNest Recommendations After Static Business Audit

## 1. Normalize business ownership rules in services
- Every staff write path should receive authenticated staff context explicitly.
- Every admin processing path should use an actor model that matches admin routes, not a staff-only assumption.
- Do not rely on role-only Spring Security for business ownership.

## 2. Make lifecycle invariants first-class
- Property request should have explicit transition rules:
  - only `PENDING` can move to `APPROVED`, `REJECTED`, `CANCELLED`
  - `APPROVED` must link to exactly one valid downstream document
  - downstream document type must match request type
- Invoice payment should have explicit confirmation rules and should not be finalized by bare browser navigation.

## 3. Align customer-facing pages around one source of truth
- Home, invoice list, and transaction history should represent different invoice states clearly:
  - home: summary or next-action invoice
  - invoice list: unpaid/payable invoices
  - transaction history: paid history only
- Remove action reuse across pages when underlying record state is different.

## 4. Continue converging business AJAX onto `/api/v1/**`
- New async business behavior should use `/api/v1/**` exclusively.
- Keep MVC controllers as page shells and redirect orchestration only.
- Where legacy/mixed AJAX remains, document its auth/error semantics until it is migrated.

## 5. Treat encoding defects as a product issue, not cosmetic debt
- Mojibake on auth/payment/customer flows directly damages trust and can invalidate error comprehension.
- Fix text encoding in controllers, API messages, inline HTML responses, and customer templates as part of the business hardening wave, not as an optional cleanup.
