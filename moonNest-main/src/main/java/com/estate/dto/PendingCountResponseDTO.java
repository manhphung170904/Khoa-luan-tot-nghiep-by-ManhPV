package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class PendingCountResponseDTO {
    private final long pendingCount;
}
