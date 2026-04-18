# API Coverage Matrix

Source of truth: `moonNest-main/src/main/java/com/estate/api`

Coverage status meanings:

- `covered`: route has an active spec with direct contract assertions.
- `partial`: route is exercised, but not every required scenario is covered yet.
- `missing`: no direct spec yet.
- `defect-driven`: spec is intentionally strict and may fail when backend status semantics are wrong.

## Execution tiers by module

| Group | Priority | Smoke baseline | Core regression focus | Extended focus |
| --- | --- | --- | --- | --- |
| Auth | P0 | REST login, `me`, logout | forgot-password, register/reset support flow | OTP/session edge case |
| Public | P0 | building search | filter, pagination, response shape | invalid enum and boundary |
| Admin | P1 | security matrix, critical readonly | CRUD + validation + DB verify | upload, trigger batch, defect-driven |
| Staff | P1 | readonly contract | invoice lifecycle, profile update | scope boundary, unsupported write |
| Customer | P1 | readonly contract | property-request, profile update | duplicate/conflict, defect-driven |
| Payment | P2 | QR render | access control, confirm flow | ownership and edge state |

## Auth

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `POST` | `/api/v1/auth/login` | otp-auth | public | `tests/api/auth/auth-session.api.spec.ts` | covered |
| Auth | `GET` | `/api/v1/auth/me` | readonly | authenticated | `tests/api/auth/auth-session.api.spec.ts` | covered |
| Auth | `POST` | `/api/v1/auth/logout` | background-trigger | authenticated | `tests/api/auth/auth-session.api.spec.ts` | covered |
| Auth | `POST` | `/api/v1/auth/forgot-password` | otp-auth | public | `tests/api/auth/auth-session.api.spec.ts` | covered |
| MVC auth | `POST` | `/login` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | covered |
| MVC auth | `POST` | `/auth/forgot-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | defect-driven |
| MVC auth | `POST` | `/auth/register/send-code` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | covered |
| MVC auth | `POST` | `/auth/register/verify` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | covered |
| MVC auth | `POST` | `/auth/register/complete` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | covered |
| MVC auth | `POST` | `/auth/reset-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | covered |
| MVC auth | `POST` | `/auth/logout` | background-trigger | authenticated | `tests/api/auth/auth.api.spec.ts` | covered |

## Admin

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/api/v1/admin/buildings` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Building | `GET` | `/api/v1/admin/buildings/metadata` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Building | `POST` | `/api/v1/admin/buildings` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Building | `PUT` | `/api/v1/admin/buildings/{id}` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Building | `DELETE` | `/api/v1/admin/buildings/{id}` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Building | `POST` | `/api/v1/admin/buildings/image` | upload | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Building additional info | `GET/POST/PUT/DELETE` | `/api/v1/admin/building-additional-information/**` | mutation | admin | `tests/api/admin/building-additional-information.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Building additional info | `POST` | `/api/v1/admin/building-additional-information/planning-maps/image` | upload | admin | `tests/api/admin/building-additional-information.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Customer | `GET` | `/api/v1/admin/customers` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Customer | `GET` | `/api/v1/admin/customers` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Customer | `POST` | `/api/v1/admin/customers` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Customer | `DELETE` | `/api/v1/admin/customers/{id}` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Contract | `GET` | `/api/v1/admin/contracts` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Contract | `GET` | `/api/v1/admin/contracts/metadata` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Contract | `POST` | `/api/v1/admin/contracts` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Contract | `PUT` | `/api/v1/admin/contracts/{id}` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Contract | `DELETE` | `/api/v1/admin/contracts/{id}` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Contract | `PUT` | `/api/v1/admin/contracts/status` | background-trigger | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `GET` | `/api/v1/admin/invoices` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `GET` | `/api/v1/admin/invoices` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `POST` | `/api/v1/admin/invoices` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `PUT` | `/api/v1/admin/invoices/{id}` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `DELETE` | `/api/v1/admin/invoices/{id}` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `POST` | `/api/v1/admin/invoices/{id}/confirm` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Invoice | `PUT` | `/api/v1/admin/invoices/status` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/admin/profile/username` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/admin/profile/email` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/admin/profile/phone-number` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/admin/profile/password` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Profile | `POST` | `/api/v1/admin/profile/otp/{purpose}` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Sale contract | `GET` | `/api/v1/admin/sale-contracts` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Sale contract | `GET` | `/api/v1/admin/sale-contracts` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Sale contract | `DELETE` | `/api/v1/admin/sale-contracts/{id}` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Sale contract | `POST` | `/api/v1/admin/sale-contracts` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Sale contract | `PUT` | `/api/v1/admin/sale-contracts/{id}` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `POST` | `/api/v1/admin/staff` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `DELETE` | `/api/v1/admin/staff/{id}` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff/{id}/assignments/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `PUT` | `/api/v1/admin/staff/{id}/assignments/customers` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `GET` | `/api/v1/admin/staff/{id}/assignments/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `PUT` | `/api/v1/admin/staff/{id}/assignments/buildings` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Staff | `POST` | `/api/v1/admin/staff/{id}/quick-assign` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | covered |
| Property request | `GET` | `/api/v1/admin/property-requests` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/admin/property-requests/{id}` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `POST` | `/api/v1/admin/property-requests/{id}/reject` | mutation | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `POST` | `/api/v1/admin/property-requests/{id}/approve` | mutation | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/admin/property-requests/{id}/contract-data` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/admin/property-requests/{id}/sale-contract-data` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/admin/property-requests/pending-count` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |

## Staff

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/api/v1/staff/buildings` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Contract | `GET` | `/api/v1/staff/contracts` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Customer | `GET` | `/api/v1/staff/customers` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Sale contract | `GET` | `/api/v1/staff/sale-contracts` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Invoice | `GET` | `/api/v1/staff/invoices` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts`, `tests/api/staff/staff-invoice.api.spec.ts` | defect-driven |
| Invoice | `POST` | `/api/v1/staff/invoices` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Invoice | `PUT` | `/api/v1/staff/invoices/{id}` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Invoice | `DELETE` | `/api/v1/staff/invoices/{id}` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/staff/profile/username` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/staff/profile/email` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/staff/profile/phone-number` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/staff/profile/password` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | covered |
| Profile | `POST` | `/api/v1/staff/profile/otp/{purpose}` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | covered |

## Customer

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/api/v1/customer/buildings` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Contract | `GET` | `/api/v1/customer/contracts` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Transaction | `GET` | `/api/v1/customer/transactions` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Profile | `PUT` | `/api/v1/customer/profile/username` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/customer/profile/email` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/customer/profile/phone-number` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | covered |
| Profile | `PUT` | `/api/v1/customer/profile/password` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | covered |
| Profile | `POST` | `/api/v1/customer/profile/otp/{purpose}` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | covered |
| Property request | `POST` | `/api/v1/customer/property-requests` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/customer/property-requests` | readonly | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `DELETE` | `/api/v1/customer/property-requests/{id}` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |

## Payment

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| QR payment | `GET` | `/payment-demo/qr/{invoiceId}` | readonly | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |
| QR confirm | `GET/POST` | `/payment-demo/qr/confirm/{invoiceId}` | background-trigger | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |

## Public Page

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Public building search | `GET` | `/api/v1/public/buildings` | readonly | public | `tests/api/public/public.api.spec.ts` | partial |

## Notes

- `staff-readonly` and `customer-readonly` were migrated to the real REST API paths under `com.estate.api`. Old page/controller paths are no longer the source of truth.
- `property-request` coverage was added for both customer and admin APIs, but the current backend behavior redirects or otherwise prevents the customer submit flow from persisting data, so these routes are marked `defect-driven`.
- Customer and staff readonly REST routes now point to the correct API controllers; current auth-status mismatches (`302` instead of `401`/`403`) are intentionally exposed as backend defects.
- Payment contract uses `/payment-demo/**` because that is the actual backend controller mapping.
- `POST /api/v1/auth/forgot-password` now has direct contract + DB assertions, and the main MVC auth web-flow routes now also have direct redirect/session coverage.
- `POST /auth/forgot-password` is intentionally `defect-driven` because the controller exists but security config does not currently mark that MVC route as public.
- Public building search now has tighter DTO assertions; it remains `partial` because invalid `propertyType` still triggers a backend `500` instead of a graceful empty result.
- Admin customer, staff, contract, and invoice core routes now have direct success/error/message assertions plus DB-side verification, so these modules have been promoted from `partial` where the route behavior is stable.
- Admin profile routes are now covered with direct success, anonymous, invalid OTP/current password, and duplicate identity assertions.
- Admin sale-contract routes now have direct list/filter shape assertions and not-found update coverage; delete remains defect-driven because missing-id handling is still not explicit in the service.
- Admin building core routes now have direct list/create/update/delete contract assertions; only delete-with-sale-contract and oversized upload remain defect-driven.
- Building additional information CRUD is now covered directly, while planning-map image upload is tracked separately as defect-driven because oversized files are still accepted at runtime.
- `building delete`, `customer delete`, and `building upload >5MB` now have defect-driven coverage because current backend/runtime behavior still diverges from the stricter business rule expected by the suite.


