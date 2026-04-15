package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@AllArgsConstructor(staticName = "of")
public class ApiErrorResponse {
    private final String code;
    private final String message;
    private final String path;
    private final OffsetDateTime timestamp;
}
