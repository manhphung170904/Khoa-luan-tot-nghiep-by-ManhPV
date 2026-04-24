import { expect, test } from "@fixtures/base.fixture";
import type { APIRequestContext } from "@playwright/test";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { AdminBuildingAdditionalInfoPage } from "@pages/admin/AdminBuildingAdditionalInfoPage";
import {
  cleanupTempStaffProfileUser,
  createTempStaffProfileUser,
  loginAsTempUser,
  type TempStaffProfileUser
} from "@data/profileTempUsers";

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

test.describe("Admin - Building Additional Information @regression", () => {
  let adminUser: TempStaffProfileUser | null = null;
  let buildingId: number | null = null;
  let buildingName = "";
  const cleanupIds: Record<AdditionalType, number[]> = {
    legal: [],
    amenity: [],
    planning: [],
    supplier: []
  };

  test.beforeEach(async ({ page, adminApi }) => {
    adminUser = await createTempStaffProfileUser(adminApi, "ADMIN");
    const tempBuilding = await TempEntityHelper.taoBuildingTam(adminApi, "FOR_RENT");
    buildingId = tempBuilding.id;
    buildingName = tempBuilding.name;

    await loginAsTempUser(page, adminUser.username, adminUser.password);
    await page.goto(`/admin/building-additional-information/${tempBuilding.id}`);
  });

  test.afterEach(async ({ adminApi }) => {
    for (const type of ["legal", "amenity", "planning", "supplier"] as const) {
      while (cleanupIds[type].length > 0) {
        const id = cleanupIds[type].pop();
        await deleteAdditionalRecord(adminApi, type, id);
      }
    }

    if (buildingId) {
      await TempEntityHelper.xoaBuildingTam(adminApi, buildingId);
    }
    buildingId = null;
    buildingName = "";

    await cleanupTempStaffProfileUser(adminApi, adminUser);
    adminUser = null;
  });

  test("[E2E-ADM-BAI-001] - Admin Building Additional Information - Page Navigation - Additional Information Sections Load", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    await additionalInfoPage.expectLoaded(buildingName);
    await additionalInfoPage.expectAllSectionsVisible();
    await additionalInfoPage.expectCounterValue("legal", 0);
    await additionalInfoPage.expectCounterValue("amenity", 0);
    await additionalInfoPage.expectCounterValue("planning", 0);
    await additionalInfoPage.expectCounterValue("supplier", 0);
  });

  test("[E2E-ADM-BAI-002] - Admin Building Additional Information - Legal Authority - Create and Update Flow", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const authorityName = `E2E Legal ${TestDataFactory.taoMaDuyNhat("legal")}`;
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

  test("[E2E-ADM-BAI-003] - Admin Building Additional Information - Supplier and Amenity - Supplier Email Validation and Entity Creation", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const amenityName = `E2E Park ${TestDataFactory.taoMaDuyNhat("park")}`;
    const supplierName = `E2E Supplier ${TestDataFactory.taoMaDuyNhat("supplier")}`;

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
    const createdAmenityRows = await MySqlDbClient.query<{ name: string; amenity_type: string; distance_meter: number }>(
      "SELECT name, amenity_type, distance_meter FROM nearby_amenity WHERE id = ?",
      [amenityRows[0]!.id]
    );
    expect(createdAmenityRows[0]?.name).toBe(amenityName);
    expect(createdAmenityRows[0]?.amenity_type).toBe("PARK");
    expect(Number(createdAmenityRows[0]?.distance_meter)).toBe(500);

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
    const createdSupplierRows = await MySqlDbClient.query<{ name: string; service_type: string; email: string }>(
      "SELECT name, service_type, email FROM supplier WHERE id = ?",
      [supplierRows[0]!.id]
    );
    expect(createdSupplierRows[0]?.name).toBe(supplierName);
    expect(createdSupplierRows[0]?.service_type).toBe("CLEANING");
    expect(createdSupplierRows[0]?.email).toBe("supplier-e2e@example.com");

    await additionalInfoPage.expectCounterValue("amenity", 1);
    await additionalInfoPage.expectCounterValue("supplier", 1);
  });

  test("[E2E-ADM-BAI-004] - Admin Building Additional Information - Planning Map - Create and Delete Flow", async ({ page }) => {
    const additionalInfoPage = new AdminBuildingAdditionalInfoPage(page);
    const mapType = `E2E Planning ${TestDataFactory.taoMaDuyNhat("planning")}`;

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
    const createdPlanningRows = await MySqlDbClient.query<{ map_type: string; issued_by: string; image_url: string }>(
      "SELECT map_type, issued_by, image_url FROM planning_map WHERE id = ?",
      [planningRows[0]!.id]
    );
    expect(createdPlanningRows[0]?.map_type).toBe(mapType);
    expect(createdPlanningRows[0]?.issued_by).toBe("Construction Department");
    expect(createdPlanningRows[0]?.image_url).toContain("map1.jpg");
    await additionalInfoPage.expectCounterValue("planning", 1);

    await additionalInfoPage.deletePlanningMap(mapType);
    cleanupIds.planning.pop();
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM planning_map WHERE id = ?", [planningRows[0]!.id]);
      return rows.length;
    }).toBe(0);
    await expect.poll(async () => {
      const rows = await MySqlDbClient.query<{ total: number }>(
        "SELECT COUNT(*) AS total FROM planning_map WHERE building_id = ?",
        [buildingId]
      );
      return Number(rows[0]?.total ?? 0);
    }).toBe(0);
    await additionalInfoPage.expectCounterValue("planning", 0);
  });
});
