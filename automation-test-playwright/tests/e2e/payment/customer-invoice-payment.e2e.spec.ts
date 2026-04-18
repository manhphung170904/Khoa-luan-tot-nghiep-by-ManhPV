import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";
import { CustomerPaymentQrPage } from "@pages/customer/CustomerPaymentQrPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  type TempInvoiceRecord
} from "../_fixtures/invoiceTempData";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

test.describe("Customer Invoice Payment E2E @regression", () => {
  let adminApi: APIRequestContext;
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, contract.customer.username);
    await page.goto("/customer/invoice/list");
  });

  test.afterEach(async () => {
    await cleanupContractScenario(
      adminApi,
      contract,
      createdInvoices.map((item) => item.id)
    );
    createdInvoices = [];
    contract = null;
  });

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-CUS-PAY-001] customer invoice list renders unpaid stats and modal details", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract, {
      electricityUsage: 12,
      waterUsage: 4
    });
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    await page.goto("/customer/invoice/list");
    await invoicePage.expectLoaded();

    const stats = await invoicePage.readStats();
    expect(stats.unpaidCount).toBe("1");
    expect(stats.totalPayable).toMatch(/\d/);

    const cardText = await invoicePage.firstInvoiceCardText();
    expect(cardText).toContain(String(invoice.id));
    expect(cardText).toContain(contract.building.name);

    await invoicePage.openFirstPaymentModal();
    const modalText = await invoicePage.visibleModalText();
    expect(modalText).toContain("Chi Tiết Hóa Đơn");
    expect(modalText).toContain(contract.building.name);
    expect(modalText).toContain("TỔNG CỘNG");
  });

  test("[E2E-CUS-PAY-002] customer can move from payment modal to QR payment page", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    const qrPage = new CustomerPaymentQrPage(page);

    await page.goto("/customer/invoice/list");
    await invoicePage.openFirstPaymentModal();
    await invoicePage.confirmPaymentInModal();
    await invoicePage.continueSweetAlertRedirect();

    await qrPage.expectLoaded(invoice.id);
    await qrPage.expectMetaContains(new RegExp(`MOONNEST INV ${invoice.id}`));
  });

  test("[E2E-CUS-PAY-003] customer confirms QR payment and invoice becomes paid", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    const qrPage = new CustomerPaymentQrPage(page);

    await page.goto("/customer/invoice/list");
    await invoicePage.openFirstPaymentModal();
    await invoicePage.confirmPaymentInModal();
    await invoicePage.continueSweetAlertRedirect();
    await qrPage.expectLoaded(invoice.id);

    await qrPage.confirmPayment();
    await expect(page).toHaveURL(/\/customer\/invoice\/list\?paySuccess/);
    await expect(page.locator(".swal2-popup")).toContainText(/thanh toán thành công/i);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoice.id]);
      return rows[0]?.status ?? "";
    }).toBe("PAID");

    await invoicePage.expectEmptyState();
  });

  test("[E2E-CUS-PAY-004] customer without unpaid invoices sees the empty state", async ({ page }) => {
    const invoicePage = new CustomerInvoicePage(page);

    await page.goto("/customer/invoice/list");
    await invoicePage.expectLoaded();
    await invoicePage.expectEmptyState();
  });
});
