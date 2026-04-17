# API Roadmap Theo Nhom

Source of truth: `moonNest-main/src/main/java/com/estate/api`

## Muc tieu

Roadmap nay chia API suite theo nhom nghiep vu rieng de de uu tien, de chay theo module, va de danh dau ro nhom `@smoke`, `@regression`, `@extended`.

## Thu tu uu tien

1. `auth`
2. `public`
3. `admin`
4. `staff`
5. `customer`
6. `payment`

## Module roadmap

### Auth

- Pham vi: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/forgot-password`
- Ho tro them: MVC auth flow cho `register`, `verify`, `reset-password`, `logout`
- `@smoke`: login admin, `me`, logout
- `@regression`: login sai credential, body rong, forgot-password, register/reset support flow
- `@extended`: edge case OTP va session gia

### Public

- Pham vi: `GET /api/v1/public/buildings`, `GET /api/v1/public/buildings/page`, `GET /api/v1/public/buildings/filters`
- `@smoke`: public search mac dinh
- `@regression`: filter hop le, pagination co ban, response shape
- `@extended`: invalid enum va filter boundary

### Admin

- Module con: `security`, `building`, `building-additional-information`, `customer`, `staff`, `contract`, `invoice`, `sale-contract`, `property-request`, `profile`
- `@smoke`: security matrix mau, list/readonly quan trong
- `@regression`: CRUD happy path, validation, business rule, DB verify
- `@extended`: upload, trigger batch, defect-driven, boundary sau

### Staff

- Pham vi: readonly API, invoice CRUD, profile OTP
- `@smoke`: readonly list va auth contract
- `@regression`: invoice lifecycle, profile update
- `@extended`: scope boundary va unsupported write path

### Customer

- Pham vi: readonly API, property-request, profile OTP
- `@smoke`: readonly list va auth contract
- `@regression`: property-request submit/list/cancel, profile update
- `@extended`: duplicate pending request, known defect, boundary input

### Payment

- Pham vi: `/payment-demo/qr/{invoiceId}`, `/payment-demo/qr/confirm/{invoiceId}`
- `@smoke`: customer QR render
- `@regression`: access control, missing invoice, confirm payment
- `@extended`: hardening cho ownership, contract redirect, edge invoice state

## Lenh chay de xuat

```bash
npm run test:api:auth
npm run test:api:public
npm run test:api:admin
npm run test:api:staff
npm run test:api:customer
npm run test:api:payment
npm run test:api:smoke
npm run test:api:regression
npm run test:api:extended
```
