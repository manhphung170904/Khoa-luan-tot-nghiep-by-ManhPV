import type { RequestDescriptor } from "@api/adminApiUtils";

export const publicEndpointCatalog: RequestDescriptor[] = [
  { id: "PUB-001", method: "GET", path: "/moonnest/building/search", roleExpected: "public", kind: "readonly" }
];
