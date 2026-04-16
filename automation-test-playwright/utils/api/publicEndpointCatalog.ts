import type { RequestDescriptor } from "@api/adminApiUtils";

export const publicEndpointCatalog: RequestDescriptor[] = [
  { id: "PUB-001", method: "GET", path: "/api/v1/public/buildings", roleExpected: "public", kind: "readonly" }
];

