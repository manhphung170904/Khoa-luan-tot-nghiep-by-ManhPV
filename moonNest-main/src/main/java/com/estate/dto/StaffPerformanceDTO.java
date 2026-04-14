package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffPerformanceDTO {
    private Long staffId;
    private String fullName;
    private Long contractCount;
    private Double performancePercent;
}
