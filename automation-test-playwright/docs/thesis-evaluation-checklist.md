# Checklist Danh Gia Cho Khoa Luan

Checklist nay dung de doi chieu framework truoc khi dua vao bao cao hoac bao ve khoa luan.

## 1. Kien Truc Framework

- [x] Co cau truc thu muc tach ro `tests`, `pages`, `fixtures`, `utils`, `test-data`, `config`.
- [x] Co Page Object Model cho cac man hinh UI.
- [x] Co API client/helper de giam trung lap trong API test.
- [x] Co fixture theo role: admin, staff, customer, anonymous.
- [x] Co cau hinh moi truong local/dev/test/staging.
- [x] Co TypeScript typecheck.

## 2. Chien Luoc Test

- [x] Co API test.
- [x] Co E2E test.
- [x] Co smoke/regression tag.
- [x] Chi giu hai tag chinh `@smoke` va `@regression` de de trinh bay.
- [x] Co Test ID trong title cua test case.
- [x] Co mau bang test case chuan de dua vao phu luc.
- [ ] Co file export test case tu dong dang CSV/Excel neu can nop kem.

## 3. Du Lieu Test

- [x] Co `TestDataFactory` tao du lieu dong.
- [x] Co `runToken` de truy vet du lieu sinh ra trong mot lan chay.
- [x] Co cleanup registry cho API test.
- [x] Co global teardown quet du lieu orphan.
- [x] Co cleanup file upload trong whitelist.
- [ ] Co tai lieu rieng ve seed data va mapping environment neu can trinh bay chi tiet.

## 4. Reporting Va Debug

- [x] Co HTML report.
- [x] Co JUnit report.
- [x] Co screenshot khi UI test loi.
- [x] Co video khi UI test loi.
- [x] Co trace tren retry.
- [x] Co API response attachment khi API test loi.
- [x] Co huong dan luu mau report de dua vao phu luc.
- [ ] Co anh chup report mau da luu tu mot lan chay thuc te.

## 5. CI/CD

- [x] Co GitHub Actions workflow.
- [x] CI khoi tao MySQL.
- [x] CI import seed database.
- [x] CI khoi dong backend that.
- [x] CI chay typecheck.
- [x] CI chay Playwright regression.
- [x] CI upload report/artifact.
- [x] Co tai lieu mo ta luong CI/CD va loi ich.
- [x] CI co the dung `test:ci` de chay typecheck va regression.

## 6. Diem Manh Co The Trinh Bay

- Framework test tach rieng voi ung dung nhung van chay tren backend that.
- Bao phu ca API va E2E.
- Co co che session theo role, phu hop ung dung co phan quyen.
- Co cleanup du lieu va file upload, giam rui ro lam ban moi truong test.
- Co report va artifact de phan tich loi.
- Co CI tao moi moi truong test tren runner.

## 7. Gioi Han Nen Neu Ro

- Chua co visual regression.
- Chua co performance/load test.
- Chua co accessibility test.
- Coverage hien duoc quan ly qua cau truc test va convention, chua co dashboard tu dong.
- Cac test co tao/sua/xoa du lieu can moi truong test rieng va cleanup on dinh.

## 8. Viec Nen Lam Truoc Khi Bao Ve

- Chay `npm.cmd run typecheck`.
- Chay smoke hoac regression safe tren local.
- Luu anh chup HTML report.
- Luu anh chup mot workflow run tren GitHub Actions.
- Chuan bi bang tom tat so luong test API/E2E theo module.
- Chuan bi bang test case chuan gom Test ID, module, actor, precondition, steps, expected result, layer, priority va tag.
- Chuan bi mot vi du loi va cach framework ho tro debug bang screenshot/trace/API attachment.
