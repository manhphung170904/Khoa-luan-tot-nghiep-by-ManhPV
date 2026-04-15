package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class CustomerContractMetadataDTO {
    private final List<ApiOptionDTO> buildings;
    private final CustomerContractSummaryDTO summary;
}
