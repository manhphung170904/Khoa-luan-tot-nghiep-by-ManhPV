package com.estate.api.v1.payment;

import com.estate.exception.BusinessException;
import com.estate.exception.ForbiddenOperationException;
import com.estate.exception.ResourceNotFoundException;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.security.CustomUserDetails;
import com.estate.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

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

    @Value("${payment.qr.bank-bin:970422}")
    private String bankBin;

    @Value("${payment.qr.account-no:123456789}")
    private String accountNo;

    @Value("${payment.qr.account-name:MOONNEST}")
    private String accountName;

    @Value("${payment.qr.confirm-secret}")
    private String paymentConfirmSecret;

    @GetMapping("/qr/{invoiceId}")
    public String showQrPayment(@PathVariable Long invoiceId,
                                @AuthenticationPrincipal CustomUserDetails user,
                                Model model) {
        if (!isCustomer(user)) {
            return "redirect:/login";
        }

        try {
            InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);

            if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
                return redirectToInvoiceList("payAlreadyPaid");
            }

            if (!isPayableStatus(invoice.getStatus())) {
                return redirectToInvoiceList("payInvalidStatus");
            }

            BigDecimal amount = invoice.getTotalAmount() == null ? BigDecimal.ZERO : invoice.getTotalAmount();
            String amountValue = amount.stripTrailingZeros().toPlainString().replace(".", "");
            String transferContent = "MOONNEST INV " + invoiceId;

            model.addAttribute("invoiceId", invoiceId);
            model.addAttribute("formattedAmount", formatMoney(amount));
            model.addAttribute("bankBin", bankBin);
            model.addAttribute("accountNo", accountNo);
            model.addAttribute("accountName", accountName);
            model.addAttribute("transferContent", transferContent);
            model.addAttribute("confirmToken", buildConfirmToken(invoice, user));
            model.addAttribute("qrUrl", buildQrUrl(amountValue, transferContent));

            return "customer/payment-qr";
        } catch (ResourceNotFoundException ex) {
            return redirectToInvoiceList("payNotFound");
        } catch (ForbiddenOperationException ex) {
            return redirectToInvoiceList("payForbidden");
        }
    }

    @GetMapping("/qr/confirm/{invoiceId}")
    public String rejectLegacyConfirm() {
        return redirectToInvoiceList("payFail");
    }

    @PostMapping("/qr/confirm/{invoiceId}")
    public String confirmQrPayment(@PathVariable Long invoiceId,
                                   @AuthenticationPrincipal CustomUserDetails user,
                                   @RequestParam String token) {
        if (!isCustomer(user)) {
            return "redirect:/login";
        }

        try {
            InvoiceEntity invoice = getCustomerInvoice(invoiceId, user);

            if (!MessageDigest.isEqual(
                    token.getBytes(StandardCharsets.UTF_8),
                    buildConfirmToken(invoice, user).getBytes(StandardCharsets.UTF_8)
            )) {
                return redirectToInvoiceList("payFail");
            }

            if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
                return redirectToInvoiceList("payAlreadyPaid");
            }

            if (!isPayableStatus(invoice.getStatus())) {
                return redirectToInvoiceList("payInvalidStatus");
            }

            String transactionCode = "QR-" + invoiceId + "-"
                    + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            invoiceService.markPaid(invoiceId, "BANK_QR", transactionCode);
            return redirectToInvoiceList("paySuccess");
        } catch (ResourceNotFoundException ex) {
            return redirectToInvoiceList("payNotFound");
        } catch (ForbiddenOperationException ex) {
            return redirectToInvoiceList("payForbidden");
        } catch (BusinessException ex) {
            return redirectToInvoiceList("payInvalidStatus");
        }
    }

    private InvoiceEntity getCustomerInvoice(Long invoiceId, CustomUserDetails user) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y h\u00f3a \u0111\u01a1n."));

        if (invoice.getCustomer() == null || !Objects.equals(invoice.getCustomer().getId(), user.getUserId())) {
            throw new ForbiddenOperationException("B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp h\u00f3a \u0111\u01a1n n\u00e0y.");
        }

        return invoice;
    }

    private boolean isCustomer(CustomUserDetails user) {
        return user != null && "CUSTOMER".equalsIgnoreCase(user.getRole());
    }

    private boolean isPayableStatus(String status) {
        return "PENDING".equalsIgnoreCase(status) || "OVERDUE".equalsIgnoreCase(status);
    }

    private String buildQrUrl(String amountValue, String transferContent) {
        return "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s"
                .formatted(
                        bankBin,
                        accountNo,
                        amountValue,
                        urlEncode(transferContent),
                        urlEncode(accountName)
                );
    }

    private String redirectToInvoiceList(String queryFlag) {
        return "redirect:/customer/invoice/list?" + queryFlag;
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
        String payload = invoice.getId() + ":" + user.getUserId() + ":" + invoice.getTotalAmount();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(paymentConfirmSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signature);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate payment confirmation token", ex);
        }
    }
}
