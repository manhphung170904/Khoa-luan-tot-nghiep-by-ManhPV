package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class PublicBuildingFilterMetadataDTO {
    private final List<ApiOptionDTO> districts;
    private final List<String> wards;
    private final List<String> streets;
    private final List<ApiOptionDTO> directions;
    private final List<ApiOptionDTO> levels;
}
