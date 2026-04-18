import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { StaffInvoiceListPage } from "@pages/staff/StaffInvoiceListPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  previousInvoicePeriod,
  type TempInvoiceRecord
} from "../_fixtures/invoiceTempData";
import { loginAsTempUser, newAdminApiContext } from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

test.describe("Staff Invoice List E2E @regression", () => {
  let adminApi: APIRequestContext;
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, contract.staff.username);
    await page.goto("/staff/invoices");
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

  test("[E2E-STF-INV-001] staff sees assigned invoice rows and can open the detail modal", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.expectLoaded();
    await invoicePage.waitForTableData();

    await invoicePage.selectFilter("status", "PENDING");
    await invoicePage.search();
    await invoicePage.waitForTableData();

    await expect(invoicePage.rowByInvoiceId(invoice.id)).toContainText(contract.customer.fullName);
    await invoicePage.openViewModal(invoice.id);
    await expect(invoicePage.visibleModal()).toContainText(contract.building.name);
    await expect(invoicePage.visibleModal()).toContainText(/Chi tiết hóa đơn|Chi tiet hoa don/i);
  });

  test("[E2E-STF-INV-002] staff can create a new invoice from the add modal", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoicePage = new StaffInvoiceListPage(page);
    const period = previousInvoicePeriod();

    await page.goto("/staff/invoices");
    await invoicePage.openAddInvoiceModal();
    await invoicePage.selectAddCustomer(contract.customer.id);
    await invoicePage.selectAddContract(contract.id);
    await invoicePage.fillAddInvoiceForm({
      month: period.month,
      year: period.year,
      dueDate: period.dueDate,
      electricityUsage: 25,
      waterUsage: 9
    });
    await invoicePage.chooseAddStatus("PENDING");
    await invoicePage.submitAddInvoice();
    await invoicePage.expectSweetAlertContains(/thành công|thanh cong/i);

    const rows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM invoice
        WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [contract.id, contract.customer.id, period.month, period.year]
    );

    expect(rows.length).toBe(1);
    createdInvoices.push({
      id: rows[0]!.id,
      contractId: contract.id,
      customerId: contract.customer.id,
      month: period.month,
      year: period.year,
      status: "PENDING"
    });
  });

  test("[E2E-STF-INV-003] duplicate invoice creation shows a business error", async ({ page }) => {
    if (!contract) {
      return;
    }

    const existingInvoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(existingInvoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.openAddInvoiceModal();
    await invoicePage.selectAddCustomer(contract.customer.id);
    await invoicePage.selectAddContract(contract.id);
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
      [contract.id, contract.customer.id, existingInvoice.month, existingInvoice.year]
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });

  test("[E2E-STF-INV-004] staff can edit invoice usage, due date, and status", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    const updatedDueDate = new Date().toISOString().slice(0, 10);

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
    await invoicePage.expectSweetAlertContains(/thành công|thanh cong/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string; due_date: string }>(
        "SELECT status, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM invoice WHERE id = ?",
        [invoice.id]
      );
      return `${rows[0]?.status ?? ""}|${rows[0]?.due_date ?? ""}`;
    }).toBe(`PAID|${updatedDueDate}`);
  });

  test("[E2E-STF-INV-005] staff can delete an owned invoice from the list", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const invoicePage = new StaffInvoiceListPage(page);
    await page.goto("/staff/invoices");
    await invoicePage.waitForTableData();
    await invoicePage.deleteInvoice(invoice.id);
    await invoicePage.confirmSweetAlert();
    await invoicePage.expectSweetAlertContains(/thành công|thanh cong/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [invoice.id]);
      return rows.length;
    }).toBe(0);

    createdInvoices = createdInvoices.filter((item) => item.id !== invoice.id);
  });
});
