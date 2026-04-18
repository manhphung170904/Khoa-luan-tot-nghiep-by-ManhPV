# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automation-test-playwright\tests\api\auth\auth-session.api.spec.ts >> REST Auth Session API @api @regression >> API-AUTH-REST-VAL-002 rejects wrong credential on REST login @regression
- Location: automation-test-playwright\tests\api\auth\auth-session.api.spec.ts:96:7

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /credential|username|password|tai khoan|mat khau/i
Received string:  "Tên đăng nhập hoặc mật khẩu không đúng."
```

# Test source

```ts
  13  | const scenarios: RoleScenario[] = [
  14  |   { role: "admin", expectedRoleCode: "ADMIN" },
  15  |   { role: "staff", expectedRoleCode: "STAFF" },
  16  |   { role: "customer", expectedRoleCode: "CUSTOMER" }
  17  | ];
  18  | 
  19  | test.describe("REST Auth Session API @api @regression", () => {
  20  |   test.afterAll(async () => {
  21  |     await MySqlDbClient.close();
  22  |   });
  23  | 
  24  |   for (const scenario of scenarios) {
  25  |     test(`API-AUTH-REST-${scenario.expectedRoleCode} login/me/logout works with cookie session @smoke @regression`, async ({
  26  |       playwright
  27  |     }) => {
  28  |       const context = await ApiSessionHelper.newContext(playwright);
  29  | 
  30  |       try {
  31  |         const { response, username } = await ApiSessionHelper.loginAsRole(context, scenario.role);
  32  |         const loginBody = await expectApiMessage<{
  33  |           message?: string;
  34  |           data?: { user?: { id?: number; username?: string; role?: string; userType?: string; signupSource?: string } };
  35  |         }>(response, { status: 200, message: apiExpectedMessages.auth.login, dataMode: "object" });
  36  |         expect(loginBody.data?.user?.username).toBe(username);
  37  |         expect(loginBody.data?.user?.role).toBe(scenario.expectedRoleCode);
  38  |         expect(loginBody.data?.user?.id).toBeTruthy();
  39  |         expect(loginBody.data?.user?.userType).toBeTruthy();
  40  |         expect(loginBody.data?.user?.signupSource).toBeTruthy();
  41  | 
  42  |         const meResponse = await context.get("/api/v1/auth/me", {
  43  |           failOnStatusCode: false
  44  |         });
  45  |         const meBody = await expectObjectBody<{
  46  |           user?: { id?: number; username?: string; role?: string; userType?: string; signupSource?: string };
  47  |         }>(meResponse, 200, ["user"]);
  48  | 
  49  |         expect(meBody.user?.username).toBe(username);
  50  |         expect(meBody.user?.role).toBe(scenario.expectedRoleCode);
  51  |         expect(meBody.user?.id).toBe(loginBody.data?.user?.id);
  52  |         expect(meBody.user?.userType).toBe(loginBody.data?.user?.userType);
  53  |         expect(meBody.user?.signupSource).toBe(loginBody.data?.user?.signupSource);
  54  | 
  55  |         const logoutResponse = await ApiSessionHelper.logout(context);
  56  |         await expectApiMessage(logoutResponse, { status: 200, message: apiExpectedMessages.auth.logout, dataMode: "null" });
  57  | 
  58  |         const afterLogoutMe = await context.get("/api/v1/auth/me", {
  59  |           failOnStatusCode: false,
  60  |           maxRedirects: 0
  61  |         });
  62  |         await expectApiErrorBody(afterLogoutMe, {
  63  |           status: 401,
  64  |           code: "UNAUTHORIZED",
  65  |           path: "/api/v1/auth/me"
  66  |         });
  67  |       } finally {
  68  |         await context.dispose();
  69  |       }
  70  |     });
  71  |   }
  72  | 
  73  |   test("API-AUTH-REST-VAL-001 rejects blank login DTO @regression", async ({ playwright }) => {
  74  |     const context = await ApiSessionHelper.newContext(playwright);
  75  | 
  76  |     try {
  77  |       const response = await context.post("/api/v1/auth/login", {
  78  |         failOnStatusCode: false,
  79  |         data: {
  80  |           username: "",
  81  |           password: ""
  82  |         }
  83  |       });
  84  | 
  85  |       await expectApiErrorBody(response, {
  86  |         status: 400,
  87  |         code: "BAD_REQUEST",
  88  |         path: "/api/v1/auth/login",
  89  |         fields: ["username", "password"]
  90  |       });
  91  |     } finally {
  92  |       await context.dispose();
  93  |     }
  94  |   });
  95  | 
  96  |   test("API-AUTH-REST-VAL-002 rejects wrong credential on REST login @regression", async ({ playwright }) => {
  97  |     const context = await ApiSessionHelper.newContext(playwright);
  98  | 
  99  |     try {
  100 |       const response = await context.post("/api/v1/auth/login", {
  101 |         failOnStatusCode: false,
  102 |         data: {
  103 |           username: env.adminUsername,
  104 |           password: "wrong-password"
  105 |         }
  106 |       });
  107 | 
  108 |       const errorBody = await expectApiErrorBody<{ message?: string }>(response, {
  109 |         status: 400,
  110 |         code: "BAD_REQUEST",
  111 |         path: "/api/v1/auth/login"
  112 |       });
> 113 |       expect(errorBody.message).toMatch(/credential|username|password|tai khoan|mat khau/i);
      |                                 ^ Error: expect(received).toMatch(expected)
  114 |     } finally {
  115 |       await context.dispose();
  116 |     }
  117 |   });
  118 | 
  119 |   test("API-AUTH-REST-SEC-001 rejects anonymous me access @smoke @regression", async ({ playwright }) => {
  120 |     const context = await ApiSessionHelper.newContext(playwright);
  121 | 
  122 |     try {
  123 |       const response = await context.get("/api/v1/auth/me", {
  124 |         failOnStatusCode: false,
  125 |         maxRedirects: 0
  126 |       });
  127 | 
  128 |       await expectApiErrorBody(response, {
  129 |         status: 401,
  130 |         code: "UNAUTHORIZED",
  131 |         path: "/api/v1/auth/me"
  132 |       });
  133 |     } finally {
  134 |       await context.dispose();
  135 |     }
  136 |   });
  137 | 
  138 |   test("API-AUTH-REST-OTP-001 forgot-password returns success and persists pending OTP for existing email @regression", async ({
  139 |     playwright
  140 |   }) => {
  141 |     const context = await ApiSessionHelper.newContext(playwright);
  142 | 
  143 |     try {
  144 |       const customers = await MySqlDbClient.query<{ email: string }>(
  145 |         "SELECT email FROM customer WHERE username = ? LIMIT 1",
  146 |         [env.customerUsername]
  147 |       );
  148 |       const email = customers[0]?.email ?? "";
  149 |       expect(email).toBeTruthy();
  150 | 
  151 |       const response = await context.post("/api/v1/auth/forgot-password", {
  152 |         failOnStatusCode: false,
  153 |         params: { email }
  154 |       });
  155 | 
  156 |       await expectApiMessage(response, {
  157 |         status: 200,
  158 |         message: apiExpectedMessages.auth.forgotPassword,
  159 |         dataMode: "null"
  160 |       });
  161 | 
  162 |       const otpRows = await MySqlDbClient.query<{ status: string }>(
  163 |         `
  164 |           SELECT status
  165 |           FROM email_verification
  166 |           WHERE email = ? AND purpose = ?
  167 |           ORDER BY id DESC
  168 |           LIMIT 1
  169 |         `,
  170 |         [email, "RESET_PASSWORD"]
  171 |       );
  172 |       expect(otpRows.length).toBeGreaterThan(0);
  173 |       expect(otpRows[0]!.status).toBe("PENDING");
  174 | 
  175 |       const afterRows = await MySqlDbClient.query<{ total: number }>(
  176 |         "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
  177 |         [email, "RESET_PASSWORD"]
  178 |       );
  179 |       expect(afterRows[0]!.total).toBeGreaterThan(0);
  180 |     } finally {
  181 |       await context.dispose();
  182 |     }
  183 |   });
  184 | 
  185 |   test("API-AUTH-REST-OTP-002 forgot-password keeps success contract for unknown email @regression", async ({
  186 |     playwright
  187 |   }) => {
  188 |     const context = await ApiSessionHelper.newContext(playwright);
  189 |     const email = `pw-missing-${Date.now()}@example.com`;
  190 | 
  191 |     try {
  192 |       const beforeRows = await MySqlDbClient.query<{ total: number }>(
  193 |         "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
  194 |         [email, "RESET_PASSWORD"]
  195 |       );
  196 | 
  197 |       const response = await context.post("/api/v1/auth/forgot-password", {
  198 |         failOnStatusCode: false,
  199 |         params: { email }
  200 |       });
  201 | 
  202 |       await expectApiMessage(response, {
  203 |         status: 200,
  204 |         message: apiExpectedMessages.auth.forgotPassword,
  205 |         dataMode: "null"
  206 |       });
  207 | 
  208 |       const afterRows = await MySqlDbClient.query<{ total: number }>(
  209 |         "SELECT COUNT(*) AS total FROM email_verification WHERE email = ? AND purpose = ?",
  210 |         [email, "RESET_PASSWORD"]
  211 |       );
  212 |       expect(afterRows[0]!.total).toBe(beforeRows[0]!.total);
  213 |     } finally {
```