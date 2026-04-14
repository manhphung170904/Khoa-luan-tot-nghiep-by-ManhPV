# Giai thich POM

## 1. Muc dich
POM giup tach logic thao tac giao dien ra khoi test script. Nh? do:
- test ngan gon hon
- locator khong bi lap lai
- de sua khi UI thay doi

## 2. Cau truc POM hien tai
- `pages/auth/`: login, register, forgot password, reset password
- `pages/admin/`: man hinh admin
- `pages/staff/`: man hinh staff
- `pages/customer/`: man hinh customer
- `pages/public/`: man hinh public
- `pages/core/`: lop dung chung nhu `BasePage`, `RoutedCrudFormPage`, `RoutedCrudDetailPage`

## 3. Nguyen tac
- Moi class dai dien cho mot page.
- Method trong POM mo ta hanh vi nguoi dung.
- Assertion don gian co the dat trong POM neu lien quan truc tiep den viec page da load.
- Assertion nghiep vu nen dat trong test script.

## 4. Vi du ngan
```ts
const loginPage = new LoginPage(page);
await loginPage.open();
await loginPage.login("manh1709", "12345678");
```
