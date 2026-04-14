package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceFormDTO {
    private Long id;
    private Long contractId;
    private Long customerId;
    private Integer month;
    private Integer year;
    private String status;
    private LocalDate dueDate;
    private BigDecimal totalAmount;
    private List<InvoiceDetailDetailDTO> details;
    private Integer electricityUsage;
    private Integer waterUsage;
}
