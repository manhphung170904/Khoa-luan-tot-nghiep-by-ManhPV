export class TestSafetyHelper {
  static allowDestructiveTests(): boolean {
    const value = process.env.ALLOW_DESTRUCTIVE_TESTS?.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  }

  static skipIfDestructiveTestsDisabled(test: { skip: (condition: boolean, description: string) => void }): void {
    test.skip(
      !this.allowDestructiveTests(),
      "Đã tắt test phá dữ liệu để bảo vệ tài khoản và dữ liệu thật. Chỉ bật khi chạy trên môi trường test riêng."
    );
  }
}
