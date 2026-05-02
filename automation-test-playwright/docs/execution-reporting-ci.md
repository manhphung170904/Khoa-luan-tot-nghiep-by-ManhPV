# Chay Test, Reporting Va CI

Tai lieu nay mo ta cach chay framework, doc report va luong CI cua MoonNest Playwright.

## 1. Dieu Kien Chay Local

- Node.js va npm.
- Playwright browser dependency.
- Backend MoonNest dang chay.
- Database MySQL da co du lieu seed.
- File `.env` hoac bien moi truong phu hop.

Khoi tao framework:

```powershell
cd automation-test-playwright
npm install
npx playwright install chromium
npm run typecheck
```

Neu PowerShell chan `npm`, dung `npm.cmd`.

## 2. Cach Chay Local Day Du

Can chay backend MoonNest truoc khi chay Playwright.

Tai thu muc goc repository:

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

Mo terminal khac de chay automation test:

```powershell
cd automation-test-playwright
npm.cmd run typecheck
npm.cmd run test:smoke
```

## 3. Cac Lenh Chay Test

```powershell
npm run test:api
npm run test:e2e
npm run test:smoke
npm run test:regression
npm run test:ci
```

Y nghia cac lenh:

| Lenh | Muc dich |
| --- | --- |
| `npm run test:api` | Chay toan bo API test trong `tests/api` |
| `npm run test:e2e` | Chay toan bo E2E test trong `tests/e2e` |
| `npm run test:smoke` | Chay cac test gan tag `@smoke`, phu hop de kiem tra nhanh |
| `npm run test:regression` | Chay cac test gan tag `@regression` |
| `npm run test:api:smoke` | Chay smoke test rieng cho API |
| `npm run test:api:regression` | Chay regression test rieng cho API |
| `npm run test:ci` | Chay typecheck va regression, phu hop pipeline |

Framework chi dung hai tag `@smoke` va `@regression`. API/E2E duoc phan loai bang thu muc va Playwright project. An toan du lieu duoc dam bao bang database test rieng, `runToken`, cleanup registry va global teardown, khong dung tag destructive rieng.

## 4. Cau Hinh Playwright

Framework co hai project chinh:

- `api`: chay cac file `*.api.spec.ts`, tat trace/screenshot/video.
- `e2e`: chay cac file trong `tests/e2e`, dung Desktop Chrome.

Reporter:

- HTML report.
- List reporter tren terminal.
- JUnit XML report.

Artifact khi loi:

- Screenshot.
- Video.
- Trace tren lan retry dau tien.
- API response debug attachment cho test API that bai.

## 5. Giai Thich Report Va Artifact

| Thanh phan | Vi tri | Y nghia |
| --- | --- | --- |
| HTML report | `.runtime/playwright-report` | Bao cao truc quan, xem duoc trang thai tung test, thoi gian chay, loi va attachment |
| JUnit report | `.runtime/junit` | File XML dung cho CI hoac cong cu tong hop ket qua test |
| Screenshot | `.runtime/test-results` | Anh chup tai thoi diem UI test loi |
| Video | `.runtime/test-results` | Video qua trinh chay UI test loi, giup xem lai thao tac truoc khi fail |
| Trace | `.runtime/test-results` | File trace cua Playwright, xem duoc action, DOM snapshot, network va console |
| API attachment | Trong HTML report | Body preview, status, header va URL cua API response khi can debug |

HTML report phu hop de dua vao bao cao khoa luan vi de minh hoa ket qua passed/failed/skipped. JUnit report phu hop de chung minh framework co the tich hop voi CI/CD va cac cong cu quan ly chat luong.

Screenshot, video va trace la bang chung debug. Khi trinh bay, co the chon mot test UI loi mau de minh hoa cach truy vet loi tu report den trace viewer.

## 6. Thu Muc Output

```text
.runtime/playwright-report
.runtime/test-results
.runtime/junit
```

Mo HTML report:

```powershell
npm run report:open
```

## 7. Luu Mau Report Cho Phu Luc Khoa Luan

De dua vao phu luc khoa luan, nen luu toi thieu cac bang chung sau sau mot lan chay on dinh:

1. Anh chup trang tong quan HTML report.
2. Anh chup danh sach test case trong report.
3. Anh chup chi tiet mot test passed.
4. Anh chup chi tiet mot test failed mau neu co.
5. File JUnit XML trong `.runtime/junit`.
6. Mot thu muc artifact gom screenshot/video/trace neu co test loi.
7. Anh chup workflow run va artifact tren GitHub Actions.

Goi y cach luu:

```text
appendix/
|-- playwright-html-report-overview.png
|-- playwright-test-detail.png
|-- playwright-junit-sample.xml
|-- github-actions-run.png
`-- github-actions-artifacts.png
```

Khong can commit thu muc `.runtime/`. Neu can luu bang chung cho khoa luan, nen copy anh chup/file mau sang thu muc phu luc rieng hoac chen truc tiep vao tai lieu khoa luan.

## 8. Luong GitHub Actions CI/CD

Workflow nam tai `.github/workflows/playwright.yml`.

Luong CI/CD:

```text
checkout
  -> MySQL service container
  -> import database
  -> setup Java/Node
  -> start backend MoonNest
  -> wait healthcheck
  -> install Playwright dependencies
  -> typecheck
  -> Playwright regression
  -> upload HTML report and artifacts
```

Quy trinh chi tiet:

1. Checkout source code.
2. Khoi tao MySQL service container.
3. Import database tu `moonNest-main/estate_db_generator/sql_estate.sql`.
4. Cai Java 21 va Node.js.
5. Khoi dong backend MoonNest bang Maven.
6. Cho backend san sang tai `http://localhost:8080/moonnest`.
7. Cai dependency Playwright va Chromium.
8. Chay TypeScript typecheck.
9. Chay regression test.
10. Upload HTML report va test artifacts.

Loi ich cua CI/CD:

- Tu dong hoa kiem thu hoi quy sau moi push hoac pull request.
- Phat hien loi som truoc khi merge code.
- Tai lap moi truong test gom database, backend va browser tren runner.
- Luu report va artifact de doi chieu ket qua.
- Giam phu thuoc vao viec chay test thu cong tren may ca nhan.

## 9. Cach Dung Report Trong Khoa Luan

Co the dua vao khoa luan cac bang chung:

- Anh chup HTML report tong quan.
- Danh sach passed/failed/skipped.
- Vi du trace viewer khi test loi.
- Vi du screenshot/video khi UI test loi.
- Log CI va artifact duoc upload.
- JUnit XML de chung minh framework ho tro tich hop tool bao cao.

## 10. Luu Y Van Hanh

- Khong commit `.runtime/`, `node_modules/` hoac `.env`.
- Chi chay automation tren database test rieng, khong dung database that.
- Neu thay doi seed data, can cap nhat `test-data/environments`.
- Neu them module moi, can bo sung test API/E2E va page object tuong ung.
