import type { RequestDescriptor } from "@api/adminApiUtils";
import { invalidTextFile, tinyPngFile } from "@api/adminApiUtils";

export const adminEndpointCatalog: RequestDescriptor[] = [
  { id: "ADM-BLD-001", method: "GET", path: "/api/v1/admin/buildings", params: { page: 1, size: 5 } },
  { id: "ADM-BLD-002", method: "GET", path: "/api/v1/admin/buildings", params: { page: 1, size: 5, name: "tower" } },
  {
    id: "ADM-BLD-003",
    method: "POST",
    path: "/api/v1/admin/buildings",
    data: {
      districtId: 1,
      numberOfFloor: 10,
      numberOfBasement: 1,
      floorArea: 200,
      rentPrice: 1000000,
      deposit: 2000000,
      serviceFee: 100000,
      carFee: 50000,
      motorbikeFee: 20000,
      waterFee: 15000,
      electricityFee: 3500,
      salePrice: null,
      name: "Security Check Building",
      ward: "Ward",
      street: "Street",
      propertyType: "OFFICE",
      transactionType: "FOR_RENT",
      direction: "DONG",
      level: "A",
      taxCode: "PW-SEC",
      linkOfBuilding: "https://example.com",
      image: null,
      rentAreaValues: "50,100",
      latitude: 21.03,
      longitude: 105.81,
      staffIds: []
    }
  },
  { id: "ADM-BLD-004", method: "PUT", path: "/api/v1/admin/buildings/999999999", data: { id: 999999999, name: "Updated" } },
  { id: "ADM-BLD-005", method: "DELETE", path: "/api/v1/admin/buildings/999999999" },
  { id: "ADM-BLD-006", method: "POST", path: "/api/v1/admin/buildings/image", multipart: { file: tinyPngFile("security-building.png") } },

  { id: "ADM-BAI-001", method: "GET", path: "/api/v1/admin/building-additional-information/legal-authorities/1" },
  { id: "ADM-BAI-002", method: "POST", path: "/api/v1/admin/building-additional-information/legal-authorities", data: { buildingId: 1 } },
  { id: "ADM-BAI-003", method: "PUT", path: "/api/v1/admin/building-additional-information/legal-authorities/999999999", data: { buildingId: 1 } },
  { id: "ADM-BAI-004", method: "DELETE", path: "/api/v1/admin/building-additional-information/legal-authorities/999999999" },
  { id: "ADM-BAI-005", method: "GET", path: "/api/v1/admin/building-additional-information/nearby-amenities/1" },
  { id: "ADM-BAI-006", method: "POST", path: "/api/v1/admin/building-additional-information/nearby-amenities", data: { buildingId: 1 } },
  { id: "ADM-BAI-007", method: "PUT", path: "/api/v1/admin/building-additional-information/nearby-amenities/999999999", data: { buildingId: 1 } },
  { id: "ADM-BAI-008", method: "DELETE", path: "/api/v1/admin/building-additional-information/nearby-amenities/999999999" },
  { id: "ADM-BAI-009", method: "GET", path: "/api/v1/admin/building-additional-information/suppliers/1" },
  { id: "ADM-BAI-010", method: "POST", path: "/api/v1/admin/building-additional-information/suppliers", data: { buildingId: 1 } },
  { id: "ADM-BAI-011", method: "PUT", path: "/api/v1/admin/building-additional-information/suppliers/999999999", data: { buildingId: 1 } },
  { id: "ADM-BAI-012", method: "DELETE", path: "/api/v1/admin/building-additional-information/suppliers/999999999" },
  { id: "ADM-BAI-013", method: "GET", path: "/api/v1/admin/building-additional-information/planning-maps/1" },
  { id: "ADM-BAI-014", method: "POST", path: "/api/v1/admin/building-additional-information/planning-maps", data: { buildingId: 1 } },
  { id: "ADM-BAI-015", method: "PUT", path: "/api/v1/admin/building-additional-information/planning-maps/999999999", data: { buildingId: 1 } },
  { id: "ADM-BAI-016", method: "DELETE", path: "/api/v1/admin/building-additional-information/planning-maps/999999999" },
  { id: "ADM-BAI-017", method: "POST", path: "/api/v1/admin/building-additional-information/planning-maps/image", multipart: { file: tinyPngFile("security-planning.png") } },

  { id: "ADM-CUS-001", method: "GET", path: "/api/v1/admin/customers", params: { page: 1, size: 5 } },
  { id: "ADM-CUS-002", method: "GET", path: "/api/v1/admin/customers", params: { page: 1, size: 5, fullName: "a" } },
  { id: "ADM-CUS-003", method: "POST", path: "/api/v1/admin/customers", data: { username: "abc", password: "123", staffIds: [] } },
  { id: "ADM-CUS-004", method: "DELETE", path: "/api/v1/admin/customers/999999999" },

  { id: "ADM-CON-001", method: "GET", path: "/api/v1/admin/contracts", params: { page: 1, size: 5 } },
  { id: "ADM-CON-002", method: "GET", path: "/api/v1/admin/contracts", params: { page: 1, size: 5, customerName: "a" } },
  { id: "ADM-CON-003", method: "POST", path: "/api/v1/admin/contracts", data: { rentPrice: -1 } },
  { id: "ADM-CON-004", method: "PUT", path: "/api/v1/admin/contracts/999999999", data: { id: 999999999, rentPrice: -1 } },
  { id: "ADM-CON-005", method: "DELETE", path: "/api/v1/admin/contracts/999999999" },
  { id: "ADM-CON-006", method: "PUT", path: "/api/v1/admin/contracts/status" },

  { id: "ADM-INV-001", method: "GET", path: "/api/v1/admin/invoices", params: { page: 1, size: 5 } },
  { id: "ADM-INV-002", method: "GET", path: "/api/v1/admin/invoices", params: { page: 1, size: 5, customerName: "a" } },
  { id: "ADM-INV-003", method: "POST", path: "/api/v1/admin/invoices", data: { totalAmount: -1 } },
  { id: "ADM-INV-004", method: "PUT", path: "/api/v1/admin/invoices/999999999", data: { id: 999999999 } },
  { id: "ADM-INV-005", method: "DELETE", path: "/api/v1/admin/invoices/999999999" },
  { id: "ADM-INV-006", method: "POST", path: "/api/v1/admin/invoices/999999999/confirm" },
  { id: "ADM-INV-007", method: "PUT", path: "/api/v1/admin/invoices/status" },

  { id: "ADM-PRO-001", method: "PUT", path: "/api/v1/admin/profile/username", data: { newUsername: "denied-user", otp: "000000" } },
  { id: "ADM-PRO-002", method: "PUT", path: "/api/v1/admin/profile/email", data: { newEmail: "deny@example.com", password: "wrong-pass" } },
  { id: "ADM-PRO-003", method: "PUT", path: "/api/v1/admin/profile/phone-number", data: { newPhoneNumber: "0123456789", otp: "000000" } },
  { id: "ADM-PRO-004", method: "PUT", path: "/api/v1/admin/profile/password", data: { currentPassword: "12345678", newPassword: "12345678", confirmPassword: "12345678", otp: "000000" } },
  { id: "ADM-PRO-005", method: "POST", path: "/api/v1/admin/profile/otp/PROFILE_USERNAME" },

  { id: "ADM-SALE-001", method: "GET", path: "/api/v1/admin/sale-contracts", params: { page: 1, size: 5 } },
  { id: "ADM-SALE-002", method: "GET", path: "/api/v1/admin/sale-contracts", params: { page: 1, size: 5, customerName: "a" } },
  { id: "ADM-SALE-003", method: "DELETE", path: "/api/v1/admin/sale-contracts/999999999" },
  { id: "ADM-SALE-004", method: "POST", path: "/api/v1/admin/sale-contracts", data: { salePrice: 0 } },
  { id: "ADM-SALE-005", method: "PUT", path: "/api/v1/admin/sale-contracts/999999999", data: { id: 999999999, salePrice: 0 } },

  { id: "ADM-STF-001", method: "GET", path: "/api/v1/admin/staff", params: { page: 1, size: 5, role: "STAFF" } },
  { id: "ADM-STF-002", method: "GET", path: "/api/v1/admin/staff", params: { page: 1, size: 5, fullName: "a" } },
  { id: "ADM-STF-003", method: "POST", path: "/api/v1/admin/staff", data: { username: "abc", password: "123", phone: "1" } },
  { id: "ADM-STF-004", method: "DELETE", path: "/api/v1/admin/staff/999999999" },
  { id: "ADM-STF-005", method: "GET", path: "/api/v1/admin/staff/customers" },
  { id: "ADM-STF-006", method: "GET", path: "/api/v1/admin/staff/1/assignments/customers" },
  { id: "ADM-STF-007", method: "PUT", path: "/api/v1/admin/staff/1/assignments/customers", data: [1] },
  { id: "ADM-STF-008", method: "GET", path: "/api/v1/admin/staff/buildings" },
  { id: "ADM-STF-009", method: "GET", path: "/api/v1/admin/staff/1/assignments/buildings" },
  { id: "ADM-STF-010", method: "PUT", path: "/api/v1/admin/staff/1/assignments/buildings", data: [1] },

  { id: "ADM-PRQ-001", method: "GET", path: "/api/v1/admin/property-requests", params: { page: 1, size: 5 } },
  { id: "ADM-PRQ-002", method: "GET", path: "/api/v1/admin/property-requests/1" },
  { id: "ADM-PRQ-003", method: "POST", path: "/api/v1/admin/property-requests/999999999/reject", data: { reason: "Denied" } },
  { id: "ADM-PRQ-004", method: "POST", path: "/api/v1/admin/property-requests/999999999/approve", data: {} },
  { id: "ADM-PRQ-005", method: "GET", path: "/api/v1/admin/property-requests/1/contract-data" },
  { id: "ADM-PRQ-006", method: "GET", path: "/api/v1/admin/property-requests/1/sale-contract-data" },
  { id: "ADM-PRQ-007", method: "GET", path: "/api/v1/admin/property-requests/pending-count" }
];

export const invalidUploadDescriptor: RequestDescriptor = {
  id: "ADM-UPL-INVALID",
  method: "POST",
  path: "/api/v1/admin/buildings/image",
  multipart: { file: invalidTextFile() }
};


