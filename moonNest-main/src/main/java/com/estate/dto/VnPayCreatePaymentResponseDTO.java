package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VnPayCreatePaymentResponseDTO {
    private String paymentUrl;
    private String txnRef;
}
