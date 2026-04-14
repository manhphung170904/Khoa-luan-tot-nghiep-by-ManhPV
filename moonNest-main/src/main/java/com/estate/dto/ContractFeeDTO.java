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
public class ContractFeeDTO {
    private BigDecimal rentPrice;
    private BigDecimal serviceFee;
    private BigDecimal carFee;
    private BigDecimal motorbikeFee;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;
}
