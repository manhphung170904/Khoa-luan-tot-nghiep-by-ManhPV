# Tong Quan Kien Truc Framework

Tai lieu nay mo ta kien truc framework Playwright cua MoonNest de dung trong van hanh va trinh bay khoa luan.

## 1. Muc Tieu Thiet Ke

Framework duoc thiet ke theo cac muc tieu:

- Tach biet test script voi chi tiet thao tac giao dien.
- Tai su dung session, API context, page object va test data.
- Ho tro ca API test va E2E test trong cung mot framework.
- Dam bao du lieu test co the tao moi va don sau khi chay.
- Tao report va artifact de phan tich loi.
- Co the chay local va tich hop CI.

## 2. Kien Truc Lop

```text
Test specs
  -> Fixtures
    -> Page Objects / API Clients
      -> Helpers / DB Repositories / Test Data
        -> MoonNest application
```

`tests/` la noi mo ta kich ban kiem thu. Test khong nen chua nhieu chi tiet locator hoac logic tao data phuc tap.

`fixtures/` cap san cac doi tuong dung chung nhu `adminApi`, `staffApi`, `customerApi`, `anonymousApi`, `publicPage`, cleanup registry va metadata.

`pages/` dong vai tro Page Object Model. Moi class dai dien cho mot man hinh, mot modal hoac mot thanh phan giao dien.

`utils/api/` dong goi API client, helper dang nhap, assertion response va endpoint catalog.

`utils/db/` ket noi MySQL de doc/xac minh/truy vet du lieu khi can.

`utils/helpers/` gom cac helper tao du lieu, cleanup, normalize text, auth session va file upload.

## 3. Thanh Phan Noi Bat

### API fixture theo role

Framework tao API context rieng cho tung vai tro:

- `adminApi`
- `staffApi`
- `customerApi`
- `anonymousApi`

Cach nay giup test authorization ro rang va tranh lap lai logic dang nhap trong tung test case.

### Page Object Model

Page object duoc chia theo module:

- `admin`
- `staff`
- `customer`
- `auth`
- `public`
- `components`
- `core`

Nhom `core` chua cac base class nhu BasePage, routed page va CRUD page de giam trung lap.

### Quan ly du lieu test

`TestDataFactory` tao username, email, ten toa nha, so dien thoai va payload theo dinh dang thong nhat. Moi du lieu dong nen chua `runToken` de framework nhan dien va cleanup.

### Global setup va teardown

`global-setup.ts` tao thu muc runtime va don report cu.

`global-teardown.ts` quet du lieu test theo `runToken`, xoa ban ghi phu hop trong database va don file upload nam trong whitelist.

## 4. Gia Tri Cho Khoa Luan

Kien truc nay the hien cac diem quan trong cua mot automation framework:

- Modularity: chia thanh test, fixture, page object, helper, config.
- Maintainability: thay doi UI/API it anh huong den test case.
- Reusability: dung lai API client, POM, test data va cleanup.
- Reliability: co retry, timeout, artifact va cleanup.
- Traceability: test title co Test ID, metadata va report.

