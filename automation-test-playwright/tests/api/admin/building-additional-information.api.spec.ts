import { expect, test } from "@fixtures/api.fixture";
import { ApiFileFixtures } from "@api/apiFileFixtures";
import { expectApiErrorBody, expectApiMessage, expectArrayBody, expectObjectBody } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { TestDbRepository } from "@db/repositories";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";
import { cleanupUploadedFileByName } from "@helpers/UploadedFileCleanupHelper";

test.describe("Admin - API Building Additional Information @extended @api", () => {
  const missingSmallId = TestDataFactory.missingSmallId;

  test("[BAI-001] - API Admin Building Additional Information - CRUD Lifecycle - Legal Authority Amenity Supplier and Planning Map Flow", async ({
    adminApi: admin,
    request
  }) => {
    const tempBuilding = await TempEntityHelper.taoBuildingTam(admin, "FOR_RENT");

    let legalAuthorityId = 0;
    let amenityId = 0;
    let supplierId = 0;
    let planningMapId = 0;
    const legalAuthorityPayload = {
      authorityName: `Auto Notary Office ${TestDataFactory.taoHauToDuyNhat("legal")}`,
      address: "123 Test Street",
      phone: TestDataFactory.taoSoDienThoai(),
      email: TestDataFactory.taoEmail("legal-authority")
    };
    const updatedLegalAuthorityPayload = {
      authorityName: `Auto Law Office Updated ${TestDataFactory.taoHauToDuyNhat("legal")}`,
      address: "456 Update Street",
      phone: TestDataFactory.taoSoDienThoai(),
      email: TestDataFactory.taoEmail("legal-authority-updated")
    };
    const supplierPayload = {
      name: `Auto Cleaning Co ${TestDataFactory.taoHauToDuyNhat("supplier")}`,
      phone: TestDataFactory.taoSoDienThoai(),
      email: TestDataFactory.taoEmail("supplier")
    };
    const updatedSupplierPayload = {
      name: `Auto Cleaning Co Updated ${TestDataFactory.taoHauToDuyNhat("supplier")}`,
      phone: TestDataFactory.taoSoDienThoai(),
      email: TestDataFactory.taoEmail("supplier-updated")
    };

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
      expect(invalidAuthorityError.message).toMatch(/authority|name|tn|d? di|max/i);

      const createLegalAuthority = await admin.post("/api/v1/admin/building-additional-information/legal-authorities", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          authorityName: legalAuthorityPayload.authorityName,
          authorityType: "NOTARY",
          address: legalAuthorityPayload.address,
          phone: legalAuthorityPayload.phone,
          email: legalAuthorityPayload.email,
          note: "Auto test"
        }
      });
      const legalAuthorityBody = await expectObjectBody<{ id: number; authorityName?: string; buildingId?: number }>(
        createLegalAuthority,
        200,
        ["id", "authorityName", "buildingId"]
      );
      legalAuthorityId = legalAuthorityBody.id;
      expect(legalAuthorityBody.authorityName).toBe(legalAuthorityPayload.authorityName);
      expect(legalAuthorityBody.buildingId).toBe(tempBuilding.id);

      const listLegalAuthorities = await admin.get(
        `/api/v1/admin/building-additional-information/legal-authorities/${tempBuilding.id}`,
        { failOnStatusCode: false }
      );
      const legalAuthorityList = await expectArrayBody<{ id: number; authorityName?: string }>(listLegalAuthorities, 200);
      expect(legalAuthorityList.some((item) => item.id === legalAuthorityId && item.authorityName === legalAuthorityPayload.authorityName)).toBeTruthy();

      const updateLegalAuthority = await admin.put(
        `/api/v1/admin/building-additional-information/legal-authorities/${legalAuthorityId}`,
        {
          failOnStatusCode: false,
          data: {
            buildingId: tempBuilding.id,
            authorityName: updatedLegalAuthorityPayload.authorityName,
            authorityType: "LAW_FIRM",
            address: updatedLegalAuthorityPayload.address,
            phone: updatedLegalAuthorityPayload.phone,
            email: updatedLegalAuthorityPayload.email,
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
      expect(updateLegalAuthorityBody.authorityName).toBe(updatedLegalAuthorityPayload.authorityName);

      const legalAuthorityRows = await TestDbRepository.query<{
        authority_name: string;
        authority_type: string;
      }>("SELECT authority_name, authority_type FROM legal_authority WHERE id = ?", [legalAuthorityId]);
      expect(legalAuthorityRows[0]!.authority_name).toBe(updatedLegalAuthorityPayload.authorityName);
      expect(legalAuthorityRows[0]!.authority_type).toBe("LAW_FIRM");

      const deleteLegalAuthority = await admin.delete(
        `/api/v1/admin/building-additional-information/legal-authorities/${legalAuthorityId}`,
        { failOnStatusCode: false }
      );
      expect(deleteLegalAuthority.status()).toBe(200);
      expect(await deleteLegalAuthority.text()).toBe("");
      const deletedLegalAuthorityRows = await TestDbRepository.query<{ count: number }>(
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

      const amenityRows = await TestDbRepository.query<{ name: string; distance_meter: number }>(
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
      const deletedAmenityRows = await TestDbRepository.query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM nearby_amenity WHERE id = ?",
        [amenityId]
      );
      expect(Number(deletedAmenityRows[0]?.count ?? 0)).toBe(0);
      amenityId = 0;

      const createSupplier = await admin.post("/api/v1/admin/building-additional-information/suppliers", {
        failOnStatusCode: false,
        data: {
          buildingId: tempBuilding.id,
          name: supplierPayload.name,
          serviceType: "CLEANING",
          phone: supplierPayload.phone,
          email: supplierPayload.email,
          address: "1A Test Street",
          note: "Auto test"
        }
      });
      const supplierBody = await expectObjectBody<{ id: number; name?: string }>(createSupplier, 200, ["id", "name"]);
      supplierId = supplierBody.id;
      expect(supplierBody.name).toBe(supplierPayload.name);

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
            name: updatedSupplierPayload.name,
            serviceType: "CLEANING",
            phone: updatedSupplierPayload.phone,
            email: updatedSupplierPayload.email,
            address: "2B Update Street",
            note: "Updated"
          }
        }
      );
      const updateSupplierBody = await expectObjectBody<{ id?: number; name?: string }>(updateSupplier, 200, ["id", "name"]);
      expect(updateSupplierBody.id).toBe(supplierId);
      expect(updateSupplierBody.name).toBe(updatedSupplierPayload.name);

      const supplierRows = await TestDbRepository.query<{ name: string }>("SELECT name FROM supplier WHERE id = ?", [supplierId]);
      expect(supplierRows[0]!.name).toBe(updatedSupplierPayload.name);

      const deleteSupplier = await admin.delete(
        `/api/v1/admin/building-additional-information/suppliers/${supplierId}`,
        { failOnStatusCode: false }
      );
      expect(deleteSupplier.status()).toBe(200);
      expect(await deleteSupplier.text()).toBe("");
      const deletedSupplierRows = await TestDbRepository.query<{ count: number }>(
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

      const planningMapRows = await TestDbRepository.query<{ map_type: string }>(
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
      const deletedPlanningMapRows = await TestDbRepository.query<{ count: number }>(
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

  test("[BAI-002] - API Admin Building Additional Information - Planning Map Image - Authentication Type Size and JPG Upload Validation", async ({ adminApi: admin, request }) => {
    let uploadedFilename = "";
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
    expect(invalidMimeError.message).toMatch(/image|mime|type|d?nh d?ng|jpg|png|webp/i);

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
    expect(invalidExtensionError.message).toMatch(/extension|jpg|jpeg|file|d?nh d?ng/i);

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

    try {
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
      uploadedFilename = validUploadBody.data?.filename ?? "";
      expect(uploadedFilename).toMatch(/^planning_.*\.jpg$/);
    } finally {
      await cleanupUploadedFileByName("planning", uploadedFilename);
    }
  });

  test("[BAI-003] - API Admin Building Additional Information - Resource Reference - Missing Resource 400 Handling", async ({ adminApi: admin }) => {
    const missingLegalAuthority = await admin.put(
      `/api/v1/admin/building-additional-information/legal-authorities/${missingSmallId}`,
      {
        failOnStatusCode: false,
        data: { buildingId: missingSmallId, authorityName: "Missing", authorityType: "NOTARY" }
      }
    );
    const missingLegalAuthorityError = await expectApiErrorBody<{ message?: string }>(missingLegalAuthority, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/building-additional-information/legal-authorities/${missingSmallId}`
    });
    expect(missingLegalAuthorityError.message).toMatch(/legal|authority|co quan php l|khng tm th?y|not found/i);

    const missingAmenity = await admin.delete(
      `/api/v1/admin/building-additional-information/nearby-amenities/${missingSmallId}`,
      { failOnStatusCode: false }
    );
    const missingAmenityError = await expectApiErrorBody<{ message?: string }>(missingAmenity, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/building-additional-information/nearby-amenities/${missingSmallId}`
    });
    expect(missingAmenityError.message).toMatch(/amenity|ti?n ch|ln c?n|khng tm th?y|not found/i);

    const missingSupplier = await admin.delete(`/api/v1/admin/building-additional-information/suppliers/${missingSmallId}`, {
      failOnStatusCode: false
    });
    const missingSupplierError = await expectApiErrorBody<{ message?: string }>(missingSupplier, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/building-additional-information/suppliers/${missingSmallId}`
    });
    expect(missingSupplierError.message).toMatch(/supplier|nh cung c?p|khng tm th?y|not found/i);

    const missingPlanningMap = await admin.delete(
      `/api/v1/admin/building-additional-information/planning-maps/${missingSmallId}`,
      { failOnStatusCode: false }
    );
    const missingPlanningMapError = await expectApiErrorBody<{ message?: string }>(missingPlanningMap, {
      status: 400,
      code: "BAD_REQUEST",
      path: `/api/v1/admin/building-additional-information/planning-maps/${missingSmallId}`
    });
    expect(missingPlanningMapError.message).toMatch(/planning|map|b?n d?|quy ho?ch|khng t?n t?i|khng tm th?y|not found/i);
  });
});
