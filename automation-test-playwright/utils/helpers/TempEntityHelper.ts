import { expect, type APIRequestContext } from "@playwright/test";
import { TestDataFactory } from "./TestDataFactory";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { cleanupDatabaseScope } from "@db/TestDataCleanup";
import { TempEntityCleanupService } from "./TempEntityCleanupService";
import { TempEntityRepository } from "./TempEntityRepository";
import { TempEntityScenarioBuilder } from "./TempEntityScenarioBuilder";
import type {
  EntityRecord,
  PaginatedList,
  TempBuilding,
  TempContract,
  TempCustomer,
  TempInvoice,
  TempPropertyRequest,
  TempSaleContract,
  TempStaff
} from "./TempEntityTypes";

export class TempEntityHelper {
  static async layMotStaffIdDangTonTai(request: APIRequestContext): Promise<number> {
    const response = await request.get("/api/v1/admin/staff", {
      params: { page: 1, size: 1000, role: "STAFF" }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(response);
    const staff = TempEntityRepository.listContent(duLieu).find((item) => typeof item.id === "number");

    expect(staff?.id, "Khong tim thay staff co san de gan cho customer test").toBeTruthy();
    return Number(staff!.id);
  }

  static async taoStaffTam(
    request: APIRequestContext,
    role: "STAFF" | "ADMIN" = "STAFF"
  ): Promise<TempStaff> {
    const payload = TestDataFactory.buildAdminStaffPayload({}, role);
    const fullName = String(payload.fullName);
    const username = String(payload.username);

    const taoResponse = await request.post("/api/v1/admin/staff", {
      data: payload
    });
    expect(taoResponse.status()).toBe(200);

    const timResponse = await request.get("/api/v1/admin/staff", {
      params: { page: 1, size: 1000, fullName, role }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(timResponse);
    const staff = TempEntityRepository.listContent(duLieu).find((item) => item.fullName === fullName || item.username === username);

    expect(staff?.id, "Khong tim thay id cua staff vua tao").toBeTruthy();
    return { id: Number(staff!.id), username, fullName };
  }

  static async xoaStaffTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) return;
    const email = await TempEntityRepository.emailForId("staff", id).catch(() => undefined);
    await TempEntityCleanupService.safe(async () => {
      await TempEntityCleanupService.deleteWithFallback(
        request,
        `/api/v1/admin/staff/${id}`,
        [200, 204, 404],
        { staffIds: [id] }
      );

      await cleanupDatabaseScope({ staffIds: [id], emails: email ? [email] : [] });
    }, `Staff ${id}`);
  }

  static async taoCustomerTam(request: APIRequestContext, staffId?: number): Promise<TempCustomer> {
    const nguoiPhuTrachId = staffId ?? (await this.layMotStaffIdDangTonTai(request));
    const payload = TestDataFactory.buildCustomerPayload({ staffIds: [nguoiPhuTrachId] });
    const fullName = String(payload.fullName);
    const username = String(payload.username);

    const taoResponse = await request.post("/api/v1/admin/customers", {
      data: payload
    });
    expect(taoResponse.status()).toBe(200);

    const timResponse = await request.get("/api/v1/admin/customers", {
      params: { page: 1, size: 1000, fullName }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(timResponse);
    const customer = TempEntityRepository.listContent(duLieu).find((item) => item.fullName === fullName || item.username === username);

    expect(customer?.id, "Khong tim thay id cua customer vua tao").toBeTruthy();
    return { id: Number(customer!.id), username, fullName, staffId: nguoiPhuTrachId };
  }

  static async xoaCustomerTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) return;
    const email = await TempEntityRepository.emailForId("customer", id).catch(() => undefined);
    await TempEntityCleanupService.safe(async () => {
      await TempEntityCleanupService.deleteWithFallback(
        request,
        `/api/v1/admin/customers/${id}`,
        [200, 204, 404],
        { customerIds: [id] }
      );

      await cleanupDatabaseScope({ customerIds: [id], emails: email ? [email] : [] });
    }, `Customer ${id}`);
  }

  static async taoBuildingTam(
    request: APIRequestContext,
    transactionType: "FOR_RENT" | "FOR_SALE" = "FOR_RENT"
  ): Promise<TempBuilding> {
    const payload = TestDataFactory.buildBuildingPayload({}, transactionType);
    const name = String(payload.name);

    const taoResponse = await request.post("/api/v1/admin/buildings", { data: payload });
    expect(taoResponse.status()).toBe(200);

    const timResponse = await request.get("/api/v1/admin/buildings", {
      params: { page: 1, size: 1000, name }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(timResponse);
    const building = TempEntityRepository.listContent(duLieu).find((item) => item.name === name);

    expect(building?.id, "Khong tim thay id cua building vua tao").toBeTruthy();
    return { id: Number(building!.id), name, transactionType };
  }

  static async xoaBuildingTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) return;
    await TempEntityCleanupService.safe(async () => {
      await TempEntityCleanupService.deleteWithFallback(
        request,
        `/api/v1/admin/buildings/${id}`,
        [200, 204, 404],
        { buildingIds: [id] }
      );
    }, `Building ${id}`);
  }

  static async capNhatPhanCongBuilding(request: APIRequestContext, staffId: number, buildingIds: number[]): Promise<void> {
    const response = await request.put(`/api/v1/admin/staff/${staffId}/assignments/buildings`, { data: buildingIds });
    expect(buildingIds.length === 0 ? [200, 204, 400, 404] : [200, 204]).toContain(response.status());
  }

  static async capNhatPhanCongCustomer(request: APIRequestContext, staffId: number, customerIds: number[]): Promise<void> {
    const response = await request.put(`/api/v1/admin/staff/${staffId}/assignments/customers`, { data: customerIds });
    expect(customerIds.length === 0 ? [200, 204, 400, 404] : [200, 204]).toContain(response.status());
  }

  static async taoContractTam(request: APIRequestContext): Promise<TempContract> {
    return TempEntityScenarioBuilder.taoContractTam(request, this);
  }

  static async xoaContractTam(request: APIRequestContext, temp?: TempContract): Promise<void> {
    await TempEntityScenarioBuilder.xoaContractTam(request, this, temp);
  }

  static async taoInvoiceTam(request: APIRequestContext): Promise<TempInvoice> {
    return TempEntityScenarioBuilder.taoInvoiceTam(request, this);
  }

  static async xoaInvoiceTam(request: APIRequestContext, temp?: TempInvoice): Promise<void> {
    await TempEntityScenarioBuilder.xoaInvoiceTam(request, this, temp);
  }

  static async taoSaleContractTam(request: APIRequestContext): Promise<TempSaleContract> {
    return TempEntityScenarioBuilder.taoSaleContractTam(request, this);
  }

  static async xoaSaleContractTam(request: APIRequestContext, temp?: TempSaleContract): Promise<void> {
    await TempEntityScenarioBuilder.xoaSaleContractTam(request, this, temp);
  }

  static async timCustomerIdTheoUsername(username: string): Promise<number> {
    return TempEntityRepository.customerIdByUsername(username);
  }

  static async taoPropertyRequestTam(
    customerRequest: APIRequestContext,
    customerUsername: string,
    buildingId: number,
    requestType: "RENT" | "BUY" = "RENT"
  ): Promise<TempPropertyRequest> {
    const payload = TestDataFactory.buildPropertyRequestPayload({ buildingId }, requestType);
    const submitResponse = await customerRequest.post("/api/v1/customer/property-requests", {
      data: payload,
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expect(submitResponse.status()).toBe(200);

    const customerId = await this.timCustomerIdTheoUsername(customerUsername);
    const rows = await MySqlDbClient.query<{ id: number }>(
      `
        SELECT id
        FROM property_request
        WHERE customer_id = ? AND building_id = ? AND request_type = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [customerId, buildingId, requestType]
    );

    expect(rows.length).toBeGreaterThan(0);
    return { id: rows[0]!.id, buildingId, customerId, requestType };
  }

  static async xoaPropertyRequestTam(id?: number): Promise<void> {
    if (!id) return;
    await TempEntityCleanupService.safe(async () => {
      await MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [id]);
    }, `PropertyRequest ${id}`);
  }
}
