package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceDetailDTO {
    private Long id;
    private Integer month;
    private Integer year;
    private BigDecimal totalAmount;
    private BigDecimal totalServiceFeeAmount;
    private String amountInWords;
    private String status; // PENDING, PAID, OVERDUE
    private String createdDate;
    private String paidDate;
    private String dueDate;
    private ContractDetailDTO contract;
    private CustomerDetailDTO customer;
    private List<InvoiceDetailDetailDTO> details;
    private UtilityMeterDetailDTO utilityMeter;
}
