package com.estate.api.v1.payment;

import com.estate.exception.ForbiddenOperationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.security.CustomUserDetails;
import com.estate.security.jwt.JwtProperties;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Objects;

@Controller
@RequestMapping("/payment-demo")
@RequiredArgsConstructor
public class PaymentV1API {
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final JwtProperties jwtProperties;

    @Value("${payment.qr.bank-bin:970422}")
    private String bankBin;

    @Value("${payment.qr.account-no:123456789}")
    private String accountNo;

    @Value("${payment.qr.account-name:MOONNEST}")
    private String accountName;

    @ResponseBody
    @GetMapping(value = "/qr/{invoiceId}", produces = "text/html; charset=UTF-8")
    public String showQrPayment(@PathVariable Long invoiceId,
                                @AuthenticationPrincipal CustomUserDetails user) {
        InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);

        BigDecimal amount = invoice.getTotalAmount() == null ? BigDecimal.ZERO : invoice.getTotalAmount();
        String amountValue = amount.stripTrailingZeros().toPlainString().replace(".", "");
        String transferContent = "MOONNEST INV " + invoiceId;
        String formattedAmount = formatMoney(amount);
        String confirmToken = buildConfirmToken(invoice, user);

        String qrUrl = "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s"
                .formatted(
                        bankBin,
                        accountNo,
                        amountValue,
                        urlEncode(transferContent),
                        urlEncode(accountName)
                );

        return """
                <html lang=\"vi\">
                  <head>
                    <meta charset=\"utf-8\"/>
                    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>
                    <title>Thanh toan QR</title>
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
                    <div class=\"wrap\">
                      <h1>Thanh toan bang QR</h1>
                      <p>Quet ma bang ung dung ngan hang de thanh toan hoa don.</p>
                      <div class=\"qr\">
                        <img src=\"%s\" alt=\"QR thanh toan hoa don %d\"/>
                      </div>
                      <div class=\"meta\">
                        <p><strong>Ma hoa don:</strong> #%d</p>
                        <p><strong>So tien:</strong> %s VND</p>
                        <p><strong>Ma ngan hang:</strong> %s</p>
                        <p><strong>So tai khoan:</strong> %s</p>
                        <p><strong>Chu tai khoan:</strong> %s</p>
                        <p><strong>Noi dung CK:</strong> %s</p>
                      </div>
                      <p class=\"hint\">Sau khi chuyen khoan thanh cong, bam \"Toi da thanh toan\" de he thong ghi nhan theo che do demo.</p>
                      <div class=\"actions\">
                        <form style=\"flex: 1; margin: 0;\" method=\"post\" action=\"/payment-demo/qr/confirm/%d\">
                          <input type=\"hidden\" name=\"token\" value=\"%s\"/>
                          <button class=\"btn btn-primary\" style=\"width: 100%%; border: 0; cursor: pointer;\" type=\"submit\">Toi da thanh toan</button>
                        </form>
                        <a class=\"btn btn-secondary\" href=\"/customer/invoice/list\">Quay lai</a>
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
                invoiceId,
                confirmToken
        );
    }

    @GetMapping("/qr/confirm/{invoiceId}")
    public String rejectLegacyConfirm() {
        return "redirect:/customer/invoice/list?payFail";
    }

    @PostMapping("/qr/confirm/{invoiceId}")
    public String confirmQrPayment(@PathVariable Long invoiceId,
                                   @AuthenticationPrincipal CustomUserDetails user,
                                   @RequestParam String token) {
        InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);
        if (!MessageDigest.isEqual(
                token.getBytes(StandardCharsets.UTF_8),
                buildConfirmToken(invoice, user).getBytes(StandardCharsets.UTF_8)
        )) {
            return "redirect:/customer/invoice/list?payFail";
        }

        if (!"PAID".equalsIgnoreCase(invoice.getStatus())) {
            String transactionCode = "QR-" + invoiceId + "-"
                    + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            invoiceService.markPaid(invoiceId, "BANK_QR", transactionCode);
        }

        return "redirect:/customer/invoice/list?paySuccess";
    }

    private InvoiceEntity getCustomerInvoice(Long invoiceId, CustomUserDetails user) {
        if (user == null || !"CUSTOMER".equalsIgnoreCase(user.getRole())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized payment access");
        }

        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice was not found"));

        if (invoice.getCustomer() == null || !Objects.equals(invoice.getCustomer().getId(), user.getUserId())) {
            throw new ForbiddenOperationException("You cannot access this invoice");
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

    private String buildConfirmToken(InvoiceEntity invoice, CustomUserDetails user) {
        String payload = invoice.getId() + ":" + user.getUserId() + ":" + invoice.getTotalAmount() + ":" + invoice.getStatus();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signature);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate payment confirmation token", ex);
        }
    }
}
