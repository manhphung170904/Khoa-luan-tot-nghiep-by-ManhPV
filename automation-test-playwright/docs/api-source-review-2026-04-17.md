# API Source Review - 2026-04-17

## 0. Muc do hoan thanh hien tai

### Cach danh gia
- Muc do hoan thanh duoc tinh theo tieu chi `dung nghiep vu theo source code hien tai`.
- Khong lay viec chay do/xanh runtime den het lam tieu chi chinh trong ban cap nhat nay.
- Uu tien danh gia theo 3 truc: bam dung source, an toan data test, va do phu core business flow.

### Danh gia tong the
- Tien do tong the theo nghiep vu: khoang `93-96%`.
- Tien do review + architecture: gan nhu `100%`.
- Tien do code refactor cho cac module nghiep vu chinh: khoang `85-90%`.
- Phan con lai chu yeu la dong bo them mot so spec con lai sang fixture chung neu muon nhat quan hon nua, khong con la khoang trong nghiep vu lon.

### Trang thai theo hang muc
- `A. Tong quan hien trang`: `100%`
- `B. Danh sach van de can sua`: `95%`
- `C. Kien truc test chuan hoa`: `95%`
- `D. Coverage matrix`: `100%` o muc tai lieu va mapping source
- `E. Code refactor cu the`: `90-95%`
- `F. Gia dinh / khoang trong`: da xac dinh ro, con mot so khoang trong nho chu khong con lech nghiep vu lon

### Ket luan ngan
- Neu muc tieu la bo API test `dung nghiep vu theo source`, bo hien tai da dat muc kha cao va da vuot qua phan kho nhat cua viec refactor.
- Neu sau nay can day manh hon ve van hanh lau dai, buoc tiep theo nen la don sach helper legacy, tao fixture cap project, va dong bo not cac module readonly/phu tro.
- Sau dot bo sung tiep theo trong project test, cac rule core cho contract/sale-contract/staff assignment da duoc khoa chat hon; phan con lai chu yeu la defect-driven cases de phoi ra lech giua rule mong doi va backend hien tai.

### Bang trang thai module
- Auth REST: `Hoan thanh`
- Auth web flow: `Hoan thanh`
- Admin building + upload: `Hoan thanh`
- Admin building additional information: `Hoan thanh`
- Admin staff: `Hoan thanh`
- Admin customer: `Hoan thanh`
- Admin contract: `Hoan thanh`
- Admin invoice: `Hoan thanh`
- Admin sale contract: `Hoan thanh`
- Admin property request: `Hoan thanh`
- Admin profile OTP: `Hoan thanh`
- Admin security matrix: `Hoan thanh`
- Staff readonly: `Hoan thanh`
- Staff invoice: `Hoan thanh`
- Staff profile OTP: `Hoan thanh`
- Customer readonly: `Hoan thanh`
- Customer property request: `Hoan thanh`
- Customer profile OTP: `Hoan thanh`
- Public buildings: `Hoan thanh`
- Payment demo QR: `Hoan thanh`
- Helper auth/session/otp/file/data strategy: `Hoan thanh`
- Project-level API fixture + cleanup registry: `Hoan thanh`
- OTP test hook chinh thuc cho local/test: `Hoan thanh`
- Tagging `@api-read` / `@api-write` / `@otp`: `Hoan thanh`

## A. Tong quan hien trang

### Dung
- Backend su dung API namespace ro rang theo role: `/api/v1/auth`, `/api/v1/admin/**`, `/api/v1/staff/**`, `/api/v1/customer/**`, `/api/v1/public/**`, `/payment-demo/**`.
- Security thuc te la cookie-based JWT session. API auth dung `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.
- Global exception handling da duoc chuan hoa cho package `com.estate.api`, phan lon loi business/validation/not-found hien dang tra `400`, auth tra `401`, role violation tra `403`.
- Source da co flow OTP profile thuc te qua bang `email_verification`, service `ProfileOtpServiceImpl`, va luong upload anh that qua `MultipartFile`.

### Sai/leech trong test hien tai
- Da tach duoc 2 lop auth test ro rang hon: REST auth suite bam `/api/v1/auth/*`, con web auth flow suite bam `/login` va `/auth/*`.
- Nhieu assertion message dang bam vao text tieng Anh/contract cu, trong khi source thuc te da doi message va mot so endpoint tra message tieng Viet.
- Nhieu test dang hard-code OTP (`000000`, `123456`) ma khong di qua co che lay OTP thuc te cua he thong.
- Nhieu test dung ID seed co san (`1`, `999999999`) thay vi tao data rieng cho test.
- Mot so test CRUD dang doc/chon seed data co san trong moi truong de xac minh business rule, de gay flaky va co nguy co phu thuoc du lieu.

### Rui ro chinh
- False positive do login sai contract.
- False negative do assert sai message/status so voi source hien tai.
- Phu thuoc seed data san co.
- Mutating tests chua tach ro data do test tao va data moi truong.
- OTP automation chua co kenh doc OTP thuan tu backend; hien tai chi co the can thiep vao row `email_verification` neu test environment cho phep DB access.

### Docs cu khong con dang tin
- API auth docs cu mo ta login redirect/web-flow khong con la source of truth cho API suite.
- Upload docs/test cu dang assert message tieng Anh, trong khi controller/exception thuc te da doi.
- Profile OTP docs/test cu khong map dung purpose thuc te: `PROFILE_USERNAME`, `PROFILE_PHONE`, `PROFILE_PASSWORD`.

## B. Danh sach van de can sua

### Critical
- Chuan hoa lai auth helper theo `POST /api/v1/auth/login` va cookie jar cua `APIRequestContext`.
- Loai bo test update/delete dung seed data san co hoac ID cung.
- Chuan hoa OTP helper theo flow that cua `email_verification`.
- Sua lai cac assertion status theo `GlobalExceptionHandler` thuc te.

### High
- Tach reusable data factory + cleanup strategy cho staff/customer/building/contract/invoice/sale-contract/property-request.
- Dung file fixture that cho upload happy path.
- Chuyen mutation tests sang chi thao tac voi record do test tao.
- Dung role/session fixture thay vi login lap lai tung test.

### Medium
- Tach security matrix ra khoi business matrix de test doc hon.
- Gop helper DB access/lookup/cleanup theo module.
- Bo cac assertion text qua chat, uu tien assert status + shape + persisted side effects.

### Low
- Dong bo naming test id/module.
- Giam duplicate helper giua `AuthSessionHelper`, `adminApiUtils`, va helper API moi.

## C. Kien truc test chuan hoa de xuat

### Cau truc thu muc
- `tests/api/auth`
- `tests/api/admin`
- `tests/api/staff`
- `tests/api/customer`
- `tests/api/public`
- `tests/api/payment`
- `tests/api/_fixtures`
- `utils/api`
- `test-data/files`

### Helper dung chung
- `ApiSessionHelper`: login/logout/me va tao request context theo role, tai su dung cookie-based session.
- `ApiOtpHelper`: doc/trang thai OTP trong `email_verification`, expire OTP, ghim OTP biet truoc cho test account rieng.
- `ApiFileFixtures`: tra ve file anh that tu repo backend va fixture invalid/corrupt.
- `ApiOtpAccessHelper`: doc OTP qua test hook chinh thuc `/api/test-support/otp/*` thay vi phai ghim hash DB trong test.
- `TempEntityHelper`: tiep tuc dung, nhung can bo dan cac cho phu thuoc seed va thay bang data factory an toan.
- `api.fixture.ts`: project-level fixture cho API suite, gom shared role contexts va cleanup registry dung chung.

### Data test
- Seed dung chung: chi doc, khong mutate.
- Dynamic data: tao moi trong test bang prefix `PW` + timestamp.
- Cleanup: chi xoa record do test tao; cleanup cascade tu invoice -> contract -> assignment -> customer/building/staff.

### Upload
- Happy path dung file JPG that tu `moonNest-main/src/main/resources/static/images/**`.
- Invalid path dung text fixture.
- Corrupt JPG de bat lo hong source: controller hien chi validate size/mime/ext, chua validate binary image.

### OTP handling
- Hien tai OTP chi gui qua email va DB luu hash, khong co read-back API.
- Da bo sung test hook chinh thuc chi mo trong `local-nooauth`/`test`: `/api/test-support/otp/latest` va `/api/test-support/otp/expire`.
- API test uu tien doc OTP qua hook nay; DB helper giu lai chu yeu cho fallback va mot so truong hop dac biet.

### Auth tai su dung
- API suite phai dung `POST /api/v1/auth/login`.
- UI suite tiep tuc co the dung `/login`.
- Khong tron web auth helper va API auth helper.

## D. Coverage matrix tong hop theo module

### Auth
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- Cases: happy path, blank field, wrong credential, anonymous `me`, logout clear session, forgot-password cho email ton tai/khong ton tai, reset OTP wrong/expired/used.

### Admin
- Buildings: list, metadata, create, update, delete, upload image, staffs by building/customer.
- Building additional information: legal authorities, nearby amenities, suppliers, planning maps, planning map image.
- Staff: list/search, create, delete, get/update assignments, quick assign.
- Customers: list/search, create, delete.
- Contracts: list, metadata, create, update, delete, status update.
- Invoices: list, create, update, delete, confirm, status update.
- Sale contracts: list, create, update, delete.
- Property requests: list/detail, reject, approve, contract-data, sale-contract-data, pending-count.
- Profile: username/email/phone/password, send OTP.
- Dashboard/report: readonly auth + shape assertions.

### Staff
- Dashboard.
- Readonly building/contract/customer/sale-contract/filter/metadata.
- Invoices CRUD.
- Profile OTP/change endpoints.

### Customer
- Dashboard.
- Readonly buildings/contracts/transactions/filter/metadata.
- Property requests submit/list/cancel.
- Profile OTP/change endpoints.

### Public
- Buildings list/page/filter.

### Payment
- `GET /payment-demo/qr/{invoiceId}`
- `GET|POST /payment-demo/qr/confirm/{invoiceId}`

## E. Code refactor da thuc hien trong dot nay
- Them `utils/api/apiSessionHelper.ts` de login API dung contract that va tai su dung session cookie.
- Them `utils/api/apiOtpHelper.ts` de lam viec voi flow OTP thuc te qua bang `email_verification`.
- Them `utils/api/apiFileFixtures.ts` va fixture file local de upload bang anh that.
- Viet lai `tests/api/auth/auth-session.api.spec.ts` theo contract source hien tai.
- Chuan hoa `tests/api/auth/auth.api.spec.ts` thanh web auth flow contract test dung cac endpoint controller that (`/login`, `/auth/register/*`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/logout`), khong tron voi REST auth nua.
- Bo sung direct contract + DB assertions cho `POST /api/v1/auth/forgot-password` trong `tests/api/auth/auth-session.api.spec.ts`, dong thoi giam phu thuoc vao exact message text cho login validation REST.
- Hoan thien them MVC auth flow trong `tests/api/auth/auth.api.spec.ts`, bao gom happy-path `reset-password` de xac nhan redirect contract va credential moi hoat dong dung.
- Viet lai `tests/api/admin/admin-profile.api.spec.ts` theo flow OTP/source that, dung temp admin do test tao.
- Viet lai `tests/api/admin/admin-building.api.spec.ts` sang `ApiSessionHelper`, bo helper cookie cu, bo phu thuoc contract/sale-contract seed data, va dung temp relation an toan cho cac case block update/delete.
- Chuyen `utils/api/adminApiUtils.ts` sang auth API that thay vi web login helper cu.
- Cat coupling API helper voi UI auth type, chuyen `adminApiUtils` sang dung `ApiUserRole` tu `ApiSessionHelper`.
- Them `utils/fixtures/api.fixture.ts` de gom shared role contexts va cleanup registry dung chung cho API suite.
- Them `utils/api/apiOtpAccessHelper.ts` de truy cap OTP qua test hook chinh thuc.
- Sua `tests/api/_fixtures/propertyRequestScenario.ts` de co assignment dung thuc te va cleanup dung thu tu.
- Viet lai `tests/api/admin/admin-staff.api.spec.ts` theo temp data strategy, bo phu thuoc building/customer seed co san.
- Viet lai `tests/api/admin/admin-customer.api.spec.ts` theo temp data strategy, bo phu thuoc staff seed co san.
- Viet lai `tests/api/customer/customer-property-request.api.spec.ts` theo status/business rule that cua source.
- Viet lai `tests/api/admin/admin-property-request.api.spec.ts` theo approve/reject flow that, co contract/sale-contract match request.
- Viet lai `tests/api/admin/admin-contract.api.spec.ts` theo temp assignment/customer/building strategy, bo seed data dependency.
- Viet lai `tests/api/admin/admin-invoice.api.spec.ts` theo temp contract strategy va business rule thang lien truoc / due date / confirm flow.
- Viet lai `tests/api/admin/admin-sale-contract.api.spec.ts` theo temp assignment/customer/building strategy.
- Viet lai `tests/api/admin/building-additional-information.api.spec.ts` theo temp building strategy, bo phu thuoc building seed.
- Viet lai `tests/api/staff/staff-profile.api.spec.ts` theo temp staff strategy, OTP/source flow that.
- Viet lai `tests/api/customer/customer-profile.api.spec.ts` theo temp customer strategy, OTP/source flow that.
- Chuan hoa `tests/api/public/public.api.spec.ts` va `tests/api/payment/payment.api.spec.ts` sang `MySqlDbClient`, bo `DatabaseHelper` legacy trong API suite.
- Xoa `utils/api/apiAuthHelper.ts` vi khong con duoc su dung trong API suite da chuan hoa.
- Chuyen cac spec OTP chinh (`auth.api`, `admin-profile.api`, `staff-profile.api`, `customer-profile.api`) sang doc OTP qua hook chinh thuc thay vi pin hash DB.
- Chuyen `admin-contract.api.spec.ts` sang mau fixture chung `adminApi + cleanupRegistry`.
- Bo sung tag dai han cho phan loai suite: `@api-read`, `@api-write`, `@otp`.
- Bo sung direct spec cho `GET /api/v1/admin/buildings/metadata` va `GET /api/v1/admin/contracts/metadata`.
- Bo sung direct spec cho `POST /api/v1/admin/staff/{id}/quick-assign`.
- Bo sung rule tests cho contract/sale-contract khi staff khong phu trach `building` hoac `customer`.
- Bo sung rule tests cho staff assignment khong duoc go bo khi van con `ACTIVE contract`.
- Bo sung defect-driven tests cho truong hop xoa `building`/`customer` khi van con `sale_contract` lien quan.
- Chuyen `[BLD_U04]` sang known-defect test vi runtime hien tai van chap nhan file vuot 5MB.
- Siet chat hon readonly/public contract assertions cho `admin-building`, `admin-customer`, `admin-staff`, `admin-contract`, `admin-invoice`, `public building`, va `auth` de bam vao payload shape/runtime that hon.
- Bo sung conflict coverage cho `admin-profile` (`username/email/phone` trung) va success message assertions cho cac mutation profile chinh.
- Bo sung shape assertions, success message assertions, va case `PUT not-found` cho `admin-sale-contract`; `DELETE not-found` duoc giu duoi dang defect-driven coverage.
- Nâng tiep `admin-customer`, `admin-staff`, `admin-contract`, va `admin-invoice` trong coverage matrix sau khi bo sung them direct message/not-found assertions va xac nhan lai DB-side effects.
- Siet them `admin-building` va `building-additional-information` bang direct success/error assertions de dong bo matrix; tach rieng cac upload >5MB thanh defect-driven thay vi de gom trong nhom CRUD.

## G. Source anomalies can ghi chu ro
- `PUT /api/v1/admin/sale-contracts/{id}` trong `SaleContractServiceImpl.saveEdit` hien chi update `transferDate`, khong update `salePrice` hoac `note`.
- Vi vay test moi co chu y verify dung hanh vi hien tai cua source thay vi ky vong update day du tru khi backend duoc refactor.
- `DELETE /api/v1/admin/buildings/{id}` va `DELETE /api/v1/admin/customers/{id}` hien service moi check bang `contract`, chua chan ro truong hop record dang bi tham chieu boi `sale_contract`.
- `POST /api/v1/admin/buildings/image` tren runtime hien tai van co dau hieu khong chan dung file vuot `5 MB` du source controller co check `MAX_SIZE_BYTES`.
- `POST /api/v1/admin/building-additional-information/planning-maps/image` hien cung lo cung mot defect runtime voi upload building: file vuot `5 MB` van co the duoc chap nhan.
- `POST /auth/forgot-password` co controller MVC trong `AuthController`, nhung security config hien chi permit `/forgot-password` va `/api/v1/auth/forgot-password`, khong permit chinh route `/auth/forgot-password`; vi vay anonymous request bi redirect ve `/login`.
- `GET /api/v1/public/buildings` voi `propertyType` khong hop le hien dang tra `500` thay vi mot ket qua rong/an toan hon, nen duoc giu duoi dang defect-driven coverage.
- `DELETE /api/v1/admin/sale-contracts/{id}` hien van thieu guard not-found ro rang o service; suite da giu 1 defect-driven case de khoa signal nay.

## F. Gia dinh / khoang trong
- OTP test hook hien chi duoc mo trong `local-nooauth`/`test`, va duoc khoa bang `X-Test-Hook-Token`; day la chu y van hanh can giu nguyen de tranh lo ra moi truong khac.
- Chua chuyen 100% tat ca API spec sang `api.fixture.ts`, nhung fixture chung da co va da bat dau duoc ap dung cho cac spec core de lam mau.
- Mot so defect-driven cases duoc giu co chu dich de bao toan signal nghiep vu: neu backend sua dung, cac test `test.fail()` se bat dau bao `unexpected pass` va nhac can cap nhat lai ky vong.
