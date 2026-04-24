export class TestSafetyHelper {
  static allowDestructiveTests(): boolean {
    const value = process.env.ALLOW_DESTRUCTIVE_TESTS?.trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  }

  static skipIfDestructiveTestsDisabled(test: { skip: (condition: boolean, description: string) => void }): void {
    test.skip(
      !this.allowDestructiveTests(),
      "Destructive tests are disabled to protect real accounts and data. Enable them only on an isolated test environment."
    );
  }
}
