import path from "node:path";
import { env } from "@config/env";

export const storageStatePaths = {
  admin: path.join(env.authStateDir, "admin.json"),
  staff: path.join(env.authStateDir, "staff.json"),
  customer: path.join(env.authStateDir, "customer.json")
} as const;

export type StorageRole = keyof typeof storageStatePaths;
