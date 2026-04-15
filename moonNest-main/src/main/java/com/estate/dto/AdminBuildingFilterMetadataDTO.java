package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class AdminBuildingFilterMetadataDTO {
    private final List<ApiOptionDTO> propertyTypes;
    private final List<ApiOptionDTO> transactionTypes;
    private final List<ApiOptionDTO> directions;
    private final List<ApiOptionDTO> levels;
    private final List<ApiOptionDTO> managers;
}
