# Huong dan report Playwright

## 1. Cac loai report dang bat
- HTML report
- JUnit XML
- Screenshot khi fail
- Video khi fail
- Trace khi retry lan dau

## 2. Vi tri luu file
- HTML report: `playwright-report/`
- JUnit: `reports/junit/results.xml`
- Artifact khi fail: `artifacts/test-results/`
- Storage state: `playwright/.auth/`

## 3. Lenh mo report
```bash
npm run report
npm run report:open
```

## 4. Y nghia doi voi debug
- Screenshot giup nhin nhanh trang thai loi.
- Video giup xem lai toan bo thao tac.
- Trace giup phan tich locator, network, step, timing.

## 5. Y nghia doi voi regression
Report la bang chung ro rang de so sanh truoc va sau khi sua he thong. Day la mot phan rat quan trong khi trinh bay trong luan van.
