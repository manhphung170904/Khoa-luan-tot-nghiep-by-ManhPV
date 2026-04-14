package com.estate.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter
public class CustomerValueDTO {
    private Long customerId;
    private String fullName;
    private String taxCode;        // ← thêm
    private BigDecimal rentValue;
    private BigDecimal saleValue;

    public BigDecimal getTotal() {
        return rentValue.add(saleValue);
    }

    public CustomerValueDTO(Long customerId, String fullName, String taxCode,
                            BigDecimal rentValue, BigDecimal saleValue) {
        this.customerId = customerId;
        this.fullName   = fullName;
        this.taxCode    = taxCode;
        this.rentValue  = rentValue;
        this.saleValue  = saleValue;
    }
}