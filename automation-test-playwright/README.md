# MoonNest Playwright Automation Framework

Framework nay dung Playwright + TypeScript de kiem thu tu dong he thong MoonNest. Muc tieu chinh la kiem thu API, kiem thu giao dien E2E, tao bao cao ket qua va cung cap bang chung ky thuat cho khoa luan tot nghiep.

## 1. Muc Tieu

- Xay dung framework automation test co cau truc ro rang.
- Tach rieng test layer, page layer, fixture, helper va test data.
- Ho tro kiem thu API va E2E tren cac vai tro admin, staff, customer va public user.
- Co co che tao va don du lieu test an toan.
- Co report HTML, JUnit, screenshot, video va trace khi loi.
- Co the chay local va tren GitHub Actions CI.

## 2. Cau Truc Thu Muc

```text
automation-test-playwright/
|-- config/
|   |-- env.ts
|   |-- global-setup.ts
|   `-- global-teardown.ts
|-- docs/
|   |-- framework-overview.md
|   |-- test-strategy.md
|   |-- execution-reporting-ci.md
|   `-- thesis-evaluation-checklist.md
|-- fixtures/
|   |-- api.fixture.ts
|   |-- base.fixture.ts
|   `-- support/
|-- pages/
|   |-- admin/
|   |-- auth/
|   |-- components/
|   |-- core/
|   |-- customer/
|   |-- public/
|   `-- staff/
|-- test-data/
|-- tests/
|   |-- api/
|   `-- e2e/
|-- utils/
|   |-- api/
|   |-- db/
|   `-- helpers/
|-- .env.example
|-- package.json
|-- playwright.config.ts
`-- tsconfig.json
```

## 3. Thanh Phan Chinh

- `tests/api/`: kiem thu endpoint, status code, body contract, authorization va business rule.
- `tests/e2e/`: kiem thu luong nguoi dung tren giao dien.
- `pages/`: Page Object Model theo man hinh va module nghiep vu.
- `fixtures/`: khoi tao API context theo role, page object dung chung, metadata va cleanup registry.
- `utils/api/`: API client, helper session, assertion response va endpoint catalog.
- `utils/db/`: truy van MySQL de xac minh va don du lieu test.
- `utils/helpers/`: tao du lieu dong, quan ly session, cleanup file upload va helper dung chung.
- `test-data/`: data theo moi truong va scenario dung lai trong test.
- `config/`: cau hinh moi truong, global setup, global teardown va runtime path.
- `.runtime/`: output sinh ra khi chay test, khong commit vao repository.

## 4. Quy Mo Kiem Thu Hien Tai

- Khoang 50 spec file.
- Khoang 174 API test.
- Khoang 123 E2E test.
- Cac nhom test chinh: admin, staff, customer, auth, public, payment.
- Cac tag su dung trong test title chi gom `@smoke` va `@regression`.

## 5. Cai Dat Va Chay Test

```powershell
cd automation-test-playwright
npm install
npx playwright install chromium
npm run typecheck
```

Chay cac bo test thuong dung:

```powershell
npm run test:api
npm run test:e2e
npm run test:smoke
npm run test:regression
npm run test:ci
```

Tren Windows, neu PowerShell chan `npm` do Execution Policy, co the dung:

```powershell
npm.cmd run typecheck
npm.cmd run test:ci
```

## 6. Che Do An Toan Du Lieu

Framework khong dung tag rieng cho destructive/safe test. An toan du lieu duoc quan ly bang moi truong test rieng, `TestDataFactory`, `runToken`, cleanup registry va `global-teardown.ts`.

Khong chay automation test tren database that hoac tai khoan that. Cac test co tao/sua/xoa du lieu phai tao du lieu dong co `runToken` va co co che cleanup.

## 7. Bao Cao

Ket qua test duoc luu tai:

```text
.runtime/playwright-report
.runtime/test-results
.runtime/junit
```

Mo HTML report:

```powershell
npm run report:open
```

Khi test loi, framework co the luu screenshot, video, trace va API response debug attachment tuy theo project/cau hinh.

## 8. Quy Uoc Viet Test

- Moi test case nen co Test ID trong title, vi du `[API-TC-001]`.
- Chi su dung hai tag trong title: `@smoke` va `@regression`.
- API/E2E duoc phan loai bang thu muc `tests/api`, `tests/e2e` va Playwright project, khong can tag rieng.
- Test data dong nen tao qua `TestDataFactory`.
- Page object chi chua thao tac giao dien va locator, khong chua business assertion phuc tap.
- Uu tien locator on dinh: `data-testid`, `id`, `name`, sau do moi dung fallback text/CSS.

## 9. Tai Lieu Trong Docs

- `docs/framework-overview.md`: kien truc framework va vai tro tung thanh phan.
- `docs/test-strategy.md`: chien luoc test, pham vi bao phu va quy uoc tag.
- `docs/execution-reporting-ci.md`: cach chay test, doc report va luong CI.
- `docs/thesis-evaluation-checklist.md`: checklist danh gia muc do san sang cho khoa luan.
