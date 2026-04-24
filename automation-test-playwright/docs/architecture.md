# Kien truc framework Playwright

## 1. Muc tieu kien truc
Framework duoc to chuc theo huong:
- tach biet ro `test code`, `page object`, `fixture`, `helper`, `db/api utility`
- uu tien tai su dung
- giam lap lai login/context bootstrap
- de mo rong khi them module moi

## 2. Cac lop chinh

### `tests/api/`
- Chua API test theo module nghiep vu.
- Mac dinh import `test`, `expect` tu `@fixtures/api.fixture`.
- Khi can auth/context, uu tien dung fixture co san nhu `adminApi`, `staffApi`, `customerApi`, `anonymousApi`.

### `tests/e2e/`
- Chua E2E test theo hanh trinh nguoi dung.
- Mac dinh import `test`, `expect` tu `@fixtures/base.fixture`.
- Khi can page object co san, uu tien dung fixture hoac POM thay vi viet locator truc tiep trong test.

### `fixtures/`
- Day la lop Playwright fixture dung chung cap framework.
- Chua reusable test context nhu `adminApi`, `staffApi`, `customerApi`, `anonymousApi`, va cac page fixture dang duoc dung thuc te nhu `publicPage`.
- Spec nen import tu `@fixtures/*` thay vi tuong tac truc tiep voi `playwright.request.newContext()` o tung file.

### `pages/`
- Chua Page Object Model theo module.
- `pages/core/` la lop nen: base page, routed page, shell page, CRUD abstractions.
- POM chi nen mo ta thao tac UI va state UI, khong nen chua business workflow phuc tap hoac DB assertion.

### `utils/helpers/`
- Day la helper dung chung cap framework.
- Phu hop cho utility co the duoc goi tu nhieu suite khac nhau.
- Vi du: `TempEntityHelper`, `TestDataFactory`, `CleanupHelper`, `AuthSessionHelper`.

### `test-data/`
- Day la noi chua file fixture va helper/scenario du lieu dung chung.
- Phu hop cho upload fixture file, temp user bootstrap, property request scenario, invoice scenario.
- Khi logic chua duoc dung lai va chu yeu phuc vu setup du lieu test, dat o day se gon hon viec mo them mot tang thu muc moi.
- Xem them `test-data/README.md` de phan biet file fixture va helper bootstrap.

### `utils/db/`
- Chua DB client va logic truy van dung chung.
- Dung de verify persisted data khi assertion qua UI/API alone la chua du.

### `utils/api/`
- Chua API utility, endpoint catalog, session helper, contract helper.
- Phu hop cho reusable request builder, auth/session flow, va API assertion utility.

## 3. Quy uoc dat code dung cho framework va dung cho suite

### Dat trong `fixtures/` neu:
- Dung lai cho nhieu module.
- Khong gan chat vao mot file spec hay mot nghiep vu duy nhat.
- La cach framework cap `test context` cho suite.

### Dat trong `utils/helpers/` neu:
- La utility co tinh chat tong quat.
- Khong can buoc vao Playwright fixture lifecycle.
- Co the duoc goi tu API, E2E, hoac script support.

### Dat trong `test-data/` neu:
- Can file fixture hoac helper bootstrap du lieu duoc goi tu nhieu spec.
- Logic chu yeu phuc vu tao scenario du lieu, temp user, temp contract, temp invoice.
- Chua can tach thanh mot tang rieng vi pham vi van nho va ro.

## 4. Khi nao dung `TempEntityHelper`
- Dung khi test can tao du lieu tam de co tinh doc lap.
- Uu tien cho CRUD scenario, profile flow, payment flow, hoac test can data setup co chu dich.
- Sau khi tao du lieu tam, phai cleanup ro rang bang fixture cleanup registry hoac `afterEach/afterAll`.

Khong nen dung `TempEntityHelper` khi:
- chi can doc du lieu san co
- test smoke/read-only co the dua tren data stable
- muc tieu test la contract response, khong phai lifecycle du lieu

## 5. Khi nao verify bang DB
- Nen verify DB khi test can xac nhan:
- du lieu da persist dung
- status/thuoc tinh da doi sau thao tac
- cleanup thuc su thanh cong

Khong nen verify DB neu:
- UI/API assertion da du bao phu muc tieu test
- truy van DB chi lap lai dung noi dung ma response vua tra ve
- test se bi coupling qua chat voi implementation chi de xac minh mot hanh vi nho

## 6. Luong viet test moi de nghi
1. Xac dinh test thuoc `api` hay `e2e`.
2. Kiem tra da co fixture/POM/helper nao dung lai duoc chua.
3. Neu can bootstrap du lieu dung lai cho nhieu spec, uu tien dat trong `test-data/`.
4. Neu utility thuc su tong quat, dua vao `utils/helpers/` hoac `fixtures/`.
5. Chi them DB verification khi no tang gia tri assertion that su.

## 7. Runtime output
- Toan bo output runtime duoc gom trong `.runtime/`.
- Thu muc legacy nhu `artifacts/`, `playwright-report/`, `reports/`, `playwright/` khong con la cau truc chuan.
- `global-setup` se lam moi HTML/JUnit report va cat bot run cu trong `.runtime/test-results/` de workspace gon hon.

