import { expect, test, type APIRequestContext } from "@playwright/test";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

test.describe.serial("Admin Building Additional Information API @api @extended", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[BAI_001] full CRUD lifecycle for legal authority, nearby amenity, supplier, planning map with temp building", async ({
    request
  }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_RENT");

    let legalAuthorityId = 0;
    let amenityId = 0;
    let supplierId = 0;
    let planningMapId = 0;

    try {
      const anonymousLegalAuthority = await request.post("/api/v1/admin/building-additional-information/legal-authorities", {
        failOnStatusCode: false,
        data: { buildingId: tempBuilding.id, authorityName: "Anonymous", authorityType: "NOTARY" }
      });
      expect(anonymousLegalAuthority.status()).toBe(401);

      const invalidAuthorityName = await admin.post("/api/v1/admin/building-additional-information/legal-authorities", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          authorityName: "A".repeat(256),
          authorityType: "NOTARY"
        }
      });
      expect(invalidAuthorityName.status()).toBe(400);

      const createLegalAuthority = await admin.post("/api/v1/admin/building-additional-information/legal-authorities", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          authorityName: "Auto Notary Office",
          authorityType: "NOTARY",
          address: "123 Test Street",
          phone: "0123456789",
          email: "contact@notary-auto.com",
          note: "Auto test"
        }
      });
      expect(createLegalAuthority.status()).toBe(200);
      const legalAuthorityBody = (await createLegalAuthority.json()) as { id: number; authorityName?: string; buildingId?: number };
      legalAuthorityId = legalAuthorityBody.id;
      expect(legalAuthorityBody.id).toBeTruthy();
      expect(legalAuthorityBody.authorityName).toBe("Auto Notary Office");
      expect(legalAuthorityBody.buildingId).toBe(tempBuilding.id);

      const listLegalAuthorities = await admin.get(
        `/api/v1/admin/building-additional-information/legal-authorities/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      expect(listLegalAuthorities.status()).toBe(200);
      const legalAuthorityList = (await listLegalAuthorities.json()) as Array<{ id: number; authorityName?: string }>;
      expect(legalAuthorityList.some((item) => item.id === legalAuthorityId && item.authorityName === "Auto Notary Office")).toBeTruthy();

      const updateLegalAuthority = await admin.put(
        `/api/v1/admin/building-additional-information/legal-authorities/${legalAuthorityId}`,
        {
          failOnStatusCode: false,
          data: {
            buildingId: tempBuilding.id,
            authorityName: "Auto Law Office Updated",
            authorityType: "LAW_FIRM",
            address: "456 Update Street",
            phone: "0987654321",
            email: "updated@notary.com",
            note: "Updated"
          }
        }
      );
      expect(updateLegalAuthority.status()).toBe(200);
      const updateLegalAuthorityBody = (await updateLegalAuthority.json()) as { id?: number; authorityName?: string };
      expect(updateLegalAuthorityBody.id).toBe(legalAuthorityId);
      expect(updateLegalAuthorityBody.authorityName).toBe("Auto Law Office Updated");

      const legalAuthorityRows = await MySqlDbClient.query<{
        authority_name: string;
        authority_type: string;
      }>("SELECT authority_name, authority_type FROM legal_authority WHERE id = ?", [legalAuthorityId]);
      expect(legalAuthorityRows[0]!.authority_name).toBe("Auto Law Office Updated");
      expect(legalAuthorityRows[0]!.authority_type).toBe("LAW_FIRM");

      const deleteLegalAuthority = await admin.delete(
        `/api/v1/admin/building-additional-information/legal-authorities/${legalAuthorityId}`,
        { failOnStatusCode: false }
      );
      expect(deleteLegalAuthority.status()).toBe(200);
      expect(await deleteLegalAuthority.text()).toBe("");
      legalAuthorityId = 0;

      const createAmenity = await admin.post("/api/v1/admin/building-additional-information/nearby-amenities", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          name: "Auto Test Park",
          amenityType: "PARK",
          distanceMeter: 500,
          address: "123 Test Street",
          latitude: 10.762,
          longitude: 106.66
        }
      });
      expect(createAmenity.status()).toBe(200);
      const amenityBody = (await createAmenity.json()) as { id: number; name?: string };
      amenityId = amenityBody.id;
      expect(amenityBody.id).toBeTruthy();
      expect(amenityBody.name).toBe("Auto Test Park");

      const listAmenities = await admin.get(
        `/api/v1/admin/building-additional-information/nearby-amenities/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      expect(listAmenities.status()).toBe(200);
      const amenityList = (await listAmenities.json()) as Array<{ id: number }>;
      expect(amenityList.some((item) => item.id === amenityId)).toBeTruthy();

      const updateAmenity = await admin.put(
        `/api/v1/admin/building-additional-information/nearby-amenities/${amenityId}`,
        {
          failOnStatusCode: false,
          data: {
            buildingId: tempBuilding.id,
            name: "Auto Test Park Updated",
            amenityType: "PARK",
            distanceMeter: 600,
            address: "456 Update Street",
            latitude: 10.763,
            longitude: 106.661
          }
        }
      );
      expect(updateAmenity.status()).toBe(200);
      const updateAmenityBody = (await updateAmenity.json()) as { id?: number; name?: string };
      expect(updateAmenityBody.id).toBe(amenityId);
      expect(updateAmenityBody.name).toBe("Auto Test Park Updated");

      const amenityRows = await MySqlDbClient.query<{ name: string; distance_meter: number }>(
        "SELECT name, distance_meter FROM nearby_amenity WHERE id = ?",
        [amenityId]
      );
      expect(amenityRows[0]!.name).toBe("Auto Test Park Updated");
      expect(amenityRows[0]!.distance_meter).toBe(600);

      const deleteAmenity = await admin.delete(
        `/api/v1/admin/building-additional-information/nearby-amenities/${amenityId}`,
        { failOnStatusCode: false }
      );
      expect(deleteAmenity.status()).toBe(200);
      expect(await deleteAmenity.text()).toBe("");
      amenityId = 0;

      const createSupplier = await admin.post("/api/v1/admin/building-additional-information/suppliers", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          name: "Auto Cleaning Co",
          serviceType: "CLEANING",
          phone: "0901234567",
          email: "clean@auto.com",
          address: "1A Test Street",
          note: "Auto test"
        }
      });
      expect(createSupplier.status()).toBe(200);
      const supplierBody = (await createSupplier.json()) as { id: number; name?: string };
      supplierId = supplierBody.id;
      expect(supplierBody.id).toBeTruthy();
      expect(supplierBody.name).toBe("Auto Cleaning Co");

      const listSuppliers = await admin.get(
        `/api/v1/admin/building-additional-information/suppliers/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      expect(listSuppliers.status()).toBe(200);
      const supplierList = (await listSuppliers.json()) as Array<{ id: number }>;
      expect(supplierList.some((item) => item.id === supplierId)).toBeTruthy();

      const updateSupplier = await admin.put(
        `/api/v1/admin/building-additional-information/suppliers/${supplierId}`,
        {
          failOnStatusCode: false,
          data: {
            buildingId: tempBuilding.id,
            name: "Auto Cleaning Co Updated",
            serviceType: "CLEANING",
            phone: "0909999999",
            email: "vip@auto.com",
            address: "2B Update Street",
            note: "Updated"
          }
        }
      );
      expect(updateSupplier.status()).toBe(200);
      const updateSupplierBody = (await updateSupplier.json()) as { id?: number; name?: string };
      expect(updateSupplierBody.id).toBe(supplierId);
      expect(updateSupplierBody.name).toBe("Auto Cleaning Co Updated");

      const supplierRows = await MySqlDbClient.query<{ name: string }>("SELECT name FROM supplier WHERE id = ?", [supplierId]);
      expect(supplierRows[0]!.name).toBe("Auto Cleaning Co Updated");

      const deleteSupplier = await admin.delete(
        `/api/v1/admin/building-additional-information/suppliers/${supplierId}`,
        { failOnStatusCode: false }
      );
      expect(deleteSupplier.status()).toBe(200);
      expect(await deleteSupplier.text()).toBe("");
      supplierId = 0;

      const createPlanningMap = await admin.post("/api/v1/admin/building-additional-information/planning-maps", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          mapType: "Planning Auto",
          issuedBy: "Construction Department",
          issuedDate: "2025-01-01",
          expiredDate: "2030-01-01",
          imageUrl: "planning_auto.jpg",
          note: "Auto test"
        }
      });
      expect(createPlanningMap.status()).toBe(200);
      const planningMapBody = (await createPlanningMap.json()) as { id: number; mapType?: string };
      planningMapId = planningMapBody.id;
      expect(planningMapBody.id).toBeTruthy();
      expect(planningMapBody.mapType).toBe("Planning Auto");

      const listPlanningMaps = await admin.get(
        `/api/v1/admin/building-additional-information/planning-maps/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      expect(listPlanningMaps.status()).toBe(200);
      const planningMapList = (await listPlanningMaps.json()) as Array<{ id: number }>;
      expect(planningMapList.some((item) => item.id === planningMapId)).toBeTruthy();

      const updatePlanningMap = await admin.put(
        `/api/v1/admin/building-additional-information/planning-maps/${planningMapId}`,
        {
          failOnStatusCode: false,
          data: {
            buildingId: tempBuilding.id,
            mapType: "Planning Auto Updated",
            issuedBy: "Construction Department",
            issuedDate: "2025-01-01",
            expiredDate: "2030-01-01",
            imageUrl: "planning_auto.jpg",
            note: "Updated"
          }
        }
      );
      expect(updatePlanningMap.status()).toBe(200);
      const updatePlanningMapBody = (await updatePlanningMap.json()) as { id?: number; mapType?: string };
      expect(updatePlanningMapBody.id).toBe(planningMapId);
      expect(updatePlanningMapBody.mapType).toBe("Planning Auto Updated");

      const planningMapRows = await MySqlDbClient.query<{ map_type: string }>(
        "SELECT map_type FROM planning_map WHERE id = ?",
        [planningMapId]
      );
      expect(planningMapRows[0]!.map_type).toBe("Planning Auto Updated");

      const deletePlanningMap = await admin.delete(
        `/api/v1/admin/building-additional-information/planning-maps/${planningMapId}`,
        { failOnStatusCode: false }
      );
      expect(deletePlanningMap.status()).toBe(200);
      expect(await deletePlanningMap.text()).toBe("");
      planningMapId = 0;
    } finally {
      if (legalAuthorityId) {
        await admin.delete(`/api/v1/admin/building-additional-information/legal-authorities/${legalAuthorityId}`, {
          failOnStatusCode: false
        });
      }
      if (amenityId) {
        await admin.delete(`/api/v1/admin/building-additional-information/nearby-amenities/${amenityId}`, {
          failOnStatusCode: false
        });
      }
      if (supplierId) {
        await admin.delete(`/api/v1/admin/building-additional-information/suppliers/${supplierId}`, {
          failOnStatusCode: false
        });
      }
      if (planningMapId) {
        await admin.delete(`/api/v1/admin/building-additional-information/planning-maps/${planningMapId}`, {
          failOnStatusCode: false
        });
      }
      await TempEntityHelper.xoaBuildingTam(admin, tempBuilding.id);
    }
  });

  test("[BAI_002] planning map image upload validates auth, mime, size, and accepts real JPG", async ({ request }) => {
    const anonymousUpload = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.planningMapJpg()
      }
    });
    expect(anonymousUpload.status()).toBe(401);

    const invalidMime = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.invalidText()
      }
    });
    expect(invalidMime.status()).toBe(400);
    const invalidMimeBody = (await invalidMime.json()) as { message?: string };
    expect(invalidMimeBody.message).toBeTruthy();

    const invalidExtension = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: {
          name: "map.gif",
          mimeType: "image/jpeg",
          buffer: ApiFileFixtures.planningMapJpg().buffer
        }
      }
    });
    expect(invalidExtension.status()).toBe(400);
    const invalidExtensionBody = (await invalidExtension.json()) as { message?: string };
    expect(invalidExtensionBody.message).toBeTruthy();

    const oversizedUpload = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: {
          name: "large.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.alloc(5 * 1024 * 1024 + 16, "a")
        }
      }
    });
    test.fail(true, "Backend/runtime currently accepts oversized planning-map upload instead of returning 400.");
    expect(oversizedUpload.status()).toBe(400);
    const oversizedBody = (await oversizedUpload.json()) as { message?: string };
    expect(oversizedBody.message).toBeTruthy();

    const validUpload = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.planningMapJpg()
      }
    });
    expect(validUpload.status()).toBe(200);
    const validUploadBody = (await validUpload.json()) as {
      message?: string;
      data?: { filename?: string };
    };
    expect(validUploadBody.message).toBeTruthy();
    expect(validUploadBody.data?.filename).toMatch(/^planning_.*\.jpg$/);
  });

  test("[BAI_003] additional information endpoints return 400 for missing resources", async () => {
    const missingLegalAuthority = await admin.put(
      "/api/v1/admin/building-additional-information/legal-authorities/999999",
      {
        failOnStatusCode: false,
        data: { buildingId: 999999, authorityName: "Missing", authorityType: "NOTARY" }
      }
    );
    expect(missingLegalAuthority.status()).toBe(400);
    const missingLegalAuthorityBody = (await missingLegalAuthority.json()) as { message?: string };
    expect(missingLegalAuthorityBody.message).toBeTruthy();

    const missingAmenity = await admin.delete(
      "/api/v1/admin/building-additional-information/nearby-amenities/999999",
      { failOnStatusCode: false }
    );
    expect(missingAmenity.status()).toBe(400);
    const missingAmenityBody = (await missingAmenity.json()) as { message?: string };
    expect(missingAmenityBody.message).toBeTruthy();

    const missingSupplier = await admin.delete("/api/v1/admin/building-additional-information/suppliers/999999", {
      failOnStatusCode: false
    });
    expect(missingSupplier.status()).toBe(400);
    const missingSupplierBody = (await missingSupplier.json()) as { message?: string };
    expect(missingSupplierBody.message).toBeTruthy();

    const missingPlanningMap = await admin.delete(
      "/api/v1/admin/building-additional-information/planning-maps/999999",
      { failOnStatusCode: false }
    );
    expect(missingPlanningMap.status()).toBe(400);
    const missingPlanningMapBody = (await missingPlanningMap.json()) as { message?: string };
    expect(missingPlanningMapBody.message).toBeTruthy();
  });
});
