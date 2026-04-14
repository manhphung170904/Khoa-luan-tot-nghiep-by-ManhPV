package com.estate.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor
public class NearbyAmenityDTO {
    private Long id;
    private Long buildingId;
    private String buildingName;
    private String name;
    private String amenityType;       // SHOPPING, PARK, HOSPITAL...
    private String amenityTypeLabel;  // Việt hóa
    private Integer distanceMeter;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime createdDate;
}