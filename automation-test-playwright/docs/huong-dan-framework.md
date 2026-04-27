# Huong dan van hanh framework

## 1. Cach them mot test moi
### Buoc 1: Xac dinh loai test
- `tests/api`: neu kiem tra endpoint.
- `tests/e2e`: neu kiem tra hanh trinh dau cuoi.
- Gan tag `@smoke`, `@regression`, `@extended` theo muc do uu tien va do phu.

### Buoc 2: Kiem tra POM
- Neu page da ton tai, tai su dung page object hien co.
- Neu page chua co, tao page moi trong dung module.
- Neu chi khac route, uu tien ke thua tu class routed trong `pages/core/`.

### Buoc 3: Them du lieu test
- File mau cho upload dat trong `test-data/files/`.
- Helper/scenario du lieu dung chung dat trong `test-data/`.
- Du lieu dong dat trong `TestDataFactory`.
- Xem `test-data/README.md` neu can chon dung cho dat file moi.

### Buoc 4: Viet test
- Giu ten test theo mau: `TEST-ID Test Name`.
- Moi test phai co assertion ro rang.
- Neu test co login lap lai, uu tien fixture trong `fixtures/` va helper dang duoc dung thuc te nhu `AuthSessionHelper`.

## 2. Quy uoc dat ten
### File test
- `admin-building.api.spec.ts`
- `customer-profile.api.spec.ts`
- `admin-building-management.e2e.spec.ts`

### Page object
- `LoginPage.ts`
- `AdminDashboardPage.ts`
- `CustomerInvoicePage.ts`

### Helper
- Dat ten theo tac vu: `AuthSessionHelper`, `CleanupHelper`, `TestDataFactory`.

## 2.1. Dat file vao dung nhom
- `fixtures/`: fixture cap framework, co the dung lai cho nhieu suite. Chi expose nhung context/page dang co consumer thuc te.
- `utils/helpers/`: helper tong quat, khong phu thuoc truc tiep vao fixture lifecycle.
- `test-data/`: file fixture va helper/scenario bootstrap du lieu dung chung.

Chi tiet kien truc xem them trong `docs/architecture.md`.

## 3. Quy uoc tag
- `@smoke`: luong rat quan trong, chay nhanh.
- `@regression`: bo hoi quy.
- `@extended`: nhom mo rong, co the chay sau.
- `@api-read`, `@api-write`, `@otp`: tag dang duoc dung trong API suite.

## 3.1. Metadata test case
- Metadata `testId`, `layer`, `actor`, `feature` duoc auto-parse tu title test trong fixture, khong can gan tag rieng.
- Title nen giu format: `[ID] - Layer Actor Feature - Scenario - Expected Behavior`.
- Khong doi ID test case khi refactor framework; neu doi behavior moi cap nhat ID.

## 4. Huong dan viet POM
- Moi POM chi chiu trach nhiem cho mot page.
- Locator dat trong constructor hoac property ro rang.
- Method trong POM chi mo ta thao tac UI, khong assert nghiep vu phuc tap.
- Neu co locator khong on dinh, uu tien dung `anyLocator()` va sap xep thu tu uu tien.

## 5. Cach xu ly test flaky
- Kiem tra lai locator va cho doi dung trang thai.
- Tranh dung `waitForTimeout` neu khong that su can thiet.
- Uu tien `expect(...).toBeVisible()` hoac `waitForLoadState('networkidle')` khi hop ly.
- Neu test chi flaky trong CI, uu tien giam phu thuoc du lieu va session.
- Chi tang retry khi da xac dinh test hop le nhung moi truong khong on dinh.

## 6. Moi truong chay
Framework ho tro:
- `local`
- `dev`
- `test`
- `staging`

Chon moi truong qua bien `APP_ENV` va `BASE_URL_*` trong file `.env`.

Seed data dung chung nhu account mac dinh va dia chi toa nha test phai doc tu `.env`.
Khong hard-code district/ward/street moi trong spec neu co the dung `TestDataFactory`.
Payload mac dinh trong `TestDataFactory` doc cac ID seed qua `TEST_BUILDING_ID`, `TEST_CONTRACT_ID`, `TEST_CUSTOMER_ID`, `TEST_STAFF_ID`.

## 6.1. Quy tac an toan du lieu
- Mac dinh framework khong duoc phep sua hoac xoa du lieu that.
- Cac test sau se bi xem la pha du lieu: `DELETE`, cap nhat `username`, `email`, `password`, cap nhat assignment, va CRUD ghi xuong co so du lieu.
- Neu can chay nhom nay, phai bat bien moi truong:

```bash
$env:ALLOW_DESTRUCTIVE_TESTS="true"
```

- Chi duoc bat tren moi truong `test` hoac du lieu mau co the reset.
- Khong duoc bat tren moi truong dang dung tai khoan that cua nguoi dung.

## 7. Session va dang nhap nhanh
- Test nen uu tien import `@fixtures/api.fixture` cho API suite va `@fixtures/base.fixture` cho E2E suite; neu chua co fixture dung lai ro rang thi khoi tao POM truc tiep trong spec.
- Runtime output va report duoc gom trong `.runtime/`.
- HTML/JUnit report top-level se duoc lam moi moi lan chay; `.runtime/test-results/` chi giu lai mot so run gan day.
- Test nen tai su dung `AuthSessionHelper`, `TempEntityHelper`, va fixture hien co khi phu hop.
- API test co response kho debug nen attach qua fixture `apiDebug.attachResponse(response, { name })`.
- Mutation test nen dang ky cleanup bang `cleanupRegistry.addLabeled(...)` de report cleanup loi co ten ro rang.
- Neu test can cleanup ngay trong `finally`, uu tien gom task qua `CleanupHelper.run([...])` va dat label ro rang.
- Neu co fixture `cleanupRegistry`, dang ky cleanup cang som cang tot, ngay sau khi tao temp data.
- `cleanupRegistry` chay theo LIFO. Dang ky cleanup theo thu tu nguoc voi thu tu can chay; vi du dang ky delete entity truoc, reset assignment sau, de khi flush thi reset chay truoc delete.
- Neu API test can login bang user tam vua tao, dung scenario helper tap trung nhu `createAuthenticatedTempProfileScenario(...)`. Helper phai dispose context truoc, sau do moi xoa user tam bang `adminApi`.
- E2E duoc phep giu `test.afterEach` cleanup khi data phu thuoc state cuc bo cua scenario. Khong bo DB assertion trong E2E neu assertion dang xac nhan side effect nghiep vu.
- ID am/khong ton tai dung chung phai lay tu `TestDataFactory.missingId` hoac `TestDataFactory.missingSmallId`; khong hard-code them so moi trong spec/catalog.

Vi du nen dung:

```ts
const temp = await TempEntityHelper.taoContractTam(adminApi);
cleanupRegistry.addLabeled(`Delete contract scenario ${temp.id}`, () => TempEntityHelper.xoaContractTam(adminApi, temp));
```

```ts
const scenario = await createStaffInvoiceScenario(playwright, cleanupRegistry);
cleanupRegistry.addLabeled(`Delete invoice ${invoiceId}`, () => cleanupStaffInvoiceById(invoiceId));
```

Vi du khong nen them moi:

```ts
const missingId = 999999999;
```

Dung:

```ts
const missingId = TestDataFactory.missingId;
```

## 7.1. Locator va POM
- Khi can lay phan tu dau/cuoi dang visible trong POM, dung `firstVisible()` va `lastVisible()` cua `BasePage`.
- Khong them `.first()` / `.last()` truc tiep vao page object moi neu co the dung helper visible da co.
- Neu app co `data-testid`, uu tien `getByTestId`. Neu chua co test id on dinh, khong refactor locator lon chi de doi style selector.

## 8. Quy trinh de nghi truoc khi merge
1. `npm run typecheck`
2. `npm run test:smoke`
3. `npm run test:regression`
4. Mo HTML report de kiem tra lai ket qua
