import type { RequestDescriptor } from "@api/adminApiUtils";

export const paymentEndpointCatalog: RequestDescriptor[] = [
  { id: "PAY-001", method: "GET", path: "/payment/qr/1", roleExpected: "customer", kind: "readonly" },
  { id: "PAY-002", method: "GET", path: "/payment/qr/confirm/1", roleExpected: "customer", kind: "background-trigger" }
];
