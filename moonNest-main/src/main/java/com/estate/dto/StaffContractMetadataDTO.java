package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class StaffContractMetadataDTO {
    private final List<ApiOptionDTO> customers;
    private final List<ApiOptionDTO> buildings;
}
