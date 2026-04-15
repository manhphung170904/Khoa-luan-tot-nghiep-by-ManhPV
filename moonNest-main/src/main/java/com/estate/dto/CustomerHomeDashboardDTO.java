package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class CustomerHomeDashboardDTO {
    private final String today;
    private final String clientIp;
    private final long totalContracts;
    private final String totalPayment;
    private final long totalUnpaidInvoices;
    private final InvoiceDetailDTO detailInvoice;
    private final List<ContractDetailDTO> contracts;
}
