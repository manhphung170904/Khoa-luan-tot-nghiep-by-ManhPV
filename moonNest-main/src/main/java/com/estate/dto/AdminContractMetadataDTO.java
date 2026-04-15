package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class AdminContractMetadataDTO {
    private final List<ApiOptionDTO> customers;
    private final List<ApiOptionDTO> buildings;
    private final List<ApiOptionDTO> staffs;
}
