import type { APIRequestContext } from "@playwright/test";
import { createRoleContext } from "@api/adminApiUtils";
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
  const tempCustomer = await TempEntityHelper.taoCustomerTam(admin, tempStaff.id);
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
    propertyRequestId: propertyRequest.id,
    cleanup: async () => {
      await customer.dispose();
      await TempEntityHelper.xoaPropertyRequestTam(propertyRequest.id);
      await TempEntityHelper.xoaCustomerTam(admin, tempCustomer.id);
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
      await TempEntityHelper.xoaStaffTam(admin, tempStaff.id);
      await admin.dispose();
    }
  };
}
