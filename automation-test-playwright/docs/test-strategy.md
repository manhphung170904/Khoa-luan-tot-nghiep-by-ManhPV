# Chien Luoc Kiem Thu

Tai lieu nay tom tat pham vi kiem thu, cach phan loai test va muc do bao phu hien tai cua framework.

## 1. Cac Lop Kiem Thu

### API test

API test tap trung vao:

- Authentication va session.
- Authorization theo vai tro admin, staff, customer, anonymous.
- Status code va response body contract.
- Validation input.
- Business rule.
- CRUD/lifecycle flow.
- Upload file va OTP flow khi can.

### E2E test

E2E test tap trung vao:

- Hanh trinh nguoi dung tren UI.
- Dieu huong giua cac man hinh.
- Tim kiem, loc, phan trang.
- Them/sua/xoa du lieu qua giao dien.
- Modal, alert, form validation va trang thai rong.
- Cac luong nghiep vu quan trong nhu invoice, contract, sale contract, profile va payment.

## 2. Pham Vi Module

| Nhom | API spec | E2E spec | Ghi chu |
| ---  | ---: | ---: | --- |
| Admin | 10 | 11 | Bao phu CRUD va nghiep vu quan tri chinh |
| Staff | 3 | 7 | Bao phu dashboard, building, customer, contract, invoice, profile |
| Customer | 3 | 7 | Bao phu home, profile, contract, building, service, request, transaction |
| Auth | 2 | 3 | Bao phu login, registration, reset password va session |
| Public | 1 | 1 | Bao phu public building browsing |
| Payment | 1 | 1 | Bao phu QR payment va confirm payment |

## 3. Quy Mo Hien Tai

| Loai | So luong gan dung |
| --- | ---: |
| Spec file | 50 |
| API test case | 174 |
| E2E test case | 123 |

So lieu tren duoc thong ke tu thu muc `tests/` tai thoi diem ra soat.

## 4. Tag Va Suite

| Tag | Y nghia |
| --- | --- |
| `@regression` | Test hoi quy |
| `@smoke` | Test nhanh cho chuc nang quan trong |

Framework chi su dung hai tag tren trong title test. API/E2E duoc phan loai bang thu muc `tests/api`, `tests/e2e` va Playwright project `api`, `e2e`.

## 5. Cac Lenh Chay Theo Chien Luoc

```powershell
npm run test:smoke
npm run test:regression
npm run test:api
npm run test:e2e
npm run test:ci
```

## 6. Nguyen Tac Lua Chon Test Case

- Uu tien test API cho validation, authorization, business rule va lifecycle.
- Uu tien E2E cho luong nguoi dung, UI state va tich hop nhieu thanh phan.
- Khong lap lai tat ca case API tren UI neu UI khong tao them rui ro rieng.
- Cac case sua/xoa du lieu can co cleanup ro rang.
- Cac case phu thuoc seed data can dung `test-data/environments`.

## 7. Mau Bang Test Case Chuan

Moi test case nen co cac cot sau de dua vao phu luc khoa luan:

| Cot | Y nghia |
| --- | --- |
| Test ID | Ma dinh danh duy nhat, vi du `API-TC-001` |
| Module | Nhom chuc nang, vi du Auth, Admin Building, Customer Invoice |
| Actor | Vai tro thuc hien: Admin, Staff, Customer, Anonymous |
| Precondition | Dieu kien truoc khi chay test |
| Steps | Cac buoc thuc hien chinh |
| Expected result | Ket qua mong doi |
| Layer | `API` hoac `E2E` |
| Priority | `High`, `Medium`, `Low` |
| Tag | `@smoke`, `@regression` |

Mau bang:

| Test ID | Module | Actor | Precondition | Steps | Expected result | Layer | Priority | Tag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-TC-001 | Auth Login | Customer | Customer account ton tai | Gui request login voi username/password hop le | Tra ve JWT cookie va redirect dung | API | High | `@smoke @regression` |
| E2E-AUTH-LOGIN-003 | Auth Login | Customer | Backend va DB seed dang san sang | Mo trang login, nhap credential hop le, submit form | Dieu huong vao trang customer | E2E | High | `@regression` |
| E2E-PUB-BLD-001 | Public Building Browsing | Anonymous | Co du lieu toa nha trong seed DB | Mo trang public, quan sat filter va danh sach ket qua | Filter mac dinh va danh sach toa nha hien thi dung | E2E | Medium | `@regression` |

Co the sinh bang phu luc tu title test hien co. Title hien co thuong co dang:

```text
[TEST-ID] - Layer Actor Module - Feature - Expected behavior
```

Vi du:

```text
[API-TC-001] - API Authentication - Login - Valid Credentials Return JWT Cookie and Redirect @smoke
```

Khi tach title nay ra bang:

| Thanh phan | Gia tri |
| --- | --- |
| Test ID | `API-TC-001` |
| Layer | `API` |
| Module | `Authentication` |
| Feature | `Login` |
| Expected result | `Valid Credentials Return JWT Cookie and Redirect` |
| Tag | `@smoke` |

Neu can xuat bang day du, co the doc danh sach test title trong `tests/`, tach `Test ID`, `Layer`, `Module`, `Feature`, `Tag`, sau do bo sung thu cong `Precondition`, `Steps`, `Expected result` va `Priority` cho cac test case quan trong.

## 8. Khoang Trong Con Lai

Framework hien phu hop de trinh bay khoa luan automation testing. Cac huong co the mo rong sau:

- Visual regression testing.
- Performance/load testing.
- Accessibility testing.
- Dashboard thong ke coverage tu dong.
- Export danh sach test case sang CSV/Excel cho phu luc.
