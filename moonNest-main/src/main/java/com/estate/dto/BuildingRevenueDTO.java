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
public class BuildingRevenueDTO {
    private String buildingName;
    private BigDecimal totalRevenue;
    private String taxCode;

    public BuildingRevenueDTO(String buildingName, BigDecimal totalRevenue) {
        this.buildingName = buildingName;
        this.totalRevenue = totalRevenue;
    }
}