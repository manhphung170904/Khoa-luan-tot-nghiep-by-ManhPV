# Huong dan van hanh framework

## 1. Cach them mot test moi
### Buoc 1: Xac dinh loai test
- `tests/ui`: neu kiem tra giao dien, form, dieu huong.
- `tests/api`: neu kiem tra endpoint.
- `tests/functional`: neu kiem tra mot logic nghiep vu ro rang.
- `tests/e2e`: neu kiem tra hanh trinh dau cuoi.
- `tests/regression`: neu la luong quan trong can giu on dinh sau moi lan sua.

### Buoc 2: Kiem tra POM
- Neu page da ton tai, tai su dung page object hien co.
- Neu page chua co, tao page moi trong dung module.
- Neu chi khac route, uu tien ke thua tu class routed trong `pages/core/`.

### Buoc 3: Them du lieu test
- Du lieu co dinh dat trong `test-data/*.json`.
- Du lieu dong dat trong `TestDataFactory`.

### Buoc 4: Viet test
- Giu ten test theo mau: `TEST-ID Test Name`.
- Moi test phai co assertion ro rang.
- Neu test co login lap lai, uu tien helper trong `PageScenarioHelper` hoac fixture session theo role.

## 2. Quy uoc dat ten
### File test
- `ui-master.spec.ts`
- `api-master.api.spec.ts`
- `regression-suite.spec.ts`

### Page object
- `LoginPage.ts`
- `AdminDashboardPage.ts`
- `CustomerInvoicePage.ts`

### Helper
- Dat ten theo tac vu: `AuthSessionHelper`, `AssertionHelper`, `TestDataFactory`.

## 3. Quy uoc tag
- `@smoke`: luong rat quan trong, chay nhanh.
- `@regression`: bo hoi quy.
- `@extended`: nhom mo rong, co the chay sau.
- `@ui`, `@api`, `@functional`, `@e2e`: tag theo loai test neu can bo sung sau.

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
- Session duoc tao tai `tests/setup/auth.setup.ts`.
- Auth state luu trong `playwright/.auth/`.
- Test nen tai su dung `PageScenarioHelper` va auth state da duoc tao san.

## 8. Quy trinh de nghi truoc khi merge
1. `npm run typecheck`
2. `npm run test:setup`
3. `npm run test:smoke`
4. `npm run test:regression`
5. Mo HTML report de kiem tra lai ket qua
