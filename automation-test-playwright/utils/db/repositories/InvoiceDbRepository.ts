import { MySqlDbClient } from "../MySqlDbClient";

export type InvoicePaymentRecord = {
  status: string;
  payment_method: string | null;
  transaction_code: string | null;
  paid_date: string | null;
};

export class InvoiceDbRepository {
  static async paymentById(invoiceId: number): Promise<InvoicePaymentRecord | null> {
    const rows = await MySqlDbClient.query<InvoicePaymentRecord>(
      "SELECT status, payment_method, transaction_code, paid_date FROM invoice WHERE id = ?",
      [invoiceId]
    );
    return rows[0] ?? null;
  }

  static async statusById(invoiceId: number): Promise<string> {
    const rows = await MySqlDbClient.query<{ status: string }>("SELECT status FROM invoice WHERE id = ?", [invoiceId]);
    return rows[0]?.status ?? "";
  }

  static async markPaidForTest(invoiceId: number, transactionCode: string): Promise<void> {
    await MySqlDbClient.execute(
      `
        UPDATE invoice
        SET status = 'PAID',
            paid_date = CURRENT_TIMESTAMP,
            payment_method = 'BANK_QR',
            transaction_code = ?
        WHERE id = ?
      `,
      [transactionCode, invoiceId]
    );
  }

  static async resetPayment(invoiceId: number, status: string): Promise<void> {
    await MySqlDbClient.execute(
      "UPDATE invoice SET status = ?, paid_date = NULL, payment_method = NULL, transaction_code = NULL WHERE id = ?",
      [status, invoiceId]
    );
  }
}
