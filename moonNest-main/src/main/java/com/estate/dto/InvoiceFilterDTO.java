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
public class InvoiceFilterDTO {
    private Integer month;
    private Integer year;
    private Long customerId;
    private BigDecimal totalAmountFrom;
    private BigDecimal totalAmountTo;
    private String status;
}
