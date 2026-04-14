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
public class BuildingListDTO {
    private Long id;
    private String name;
    private String address;
    private String level;
    private String propertyType;
    private String transactionType;
    private String taxCode;
    private String phone;
    private BigDecimal rentPrice;
    private String managerName;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;
    private String image;
}
