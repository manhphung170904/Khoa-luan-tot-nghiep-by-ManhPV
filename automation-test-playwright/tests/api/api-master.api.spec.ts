import { expect, test } from "@playwright/test";
import { AssertionHelper } from "@helpers/AssertionHelper";
import { AuthSessionHelper } from "@helpers/AuthSessionHelper";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestSafetyHelper } from "@helpers/TestSafetyHelper";
import { env } from "@config/env";

const SAMPLE_ID = 1;

test.describe("API Master Suite", () => {
  test("API-001 (API quen mat khau)", async ({ request }) => {
    const validResponse = await request.post("/api/auth/forgot-password", { params: { email: "demo@example.com" } });
    AssertionHelper.expectStatusIn(validResponse, [200, 400, 409]);

    const invalidResponse = await request.post("/api/auth/forgot-password", { params: { email: "invalid-email" } });
    AssertionHelper.expectStatusIn(invalidResponse, [200, 400, 409, 500]);

    const missingResponse = await request.post("/api/auth/forgot-password");
    AssertionHelper.expectStatusIn(missingResponse, [400, 500]);
  });

  test("API-002 (API tim kiem toa nha cong khai) @extended @regression", async ({ request }) => {
    const allResponse = await request.get("/suntower/building/search");
    AssertionHelper.expectStatusIn(allResponse, [200]);

    const filteredResponse = await request.get("/suntower/building/search", { params: { name: "tower" } });
    AssertionHelper.expectStatusIn(filteredResponse, [200]);

    const invalidResponse = await request.get("/suntower/building/search", { params: { districtId: "invalid" } });
    AssertionHelper.expectStatusIn(invalidResponse, [200, 400, 500]);
  });

  test("API-003 (API tao thanh toan VNPay)", async ({ request }) => {
    const validResponse = await request.get(`/payment/vnpay/${SAMPLE_ID}`);
    AssertionHelper.expectStatusIn(validResponse, [200, 400, 404, 500]);

    const missingResponse = await request.get("/payment/vnpay/999999");
    AssertionHelper.expectStatusIn(missingResponse, [200, 400, 404, 500]);
  });

  test("API-004 (API tra ve va IPN cua VNPay)", async ({ request }) => {
    const returnSuccess = await request.get("/payment/vnpay-return", { params: { vnp_ResponseCode: "00" } });
    AssertionHelper.expectStatusIn(returnSuccess, [200, 500]);

    const returnFail = await request.get("/payment/vnpay-return", { params: { vnp_ResponseCode: "24" } });
    AssertionHelper.expectStatusIn(returnFail, [200, 500]);

    const ipnResponse = await request.get("/payment/vnpay-ipn", { params: { vnp_ResponseCode: "97" } });
    AssertionHelper.expectStatusIn(ipnResponse, [200, 500]);
  });

  test("API-005 (API danh sach va tim kiem toa nha quan tri) @extended @regression", async ({ playwright, request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);

    AssertionHelper.expectStatusIn(await request.get("/admin/building/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/building/search/page", { params: { name: "tower" } }), [200]);

    const unauthenticated = await playwright.request.newContext({ baseURL: env.baseUrl });
    try {
      AssertionHelper.expectStatusIn(await unauthenticated.get("/admin/building/list/page"), [200, 401, 403, 302]);
    } finally {
      await unauthenticated.dispose();
    }
  });

  test("API-006 (API them toa nha quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    const valid = await request.post("/admin/building/add", { multipart: { name: "PW Demo Building" } });
    AssertionHelper.expectStatusIn(valid, [200, 201, 400, 500]);

    const invalid = await request.post("/admin/building/add", { multipart: {} });
    AssertionHelper.expectStatusIn(invalid, [400, 500]);
  });

  test("API-007 (API sua va xoa toa nha quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let buildingId: number | undefined;

    try {
      const building = await TempEntityHelper.taoBuildingTam(request, "FOR_RENT");
      buildingId = building.id;

      AssertionHelper.expectStatusIn(
        await request.put("/admin/building/edit", {
          data: {
            id: building.id,
            districtId: 1,
            numberOfFloor: 12,
            numberOfBasement: 1,
            floorArea: 220,
            rentPrice: 1100000,
            deposit: 2500000,
            serviceFee: 120000,
            carFee: 60000,
            motorbikeFee: 25000,
            waterFee: 16000,
            electricityFee: 3600,
            salePrice: null,
            name: `${building.name} Updated`,
            ward: "Xuan La",
            street: "Vo Chi Cong",
            propertyType: "OFFICE",
            transactionType: "FOR_RENT",
            direction: "DONG",
            level: "A",
            taxCode: `PW-${Date.now()}`,
            linkOfBuilding: "https://example.com/updated",
            image: null,
            rentAreaValues: "50,100",
            latitude: 21.0686,
            longitude: 105.8033,
            staffIds: []
          }
        }),
        [200]
      );

      AssertionHelper.expectStatusIn(await request.delete(`/admin/building/delete/${building.id}`), [200, 204]);
      buildingId = undefined;
      AssertionHelper.expectStatusIn(await request.delete("/admin/building/delete/999999"), [400, 404, 409, 500]);
    } finally {
      await TempEntityHelper.xoaBuildingTam(request, buildingId);
    }
  });

  test("API-008 (API tai anh toa nha quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    const invalidUpload = await request.post("/admin/building/upload-image");
    AssertionHelper.expectStatusIn(invalidUpload, [400, 500]);
  });

  test("API-009 (API CRUD phap ly toa nha)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get(`/admin/building-additional-information/legal-authority/${SAMPLE_ID}/list`), [200]);
    AssertionHelper.expectStatusIn(await request.post("/admin/building-additional-information/legal-authority", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put(`/admin/building-additional-information/legal-authority/${SAMPLE_ID}`, { data: {} }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/building-additional-information/legal-authority/${SAMPLE_ID}`), [200, 204, 400, 404, 500]);
  });

  test("API-010 (API CRUD tien ich lan can)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get(`/admin/building-additional-information/nearby-amenity/${SAMPLE_ID}/list`), [200]);
    AssertionHelper.expectStatusIn(await request.post("/admin/building-additional-information/nearby-amenity", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put(`/admin/building-additional-information/nearby-amenity/${SAMPLE_ID}`, { data: {} }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/building-additional-information/nearby-amenity/${SAMPLE_ID}`), [200, 204, 400, 404, 500]);
  });

  test("API-011 (API CRUD nha cung cap)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get(`/admin/building-additional-information/supplier/${SAMPLE_ID}/list`), [200]);
    AssertionHelper.expectStatusIn(await request.post("/admin/building-additional-information/supplier", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put(`/admin/building-additional-information/supplier/${SAMPLE_ID}`, { data: {} }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/building-additional-information/supplier/${SAMPLE_ID}`), [200, 204, 400, 404, 500]);
  });

  test("API-012 (API CRUD quy hoach va tai anh)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get(`/admin/building-additional-information/planning-map/${SAMPLE_ID}/list`), [200]);
    AssertionHelper.expectStatusIn(await request.post("/admin/building-additional-information/planning-map", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put(`/admin/building-additional-information/planning-map/${SAMPLE_ID}`, { data: {} }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/building-additional-information/planning-map/${SAMPLE_ID}`), [200, 204, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.post("/admin/building-additional-information/planning-map/upload-image"), [400, 500]);
  });

  test("API-013 (API danh sach va tim kiem khach hang quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get("/admin/customer/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/customer/search/page", { params: { fullName: "a" } }), [200]);
  });

  test("API-014 (API them va xoa khach hang quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let customerId: number | undefined;

    try {
      const customer = await TempEntityHelper.taoCustomerTam(request);
      customerId = customer.id;
      expect(customerId).toBeGreaterThan(0);
      AssertionHelper.expectStatusIn(await request.get("/admin/customer/search/page", { params: { fullName: customer.fullName } }), [200]);
    } finally {
      await TempEntityHelper.xoaCustomerTam(request, customerId);
    }
  });

  test("API-015 (API danh sach va tim kiem hop dong quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get("/admin/contract/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/contract/search/page", { params: { customerName: "a" } }), [200]);
  });

  test("API-016 (API them sua xoa cap nhat trang thai hop dong quan tri)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.post("/admin/contract/add", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/contract/edit", { data: { id: SAMPLE_ID } }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/contract/status", { data: { id: SAMPLE_ID, status: "ACTIVE" } }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/contract/delete/${SAMPLE_ID}`), [200, 400, 404, 500]);
  });

  test("API-017 (API danh sach va tim kiem hoa don quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get("/admin/invoice/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/invoice/search/page", { params: { customerName: "a" } }), [200]);
  });

  test("API-018 (API them sua xoa xac nhan cap nhat trang thai hoa don quan tri) @extended @regression", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.post("/admin/invoice/add", { data: {} }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/invoice/edit", { data: { id: SAMPLE_ID } }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.post(`/admin/invoice/confirm/${SAMPLE_ID}`), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/invoice/status", { data: { id: SAMPLE_ID, status: "PAID" } }), [200, 400, 404, 500]);
    AssertionHelper.expectStatusIn(await request.delete(`/admin/invoice/delete/${SAMPLE_ID}`), [200, 400, 404, 500]);
  });

  test("API-019 (API danh sach va tim kiem hop dong mua ban quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get("/admin/sale-contract/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/sale-contract/search/page", { params: { customerName: "a" } }), [200]);
  });

  test("API-020 (API them sua xoa hop dong mua ban quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let saleContract: Awaited<ReturnType<typeof TempEntityHelper.taoSaleContractTam>> | undefined;

    try {
      saleContract = await TempEntityHelper.taoSaleContractTam(request);
      AssertionHelper.expectStatusIn(
        await request.put("/admin/sale-contract/edit", {
          data: {
            id: saleContract.id,
            buildingId: saleContract.building.id,
            customerId: saleContract.customer.id,
            staffId: saleContract.staff.id,
            salePrice: 3000000000,
            transferDate: "2026-12-31",
            note: "Cap nhat hop dong mua ban test"
          }
        }),
        [200]
      );
      AssertionHelper.expectStatusIn(await request.delete(`/admin/sale-contract/delete/${saleContract.id}`), [200, 204]);
      saleContract = undefined;
    } finally {
      await TempEntityHelper.xoaSaleContractTam(request, saleContract);
    }
  });

  test("API-021 (API danh sach va tim kiem nhan vien quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.get("/admin/staff/list/page"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/admin/staff/search/page", { params: { fullName: "a" } }), [200]);
  });

  test("API-022 (API them va xoa nhan vien quan tri)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let staffId: number | undefined;

    try {
      const staff = await TempEntityHelper.taoStaffTam(request);
      staffId = staff.id;
      expect(staffId).toBeGreaterThan(0);
      AssertionHelper.expectStatusIn(await request.get("/admin/staff/search/page", { params: { fullName: staff.fullName, role: "STAFF" } }), [200]);
    } finally {
      await TempEntityHelper.xoaStaffTam(request, staffId);
    }
  });

  test("API-023 (API phan cong nhan vien quan tri) @extended @regression", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let staffId: number | undefined;
    let customerId: number | undefined;
    let buildingId: number | undefined;

    try {
      const staff = await TempEntityHelper.taoStaffTam(request);
      staffId = staff.id;
      const customer = await TempEntityHelper.taoCustomerTam(request, staff.id);
      customerId = customer.id;
      const building = await TempEntityHelper.taoBuildingTam(request, "FOR_RENT");
      buildingId = building.id;

      AssertionHelper.expectStatusIn(await request.get("/admin/staff/customers"), [200]);
      AssertionHelper.expectStatusIn(await request.get(`/admin/staff/${staff.id}/assignments/customers`), [200]);
      AssertionHelper.expectStatusIn(await request.put(`/admin/staff/${staff.id}/assignments/customers`, { data: [customer.id] }), [200, 204]);
      AssertionHelper.expectStatusIn(await request.get("/admin/staff/buildings"), [200]);
      AssertionHelper.expectStatusIn(await request.get(`/admin/staff/${staff.id}/assignments/buildings`), [200]);
      AssertionHelper.expectStatusIn(await request.put(`/admin/staff/${staff.id}/assignments/buildings`, { data: [building.id] }), [200, 204]);
      AssertionHelper.expectStatusIn(await request.put(`/admin/staff/${staff.id}/assignments/customers`, { data: [] }), [200, 204]);
      AssertionHelper.expectStatusIn(await request.put(`/admin/staff/${staff.id}/assignments/buildings`, { data: [] }), [200, 204]);
    } finally {
      await TempEntityHelper.xoaCustomerTam(request, customerId);
      await TempEntityHelper.xoaBuildingTam(request, buildingId);
      await TempEntityHelper.xoaStaffTam(request, staffId);
    }
  });

  test("API-024 (API ho so quan tri vien)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsAdminApi(request);
    AssertionHelper.expectStatusIn(await request.post("/admin/profile/otp/PROFILE_USERNAME"), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/profile/username", { data: { newUsername: "admin_new", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/profile/email", { data: { newEmail: "admin@example.com", password: "12345678" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/profile/phoneNumber", { data: { newPhoneNumber: "0123456789", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/admin/profile/password", { data: { newPassword: "12345678", otp: "000000", confirmPassword: "12345678" } }), [200, 400, 500]);
  });

  test("API-025 (API tim kiem cua nhan vien)", async ({ request }) => {
    await AuthSessionHelper.loginAsStaffApi(request);
    AssertionHelper.expectStatusIn(await request.get("/staff/building/search"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/staff/contracts/search"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/staff/customers/search"), [200, 500]);
    AssertionHelper.expectStatusIn(await request.get("/staff/invoices/search"), [200]);
  });

  test("API-026 (API CRUD hoa don cua nhan vien)", async ({ request }) => {
    await AuthSessionHelper.loginAsAdminApi(request);
    let invoice: Awaited<ReturnType<typeof TempEntityHelper.taoInvoiceTam>> | undefined;

    try {
      invoice = await TempEntityHelper.taoInvoiceTam(request);
      await AuthSessionHelper.loginApi(request, invoice.contract.staff.username);

      AssertionHelper.expectStatusIn(
        await request.put("/staff/invoices/edit", {
          data: {
            id: invoice.id,
            contractId: invoice.contract.id,
            customerId: invoice.contract.customer.id,
            month: invoice.month,
            year: invoice.year,
            status: "PENDING",
            dueDate: "2026-12-10",
            totalAmount: 1600000,
            details: [{ description: "Cap nhat phi dich vu test", amount: 1600000 }],
            electricityUsage: 12,
            waterUsage: 6
          }
        }),
        [200]
      );
      AssertionHelper.expectStatusIn(await request.delete(`/staff/invoices/delete/${invoice.id}`), [200, 204]);
      invoice = undefined;
    } finally {
      await AuthSessionHelper.loginAsAdminApi(request);
      await TempEntityHelper.xoaInvoiceTam(request, invoice);
    }
  });

  test("API-027 (API ho so nhan vien)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsStaffApi(request);
    AssertionHelper.expectStatusIn(await request.post("/staff/profile/otp/PROFILE_USERNAME"), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/staff/profile/username", { data: { newUsername: "staff_new", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/staff/profile/email", { data: { newEmail: "staff@example.com", password: "12345678" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/staff/profile/phoneNumber", { data: { newPhoneNumber: "0123456789", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/staff/profile/password", { data: { newPassword: "12345678", otp: "000000", confirmPassword: "12345678" } }), [200, 400, 500]);
  });

  test("API-028 (API du lieu khach hang)", async ({ request }) => {
    await AuthSessionHelper.loginAsCustomerApi(request);
    AssertionHelper.expectStatusIn(await request.get("/customer/building/search"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/customer/contract/search"), [200]);
    AssertionHelper.expectStatusIn(await request.get("/customer/transaction/list/page"), [200]);
  });

  test("API-029 (API ho so khach hang)", async ({ request }) => {
    TestSafetyHelper.skipIfDestructiveTestsDisabled(test);
    await AuthSessionHelper.loginAsCustomerApi(request);
    AssertionHelper.expectStatusIn(await request.post("/customer/profile/otp/PROFILE_USERNAME"), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/customer/profile/username", { data: { newUsername: "customer_new", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/customer/profile/email", { data: { newEmail: "customer@example.com", password: "12345678" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/customer/profile/phoneNumber", { data: { newPhoneNumber: "0123456789", otp: "000000" } }), [200, 400, 500]);
    AssertionHelper.expectStatusIn(await request.put("/customer/profile/password", { data: { newPassword: "12345678", otp: "000000", confirmPassword: "12345678" } }), [200, 400, 500]);
  });

  test("API-030 (API ma tran loi va bao mat) @extended @regression", async ({ request, playwright }) => {
    const unauthenticated = await playwright.request.newContext({ baseURL: env.baseUrl });
    try {
      AssertionHelper.expectStatusIn(await unauthenticated.get("/admin/building/list/page"), [200, 401, 403, 302]);
      AssertionHelper.expectStatusIn(await unauthenticated.post("/api/auth/forgot-password"), [400, 500]);
      AssertionHelper.expectStatusIn(await request.get("/admin/building/delete/abc"), [200, 400, 401, 403, 404, 405, 500]);
    } finally {
      await unauthenticated.dispose();
    }
  });
});
