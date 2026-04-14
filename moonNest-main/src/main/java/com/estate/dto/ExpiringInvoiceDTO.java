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
public class ExpiringInvoiceDTO {
    private Long id;
    private String customerName;
    private String buildingName;
    private Integer month;
    private Integer year;
    private BigDecimal totalAmount;
    private LocalDateTime dueDate;
    private String status;
}
