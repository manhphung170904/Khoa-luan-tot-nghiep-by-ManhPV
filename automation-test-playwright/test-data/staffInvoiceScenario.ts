import type { APIRequestContext } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CleanupHelper, type CleanupRegistryLike } from "@helpers/CleanupHelper";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

type RequestContextFactory = Parameters<typeof createRoleContext>[0];
type TempContract = Awaited<ReturnType<typeof TempEntityHelper.taoContractTam>>;

export type StaffInvoiceScenario = {
  adminContext: APIRequestContext;
  staffContext: APIRequestContext;
  tempContract: TempContract;
  validPayload: Record<string, unknown>;
  cleanup: () => Promise<void>;
};

export async function cleanupStaffInvoiceById(invoiceId?: number): Promise<void> {
  if (!invoiceId) {
    return;
  }

  await CleanupHelper.run([
    {
      label: `Delete invoice detail rows for invoice ${invoiceId}`,
      action: async () => {
        await MySqlDbClient.execute("DELETE FROM invoice_detail WHERE invoice_id = ?", [invoiceId]);
      }
    },
    {
      label: `Delete invoice ${invoiceId}`,
      action: async () => {
        await MySqlDbClient.execute("DELETE FROM invoice WHERE id = ?", [invoiceId]);
      }
    }
  ]);
}

export async function createStaffInvoiceScenario(
  playwright: RequestContextFactory,
  cleanupRegistry?: CleanupRegistryLike
): Promise<StaffInvoiceScenario> {
  const adminContext = await createRoleContext(playwright, "admin");
  const tempContract = await TempEntityHelper.taoContractTam(adminContext);
  const staffContext = await createRoleContext(playwright, "staff", tempContract.staff.username);
  const validPayload = TestDataFactory.buildInvoicePayload({
    contractId: tempContract.id,
    customerId: tempContract.customer.id,
    details: [{ description: "Staff created invoice", amount: 1500000 }]
  });

  let cleaned = false;
  const scenario: StaffInvoiceScenario = {
    adminContext,
    staffContext,
    tempContract,
    validPayload,
    cleanup: async () => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      await CleanupHelper.run([
        { label: "Dispose staff API context", action: () => staffContext.dispose() },
        { label: `Cleanup temp contract ${tempContract.id}`, action: () => TempEntityHelper.xoaContractTam(adminContext, tempContract) },
        { label: "Dispose admin API context", action: () => adminContext.dispose() }
      ]);
    }
  };

  cleanupRegistry?.addLabeled(`Cleanup staff invoice scenario ${tempContract.id}`, () => scenario.cleanup());
  return scenario;
}
