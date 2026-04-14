import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { TestDataFactory } from "./TestDataFactory";

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
    const response = await request.get("/admin/staff/list/page", {
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
    const hauTo = TestDataFactory.taoHauToDuyNhat("staff");
    const fullName = `PW ${role} ${hauTo}`;
    const username = `${role.toLowerCase()}${String(Date.now()).slice(-8)}`;
    const email = TestDataFactory.taoEmail(`pw-${role.toLowerCase()}`);
    const phone = this.taoSoDienThoai();

    const taoResponse = await request.post("/admin/staff/add", {
      data: {
        username,
        password: "12345678",
        fullName,
        phone,
        email,
        role
      }
    });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/staff/search/page", {
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

    const response = await request.delete(`/admin/staff/delete/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async taoCustomerTam(request: APIRequestContext, staffId?: number): Promise<TempCustomer> {
    const nguoiPhuTrachId = staffId ?? (await this.layMotStaffIdDangTonTai(request));
    const hauTo = TestDataFactory.taoHauToDuyNhat("customer");
    const fullName = `PW Customer ${hauTo}`;
    const username = `pwcust${String(Date.now()).slice(-8)}`;
    const email = TestDataFactory.taoEmail("pw-customer");
    const phone = this.taoSoDienThoai();

    const taoResponse = await request.post("/admin/customer/add", {
      data: {
        username,
        password: "12345678",
        fullName,
        phone,
        email,
        staffIds: [nguoiPhuTrachId]
      }
    });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/customer/search/page", {
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

    const response = await request.delete(`/admin/customer/delete/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async taoBuildingTam(
    request: APIRequestContext,
    transactionType: "FOR_RENT" | "FOR_SALE" = "FOR_RENT"
  ): Promise<TempBuilding> {
    const hauTo = TestDataFactory.taoHauToDuyNhat("building");
    const name = `PW Building ${hauTo}`;

    const payload = {
      districtId: 1,
      numberOfFloor: 10,
      numberOfBasement: 1,
      floorArea: 200,
      rentPrice: transactionType === "FOR_RENT" ? 1000000 : null,
      deposit: transactionType === "FOR_RENT" ? 2000000 : null,
      serviceFee: transactionType === "FOR_RENT" ? 100000 : null,
      carFee: transactionType === "FOR_RENT" ? 50000 : null,
      motorbikeFee: transactionType === "FOR_RENT" ? 20000 : null,
      waterFee: transactionType === "FOR_RENT" ? 15000 : null,
      electricityFee: transactionType === "FOR_RENT" ? 3500 : null,
      salePrice: transactionType === "FOR_SALE" ? 3000000000 : null,
      name,
      ward: "Xuan La",
      street: "Vo Chi Cong",
      propertyType: "OFFICE",
      transactionType,
      direction: "DONG",
      level: "A",
      taxCode: `PW-${Date.now()}`,
      linkOfBuilding: "https://example.com",
      image: null,
      rentAreaValues: "50,100",
      latitude: 21.0686,
      longitude: 105.8033,
      staffIds: []
    };

    const taoResponse = await request.post("/admin/building/add", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/building/search/page", {
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

    const response = await request.delete(`/admin/building/delete/${id}`);
    expect([200, 204, 404]).toContain(response.status());
  }

  static async capNhatPhanCongBuilding(request: APIRequestContext, staffId: number, buildingIds: number[]): Promise<void> {
    const response = await request.put(`/admin/staff/${staffId}/assignments/buildings`, { data: buildingIds });
    expect([200, 204]).toContain(response.status());
  }

  static async capNhatPhanCongCustomer(request: APIRequestContext, staffId: number, customerIds: number[]): Promise<void> {
    const response = await request.put(`/admin/staff/${staffId}/assignments/customers`, { data: customerIds });
    expect([200, 204]).toContain(response.status());
  }

  static async taoContractTam(request: APIRequestContext): Promise<TempContract> {
    const staff = await this.taoStaffTam(request);
    const building = await this.taoBuildingTam(request, "FOR_RENT");
    await this.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await this.taoCustomerTam(request, staff.id);
    await this.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = {
      customerId: customer.id,
      buildingId: building.id,
      staffId: staff.id,
      rentPrice: 1000000,
      rentArea: 50,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "ACTIVE"
    };

    const taoResponse = await request.post("/admin/contract/add", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/contract/search/page", {
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

    await request.delete(`/admin/contract/delete/${temp.id}`);
    await this.capNhatPhanCongCustomer(request, temp.staff.id, []);
    await this.capNhatPhanCongBuilding(request, temp.staff.id, []);
    await this.xoaCustomerTam(request, temp.customer.id);
    await this.xoaBuildingTam(request, temp.building.id);
    await this.xoaStaffTam(request, temp.staff.id);
  }

  static async taoInvoiceTam(request: APIRequestContext): Promise<TempInvoice> {
    const contract = await this.taoContractTam(request);
    const thoiDiem = new Date();
    thoiDiem.setMonth(thoiDiem.getMonth() - 1);
    const month = thoiDiem.getMonth() + 1;
    const year = thoiDiem.getFullYear();
    const dueDate = new Date(year, month, 10).toISOString().slice(0, 10);

    const payload = {
      contractId: contract.id,
      customerId: contract.customer.id,
      month,
      year,
      status: "PENDING",
      dueDate,
      totalAmount: 1500000,
      details: [{ description: "Phi dich vu test", amount: 1500000 }],
      electricityUsage: 10,
      waterUsage: 5
    };

    const taoResponse = await request.post("/admin/invoice/add", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/invoice/search/page", {
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

    await request.delete(`/admin/invoice/delete/${temp.id}`);
    await this.xoaContractTam(request, temp.contract);
  }

  static async taoSaleContractTam(request: APIRequestContext): Promise<TempSaleContract> {
    const staff = await this.taoStaffTam(request);
    const building = await this.taoBuildingTam(request, "FOR_SALE");
    await this.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await this.taoCustomerTam(request, staff.id);
    await this.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = {
      buildingId: building.id,
      customerId: customer.id,
      staffId: staff.id,
      salePrice: 3000000000,
      transferDate: null,
      note: "Hop dong mua ban test"
    };

    const taoResponse = await request.post("/admin/sale-contract/add", { data: payload });
    expect([200, 201]).toContain(taoResponse.status());

    const timResponse = await request.get("/admin/sale-contract/search/page", {
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

    await request.delete(`/admin/sale-contract/delete/${temp.id}`);
    await this.capNhatPhanCongCustomer(request, temp.staff.id, []);
    await this.capNhatPhanCongBuilding(request, temp.staff.id, []);
    await this.xoaCustomerTam(request, temp.customer.id);
    await this.xoaBuildingTam(request, temp.building.id);
    await this.xoaStaffTam(request, temp.staff.id);
  }
}
