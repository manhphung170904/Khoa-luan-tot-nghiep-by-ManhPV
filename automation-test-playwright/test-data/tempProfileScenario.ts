import { expect, type APIRequestContext } from "@playwright/test";
import { expectApiMessage } from "@api/apiContractUtils";
import { apiExpectedMessages } from "@api/apiExpectedMessages";
import { ApiSessionHelper } from "@api/apiSessionHelper";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { CleanupHelper, type CleanupTask } from "@helpers/CleanupHelper";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { TestDataFactory } from "@helpers/TestDataFactory";

type RequestContextFactory = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export type TempProfileRole = "admin" | "staff" | "customer";

export type TempProfileUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
};

export type AuthenticatedTempProfileScenario = {
  context: APIRequestContext;
  user: TempProfileUser;
  currentPassword: string;
  cleanup: () => Promise<void>;
};

type CreatedTempProfileUser = TempProfileUser & {
  managerStaffId?: number;
};

async function createTempStaffProfileUser(
  adminApi: APIRequestContext,
  role: "ADMIN" | "STAFF"
): Promise<CreatedTempProfileUser> {
  const payload = TestDataFactory.buildAdminStaffPayload({}, role);
  const response = await adminApi.post("/api/v1/admin/staff", {
    failOnStatusCode: false,
    data: payload
  });
  await expectApiMessage(response, {
    status: 200,
    message: apiExpectedMessages.admin.staff.create,
    dataMode: "null"
  });

  const rows = await MySqlDbClient.query<TempProfileUser>(
    `
      SELECT id, username, email, phone
      FROM staff
      WHERE username = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [String(payload.username)]
  );
  expect(rows.length).toBe(1);
  return rows[0]!;
}

async function createTempCustomerProfileUser(adminApi: APIRequestContext): Promise<CreatedTempProfileUser> {
  const managerStaff = await TempEntityHelper.taoStaffTam(adminApi);

  try {
    const payload = TestDataFactory.buildCustomerPayload({ staffIds: [managerStaff.id] });
    const response = await adminApi.post("/api/v1/admin/customers", {
      failOnStatusCode: false,
      data: payload
    });
    await expectApiMessage(response, {
      status: 200,
      message: apiExpectedMessages.admin.customers.create,
      dataMode: "null"
    });

    const rows = await MySqlDbClient.query<TempProfileUser>(
      `
        SELECT id, username, email, phone
        FROM customer
        WHERE username = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [String(payload.username)]
    );
    expect(rows.length).toBe(1);
    return { ...rows[0]!, managerStaffId: managerStaff.id };
  } catch (error) {
    await TempEntityHelper.xoaStaffTam(adminApi, managerStaff.id);
    throw error;
  }
}

async function createTempProfileUser(
  adminApi: APIRequestContext,
  role: TempProfileRole
): Promise<CreatedTempProfileUser> {
  if (role === "customer") {
    return createTempCustomerProfileUser(adminApi);
  }

  return createTempStaffProfileUser(adminApi, role === "admin" ? "ADMIN" : "STAFF");
}

async function cleanupTempProfileScenario(
  adminApi: APIRequestContext,
  role: TempProfileRole,
  context?: APIRequestContext,
  user?: CreatedTempProfileUser
): Promise<void> {
  const tasks: CleanupTask[] = [];

  if (context) {
    tasks.push({ label: `Dispose ${role} profile API context`, action: () => context.dispose() });
  }

  if (!user) {
    await CleanupHelper.run(tasks);
    return;
  }

  if (role === "customer") {
    tasks.push(
      { label: `Delete customer ${user.id}`, action: () => TempEntityHelper.xoaCustomerTam(adminApi, user.id) },
      { label: `Delete manager staff ${user.managerStaffId ?? "(none)"}`, action: () => TempEntityHelper.xoaStaffTam(adminApi, user.managerStaffId) }
    );
  } else {
    tasks.push({ label: `Delete ${role} staff ${user.id}`, action: () => TempEntityHelper.xoaStaffTam(adminApi, user.id) });
  }

  await CleanupHelper.run(tasks);
}

export async function createAuthenticatedTempProfileScenario(
  playwright: RequestContextFactory,
  adminApi: APIRequestContext,
  role: TempProfileRole
): Promise<AuthenticatedTempProfileScenario> {
  let context: APIRequestContext | undefined;
  let user: CreatedTempProfileUser | undefined;
  let cleaned = false;

  const cleanup = async () => {
    if (cleaned) {
      return;
    }

    cleaned = true;
    await cleanupTempProfileScenario(adminApi, role, context, user);
  };

  try {
    user = await createTempProfileUser(adminApi, role);
    context = await ApiSessionHelper.newContext(playwright);

    const loginResponse = await ApiSessionHelper.login(context, user.username, env.defaultPassword);
    expect(loginResponse.status()).toBe(200);

    return {
      context,
      user,
      currentPassword: env.defaultPassword,
      cleanup
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
