import type { RequestDescriptor } from "@api/adminApiUtils";

export const customerEndpointCatalog: RequestDescriptor[] = [
  { id: "CUS-BLD-001", method: "GET", path: "/customer/building/search", roleExpected: "customer", kind: "readonly" },
  { id: "CUS-CON-001", method: "GET", path: "/customer/contract/search", roleExpected: "customer", kind: "readonly" },
  { id: "CUS-TRN-001", method: "GET", path: "/customer/transaction/list/page", params: { page: 1, size: 5 }, roleExpected: "customer", kind: "readonly" },
  { id: "CUS-PRF-001", method: "PUT", path: "/customer/profile/username", data: { newUsername: "denied-user", otp: "000000" }, roleExpected: "customer", kind: "otp-auth" },
  { id: "CUS-PRF-002", method: "PUT", path: "/customer/profile/email", data: { newEmail: "deny@example.com", password: "wrong-pass" }, roleExpected: "customer", kind: "otp-auth" },
  { id: "CUS-PRF-003", method: "PUT", path: "/customer/profile/phoneNumber", data: { newPhoneNumber: "0123456789", otp: "000000" }, roleExpected: "customer", kind: "otp-auth" },
  { id: "CUS-PRF-004", method: "PUT", path: "/customer/profile/password", data: { currentPassword: "12345678", newPassword: "12345678", confirmPassword: "12345678", otp: "000000" }, roleExpected: "customer", kind: "otp-auth" },
  { id: "CUS-PRF-005", method: "POST", path: "/customer/profile/otp/PROFILE_USERNAME", roleExpected: "customer", kind: "otp-auth" },
  { id: "CUS-PRQ-001", method: "POST", path: "/api/customer/property-request/submit", data: { buildingId: 1, requestType: "RENT" }, roleExpected: "customer", kind: "mutation" },
  { id: "CUS-PRQ-002", method: "GET", path: "/api/customer/property-request/list", roleExpected: "customer", kind: "readonly" },
  { id: "CUS-PRQ-003", method: "DELETE", path: "/api/customer/property-request/cancel/999999999", roleExpected: "customer", kind: "mutation" }
];
