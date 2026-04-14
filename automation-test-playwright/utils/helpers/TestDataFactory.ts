export class TestDataFactory {
  static taoHauToDuyNhat(prefix = "pw"): string {
    return `${prefix}-${Date.now()}`;
  }

  static taoTenToaNha(prefix = "PW Building"): string {
    return `${prefix} ${this.taoHauToDuyNhat("building")}`;
  }

  static taoTenKhachHang(prefix = "PW Customer"): string {
    return `${prefix} ${this.taoHauToDuyNhat("customer")}`;
  }

  static taoEmail(prefix = "pw-user"): string {
    return `${prefix}-${Date.now()}@example.com`;
  }
}
