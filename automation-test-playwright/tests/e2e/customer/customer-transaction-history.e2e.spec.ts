import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CustomerTransactionHistoryPage } from "@pages/customer/CustomerTransactionHistoryPage";
import { cleanupContractScenario, createManagedInvoiceForContract, createTempContractScenario } from "../_fixtures/invoiceTempData";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

test.describe("Customer Transaction History E2E @regression", () => {
  let adminApi: APIRequestContext;
  let tempContract: TempContract | null = null;
  let invoiceId: number | null = null;
  let invoiceMonth = 0;
  let invoiceYear = 0;
  let invoiceTotalAmount = 0;

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    tempContract = await createTempContractScenario(adminApi);
    const invoice = await createManagedInvoiceForContract(adminApi, tempContract, { status: "PENDING" });

    invoiceId = invoice.id;
    invoiceMonth = invoice.month;
    invoiceYear = invoice.year;

    await MySqlDbClient.execute(
      `
        UPDATE invoice
        SET status = 'PAID',
            paid_date = CURRENT_TIMESTAMP,
            payment_method = 'BANK_QR',
            transaction_code = ?
        WHERE id = ?
      `,
      [`E2E-TX-${invoice.id}`, invoice.id]
    );

    const rows = await MySqlDbClient.query<{ total_amount: number }>("SELECT total_amount FROM invoice WHERE id = ?", [invoice.id]);
    invoiceTotalAmount = Number(rows[0]?.total_amount ?? 0);

    await loginAsTempUser(page, tempContract.customer.username);
    await page.goto("/customer/transaction/history");
  });

  test.afterEach(async () => {
    await cleanupContractScenario(adminApi, tempContract, invoiceId ? [invoiceId] : []);
    tempContract = null;
    invoiceId = null;
    invoiceMonth = 0;
    invoiceYear = 0;
    invoiceTotalAmount = 0;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-TXN-001] customer can view paid transaction summary and invoice detail", async ({ page }) => {
    const transactionPage = new CustomerTransactionHistoryPage(page);
    await transactionPage.expectLoaded();
    await transactionPage.expectSummaryVisible();
    await transactionPage.expectSummaryValues(1, invoiceTotalAmount.toLocaleString("vi-VN"));
    await transactionPage.expectResultCountBanner(1);
    await expect(transactionPage.rowByBuildingName(tempContract!.building.name)).toBeVisible();

    await transactionPage.openTransactionDetail(tempContract!.building.name);
    await transactionPage.expectDetailModalContains(tempContract!.building.name);
    await transactionPage.expectDetailModalContains(`Mã hóa đơn: ${invoiceId}`);
    await transactionPage.closeDetailModal();

    const rows = await MySqlDbClient.query<{ status: string; payment_method: string; transaction_code: string }>(
      "SELECT status, payment_method, transaction_code FROM invoice WHERE id = ?",
      [invoiceId]
    );
    expect(rows[0]?.status).toBe("PAID");
    expect(rows[0]?.payment_method).toBe("BANK_QR");
    expect(rows[0]?.transaction_code).toBe(`E2E-TX-${invoiceId}`);
  });

  test("[E2E-CUS-TXN-002] customer can filter transactions by invoice period", async ({ page }) => {
    const transactionPage = new CustomerTransactionHistoryPage(page);
    await transactionPage.expectLoaded();
    await transactionPage.filterByMonth(invoiceMonth);
    await transactionPage.filterByYear(invoiceYear);
    await transactionPage.submitFilters();
    await transactionPage.expectResultCountBanner(1);
    await expect(transactionPage.rowByBuildingName(tempContract!.building.name)).toBeVisible();

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM invoice
        WHERE id = ? AND month = ? AND year = ? AND status = 'PAID'
      `,
      [invoiceId, invoiceMonth, invoiceYear]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-CUS-TXN-003] customer sees empty state for unmatched transaction filter and can reset filters", async ({
    page
  }) => {
    const transactionPage = new CustomerTransactionHistoryPage(page);
    await transactionPage.expectLoaded();
    await transactionPage.filterByMonth(invoiceMonth === 12 ? 1 : invoiceMonth + 1);
    await transactionPage.filterByYear(invoiceYear);
    await transactionPage.submitFilters();
    await transactionPage.expectEmptyState();
    await transactionPage.expectPaginationHidden();

    await transactionPage.resetFilters();
    await transactionPage.submitFilters();
    await transactionPage.expectResultCountBanner(1);
    await expect(transactionPage.rowByBuildingName(tempContract!.building.name)).toBeVisible();
  });
});
