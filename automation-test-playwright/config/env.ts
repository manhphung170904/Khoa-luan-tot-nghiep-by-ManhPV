import dotenv from "dotenv";
import { runtimePaths } from "./paths";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCandidates = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
};

type EnvironmentName = "local" | "dev" | "test" | "staging";
const supportedEnvironments = ["local", "dev", "test", "staging"] as const satisfies readonly EnvironmentName[];
const toEnvironmentName = (value: string | undefined): EnvironmentName => {
  if (!value) {
    return "local";
  }

  return supportedEnvironments.includes(value as EnvironmentName) ? (value as EnvironmentName) : "local";
};

const environmentName = toEnvironmentName(process.env.APP_ENV);
const strictEnvironmentConfig = process.env.CI === "true" || environmentName !== "local";

const requireEnv = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (value !== undefined && value.trim() !== "") {
    return value;
  }

  if (strictEnvironmentConfig) {
    throw new Error(`Missing required environment variable ${name} for ${environmentName} test run.`);
  }

  return fallback;
};

const optionalDefault = (name: string, fallback: string): string => {
  return strictEnvironmentConfig ? requireEnv(name, fallback) : process.env[name] ?? fallback;
};

const baseUrlByEnvironment: Record<EnvironmentName, string> = {
  local: process.env.LOCAL_BASE_URL ?? "http://localhost:8080",
  dev: process.env.DEV_BASE_URL ?? process.env.BASE_URL ?? (strictEnvironmentConfig ? "" : "http://localhost:8080"),
  test: process.env.TEST_BASE_URL ?? process.env.BASE_URL ?? (strictEnvironmentConfig ? "" : "http://localhost:8080"),
  staging: process.env.STAGING_BASE_URL ?? process.env.BASE_URL ?? (strictEnvironmentConfig ? "" : "http://localhost:8080")
};

const retryPolicy = {
  api: toNumber(process.env.API_RETRIES, process.env.CI ? 1 : 0),
  ui: toNumber(process.env.UI_RETRIES, process.env.CI ? 2 : 0),
  e2e: toNumber(process.env.E2E_RETRIES, process.env.CI ? 2 : 0),
  regression: toNumber(process.env.REGRESSION_RETRIES, process.env.CI ? 1 : 0)
};

const adminUsernames = parseCandidates(process.env.ADMIN_USERNAMES ?? process.env.ADMIN_USERNAME, strictEnvironmentConfig ? [] : ["manh1709", "ntn162"]);
const staffUsernames = parseCandidates(process.env.STAFF_USERNAMES ?? process.env.STAFF_USERNAME, strictEnvironmentConfig ? [] : ["tmq0102"]);
const customerUsernames = parseCandidates(process.env.CUSTOMER_USERNAMES ?? process.env.CUSTOMER_USERNAME, strictEnvironmentConfig ? [] : ["abcVietNam"]);

export const env = {
  appEnv: environmentName,
  baseUrl: (process.env.BASE_URL ?? baseUrlByEnvironment[environmentName]) || optionalDefault("BASE_URL", "http://localhost:8080"),
  adminUsernames,
  staffUsernames,
  customerUsernames,
  adminUsername: process.env.ADMIN_USERNAME ?? adminUsernames[0] ?? optionalDefault("ADMIN_USERNAME", "manh1709"),
  staffUsername: process.env.STAFF_USERNAME ?? staffUsernames[0] ?? optionalDefault("STAFF_USERNAME", "tmq0102"),
  customerUsername: process.env.CUSTOMER_USERNAME ?? customerUsernames[0] ?? optionalDefault("CUSTOMER_USERNAME", "abcVietNam"),
  defaultPassword: optionalDefault("DEFAULT_PASSWORD", "12345678"),
  requestTimeout: toNumber(process.env.REQUEST_TIMEOUT, 30_000),
  expectTimeout: toNumber(process.env.EXPECT_TIMEOUT, 10_000),
  actionTimeout: toNumber(process.env.ACTION_TIMEOUT, 15_000),
  navigationTimeout: toNumber(process.env.NAVIGATION_TIMEOUT, 30_000),
  workers: toNumber(process.env.WORKERS, 1),
  retryPolicy,
  testSupportOtpToken: optionalDefault("TEST_SUPPORT_OTP_TOKEN", "test-otp-token"),
  testDataSeed: {
    districtId: toNumber(process.env.TEST_DISTRICT_ID, 1),
    ward: optionalDefault("TEST_BUILDING_WARD", "Xuan La"),
    street: optionalDefault("TEST_BUILDING_STREET", "Vo Chi Cong"),
    latitude: toNumber(process.env.TEST_BUILDING_LATITUDE, 21.0686),
    longitude: toNumber(process.env.TEST_BUILDING_LONGITUDE, 105.8033)
  },
  dbJdbcUrl: process.env.DB_JDBC_URL ?? process.env.SPRING_DATASOURCE_URL ?? optionalDefault("DB_JDBC_URL", "jdbc:mysql://localhost:3306/estate"),
  dbUsername: process.env.DB_USERNAME ?? process.env.SPRING_DATASOURCE_USERNAME ?? optionalDefault("DB_USERNAME", "root"),
  dbPassword: process.env.DB_PASSWORD ?? process.env.SPRING_DATASOURCE_PASSWORD ?? optionalDefault("DB_PASSWORD", "123456"),
  dbPoolLimit: toNumber(process.env.DB_POOL_LIMIT, 5)
};
