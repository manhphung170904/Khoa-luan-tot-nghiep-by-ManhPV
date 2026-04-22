# MoonNest - Automation Testing With Playwright

Repository nay phuc vu khoa luan ve kiem thu tu dong cho he thong MoonNest. Du an gom ung dung web quan ly bat dong san MoonNest, framework kiem thu tu dong bang Playwright + TypeScript, du lieu kiem thu va workflow CI chay tren GitHub Actions.

## 1. Tong Quan

MoonNest la he thong quan ly nghiep vu bat dong san voi cac nhom chuc nang chinh cho admin, nhan vien, khach hang va trang public. Framework Playwright duoc xay dung rieng de kiem thu API, kiem thu giao dien E2E va ho tro bao cao ket qua kiem thu.

Muc tieu cua repository:

- Quan ly ma nguon ung dung MoonNest.
- Xay dung framework kiem thu tu dong co cau truc ro rang.
- To chuc test theo API, E2E, smoke va regression.
- Tao bao cao HTML, JUnit, screenshot, video va trace khi co loi.
- Tich hop kiem thu tu dong vao GitHub Actions.

## 2. Cong Nghe Su Dung

- Backend: Java 21, Spring Boot, Spring MVC, Thymeleaf, Spring Security, Spring Data JPA.
- Database: MySQL cho moi truong local/CI, H2 cho integration test backend.
- Frontend: Thymeleaf, Bootstrap, jQuery, AJAX.
- Automation test: Playwright, TypeScript, Node.js.
- CI: GitHub Actions, MySQL service container.

## 3. Cau Truc Repository

```text
.
|-- .github/
|   `-- workflows/
|       `-- playwright.yml
|-- automation-test-playwright/
|   |-- config/
|   |-- fixtures/
|   |-- pages/
|   |-- test-data/
|   |-- tests/
|   |   |-- api/
|   |   `-- e2e/
|   |-- utils/
|   |-- package.json
|   `-- playwright.config.ts
|-- moonNest-main/
|   |-- estate_db_generator/
|   |-- src/
|   |-- pom.xml
|   `-- README.md
`-- README.md
```

## 4. Thanh Phan Chinh

`moonNest-main/` la ung dung Spring Boot cua he thong MoonNest. Thu muc nay chua ma nguon backend, controller, API, service, repository, template Thymeleaf, cau hinh moi truong va du lieu SQL de khoi tao database.

`automation-test-playwright/` la framework kiem thu tu dong bang Playwright + TypeScript. Framework nay chua Page Object Model, fixture, helper, test data, API test, E2E test va cau hinh bao cao.

`.github/workflows/playwright.yml` la workflow CI. Workflow tu khoi tao MySQL, import du lieu kiem thu, chay backend MoonNest tren GitHub Actions runner, sau do thuc thi regression suite bang Playwright.

## 5. Chay Du An Local

Chay backend MoonNest:

```powershell
cd moonNest-main
$env:SPRING_PROFILES_ACTIVE="mysql,local-nooauth"
.\mvnw.cmd spring-boot:run
```

Kiem tra ung dung:

```text
http://localhost:8080/moonnest
http://localhost:8080/login
```

Chay automation test o terminal khac:

```powershell
cd automation-test-playwright
npm install
npx playwright install chromium
npm run typecheck
npm run test:ci
```

Mo bao cao Playwright:

```powershell
npm run report:open
```

## 6. Cac Lenh Kiem Thu

```powershell
npm run test:api
npm run test:e2e
npm run test:smoke
npm run test:regression
npm run test:ci
```

Trong do:

- `test:api`: chay cac test kiem thu API.
- `test:e2e`: chay cac test giao dien theo luong nguoi dung.
- `test:smoke`: chay nhom test nhanh cho chuc nang quan trong.
- `test:regression`: chay bo kiem thu hoi quy.
- `test:ci`: kiem tra TypeScript va chay regression suite.

## 7. CI Voi GitHub Actions

Workflow `playwright.yml` duoc cau hinh de chay tu dong khi push len `main`, `master`, khi tao pull request hoac khi chay thu cong tu tab Actions.

Quy trinh CI gom:

- Checkout ma nguon.
- Khoi tao MySQL container.
- Import du lieu tu `moonNest-main/estate_db_generator/sql_estate.sql`.
- Cai Java 21 va Node.js.
- Khoi dong backend MoonNest tren `localhost:8080`.
- Cho backend san sang qua URL `/moonnest`.
- Cai dependency va Chromium cho Playwright.
- Kiem tra TypeScript.
- Chay regression suite.
- Upload HTML report va test artifacts.

Nho do, du an co the kiem thu tu dong ngay tren GitHub Actions ma khong can server test rieng.

## 8. Tai Khoan Kiem Thu Mau

Tai khoan mac dinh trong du lieu seed local:

```text
Admin: manh1709 / 12345678
Staff: tmq0102 / 12345678
Customer: abcVietNam / 12345678
```

## 9. Bao Cao Kiem Thu

Ket qua chay test duoc luu trong:

```text
automation-test-playwright/.runtime/playwright-report
automation-test-playwright/.runtime/test-results
automation-test-playwright/.runtime/junit
```

Tren GitHub Actions, cac bao cao duoc upload tai muc Artifacts cua tung workflow run.

## 10. Tai Lieu Lien Quan

- `moonNest-main/README.md`: huong dan chay ung dung MoonNest.
- `automation-test-playwright/README.md`: huong dan su dung framework Playwright.
- `automation-test-playwright/docs/`: tai lieu kien truc, reporting va coverage.
