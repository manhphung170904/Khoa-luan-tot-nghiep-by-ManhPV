# Framework Playwright cho MoonNest

## 1. Mục tiêu
Đây là framework kiểm thử tự động bằng Playwright + TypeScript được thiết kế riêng cho hệ thống MoonNest. Framework được xây dựng nhằm phục vụ dự án thực tế và trình bày trong luận văn tốt nghiệp, với các tiêu chí ưu tiên:
- **Cấu trúc lớp rõ ràng**: Tách biệt code test, page object, fixture và helper.
- **Tối ưu hóa hiệu năng**: Sử dụng session reuse và chạy song song.
- **Dễ bảo trì và mở rộng**: Thiết kế theo module, dễ dàng thêm test case mới.
- **Báo cáo chi tiết**: Tích hợp HTML Report, JUnit và lưu vết (trace, video, screenshot) khi lỗi.

## 2. Cấu trúc thư mục hiện tại

```text
automation-test-playwright/
|-- .github/                # GitHub Actions CI workflows
|-- .runtime/               # Toàn bộ kết quả chạy test
|   |-- html-report/        # Báo cáo dạng giao diện web
|   |-- junit/              # Báo cáo dạng XML cho CI/CD
|   `-- test-results/       # Screenshot, video, trace theo từng run
|-- config/                 # Cấu hình môi trường (env, paths, setup/teardown)
|-- docs/                   # Tài liệu chi tiết về kiến trúc và hướng dẫn
|-- fixtures/               # Playwright fixtures (adminApi, staffApi, customerApi, basePage...)
|-- pages/                  # Page Object Model (POM) phân theo module (admin, customer, staff...)
|   `-- core/               # Base classes và common UI components
|-- test-data/              # Dữ liệu mẫu (JSON) và code tạo dữ liệu ảo
|-- tests/                  # Mã nguồn kiểm thử
|   |-- api/                # Test API (Backend services)
|   `-- e2e/                # Test End-to-End (Chạy trình duyệt thật)
|-- utils/                  # Thư viện tiện ích
|   |-- api/                # Helper xử lý request, session, endpoint
|   |-- db/                 # DB Client (MySQL) để verify dữ liệu trực tiếp
|   `-- helpers/            # Tiện ích chung (assertion, date, string)
|-- .env                    # Biến môi trường (Local-only, không commit)
|-- package.json            # Scripts và dependencies
|-- playwright.config.ts    # Cấu hình chính của Playwright
`-- tsconfig.json           # Cấu hình TypeScript
```

## 3. Ý nghĩa các lớp thành phần
- **`tests/api/`**: Kiểm thử các endpoint RESTful, đảm bảo logic nghiệp vụ và phân quyền ở mức Backend.
- **`tests/e2e/`**: Kiểm thử luồng trải nghiệm người dùng từ đầu đến cuối trên trình duyệt (UI testing).
- **`fixtures/`**: Cung cấp các context đã được "tiêm" sẵn (như phiên đăng nhập của Admin/Staff) để các file test sử dụng ngay mà không cần lặp lại logic login.
- **`pages/`**: Hiện thực POM, giúp code test dễ đọc hơn bằng cách tập trung vào hành động (action) thay vì selector CSS/XPath.
- **`utils/db/`**: Cho phép truy vấn trực tiếp vào cơ sở dữ liệu để kiểm tra trạng thái dữ liệu đã được lưu đúng chưa sau các thao tác API/UI.
- **`.runtime/`**: Điểm tập trung duy nhất cho mọi output của test. Thư mục này được làm mới hoặc dọn dẹp định kỳ bởi `global-setup`.

## 4. Các lệnh sử dụng chính

Cài đặt ban đầu:
```bash
npm install
npx playwright install chromium
```

Chạy toàn bộ test suite:
```bash
npm test
```

Chạy theo nhóm test:
```bash
npm run test:api         # Chỉ chạy API test
npm run test:e2e         # Chỉ chạy E2E test
npm run test:smoke       # Chạy bộ test Smoke (các luồng trọng yếu nhất)
npm run test:regression  # Chạy bộ test hồi quy đầy đủ
```

Xem báo cáo kết quả:
```bash
npm run report:open      # Mở HTML Report của lần chạy gần nhất
```

## 5. Chế độ an toàn dữ liệu (Destructive Tests)
Mặc định, các test có khả năng làm thay đổi dữ liệu nghiêm trọng (xóa, đổi mật khẩu, đổi username...) sẽ bị giới hạn để bảo vệ môi trường test chung.
Chỉ bật khi cần thiết (thường dùng trong CI hoặc local test environment riêng):

```bash
# Windows (PowerShell)
$env:ALLOW_DESTRUCTIVE_TESTS="true"
npm run test:api:destructive
```

## 6. Quản lý Session và Auth
Framework sử dụng `ApiSessionHelper` để quản lý các phiên đăng nhập. Thay vì phải đăng nhập thủ công cho mỗi test case, bạn có thể gọi trực tiếp các fixture:
- `adminApi` / `adminPage`
- `staffApi` / `staffPage`
- `customerApi` / `customerPage`

Các session này được khởi tạo thông minh và tái sử dụng thông qua Playwright context để tối ưu thời gian chạy.

## 7. Quy ước quan trọng
- **Locator**: Ưu tiên sử dụng `data-testid` hoặc các thuộc tính hướng tiếp cận (Accessible roles).
- **Data Cleanup**: Mọi dữ liệu tạm tạo ra trong lúc test (như temp building, temp user) phải được dọn dẹp sạch sẽ sau khi test xong thông qua `cleanupRegistry` hoặc DB query.
- **Assertion**: Kết hợp kiểm tra phản hồi API và kiểm tra trạng thái trực tiếp trong Database (`utils/db`) để đảm bảo tính toàn vẹn của dữ liệu.

---
*Chi tiết hơn về cách sử dụng từng component, vui lòng đọc các tài liệu trong thư mục `docs/`.*
