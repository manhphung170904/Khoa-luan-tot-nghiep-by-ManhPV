import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { InvoiceDbRepository, TestDbRepository } from "@db/repositories";
import { CustomerInvoicePage } from "@pages/customer/CustomerInvoicePage";
import { CustomerPaymentQrPage } from "@pages/customer/CustomerPaymentQrPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  type TempInvoiceRecord
} from "@data/invoiceTempData";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

function requireContract(contract: TempContract | null): TempContract {
  expect(contract, "Contract scenario must be created in beforeEach").toBeTruthy();
  return contract!;
}

test.describe("Customer - Invoice Payment @regression @e2e", () => {
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeEach(async ({ page, adminApi }) => {
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, contract.customer.username);
    await new NavigationPage(page).open("/customer/invoice/list");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupContractScenario(
      adminApi,
      contract,
      createdInvoices.map((item) => item.id)
    );
    createdInvoices = [];
    contract = null;
  });

  test("[E2E-CUS-PAY-001] - Customer Invoice Payment - Invoice List - Unpaid Summary and Payment Details Modal Display", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract, {
      electricityUsage: 12,
      waterUsage: 4
    });
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    await new NavigationPage(page).open("/customer/invoice/list");
    await invoicePage.expectLoaded();

    const stats = await invoicePage.readStats();
    expect(stats.unpaidCount).toBe("1");
    expect(stats.totalPayable).toMatch(/\d/);

    const cardText = await invoicePage.firstInvoiceCardText();
    expect(cardText).toContain(String(invoice.id));
    expect(cardText).toContain(activeContract.building.name);

    await invoicePage.openFirstPaymentModal();
    const modalText = await invoicePage.visibleModalLooseText();
    expect(modalText).toMatch(/invoice|chi tiet|hoa/i);
    expect(modalText).toContain(activeContract.building.name.toLowerCase());
    expect(modalText).toMatch(/tong cong|total/i);
    expect(modalText).toContain(String(invoice.id));

    const invoiceRows = await TestDbRepository.query<{ status: string; total_amount: number }>(
      "SELECT status, total_amount FROM invoice WHERE id = ?",
      [invoice.id]
    );
    expect(invoiceRows[0]?.status).toBe("PENDING");
    expect(Number(invoiceRows[0]?.total_amount ?? 0)).toBeGreaterThan(0);
  });

  test("[E2E-CUS-PAY-002] - Customer Invoice Payment - Payment Modal - QR Payment Page Redirection", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    const qrPage = new CustomerPaymentQrPage(page);

    await new NavigationPage(page).open("/customer/invoice/list");
    await invoicePage.openFirstPaymentModal();
    await invoicePage.confirmPaymentInModal();
    await invoicePage.continueSweetAlertRedirect();

    await qrPage.expectLoaded(invoice.id);
    await qrPage.expectMetaContains(new RegExp(`MOONNEST INV ${invoice.id}`));

    const invoiceRows = await TestDbRepository.query<{ status: string }>(
      "SELECT status FROM invoice WHERE id = ?",
      [invoice.id]
    );
    expect(invoiceRows[0]?.status).toBe("PENDING");
  });

  test("[E2E-CUS-PAY-003] - Customer QR Payment - Payment Confirmation - Invoice Status Update to Paid", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const invoicePage = new CustomerInvoicePage(page);
    const qrPage = new CustomerPaymentQrPage(page);

    await new NavigationPage(page).open("/customer/invoice/list");
    await invoicePage.openFirstPaymentModal();
    await invoicePage.confirmPaymentInModal();
    await invoicePage.continueSweetAlertRedirect();
    await qrPage.expectLoaded(invoice.id);

    await qrPage.confirmPayment();
    await expect(page).toHaveURL(/\/customer\/invoice\/list\?paySuccess/);
    await invoicePage.expectPaymentSuccessAlert();
    await expect.poll(async () => {
      return InvoiceDbRepository.paymentById(invoice.id);
    }).toMatchObject({
      status: "PAID",
      payment_method: "BANK_QR"
    });

    const paidInvoice = await InvoiceDbRepository.paymentById(invoice.id);
    expect(paidInvoice?.transaction_code).toMatch(new RegExp(`^QR-${invoice.id}-\\d{14}$`));
    expect(paidInvoice?.paid_date).toBeTruthy();

    await invoicePage.expectEmptyState();
  });

  test("[E2E-CUS-PAY-004] - Customer Invoice Payment - Empty State - No Unpaid Invoices Display", async ({ page }) => {
    const invoicePage = new CustomerInvoicePage(page);

    await new NavigationPage(page).open("/customer/invoice/list");
    await invoicePage.expectLoaded();
    await invoicePage.expectEmptyState();
  });
});
