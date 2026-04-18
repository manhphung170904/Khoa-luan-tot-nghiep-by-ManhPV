# Mapping test script va test case

Moi test trong framework duoc giu theo mau:
- `TEST-ID Test Name`

Vi du:
- `API-AUTH-REST-ADMIN login/me/logout works with cookie session`
- `API-CUS-PRQ-003 submits and lists a RENT property request`
- `[E2E-ADM-BLD-001] admin can filter buildings and open detail from search results`
- `[E2E-CUS-PAY-003] customer confirms QR payment and invoice becomes paid`

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
- `tests/api/public`: public browsing contract.
- `tests/api/admin`: admin theo module con `building`, `customer`, `staff`, `contract`, `invoice`, `sale-contract`, `property-request`, `profile`, `security`.
- `tests/api/staff`: readonly, invoice CRUD, profile.
- `tests/api/customer`: readonly, property-request, profile.
- `tests/api/payment`: QR payment va confirm flow.
