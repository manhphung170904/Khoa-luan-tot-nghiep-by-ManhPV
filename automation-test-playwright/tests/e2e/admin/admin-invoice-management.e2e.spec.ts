import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { AdminInvoiceDetailPage } from "@pages/admin/AdminInvoiceDetailPage";
import { AdminInvoiceFormPage } from "@pages/admin/AdminInvoiceFormPage";
import { AdminInvoiceListPage } from "@pages/admin/AdminInvoiceListPage";
import {
  cleanupContractScenario,
  createManagedInvoiceForContract,
  createTempContractScenario,
  previousInvoicePeriod,
  type TempInvoiceRecord
} from "../_fixtures/invoiceTempData";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

type TempContract = Awaited<ReturnType<typeof createTempContractScenario>>;

test.describe("Admin Invoice Management E2E @regression", () => {
  let adminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  let contract: TempContract | null = null;
  let createdInvoices: TempInvoiceRecord[] = [];

  test.beforeAll(async ({ playwright }) => {
    adminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    contract = await createTempContractScenario(adminApi);
    createdInvoices = [];

    await loginAsTempUser(page, adminUser.username, env.defaultPassword);
    await page.goto("/admin/invoice/list");
  });

  test.afterEach(async () => {
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

  test.afterAll(async () => {
    await adminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-ADM-INV-001] admin list renders invoices and filter can narrow by customer", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const listPage = new AdminInvoiceListPage(page);
    await page.goto("/admin/invoice/list");
    await listPage.expectLoaded();
    await listPage.waitForTableData();

    await listPage.filterByCustomer(contract.customer.id);
    await listPage.filterByMonth(invoice.month);
    await listPage.filterByStatus("PENDING");
    await listPage.submitFilters();
    await listPage.waitForTableData();

    await expect(page.locator("#invoiceTableBody tr").filter({ hasText: contract.building.name }).first()).toContainText(contract.customer.fullName);
  });

  test("[E2E-ADM-INV-002] admin can create a new invoice from the add form", async ({ page }) => {
    if (!contract) {
      return;
    }

    const listPage = new AdminInvoiceListPage(page);
    const formPage = new AdminInvoiceFormPage(page);
    const period = previousInvoicePeriod();

    await page.goto("/admin/invoice/list");
    await listPage.openAddForm();
    await formPage.expectAddLoaded();
    await formPage.fillAddForm({
      customerId: contract.customer.id,
      contractId: contract.id,
      month: period.month,
      year: period.year,
      dueDate: period.dueDate,
      electricityUsage: 21,
      waterUsage: 8
    });
    await formPage.submitInvoice();
    await formPage.expectSweetAlertContains(/thÃªm hÃ³a Ä‘Æ¡n thÃ nh cÃ´ng|thÃ nh cÃ´ng/i);

    const rows = await MySqlDbClient.query<{ id: number; status: string }>(
      `
        SELECT id, status
        FROM invoice
        WHERE contract_id = ? AND customer_id = ? AND month = ? AND year = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [contract.id, contract.customer.id, period.month, period.year]
    );

    expect(rows.length).toBe(1);
    expect(rows[0]!.status).toBe("PENDING");
    createdInvoices.push({
      id: rows[0]!.id,
      contractId: contract.id,
      customerId: contract.customer.id,
      month: period.month,
      year: period.year,
      status: "PENDING"
    });
  });

  test("[E2E-ADM-INV-003] admin can edit a pending invoice through the edit form", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const formPage = new AdminInvoiceFormPage(page);
    const updatedDueDate = new Date().toISOString().slice(0, 10);

    await page.goto(`/admin/invoice/edit/${invoice.id}`);
    await formPage.expectEditLoaded(invoice.id);
    await formPage.fillEditForm({
      dueDate: updatedDueDate,
      electricityUsage: 40,
      waterUsage: 10
    });
    await formPage.submitInvoice();
    await formPage.expectSweetAlertContains(/cáº­p nháº­t hÃ³a Ä‘Æ¡n thÃ nh cÃ´ng|thÃ nh cÃ´ng/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ due_date: string }>(
        "SELECT DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM invoice WHERE id = ?",
        [invoice.id]
      );
      return rows[0]?.due_date ?? "";
    }).toBe(updatedDueDate);
  });

  test("[E2E-ADM-INV-004] paid invoice edit page shows the non-pending warning", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    await MySqlDbClient.execute("UPDATE invoice SET status = 'PAID' WHERE id = ?", [invoice.id]);

    const formPage = new AdminInvoiceFormPage(page);
    await page.goto(`/admin/invoice/edit/${invoice.id}`);
    await formPage.expectEditLoaded(invoice.id);
    await formPage.expectWarningVisible();
  });

  test("[E2E-ADM-INV-005] admin can confirm invoice payment from the detail page", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const detailPage = new AdminInvoiceDetailPage(page);
    await page.goto(`/admin/invoice/${invoice.id}`);
    await detailPage.expectLoaded(invoice.id);
    await detailPage.confirmInvoicePaid();
    await detailPage.confirmSweetAlert();
    await detailPage.expectSweetAlertContains(/xÃ¡c nháº­n thanh toÃ¡n|thÃ nh cÃ´ng/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoice.id]);
      return rows[0]?.status ?? "";
    }).toBe("PAID");
  });

  test("[E2E-ADM-INV-006] admin can delete an invoice from the list", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract);
    createdInvoices.push(invoice);

    const listPage = new AdminInvoiceListPage(page);
    await page.goto("/admin/invoice/list");
    await listPage.waitForTableData();
    await listPage.filterByCustomer(contract.customer.id);
    await listPage.filterByMonth(invoice.month);
    await listPage.filterByStatus("PENDING");
    await listPage.submitFilters();
    await listPage.waitForTableData();
    await page.locator("#invoiceTableBody tr").filter({ hasText: contract.building.name }).first().locator(".btn-delete").click();
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/xÃ³a hÃ³a Ä‘Æ¡n thÃ nh cÃ´ng|thÃ nh cÃ´ng/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM invoice WHERE id = ?", [invoice.id]);
      return rows.length;
    }).toBe(0);

    createdInvoices = createdInvoices.filter((item) => item.id !== invoice.id);
  });

  test("[E2E-ADM-INV-007] admin can update overdue statuses from the list page", async ({ page }) => {
    if (!contract) {
      return;
    }

    const invoice = await createManagedInvoiceForContract(adminApi, contract, {
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    });
    createdInvoices.push(invoice);

    const listPage = new AdminInvoiceListPage(page);
    await page.goto("/admin/invoice/list");
    await listPage.updateStatuses();
    await listPage.confirmSweetAlert();
    await listPage.expectSweetAlertContains(/cáº­p nháº­t thÃ nh cÃ´ng|thÃ nh cÃ´ng/i);

    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoice.id]);
      return rows[0]?.status ?? "";
    }).toBe("OVERDUE");
  });
});


