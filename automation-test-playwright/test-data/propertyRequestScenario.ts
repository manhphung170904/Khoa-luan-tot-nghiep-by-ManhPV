import type { APIRequestContext } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
import { CleanupHelper } from "@helpers/CleanupHelper";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

type RequestContextFactory = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export type PropertyRequestScenario = {
  admin: APIRequestContext;
  customer: APIRequestContext;
  customerUsername: string;
  customerId: number;
  buildingId: number;
  buildingName: string;
  staffId: number;
  propertyRequestId: number;
  cleanup: () => Promise<void>;
};

export async function createPropertyRequestScenario(
  playwright: RequestContextFactory,
  requestType: "RENT" | "BUY" = "RENT"
): Promise<PropertyRequestScenario> {
  const admin = await createRoleContext(playwright, "admin");
  const tempBuilding = await TempEntityHelper.taoBuildingTam(
    admin,
    requestType === "BUY" ? "FOR_SALE" : "FOR_RENT"
  );
  const tempStaff = await TempEntityHelper.taoStaffTam(admin);
  await TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, [tempBuilding.id]);
  const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
  await TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, [tempCustomer.id]);
  const customer = await createRoleContext(playwright, "customer", tempCustomer.username);
  const propertyRequest = await TempEntityHelper.taoPropertyRequestTam(
    customer,
    tempCustomer.username,
    tempBuilding.id,
    requestType
  );

  return {
    admin,
    customer,
    customerUsername: tempCustomer.username,
    customerId: tempCustomer.id,
    buildingId: tempBuilding.id,
    buildingName: tempBuilding.name,
    staffId: tempStaff.id,
    propertyRequestId: propertyRequest.id,
    cleanup: async () => {
      await CleanupHelper.run([
        { label: "Dispose customer API context", action: () => customer.dispose() },
        { label: `Delete property request ${propertyRequest.id}`, action: () => TempEntityHelper.xoaPropertyRequestTam(propertyRequest.id) },
        { label: `Reset customer assignments for staff ${tempStaff.id}`, action: () => TempEntityHelper.capNhatPhanCongCustomer(admin, tempStaff.id, []) },
        { label: `Reset building assignments for staff ${tempStaff.id}`, action: () => TempEntityHelper.capNhatPhanCongBuilding(admin, tempStaff.id, []) },
        { label: `Delete customer ${tempCustomer.id}`, action: () => TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id) },
        { label: `Delete building ${tempBuilding.id}`, action: () => TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id) },
        { label: `Delete staff ${tempStaff.id}`, action: () => TempEntityHelper.xoaStaffTam(admin, tempStaff.id) },
        { label: "Dispose admin API context", action: () => admin.dispose() }
      ]);
    }
  };
}
