# MoonNest Business Flow Audit Matrix

Audit basis:
- UI expectation is the primary source of truth.
- Static review only: templates/JS, `controller/**`, `api/v1/**`, `service/**`, `service/impl/**`, and current Playwright docs/spec inventory.
- Route and coverage references were collected from the current repository state on 2026-04-16.

## 1. Auth and Session

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-LOGIN | `/login` | Submit username/email + password | Successful login lands on role home/dashboard; failure shows readable error on login page | `POST /login`, `/login-success` | `AuthController`, JWT + refresh cookie issuance | Public | username/email, password, access cookie, refresh cookie, redirect target |
| AUTH-REGISTER | `/register` -> `/register/verify` -> `/register/complete` | Send code, verify OTP, complete profile | Customer account is created and logged in | `/auth/register/send-code`, `/auth/register/verify`, `/auth/register/complete` | `RegistrationService`, `CustomUserDetailsService` | Public | email, otp, full name, username, password, setup token |
| AUTH-OAUTH-LINK | Authenticated page -> Google link | Link current account with Google | Safe redirect back to requested page after OAuth flow | `/auth/link/google`, `/oauth2/**` | OAuth link cookies and return target handling | Authenticated | user type/id cookie, returnTo |
| AUTH-RESET | `/forgot-password` -> `/auth/reset-password` | Request OTP and reset password | Reset returns to login with success message | `/auth/forgot-password`, `/auth/reset-password` | `AuthService` | Public | email, otp, new password |
| AUTH-LOGOUT | Header logout button | End session and clear cookies | User returns to login and cannot see prior protected content | `/auth/logout`, `/logout` | refresh revoke + cookie clearing + context clear | Authenticated | refresh cookie, auth cookies, session |

## 2. Public and Lead Intake

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PUB-LIST | `/moonnest` | View/search/filter buildings | Public can browse inventory without auth | `/api/v1/public/buildings`, `/api/v1/public/buildings/page`, `/api/v1/public/buildings/filters` | `BuildingService.searchByCustomer`, `DistrictService` | Public | district, ward, street, direction, level, page, size |
| PUB-LEAD-TO-AUTH | Public landing | Decide to login/register from public context | Navigation to auth pages without losing browsing context | `/login`, `/register` | Page controller + header/footer navigation | Public | current page context, CTA links |

## 3. Customer Self-Service

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CUS-HOME | `/customer/home` | Load dashboard | Show contract summary, total paid amount, unpaid invoice summary, payment CTA | `/api/v1/customer/dashboard` | `ContractService`, `InvoiceService`, `CustomerService` | Customer | contract count, total payment, unpaid count, first invoice detail |
| CUS-BUILDINGS | `/customer/building/list` | Browse buildings and submit request | Customer sees buildings and can create request from valid property | `/api/v1/customer/buildings`, `/api/v1/customer/property-requests` | `BuildingService`, `PropertyRequestService` | Customer | building filters, request type, desired dates/area/price |
| CUS-CONTRACTS | `/customer/contract/list` | View contracts | Only own contracts and metadata are visible | `/api/v1/customer/contracts`, `/api/v1/customer/contracts/metadata` | `ContractService` | Customer | buildingId, status |
| CUS-INVOICES | `/customer/invoice/list` | View unpaid invoices and pay | List all pending invoices; payment CTA opens QR flow | MVC model + `/api/v1/payment/qr/{invoiceId}` | `InvoiceService.getDetailInvoices`, QR payment controller | Customer | invoice id, due date, total amount |
| CUS-TRANSACTIONS | `/customer/transaction/history` | View paid transaction history | Show paid invoices/transactions only; no duplicate payment action | `/api/v1/customer/transactions` | `InvoiceService.getInvoices(..., status=PAID)` | Customer | page, size, month, year |
| CUS-PROFILE | `/customer/profile` | Update username/email/phone/password with OTP | Profile changes are gated by OTP and reflect on next load | `/api/v1/customer/profile/**` | profile service + OTP | Customer | otp purpose, changed value |
| CUS-PROP-REQ | `/customer/property-request/list` | View/cancel own property requests | Requests are listed by status; only pending items can be canceled | `/api/v1/customer/property-requests`, `DELETE /{id}` | `PropertyRequestService.submit/getRequestsByCustomer/cancel` | Customer | request id, status |
| CUS-PAYMENT | Home/invoice/history entry points | Redirect to QR, confirm payment | All entry points reach the same payment flow and result state | `/api/v1/payment/qr/{invoiceId}`, `/api/v1/payment/qr/confirm/{invoiceId}` | `PaymentV1API`, `InvoiceService.markPaid` | Customer | invoice ownership, amount, transaction code |

## 4. Staff Operations

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| STF-DASH | `/staff/dashboard` | View assigned work summary | Staff sees only assigned operational data | `/api/v1/staff/dashboard` | staff dashboard service | Staff | assigned totals |
| STF-READONLY | `/staff/buildings`, `/staff/contracts`, `/staff/customers`, `/staff/sale-contracts` | Filter and inspect data | Read scope is limited to assigned domain | `/api/v1/staff/**` readonly endpoints | `BuildingService`, `ContractService`, `CustomerService`, `SaleContractService` | Staff | filters, ownership scope |
| STF-INVOICE | `/staff/invoices` | Create/edit/delete invoice | Staff can mutate invoices only inside assigned contracts/customers | `/api/v1/staff/invoices` | `InvoiceService.save/delete` | Staff | invoice form, contractId, customerId, month, year |
| STF-PROFILE | `/staff/profile` | Update profile + OTP | Same OTP-protected pattern as customer/admin | `/api/v1/staff/profile/**` | profile service + OTP | Staff | otp purpose, changed value |

## 5. Admin Master Data and Coordination

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ADM-BUILDING | `/admin/building/**` | CRUD building + upload image + additional info | Building lifecycle is consistent and referenced data stays valid | `/api/v1/admin/buildings`, `/api/v1/admin/building-additional-information/**` | `BuildingService`, `BuildingDetailService` | Admin | form fields, image, suppliers, legal authorities, maps |
| ADM-CUSTOMER | `/admin/customer/**` | CRUD customer | Admin manages customer records and linked assignments safely | `/api/v1/admin/customers` | `CustomerService` | Admin | profile/base data |
| ADM-CONTRACT | `/admin/contract/**` | CRUD contract | Rental contracts align with building/customer/request lifecycle | `/api/v1/admin/contracts` | `ContractService` | Admin | contract form, status |
| ADM-SALE-CONTRACT | `/admin/sale-contract/**` | CRUD sale contract | Sale contracts align with request/building sale lifecycle | `/api/v1/admin/sale-contracts` | `SaleContractService` | Admin | sale contract form |
| ADM-INVOICE | `/admin/invoice/**` | CRUD invoice + confirm + bulk status update | Invoice status and details remain consistent across roles | `/api/v1/admin/invoices` | `InvoiceService` | Admin | invoice form, confirm id |
| ADM-STAFF | `/admin/staff/**` | CRUD staff + assignment | Staff assignment controls downstream access scope | `/api/v1/admin/staff/**` | `StaffService` | Admin | staff form, building/customer assignments |
| ADM-PROP-REQ | `/admin/property-request/**` | Review, reject, approve request; pull contract/sale-contract defaults | Admin can process pending requests and link them to the correct downstream document | `/api/v1/admin/property-requests/**` | `PropertyRequestService.reject/markApproved/toContractForm/toSaleContractForm` | Admin | request id, rejection reason, contractId, saleContractId |
| ADM-REPORT | `/admin/report` | View report/dashboard | Aggregates reflect current contract/invoice/property data | `/api/v1/admin/dashboard`, report MVC page | `ReportService` | Admin | summary metrics |

## 6. Cross-Role Data Lifecycle

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LIFE-PROP-REQ | Customer request -> Admin review | Submit then approve/reject | Final request status and linked contract/sale-contract are visible to both sides | customer + admin property-request endpoints | `PropertyRequestService` | Customer/Admin | request status, processedBy, linked doc ids |
| LIFE-INVOICE | Admin/Staff create invoice -> Customer sees/pay | Invoice appears to customer and later moves to paid history | invoice APIs + customer readonly + payment | `InvoiceService` + QR payment controller | Admin/Staff/Customer | invoice status, utility details, customer visibility |
| LIFE-ASSIGNMENT | Admin assigns staff -> Staff works data | Staff readonly/mutation surface changes immediately | admin staff assignment + staff endpoints | `StaffService`, downstream search services | Admin/Staff | assignment ids |

## 7. Authorization and Route Semantics

| Flow ID | Entry UI | User action | Expected UI result | Backend/API path | Service/domain rule | Access condition | Important I/O |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-PAGE | Direct protected page navigation | Anonymous user opens protected page | Browser redirects cleanly to login | `/admin/**`, `/staff/**`, `/customer/**` | `SecurityConfig` page branch | Anonymous | URI |
| SEC-API | Unauthorized async/API call | Frontend receives JSON 401/403 for API semantics | `/api/v1/**` | `SecurityConfig.isApiRequest`, `ApiErrorResponses` | Role-specific | Accept/XHR headers, URI |
| SEC-MIXED | Legacy non-v1 AJAX call or mixed route | UI behavior remains deterministic and not half-redirect/half-JSON | mixed page/API paths | `SecurityConfig` heuristic branch | Role-specific | URI + headers |
