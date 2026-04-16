# MoonNest Test Gap Map

Baseline source:
- `automation-test-playwright/docs/api-coverage-matrix.md`
- `automation-test-playwright/docs/regression-suite.md`
- current template/controller/API inventory

## Coverage Summary by Audit Cluster

| Cluster | Current baseline | Main gap |
| --- | --- | --- |
| Auth and session | Partial API coverage for login/register/reset/logout | Missing end-to-end UI flow assertions for redirect/messages/cookie lifecycle |
| Public and lead intake | Partial public building API coverage | Missing UI-level lead-to-auth journey and public filtering UX validation |
| Customer self-service | Customer readonly/profile/property-request/payment APIs exist, many marked defect-driven | Missing cross-page consistency tests and UI behavior tests |
| Staff operations | Readonly + invoice/profile APIs covered partly/defect-driven | Missing ownership/assignment mutation tests |
| Admin master-data | Broad admin API coverage exists but many tests are partial | Missing end-to-end admin coordination flows, especially property request processing |
| Cross-role lifecycle | Not directly covered as a single flow | Missing multi-role lifecycle tests from request -> contract/invoice -> customer view |
| Authorization and route semantics | Some security API specs exist | Missing systematic redirect-vs-JSON and page/API consistency tests |

## Recommended New Test Packs

### 1. Auth UI Journey Pack
- Login success by role: customer -> `/customer/home`, staff -> `/staff/dashboard`, admin -> `/admin/dashboard`
- Login failures show readable Vietnamese messages
- Register flow: send OTP -> verify -> complete -> auto-login
- Forgot/reset password full path
- Logout clears session/cookies and blocks back-navigation to protected content

### 2. Public to Customer Conversion Pack
- Public page search/filter happy path
- Public user can navigate to login/register from building browsing
- Protected actions are not reachable from public-only state

### 3. Customer Payment Consistency Pack
- Payment from home, invoice list, and transaction history are consistent entry points
- Paid history has no payment CTA
- Invoice list only shows payment CTA for pending invoices
- QR page open does not mutate invoice state
- Valid confirmation changes customer-visible state

### 4. Property Request Lifecycle Pack
- Customer creates RENT request successfully
- Customer creates BUY request successfully
- Duplicate pending request is blocked
- Customer can cancel only own pending request
- Admin can load pending list/detail
- Admin reject path persists result
- Admin approve RENT -> contract path
- Admin approve BUY -> sale-contract path
- Customer sees updated request status after admin action

### 5. Staff Ownership Pack
- Staff can list only assigned data
- Staff can create/edit/delete invoice only for assigned scope
- Out-of-scope mutation is blocked
- Admin-created invoice visibility to customer remains correct after staff operations

### 6. Admin Coordination Pack
- Property request approval feeds valid contract/sale-contract defaults
- Invoice confirm/status update changes downstream customer view
- Staff assignment changes readonly scope predictably

### 7. Encoding / UX Consistency Pack
- Key pages render readable Vietnamese labels/messages:
  - login
  - register/reset
  - customer property request list
  - customer transaction history
  - QR payment page
- Key API success messages return readable UTF-8 text

## Priority Order

### Highest priority
- Property request lifecycle
- Customer payment consistency
- Staff ownership
- Auth UI journey

### Medium priority
- Admin coordination
- Authorization and route semantics

### Lower priority
- Encoding/UX consistency smoke tests after main blockers are fixed
