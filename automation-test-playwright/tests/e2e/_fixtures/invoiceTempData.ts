import { expect, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

export type TempInvoiceRecord = {
  id: number;
  contractId: number;
  customerId: number;
  month: number;
  year: number;
  status: "PENDING" | "PAID" | "OVERDUE";
};

export const DEFAULT_CONTRACT_VALUES = {
  rentArea: 50,
  rentPricePerSquareMeter: 1_000_000,
  serviceFee: 100_000,
  carFee: 50_000,
  motorbikeFee: 20_000,
  electricityFee: 3_500,
  waterFee: 15_000
} as const;

type InvoiceSeedOverrides = Partial<{
  month: number;
  year: number;
  dueDate: string;
  electricityUsage: number;
  waterUsage: number;
  status: "PENDING" | "PAID" | "OVERDUE";
}>;

export function previousInvoicePeriod(baseDate = new Date()): { month: number; year: number; dueDate: string } {
  const invoiceDate = new Date(baseDate);
  invoiceDate.setMonth(invoiceDate.getMonth() - 1);

  const month = invoiceDate.getMonth() + 1;
  const year = invoiceDate.getFullYear();
  const dueDate = new Date(year, month, 15).toISOString().slice(0, 10);

  return { month, year, dueDate };
}

export function buildManagedInvoicePayload(
  contract: TempContract,
  overrides: InvoiceSeedOverrides = {}
): Record<string, unknown> {
  const period = previousInvoicePeriod();
  const month = overrides.month ?? period.month;
  const year = overrides.year ?? period.year;
  const dueDate = overrides.dueDate ?? period.dueDate;
  const electricityUsage = overrides.electricityUsage ?? 18;
  const waterUsage = overrides.waterUsage ?? 7;

  const rentAmount = DEFAULT_CONTRACT_VALUES.rentArea * DEFAULT_CONTRACT_VALUES.rentPricePerSquareMeter;
  const electricityAmount = electricityUsage * DEFAULT_CONTRACT_VALUES.electricityFee;
  const waterAmount = waterUsage * DEFAULT_CONTRACT_VALUES.waterFee;

  const details = [
    { description: "Tiền thuê mặt bằng", amount: rentAmount },
    { description: "Phí dịch vụ", amount: DEFAULT_CONTRACT_VALUES.serviceFee },
    { description: "Phí gửi ô tô", amount: DEFAULT_CONTRACT_VALUES.carFee },
    { description: "Phí gửi xe máy", amount: DEFAULT_CONTRACT_VALUES.motorbikeFee },
    { description: "Phí điện", amount: electricityAmount },
    { description: "Phí nước", amount: waterAmount }
  ];

  const totalAmount = details.reduce((sum, item) => sum + Number(item.amount), 0);

  return TestDataFactory.buildInvoicePayload({
    contractId: contract.id,
    customerId: contract.customer.id,
    month,
    year,
    dueDate,
    status: overrides.status ?? "PENDING",
    totalAmount,
    details,
    electricityUsage,
    waterUsage
  });
}

export async function createTempContractScenario(adminApi: APIRequestContext): Promise<TempContract> {
  return TempEntityHelper.taoContractTam(adminApi);
}

export async function createManagedInvoiceForContract(
  adminApi: APIRequestContext,
  contract: TempContract,
  overrides: InvoiceSeedOverrides = {}
): Promise<TempInvoiceRecord> {
  const payload = buildManagedInvoicePayload(contract, overrides);
  const createResponse = await adminApi.post("/api/v1/admin/invoices", {
    failOnStatusCode: false,
    data: payload
  });

  expect(createResponse.status(), "Khong tao duoc invoice tam cho E2E").toBe(200);

  const rows = await MySqlDbClient.query<{ id: number }>(
    `
      SELECT id
      FROM invoice
      WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [contract.id, contract.customer.id, payload.month, payload.year]
  );

  expect(rows.length, "Khong tim thay invoice vua tao trong DB").toBeGreaterThan(0);

  return {
    id: rows[0]!.id,
    contractId: contract.id,
    customerId: contract.customer.id,
    month: Number(payload.month),
    year: Number(payload.year),
    status: String(payload.status) as TempInvoiceRecord["status"]
  };
}

export async function deleteInvoiceIfPresent(adminApi: APIRequestContext, invoiceId?: number): Promise<void> {
  if (!invoiceId) {
    return;
  }

  const invoiceRows = await MySqlDbClient.query<{ id: number; contract_id: number; month: number; year: number }>(
    "SELECT id, contract_id, month, year FROM invoice WHERE id = ? LIMIT 1",
    [invoiceId]
  );

  if (!invoiceRows.length) {
    return;
  }

  const invoice = invoiceRows[0]!;
  const response = await adminApi.delete(`/api/v1/admin/invoices/${invoiceId}`, {
    failOnStatusCode: false
  });

  if ([200, 204, 404].includes(response.status())) {
    return;
  }

  await MySqlDbClient.execute(
    "DELETE FROM utility_meter WHERE contract_id = ? AND month = ? AND year = ?",
    [invoice.contract_id, invoice.month, invoice.year]
  );
  await MySqlDbClient.execute("DELETE FROM invoice_detail WHERE invoice_id = ?", [invoiceId]);
  await MySqlDbClient.execute("DELETE FROM invoice WHERE id = ?", [invoiceId]);
}

export async function cleanupContractScenario(
  adminApi: APIRequestContext,
  contract: TempContract | null,
  invoiceIds: number[] = []
): Promise<void> {
  for (const invoiceId of invoiceIds) {
    await deleteInvoiceIfPresent(adminApi, invoiceId);
  }

  if (contract) {
    await TempEntityHelper.xoaContractTam(adminApi, contract);
  }
}
