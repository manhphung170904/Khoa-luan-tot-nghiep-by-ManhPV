import { expect, test, type APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { AdminBuildingAdditionalInfoPage } from "@pages/admin/AdminBuildingAdditionalInfoPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  newAdminApiContext,
  type TempStaffProfileUser
} from "../_fixtures/profileTempUsers";

type AdditionalType = "legal" | "amenity" | "planning" | "supplier";

async function deleteAdditionalRecord(adminApi: APIRequestContext, type: AdditionalType, id?: number): Promise<void> {
  if (!id) {
    return;
  }

  const endpoints: Record<AdditionalType, string> = {
    legal: "legal-authorities",
    amenity: "nearby-amenities",
    planning: "planning-maps",
    supplier: "suppliers"
  };

  await adminApi.delete(`/api/v1/admin/building-additional-information/${endpoints[type]}/${id}`, {
    failOnStatusCode: false
  });
}

test.describe("Admin Building Additional Information E2E @regression", () => {
  let bootstrapAdminApi: APIRequestContext;
  let adminUser: TempStaffProfileUser | null = null;
  let buildingId: number | null = null;
  let buildingName = "";
  const cleanupIds: Record<AdditionalType, number[]> = {
    legal: [],
    amenity: [],
    planning: [],
    supplier: []
  };

  test.beforeAll(async ({ playwright }) => {
    bootstrapAdminApi = await newAdminApiContext(playwright);
  });

  test.beforeEach(async ({ page }) => {
    adminUser = await createTempStaffProfileUser(bootstrapAdminApi, "ADMIN");
    const tempBuilding = await TempEntityHelper.taoBuildingTam(bootstrapAdminApi, "FOR_RENT");
    buildingId = tempBuilding.id;
    buildingName = tempBuilding.name;

    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto(`/admin/building-additional-information/${tempBuilding.id}`);
  });

  test.afterEach(async () => {
    for (const type of ["legal", "amenity", "planning", "supplier"] as const) {
      while (cleanupIds[type].length > 0) {
        const id = cleanupIds[type].pop();
        await deleteAdditionalRecord(bootstrapAdminApi, type, id);
      }
    }

    if (buildingId) {
      await TempEntityHelper.xoaBuildingTam(bootstrapAdminApi, buildingId);
    }
    buildingId = null;
    buildingName = "";

    await cleanupTempStaffProfileUser(bootstrapAdminApi, adminUser);
    adminUser = null;
  });

  test.afterAll(async () => {
    await bootstrapAdminApi.dispose();
    await MySqlDbClient.close();
  });

  test("[E2E-ADM-BAI-001] admin can load additional information page and all sections", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    await additionalInfoPage.expectLoaded(buildingName);
    await additionalInfoPage.expectAllSectionsVisible();
    await additionalInfoPage.expectCounterValue("legal", 0);
    await additionalInfoPage.expectCounterValue("amenity", 0);
    await additionalInfoPage.expectCounterValue("planning", 0);
    await additionalInfoPage.expectCounterValue("supplier", 0);
  });

  test("[E2E-ADM-BAI-002] admin can create and edit legal authority", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const authorityName = `E2E Legal ${Date.now()}`;
    const updatedName = `${authorityName} Updated`;

    await additionalInfoPage.expectLoaded(buildingName);
    await additionalInfoPage.addLegalAuthority({
      authorityName,
      authorityType: "NOTARY",
      phone: "0901234567",
      email: "legal-e2e@example.com",
      address: "123 Test Street",
      note: "Created by E2E"
    });
    await additionalInfoPage.expectLegalAuthorityVisible(authorityName);

    const createdRows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM legal_authority WHERE building_id = ? AND authority_name = ? ORDER BY id DESC LIMIT 1",
      [buildingId, authorityName]
    );
    cleanupIds.legal.push(createdRows[0]!.id);

    await additionalInfoPage.editLegalAuthority(authorityName, {
      authorityName: updatedName,
      authorityType: "LAW_FIRM",
      phone: "0909999999",
      email: "legal-updated@example.com"
    });
    await additionalInfoPage.expectLegalAuthorityVisible(updatedName);

    const updatedRows = await MySqlDbClient.query<{ authority_name: string; authority_type: string }>(
      "SELECT authority_name, authority_type FROM legal_authority WHERE id = ?",
      [cleanupIds.legal[cleanupIds.legal.length - 1]]
    );
    expect(updatedRows[0]?.authority_name).toBe(updatedName);
    expect(updatedRows[0]?.authority_type).toBe("LAW_FIRM");
    await additionalInfoPage.expectCounterValue("legal", 1);
  });

  test("[E2E-ADM-BAI-003] admin validates supplier email and can create amenity and supplier", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const amenityName = `E2E Park ${Date.now()}`;
    const supplierName = `E2E Supplier ${Date.now()}`;

    await additionalInfoPage.expectLoaded(buildingName);
    await additionalInfoPage.addSupplier({
      name: "Invalid Supplier",
      serviceType: "CLEANING",
      phone: "0901234567",
      email: "invalid-email"
    });
    await additionalInfoPage.expectValidationPopupContains(/Email/i);
    await additionalInfoPage.closeModal("supplier");

    await additionalInfoPage.addAmenity({
      name: amenityName,
      amenityType: "PARK",
      address: "456 Amenity Street",
      latitude: "10.7620000",
      longitude: "106.6600000",
      distanceMeter: "500"
    });
    await additionalInfoPage.expectAmenityVisible(amenityName);

    const amenityRows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM nearby_amenity WHERE building_id = ? AND name = ? ORDER BY id DESC LIMIT 1",
      [buildingId, amenityName]
    );
    cleanupIds.amenity.push(amenityRows[0]!.id);

    await additionalInfoPage.addSupplier({
      name: supplierName,
      serviceType: "CLEANING",
      phone: "0901234567",
      email: "supplier-e2e@example.com",
      address: "789 Supplier Street",
      note: "Managed by E2E"
    });
    await additionalInfoPage.expectSupplierVisible(supplierName);

    const supplierRows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM supplier WHERE building_id = ? AND name = ? ORDER BY id DESC LIMIT 1",
      [buildingId, supplierName]
    );
    cleanupIds.supplier.push(supplierRows[0]!.id);

    await additionalInfoPage.expectCounterValue("amenity", 1);
    await additionalInfoPage.expectCounterValue("supplier", 1);
  });

  test("[E2E-ADM-BAI-004] admin can create and delete planning map", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const mapType = `E2E Planning ${Date.now()}`;

    await additionalInfoPage.expectLoaded(buildingName);
    await additionalInfoPage.addPlanningMap({
      mapType,
      issuedBy: "Construction Department",
      issuedDate: "2025-01-01",
      expiredDate: "2030-01-01",
      existingImageUrl: "/images/planning_map_img/map1.jpg",
      note: "Planning map from E2E"
    });
    await additionalInfoPage.expectPlanningMapVisible(mapType);

    const planningRows = await MySqlDbClient.query<{ id: number }>(
      "SELECT id FROM planning_map WHERE building_id = ? AND map_type = ? ORDER BY id DESC LIMIT 1",
      [buildingId, mapType]
    );
    cleanupIds.planning.push(planningRows[0]!.id);
    await additionalInfoPage.expectCounterValue("planning", 1);

    await additionalInfoPage.deletePlanningMap(mapType);
    cleanupIds.planning.pop();
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM planning_map WHERE id = ?", [planningRows[0]!.id]);
      return rows.length;
    }).toBe(0);
    await additionalInfoPage.expectCounterValue("planning", 0);
  });
});
