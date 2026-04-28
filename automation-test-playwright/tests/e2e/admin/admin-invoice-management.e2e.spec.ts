import { NavigationPage } from "@pages/core/NavigationPage";
import { expect, test } from "@fixtures/base.fixture";
import { env } from "@config/env";
import { TestDbRepository } from "@db/repositories";
import { AdminInvoiceDetailPage } from "@pages/admin/AdminInvoiceDetailPage";
import { AdminInvoiceFormPage } from "@pages/admin/AdminInvoiceFormPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  previousInvoicePeriod,
  type TempInvoiceRecord
} from "@data/invoiceTempData";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

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

test.describe("Admin - Invoice Management @regression @e2e", () => {
  let adminUser: TempStaffProfileUser | null = null;
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, adminUser.username, env.defaultPassword);
    await new NavigationPage(page).open("/admin/invoice/list");
  });

  test.afterEach(async ({ adminApi }) => {
    await cleanupContractScenario(
      adminApi,
      contract,
      createdInvoices.map((item) => item.id)
    );
    await cleanupTempStaffProfileUser(adminApi, adminUser);
    createdInvoices = [];
    contract = null;
    adminUser = null;
  });

  test("[E2E-ADM-INV-001] - Admin Invoice Management - Invoice List - Customer Filtering and Data Display", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const listPage = new AdminInvoiceListPage(page);
    await new NavigationPage(page).open("/admin/invoice/list");
    await listPage.expectLoaded();
    await listPage.waitForTableData();

    await listPage.filterByCustomer(activeContract.customer.id);
    await listPage.filterByMonth(invoice.month);
    await listPage.filterByStatus("PENDING");
    await listPage.submitFilters();
    await listPage.waitForTableData();

    await expect(listPage.rowByInvoiceId(invoice.id)).toContainText(activeContract.customer.fullName);
  });

  test("[E2E-ADM-INV-002] - Admin Invoice Management - Invoice Creation - Create Invoice from Add Form", async ({ page }) => {
    const activeContract = requireContract(contract);

    const listPage = new AdminInvoiceListPage(page);
    const formPage = new AdminInvoiceFormPage(page);
    const period = previousInvoicePeriod();

    await new NavigationPage(page).open("/admin/invoice/list");
    await listPage.openAddForm();
    await formPage.expectAddLoaded();
    await formPage.fillAddForm({
      customerId: activeContract.customer.id,
      contractId: activeContract.id,
      month: period.month,
      year: period.year,
      dueDate: period.dueDate,
      electricityUsage: 21,
      waterUsage: 8
    });
    await formPage.submitInvoice();
    await formPage.expectSweetAlertContains(/thanh cong|success/i);

    const rows = await TestDbRepository.query<{ id: number; status: string }>(
      `
        SELECT id, status
        FROM invoice
        WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [activeContract.id, activeContract.customer.id, period.month, period.year]
    );

    expect(rows.length).toBe(1);
    expect(rows[0]!.status).toBe("PENDING");
    createdInvoices.push({
      id: rows[0]!.id,
      contractId: activeContract.id,
      customerId: activeContract.customer.id,
      month: period.month,
      year: period.year,
      status: "PENDING"
    });
  });

  test("[E2E-ADM-INV-003] - Admin Invoice Management - Invoice Edit - Pending Invoice Update", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const formPage = new AdminInvoiceFormPage(page);
    const updatedDueDate = nextMonthDueDate(invoice.month, invoice.year);

    await new NavigationPage(page).open(`/admin/invoice/edit/${invoice.id}`);
    await formPage.expectEditLoaded(invoice.id);
    await formPage.fillEditForm({
      dueDate: updatedDueDate,
      electricityUsage: 40,
      waterUsage: 10
    });
    await formPage.submitInvoice();
    await formPage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ due_date: string }>(
        "SELECT DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM invoice WHERE id = ?",
        [invoice.id]
      );
      return rows[0]?.due_date ?? "";
    }).toBe(updatedDueDate);
  });

  test("[E2E-ADM-INV-004] - Admin Invoice Management - Invoice Edit Lock - Non-Pending Warning Display", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    await TestDbRepository.execute("UPDATE invoice SET status = 'PAID' WHERE id = ?", [invoice.id]);

    const formPage = new AdminInvoiceFormPage(page);
    await new NavigationPage(page).open(`/admin/invoice/edit/${invoice.id}`);
    await formPage.expectEditLoaded(invoice.id);
    await formPage.expectWarningVisible();
  });

  test("[E2E-ADM-INV-005] - Admin Invoice Management - Payment Confirmation - Invoice Payment Confirmation", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const detailPage = new AdminInvoiceDetailPage(page);
    await new NavigationPage(page).open(`/admin/invoice/${invoice.id}`);
    await detailPage.expectLoaded(invoice.id);
    await detailPage.confirmInvoicePaid();
    await detailPage.confirmSweetAlert();
    await detailPage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoice.id]);
      return rows[0]?.status ?? "";
    }).toBe("PAID");
  });

  test("[E2E-ADM-INV-006] - Admin Invoice Management - Invoice Deletion - Delete Invoice from List", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);

    const listPage = new AdminInvoiceListPage(page);
    await new NavigationPage(page).open("/admin/invoice/list");
    await listPage.waitForTableData();
    await listPage.filterByCustomer(activeContract.customer.id);
    await listPage.filterByMonth(invoice.month);
    await listPage.filterByStatus("PENDING");
    await listPage.submitFilters();
    await listPage.waitForTableData();
    await listPage.deleteInvoice(invoice.id);
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [invoice.id]);
      return rows.length;
    }).toBe(0);

    createdInvoices = createdInvoices.filter((item) => item.id !== invoice.id);
  });

  test("[E2E-ADM-INV-007] - Admin Invoice Management - Status Update - Overdue Status Refresh from List", async ({ page, adminApi }) => {
    const activeContract = requireContract(contract);

    const invoice = await createManagedInvoiceForContract(adminApi, activeContract);
    createdInvoices.push(invoice);
    await TestDbRepository.execute("UPDATE invoice SET due_date = ?, status = 'PENDING' WHERE id = ?", ["2000-01-01", invoice.id]);

    const listPage = new AdminInvoiceListPage(page);
    await new NavigationPage(page).open("/admin/invoice/list");
    await listPage.updateStatuses();
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/thanh cong|success/i);

    await expect.poll(async () => {
      const rows = await TestDbRepository.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoice.id]);
      return rows[0]?.status ?? "";
    }).toBe("OVERDUE");
  });
});
