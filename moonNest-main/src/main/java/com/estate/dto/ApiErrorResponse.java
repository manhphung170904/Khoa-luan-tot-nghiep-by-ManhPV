package com.estate.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@AllArgsConstructor(staticName = "of")
public class ApiErrorResponse {
    private final String code;
    private final int status;
    private final String message;
    private final String path;
    private final OffsetDateTime timestamp;
    private final List<ApiFieldError> errors;
}
