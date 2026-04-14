import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // De trong de mo rong ve sau.
  // Khi can don du lieu test hoac ghi log tong ket, se bo sung tai day.
}
