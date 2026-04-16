import type { RequestDescriptor } from "@api/adminApiUtils";

export const authEndpointCatalog: RequestDescriptor[] = [
  { id: "AUT-001", method: "POST", path: "/api/v1/auth/forgot-password", params: { email: "missing@example.com" }, roleExpected: "public", kind: "otp-auth" }
];

