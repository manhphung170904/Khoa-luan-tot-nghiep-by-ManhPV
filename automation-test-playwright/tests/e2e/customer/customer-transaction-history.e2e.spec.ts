import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CustomerTransactionHistoryPage } from "@pages/customer/CustomerTransactionHistoryPage";
import { cleanupContractScenario, createManagedInvoiceForContract, createTempContractScenario } from "@data/invoiceTempData";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

test.describe("Customer - Transaction History @regression", () => {
  let tempContract: TempContract | null = null;
  let invoiceId: number | null = null;
  let invoiceMonth = 0;
  let invoiceYear = 0;
  let invoiceTotalAmount = 0;

  test.beforeEach(async ({ page, adminApi }) => {
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

  test.afterEach(async ({ adminApi }) => {
    await cleanupContractScenario(adminApi, tempContract, invoiceId ? [invoiceId] : []);
    tempContract = null;
    invoiceId = null;
    invoiceMonth = 0;
    invoiceYear = 0;
    invoiceTotalAmount = 0;
  });

  test("[E2E-CUS-TXN-001] - Customer Transaction History - Transaction Summary - Paid Transaction Summary and Invoice Detail Display", async ({ page }) => {
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

  test("[E2E-CUS-TXN-002] - Customer Transaction History - Period Filter - Invoice Period Filtering", async ({ page }) => {
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

  test("[E2E-CUS-TXN-003] - Customer Transaction History - Filter Reset - Empty State and Filter Reset", async ({
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
