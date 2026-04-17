package com.estate.service;

import com.estate.config.VnPayConfig;
import com.estate.dto.VnPayCreatePaymentResponseDTO;
import com.estate.repository.InvoiceRepository;
import com.estate.repository.entity.InvoiceEntity;
import com.estate.util.VnPayUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Profile("vnpay")
@RequiredArgsConstructor
public class VnPayService {
    @Autowired
    VnPayConfig config;

    @Autowired
    InvoiceRepository invoiceRepository;

    @Autowired
    InvoiceService invoiceService;

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * Tạo url VNPay:
     * - trả về paymentUrl để FE redirect
     */
    public VnPayCreatePaymentResponseDTO createPayment(Long invoiceId, HttpServletRequest request) {

        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hóa đơn."));

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            throw new RuntimeException("Hóa đơn này đã được thanh toán.");
        }

        // VNPay: amount đơn vị = VND * 100
        BigDecimal amount = invoice.getTotalAmount();
        String vnpAmount = amount.multiply(BigDecimal.valueOf(100)).toBigInteger().toString();

        // TxnRef: nên tạo unique (có thể dùng invoiceId + timestamp)
        String txnRef = invoice.getId() + "-" + System.currentTimeMillis();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", config.getTmnCode());
        vnpParams.put("vnp_Amount", vnpAmount);
        vnpParams.put("vnp_CurrCode", "VND");

        // BankCode có thể bỏ trống để VNPay chọn
        // vnpParams.put("vnp_BankCode", "NCB");

        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toan hoa don " + invoice.getId());
        vnpParams.put("vnp_OrderType", "billpayment");

        // Locale
        vnpParams.put("vnp_Locale", "vn");

        vnpParams.put("vnp_ReturnUrl", config.getReturnUrl());
        vnpParams.put("vnp_IpAddr", VnPayUtils.getIpAddress(request));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        vnpParams.put("vnp_CreateDate", now.format(VNP_DATE_FORMAT));

        // ExpireDate: +15 phút
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(15).format(VNP_DATE_FORMAT));

        // Build query string
        String queryString = VnPayUtils.buildQueryString(vnpParams);

        // SecureHash = HMAC_SHA512(hashSecret, queryString)
        String secureHash = VnPayUtils.hmacSHA512(config.getHashSecret(), queryString);

        String paymentUrl = config.getPayUrl() + "?" + queryString + "&vnp_SecureHash=" + secureHash;

        System.out.println("RETURN URL CONFIG = " + config.getReturnUrl());
        System.out.println("PAYMENT URL = " + paymentUrl);

        return new VnPayCreatePaymentResponseDTO(paymentUrl, txnRef);
    }

    /**
     * Handle return_url:
     * - validate signature
     * - if success -> update invoice PAID
     */
    @Transactional
    public boolean handleReturn(Map<String, String> params) {

        // 1) verify signature
        boolean valid = verifySignature(params);
        if (!valid) return false;

        // 2) check response code
        String responseCode = params.get("vnp_ResponseCode"); // 00 = success
        if (!"00".equals(responseCode)) return false;

        // 3) parse txnRef -> invoiceId
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) return false;

        Long invoiceId = extractInvoiceId(txnRef);
        if (invoiceId == null) return false;

        // 4) mark paid
        invoiceService.markPaid(invoiceId, "VNPAY", txnRef);

        System.out.println("VNPay Return Params: " + params);
        System.out.println("ResponseCode: " + params.get("vnp_ResponseCode"));
        System.out.println("TxnRef: " + params.get("vnp_TxnRef"));
        System.out.println("SecureHash: " + params.get("vnp_SecureHash"));
        System.out.println("ValidSignature: " + verifySignature(params));

        return true;
    }

    /**
     * Validate signature from VNPay return
     */
    public boolean verifySignature(Map<String, String> params) {
        String secureHash = params.get("vnp_SecureHash");
        if (secureHash == null) return false;

        // Copy params để build lại hash
        Map<String, String> copy = new HashMap<>(params);

        // Remove hash fields
        copy.remove("vnp_SecureHash");
        copy.remove("vnp_SecureHashType");

        // Build data string (sorted + encoded)
        String queryString = VnPayUtils.buildQueryString(copy);

        String expectedHash = VnPayUtils.hmacSHA512(config.getHashSecret(), queryString);

        return secureHash.equalsIgnoreCase(expectedHash);
    }

    /**
     * txnRef format: invoiceId-timestamp
     */
    private Long extractInvoiceId(String txnRef) {
        try {
            String[] parts = txnRef.split("-");
            return Long.valueOf(parts[0]);
        } catch (Exception e) {
            return null;
        }
    }
}
