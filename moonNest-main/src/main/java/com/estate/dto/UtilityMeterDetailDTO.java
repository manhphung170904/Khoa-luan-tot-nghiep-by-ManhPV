package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UtilityMeterDetailDTO {
    private Long id;
    private Long contractId;
    private Integer month;
    private Integer year;
    private Integer electricityOld;
    private Integer electricityNew;
    private Integer waterOld;
    private Integer waterNew;
}
