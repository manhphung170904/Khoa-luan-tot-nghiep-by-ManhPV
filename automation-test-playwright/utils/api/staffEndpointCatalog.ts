import type { RequestDescriptor } from "@api/adminApiUtils";

export const staffEndpointCatalog: RequestDescriptor[] = [
  { id: "STF-BLD-001", method: "GET", path: "/api/v1/staff/buildings", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-CON-001", method: "GET", path: "/api/v1/staff/contracts", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-CUS-001", method: "GET", path: "/api/v1/staff/customers", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-SAL-001", method: "GET", path: "/api/v1/staff/sale-contracts", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-INV-001", method: "GET", path: "/api/v1/staff/invoices", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-INV-002", method: "POST", path: "/api/v1/staff/invoices", data: { contractId: 1, customerId: 1 }, roleExpected: "staff", kind: "mutation" },
  { id: "STF-INV-003", method: "PUT", path: "/api/v1/staff/invoices/999999999", data: { id: 999999999 }, roleExpected: "staff", kind: "mutation" },
  { id: "STF-INV-004", method: "DELETE", path: "/api/v1/staff/invoices/999999999", roleExpected: "staff", kind: "mutation" }
];

