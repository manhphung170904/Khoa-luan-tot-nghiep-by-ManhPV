import { expect, test } from "@fixtures/base.fixture";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { StaffInvoiceListPage } from "@pages/staff/StaffInvoiceListPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  previousInvoicePeriod,
  type TempInvoiceRecord
} from "@data/invoiceTempData";
import { loginAsTempUser } from "@data/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

function requireContract(contract: TempContract | null): TempContract {
  expect(contract, "Contract scenario must be created in beforeEach").toBeTruthy();
  return contract!;
}

function nextMonthDueDate(month: number, year: number, day = 20): string {
  const dueMonth = month === 12 ? 1 : month + 1;
  const dueYear = month === 12 ? year + 1 : year;
  return `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

test.describe("Staff - Invoice List @regression", () => {
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeEach(async ({ page, adminApi }) => {
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, contract.staff.username);
    await page.goto("/staff/invoices");
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

  test("[E2E-STF-INV-001] - Staff Invoice List - Invoice List - Assigned Invoice Rows and Detail Modal", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.expectLoaded();
    await invoicePage.waitForTableData();

    await invoicePage.selectFilter("status", "PENDING");
    await invoicePage.search();
    await invoicePage.waitForTableData();

    await expect(invoicePage.rowByInvoiceId(invoice.id)).toContainText(activeContract.customer.fullName);
    await invoicePage.openViewModal(invoice.id);
    await expect(invoicePage.visibleModal()).toContainText(activeContract.building.name);
    await expect(invoicePage.visibleModal()).toContainText(/chi tiết hóa đơn|chi tiet hoa don|invoice detail/i);
  });

  test("[E2E-STF-INV-002] - Staff Invoice List - Invoice Creation - Create Invoice from Add Modal", async ({ page }) => {
    const activeContract = requireContract(contract);

    const invoicePage = new StaffInvoiceListPage(page);
    const period = previousInvoicePeriod();

    await page.goto("/staff/invoices");
    await invoicePage.openAddInvoiceModal();
    await invoicePage.selectAddCustomer(activeContract.customer.id);
    await invoicePage.selectAddContract(activeContract.id);
    await invoicePage.fillAddInvoiceForm({
      month: period.month,
      year: period.year,
      dueDate: period.dueDate,
      electricityUsage: 25,
      waterUsage: 9
    });
    await invoicePage.chooseAddStatus("PENDING");
    await invoicePage.submitAddInvoice();
    await invoicePage.expectSweetAlertContains(/thanh cong|success/i);

    const rows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM invoice
        WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [activeContract.id, activeContract.customer.id, period.month, period.year]
    );

    expect(rows.length).toBe(1);
    createdInvoices.push({
      id: rows[0]!.id,
      contractId: activeContract.id,
      customerId: activeContract.customer.id,
      month: period.month,
      year: period.year,
      status: "PENDING"
    });
  });

  test("[E2E-STF-INV-003] - Staff Invoice List - Duplicate Invoice - Business Error Display", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const existingInvoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(existingInvoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.openAddInvoiceModal();
    await invoicePage.selectAddCustomer(activeContract.customer.id);
    await invoicePage.selectAddContract(activeContract.id);
    await invoicePage.fillAddInvoiceForm({
      month: existingInvoice.month,
      year: existingInvoice.year,
      dueDate: previousInvoicePeriod().dueDate,
      electricityUsage: 18,
      waterUsage: 7
    });
    await invoicePage.submitAddInvoice();
    await invoicePage.expectSweetAlertContains(/lỗi|loi|đã tồn tại|da ton tai|error/i);

    const rows = await MySqlDbClient.query<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM invoice
        WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
      `,
      [activeContract.id, activeContract.customer.id, existingInvoice.month, existingInvoice.year]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-INV-004] - Staff Invoice List - Invoice Edit - Usage Due Date and Status Update", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    const updatedDueDate = nextMonthDueDate(invoice.month, invoice.year);

    await page.goto("/staff/invoices");
    await invoicePage.waitForTableData();
    await invoicePage.openEditModal(invoice.id);
    await invoicePage.fillVisibleEditForm({
      dueDate: updatedDueDate,
      electricityUsage: 33,
      waterUsage: 11,
      status: "PAID"
    });
    await invoicePage.saveVisibleEditForm();
    await invoicePage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string; due_date: string }>(
        "SELECT status, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM invoice WHERE id = ?",
        [invoice.id]
      );
      return `${rows[0]?.status ?? ""}|${rows[0]?.due_date ?? ""}`;
    }).toBe(`PAID|${updatedDueDate}`);
  });

  test("[E2E-STF-INV-005] - Staff Invoice List - Invoice Deletion - Owned Invoice Deletion from List", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.waitForTableData();
    await invoicePage.deleteInvoice(invoice.id);
    await invoicePage.confirmSweetAlert();
    await invoicePage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [invoice.id]);
      return rows.length;
    }).toBe(0);

    createdInvoices = createdInvoices.filter((item) => item.id !== invoice.id);
  });
});
