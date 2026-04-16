import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { TestDataFactory } from "./TestDataFactory";
import { MySqlDbClient } from "@db/MySqlDbClient";

type DanhSachPhanTrang<T> = {
  content?: T[];
};

type BanGhiCoId = {
  id?: number;
  name?: string;
  fullName?: string;
  username?: string;
  customer?: string;
  building?: string;
  month?: number;
  year?: number;
  role?: string;
};

type TempStaff = { id: number; username: string; fullName: string };
type TempCustomer = { id: number; username: string; fullName: string; staffId: number };
type TempBuilding = { id: number; name: string; transactionType: "FOR_RENT" | "FOR_SALE" };
type TempContract = {
  id: number;
  staff: TempStaff;
  customer: TempCustomer;
  building: TempBuilding;
};
type TempInvoice = {
  id: number;
  month: number;
  year: number;
  contract: TempContract;
};
type TempSaleContract = {
  id: number;
  staff: TempStaff;
  customer: TempCustomer;
  building: TempBuilding;
};
type TempPropertyRequest = {
  id: number;
  buildingId: number;
  customerId: number;
  requestType: "RENT" | "BUY";
};

export class TempEntityHelper {
  private static taoSoDienThoai(): string {
    const duoi = String(Date.now()).slice(-9);
    return `0${duoi.padStart(9, "0")}`;
  }

  private static async docJson<T>(response: APIResponse): Promise<T> {
    expect(response.ok(), `API tra ve status ${response.status()} thay vi 2xx`).toBeTruthy();
    return response.json() as Promise<T>;
  }

  private static layNoiDung<T>(duLieu: DanhSachPhanTrang<T> | T[]): T[] {
    if (Array.isArray(duLieu)) {
      return duLieu;
    }

    return Array.isArray(duLieu.content) ? duLieu.content : [];
  }

  static async layMotStaffIdDangTonTai(request: APIRequestContext): Promise<number> {
    const response = await request.get("/api/v1/admin/staff", {
      params: { page: 1, size: 20, role: "STAFF" }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(response);
    const staff = this.layNoiDung(duLieu).find((item) => typeof item.id === "number");

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
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/staff", {
      params: { page: 1, size: 20, fullName, role }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const staff = this.layNoiDung(duLieu).find((item) => item.fullName === fullName || item.username === username);

    expect(staff?.id, "Khong tim thay id cua staff vua tao").toBeTruthy();
    return { id: Number(staff!.id), username, fullName };
  }

  static async xoaStaffTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) {
      return;
    }

    const response = await request.delete(`/api/v1/admin/staff/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async taoCustomerTam(request: APIRequestContext, staffId?: number): Promise<TempCustomer> {
    const nguoiPhuTrachId = staffId ?? (await this.layMotStaffIdDangTonTai(request));
    const payload = TestDataFactory.buildCustomerPayload({ staffIds: [nguoiPhuTrachId] });
    const fullName = String(payload.fullName);
    const username = String(payload.username);

    const taoResponse = await request.post("/api/v1/admin/customers", {
      data: payload
    });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/customers", {
      params: { page: 1, size: 20, fullName }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const customer = this.layNoiDung(duLieu).find((item) => item.fullName === fullName || item.username === username);

    expect(customer?.id, "Khong tim thay id cua customer vua tao").toBeTruthy();
    return { id: Number(customer!.id), username, fullName, staffId: nguoiPhuTrachId };
  }

  static async xoaCustomerTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) {
      return;
    }

    const response = await request.delete(`/api/v1/admin/customers/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async taoBuildingTam(
    request: APIRequestContext,
    transactionType: "FOR_RENT" | "FOR_SALE" = "FOR_RENT"
  ): Promise<TempBuilding> {
    const payload = TestDataFactory.buildBuildingPayload({}, transactionType);
    const name = String(payload.name);

    const taoResponse = await request.post("/api/v1/admin/buildings", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/buildings", {
      params: { page: 1, size: 20, name }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const building = this.layNoiDung(duLieu).find((item) => item.name === name);

    expect(building?.id, "Khong tim thay id cua building vua tao").toBeTruthy();
    return { id: Number(building!.id), name, transactionType };
  }

  static async xoaBuildingTam(request: APIRequestContext, id?: number): Promise<void> {
    if (!id) {
      return;
    }

    const response = await request.delete(`/api/v1/admin/buildings/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async capNhatPhanCongBuilding(request: APIRequestContext, staffId: number, buildingIds: number[]): Promise<void> {
    const response = await request.put(`/api/v1/admin/staff/${staffId}/assignments/buildings`, { data: buildingIds });
    expect([200, 204]).toContain(response.status());
  }

  static async capNhatPhanCongCustomer(request: APIRequestContext, staffId: number, customerIds: number[]): Promise<void> {
    const response = await request.put(`/api/v1/admin/staff/${staffId}/assignments/customers`, { data: customerIds });
    expect([200, 204]).toContain(response.status());
  }

  static async taoContractTam(request: APIRequestContext): Promise<TempContract> {
    const staff = await this.taoStaffTam(request);
    const building = await this.taoBuildingTam(request, "FOR_RENT");
    await this.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await this.taoCustomerTam(request, staff.id);
    await this.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = TestDataFactory.buildContractPayload({
      customerId: customer.id,
      buildingId: building.id,
      staffId: staff.id
    });

    const taoResponse = await request.post("/api/v1/admin/contracts", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/contracts", {
      params: { page: 1, size: 20, customerId: customer.id }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const contract = this
      .layNoiDung(duLieu)
      .find((item) => item.building === building.name);

    expect(contract?.id, "Khong tim thay id cua contract vua tao").toBeTruthy();
    return { id: Number(contract!.id), staff, customer, building };
  }

  static async xoaContractTam(request: APIRequestContext, temp?: TempContract): Promise<void> {
    if (!temp) {
      return;
    }

    await request.delete(`/api/v1/admin/contracts/${temp.id}`);
    await this.capNhatPhanCongCustomer(request, temp.staff.id, []);
    await this.capNhatPhanCongBuilding(request, temp.staff.id, []);
    await this.xoaCustomerTam(request, temp.customer.id);
    await this.xoaBuildingTam(request, temp.building.id);
    await this.xoaStaffTam(request, temp.staff.id);
  }

  static async taoInvoiceTam(request: APIRequestContext): Promise<TempInvoice> {
    const contract = await this.taoContractTam(request);
    const payload = TestDataFactory.buildInvoicePayload({
      contractId: contract.id,
      customerId: contract.customer.id
    });
    const month = Number(payload.month);
    const year = Number(payload.year);

    const taoResponse = await request.post("/api/v1/admin/invoices", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/invoices", {
      params: { page: 1, size: 20, customerId: contract.customer.id, month, year }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const invoice = this.layNoiDung(duLieu).find((item) => item.month === month && item.year === year);

    expect(invoice?.id, "Khong tim thay id cua invoice vua tao").toBeTruthy();
    return { id: Number(invoice!.id), month, year, contract };
  }

  static async xoaInvoiceTam(request: APIRequestContext, temp?: TempInvoice): Promise<void> {
    if (!temp) {
      return;
    }

    await request.delete(`/api/v1/admin/invoices/${temp.id}`);
    await this.xoaContractTam(request, temp.contract);
  }

  static async taoSaleContractTam(request: APIRequestContext): Promise<TempSaleContract> {
    const staff = await this.taoStaffTam(request);
    const building = await this.taoBuildingTam(request, "FOR_SALE");
    await this.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await this.taoCustomerTam(request, staff.id);
    await this.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = TestDataFactory.buildSaleContractPayload({
      buildingId: building.id,
      customerId: customer.id,
      staffId: staff.id
    });

    const taoResponse = await request.post("/api/v1/admin/sale-contracts", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/api/v1/admin/sale-contracts", {
      params: { page: 1, size: 20, customerName: customer.fullName }
    });
    const duLieu = await this.docJson<DanhSachPhanTrang<BanGhiCoId>>(timResponse);
    const saleContract = this
      .layNoiDung(duLieu)
      .find((item) => item.customer === customer.fullName || item.building === building.name);

    expect(saleContract?.id, "Khong tim thay id cua sale contract vua tao").toBeTruthy();
    return { id: Number(saleContract!.id), staff, customer, building };
  }

  static async xoaSaleContractTam(request: APIRequestContext, temp?: TempSaleContract): Promise<void> {
    if (!temp) {
      return;
    }

    await request.delete(`/api/v1/admin/sale-contracts/${temp.id}`);
    await this.capNhatPhanCongCustomer(request, temp.staff.id, []);
    await this.capNhatPhanCongBuilding(request, temp.staff.id, []);
    await this.xoaCustomerTam(request, temp.customer.id);
    await this.xoaBuildingTam(request, temp.building.id);
    await this.xoaStaffTam(request, temp.staff.id);
  }

  static async timCustomerIdTheoUsername(username: string): Promise<number> {
    const rows = await MySqlDbClient.query<{ id: number }>("SELECT id FROM customer WHERE username = ? LIMIT 1", [username]);
    expect(rows.length).toBeGreaterThan(0);
    return rows[0]!.id;
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
    if (!id) {
      return;
    }

    await MySqlDbClient.execute("DELETE FROM property_request WHERE id = ?", [id]);
  }
}


