package com.estate.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class SaleContractFilterDTO {
    private Long customerId;
    private Long buildingId;
    private Long staffId;
    private BigDecimal salePriceFrom;
    private BigDecimal salePriceTo;
    private LocalDate createdDateFrom;
    private LocalDate createdDateTo;
    private Long status;
}
