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
| Auth | `POST` | `/api/auth/forgot-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/login` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/send-code` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/verify` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/register/complete` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/reset-password` | otp-auth | public | `tests/api/auth/auth.api.spec.ts` | partial |
| MVC auth | `POST` | `/auth/logout` | background-trigger | authenticated | `tests/api/auth/auth.api.spec.ts` | partial |

## Admin

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/admin/building/list/page` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `GET` | `/admin/building/search/page` | readonly | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `POST` | `/admin/building/add` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `PUT` | `/admin/building/edit` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `DELETE` | `/admin/building/delete/{id}` | mutation | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building | `POST` | `/admin/building/upload-image` | upload | admin | `tests/api/admin/admin-building.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Building additional info | `GET/POST/PUT/DELETE` | `/admin/building-additional-information/**` | mutation | admin | `tests/api/admin/building-additional-information.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `GET` | `/admin/customer/list/page` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `GET` | `/admin/customer/search/page` | readonly | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `POST` | `/admin/customer/add` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Customer | `DELETE` | `/admin/customer/delete/{id}` | mutation | admin | `tests/api/admin/admin-customer.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `GET` | `/admin/contract/list/page` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `GET` | `/admin/contract/search/page` | readonly | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `POST` | `/admin/contract/add` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `PUT` | `/admin/contract/edit` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `DELETE` | `/admin/contract/delete/{id}` | mutation | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Contract | `PUT` | `/admin/contract/status` | background-trigger | admin | `tests/api/admin/admin-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `GET` | `/admin/invoice/list/page` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `GET` | `/admin/invoice/search/page` | readonly | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `POST` | `/admin/invoice/add` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `PUT` | `/admin/invoice/edit` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `DELETE` | `/admin/invoice/delete/{id}` | mutation | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `POST` | `/admin/invoice/confirm/{id}` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Invoice | `PUT` | `/admin/invoice/status` | background-trigger | admin | `tests/api/admin/admin-invoice.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/admin/profile/username` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/admin/profile/email` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/admin/profile/phoneNumber` | otp-auth | admin | `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `PUT` | `/admin/profile/password` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Profile | `POST` | `/admin/profile/otp/{purpose}` | otp-auth | admin | `tests/api/admin/admin-profile.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `GET` | `/admin/sale-contract/list/page` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `GET` | `/admin/sale-contract/search/page` | readonly | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `DELETE` | `/admin/sale-contract/delete/{id}` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `POST` | `/admin/sale-contract/add` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Sale contract | `PUT` | `/admin/sale-contract/edit` | mutation | admin | `tests/api/admin/admin-sale-contract.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/list/page` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/search/page` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `POST` | `/admin/staff/add` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `DELETE` | `/admin/staff/delete/{id}` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/{id}/assignments/customers` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `PUT` | `/admin/staff/{id}/assignments/customers` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `GET` | `/admin/staff/{id}/assignments/buildings` | readonly | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Staff | `PUT` | `/admin/staff/{id}/assignments/buildings` | mutation | admin | `tests/api/admin/admin-staff.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | partial |
| Property request | `GET` | `/api/admin/property-request/list/page` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/admin/property-request/{id}` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `PUT` | `/api/admin/property-request/reject/{id}` | mutation | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `PUT` | `/api/admin/property-request/approve/{id}` | mutation | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/admin/property-request/{id}/contract-data` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/admin/property-request/{id}/sale-contract-data` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/admin/property-request/pending-count` | readonly | admin | `tests/api/admin/admin-property-request.api.spec.ts`, `tests/api/admin/security.api.spec.ts` | defect-driven |

## Staff

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/staff/building/search` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Contract | `GET` | `/staff/contracts/search` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Customer | `GET` | `/staff/customers/search` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Sale contract | `GET` | `/staff/sale-contracts/search` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts` | defect-driven |
| Invoice | `GET` | `/staff/invoices/search` | readonly | staff | `tests/api/staff/staff-readonly.api.spec.ts`, `tests/api/staff/staff-invoice.api.spec.ts` | defect-driven |
| Invoice | `POST` | `/staff/invoices/add` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Invoice | `PUT` | `/staff/invoices/edit` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Invoice | `DELETE` | `/staff/invoices/delete/{id}` | mutation | staff | `tests/api/staff/staff-invoice.api.spec.ts` | covered |
| Profile | `PUT` | `/staff/profile/username` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/staff/profile/email` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/staff/profile/phoneNumber` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/staff/profile/password` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |
| Profile | `POST` | `/staff/profile/otp/{purpose}` | otp-auth | staff | `tests/api/staff/staff-profile.api.spec.ts` | partial |

## Customer

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Building | `GET` | `/customer/building/search` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Contract | `GET` | `/customer/contract/search` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Transaction | `GET` | `/customer/transaction/list/page` | readonly | customer | `tests/api/customer/customer-readonly.api.spec.ts` | defect-driven |
| Profile | `PUT` | `/customer/profile/username` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/customer/profile/email` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/customer/profile/phoneNumber` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `PUT` | `/customer/profile/password` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Profile | `POST` | `/customer/profile/otp/{purpose}` | otp-auth | customer | `tests/api/customer/customer-profile.api.spec.ts` | partial |
| Property request | `POST` | `/api/customer/property-request/submit` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `GET` | `/api/customer/property-request/list` | readonly | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |
| Property request | `DELETE` | `/api/customer/property-request/cancel/{id}` | mutation | customer | `tests/api/customer/customer-property-request.api.spec.ts` | defect-driven |

## Payment

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| QR payment | `GET` | `/payment/qr/{invoiceId}` | readonly | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |
| QR confirm | `GET` | `/payment/qr/confirm/{invoiceId}` | background-trigger | customer | `tests/api/payment/payment.api.spec.ts` | defect-driven |

## Public Page

| Module | Method | Path | Kind | Expected role | Test file | Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Public building search | `GET` | `/moonnest/building/search` | readonly | public | `tests/api/publicpage/public.api.spec.ts` | partial |

## Notes

- `staff-readonly` and `customer-readonly` were migrated to the real REST API paths under `com.estate.api`. Old page/controller paths are no longer the source of truth.
- `property-request` coverage was added for both customer and admin APIs, but the current backend behavior redirects or otherwise prevents the customer submit flow from persisting data, so these routes are marked `defect-driven`.
- Customer and staff readonly REST routes now point to the correct API controllers; current auth-status mismatches (`302` instead of `401`/`403`) are intentionally exposed as backend defects.
- Broad status assertions still exist in some older admin/profile/auth/public specs. Those modules remain marked `partial` until they are fully migrated to exact contract assertions.
