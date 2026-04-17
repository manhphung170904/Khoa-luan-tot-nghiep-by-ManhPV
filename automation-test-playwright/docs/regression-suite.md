# Regression suite

## 1. Muc tieu
Regression suite gom cac luong co rui ro cao va can duoc giu on dinh sau moi lan thay doi ma nguon.

## 2. Nhom suite
- `@smoke`: chay nhanh de kiem tra he thong con song.
- `@regression`: bo luong hoi quy chinh.
- `@extended`: bo mo rong, dung khi can do phu cao hon.

## 3. Lenh chay
```bash
npm run test:smoke
npm run test:regression
npm run test:regression:core
npm run test:regression:extended
```

## 4. Tieu chi chon test
- dang nhap va phan quyen
- dashboard
- cac list page quan trong
- luong hoa don, hop dong, thanh toan
- API quan trong cho admin

## 5. API roadmap theo nhom

- `auth`: smoke truoc vi la dependency cua toan bo role-based suite.
- `public`: smoke va regression nhe, doc lap auth.
- `admin`: chia theo module con, bat dau tu `security matrix`.
- `staff`: readonly, invoice CRUD, profile.
- `customer`: readonly, property-request, profile.
- `payment`: QR render va confirm sau khi customer + invoice on dinh.
