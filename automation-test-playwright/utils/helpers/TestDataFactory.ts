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

  static taoSoDienThoai(): string {
    const suffix = String(Date.now()).slice(-9);
    return `0${suffix.padStart(9, "0")}`;
  }

  static buildAdminStaffPayload(
    overrides: Record<string, unknown> = {},
    role: "STAFF" | "ADMIN" = "STAFF"
  ): Record<string, unknown> {
    const suffix = this.taoHauToDuyNhat(role.toLowerCase());
    return {
      username: `${role.toLowerCase()}${String(Date.now()).slice(-8)}`,
      password: "12345678",
      fullName: `PW ${role} ${suffix}`,
      phone: this.taoSoDienThoai(),
      email: this.taoEmail(`pw-${role.toLowerCase()}`),
      role,
      ...overrides
    };
  }

  static buildCustomerPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const suffix = this.taoHauToDuyNhat("customer");
    return {
      username: `pwcust${String(Date.now()).slice(-8)}`,
      password: "12345678",
      fullName: `PW Customer ${suffix}`,
      phone: this.taoSoDienThoai(),
      email: this.taoEmail("pw-customer"),
      staffIds: [],
      ...overrides
    };
  }

  static buildBuildingPayload(
    overrides: Record<string, unknown> = {},
    transactionType: "FOR_RENT" | "FOR_SALE" = "FOR_RENT"
  ): Record<string, unknown> {
    const suffix = this.taoHauToDuyNhat("building");
    return {
      districtId: 1,
      numberOfFloor: 10,
      numberOfBasement: 1,
      floorArea: 200,
      rentPrice: transactionType === "FOR_RENT" ? 1000000 : null,
      deposit: transactionType === "FOR_RENT" ? 2000000 : null,
      serviceFee: transactionType === "FOR_RENT" ? 100000 : null,
      carFee: transactionType === "FOR_RENT" ? 50000 : null,
      motorbikeFee: transactionType === "FOR_RENT" ? 20000 : null,
      waterFee: transactionType === "FOR_RENT" ? 15000 : null,
      electricityFee: transactionType === "FOR_RENT" ? 3500 : null,
      salePrice: transactionType === "FOR_SALE" ? 3000000000 : null,
      name: `PW Building ${suffix}`,
      ward: "Xuan La",
      street: "Vo Chi Cong",
      propertyType: "OFFICE",
      transactionType,
      direction: "DONG",
      level: "A",
      taxCode: `PW-${Date.now()}`,
      linkOfBuilding: "https://example.com",
      image: null,
      rentAreaValues: "50,100",
      latitude: 21.0686,
      longitude: 105.8033,
      staffIds: [],
      ...overrides
    };
  }

  static buildContractPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      customerId: 1,
      buildingId: 1,
      staffId: 1,
      rentPrice: 1000000,
      rentArea: 50,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "ACTIVE",
      ...overrides
    };
  }

  static buildInvoicePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const invoiceDate = new Date();
    invoiceDate.setMonth(invoiceDate.getMonth() - 1);
    const month = invoiceDate.getMonth() + 1;
    const year = invoiceDate.getFullYear();

    return {
      contractId: 1,
      customerId: 1,
      month,
      year,
      status: "PENDING",
      dueDate: new Date(year, month, 10).toISOString().slice(0, 10),
      totalAmount: 1500000,
      details: [{ description: "Phi dich vu test", amount: 1500000 }],
      electricityUsage: 10,
      waterUsage: 5,
      ...overrides
    };
  }

  static buildSaleContractPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      buildingId: 1,
      customerId: 1,
      staffId: 1,
      salePrice: 3000000000,
      transferDate: null,
      note: "Hop dong mua ban test",
      ...overrides
    };
  }

  static buildPropertyRequestPayload(
    overrides: Record<string, unknown> = {},
    requestType: "RENT" | "BUY" = "RENT"
  ): Record<string, unknown> {
    return {
      buildingId: 1,
      requestType,
      desiredArea: requestType === "RENT" ? 80 : null,
      desiredStartDate: requestType === "RENT" ? "2026-06-01" : null,
      desiredEndDate: requestType === "RENT" ? "2027-05-31" : null,
      offeredPrice: requestType === "BUY" ? 3100000000 : 1200000,
      message: `Playwright property request ${this.taoHauToDuyNhat("request")}`,
      ...overrides
    };
  }
}
