package com.estate.dto;

import com.estate.enums.Direction;
import com.estate.enums.Level;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BuildingFilterDTO {
    private Long districtId;
    private Long staffId;

    private Integer numberOfFloorFrom;
    private Integer numberOfFloorTo;
    private Integer numberOfBasementFrom;
    private Integer numberOfBasementTo;
    private Integer floorAreaFrom;
    private Integer floorAreaTo;
    private Integer rentAreaFrom;
    private Integer rentAreaTo;
    private Integer radius;

    private BigDecimal rentPriceFrom;
    private BigDecimal rentPriceTo;
    private BigDecimal serviceFeeFrom;
    private BigDecimal serviceFeeTo;
    private BigDecimal carFeeFrom;
    private BigDecimal carFeeTo;
    private BigDecimal motorbikeFeeFrom;
    private BigDecimal motorbikeFeeTo;
    private BigDecimal waterFeeFrom;
    private BigDecimal waterFeeTo;
    private BigDecimal electricityFeeFrom;
    private BigDecimal electricityFeeTo;

    private Double lat;
    private Double lng;

    private String name;
    private String ward;
    private String street;
    private String propertyType;
    private String transactionType;
    private String locationLabel;

    private Direction direction;
    private Level level;
}
