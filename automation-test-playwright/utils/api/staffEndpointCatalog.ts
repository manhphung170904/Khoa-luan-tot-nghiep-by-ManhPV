import type { RequestDescriptor } from "@api/adminApiUtils";

export const staffEndpointCatalog: RequestDescriptor[] = [
  { id: "STF-BLD-001", method: "GET", path: "/staff/building/search", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-CON-001", method: "GET", path: "/staff/contracts/search", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-CUS-001", method: "GET", path: "/staff/customers/search", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-SAL-001", method: "GET", path: "/staff/sale-contracts/search", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-INV-001", method: "GET", path: "/staff/invoices/search", params: { page: 1, size: 5 }, roleExpected: "staff", kind: "readonly" },
  { id: "STF-INV-002", method: "POST", path: "/staff/invoices/add", data: { contractId: 1, customerId: 1 }, roleExpected: "staff", kind: "mutation" },
  { id: "STF-INV-003", method: "PUT", path: "/staff/invoices/edit", data: { id: 999999999 }, roleExpected: "staff", kind: "mutation" },
  { id: "STF-INV-004", method: "DELETE", path: "/staff/invoices/delete/999999999", roleExpected: "staff", kind: "mutation" }
];
