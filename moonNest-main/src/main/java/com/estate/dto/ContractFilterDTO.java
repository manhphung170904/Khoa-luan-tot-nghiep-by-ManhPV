package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ContractFilterDTO {
    private Long customerId;
    private Long buildingId;
    private Long staffId;
    private BigDecimal rentPriceFrom;
    private BigDecimal rentPriceTo;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
