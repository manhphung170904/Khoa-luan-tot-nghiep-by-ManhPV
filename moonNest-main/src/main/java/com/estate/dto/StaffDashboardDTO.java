package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class StaffDashboardDTO {
    private final long contractCnt;
    private final long customerCnt;
    private final long buildingCnt;
    private final long unpaidInvoiceCnt;
    private final List<ContractListDTO> expiringContracts;
    private final List<OverdueInvoiceDTO> overdueInvoices;
    private final List<ExpiringInvoiceDTO> expiringInvoices;
}
