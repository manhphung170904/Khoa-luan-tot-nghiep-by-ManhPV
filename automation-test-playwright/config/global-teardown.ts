import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  // Framework hien cleanup theo tung test/thung fixture, nen khong can
  // global teardown de xoa du lieu test hang loat sau moi lan chay.
  //
  // Giu file nay de lam diem mo rong ro rang cho cac nhu cau sau:
  // - ghi summary runtime sau khi run xong
  // - cleanup tai nguyen ngoai he thong test fixture
  // - dong ket noi/flush telemetry neu ve sau can them
}
