import { expect, type APIRequestContext } from "@playwright/test";
import { cleanupDatabaseScope } from "@db/TestDataCleanup";
import { TestDataFactory } from "./TestDataFactory";
import { TempEntityCleanupService } from "./TempEntityCleanupService";
import { TempEntityRepository } from "./TempEntityRepository";
import type {
  EntityRecord,
  PaginatedList,
  TempBuilding,
  TempContract,
  TempCustomer,
  TempInvoice,
  TempSaleContract,
  TempStaff
} from "./TempEntityTypes";

type TempEntityAtomics = {
  taoStaffTam(request: APIRequestContext): Promise<TempStaff>;
  taoCustomerTam(request: APIRequestContext, staffId?: number): Promise<TempCustomer>;
  taoBuildingTam(request: APIRequestContext, transactionType?: "FOR_RENT" | "FOR_SALE"): Promise<TempBuilding>;
  xoaStaffTam(request: APIRequestContext, id?: number): Promise<void>;
  xoaCustomerTam(request: APIRequestContext, id?: number): Promise<void>;
  xoaBuildingTam(request: APIRequestContext, id?: number): Promise<void>;
  capNhatPhanCongBuilding(request: APIRequestContext, staffId: number, buildingIds: number[]): Promise<void>;
  capNhatPhanCongCustomer(request: APIRequestContext, staffId: number, customerIds: number[]): Promise<void>;
};

export class TempEntityScenarioBuilder {
  static async taoContractTam(request: APIRequestContext, atomics: TempEntityAtomics): Promise<TempContract> {
    const staff = await atomics.taoStaffTam(request);
    const building = await atomics.taoBuildingTam(request, "FOR_RENT");
    await atomics.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await atomics.taoCustomerTam(request, staff.id);
    await atomics.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = TestDataFactory.buildContractPayload({
      customerId: customer.id,
      buildingId: building.id,
      staffId: staff.id
    });

    const taoResponse = await request.post("/api/v1/admin/contracts", { data: payload });
    expect(taoResponse.status()).toBe(200);

    const timResponse = await request.get("/api/v1/admin/contracts", {
      params: { page: 1, size: 1000, customerId: customer.id }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(timResponse);
    const contract = TempEntityRepository
      .listContent(duLieu)
      .find((item) => item.building === building.name);

    expect(contract?.id, "Khong tim thay id cua contract vua tao").toBeTruthy();
    return { id: Number(contract!.id), staff, customer, building };
  }

  static async xoaContractTam(
    request: APIRequestContext,
    atomics: TempEntityAtomics,
    temp?: TempContract
  ): Promise<void> {
    if (!temp) return;

    await TempEntityCleanupService.safe(async () => {
      await TempEntityCleanupService.deleteWithFallback(
        request,
        `/api/v1/admin/contracts/${temp.id}`,
        [200, 204, 404],
        {
          contractIds: [temp.id],
          customerIds: [temp.customer.id],
          buildingIds: [temp.building.id],
          staffIds: [temp.staff.id]
        }
      );
    }, `Contract ${temp.id}`);

    await TempEntityCleanupService.safe(() => atomics.capNhatPhanCongCustomer(request, temp.staff.id, []), "Reset Staff Customer Assignment");
    await TempEntityCleanupService.safe(() => atomics.capNhatPhanCongBuilding(request, temp.staff.id, []), "Reset Staff Building Assignment");
    await atomics.xoaCustomerTam(request, temp.customer.id);
    await atomics.xoaBuildingTam(request, temp.building.id);
    await atomics.xoaStaffTam(request, temp.staff.id);
  }

  static async taoInvoiceTam(request: APIRequestContext, atomics: TempEntityAtomics): Promise<TempInvoice> {
    const contract = await this.taoContractTam(request, atomics);
    const payload = TestDataFactory.buildInvoicePayload({
      contractId: contract.id,
      customerId: contract.customer.id
    });
    const month = Number(payload.month);
    const year = Number(payload.year);

    const taoResponse = await request.post("/api/v1/admin/invoices", { data: payload });
    expect(taoResponse.status()).toBe(200);

    const timResponse = await request.get("/api/v1/admin/invoices", {
      params: { page: 1, size: 1000, customerId: contract.customer.id, month, year }
    });
    const duLieu = await TempEntityRepository.json<PaginatedList<EntityRecord>>(timResponse);
    const invoice = TempEntityRepository.listContent(duLieu).find((item) => item.month === month && item.year === year);

    expect(invoice?.id, "Khong tim thay id cua invoice vua tao").toBeTruthy();
    return { id: Number(invoice!.id), month, year, contract };
  }

  static async xoaInvoiceTam(
    request: APIRequestContext,
    atomics: TempEntityAtomics,
    temp?: TempInvoice
  ): Promise<void> {
    if (!temp) return;

    await TempEntityCleanupService.safe(async () => {
      const response = await request.delete(`/api/v1/admin/invoices/${temp.id}`, {
        failOnStatusCode: false
      });
      if (![200, 204, 404].includes(response.status())) {
        await cleanupDatabaseScope({
          contractIds: [temp.contract.id],
          customerIds: [temp.contract.customer.id],
          buildingIds: [temp.contract.building.id],
          staffIds: [temp.contract.staff.id]
        });
      }
    }, `Invoice ${temp.id}`);

    await this.xoaContractTam(request, atomics, temp.contract);
  }

  static async taoSaleContractTam(request: APIRequestContext, atomics: TempEntityAtomics): Promise<TempSaleContract> {
    const staff = await atomics.taoStaffTam(request);
    const building = await atomics.taoBuildingTam(request, "FOR_SALE");
    await atomics.capNhatPhanCongBuilding(request, staff.id, [building.id]);

    const customer = await atomics.taoCustomerTam(request, staff.id);
    await atomics.capNhatPhanCongCustomer(request, staff.id, [customer.id]);

    const payload = TestDataFactory.buildSaleContractPayload({
      buildingId: building.id,
      customerId: customer.id,
      staffId: staff.id
    });

    const taoResponse = await request.post("/api/v1/admin/sale-contracts", { data: payload });
    expect(taoResponse.status()).toBe(200);

    const saleContractId = await TempEntityRepository.saleContractIdByParties(building.id, customer.id, staff.id);
    return { id: saleContractId, staff, customer, building };
  }

  static async xoaSaleContractTam(
    request: APIRequestContext,
    atomics: TempEntityAtomics,
    temp?: TempSaleContract
  ): Promise<void> {
    if (!temp) return;

    await TempEntityCleanupService.safe(async () => {
      await TempEntityCleanupService.deleteWithFallback(
        request,
        `/api/v1/admin/sale-contracts/${temp.id}`,
        [200, 204, 404],
        {
          saleContractIds: [temp.id],
          customerIds: [temp.customer.id],
          buildingIds: [temp.building.id],
          staffIds: [temp.staff.id]
        }
      );
    }, `SaleContract ${temp.id}`);

    await TempEntityCleanupService.safe(() => atomics.capNhatPhanCongCustomer(request, temp.staff.id, []), "Reset Staff Customer Assignment");
    await TempEntityCleanupService.safe(() => atomics.capNhatPhanCongBuilding(request, temp.staff.id, []), "Reset Staff Building Assignment");
    await atomics.xoaCustomerTam(request, temp.customer.id);
    await atomics.xoaBuildingTam(request, temp.building.id);
    await atomics.xoaStaffTam(request, temp.staff.id);
  }
}
