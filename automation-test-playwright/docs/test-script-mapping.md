# Mapping test script va test case

Moi test trong framework duoc giu theo mau:
- `TEST-ID Test Name`

Vi du:
- `UI-001 Login Page Rendering`
- `API-005 Admin Building List and Search APIs`
- `FUN-003 Admin Building Management Lifecycle`
- `E2E-006 Staff Daily Work Journey`
- `REG-003 Admin Core CRUD Stability`

Dieu nay giup de truy vet:
- tu test case trong bang kiem thu
- sang file automation
- sang report Playwright

## Quy uoc tag cho API roadmap

- `@api`: danh dau test thuoc API suite.
- `@smoke`: hop nhanh, uu tien `auth`, `public`, `security matrix`, `readonly` mau.
- `@regression`: happy path, negative path, business rule chinh.
- `@extended`: upload, boundary sau, trigger batch, defect-driven, conflict hiem.

## Quy uoc chia module API

- `tests/api/auth`: auth REST va MVC auth support flow.
- `tests/api/publicpage`: public browsing contract.
- `tests/api/admin`: admin theo module con `building`, `customer`, `staff`, `contract`, `invoice`, `sale-contract`, `property-request`, `profile`, `security`.
- `tests/api/staff`: readonly, invoice CRUD, profile.
- `tests/api/customer`: readonly, property-request, profile.
- `tests/api/payment`: QR payment va confirm flow.
