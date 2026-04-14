package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OverdueInvoiceDTO {
    private Long id;
    private CustomerListDTO customer;
    private BigDecimal totalAmount;
    private LocalDateTime dueDate;
}
