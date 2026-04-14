package com.estate.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class SaleContractListDTO {
    private Long id;
    private String building;
    private String customer;
    private String staff;
    private BigDecimal salePrice;
    private LocalDateTime transferDate;
    private LocalDateTime createdDate;
}