# API Coverage Matrix

Source of truth: `moonNest-main/src/main/java/com/estate/api`

Coverage status meanings:

- `covered`: route has an active spec with direct contract assertions.
- `partial`: route is exercised, but not every required scenario is covered yet.
- `missing`: no direct spec yet.
- `defect-driven`: spec is intentionally strict and may fail when backend status semantics are wrong.

## Auth

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `POST` | `/api/v1/auth/forgot-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/login` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/send-code` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/verify` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/complete` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/reset-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/logout` | background-trigger | authenticated | `tests/api/auth/auth.api.spec.ts` | partial |

## Admin

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/api/v1/admin/buildings` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `GET` | `/api/v1/admin/buildings` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `POST` | `/api/v1/admin/buildings` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `PUT` | `/api/v1/admin/buildings/{id}` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `DELETE` | `/api/v1/admin/buildings/{id}` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `POST` | `/api/v1/admin/buildings/image` | upload | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building additional info | `GET/POST/PUT/DELETE` | `/api/v1/admin/building-additional-information/**` | mutation | admin | `tests/api/admin/building-additional-information.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `GET` | `/api/v1/admin/customers` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `GET` | `/api/v1/admin/customers` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `POST` | `/api/v1/admin/customers` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `DELETE` | `/api/v1/admin/customers/{id}` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `GET` | `/api/v1/admin/contracts` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `GET` | `/api/v1/admin/contracts` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `POST` | `/api/v1/admin/contracts` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `PUT` | `/api/v1/admin/contracts/{id}` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `DELETE` | `/api/v1/admin/contracts/{id}` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `PUT` | `/api/v1/admin/contracts/status` | background-trigger | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `GET` | `/api/v1/admin/invoices` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `GET` | `/api/v1/admin/invoices` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `POST` | `/api/v1/admin/invoices` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `PUT` | `/api/v1/admin/invoices/{id}` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `DELETE` | `/api/v1/admin/invoices/{id}` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `POST` | `/api/v1/admin/invoices/{id}/confirm` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `PUT` | `/api/v1/admin/invoices/status` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/admin/profile/username` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/admin/profile/email` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/admin/profile/phone-number` | otp-auth | admin | `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/admin/profile/password` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `POST` | `/api/v1/admin/profile/otp/{purpose}` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `GET` | `/api/v1/admin/sale-contracts` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `GET` | `/api/v1/admin/sale-contracts` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `DELETE` | `/api/v1/admin/sale-contracts/{id}` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `POST` | `/api/v1/admin/sale-contracts` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `PUT` | `/api/v1/admin/sale-contracts/{id}` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `POST` | `/api/v1/admin/staff` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `DELETE` | `/api/v1/admin/staff/{id}` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff/{id}/assignments/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `PUT` | `/api/v1/admin/staff/{id}/assignments/customers` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/api/v1/admin/staff/{id}/assignments/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `PUT` | `/api/v1/admin/staff/{id}/assignments/buildings` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
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
| Profile | `PUT` | `/api/v1/staff/profile/username` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/staff/profile/email` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/staff/profile/phone-number` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/staff/profile/password` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `POST` | `/api/v1/staff/profile/otp/{purpose}` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |

## Customer

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/api/v1/customer/buildings` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Contract | `GET` | `/api/v1/customer/contracts` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Transaction | `GET` | `/api/v1/customer/transactions` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Profile | `PUT` | `/api/v1/customer/profile/username` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/customer/profile/email` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/customer/profile/phone-number` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/api/v1/customer/profile/password` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `POST` | `/api/v1/customer/profile/otp/{purpose}` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Property request | `POST` | `/api/v1/customer/property-requests` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/v1/customer/property-requests` | readonly | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `DELETE` | `/api/v1/customer/property-requests/{id}` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |

## Payment

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| QR payment | `GET` | `/api/v1/payment/qr/{invoiceId}` | readonly | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |
| QR confirm | `GET` | `/api/v1/payment/qr/confirm/{invoiceId}` | background-trigger | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |

## Public Page

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Public building search | `GET` | `/api/v1/public/buildings` | readonly | public | `tests/api/publicpage/public.api.spec.ts` | partial |

## Notes

- `staff-readonly` and `customer-readonly` were migrated to the real REST API paths under `com.estate.api`. Old page/controller paths are no longer the source of truth.
- `property-request` coverage was added for both customer and admin APIs, but the current backend behavior redirects or otherwise prevents the customer submit flow from persisting data, so these routes are marked `defect-driven`.
- Customer and staff readonly REST routes now point to the correct API controllers; current auth-status mismatches (`302` instead of `401`/`403`) are intentionally exposed as backend defects.
- Broad status assertions still exist in some older admin/profile/auth/public specs. Those modules remain marked `partial` until they are fully migrated to exact contract assertions.


