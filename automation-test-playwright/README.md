# Framework Playwright cho MoonNest

## 1. Muc tieu
Day la framework kiem thu tu dong bang Playwright + TypeScript duoc tach rieng cho he thong MoonNest. Framework duoc thiet ke de dung cho du an that te va trinh bay trong luan van tot nghiep, nen uu tien:
- cau truc ro rang
- tai su dung cao
- de bao tri
- de mo rong theo module va theo loai test

## 2. Cau truc thu muc hien tai

```text
automation-test-playwright/
|-- .github/
|   `-- workflows/
|       `-- playwright.yml
|-- config/
|   |-- env.ts
|   |-- global-setup.ts
|   `-- global-teardown.ts
|-- docs/
|   |-- architecture.md
|   |-- huong-dan-framework.md
|   |-- playwright-reporting.md
|   |-- pom-classes.md
|   |-- regression-suite.md
|   `-- test-script-mapping.md
|-- .runtime/
|-- pages/
|   |-- admin/
|   |-- auth/
|   |-- core/
|   |-- customer/
|   |-- public/
|   `-- staff/
|-- test-data/
|   `-- files/
|-- tests/
|   |-- api/
|   |-- e2e/
|   |-- api/_fixtures/
|   `-- e2e/_fixtures/
|-- utils/
|   |-- api/
|   |-- db/
|   |-- fixtures/
|   `-- helpers/
|-- .env.example
|-- package.json
|-- playwright.config.ts
`-- tsconfig.json
```

## 3. Y nghia tung nhom thu muc
- `pages/`: chua Page Object Model theo module nghiep vu.
- `pages/core/`: chua BasePage, shell page, routed page, CRUD base page.
- `tests/api/`: test endpoint va response.
- `tests/e2e/`: test hanh trinh nguoi dung dau cuoi.
- `tests/api/_fixtures`, `tests/e2e/_fixtures`: du lieu va helper phuc vu tung nhom suite.
- `utils/helpers/`: helper dung chung cho login, assert, data, session.
- `utils/fixtures/`: fixture de tai su dung page/session.
- `utils/api/`: helper API, endpoint catalog, contract utility.
- `utils/db/`: ket noi va truy van DB phuc vu xac minh du lieu.
- `test-data/files/`: file mau cho cac case upload va validation.
- `config/`: cau hinh moi truong, retry, setup/teardown.
- `.runtime/`: luu ket qua chay, screenshot, trace, video, HTML report, JUnit report.

## 4. Nhung thanh phan da du cho mot framework day du
- Phan tach test theo 2 nhom chinh: API va E2E.
- POM theo module nghiep vu.
- Helper chung cho login, assertion, page flow.
- Fixture chung cho API va E2E de tai su dung context/session.
- Co `global setup / teardown`.
- Co config moi truong `local / dev / test / staging`.
- Co retry theo nhom test.
- Co report HTML, JUnit, screenshot, video, trace.
- Co workflow CI bang GitHub Actions.
- Co tai lieu van hanh bang tieng Viet.

## 5. Lenh su dung chinh
```bash
npm install
npx playwright install chromium
npm run typecheck
npm run test
```

## 5.1. Che do an toan du lieu
- Mac dinh framework dang o che do an toan, khong chay cac test co the xoa hoac sua du lieu that.
- Cac test API co nguy co pha du lieu nhu `delete`, `doi username`, `doi email`, `doi password`, `gan lai assignment` se bi `skip` neu khong bat co rieng.
- Chi bat che do nay khi dang o moi truong test rieng, khong dung cho tai khoan that.

Bat che do pha du lieu co chu y:
```bash
$env:ALLOW_DESTRUCTIVE_TESTS="true"
npm run test:api:destructive
```

Cac lenh thuong dung:
```bash
npm run test:api
npm run test:e2e
npm run test:regression
npm run test:smoke
npm run test:ci
npm run report:open
```

## 6. Luong session va fixture
Framework hien uu tien fixture de cap `adminApi`, `staffApi`, `customerApi`, `anonymousApi` cho API suite va `adminApi` cho E2E suite. Cach nay giup test dung chung logic dang nhap, cleanup, va mo rong framework ma khong phai lap lai `newContext()` trong tung file.

## 7. Quy uoc quan trong
- Moi test case phai giu `Test ID` va `Test Name`.
- Moi page object chi nen dai dien cho mot man hinh hoac mot khu vuc chuc nang ro rang.
- Uu tien locator theo thu tu: `data-testid -> id -> name -> fallback`.
- Khong viet logic nghiep vu vao POM.
- Khong hard-code du lieu moi trong test neu co the dua vao `test-data/` hoac `TestDataFactory`.

## 8. Gia tri cho luan van
Framework nay the hien duoc:
- cach thiet ke framework tu dong hoa co cau truc
- cach tach biet test layer va page layer
- chien luoc regression va E2E
- bao cao ket qua chay test va kha nang mo rong sau nay

Tai lieu kien truc xem them trong `docs/architecture.md`.
Tai lieu chi tiet xem them trong `docs/huong-dan-framework.md`.
