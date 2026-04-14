package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceListDTO {
    private Long id;
    private Integer month;
    private Integer year;
    private BigDecimal totalAmount;
    private String status; // PENDING, PAID, OVERDUE
    private ContractDetailDTO contract;
    private CustomerDetailDTO customer;
}
