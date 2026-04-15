package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class CustomerContractSummaryDTO {
    private final long totalContracts;
    private final long activeContracts;
    private final long expiredContracts;
}
