import { expect, test } from "@fixtures/api.fixture";
import type { APIRequestContext } from "@playwright/test";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { expectApiErrorBody, expectApiMessage, expectArrayBody, expectObjectBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";

test.describe("Admin - kiem thu API building additional information @extended", () => {
  let admin: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    admin = await ApiSessionHelper.newContext(playwright, "admin");
  });

  test.afterAll(async () => {
    await admin.dispose();
    await MySqlDbClient.close();
  });

  test("[BAI_001] vong doi CRUD day du cho legal authority, nearby amenity, supplier, planning map with temp building", async ({
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
      await expectApiErrorBody(anonymousLegalAuthority, {
        status: 401,
        code: "UNAUTHORIZED",
        path: "/api/v1/admin/building-additional-information/legal-authorities"
      });

      const invalidAuthorityName = await admin.post("/api/v1/admin/building-additional-information/legal-authorities", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          authorityName: "A".repeat(256),
          authorityType: "NOTARY"
        }
      });
      const invalidAuthorityError = await expectApiErrorBody<{ message?: string }>(invalidAuthorityName, {
        status: 400,
        code: "BAD_REQUEST",
        path: "/api/v1/admin/building-additional-information/legal-authorities"
      });
      expect(invalidAuthorityError.message).toMatch(/authority|name|ten|do dai|max/i);

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
      const legalAuthorityBody = await expectObjectBody<{ id: number; authorityName?: string; buildingId?: number }>(
        createLegalAuthority,
        200,
        ["id", "authorityName", "buildingId"]
      );
      legalAuthorityId = legalAuthorityBody.id;
      expect(legalAuthorityBody.authorityName).toBe("Auto Notary Office");
      expect(legalAuthorityBody.buildingId).toBe(tempBuilding.id);

      const listLegalAuthorities = await admin.get(
        `/api/v1/admin/building-additional-information/legal-authorities/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      const legalAuthorityList = await expectArrayBody<{ id: number; authorityName?: string }>(listLegalAuthorities, 200);
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
      const updateLegalAuthorityBody = await expectObjectBody<{ id?: number; authorityName?: string }>(
        updateLegalAuthority,
        200,
        ["id", "authorityName"]
      );
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
      const deletedLegalAuthorityRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM legal_authority WHERE id = ?",
        [legalAuthorityId]
      );
      expect(Number(deletedLegalAuthorityRows[0]?.count ?? 0)).toBe(0);
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
      const amenityBody = await expectObjectBody<{ id: number; name?: string }>(createAmenity, 200, ["id", "name"]);
      amenityId = amenityBody.id;
      expect(amenityBody.name).toBe("Auto Test Park");

      const listAmenities = await admin.get(
        `/api/v1/admin/building-additional-information/nearby-amenities/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      const amenityList = await expectArrayBody<{ id: number }>(listAmenities, 200);
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
      const updateAmenityBody = await expectObjectBody<{ id?: number; name?: string }>(updateAmenity, 200, ["id", "name"]);
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
      const deletedAmenityRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM nearby_amenity WHERE id = ?",
        [amenityId]
      );
      expect(Number(deletedAmenityRows[0]?.count ?? 0)).toBe(0);
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
      const supplierBody = await expectObjectBody<{ id: number; name?: string }>(createSupplier, 200, ["id", "name"]);
      supplierId = supplierBody.id;
      expect(supplierBody.name).toBe("Auto Cleaning Co");

      const listSuppliers = await admin.get(
        `/api/v1/admin/building-additional-information/suppliers/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      const supplierList = await expectArrayBody<{ id: number }>(listSuppliers, 200);
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
      const updateSupplierBody = await expectObjectBody<{ id?: number; name?: string }>(updateSupplier, 200, ["id", "name"]);
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
      const deletedSupplierRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM supplier WHERE id = ?",
        [supplierId]
      );
      expect(Number(deletedSupplierRows[0]?.count ?? 0)).toBe(0);
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
      const planningMapBody = await expectObjectBody<{ id: number; mapType?: string }>(
        createPlanningMap,
        200,
        ["id", "mapType"]
      );
      planningMapId = planningMapBody.id;
      expect(planningMapBody.mapType).toBe("Planning Auto");

      const listPlanningMaps = await admin.get(
        `/api/v1/admin/building-additional-information/planning-maps/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      const planningMapList = await expectArrayBody<{ id: number }>(listPlanningMaps, 200);
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
      const updatePlanningMapBody = await expectObjectBody<{ id?: number; mapType?: string }>(
        updatePlanningMap,
        200,
        ["id", "mapType"]
      );
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
      const deletedPlanningMapRows = await MySqlDbClient.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM planning_map WHERE id = ?",
        [planningMapId]
      );
      expect(Number(deletedPlanningMapRows[0]?.count ?? 0)).toBe(0);
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

  test("[BAI_002] planning map image upload kiem tra auth, mime, kich thuoc va chap nhan JPG that", async ({ request }) => {
    const anonymousUpload = await request.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.planningMapJpg()
      }
    });
    await expectApiErrorBody(anonymousUpload, {
      status: 401,
      code: "UNAUTHORIZED",
      path: "/api/v1/admin/building-additional-information/planning-maps/image"
    });

    const invalidMime = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.invalidText()
      }
    });
    const invalidMimeError = await expectApiErrorBody<{ message?: string }>(invalidMime, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/planning-maps/image"
    });
    expect(invalidMimeError.message).toMatch(/image|mime|type|định dạng|dinh dang|jpg|png|webp/i);

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
    const invalidExtensionError = await expectApiErrorBody<{ message?: string }>(invalidExtension, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/planning-maps/image"
    });
    expect(invalidExtensionError.message).toMatch(/extension|jpg|jpeg|file|dinh dang/i);

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
    await expectApiErrorBody(oversizedUpload, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/planning-maps/image"
    });

    const validUpload = await admin.post("/api/v1/admin/building-additional-information/planning-maps/image", {
      failOnStatusCode: false,
      multipart: {
        file: ApiFileFixtures.planningMapJpg()
      }
    });
    const validUploadBody = await expectApiMessage<{ message?: string; data?: { filename?: string } }>(validUpload, {
      status: 200,
      message: apiExpectedMessages.admin.buildingAdditionalInformation.upload,
      dataMode: "object"
    });
    expect(validUploadBody.data?.filename).toMatch(/^planning_.*\.jpg$/);
  });

  test("[BAI_003] additional information endpoints tra ve 400 for thieu resources", async () => {
    const missingLegalAuthority = await admin.put(
      "/api/v1/admin/building-additional-information/legal-authorities/999999",
      {
        failOnStatusCode: false,
        data: { buildingId: 999999, authorityName: "Missing", authorityType: "NOTARY" }
      }
    );
    const missingLegalAuthorityError = await expectApiErrorBody<{ message?: string }>(missingLegalAuthority, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/legal-authorities/999999"
    });
    expect(missingLegalAuthorityError.message).toMatch(/legal|authority|cơ quan pháp lý|co quan phap ly|không tìm thấy|khong tim thay|not found/i);

    const missingAmenity = await admin.delete(
      "/api/v1/admin/building-additional-information/nearby-amenities/999999",
      { failOnStatusCode: false }
    );
    const missingAmenityError = await expectApiErrorBody<{ message?: string }>(missingAmenity, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/nearby-amenities/999999"
    });
    expect(missingAmenityError.message).toMatch(/amenity|tiện ích|tien ich|lân cận|lan can|không tìm thấy|khong tim thay|not found/i);

    const missingSupplier = await admin.delete("/api/v1/admin/building-additional-information/suppliers/999999", {
      failOnStatusCode: false
    });
    const missingSupplierError = await expectApiErrorBody<{ message?: string }>(missingSupplier, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/suppliers/999999"
    });
    expect(missingSupplierError.message).toMatch(/supplier|nhà cung cấp|nha cung cap|không tìm thấy|khong tim thay|not found/i);

    const missingPlanningMap = await admin.delete(
      "/api/v1/admin/building-additional-information/planning-maps/999999",
      { failOnStatusCode: false }
    );
    const missingPlanningMapError = await expectApiErrorBody<{ message?: string }>(missingPlanningMap, {
      status: 400,
      code: "BAD_REQUEST",
      path: "/api/v1/admin/building-additional-information/planning-maps/999999"
    });
    expect(missingPlanningMapError.message).toMatch(/planning|map|ban do|bản đồ|quy hoạch|khong ton tai|không tồn tại|khong tim thay|không tìm thấy|not found/i);
  });
});



