import { env } from "@config/env";
import { runtimePaths } from "@config/paths";

export class TestDataFactory {
  static readonly missingId = 999999999;
  static readonly missingSmallId = 999999;
  static readonly invoiceStatus = {
    pending: "PENDING",
    paid: "PAID",
    overdue: "OVERDUE"
  } as const;

  static readonly paymentMethod = {
    bankQr: "BANK_QR"
  } as const;

  static readonly transactionType = {
    rent: "FOR_RENT",
    sale: "FOR_SALE"
  } as const;

  static readonly testAmount = {
    staffInvoiceUpdateTotal: 9999,
    adminInvoiceUpdateTotal: 19999,
    adminInvoiceRejectedUpdateTotal: 99999
  } as const;

  static readonly testDate = {
    farPastDueDate: "2000-01-01"
  } as const;

  private static uniqueCounter = 0;

  static runToken(): string {
    return runtimePaths.runId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(-8)
      .padStart(8, "0");
  }

  private static taoChuoiSoDuyNhat(length = 10): string {
    const timestamp = Date.now().toString();
    const counter = (this.uniqueCounter++ % 1000000).toString().padStart(6, "0");
    return `${timestamp}${counter}`.slice(-length);
  }

  private static baseDate(): Date {
    const configured = process.env.TEST_BASE_DATE;
    const parsed = configured ? new Date(configured) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private static formatDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  private static addMonths(value: Date, months: number): Date {
    const result = new Date(value);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  static taoMaDuyNhat(prefix = "pw"): string {
    const timestamp = Date.now().toString(36);
    const counter = (this.uniqueCounter++ % 1679616).toString(36).padStart(4, "0");
    return `${prefix}-${this.runToken()}-${timestamp}-${counter}`;
  }

  static assertIncludesRunToken(value: string, label = "test data value"): void {
    if (!value.toLowerCase().includes(this.runToken())) {
      throw new Error(`${label} must include runToken ${this.runToken()} to keep cleanup safe and parallel-friendly.`);
    }
  }

  static taoHauToDuyNhat(prefix = "pw"): string {
    return this.taoMaDuyNhat(prefix);
  }

  static taoChuoiDinhDanh(prefix = "pw"): string {
    return this.taoMaDuyNhat(prefix).replace(/[^a-z0-9]/gi, "");
  }

  static taoUsername(prefix = "pw"): string {
    return this.taoChuoiDinhDanh(prefix).slice(0, 30);
  }

  static taoTenToaNha(prefix = "PW Building"): string {
    return `${prefix} ${this.taoHauToDuyNhat("building")}`;
  }

  static taoTenKhachHang(prefix = "PW Customer"): string {
    return `${prefix} ${this.taoHauToDuyNhat("customer")}`;
  }

  static taoEmail(prefix = "pw-user"): string {
    return `${this.taoMaDuyNhat(prefix)}@example.com`;
  }

  static taoSoDienThoai(): string {
    return `0${this.taoChuoiSoDuyNhat(9)}`;
  }

  static taoMaSo(prefix = "PW", digits = 10): string {
    const runDigits = this.runToken().replace(/\D/g, "").slice(-Math.min(4, digits));
    const remainingDigits = digits - runDigits.length;
    return `${prefix}${runDigits}${remainingDigits > 0 ? this.taoChuoiSoDuyNhat(remainingDigits) : ""}`;
  }

  static buildAdminStaffPayload(
    overrides: Record<string, unknown> = {},
    role: "STAFF" | "ADMIN" = "STAFF"
  ): Record<string, unknown> {
    const suffix = this.taoHauToDuyNhat(role.toLowerCase());
    return {
      username: this.taoUsername(role.toLowerCase()),
      password: env.defaultPassword,
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
      username: this.taoUsername("pwcust"),
      password: env.defaultPassword,
      fullName: `PW Customer ${suffix}`,
      phone: this.taoSoDienThoai(),
      email: this.taoEmail("pw-customer"),
      staffIds: [],
      ...overrides
    };
  }

  static buildBuildingPayload(
    overrides: Record<string, unknown> = {},
    transactionType: "FOR_RENT" | "FOR_SALE" = TestDataFactory.transactionType.rent
  ): Record<string, unknown> {
    const suffix = this.taoHauToDuyNhat("building");
    return {
      districtId: env.testDataSeed.districtId,
      numberOfFloor: 10,
      numberOfBasement: 1,
      floorArea: 200,
      rentPrice: transactionType === TestDataFactory.transactionType.rent ? 1000000 : null,
      deposit: transactionType === TestDataFactory.transactionType.rent ? 2000000 : null,
      serviceFee: transactionType === TestDataFactory.transactionType.rent ? 100000 : null,
      carFee: transactionType === TestDataFactory.transactionType.rent ? 50000 : null,
      motorbikeFee: transactionType === TestDataFactory.transactionType.rent ? 20000 : null,
      waterFee: transactionType === TestDataFactory.transactionType.rent ? 15000 : null,
      electricityFee: transactionType === TestDataFactory.transactionType.rent ? 3500 : null,
      salePrice: transactionType === TestDataFactory.transactionType.sale ? 3000000000 : null,
      name: `PW Building ${suffix}`,
      ward: env.testDataSeed.ward,
      street: env.testDataSeed.street,
      propertyType: "OFFICE",
      transactionType,
      direction: "DONG",
      level: "A",
      taxCode: this.taoMaSo("PW", 10),
      linkOfBuilding: "https://example.com",
      image: null,
      rentAreaValues: "50,100",
      latitude: env.testDataSeed.latitude,
      longitude: env.testDataSeed.longitude,
      staffIds: [],
      ...overrides
    };
  }

  static buildContractPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const baseDate = this.baseDate();
    const startDate = new Date(baseDate.getFullYear(), 0, 1);
    const endDate = new Date(baseDate.getFullYear() + 1, 11, 31);

    return {
      customerId: env.testDataSeed.customerId,
      buildingId: env.testDataSeed.buildingId,
      staffId: env.testDataSeed.staffId,
      rentPrice: 1000000,
      rentArea: 50,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      status: "ACTIVE",
      ...overrides
    };
  }

  static buildInvoicePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const invoiceDate = this.baseDate();
    invoiceDate.setMonth(invoiceDate.getMonth() - 1);
    const month = invoiceDate.getMonth() + 1;
    const year = invoiceDate.getFullYear();
    const dueDateValue = new Date(year, month, 10);
    const dueDate = `${dueDateValue.getFullYear()}-${String(dueDateValue.getMonth() + 1).padStart(2, "0")}-10`;

    return {
      contractId: env.testDataSeed.contractId,
      customerId: env.testDataSeed.customerId,
      month,
      year,
      status: TestDataFactory.invoiceStatus.pending,
      dueDate,
      totalAmount: 1500000,
      details: [{ description: "Phi dich vu test", amount: 1500000 }],
      electricityUsage: 10,
      waterUsage: 5,
      ...overrides
    };
  }

  static buildSaleContractPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      buildingId: env.testDataSeed.buildingId,
      customerId: env.testDataSeed.customerId,
      staffId: env.testDataSeed.staffId,
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
    const desiredStartDate = this.addMonths(this.baseDate(), 2);
    const desiredEndDate = this.addMonths(desiredStartDate, 12);

    return {
      buildingId: env.testDataSeed.buildingId,
      requestType,
      desiredArea: requestType === "RENT" ? 80 : null,
      desiredStartDate: requestType === "RENT" ? this.formatDate(desiredStartDate) : null,
      desiredEndDate: requestType === "RENT" ? this.formatDate(desiredEndDate) : null,
      offeredPrice: requestType === "BUY" ? 3100000000 : 1200000,
      message: `Playwright property request ${this.taoHauToDuyNhat("request")}`,
      ...overrides
    };
  }
}
