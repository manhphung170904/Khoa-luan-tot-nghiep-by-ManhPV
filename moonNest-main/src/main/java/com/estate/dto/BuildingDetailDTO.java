package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BuildingDetailDTO {
    private Long id;

    private Integer numberOfFloor;
    private Integer numberOfBasement;
    private Integer floorArea;

    private BigDecimal rentPrice;
    private BigDecimal salePrice;
    private BigDecimal serviceFee;
    private BigDecimal carFee;
    private BigDecimal motorbikeFee;
    private BigDecimal waterFee;
    private BigDecimal electricityFee;
    private BigDecimal deposit;
    private BigDecimal latitude;
    private BigDecimal longitude;

    private String name;
    private String address;
    private String direction;
    private String level;
    private String propertyType;
    private String transactionType;
    private String taxCode;
    private String linkOfBuilding;
    private String image;
    private String rentAreaValues;

    private Map<String, Long> staffs = new HashMap<>();
}