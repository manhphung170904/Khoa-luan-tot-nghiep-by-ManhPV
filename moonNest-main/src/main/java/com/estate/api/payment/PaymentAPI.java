package com.estate.api.payment;

import com.estate.repository.InvoiceRepository;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class PaymentAPI {
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

    @Value("${payment.qr.bank-bin:970422}")
    private String bankBin;

    @Value("${payment.qr.account-no:123456789}")
    private String accountNo;

    @Value("${payment.qr.account-name:MOONNEST}")
    private String accountName;

    @ResponseBody
    @GetMapping(value = "/payment/qr/{invoiceId}", produces = "text/html; charset=UTF-8")
    public String showQrPayment(@PathVariable Long invoiceId,
                                @AuthenticationPrincipal CustomUserDetails user) {
        InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);

        BigDecimal amount = invoice.getTotalAmount() == null ? BigDecimal.ZERO : invoice.getTotalAmount();
        String amountValue = amount.stripTrailingZeros().toPlainString().replace(".", "");
        String transferContent = "MOONNEST INV " + invoiceId;
        String formattedAmount = formatMoney(amount);

        String qrUrl = "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s"
                .formatted(
                        bankBin,
                        accountNo,
                        amountValue,
                        urlEncode(transferContent),
                        urlEncode(accountName)
                );

        return """
                <html lang="vi">
                  <head>
                    <meta charset="utf-8"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1"/>
                    <title>Thanh toán QR</title>
                    <style>
                      body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 24px; color: #1f2937; }
                      .wrap { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
                      h1 { font-size: 28px; margin: 0 0 8px; }
                      p { margin: 6px 0; line-height: 1.5; }
                      .qr { text-align: center; margin: 24px 0; }
                      .qr img { width: 280px; max-width: 100%%; border-radius: 12px; border: 1px solid #e5e7eb; }
                      .meta { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
                      .actions { display: flex; gap: 12px; margin-top: 20px; }
                      .btn { flex: 1; text-align: center; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-weight: 700; }
                      .btn-primary { background: #1d4ed8; color: #fff; }
                      .btn-secondary { background: #e5e7eb; color: #111827; }
                      .hint { font-size: 13px; color: #6b7280; }
                    </style>
                  </head>
                  <body>
                    <div class="wrap">
                      <h1>Thanh toán bằng QR</h1>
                      <p>Quét mã bằng ứng dụng ngân hàng để thanh toán hóa đơn.</p>
                      <div class="qr">
                        <img src="%s" alt="QR thanh toán hóa đơn %d"/>
                      </div>
                      <div class="meta">
                        <p><strong>Mã hóa đơn:</strong> #%d</p>
                        <p><strong>Số tiền:</strong> %s VNĐ</p>
                        <p><strong>Mã ngân hàng:</strong> %s</p>
                        <p><strong>Số tài khoản:</strong> %s</p>
                        <p><strong>Chủ tài khoản:</strong> %s</p>
                        <p><strong>Nội dung CK:</strong> %s</p>
                      </div>
                      <p class="hint">Sau khi chuyển khoản thành công, bấm "Tôi đã thanh toán" để hệ thống ghi nhận theo chế độ demo.</p>
                      <div class="actions">
                        <a class="btn btn-primary" href="/payment/qr/confirm/%d">Tôi đã thanh toán</a>
                        <a class="btn btn-secondary" href="/customer/invoice/list">Quay lại</a>
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(
                qrUrl,
                invoiceId,
                invoiceId,
                formattedAmount,
                bankBin,
                accountNo,
                accountName,
                transferContent,
                invoiceId
        );
    }

    @GetMapping("/payment/qr/confirm/{invoiceId}")
    public String confirmQrPayment(@PathVariable Long invoiceId,
                                   @AuthenticationPrincipal CustomUserDetails user) {
        InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);

        if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
            String transactionCode = "QR-" + invoiceId + "-" +
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            invoiceService.markPaid(invoiceId, "BANK_QR", transactionCode);
        }

        return "redirect:/customer/invoice/list?paySuccess";
    }

    private InvoiceEntity getCustomerInvoice(Long invoiceId, CustomUserDetails user) {
        if (user == null || !"CUSTOMER".equalsIgnoreCase(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized payment access");
        }

        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));

        if (invoice.getCustomer() == null || !Objects.equals(invoice.getCustomer().getId(), user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access this invoice");
        }

        return invoice;
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String formatMoney(BigDecimal amount) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator(',');
        symbols.setDecimalSeparator('.');
        DecimalFormat format = new DecimalFormat("#,##0.##", symbols);
        return format.format(amount);
    }
}
