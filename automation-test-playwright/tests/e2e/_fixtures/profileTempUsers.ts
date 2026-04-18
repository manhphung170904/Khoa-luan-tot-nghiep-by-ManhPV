import type { APIRequestContext, Page } from "@playwright/test";
import { env } from "@config/env";
import { MySqlDbClient } from "@db/MySqlDbClient";
import { TempEntityHelper } from "@helpers/TempEntityHelper";
import { LoginPage } from "@pages/auth/LoginPage";

type PlaywrightLike = {
  request: {
    newContext: (options?: Record<string, unknown>) => Promise<APIRequestContext>;
  };
};

export type TempCustomerProfileUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  password: string;
  managerStaffId: number;
};

export type TempStaffProfileUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  password: string;
};

const defaultPassword = env.defaultPassword;

async function fetchCustomerIdentity(id: number): Promise<{ email: string; phone: string }> {
  const rows = await MySqlDbClient.query<{ email: string; phone: string }>(
    "SELECT email, phone FROM customer WHERE id = ? LIMIT 1",
    [id]
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`Khong tim thay customer temp voi id=${id}.`);
  }

  return row;
}

async function fetchStaffIdentity(id: number): Promise<{ email: string; phone: string }> {
  const rows = await MySqlDbClient.query<{ email: string; phone: string }>(
    "SELECT email, phone FROM staff WHERE id = ? LIMIT 1",
    [id]
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`Khong tim thay staff temp voi id=${id}.`);
  }

  return row;
}

export async function createTempCustomerProfileUser(adminApi: APIRequestContext): Promise<TempCustomerProfileUser> {
  const manager = await TempEntityHelper.taoStaffTam(adminApi, "STAFF");
  const customer = await TempEntityHelper.taoCustomerTam(adminApi, manager.id);
  const identity = await fetchCustomerIdentity(customer.id);

  return {
    id: customer.id,
    username: customer.username,
    email: identity.email,
    phone: identity.phone,
    password: defaultPassword,
    managerStaffId: manager.id
  };
}

export async function cleanupTempCustomerProfileUser(
  adminApi: APIRequestContext,
  tempUser: TempCustomerProfileUser | null
): Promise<void> {
  if (!tempUser) {
    return;
  }

  await TempEntityHelper.xoaCustomerTam(adminApi, tempUser.id);
  await TempEntityHelper.xoaStaffTam(adminApi, tempUser.managerStaffId);
}

export async function createTempStaffProfileUser(
  adminApi: APIRequestContext,
  role: "STAFF" | "ADMIN"
): Promise<TempStaffProfileUser> {
  const staff = await TempEntityHelper.taoStaffTam(adminApi, role);
  const identity = await fetchStaffIdentity(staff.id);

  return {
    id: staff.id,
    username: staff.username,
    email: identity.email,
    phone: identity.phone,
    password: defaultPassword
  };
}

export async function cleanupTempStaffProfileUser(
  adminApi: APIRequestContext,
  tempUser: TempStaffProfileUser | null
): Promise<void> {
  if (!tempUser) {
    return;
  }

  await TempEntityHelper.xoaStaffTam(adminApi, tempUser.id);
}

export async function loginAsTempUser(page: Page, username: string, password = defaultPassword): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(username, password);
}

export async function newAdminApiContext(playwright: PlaywrightLike): Promise<APIRequestContext> {
  const context = await playwright.request.newContext({
    baseURL: env.baseUrl,
    extraHTTPHeaders: {
      Accept: "application/json"
    }
  });

  const loginResponse = await context.post("/api/v1/auth/login", {
    failOnStatusCode: false,
    data: {
      username: env.adminUsername,
      password: env.defaultPassword
    }
  });

  if (loginResponse.status() !== 200) {
    throw new Error(`Khong dang nhap duoc admin bootstrap. HTTP ${loginResponse.status()}.`);
  }

  return context;
}
